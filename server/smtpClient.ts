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
