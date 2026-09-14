/**
 * @file emailIngestionService.ts
 * @description Email-to-Ticket & POP3 Ingestion Service.
 * Handles POP3 mailbox configuration, connection testing, email parsing,
 * automatic sender profile & department matching, priority classification,
 * attachment ingestion, dynamic ticket acknowledgment auto-reply, and ticket lifecycle creation.
 */

import {
  Pop3MailboxConfig,
  InboundEmailLog,
  Ticket,
  TicketPriority,
  TicketAttachment,
  User,
  BusinessUnit,
  Department,
  InboundEmailPayload,
} from '../types';
import { storageService, DEFAULT_USER_PASSWORD } from './storageService';

const STORAGE_KEY_POP3_CONFIG = 'it_ticketing_pop3_config_v1';
const STORAGE_KEY_EMAIL_LOGS = 'it_ticketing_email_logs_v1';

export const DEFAULT_AUTO_REPLY_SUBJECT_TEMPLATE =
  '[{ticketNumber}] Received: {ticketTitle}';

export const DEFAULT_AUTO_REPLY_BODY_TEMPLATE =
  `Hi {requesterName},\n\nThank you for reaching out to IT Support. Your request has been successfully received and a ticket has been created with Ticket Number: [{ticketNumber}].\n\nTicket Summary:\n• Ticket Number: [{ticketNumber}]\n• Subject: {ticketTitle}\n• Business Unit: {businessUnitName} ({businessUnitCode})\n• Department: {departmentName}\n• Priority: {priority}\n• Current Status: {status}\n\nOur IT Support team has been notified and is reviewing your issue. A specialist will attend to your request shortly.\n\n💡 Tip: You can reply directly to this email at any time to provide further details or upload attachments, and your message will automatically be added to this ticket.\n\nBest regards,\nIT Support Desk & Helpdesk Operations`;

export const DEFAULT_REPLY_ACK_TEMPLATE =
  `Hi {requesterName},\n\nWe have received your update for ticket [{ticketNumber}]: "{ticketTitle}".\n\nYour message has been appended to the active support case history and our assigned IT specialist has been notified.\n\nBest regards,\nIT Support Desk`;

export const DEFAULT_COMPANY_MAILBOX_CONFIG: Pop3MailboxConfig = {
  enabled: true,
  provider: 'COMPANY_POP3',
  companyDomain: 'uohospitality.com.my',
  host: 'mail.uohospitality.com.my',
  port: 995,
  user: 'ticket.support@uohospitality.com.my',
  password: '',
  useSSL: true,
  useSsl: true,
  emailAddress: 'ticket.support@uohospitality.com.my',
  username: 'ticket.support@uohospitality.com.my',
  appPassword: '',
  smtpEnabled: true,
  smtpHost: 'smtp.uohospitality.com.my',
  smtpPort: 587,
  smtpUseSsl: false,
  smtpUsername: 'ticket.support@uohospitality.com.my',
  smtpPassword: '',
  senderDisplayName: 'UOH Hospitality Support Desk',
  pollIntervalMinutes: 3,
  targetBusinessUnitId: 'bu-ccec',
  autoAssignCategory: true,
  autoExtractPriority: true,
  leaveCopyOnServer: true,
  enableAutoReply: true,
  autoReplySubjectTemplate: DEFAULT_AUTO_REPLY_SUBJECT_TEMPLATE,
  autoReplyBodyTemplate: DEFAULT_AUTO_REPLY_BODY_TEMPLATE,
  lastSyncTimestamp: undefined,
};

export const SAMPLE_TEST_EMAILS = [
  {
    id: 'sample-1',
    from: 'aaqil.mustaqim@uoa.com.my',
    fromName: 'Aaqil Mustaqim',
    to: 'ticket.support@uohospitality.com.my',
    subject: 'URGENT: POS Cashier Terminal #2 in Grand Ballroom not printing receipts',
    body: `Hi IT Helpdesk,\n\nThe POS terminal cashier machine in Grand Ballroom counter 2 suddenly stopped printing receipts. We have an ongoing banquet event with 300 guests arriving.\n\nError code on screen: "PRINTER_COM_PORT_TIMEOUT - Paper Feed Offline".\nRestarting the terminal did not solve it.\n\nPlease send someone immediately.\n\nRegards,\nAaqil Mustaqim\nCCEC Events & Banquets Team`,
    suggestedBU: 'bu-ccec',
    priority: 'URGENT' as TicketPriority,
    attachments: [
      {
        name: 'POS_Terminal2_Screen_Error.png',
        size: '1.2 MB',
        type: 'image/png',
        dataUrl: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=800&q=80',
      },
      {
        name: 'pos_hardware_diagnostics.log',
        size: '48 KB',
        type: 'text/plain',
        dataUrl: 'data:text/plain;charset=utf-8,2026-09-03%2009:14:22%20[WARN]%20COM3%20Device%20Epson%20TM-T88VI%20unresponsive%0A2026-09-03%2009:14:25%20[ERR]%20PRINTER_COM_PORT_TIMEOUT%3A%20Handshake%20failed%20after%203000ms%0A2026-09-03%2009:14:30%20[CRIT]%20POS_DRIVER%20status%3D0xFF01%20Paper%20Feed%20Offline',
      },
      {
        name: 'Banquet_Order_Batch_300Pax.pdf',
        size: '340 KB',
        type: 'application/pdf',
        dataUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      },
    ],
  },
  {
    id: 'sample-2',
    from: 'sarah.chen@uoa.com.my',
    fromName: 'Sarah Chen',
    to: 'ticket.support@uohospitality.com.my',
    subject: 'Outlook email login failed - Password synchronization error',
    body: `Hello Support Team,\n\nI am unable to log into my Microsoft Outlook 365 client this morning. It keeps asking for password repeatedly and returns error code "0x80040115".\n\nI have tried clearing browser cookies and reconnecting to corporate Wi-Fi.\n\nThank you,\nSarah Chen\nSales & Marketing Department`,
    suggestedBU: 'bu-ccec',
    priority: 'MEDIUM' as TicketPriority,
    attachments: [
      {
        name: 'Outlook_Error_0x80040115.png',
        size: '850 KB',
        type: 'image/png',
        dataUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80',
      },
    ],
  },
  {
    id: 'sample-3',
    from: 'david.kumar@uoa.com.my',
    fromName: 'David Kumar',
    to: 'ticket.support@uohospitality.com.my',
    subject: 'Kitchen Display System (KDS) screen flickering in Main Kitchen',
    body: `Hi IT Team,\n\nThe Kitchen Display System touch monitor at the hot line station has been flickering constantly since 11:00 AM. Orders are lagging by 3-4 minutes on the screen.\n\nOutlet: Botanica Deli & Dining\nStation: Kitchen Expediter 01\n\nAppreciate quick assistance before lunch rush.\n\nDavid Kumar\nF&B Kitchen Operations`,
    suggestedBU: 'bu-fnb',
    priority: 'HIGH' as TicketPriority,
    attachments: [
      {
        name: 'KDS_Display_Touch_Flicker.jpg',
        size: '2.1 MB',
        type: 'image/jpeg',
        dataUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
      },
      {
        name: 'Kitchen_Expediter_Config.json',
        size: '12 KB',
        type: 'application/json',
        dataUrl: 'data:application/json;charset=utf-8,%7B%22stationId%22%3A%22EXP-01%22%2C%22resolution%22%3A%221920x1080%22%2C%22refreshRate%22%3A60%2C%22driver%22%3A%22EloTouch_v4.2%22%7D',
      },
    ],
  },
  {
    id: 'sample-4',
    from: 'lisa.wong@uoa.com.my',
    fromName: 'Lisa Wong',
    to: 'ticket.support@uohospitality.com.my',
    subject: 'Front Desk Keycard encoder not connecting to Opera PMS',
    body: `Dear IT Support,\n\nOur VingCard RFID keycard encoder at Front Desk Terminal 3 is showing "Interface Not Responding" when attempting to make new guest room keys for Level 12.\n\nGuest check-in queue is building up.\n\nLisa Wong\nFront Office Supervisor\nHotel Suites`,
    suggestedBU: 'bu-hotel',
    priority: 'URGENT' as TicketPriority,
    attachments: [
      {
        name: 'VingCard_Interface_Error.png',
        size: '1.4 MB',
        type: 'image/png',
        dataUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80',
      },
      {
        name: 'Opera_PMS_Integration_Manual.pdf',
        size: '2.8 MB',
        type: 'application/pdf',
        dataUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      },
    ],
  },
  {
    id: 'sample-5',
    from: 'kevin.tan@uoa.com.my',
    fromName: 'Kevin Tan',
    to: 'ticket.support@uohospitality.com.my',
    subject: 'Access Card Reader offline at Level 8 Laboratory turnstile',
    body: `Hi IT Helpdesk,\n\nThe biometric card reader door access at Level 8 KLBS Laboratory turnstile is beeping red and not granting entry to researchers.\n\nStaff are currently unable to access the clean room zone.\n\nKevin Tan\nFacility & Operations\nKLBS`,
    suggestedBU: 'bu-klbs',
    priority: 'HIGH' as TicketPriority,
  },
];

class EmailIngestionService {
  /**
   * Loads current POP3 configuration
   */
  public getConfig(): Pop3MailboxConfig {
    const raw = localStorage.getItem(STORAGE_KEY_POP3_CONFIG);
    if (raw) {
      try {
        return { ...DEFAULT_COMPANY_MAILBOX_CONFIG, ...JSON.parse(raw) };
      } catch (e) {
        console.error('Failed to parse saved POP3 config', e);
      }
    }
    return { ...DEFAULT_COMPANY_MAILBOX_CONFIG };
  }

  /**
   * Persists POP3 configuration
   */
  public async saveConfig(config: Pop3MailboxConfig): Promise<void> {
    localStorage.setItem(STORAGE_KEY_POP3_CONFIG, JSON.stringify(config));
    try {
      await fetch('/api/email/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
    } catch {
      // Offline fallback
    }
  }

  /**
   * Loads config from server or local
   */
  public async fetchServerConfig(): Promise<Pop3MailboxConfig> {
    try {
      const res = await fetch('/api/email/config');
      if (res.ok) {
        const data = await res.json();
        if (data && data.host) {
          const merged = { ...this.getConfig(), ...data };
          localStorage.setItem(STORAGE_KEY_POP3_CONFIG, JSON.stringify(merged));
          return merged;
        }
      }
    } catch {
      // Fallback to local
    }
    return this.getConfig();
  }

  /**
   * Retrieves all inbound email logs
   */
  public getLogs(): InboundEmailLog[] {
    const raw = localStorage.getItem(STORAGE_KEY_EMAIL_LOGS);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.error('Failed to parse email logs', e);
      }
    }
    return [];
  }

  /**
   * Loads logs from server if available
   */
  public async fetchServerLogs(): Promise<InboundEmailLog[]> {
    try {
      const res = await fetch('/api/email/logs');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          localStorage.setItem(STORAGE_KEY_EMAIL_LOGS, JSON.stringify(data));
          return data;
        }
      }
    } catch {
      // Fallback
    }
    return this.getLogs();
  }

  /**
   * Clears inbound email history logs
   */
  public async clearLogs(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY_EMAIL_LOGS);
    try {
      await fetch('/api/email/logs', { method: 'DELETE' });
    } catch {
      // Ignore
    }
  }

  /**
   * Appends an inbound email log entry
   */
  public addLog(log: InboundEmailLog): void {
    const logs = this.getLogs();
    logs.unshift(log);
    // Keep last 100 logs
    const trimmed = logs.slice(0, 100);
    localStorage.setItem(STORAGE_KEY_EMAIL_LOGS, JSON.stringify(trimmed));
  }

  /**
   * Generates the automated email acknowledgment response with dynamic ticket variables
   */
  public generateAutoReply(
    ticket: Ticket,
    matchedUser: User,
    businessUnit: BusinessUnit,
    department: Department,
    isReply: boolean = false
  ): { subject: string; body: string } {
    const config = this.getConfig();

    const templateSubject =
      config.autoReplySubjectTemplate || DEFAULT_AUTO_REPLY_SUBJECT_TEMPLATE;
    const templateBody = isReply
      ? DEFAULT_REPLY_ACK_TEMPLATE
      : config.autoReplyBodyTemplate || DEFAULT_AUTO_REPLY_BODY_TEMPLATE;

    const replacer = (text: string) => {
      return text
        .replace(/{ticketNumber}/g, ticket.ticketNumber)
        .replace(/{ticketTitle}/g, ticket.title)
        .replace(/{requesterName}/g, matchedUser.fullName || matchedUser.username)
        .replace(/{requesterEmail}/g, matchedUser.email)
        .replace(/{businessUnitName}/g, businessUnit.name)
        .replace(/{businessUnitCode}/g, businessUnit.code)
        .replace(/{departmentName}/g, department.name)
        .replace(/{priority}/g, ticket.priority)
        .replace(/{status}/g, ticket.status)
        .replace(
          /{createdAt}/g,
          new Date(ticket.createdAt).toLocaleString([], {
            dateStyle: 'medium',
            timeStyle: 'short',
          })
        );
    };

    const subject = isReply
      ? `[${ticket.ticketNumber}] Update Received: ${ticket.title}`
      : replacer(templateSubject);

    const body = replacer(templateBody);

    return {
      subject: subject.startsWith(`[${ticket.ticketNumber}]`)
        ? subject
        : `[${ticket.ticketNumber}] ${subject}`,
      body,
    };
  }

  /**
   * Performs an interactive Company POP3 mailbox connection & authentication test via backend
   */
  public async testPop3Connection(config: Pop3MailboxConfig): Promise<{
    success: boolean;
    message: string;
    details?: {
      host: string;
      port: number;
      ssl: boolean;
      mailboxStatus: string;
      pendingMessagesCount: number;
      pingMs: number;
    };
  }> {
    if (!config.host || !config.host.trim()) {
      return { success: false, message: 'Corporate Mail Server Host is required (e.g. mail.yourcompany.com)' };
    }
    if (!config.emailAddress || !config.emailAddress.includes('@')) {
      return { success: false, message: 'A valid company email address is required (e.g. helpdesk@yourcompany.com).' };
    }

    try {
      const res = await fetch('/api/email/test-pop3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        return await res.json();
      }
      const errText = await res.text();
      return {
        success: false,
        message: `POP3 Probe Server returned HTTP ${res.status}: ${errText || res.statusText}`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to execute POP3 probe: ${err.message}`,
      };
    }
  }

  /**
   * Performs an interactive SMTP Outbound notification server test
   */
  public async testSmtpConnection(config: Pop3MailboxConfig): Promise<{
    success: boolean;
    message: string;
    details?: {
      host: string;
      port: number;
      ssl?: boolean;
      sender?: string;
      banner?: string;
      authenticated?: boolean;
      pingMs: number;
      serverCapabilities?: string[];
    };
  }> {
    if (!config.smtpHost || !config.smtpHost.trim()) {
      return { success: false, message: 'SMTP Hostname is required (e.g. mail.yourcompany.com)' };
    }

    try {
      const res = await fetch('/api/email/test-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        return await res.json();
      }
      const errText = await res.text();
      return {
        success: false,
        message: `SMTP Probe Server returned HTTP ${res.status}: ${errText || res.statusText}`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to execute SMTP probe: ${err.message}`,
      };
    }
  }

  /**
   * Fetches new emails from the real POP3 mailbox via backend
   */
  public async fetchPop3EmailsNow(config?: Pop3MailboxConfig): Promise<{
    success: boolean;
    fetchedCount: number;
    createdTickets: { ticketId: string; ticketNumber: string; isReply: boolean; subject: string; from: string }[];
    skippedCount: number;
    totalInMailbox: number;
    message: string;
  }> {
    try {
      const res = await fetch('/api/email/fetch-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config || this.getConfig()),
      });
      if (res.ok) {
        const data = await res.json();
        // Reload tickets into local storage if PostgreSQL updated
        await storageService.loadFromPostgres();
        // Refresh logs
        await this.fetchServerLogs();
        return data;
      }
      return {
        success: false,
        fetchedCount: 0,
        createdTickets: [],
        skippedCount: 0,
        totalInMailbox: 0,
        message: `Server returned status HTTP ${res.status}`,
      };
    } catch (err: any) {
      return {
        success: false,
        fetchedCount: 0,
        createdTickets: [],
        skippedCount: 0,
        totalInMailbox: 0,
        message: `POP3 Fetch network error: ${err.message}`,
      };
    }
  }

  /**
   * Strips email signatures, corporate legal footers, confidentiality notices,
   * mobile device tags, quoted conversation threads, and opening greetings,
   * extracting purely the core problem statement / issue content.
   */
  public extractProblemContent(rawBody: string): string {
    if (!rawBody) return '';

    // Strip basic HTML if present
    let text = rawBody.replace(/<[^>]+>/g, ' ');
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    const lines = text.split('\n');
    const cleanLines: string[] = [];

    const cutOffPatterns = [
      /^-{3,}\s*original message\s*-{3,}/i,
      /^-{3,}\s*forwarded message\s*-{3,}/i,
      /^_{8,}/,
      /^-{8,}/,
      /^={8,}/,
      /^from:\s+.+@.+/i,
      /^(?:sent|date):\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}\s+\w+|\w+\s+\d{1,2})/i,
      /^on\s+.+\s+wrote:\s*$/i,
      /^at\s+.+\s+wrote:\s*$/i,
      /^--\s*$/,
      /^_{2,}\s*$/,
      /^(?:thanks\s*(?:&|and)\s*best\s*regards|thanks\s*(?:&|and)\s*regards|thank\s*you\s*(?:&|and)\s*regards|best\s*regards|warm\s*regards|kind\s*regards|with\s*regards|regards|many\s*thanks|thanks\s*a\s*lot|thanks|thank\s*you(?:\s*very\s*much)?|yours\s*sincerely|yours\s*faithfully|yours\s*truly|sincerely|cheers|salam\s*hormat|salam\s*sejahtera|salam|sekian\s*terima\s*kasih|terima\s*kasih|wassalam)[,.\s!]*$/i,
      /^sent\s+from\s+my\s+(?:iphone|ipad|galaxy|android|samsung|huawei|mobile|device)/i,
      /^sent\s+from\s+outlook\s+for\s+(?:ios|android)/i,
      /^get\s+outlook\s+for\s+(?:ios|android)/i,
      /^sent\s+from\s+mail\s+for\s+windows/i,
      /^sent\s+with\s+blackberry/i,
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

      if (trimmed.startsWith('>')) continue;

      let isCutOff = false;
      for (const pattern of cutOffPatterns) {
        if (pattern.test(trimmed)) {
          if (cleanLines.some((l) => l.trim().length > 0)) {
            isCutOff = true;
            break;
          }
        }
      }

      if (isCutOff) break;
      cleanLines.push(line);
    }

    const contactLinePattern = /^(?:(?:tel|phone|mobile|ext|extension|fax|hp|h\/p|office)[:.\s]+[\d\s()+-]+|(?:email|e-mail)[:.\s]+[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|(?:website|web)[:.\s]+https?:\/\/|www\.[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/i;

    while (cleanLines.length > 0) {
      const last = cleanLines[cleanLines.length - 1].trim();
      if (!last || contactLinePattern.test(last)) {
        cleanLines.pop();
      } else {
        break;
      }
    }

    const greetingPattern = /^(?:hi|hello|dear|good\s+(?:morning|afternoon|evening|day))\s*(?:it\s+support(?:\s+team)?|support(?:\s+team)?|helpdesk|team|all|everyone|sir|madam)?\s*[,.:!]*$/i;

    let startIdx = 0;
    while (startIdx < cleanLines.length && !cleanLines[startIdx].trim()) {
      startIdx++;
    }

    if (startIdx < cleanLines.length && greetingPattern.test(cleanLines[startIdx].trim())) {
      const hasRemainingContent = cleanLines.slice(startIdx + 1).some((l) => l.trim().length > 0);
      if (hasRemainingContent) {
        startIdx++;
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

    return finalResult || text.trim() || '(No problem description provided)';
  }

  /**
   * Automatically classifies priority from email subject and problem content.
   * Prevents false URGENT flags caused by corporate disclaimers or footer phrases (e.g. "immediately").
   * Routine IT issues (printer, jam, toner, mouse, keyboard, monitor, display, wifi, password, email) default to MEDIUM.
   */
  public detectPriority(subject: string, body: string): TicketPriority {
    const cleanSub = subject.toLowerCase().trim();
    const cleanBody = body.toLowerCase().trim();
    const combined = `${cleanSub} \n ${cleanBody}`;

    // 1. Explicit priority tag in subject brackets or form prefix
    if (
      /\[\s*(?:urgent|kecemasan)\s*\]/i.test(cleanSub) ||
      /^(?:urgency|priority)\s*:\s*(?:urgent|kecemasan)\b/im.test(cleanBody)
    ) {
      return 'URGENT';
    }
    if (
      /\[\s*(?:high(?:\s+priority)?|p1|tinggi)\s*\]/i.test(cleanSub) ||
      /^(?:urgency|priority)\s*:\s*(?:high|p1|tinggi)\b/im.test(cleanBody)
    ) {
      return 'HIGH';
    }
    if (
      /\[\s*(?:low(?:\s+priority)?|p3|rendah)\s*\]/i.test(cleanSub) ||
      /^(?:urgency|priority)\s*:\s*(?:low|p3|rendah)\b/im.test(cleanBody)
    ) {
      return 'LOW';
    }
    if (
      /\[\s*(?:medium(?:\s+priority)?|p2|sederhana)\s*\]/i.test(cleanSub) ||
      /^(?:urgency|priority)\s*:\s*(?:medium|p2|sederhana)\b/im.test(cleanBody)
    ) {
      return 'MEDIUM';
    }

    // 2. Critical Emergencies / Outages (URGENT)
    const urgentRegex = /\b(?:urgent|urgently|emergency|kecemasan|critical\s+outage|system\s+down|systems\s+down|hotel\s+down|opera\s+down|pms\s+down|cannot\s+check\s*in|total\s+outage|total\s+failure|blackout|power\s+outage|p0|sev-?1|severity\s*1)\b/i;

    if (urgentRegex.test(combined)) {
      return 'URGENT';
    }

    // 3. High Impact / Production Blockers (HIGH)
    const highRegex = /\b(?:high\s+priority|p1|sev-?2|severity\s*2|pos(?:\s+terminal)?\s+down|pos\s+offline|pos\s+broken|kds\s+down|kitchen\s+display\s+down|turnstile\s+down|door\s+lock\s+failure|keycard\s+(?:encoder\s+)?(?:down|failure|offline)|guests?\s+waiting|queue\s+building|operations?\s+halted|halted|production\s+down)\b/i;

    if (highRegex.test(combined)) {
      return 'HIGH';
    }

    // 4. Low Priority (LOW)
    const lowRegex = /\b(?:low\s+priority|p3|sev-?4|cosmetic|minor|enhancement|suggestion|when\s+free|no\s+rush|whenever\s+possible|fyi|general\s+inquiry|question)\b/i;

    if (lowRegex.test(combined)) {
      return 'LOW';
    }

    // 5. Default IT Support Priority: MEDIUM
    return 'MEDIUM';
  }

  /**
   * Automatically matches or creates a User profile based on inbound sender email address
   */
  public resolveOrCreateUser(fromAddress: string, fromName?: string, defaultBUId?: string): User {
    const cleanEmail = fromAddress.trim().toLowerCase();
    const allUsers = storageService.getAllUsers();
    
    const existing = allUsers.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return existing;
    }

    let detectedBUId = defaultBUId || 'bu-ccec';
    if (cleanEmail.includes('hotel')) detectedBUId = 'bu-hotel';
    else if (cleanEmail.includes('fnb') || cleanEmail.includes('botanica')) detectedBUId = 'bu-fnb';
    else if (cleanEmail.includes('klbs')) detectedBUId = 'bu-klbs';
    else if (cleanEmail.includes('klw')) detectedBUId = 'bu-klw';

    const depts = storageService.getDepartments(detectedBUId);
    const defaultDeptId = depts[0]?.id || 'dept-ops';

    const inferredName = fromName && fromName.trim().length > 0
      ? fromName.trim()
      : cleanEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    const newUser: User = {
      id: `user-email-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      username: cleanEmail.split('@')[0],
      fullName: inferredName,
      email: cleanEmail,
      role: 'USER',
      businessUnitId: detectedBUId,
      departmentId: defaultDeptId,
      password: DEFAULT_USER_PASSWORD,
      createdAt: new Date().toISOString(),
    };

    allUsers.push(newUser);
    localStorage.setItem('it_ticketing_users_v2', JSON.stringify(allUsers));

    return newUser;
  }

  /**
   * Resolves Business Unit for the incoming email
   */
  public resolveBusinessUnit(
    matchedUser: User,
    subject: string,
    body: string,
    allBUs: BusinessUnit[]
  ): BusinessUnit {
    const text = `${subject} ${body}`.toLowerCase();

    if (text.includes('ccec') || text.includes('ballroom') || text.includes('convention') || text.includes('banquet')) {
      const bu = allBUs.find((b) => b.code === 'CCEC');
      if (bu) return bu;
    }
    if (text.includes('f&b') || text.includes('botanica') || text.includes('kitchen') || text.includes('restaurant') || text.includes('deli')) {
      const bu = allBUs.find((b) => b.code === 'F&B');
      if (bu) return bu;
    }
    if (text.includes('hotel') || text.includes('room') || text.includes('front desk') || text.includes('opera pms') || text.includes('keycard')) {
      const bu = allBUs.find((b) => b.code === 'HOTEL');
      if (bu) return bu;
    }
    if (text.includes('klbs') || text.includes('biotech') || text.includes('lab')) {
      const bu = allBUs.find((b) => b.code === 'KLBS');
      if (bu) return bu;
    }
    if (text.includes('klw') || text.includes('waterfront')) {
      const bu = allBUs.find((b) => b.code === 'KLW');
      if (bu) return bu;
    }

    const userBU = allBUs.find((b) => b.id === matchedUser.businessUnitId);
    if (userBU) return userBU;

    return allBUs[0];
  }

  /**
   * Resolves Department based on content and matched Business Unit
   */
  public resolveDepartment(
    matchedUser: User,
    businessUnit: BusinessUnit,
    subject: string,
    body: string,
    allDepts: Department[]
  ): Department {
    const buDepts = allDepts.filter((d) => d.businessUnitId === businessUnit.id);
    if (buDepts.length === 0) {
      return allDepts[0];
    }

    const text = `${subject} ${body}`.toLowerCase();

    if (text.includes('pos') || text.includes('cashier') || text.includes('banquet') || text.includes('event')) {
      const match = buDepts.find((d) => d.name.toLowerCase().includes('banquet') || d.name.toLowerCase().includes('event') || d.name.toLowerCase().includes('operation'));
      if (match) return match;
    }
    if (text.includes('kitchen') || text.includes('chef') || text.includes('kds')) {
      const match = buDepts.find((d) => d.name.toLowerCase().includes('kitchen') || d.name.toLowerCase().includes('culinary'));
      if (match) return match;
    }
    if (text.includes('front desk') || text.includes('reception') || text.includes('concierge')) {
      const match = buDepts.find((d) => d.name.toLowerCase().includes('front') || d.name.toLowerCase().includes('reception'));
      if (match) return match;
    }
    if (text.includes('outlook') || text.includes('email') || text.includes('sales') || text.includes('marketing')) {
      const match = buDepts.find((d) => d.name.toLowerCase().includes('sales') || d.name.toLowerCase().includes('marketing') || d.name.toLowerCase().includes('admin'));
      if (match) return match;
    }

    const userDept = buDepts.find((d) => d.id === matchedUser.departmentId);
    if (userDept) return userDept;

    return buDepts[0];
  }

  /**
   * Helper to convert raw email attachments to TicketAttachment objects
   */
  private mapAttachments(rawAttachments?: InboundEmailPayload['attachments']): TicketAttachment[] {
    if (!rawAttachments || rawAttachments.length === 0) return [];
    return rawAttachments.map((att, idx) => {
      let sizeBytes = 1024;
      if (typeof att.size === 'number') {
        sizeBytes = att.size;
      } else if (typeof att.size === 'string') {
        const num = parseFloat(att.size);
        if (att.size.toUpperCase().includes('MB')) sizeBytes = Math.round(num * 1024 * 1024);
        else if (att.size.toUpperCase().includes('KB')) sizeBytes = Math.round(num * 1024);
        else sizeBytes = isNaN(num) ? 1024 : Math.round(num);
      }

      return {
        id: `att-${Date.now()}-${idx}`,
        name: att.name,
        size: sizeBytes,
        type: att.type || 'application/octet-stream',
        url: att.dataUrl || '#',
        uploadedAt: new Date().toISOString(),
      };
    });
  }

  /**
   * Processes an incoming raw email, resolves entities, and creates or replies to a Ticket
   */
  public async processInboundEmail(rawEmail: InboundEmailPayload): Promise<{
    success: boolean;
    ticket?: Ticket;
    isReply?: boolean;
    message: string;
    log: InboundEmailLog;
  }> {
    const config = this.getConfig();
    const allBUs = storageService.getBusinessUnits();
    const allDepts = storageService.getDepartments();

    const cleanFrom = rawEmail.from.trim();
    const cleanSubject = rawEmail.subject.trim();
    // Extract strictly the problem description, stripping signatures, greetings, and footers
    const cleanBody = this.extractProblemContent(rawEmail.body).trim() || '(No problem description provided)';
    const mappedAttachments = this.mapAttachments(rawEmail.attachments);

    // 1. Resolve User & Organization
    const matchedUser = this.resolveOrCreateUser(cleanFrom, rawEmail.fromName, config.targetBusinessUnitId);
    const resolvedBU = this.resolveBusinessUnit(matchedUser, cleanSubject, cleanBody, allBUs);
    const resolvedDept = this.resolveDepartment(matchedUser, resolvedBU, cleanSubject, cleanBody, allDepts);

    // 2. Check if this is a reply to an existing ticket (e.g. "[TCK-1002]" in subject)
    const ticketNumberRegex = /\[(TCK-\d+)\]/i;
    const ticketMatch = cleanSubject.match(ticketNumberRegex);

    if (ticketMatch && ticketMatch[1]) {
      const existingTicketNumber = ticketMatch[1].toUpperCase();
      const allTickets = storageService.getAllTickets();
      const existingTicket = allTickets.find((t) => t.ticketNumber.toUpperCase() === existingTicketNumber);

      if (existingTicket) {
        // Append email as a reply comment activity
        const updateRes = storageService.updateTicket(matchedUser, existingTicket.id, {
          comment: cleanBody,
          newAttachments: mappedAttachments,
        });

        const updatedTicket = updateRes.ticket || existingTicket;

        // Generate auto reply acknowledgment if enabled
        let autoReplyData: { subject: string; body: string } | undefined;
        if (config.enableAutoReply) {
          const bu = allBUs.find((b) => b.id === existingTicket.businessUnitId) || resolvedBU;
          const dept = allDepts.find((d) => d.id === existingTicket.departmentId) || resolvedDept;
          autoReplyData = this.generateAutoReply(
            updatedTicket,
            matchedUser,
            bu,
            dept,
            true
          );
        }

        const replyLog: InboundEmailLog = {
          id: `email-log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          fromAddress: cleanFrom,
          fromName: rawEmail.fromName || matchedUser.fullName,
          toAddress: rawEmail.to || config.emailAddress,
          subject: cleanSubject,
          bodyPreview: cleanBody.substring(0, 120),
          rawBody: cleanBody,
          receivedAt: new Date().toISOString(),
          status: 'REPLIED_TO_EXISTING',
          createdTicketId: existingTicket.id,
          createdTicketNumber: existingTicket.ticketNumber,
          matchedUserId: matchedUser.id,
          matchedBusinessUnitId: existingTicket.businessUnitId,
          matchedDepartmentId: existingTicket.departmentId,
          attachmentsCount: rawEmail.attachments?.length || 0,
          autoReplySent: config.enableAutoReply,
          autoReplySubject: autoReplyData?.subject,
          autoReplyBody: autoReplyData?.body,
        };

        this.addLog(replyLog);
        return {
          success: true,
          ticket: updatedTicket,
          isReply: true,
          message: `Email reply appended to existing Ticket #${existingTicket.ticketNumber}`,
          log: replyLog,
        };
      }
    }

    // 3. Create a brand new Ticket
    const sanitizedTitle = cleanSubject.replace(/^(fwd|fw|re):\s*/i, '').trim() || 'Inbound Email Support Request';
    const priority = config.autoExtractPriority ? this.detectPriority(cleanSubject, cleanBody) : 'MEDIUM';

    // Pure problem content as ticket description
    const newTicket = storageService.createTicket(matchedUser, {
      title: sanitizedTitle,
      description: cleanBody,
      priority,
      businessUnitId: resolvedBU.id,
      departmentId: resolvedDept.id,
      attachments: mappedAttachments,
    });

    // 4. Generate Automated Confirmation Email to Requester
    const autoReplyData = this.generateAutoReply(
      newTicket,
      matchedUser,
      resolvedBU,
      resolvedDept,
      false
    );

    const successLog: InboundEmailLog = {
      id: `email-log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      fromAddress: cleanFrom,
      fromName: rawEmail.fromName || matchedUser.fullName,
      toAddress: rawEmail.to || config.emailAddress,
      subject: cleanSubject,
      bodyPreview: cleanBody.substring(0, 120),
      rawBody: cleanBody,
      receivedAt: new Date().toISOString(),
      status: 'PROCESSED',
      createdTicketId: newTicket.id,
      createdTicketNumber: newTicket.ticketNumber,
      matchedUserId: matchedUser.id,
      matchedBusinessUnitId: resolvedBU.id,
      matchedDepartmentId: resolvedDept.id,
      attachmentsCount: rawEmail.attachments?.length || 0,
      autoReplySent: config.enableAutoReply,
      autoReplySubject: autoReplyData.subject,
      autoReplyBody: autoReplyData.body,
    };

    this.addLog(successLog);

    config.lastSyncTimestamp = new Date().toISOString();
    this.saveConfig(config);

    return {
      success: true,
      ticket: newTicket,
      isReply: false,
      message: `Ticket #${newTicket.ticketNumber} created successfully from email!`,
      log: successLog,
    };
  }

  /**
   * Triggers automated email notification when a ticket status changes (e.g. IN_PROGRESS, RESOLVED)
   */
  public async notifyTicketStatusChange(params: {
    ticketId: string;
    ticketNumber: string;
    ticketTitle: string;
    newStatus: string;
    oldStatus: string;
    requesterEmail: string;
    requesterName?: string;
    technicianName?: string;
    resolutionNotes?: string;
    businessUnitName?: string;
  }): Promise<{ success: boolean; delivered: boolean; message: string }> {
    try {
      const response = await fetch('/api/email/notify-status-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await response.json();
      return data;
    } catch (err: any) {
      console.error('Failed to dispatch status change notification email:', err);
      return { success: false, delivered: false, message: err.message };
    }
  }

  /**
   * Automatically sends / logs a ticket solved / closed email notification to the requester.
   */
  public sendTicketSolvedEmail(
    ticket: Ticket,
    requester: { fullName: string; email: string },
    resolverName: string
  ): InboundEmailLog {
    const config = this.getConfig();
    const subject = `[${ticket.ticketNumber}] Solved & Closed: ${ticket.title}`;
    const body = `Hi ${requester.fullName},\n\nGood news! Your support ticket [${ticket.ticketNumber}] ("${ticket.title}") has been marked as **RESOLVED / CLOSED** by ${resolverName}.\n\nResolution Summary:\n• Ticket Number: [${ticket.ticketNumber}]\n• Status: ${ticket.status}\n• Resolution Notes: ${ticket.resolutionNotes || 'Issue resolved successfully by IT Support.'}\n\nIf you are still experiencing issues or need further assistance regarding this matter, please feel free to reply directly to this email or reopen the ticket in the IT Support Portal.\n\nThank you for using UOH Hospitality IT Support Desk.\n\nBest regards,\n${resolverName}\nIT Support Operations`;

    const log: InboundEmailLog = {
      id: `email-solved-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      fromAddress: config.emailAddress || 'ticket.support@uohospitality.com.my',
      fromName: 'UOH Hospitality Support Desk',
      toAddress: requester.email || 'staff@uohospitality.com.my',
      subject,
      bodyPreview: body.substring(0, 120),
      rawBody: body,
      receivedAt: new Date().toISOString(),
      status: 'PROCESSED',
      createdTicketId: ticket.id,
      createdTicketNumber: ticket.ticketNumber,
      matchedUserId: ticket.createdById,
      matchedBusinessUnitId: ticket.businessUnitId,
      matchedDepartmentId: ticket.departmentId,
      attachmentsCount: 0,
      autoReplySent: true,
      autoReplySubject: subject,
      autoReplyBody: body,
    };

    this.addLog(log);
    return log;
  }

  /**
   * Pulls sample emails and simulates mailbox sync
   */
  public async syncSampleMailbox(): Promise<{
    processedCount: number;
    createdTickets: Ticket[];
  }> {
    const createdTickets: Ticket[] = [];
    const sample = SAMPLE_TEST_EMAILS[Math.floor(Math.random() * SAMPLE_TEST_EMAILS.length)];

    const res = await this.processInboundEmail({
      from: sample.from,
      fromName: sample.fromName,
      to: sample.to,
      subject: sample.subject,
      body: sample.body,
      attachments: (sample as any).attachments,
    });

    if (res.success && res.ticket) {
      createdTickets.push(res.ticket);
    }

    return {
      processedCount: createdTickets.length,
      createdTickets,
    };
  }
}

export const emailIngestionService = new EmailIngestionService();
