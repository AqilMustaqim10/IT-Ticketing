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
  problemContent?: string;
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
 * Strips email signatures, corporate legal footers, confidentiality notices,
 * mobile device tags, quoted conversation threads, and opening greetings,
 * extracting purely the core problem statement / issue content.
 */
export function extractProblemContent(rawBody: string): string {
  if (!rawBody) return '';

  // If HTML is provided directly, convert to plain text first
  let text = rawBody.includes('<') && rawBody.includes('>') ? htmlToPlainText(rawBody) : rawBody;

  // Normalize newlines
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Split into lines
  const lines = text.split('\n');
  const cleanLines: string[] = [];

  // Patterns that indicate the beginning of a signature, quoted history, or disclaimer
  const cutOffPatterns = [
    // Quoted email thread headers & dividers
    /^-{3,}\s*original message\s*-{3,}/i,
    /^-{3,}\s*forwarded message\s*-{3,}/i,
    /^_{8,}/,
    /^-{8,}/,
    /^={8,}/,
    /^from:\s+.+@.+/i,
    /^(?:sent|date):\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}\s+\w+|\w+\s+\d{1,2})/i,
    /^on\s+.+\s+wrote:\s*$/i,
    /^at\s+.+\s+wrote:\s*$/i,

    // Standard RFC signature delimiter (-- )
    /^--\s*$/,
    /^_{2,}\s*$/,

    // Common Sign-offs / Closings (English & Malay)
    /^(?:thanks\s*(?:&|and)\s*best\s*regards|thanks\s*(?:&|and)\s*regards|thank\s*you\s*(?:&|and)\s*regards|best\s*regards|warm\s*regards|kind\s*regards|with\s*regards|regards|many\s*thanks|thanks\s*a\s*lot|thanks|thank\s*you(?:\s*very\s*much)?|yours\s*sincerely|yours\s*faithfully|yours\s*truly|sincerely|cheers|salam\s*hormat|salam\s*sejahtera|salam|sekian\s*terima\s*kasih|terima\s*kasih|wassalam)[,.\s!]*$/i,

    // Mobile device stamps
    /^sent\s+from\s+my\s+(?:iphone|ipad|galaxy|android|samsung|huawei|mobile|device)/i,
    /^sent\s+from\s+outlook\s+for\s+(?:ios|android)/i,
    /^get\s+outlook\s+for\s+(?:ios|android)/i,
    /^sent\s+from\s+mail\s+for\s+windows/i,
    /^sent\s+with\s+blackberry/i,

    // Legal / Confidentiality footers & Disclaimers
    /^(?:notice\s+of\s+confidentiality|confidentiality\s+(?:notice|note|statement)|disclaimer|important\s+notice)[:.\s]*$/i,
    /this\s+(?:email|e-mail|message)\s+(?:and\s+any\s+attachments?\s+)?(?:is|are)\s+(?:confidential|intended\s+solely|intended\s+only)/i,
    /the\s+information\s+contained\s+in\s+this\s+(?:email|e-mail|message|transmission)\s+is\s+confidential/i,
    /if\s+you\s+(?:have\s+received|are\s+not\s+the\s+intended\s+recipient).*?(?:in\s+error|delete|destroy)/i,
    /please\s+consider\s+the\s+environment\s+before\s+printing/i,
    /think\s+before\s+you\s+print/i,
    /virus-free\.\s+www\./i,
    /scanned\s+by\s+(?:symantec|mcafee|barracuda|avast|sophos|kaspersky|clamav)/i,
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip blockquote lines that start with ">"
    if (trimmed.startsWith('>')) {
      continue;
    }

    // Check if this line marks the start of a signature, quote, or footer
    let isCutOff = false;
    for (const pattern of cutOffPatterns) {
      if (pattern.test(trimmed)) {
        // If it's a sign-off or delimiter, ensure we have already gathered some text
        // so we don't accidentally cut everything if message is literally just one word
        if (cleanLines.some((l) => l.trim().length > 0)) {
          isCutOff = true;
          break;
        }
      }
    }

    if (isCutOff) {
      break;
    }

    cleanLines.push(line);
  }

  // Remove trailing contact info lines (Phone, Email, Web, Extension) from the end of cleanLines
  const contactLinePattern = /^(?:(?:tel|phone|mobile|ext|extension|fax|hp|h\/p|office)[:.\s]+[\d\s()+-]+|(?:email|e-mail)[:.\s]+[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|(?:website|web)[:.\s]+https?:\/\/|www\.[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/i;

  while (cleanLines.length > 0) {
    const last = cleanLines[cleanLines.length - 1].trim();
    if (!last || contactLinePattern.test(last)) {
      cleanLines.pop();
    } else {
      break;
    }
  }

  // Strip standalone opening greetings if followed by actual problem content
  // e.g. "Hi IT Support," or "Dear Helpdesk Team,"
  const greetingPattern = /^(?:hi|hello|dear|good\s+(?:morning|afternoon|evening|day))\s*(?:it\s+support(?:\s+team)?|support(?:\s+team)?|helpdesk|team|all|everyone|sir|madam)?\s*[,.:!]*$/i;

  let startIdx = 0;
  while (startIdx < cleanLines.length && !cleanLines[startIdx].trim()) {
    startIdx++;
  }

  if (startIdx < cleanLines.length && greetingPattern.test(cleanLines[startIdx].trim())) {
    // Check if there is non-empty content after the greeting
    const hasRemainingContent = cleanLines.slice(startIdx + 1).some((l) => l.trim().length > 0);
    if (hasRemainingContent) {
      startIdx++;
      // skip any blank lines directly following greeting
      while (startIdx < cleanLines.length && !cleanLines[startIdx].trim()) {
        startIdx++;
      }
    }
  }

  const finalResult = cleanLines
    .slice(startIdx)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // If extraction yielded something, return it; otherwise fallback to original sanitized text
  return finalResult || text.trim() || '(No problem description provided)';
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
  const problemContent = extractProblemContent(finalTextBody || parsedBody.htmlBody || '');

  return {
    messageId,
    from,
    fromName,
    to,
    subject,
    date,
    textBody: finalTextBody,
    htmlBody: parsedBody.htmlBody,
    problemContent,
    attachments: parsedBody.attachments,
    rawHeaders,
  };
}
