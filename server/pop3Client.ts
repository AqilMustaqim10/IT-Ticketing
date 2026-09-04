/**
 * @file pop3Client.ts
 * @description Pure Node.js POP3 Protocol Client (Supports TLS Port 995 and Standard TCP Port 110).
 * Implements USER, PASS, STAT, LIST, RETR, DELE, QUIT commands with timeout protection,
 * multi-line response assembly, dot-unstuffing, and raw email parsing.
 */

import net from 'net';
import tls from 'tls';
import { parseRawEmail, ParsedEmail } from './emailParser';

export interface Pop3Options {
  host: string;
  port: number;
  useSsl: boolean;
  username: string;
  password?: string;
  timeoutMs?: number;
}

export class Pop3Session {
  private socket: net.Socket | tls.TLSSocket | null = null;
  private buffer = '';
  private options: Pop3Options;

  constructor(options: Pop3Options) {
    this.options = {
      timeoutMs: 15000,
      ...options,
    };
  }

  /**
   * Opens connection to POP3 server and performs authentication
   */
  public async connect(): Promise<{ banner: string; pingMs: number }> {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const { host, port, useSsl, timeoutMs } = this.options;

      const onConnect = () => {
        // Connected, waiting for server +OK greeting
      };

      const socketOptions = {
        host,
        port: port || (useSsl ? 995 : 110),
        rejectUnauthorized: false,
        timeout: timeoutMs,
      };

      if (useSsl) {
        this.socket = tls.connect(socketOptions, onConnect);
      } else {
        this.socket = net.connect(socketOptions, onConnect);
      }

      this.socket.setEncoding('utf8');

      let initialGreetingReceived = false;

      this.socket.on('data', (chunk: string) => {
        this.buffer += chunk;
        if (!initialGreetingReceived && this.buffer.includes('\n')) {
          initialGreetingReceived = true;
          const line = this.readLine();
          if (line.startsWith('+OK')) {
            const pingMs = Date.now() - startTime;
            resolve({ banner: line, pingMs });
          } else {
            reject(new Error(`POP3 Server rejected connection: ${line}`));
          }
        }
      });

      this.socket.on('timeout', () => {
        this.close();
        reject(new Error(`POP3 connection timed out to ${host}:${port}`));
      });

      this.socket.on('error', (err) => {
        this.close();
        reject(err);
      });
    });
  }

  /**
   * Authenticates with USER and PASS commands
   */
  public async login(): Promise<string> {
    const { username, password } = this.options;
    if (!username) {
      throw new Error('POP3 Username/Email is required');
    }

    const userRes = await this.sendCommand(`USER ${username}`);
    if (!userRes.startsWith('+OK')) {
      throw new Error(`POP3 USER command failed for ${username}: ${userRes}`);
    }

    if (password) {
      const passRes = await this.sendCommand(`PASS ${password}`);
      if (!passRes.startsWith('+OK')) {
        throw new Error(`POP3 PASS authentication failed for ${username}: ${passRes}`);
      }
      return passRes;
    }

    return userRes;
  }

  /**
   * STAT: Returns { count: number, octets: number }
   */
  public async stat(): Promise<{ count: number; octets: number }> {
    const res = await this.sendCommand('STAT');
    if (!res.startsWith('+OK')) {
      throw new Error(`POP3 STAT failed: ${res}`);
    }
    const parts = res.trim().split(/\s+/);
    const count = parseInt(parts[1], 10) || 0;
    const octets = parseInt(parts[2], 10) || 0;
    return { count, octets };
  }

  /**
   * LIST: Returns array of message numbers and sizes
   */
  public async list(): Promise<{ msgNum: number; size: number }[]> {
    const res = await this.sendCommand('LIST', true);
    const lines = res.split(/\r?\n/);
    const results: { msgNum: number; size: number }[] = [];

    for (const line of lines) {
      if (line.startsWith('+OK') || line === '.' || !line.trim()) continue;
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        results.push({
          msgNum: parseInt(parts[0], 10),
          size: parseInt(parts[1], 10),
        });
      }
    }
    return results;
  }

  /**
   * RETR: Downloads a raw message and performs RFC dot-unstuffing
   */
  public async retr(msgNum: number): Promise<string> {
    const raw = await this.sendCommand(`RETR ${msgNum}`, true);
    // Remove the initial "+OK" status line
    const firstLineEnd = raw.search(/\r?\n/);
    let messageBody = firstLineEnd !== -1 ? raw.substring(firstLineEnd).replace(/^\r?\n/, '') : raw;

    // Dot-unstuffing: lines starting with '..' in POP3 transmission become '.'
    messageBody = messageBody.replace(/\r?\n\.\./g, '\n.');

    // Remove terminating '.'
    messageBody = messageBody.replace(/\r?\n\.\r?\n?$/, '');

    return messageBody;
  }

  /**
   * DELE: Flags message for deletion on QUIT
   */
  public async dele(msgNum: number): Promise<string> {
    return this.sendCommand(`DELE ${msgNum}`);
  }

  /**
   * QUIT: Closes POP3 session cleanly
   */
  public async quit(): Promise<string> {
    try {
      const res = await this.sendCommand('QUIT');
      this.close();
      return res;
    } catch {
      this.close();
      return '+OK Bye';
    }
  }

  /**
   * Closes socket
   */
  public close(): void {
    if (this.socket) {
      try {
        this.socket.destroy();
      } catch {
        // Ignore
      }
      this.socket = null;
    }
  }

  /**
   * Sends a POP3 command and waits for single-line or multi-line response
   */
  private sendCommand(command: string, isMultiline = false): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        return reject(new Error('Socket not connected'));
      }

      this.buffer = '';

      const onData = (chunk: string) => {
        this.buffer += chunk;

        if (isMultiline) {
          // Check for multi-line terminator: "\r\n.\r\n" or "\n.\n"
          if (
            this.buffer.endsWith('\r\n.\r\n') ||
            this.buffer.endsWith('\n.\n') ||
            this.buffer.includes('\r\n.\r\n')
          ) {
            this.socket?.removeListener('data', onData);
            resolve(this.buffer);
          } else if (this.buffer.startsWith('-ERR')) {
            this.socket?.removeListener('data', onData);
            reject(new Error(`POP3 command error: ${this.buffer.trim()}`));
          }
        } else {
          // Single line response ending with newline
          if (this.buffer.includes('\n')) {
            this.socket?.removeListener('data', onData);
            const line = this.readLine();
            if (line.startsWith('-ERR')) {
              reject(new Error(`POP3 error: ${line}`));
            } else {
              resolve(line);
            }
          }
        }
      };

      this.socket.on('data', onData);
      this.socket.write(`${command}\r\n`);
    });
  }

  private readLine(): string {
    const idx = this.buffer.indexOf('\n');
    if (idx === -1) return '';
    const line = this.buffer.substring(0, idx).replace(/\r$/, '');
    this.buffer = this.buffer.substring(idx + 1);
    return line;
  }
}

/**
 * Top-level helper to test connection and authentication with a company POP3 mailbox
 */
export async function testPop3Mailbox(config: Pop3Options): Promise<{
  success: boolean;
  message: string;
  details?: {
    host: string;
    port: number;
    ssl: boolean;
    mailboxStatus: string;
    pendingMessagesCount: number;
    totalBytes: number;
    pingMs: number;
    banner: string;
  };
}> {
  const session = new Pop3Session(config);
  try {
    const { banner, pingMs } = await session.connect();
    await session.login();
    const { count, octets } = await session.stat();
    await session.quit();

    return {
      success: true,
      message: `Successfully connected to Corporate POP3 Server ${config.host}:${config.port} (${config.useSsl ? 'SSL/TLS' : 'Standard'})! Found ${count} message(s) in inbox.`,
      details: {
        host: config.host,
        port: config.port,
        ssl: config.useSsl,
        mailboxStatus: 'AUTHENTICATED_AND_ONLINE',
        pendingMessagesCount: count,
        totalBytes: octets,
        pingMs,
        banner,
      },
    };
  } catch (err: any) {
    session.close();
    let diagnosticHint = '';
    const errMsg = err.message || '';
    if (errMsg.includes('[AUTH]') || errMsg.toLowerCase().includes('authentication failed')) {
      if (config.port === 110 || !config.useSsl) {
        diagnosticHint = ' • Hint: Port 110 does not use SSL. Most mail servers (cPanel, Dovecot, Postfix) reject plain authentication over port 110. Change port to 995 and check "useSSL", and ensure username is your FULL email address.';
      } else {
        diagnosticHint = ' • Hint: Ensure the username is your FULL email address (e.g. user@uoahospitality.com.my) and verify your password or app password. Check if POP3 is enabled in your mailbox webmail/cPanel settings.';
      }
    }
    return {
      success: false,
      message: `Failed to connect to POP3 Mailbox (${config.host}:${config.port}): ${err.message}${diagnosticHint}`,
    };
  }
}

/**
 * Top-level helper to fetch and parse new unread emails from the POP3 mailbox
 */
export async function fetchPop3Emails(
  config: Pop3Options & { leaveCopyOnServer?: boolean; maxMessages?: number },
  knownMessageIds: Set<string>
): Promise<{
  success: boolean;
  fetchedEmails: ParsedEmail[];
  totalInMailbox: number;
  skippedCount: number;
  message: string;
}> {
  const session = new Pop3Session(config);
  const fetchedEmails: ParsedEmail[] = [];
  let totalInMailbox = 0;
  let skippedCount = 0;

  try {
    await session.connect();
    await session.login();
    const { count } = await session.stat();
    totalInMailbox = count;

    if (count === 0) {
      await session.quit();
      return {
        success: true,
        fetchedEmails: [],
        totalInMailbox: 0,
        skippedCount: 0,
        message: 'Mailbox is empty. No new inbound emails found.',
      };
    }

    const messages = await session.list();
    const maxToFetch = Math.min(messages.length, config.maxMessages || 20);

    for (let i = 0; i < maxToFetch; i++) {
      const msg = messages[i];
      try {
        const rawContent = await session.retr(msg.msgNum);
        const parsed = parseRawEmail(rawContent);

        // Check if message ID was already processed
        if (knownMessageIds.has(parsed.messageId)) {
          skippedCount++;
          continue;
        }

        fetchedEmails.push(parsed);

        // If user configured to delete from server
        if (!config.leaveCopyOnServer) {
          await session.dele(msg.msgNum);
        }
      } catch (err: any) {
        console.error(`Error downloading message #${msg.msgNum}:`, err.message);
      }
    }

    await session.quit();

    return {
      success: true,
      fetchedEmails,
      totalInMailbox,
      skippedCount,
      message: `Fetched ${fetchedEmails.length} new email report(s) from corporate mailbox (${skippedCount} already synced).`,
    };
  } catch (err: any) {
    session.close();
    return {
      success: false,
      fetchedEmails: [],
      totalInMailbox: 0,
      skippedCount: 0,
      message: `POP3 Fetch error: ${err.message}`,
    };
  }
}
