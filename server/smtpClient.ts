/**
 * @file smtpClient.ts
 * @description Pure Node.js SMTP Protocol Client & Connectivity Tester.
 * Performs genuine TCP/TLS socket handshake, EHLO greeting negotiation,
 * RFC 4954 AUTH LOGIN authentication, and exact round-trip latency measurement.
 */

import net from 'net';
import tls from 'tls';

export interface SmtpOptions {
  host: string;
  port: number;
  useSsl?: boolean;
  username?: string;
  password?: string;
  timeoutMs?: number;
  senderEmail?: string;
}

export interface SmtpSendOptions extends SmtpOptions {
  from: string;
  fromName?: string;
  to: string;
  subject: string;
  body: string;
  html?: string;
}

export interface SmtpSendResult {
  success: boolean;
  message: string;
  messageId?: string;
  latencyMs?: number;
}

export interface SmtpTestResult {
  success: boolean;
  message: string;
  details?: {
    host: string;
    port: number;
    ssl: boolean;
    banner: string;
    authenticated: boolean;
    pingMs: number;
    serverCapabilities?: string[];
  };
}

/**
 * Tests genuine SMTP Server connectivity and authentication
 */
export async function testSmtpServer(options: SmtpOptions): Promise<SmtpTestResult> {
  const {
    host,
    port = 465,
    useSsl = port === 465,
    username,
    password,
    timeoutMs = 12000,
  } = options;

  if (!host || !host.trim()) {
    return {
      success: false,
      message: 'SMTP Hostname is required (e.g. mail.yourcompany.com).',
    };
  }

  const startTime = Date.now();

  return new Promise((resolve) => {
    let socket: net.Socket | tls.TLSSocket | null = null;
    let buffer = '';
    let step = 0;
    let banner = '';
    let authenticated = false;
    const capabilities: string[] = [];
    let isSettled = false;

    const cleanupAndResolve = (result: SmtpTestResult) => {
      if (isSettled) return;
      isSettled = true;
      try {
        if (socket && !socket.destroyed) {
          socket.write('QUIT\r\n');
          socket.end();
          socket.destroy();
        }
      } catch {
        // ignore
      }
      resolve(result);
    };

    const handleTimeout = () => {
      cleanupAndResolve({
        success: false,
        message: `SMTP connection timed out after ${timeoutMs}ms to ${host}:${port}. Verify hostname and firewall ports.`,
      });
    };

    const handleError = (err: Error) => {
      cleanupAndResolve({
        success: false,
        message: `SMTP connection error (${host}:${port}): ${err.message}`,
      });
    };

    const onConnect = () => {
      // Socket connected, waiting for initial 220 banner
    };

    const socketOptions = {
      host: host.trim(),
      port,
      rejectUnauthorized: false,
      timeout: timeoutMs,
    };

    try {
      if (useSsl) {
        socket = tls.connect(socketOptions, onConnect);
      } else {
        socket = net.connect(socketOptions, onConnect);
      }

      socket.setEncoding('utf8');
      socket.on('timeout', handleTimeout);
      socket.on('error', handleError);

      socket.on('data', (chunk: string) => {
        buffer += chunk;
        const lines = buffer.split(/\r?\n/);
        // Keep incomplete line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          // Step 0: Waiting for initial 220 Service Ready Banner
          if (step === 0) {
            if (line.startsWith('220')) {
              banner = line;
              step = 1;
              socket?.write('EHLO client.localhost\r\n');
            } else if (line.startsWith('4') || line.startsWith('5')) {
              cleanupAndResolve({
                success: false,
                message: `SMTP Server rejected initial greeting: ${line}`,
              });
              return;
            }
          }
          // Step 1: Processing EHLO 250 responses
          else if (step === 1) {
            if (line.startsWith('250-') || line.startsWith('250 ')) {
              capabilities.push(line.substring(4).trim());
              // If line is '250 ...' (last line of EHLO)
              if (line.startsWith('250 ')) {
                if (username && password) {
                  // Attempt AUTH LOGIN
                  step = 2;
                  socket?.write('AUTH LOGIN\r\n');
                } else {
                  // No auth requested, EHLO succeeded
                  const pingMs = Date.now() - startTime;
                  cleanupAndResolve({
                    success: true,
                    message: `Successfully connected to SMTP Server ${host}:${port} (${useSsl ? 'SSL' : 'Plain/STARTTLS'}). Ready to dispatch outbound emails.`,
                    details: {
                      host,
                      port,
                      ssl: useSsl,
                      banner,
                      authenticated: false,
                      pingMs,
                      serverCapabilities: capabilities.slice(0, 8),
                    },
                  });
                  return;
                }
              }
            } else if (line.startsWith('500') || line.startsWith('502')) {
              // Try HELO fallback
              socket?.write('HELO client.localhost\r\n');
            } else if (line.startsWith('4') || line.startsWith('5')) {
              cleanupAndResolve({
                success: false,
                message: `SMTP EHLO greeting failed: ${line}`,
              });
              return;
            }
          }
          // Step 2: AUTH LOGIN Username Challenge (334 VXNlcm5hbWU6)
          else if (step === 2) {
            if (line.startsWith('334')) {
              step = 3;
              const b64User = Buffer.from(username || '').toString('base64');
              socket?.write(`${b64User}\r\n`);
            } else if (line.startsWith('5')) {
              cleanupAndResolve({
                success: false,
                message: `SMTP AUTH command rejected by server: ${line}`,
              });
              return;
            }
          }
          // Step 3: AUTH LOGIN Password Challenge (334 UGFzc3dvcmQ6)
          else if (step === 3) {
            if (line.startsWith('334')) {
              step = 4;
              const b64Pass = Buffer.from(password || '').toString('base64');
              socket?.write(`${b64Pass}\r\n`);
            } else if (line.startsWith('5')) {
              cleanupAndResolve({
                success: false,
                message: `SMTP Username rejected by server: ${line}`,
              });
              return;
            }
          }
          // Step 4: AUTH Result (235 Authentication succeeded)
          else if (step === 4) {
            if (line.startsWith('235')) {
              authenticated = true;
              const pingMs = Date.now() - startTime;
              cleanupAndResolve({
                success: true,
                message: `SMTP Authentication Successful! Server ${host}:${port} verified and authorized for outgoing ticket receipts.`,
                details: {
                  host,
                  port,
                  ssl: useSsl,
                  banner,
                  authenticated: true,
                  pingMs,
                  serverCapabilities: capabilities.slice(0, 8),
                },
              });
              return;
            } else {
              cleanupAndResolve({
                success: false,
                message: `SMTP Authentication Failed (Invalid username/password or relay denied): ${line}`,
              });
              return;
            }
          }
        }
      });
    } catch (err: any) {
      cleanupAndResolve({
        success: false,
        message: `Failed to initiate SMTP connection: ${err.message}`,
      });
    }
  });
}

/**
 * Sends a real outbound email message via genuine SMTP socket connection
 */
export async function sendSmtpEmail(options: SmtpSendOptions): Promise<SmtpSendResult> {
  const {
    host,
    port = 465,
    useSsl = port === 465,
    username,
    password,
    timeoutMs = 15000,
    from,
    fromName,
    to,
    subject,
    body,
    html,
  } = options;

  if (!host || !host.trim()) {
    return {
      success: false,
      message: 'SMTP Hostname is required.',
    };
  }

  if (!to || !to.trim()) {
    return {
      success: false,
      message: 'Recipient email address is required.',
    };
  }

  const startTime = Date.now();
  const messageId = `<auto-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@${host}>`;

  // Clean email addresses (remove name if present)
  const extractEmail = (str: string) => {
    const m = str.match(/<([^>]+)>/);
    return m ? m[1].trim() : str.trim();
  };

  const cleanSender = extractEmail(from || username || 'support@localhost');
  const cleanRecipient = extractEmail(to);

  return new Promise((resolve) => {
    let socket: net.Socket | tls.TLSSocket | null = null;
    let buffer = '';
    let step = 0;
    let isSettled = false;

    const cleanupAndResolve = (result: SmtpSendResult) => {
      if (isSettled) return;
      isSettled = true;
      try {
        if (socket && !socket.destroyed) {
          socket.write('QUIT\r\n');
          socket.end();
          socket.destroy();
        }
      } catch {
        // ignore
      }
      resolve(result);
    };

    const handleTimeout = () => {
      cleanupAndResolve({
        success: false,
        message: `SMTP send connection timed out after ${timeoutMs}ms to ${host}:${port}.`,
      });
    };

    const handleError = (err: Error) => {
      cleanupAndResolve({
        success: false,
        message: `SMTP transmission error (${host}:${port}): ${err.message}`,
      });
    };

    const onConnect = () => {
      // Connected, await 220 banner
    };

    const socketOptions = {
      host: host.trim(),
      port,
      rejectUnauthorized: false,
      timeout: timeoutMs,
    };

    try {
      if (useSsl) {
        socket = tls.connect(socketOptions, onConnect);
      } else {
        socket = net.connect(socketOptions, onConnect);
      }

      socket.setEncoding('utf8');
      socket.on('timeout', handleTimeout);
      socket.on('error', handleError);

      socket.on('data', (chunk: string) => {
        buffer += chunk;
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          // Step 0: 220 Greeting Banner -> Send EHLO
          if (step === 0) {
            if (line.startsWith('220')) {
              step = 1;
              socket?.write('EHLO client.localhost\r\n');
            } else if (line.startsWith('4') || line.startsWith('5')) {
              cleanupAndResolve({
                success: false,
                message: `SMTP Server rejected initial connection: ${line}`,
              });
              return;
            }
          }
          // Step 1: 250 EHLO Responses
          else if (step === 1) {
            if (line.startsWith('250-') || line.startsWith('250 ')) {
              if (line.startsWith('250 ')) {
                if (username && password) {
                  // Authenticate
                  step = 2;
                  socket?.write('AUTH LOGIN\r\n');
                } else {
                  // No auth needed, proceed to MAIL FROM
                  step = 5;
                  socket?.write(`MAIL FROM:<${cleanSender}>\r\n`);
                }
              }
            } else if (line.startsWith('500') || line.startsWith('502')) {
              socket?.write('HELO client.localhost\r\n');
            } else if (line.startsWith('4') || line.startsWith('5')) {
              cleanupAndResolve({
                success: false,
                message: `SMTP EHLO failed: ${line}`,
              });
              return;
            }
          }
          // Step 2: 334 Username Challenge -> Send base64 username
          else if (step === 2) {
            if (line.startsWith('334')) {
              step = 3;
              const b64User = Buffer.from(username || '').toString('base64');
              socket?.write(`${b64User}\r\n`);
            } else if (line.startsWith('5')) {
              cleanupAndResolve({
                success: false,
                message: `SMTP AUTH LOGIN rejected: ${line}`,
              });
              return;
            }
          }
          // Step 3: 334 Password Challenge -> Send base64 password
          else if (step === 3) {
            if (line.startsWith('334')) {
              step = 4;
              const b64Pass = Buffer.from(password || '').toString('base64');
              socket?.write(`${b64Pass}\r\n`);
            } else if (line.startsWith('5')) {
              cleanupAndResolve({
                success: false,
                message: `SMTP Username rejected: ${line}`,
              });
              return;
            }
          }
          // Step 4: 235 Authentication Succeeded -> Send MAIL FROM
          else if (step === 4) {
            if (line.startsWith('235')) {
              step = 5;
              socket?.write(`MAIL FROM:<${cleanSender}>\r\n`);
            } else {
              cleanupAndResolve({
                success: false,
                message: `SMTP Authentication Failed: ${line}`,
              });
              return;
            }
          }
          // Step 5: 250 Sender OK -> Send RCPT TO
          else if (step === 5) {
            if (line.startsWith('250') || line.startsWith('251')) {
              step = 6;
              socket?.write(`RCPT TO:<${cleanRecipient}>\r\n`);
            } else {
              cleanupAndResolve({
                success: false,
                message: `SMTP Sender <${cleanSender}> rejected: ${line}`,
              });
              return;
            }
          }
          // Step 6: 250 Recipient OK -> Send DATA
          else if (step === 6) {
            if (line.startsWith('250') || line.startsWith('251')) {
              step = 7;
              socket?.write('DATA\r\n');
            } else {
              cleanupAndResolve({
                success: false,
                message: `SMTP Recipient <${cleanRecipient}> rejected: ${line}`,
              });
              return;
            }
          }
          // Step 7: 354 Start Mail Input -> Send Message Payload & Trailing Dot
          else if (step === 7) {
            if (line.startsWith('354')) {
              step = 8;
              const fromHeader = fromName
                ? `=?utf-8?B?${Buffer.from(fromName).toString('base64')}?= <${cleanSender}>`
                : cleanSender;

              const encodedSubject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
              const dateStr = new Date().toUTCString();

              let rawPayload = '';
              rawPayload += `Message-ID: ${messageId}\r\n`;
              rawPayload += `Date: ${dateStr}\r\n`;
              rawPayload += `From: ${fromHeader}\r\n`;
              rawPayload += `To: ${cleanRecipient}\r\n`;
              rawPayload += `Subject: ${encodedSubject}\r\n`;
              rawPayload += `MIME-Version: 1.0\r\n`;

              if (html) {
                const boundary = `====boundary_${Date.now()}_${Math.random().toString(36).substr(2, 6)}====`;
                rawPayload += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n\r\n`;
                
                // Plain text part
                rawPayload += `--${boundary}\r\n`;
                rawPayload += `Content-Type: text/plain; charset=UTF-8\r\n`;
                rawPayload += `Content-Transfer-Encoding: 8bit\r\n\r\n`;
                rawPayload += `${body}\r\n\r\n`;

                // HTML part
                rawPayload += `--${boundary}\r\n`;
                rawPayload += `Content-Type: text/html; charset=UTF-8\r\n`;
                rawPayload += `Content-Transfer-Encoding: 8bit\r\n\r\n`;
                rawPayload += `${html}\r\n\r\n`;

                rawPayload += `--${boundary}--\r\n`;
              } else {
                rawPayload += `Content-Type: text/plain; charset=UTF-8\r\n`;
                rawPayload += `Content-Transfer-Encoding: 8bit\r\n\r\n`;
                rawPayload += `${body}\r\n`;
              }

              // SMTP transparency: escape leading dots in body lines
              const escapedPayload = rawPayload
                .split('\r\n')
                .map((l) => (l.startsWith('.') ? `.${l}` : l))
                .join('\r\n');

              socket?.write(`${escapedPayload}\r\n.\r\n`);
            } else {
              cleanupAndResolve({
                success: false,
                message: `SMTP DATA command rejected: ${line}`,
              });
              return;
            }
          }
          // Step 8: 250 Message Accepted for Delivery
          else if (step === 8) {
            if (line.startsWith('250')) {
              const latencyMs = Date.now() - startTime;
              cleanupAndResolve({
                success: true,
                message: `Email dispatched successfully via ${host}:${port} (${latencyMs}ms).`,
                messageId,
                latencyMs,
              });
              return;
            } else {
              cleanupAndResolve({
                success: false,
                message: `SMTP Message delivery rejected: ${line}`,
              });
              return;
            }
          }
        }
      });
    } catch (err: any) {
      cleanupAndResolve({
        success: false,
        message: `Failed to dispatch SMTP email: ${err.message}`,
      });
    }
  });
}
