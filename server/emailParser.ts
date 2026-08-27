/**
 * @file emailParser.ts
 * @description Robust RFC 2822 / MIME Email Parser for Inbound POP3 Email Ingestion.
 * Handles folded headers, RFC 2047 encoded words, multipart/alternative, multipart/mixed,
 * quoted-printable & base64 decoding, attachment extraction, and plain text normalization.
 */

export interface ParsedEmailAttachment {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
}

export interface ParsedEmail {
  messageId: string;
  from: string;
  fromName: string;
  to: string;
  subject: string;
  date: string;
  textBody: string;
  htmlBody: string;
  attachments: ParsedEmailAttachment[];
  rawHeaders: Record<string, string>;
}

/**
 * Decodes RFC 2047 encoded words like =?UTF-8?B?...?= or =?ISO-8859-1?Q?...?=
 */
export function decodeRfc2047(input: string): string {
  if (!input || !input.includes('=?')) return input;

  return input.replace(/=\?([^?]+)\?([BQbq])\?([^?]+)\?=/g, (_, charset, encoding, text) => {
    try {
      const enc = encoding.toUpperCase();
      if (enc === 'B') {
        return Buffer.from(text, 'base64').toString('utf8');
      } else if (enc === 'Q') {
        // Quoted-printable in header: '_' represents space, '=XX' represents hex
        const normalized = text.replace(/_/g, ' ').replace(/=([A-Fa-f0-9]{2})/g, (_, hex) => {
          return String.fromCharCode(parseInt(hex, 16));
        });
        return Buffer.from(normalized, 'binary').toString('utf8');
      }
    } catch {
      return text;
    }
    return text;
  });
}

/**
 * Decodes Quoted-Printable body content
 */
export function decodeQuotedPrintable(input: string): string {
  if (!input) return '';
  // Remove soft line breaks (=\r\n or =\n)
  const withoutSoftBreaks = input.replace(/=\r?\n/g, '');
  // Decode hex bytes
  try {
    const bytes: number[] = [];
    for (let i = 0; i < withoutSoftBreaks.length; i++) {
      if (withoutSoftBreaks[i] === '=' && i + 2 < withoutSoftBreaks.length) {
        const hex = withoutSoftBreaks.substring(i + 1, i + 3);
        if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
          bytes.push(parseInt(hex, 16));
          i += 2;
          continue;
        }
      }
      bytes.push(withoutSoftBreaks.charCodeAt(i));
    }
    return Buffer.from(bytes).toString('utf8');
  } catch {
    return withoutSoftBreaks;
  }
}

/**
 * Extracts email address and display name from "Name <user@domain.com>" or "user@domain.com"
 */
export function parseAddress(raw: string): { address: string; name: string } {
  if (!raw) return { address: '', name: '' };
  const decoded = decodeRfc2047(raw.trim());
  const angleMatch = decoded.match(/^(.*?)\s*<([^>]+)>/);
  if (angleMatch) {
    let name = angleMatch[1].trim().replace(/^["']|["']$/g, '');
    const address = angleMatch[2].trim().toLowerCase();
    if (!name) {
      name = address.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return { address, name };
  }
  const clean = decoded.replace(/^["']|["']$/g, '').trim().toLowerCase();
  const name = clean.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return { address: clean, name };
}

/**
 * Converts HTML body to clean plain text
 */
export function htmlToPlainText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Splits raw headers and unfolds multi-line headers
 */
function parseHeaders(headerBlock: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const lines = headerBlock.split(/\r?\n/);
  let currentKey = '';

  for (const line of lines) {
    if (/^\s+/.test(line) && currentKey) {
      // Continuation of previous header
      headers[currentKey] += ' ' + line.trim();
    } else {
      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1) {
        currentKey = line.substring(0, colonIdx).trim().toLowerCase();
        const val = line.substring(colonIdx + 1).trim();
        headers[currentKey] = val;
      }
    }
  }

  return headers;
}

/**
 * Parses MIME body parts recursively
 */
function parseMimeBody(
  bodyContent: string,
  contentType: string,
  contentTransferEncoding: string,
  result: { textBody: string; htmlBody: string; attachments: ParsedEmailAttachment[] }
) {
  const isMultipart = contentType.toLowerCase().includes('multipart/');

  if (isMultipart) {
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;\s]+))/i);
    if (boundaryMatch) {
      const boundary = boundaryMatch[1] || boundaryMatch[2];
      const parts = bodyContent.split(new RegExp(`--${boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));

      for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        if (part.startsWith('--')) break; // Ending boundary

        // Split part header and part body
        const splitIdx = part.search(/\r?\n\r?\n/);
        if (splitIdx === -1) continue;

        const partHeaderStr = part.substring(0, splitIdx);
        const partBodyStr = part.substring(splitIdx).replace(/^\r?\n\r?\n/, '').replace(/\r?\n$/, '');
        const partHeaders = parseHeaders(partHeaderStr);

        const partContentType = partHeaders['content-type'] || 'text/plain';
        const partTransferEncoding = partHeaders['content-transfer-encoding'] || '7bit';
        const partDisposition = partHeaders['content-disposition'] || '';

        // Check if attachment
        const isAttachment =
          partDisposition.toLowerCase().includes('attachment') ||
          partContentType.toLowerCase().includes('name=') ||
          partDisposition.toLowerCase().includes('filename=');

        if (isAttachment) {
          let filename = 'attachment';
          const fnMatch =
            partDisposition.match(/filename=(?:"([^"]+)"|([^;\s]+))/i) ||
            partContentType.match(/name=(?:"([^"]+)"|([^;\s]+))/i);
          if (fnMatch) {
            filename = decodeRfc2047(fnMatch[1] || fnMatch[2]);
          }

          const cleanType = partContentType.split(';')[0].trim().toLowerCase();
          let base64Data = '';

          if (partTransferEncoding.toLowerCase().includes('base64')) {
            base64Data = partBodyStr.replace(/\s+/g, '');
          } else {
            base64Data = Buffer.from(partBodyStr).toString('base64');
          }

          const rawBytes = Buffer.from(base64Data, 'base64');
          result.attachments.push({
            name: filename,
            size: rawBytes.length,
            type: cleanType || 'application/octet-stream',
            dataUrl: `data:${cleanType || 'application/octet-stream'};base64,${base64Data}`,
          });
        } else {
          // Recursive parse for nested multipart (e.g. multipart/related inside multipart/alternative)
          parseMimeBody(partBodyStr, partContentType, partTransferEncoding, result);
        }
      }
      return;
    }
  }

  // Single part text or HTML
  let decodedBody = bodyContent;
  const encoding = (contentTransferEncoding || '').toLowerCase().trim();

  if (encoding === 'base64') {
    try {
      decodedBody = Buffer.from(bodyContent.replace(/\s+/g, ''), 'base64').toString('utf8');
    } catch {
      decodedBody = bodyContent;
    }
  } else if (encoding === 'quoted-printable') {
    decodedBody = decodeQuotedPrintable(bodyContent);
  }

  const cleanContentType = contentType.toLowerCase();
  if (cleanContentType.includes('text/html')) {
    result.htmlBody = decodedBody;
    if (!result.textBody) {
      result.textBody = htmlToPlainText(decodedBody);
    }
  } else {
    // Default to text
    if (!result.textBody) {
      result.textBody = decodedBody.trim();
    } else {
      result.textBody += '\n' + decodedBody.trim();
    }
  }
}

/**
 * Main parser entry point: Parses a raw RFC 2822 email string into structured ParsedEmail
 */
export function parseRawEmail(rawMessage: string): ParsedEmail {
  // 1. Separate Headers from Body
  const splitIdx = rawMessage.search(/\r?\n\r?\n/);
  let headerBlock = '';
  let bodyBlock = '';

  if (splitIdx !== -1) {
    headerBlock = rawMessage.substring(0, splitIdx);
    bodyBlock = rawMessage.substring(splitIdx).replace(/^\r?\n\r?\n/, '');
  } else {
    headerBlock = rawMessage;
    bodyBlock = '';
  }

  const rawHeaders = parseHeaders(headerBlock);

  // 2. Extract standard fields
  const messageId = (rawHeaders['message-id'] || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`)
    .replace(/[<>]/g, '')
    .trim();
  const rawFrom = rawHeaders['from'] || '';
  const { address: from, name: fromName } = parseAddress(rawFrom);
  const rawTo = rawHeaders['to'] || '';
  const { address: to } = parseAddress(rawTo);
  const subject = decodeRfc2047(rawHeaders['subject'] || '(No Subject)').trim();
  const date = rawHeaders['date'] ? new Date(rawHeaders['date']).toISOString() : new Date().toISOString();

  const contentType = rawHeaders['content-type'] || 'text/plain; charset=utf-8';
  const contentTransferEncoding = rawHeaders['content-transfer-encoding'] || '7bit';

  // 3. Parse MIME Body & Attachments
  const parsedBody = {
    textBody: '',
    htmlBody: '',
    attachments: [] as ParsedEmailAttachment[],
  };

  parseMimeBody(bodyBlock, contentType, contentTransferEncoding, parsedBody);

  const finalTextBody = parsedBody.textBody || (parsedBody.htmlBody ? htmlToPlainText(parsedBody.htmlBody) : '');

  return {
    messageId,
    from,
    fromName,
    to,
    subject,
    date,
    textBody: finalTextBody,
    htmlBody: parsedBody.htmlBody,
    attachments: parsedBody.attachments,
    rawHeaders,
  };
}
