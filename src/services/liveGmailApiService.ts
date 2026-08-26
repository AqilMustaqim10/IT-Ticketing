import { InboundEmailPayload, InboundEmailAttachment } from '../types';

export interface GmailMessageHeader {
  name: string;
  value: string;
}

export interface GmailMessagePart {
  partId: string;
  mimeType: string;
  filename: string;
  headers: GmailMessageHeader[];
  body: {
    size: number;
    data?: string;
    attachmentId?: string;
  };
  parts?: GmailMessagePart[];
}

export interface GmailMessageDetail {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: GmailMessageHeader[];
    mimeType: string;
    body: {
      size: number;
      data?: string;
    };
    parts?: GmailMessagePart[];
  };
}

/**
 * Decode Base64URL string (RFC 4648) from Gmail API into UTF-8 text
 */
function decodeBase64Url(base64UrlStr: string): string {
  try {
    const base64 = base64UrlStr.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  } catch (e) {
    try {
      return atob(base64UrlStr.replace(/-/g, '+').replace(/_/g, '/'));
    } catch {
      return '';
    }
  }
}

/**
 * Recursively extract plain text or HTML body from a message payload
 */
function extractBody(payload: GmailMessageDetail['payload']): string {
  if (payload.body && payload.body.data) {
    return decodeBase64Url(payload.body.data);
  }

  if (payload.parts && payload.parts.length > 0) {
    // 1. Try to find text/plain
    const textPart = payload.parts.find((p) => p.mimeType === 'text/plain');
    if (textPart?.body?.data) {
      return decodeBase64Url(textPart.body.data);
    }

    // 2. Try nested parts
    for (const part of payload.parts) {
      if (part.parts) {
        const sub = extractBody({ ...payload, parts: part.parts });
        if (sub) return sub;
      }
    }

    // 3. Fallback to HTML without tags
    const htmlPart = payload.parts.find((p) => p.mimeType === 'text/html');
    if (htmlPart?.body?.data) {
      const html = decodeBase64Url(htmlPart.body.data);
      // Strip html tags
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      return tmp.textContent || tmp.innerText || html;
    }
  }

  return '';
}

/**
 * Extract attachments from payload
 */
function extractAttachments(payload: GmailMessageDetail['payload']): InboundEmailAttachment[] {
  const attachments: InboundEmailAttachment[] = [];

  const traverse = (parts?: GmailMessagePart[]) => {
    if (!parts) return;
    for (const part of parts) {
      if (part.filename && part.filename.length > 0 && part.body) {
        attachments.push({
          name: part.filename,
          size: part.body.size ? `${(part.body.size / 1024).toFixed(1)} KB` : 'Unknown',
          type: part.mimeType || 'application/octet-stream',
          dataUrl: part.body.data
            ? `data:${part.mimeType};base64,${part.body.data.replace(/-/g, '+').replace(/_/g, '/')}`
            : undefined,
        });
      }
      if (part.parts) {
        traverse(part.parts);
      }
    }
  };

  traverse(payload.parts);
  return attachments;
}

/**
 * Service to interact directly with the Google Gmail REST API v1
 */
export class LiveGmailApiService {
  /**
   * Fetch unread messages from user's primary inbox
   */
  public async fetchUnreadMessages(
    accessToken: string,
    maxResults: number = 10,
    query: string = 'is:unread in:inbox'
  ): Promise<InboundEmailPayload[]> {
    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(
      query
    )}&maxResults=${maxResults}`;

    const listRes = await fetch(listUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!listRes.ok) {
      const errJson = await listRes.json().catch(() => ({}));
      const rawMsg = errJson.error?.message || `Failed to fetch messages from Gmail API (${listRes.status})`;
      
      if (rawMsg.includes('Gmail API has not been used') || rawMsg.includes('is disabled')) {
        throw new Error(
          'GMAIL_API_DISABLED: The Gmail API is disabled in your Google Cloud Project. Please click the 1-click Enable link in the app to activate it, or use the instant Gmail Simulator tab.'
        );
      }

      if (rawMsg.toLowerCase().includes('insufficient') || rawMsg.toLowerCase().includes('scope') || listRes.status === 403) {
        throw new Error(
          `Missing Gmail Permissions (Google API: ${rawMsg}). Please click "Disconnect" and re-connect, ensuring all permission checkboxes are selected in Google's consent dialog.`
        );
      }
      throw new Error(rawMsg);
    }

    const listData = await listRes.json();
    const messages = listData.messages || [];

    if (messages.length === 0) {
      return [];
    }

    // Fetch full details for each message
    const parsedEmails: InboundEmailPayload[] = [];

    for (const msg of messages) {
      try {
        const detailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`;
        const detailRes = await fetch(detailUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!detailRes.ok) continue;

        const detail: GmailMessageDetail = await detailRes.json();
        const headers = detail.payload.headers || [];

        const fromHeader = headers.find((h) => h.name.toLowerCase() === 'from')?.value || '';
        const toHeader = headers.find((h) => h.name.toLowerCase() === 'to')?.value || '';
        const subjectHeader = headers.find((h) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
        const dateHeader = headers.find((h) => h.name.toLowerCase() === 'date')?.value || new Date().toISOString();

        const bodyContent = extractBody(detail.payload) || detail.snippet || '';
        const attachments = extractAttachments(detail.payload);

        parsedEmails.push({
          messageId: detail.id,
          from: fromHeader,
          to: toHeader,
          subject: subjectHeader,
          date: dateHeader,
          body: bodyContent,
          attachments,
        });
      } catch (err) {
        console.error(`Error loading message ${msg.id}:`, err);
      }
    }

    return parsedEmails;
  }

  /**
   * Mark a message as read by removing the UNREAD label
   */
  public async markAsRead(accessToken: string, messageId: string): Promise<boolean> {
    try {
      const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          removeLabelIds: ['UNREAD'],
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Send a real email reply/confirmation back to the user via Gmail API
   */
  public async sendAutoReplyEmail(
    accessToken: string,
    toAddress: string,
    subject: string,
    bodyText: string
  ): Promise<boolean> {
    try {
      const emailLines = [
        `To: ${toAddress}`,
        `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 7bit',
        '',
        bodyText,
      ];

      const rawEmail = emailLines.join('\r\n');
      const base64Safe = btoa(unescape(encodeURIComponent(rawEmail)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: base64Safe,
        }),
      });

      return res.ok;
    } catch (err) {
      console.error('Failed to send auto-reply via Gmail API:', err);
      return false;
    }
  }
}

export const liveGmailApiService = new LiveGmailApiService();
