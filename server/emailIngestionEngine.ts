/**
 * @file emailIngestionEngine.ts
 * @description Server-Side Email Ingestion & POP3 Auto-Polling Engine.
 * Converts parsed inbound email reports into Tickets, assigns Business Unit & Department,
 * classifies Priority, updates existing tickets on reply, logs email ingestion history,
 * and runs automated background mailbox polling.
 */

import pg from 'pg';
import { ParsedEmail, ParsedEmailAttachment, extractProblemContent } from './emailParser';
import { fetchPop3Emails, testPop3Mailbox, Pop3Options } from './pop3Client';
import { sendSmtpEmail } from './smtpClient';

export interface ServerPop3Config {
  enabled: boolean;
  provider: 'COMPANY_POP3' | 'COMPANY_IMAP' | 'OFFICE365' | 'CUSTOM_SERVER';
  companyDomain?: string;
  host: string;
  port: number;
  useSsl: boolean;
  emailAddress: string;
  username?: string;
  appPassword?: string;
  smtpEnabled?: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpUseSsl?: boolean;
  smtpUsername?: string;
  smtpPassword?: string;
  senderDisplayName?: string;
  pollIntervalMinutes: number;
  targetBusinessUnitId: string;
  defaultDepartmentId?: string;
  autoAssignCategory: boolean;
  autoExtractPriority: boolean;
  leaveCopyOnServer: boolean;
  enableAutoReply: boolean;
  autoReplySubjectTemplate?: string;
  autoReplyBodyTemplate?: string;
  lastSyncTimestamp?: string;
}

export const DEFAULT_SERVER_EMAIL_CONFIG: ServerPop3Config = {
  enabled: true,
  provider: 'COMPANY_POP3',
  companyDomain: 'uohospitality.com.my',
  host: 'mail.uohospitality.com.my',
  port: 995,
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
  autoReplySubjectTemplate: '[{ticketNumber}] Received: {ticketTitle}',
  autoReplyBodyTemplate:
    'Hi {requesterName},\n\nThank you for submitting your issue to IT Support. Ticket [{ticketNumber}] has been created.\n\nSummary:\n• Ticket: [{ticketNumber}]\n• Subject: {ticketTitle}\n• Business Unit: {businessUnitName}\n• Priority: {priority}\n\nOur team is reviewing your report.\n\nBest regards,\nIT Service Desk',
};

// In-memory fallback sets
let memoryProcessedMessageIds = new Set<string>();
let activePollerTimer: NodeJS.Timeout | null = null;
let currentConfig: ServerPop3Config = { ...DEFAULT_SERVER_EMAIL_CONFIG };

/**
 * Initializes email tables in PostgreSQL if connected
 */
export async function initEmailTables(pool: pg.Pool) {
  try {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS email_config (
          id VARCHAR(64) PRIMARY KEY,
          config JSONB NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS processed_email_messages (
          message_id VARCHAR(255) PRIMARY KEY,
          ticket_id VARCHAR(64),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS email_logs (
          id VARCHAR(64) PRIMARY KEY,
          message_id VARCHAR(255),
          from_address VARCHAR(255) NOT NULL,
          from_name VARCHAR(255),
          to_address VARCHAR(255) NOT NULL,
          subject TEXT NOT NULL,
          body_preview TEXT,
          raw_body TEXT,
          received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          status VARCHAR(50) NOT NULL,
          created_ticket_id VARCHAR(64),
          created_ticket_number VARCHAR(32),
          matched_user_id VARCHAR(64),
          matched_business_unit_id VARCHAR(64),
          matched_department_id VARCHAR(64),
          error_message TEXT,
          attachments_count INT DEFAULT 0,
          auto_reply_sent BOOLEAN DEFAULT FALSE,
          auto_reply_subject TEXT,
          auto_reply_body TEXT
        );
      `);

      // Load saved config if present
      const res = await client.query('SELECT config FROM email_config WHERE id = $1', ['primary_mailbox']);
      if (res.rows.length > 0 && res.rows[0].config) {
        currentConfig = { ...DEFAULT_SERVER_EMAIL_CONFIG, ...res.rows[0].config };
      }

      // Load known processed message IDs
      const msgRes = await client.query('SELECT message_id FROM processed_email_messages LIMIT 2000');
      for (const row of msgRes.rows) {
        memoryProcessedMessageIds.add(row.message_id);
      }

      // One-time cleanup for any previously ingested tickets with raw footers or false URGENT priorities
      try {
        await client.query(`
          UPDATE tickets
          SET description = REGEXP_REPLACE(description, E'\\n*---\\n*📨 \\[Auto-ingested via Corporate POP3 Mailbox[^\\]]*\\]', '', 'g')
          WHERE description LIKE '%[Auto-ingested via Corporate POP3 Mailbox%';
        `);

        // Re-evaluate tickets previously set to URGENT if their title/description are routine requests (e.g. printer, toner, slow, mouse, wifi)
        await client.query(`
          UPDATE tickets
          SET priority = 'MEDIUM'
          WHERE priority = 'URGENT'
            AND LOWER(title) NOT LIKE '%urgent%'
            AND LOWER(title) NOT LIKE '%emergency%'
            AND LOWER(title) NOT LIKE '%down%'
            AND LOWER(title) NOT LIKE '%outage%'
            AND LOWER(title) NOT LIKE '%blackout%'
            AND (
              LOWER(title) LIKE '%printer%' OR
              LOWER(title) LIKE '%toner%' OR
              LOWER(title) LIKE '%mouse%' OR
              LOWER(title) LIKE '%keyboard%' OR
              LOWER(title) LIKE '%monitor%' OR
              LOWER(title) LIKE '%slow%' OR
              LOWER(title) LIKE '%test%' OR
              LOWER(title) LIKE '%wifi%' OR
              LOWER(title) LIKE '%email%' OR
              LOWER(title) LIKE '%password%'
            );
        `);
      } catch (cleanErr: any) {
        // Safe ignore
      }

      console.log('Email Ingestion PostgreSQL tables verified and synced.');
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.warn('initEmailTables notice:', err.message);
  }
}

/**
 * Gets the current POP3 configuration
 */
export function getEmailConfig(): ServerPop3Config {
  return currentConfig;
}

/**
 * Saves POP3 configuration and reconfigures auto-poller
 */
export async function saveEmailConfig(pool: pg.Pool | null, newConfig: Partial<ServerPop3Config>): Promise<ServerPop3Config> {
  currentConfig = { ...currentConfig, ...newConfig };

  if (pool) {
    try {
      await pool.query(
        `INSERT INTO email_config (id, config, updated_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config, updated_at = CURRENT_TIMESTAMP`,
        ['primary_mailbox', JSON.stringify(currentConfig)]
      );
    } catch (err: any) {
      console.error('Failed to save email config to PostgreSQL:', err.message);
    }
  }

  // Restart poller with updated settings
  startBackgroundEmailPoller(pool);

  return currentConfig;
}

/**
 * Accurately classifies ticket priority based on subject and problem content.
 * Prevents false URGENT flags caused by corporate disclaimers or footer phrases (e.g. "immediately").
 * Routine IT issues (printer, jam, toner, mouse, keyboard, monitor, display, wifi, password, email) default to MEDIUM.
 */
export function detectPriority(subject: string, body: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' {
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
  // Must be word-bounded and not trigger on words like "immediately" in disclaimers
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
  // All routine operational tasks (printers, paper jams, toner, mouse, keyboard, monitor, wifi, password, email, etc.)
  return 'MEDIUM';
}

/**
 * Detects appropriate category
 */
export function detectCategory(subject: string, body: string): string {
  const text = `${subject} ${body}`.toLowerCase();
  if (text.includes('pos') || text.includes('cashier') || text.includes('payment')) return 'Point-of-Sale (POS)';
  if (text.includes('kds') || text.includes('kitchen') || text.includes('display')) return 'Kitchen Display System';
  if (text.includes('wifi') || text.includes('network') || text.includes('internet') || text.includes('cable')) return 'Network & Wi-Fi';
  if (text.includes('password') || text.includes('login') || text.includes('outlook') || text.includes('email') || text.includes('account')) return 'Email & Identity';
  if (text.includes('printer') || text.includes('hardware') || text.includes('scanner') || text.includes('kiosk')) return 'Hardware & Peripherals';
  if (text.includes('keycard') || text.includes('pms') || text.includes('opera') || text.includes('room')) return 'Hospitality Systems (PMS)';
  if (text.includes('access') || text.includes('turnstile') || text.includes('cctv') || text.includes('door')) return 'Access Control & Security';
  return 'General IT Support';
}

/**
 * Generates automated acknowledgment text replacing dynamic template tags
 */
export function generateServerAutoReply(
  templateSubject: string | undefined,
  templateBody: string | undefined,
  vars: {
    ticketNumber: string;
    ticketTitle: string;
    requesterName: string;
    requesterEmail: string;
    businessUnitName: string;
    businessUnitCode: string;
    departmentName: string;
    priority: string;
    status: string;
    createdAt?: string;
  },
  isReply: boolean = false
): { subject: string; body: string } {
  const defaultSubject = '[{ticketNumber}] Received: {ticketTitle}';
  const defaultBody =
    'Hi {requesterName},\n\nThank you for reaching out to IT Support. Your request has been successfully received and a ticket has been created with Ticket Number: [{ticketNumber}].\n\nTicket Summary:\n• Ticket Number: [{ticketNumber}]\n• Subject: {ticketTitle}\n• Business Unit: {businessUnitName} ({businessUnitCode})\n• Department: {departmentName}\n• Priority: {priority}\n• Current Status: {status}\n\nOur IT Support team has been notified and is reviewing your issue. A specialist will attend to your request shortly.\n\nBest regards,\nIT Support Desk';

  const defaultReplyBody =
    'Hi {requesterName},\n\nWe have received your update for ticket [{ticketNumber}]: "{ticketTitle}".\n\nYour message has been appended to the active support case history and our assigned IT specialist has been notified.\n\nBest regards,\nIT Support Desk';

  const subTpl = isReply ? `[{ticketNumber}] Update Received: {ticketTitle}` : (templateSubject || defaultSubject);
  const bodyTpl = isReply ? defaultReplyBody : (templateBody || defaultBody);

  const replacer = (text: string) => {
    return text
      .replace(/{ticketNumber}/g, vars.ticketNumber)
      .replace(/{ticketTitle}/g, vars.ticketTitle)
      .replace(/{requesterName}/g, vars.requesterName)
      .replace(/{requesterEmail}/g, vars.requesterEmail)
      .replace(/{businessUnitName}/g, vars.businessUnitName)
      .replace(/{businessUnitCode}/g, vars.businessUnitCode)
      .replace(/{departmentName}/g, vars.departmentName)
      .replace(/{priority}/g, vars.priority)
      .replace(/{status}/g, vars.status)
      .replace(/{createdAt}/g, vars.createdAt || new Date().toLocaleString());
  };

  const finalSubject = replacer(subTpl);
  const finalBody = replacer(bodyTpl);

  return {
    subject: finalSubject.startsWith(`[${vars.ticketNumber}]`) ? finalSubject : `[${vars.ticketNumber}] ${finalSubject}`,
    body: finalBody,
  };
}

/**
 * Ingests a single ParsedEmail into the Ticket Database
 */
export async function ingestEmailReport(
  pool: pg.Pool | null,
  email: ParsedEmail,
  config: ServerPop3Config = currentConfig
): Promise<{
  success: boolean;
  ticketId?: string;
  ticketNumber?: string;
  isReply?: boolean;
  message: string;
  log: any;
}> {
  const cleanFrom = email.from.toLowerCase().trim();
  const cleanSubject = email.subject.trim();
  // Extract strictly the problem description, stripping signatures, greetings, mobile tags, and corporate disclaimers
  const cleanBody = (email.problemContent || extractProblemContent(email.textBody || email.htmlBody || '')).trim() || '(No problem description provided)';

  // Avoid duplicate ingestion
  if (email.messageId && memoryProcessedMessageIds.has(email.messageId)) {
    return {
      success: true,
      message: `Message ID ${email.messageId} was already processed. Skipped.`,
      log: null,
    };
  }

  const logId = `email-log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  let matchedUserId = 'user-admin-01';
  let matchedBUId = config.targetBusinessUnitId || 'bu-ccec';
  let matchedDeptId = config.defaultDepartmentId || 'dept-ccec-ops';
  let createdTicketId = '';
  let createdTicketNumber = '';
  let isReply = false;

  if (pool) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Resolve or Create User
      const userRes = await client.query(
        'SELECT id, username, full_name, email, business_unit_id, department_id FROM users WHERE LOWER(email) = $1 LIMIT 1',
        [cleanFrom]
      );

      let targetUser: any;
      if (userRes.rows.length > 0) {
        targetUser = userRes.rows[0];
        matchedUserId = targetUser.id;
        matchedBUId = targetUser.business_unit_id || matchedBUId;
        matchedDeptId = targetUser.department_id || matchedDeptId;
      } else {
        // Auto-create user from inbound email
        const generatedUsername = cleanFrom.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '');
        const displayName = email.fromName || cleanFrom.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        const newUserId = `user-email-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

        // Match BU based on email domain or keywords
        if (cleanFrom.includes('hotel')) matchedBUId = 'bu-hotel';
        else if (cleanFrom.includes('fnb') || cleanFrom.includes('botanica')) matchedBUId = 'bu-fnb';
        else if (cleanFrom.includes('klbs')) matchedBUId = 'bu-klbs';
        else if (cleanFrom.includes('klw')) matchedBUId = 'bu-klw';
        else if (cleanFrom.includes('uoa')) matchedBUId = 'bu-uoahq';

        // Get default department for BU
        const deptRes = await client.query('SELECT id, name FROM departments WHERE business_unit_id = $1 LIMIT 1', [matchedBUId]);
        matchedDeptId = deptRes.rows[0]?.id || 'dept-ccec-ops';
        const deptName = deptRes.rows[0]?.name || 'General Operations';

        await client.query(
          `INSERT INTO users (id, username, password_hash, full_name, email, role, business_unit_id, department_id, department, must_change_password)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (email) DO NOTHING`,
          [newUserId, generatedUsername, 'password123', displayName, cleanFrom, 'USER', matchedBUId, matchedDeptId, deptName, true]
        );

        matchedUserId = newUserId;
      }

      // Map any email attachments
      const mappedAttachments = email.attachments.map((att, idx) => ({
        id: `att-email-${Date.now()}-${idx}`,
        name: att.name,
        size: att.size,
        type: att.type,
        url: att.dataUrl,
        uploadedAt: new Date().toISOString(),
      }));

      // 2. Check if Subject indicates a Reply to an existing Ticket (e.g. "[TCK-1002]")
      const ticketMatch = cleanSubject.match(/\[(TCK-\d+)\]/i);
      if (ticketMatch && ticketMatch[1]) {
        const tckNum = ticketMatch[1].toUpperCase();
        const existingTckRes = await client.query(
          'SELECT id, ticket_number, title, business_unit_id, department_id, activities, attachments FROM tickets WHERE UPPER(ticket_number) = $1 LIMIT 1',
          [tckNum]
        );

        if (existingTckRes.rows.length > 0) {
          const tck = existingTckRes.rows[0];
          isReply = true;
          createdTicketId = tck.id;
          createdTicketNumber = tck.ticket_number;

          let currentAttachments: any[] = [];
          if (tck.attachments) {
            try {
              currentAttachments = typeof tck.attachments === 'string' ? JSON.parse(tck.attachments) : tck.attachments;
            } catch {
              currentAttachments = [];
            }
          }
          const updatedAttachments = mappedAttachments.length > 0 ? [...currentAttachments, ...mappedAttachments] : currentAttachments;

          const currentActivities = Array.isArray(tck.activities) ? tck.activities : [];
          const newActivity = {
            id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            type: 'COMMENT',
            actorName: email.fromName || cleanFrom,
            actorRole: 'USER',
            details: cleanBody,
            timestamp: new Date().toISOString(),
            attachments: mappedAttachments,
          };

          currentActivities.push(newActivity);

          await client.query(
            'UPDATE tickets SET activities = $1, attachments = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
            [JSON.stringify(currentActivities), JSON.stringify(updatedAttachments), tck.id]
          );

          // Add audit log
          await client.query(
            `INSERT INTO audit_logs (id, action, details, user_id, username, ticket_id, business_unit_id, timestamp)
             VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
            [
              `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              'EMAIL_REPLY_INGESTED',
              `Email update from ${cleanFrom} appended to Ticket #${tck.ticket_number}`,
              matchedUserId,
              cleanFrom,
              tck.id,
              tck.business_unit_id,
            ]
          );
        }
      }

      // 3. If not a reply, create a new Ticket
      if (!isReply) {
        // Generate next Ticket Number
        const countRes = await client.query('SELECT COUNT(*) as cnt FROM tickets');
        const count = parseInt(countRes.rows[0]?.cnt || '0', 10) + 1001;
        createdTicketNumber = `TCK-${count}`;
        createdTicketId = `ticket-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

        const priority = config.autoExtractPriority ? detectPriority(cleanSubject, cleanBody) : 'MEDIUM';
        const category = config.autoAssignCategory ? detectCategory(cleanSubject, cleanBody) : 'Email Inbound Report';
        const sanitizedTitle = cleanSubject.replace(/^(fwd|fw|re):\s*/i, '').trim() || 'Inbound Email Support Request';

        // Pure problem statement as ticket description (no email signatures, no footers)
        const ticketDescription = cleanBody;

        const initialActivities = [
          {
            id: `act-${Date.now()}-0`,
            type: 'STATUS_CHANGE',
            actorName: 'POP3 Inbound Ingestion Service',
            actorRole: 'SYSTEM',
            userName: 'POP3 Inbound Ingestion Service',
            userRole: 'SYSTEM',
            details: `Ticket automatically created from inbound email by ${cleanFrom} (${email.fromName || 'Staff'})${mappedAttachments.length > 0 ? ` [${mappedAttachments.length} attachment(s) included]` : ''}`,
            message: `Ticket automatically created from inbound email by ${cleanFrom} (${email.fromName || 'Staff'})`,
            timestamp: new Date().toISOString(),
            attachments: mappedAttachments,
          },
        ];

        await client.query(
          `INSERT INTO tickets (id, ticket_number, title, description, category, priority, status, business_unit_id, department_id, created_by_id, assigned_to_id, activities, attachments, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            createdTicketId,
            createdTicketNumber,
            sanitizedTitle,
            ticketDescription,
            category,
            priority,
            'OPEN',
            matchedBUId,
            matchedDeptId,
            matchedUserId,
            null,
            JSON.stringify(initialActivities),
            JSON.stringify(mappedAttachments),
          ]
        );

        // Add audit log
        await client.query(
          `INSERT INTO audit_logs (id, action, details, user_id, username, ticket_id, business_unit_id, timestamp)
           VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
          [
            `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            'EMAIL_TICKET_CREATED',
            `Created Ticket #${createdTicketNumber}: ${sanitizedTitle} from email (${cleanFrom})`,
            matchedUserId,
            cleanFrom,
            createdTicketId,
            matchedBUId,
          ]
        );
      }

      // 4. Record Message ID to prevent duplicate processing
      if (email.messageId) {
        await client.query(
          `INSERT INTO processed_email_messages (message_id, ticket_id, created_at)
           VALUES ($1, $2, CURRENT_TIMESTAMP)
           ON CONFLICT (message_id) DO NOTHING`,
          [email.messageId, createdTicketId]
        );
        memoryProcessedMessageIds.add(email.messageId);
      }

      // 5. Query Business Unit & Department details for template replacement
      let buName = 'UOA Hospitality Group';
      let buCode = 'UOA';
      let deptNameForAck = 'IT Support & Systems';

      try {
        const buInfoRes = await client.query('SELECT name, code FROM business_units WHERE id = $1 LIMIT 1', [matchedBUId]);
        if (buInfoRes.rows.length > 0) {
          buName = buInfoRes.rows[0].name;
          buCode = buInfoRes.rows[0].code;
        }
        const deptInfoRes = await client.query('SELECT name FROM departments WHERE id = $1 LIMIT 1', [matchedDeptId]);
        if (deptInfoRes.rows.length > 0) {
          deptNameForAck = deptInfoRes.rows[0].name;
        }
      } catch (err: any) {
        console.warn('Failed to query BU/Dept names for auto-reply:', err.message);
      }

      // 6. Generate Automated Acknowledgment Email
      const autoReplyData = generateServerAutoReply(
        config.autoReplySubjectTemplate,
        config.autoReplyBodyTemplate,
        {
          ticketNumber: createdTicketNumber,
          ticketTitle: isReply ? cleanSubject : (cleanSubject.replace(/^(fwd|fw|re):\s*/i, '').trim() || 'Inbound Email Support Request'),
          requesterName: email.fromName || cleanFrom.split('@')[0],
          requesterEmail: cleanFrom,
          businessUnitName: buName,
          businessUnitCode: buCode,
          departmentName: deptNameForAck,
          priority: isReply ? 'MEDIUM' : (config.autoExtractPriority ? detectPriority(cleanSubject, cleanBody) : 'MEDIUM'),
          status: 'OPEN',
        },
        isReply
      );

      let autoReplyActuallySent = false;
      let autoReplySendError: string | undefined;

      // 7. Dispatch Automated Email via SMTP if enabled
      if (config.enableAutoReply) {
        const smtpHost = config.smtpHost || config.host;
        const smtpPort = config.smtpPort || (config.smtpUseSsl ? 465 : 587);
        const smtpUser = config.smtpUsername || config.username || config.emailAddress;
        const smtpPass = config.smtpPassword || config.appPassword || '';
        const senderFrom = config.emailAddress || 'support@uohospitality.com.my';
        const senderName = config.senderDisplayName || 'IT Support Desk';

        if (smtpHost && cleanFrom) {
          try {
            console.log(`[SMTP Outbound] Dispatching automated acknowledgment to ${cleanFrom} for ticket ${createdTicketNumber}...`);
            const sendResult = await sendSmtpEmail({
              host: smtpHost,
              port: smtpPort,
              useSsl: config.smtpUseSsl !== undefined ? config.smtpUseSsl : (smtpPort === 465),
              username: smtpUser,
              password: smtpPass,
              from: senderFrom,
              fromName: senderName,
              to: cleanFrom,
              subject: autoReplyData.subject,
              body: autoReplyData.body,
              timeoutMs: 15000,
            });

            if (sendResult.success) {
              autoReplyActuallySent = true;
              console.log(`[SMTP Outbound] Successfully delivered acknowledgment email to ${cleanFrom} (${sendResult.latencyMs}ms).`);
            } else {
              autoReplySendError = sendResult.message;
              console.warn(`[SMTP Outbound] Delivery failed to ${cleanFrom}:`, sendResult.message);
            }
          } catch (smtpErr: any) {
            autoReplySendError = smtpErr.message;
            console.error(`[SMTP Outbound] Exception sending auto-reply to ${cleanFrom}:`, smtpErr.message);
          }
        } else {
          console.warn(`[SMTP Outbound] Skipped auto-reply: SMTP Host or recipient is missing.`);
        }
      }

      // 8. Insert Email Log with actual dispatch status
      const emailLog = {
        id: logId,
        messageId: email.messageId,
        fromAddress: cleanFrom,
        fromName: email.fromName || cleanFrom,
        toAddress: email.to || config.emailAddress,
        subject: cleanSubject,
        bodyPreview: cleanBody.substring(0, 150),
        rawBody: cleanBody,
        receivedAt: new Date().toISOString(),
        status: isReply ? 'REPLIED_TO_EXISTING' : 'PROCESSED',
        createdTicketId,
        createdTicketNumber,
        matchedUserId,
        matchedBusinessUnitId: matchedBUId,
        matchedDepartmentId: matchedDeptId,
        attachmentsCount: email.attachments.length,
        autoReplySent: autoReplyActuallySent,
        autoReplySubject: autoReplyData.subject,
        autoReplyBody: autoReplyData.body,
        errorMessage: autoReplySendError,
      };

      await client.query(
        `INSERT INTO email_logs (id, message_id, from_address, from_name, to_address, subject, body_preview, raw_body, received_at, status, created_ticket_id, created_ticket_number, matched_user_id, matched_business_unit_id, matched_department_id, attachments_count, auto_reply_sent, auto_reply_subject, auto_reply_body, error_message)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
        [
          emailLog.id,
          emailLog.messageId,
          emailLog.fromAddress,
          emailLog.fromName,
          emailLog.toAddress,
          emailLog.subject,
          emailLog.bodyPreview,
          emailLog.rawBody,
          emailLog.status,
          emailLog.createdTicketId,
          emailLog.createdTicketNumber,
          emailLog.matchedUserId,
          emailLog.matchedBusinessUnitId,
          emailLog.matchedDepartmentId,
          emailLog.attachmentsCount,
          emailLog.autoReplySent,
          emailLog.autoReplySubject,
          emailLog.autoReplyBody,
          emailLog.errorMessage || null,
        ]
      );

      await client.query('COMMIT');

      return {
        success: true,
        ticketId: createdTicketId,
        ticketNumber: createdTicketNumber,
        isReply,
        message: isReply
          ? `Email update appended to Ticket #${createdTicketNumber}`
          : `New Ticket #${createdTicketNumber} created from email!`,
        log: emailLog,
      };
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('Error during email ingestion transaction:', err.message);
      return {
        success: false,
        message: `Ingestion transaction error: ${err.message}`,
        log: null,
      };
    } finally {
      client.release();
    }
  }

  // Fallback if no PostgreSQL
  if (email.messageId) {
    memoryProcessedMessageIds.add(email.messageId);
  }

  return {
    success: true,
    ticketNumber: `TCK-${Date.now().toString().slice(-4)}`,
    message: 'Processed in local memory mode',
    log: null,
  };
}

/**
 * Triggers a manual or automatic POP3 Mailbox Sync
 */
export async function executePop3Sync(
  pool: pg.Pool | null,
  config: ServerPop3Config = currentConfig
): Promise<{
  success: boolean;
  fetchedCount: number;
  createdTickets: { ticketId: string; ticketNumber: string; isReply: boolean; subject: string; from: string }[];
  skippedCount: number;
  totalInMailbox: number;
  message: string;
}> {
  if (!config.host || !config.emailAddress) {
    return {
      success: false,
      fetchedCount: 0,
      createdTickets: [],
      skippedCount: 0,
      totalInMailbox: 0,
      message: 'POP3 Host or Email is not configured. Please verify settings.',
    };
  }

  const pop3Options: Pop3Options & { leaveCopyOnServer?: boolean } = {
    host: config.host,
    port: config.port,
    useSsl: config.useSsl,
    username: config.username || config.emailAddress,
    password: config.appPassword,
    leaveCopyOnServer: config.leaveCopyOnServer,
  };

  const fetchRes = await fetchPop3Emails(pop3Options, memoryProcessedMessageIds);

  if (!fetchRes.success) {
    return {
      success: false,
      fetchedCount: 0,
      createdTickets: [],
      skippedCount: fetchRes.skippedCount,
      totalInMailbox: fetchRes.totalInMailbox,
      message: fetchRes.message,
    };
  }

  const createdTickets: { ticketId: string; ticketNumber: string; isReply: boolean; subject: string; from: string }[] = [];

  for (const email of fetchRes.fetchedEmails) {
    const ingestRes = await ingestEmailReport(pool, email, config);
    if (ingestRes.success && ingestRes.ticketNumber) {
      createdTickets.push({
        ticketId: ingestRes.ticketId || '',
        ticketNumber: ingestRes.ticketNumber,
        isReply: !!ingestRes.isReply,
        subject: email.subject,
        from: email.from,
      });
    }
  }

  currentConfig.lastSyncTimestamp = new Date().toISOString();

  return {
    success: true,
    fetchedCount: fetchRes.fetchedEmails.length,
    createdTickets,
    skippedCount: fetchRes.skippedCount,
    totalInMailbox: fetchRes.totalInMailbox,
    message: `Successfully synced mailbox! Processed ${fetchRes.fetchedEmails.length} new email report(s).`,
  };
}

/**
 * Starts the automated server-side POP3 Poller
 */
export function startBackgroundEmailPoller(pool: pg.Pool | null) {
  if (activePollerTimer) {
    clearInterval(activePollerTimer);
    activePollerTimer = null;
  }

  if (!currentConfig.enabled) {
    console.log('Background Email POP3 Poller is currently disabled in configuration.');
    return;
  }

  const intervalMinutes = Math.max(1, currentConfig.pollIntervalMinutes || 3);
  const intervalMs = intervalMinutes * 60 * 1000;

  console.log(`Starting Background POP3 Poller (Interval: ${intervalMinutes} minute(s) for ${currentConfig.emailAddress})...`);

  activePollerTimer = setInterval(async () => {
    try {
      if (currentConfig.enabled && currentConfig.host && currentConfig.emailAddress && currentConfig.appPassword) {
        console.log(`[POP3 Poller] Checking for new email reports from ${currentConfig.host}...`);
        const res = await executePop3Sync(pool, currentConfig);
        if (res.fetchedCount > 0) {
          console.log(`[POP3 Poller] Auto-fetched ${res.fetchedCount} report(s) -> Created:`, res.createdTickets.map((t) => t.ticketNumber).join(', '));
        }
      }
    } catch (err: any) {
      console.error('[POP3 Poller] Error during scheduled sync:', err.message);
    }
  }, intervalMs);
}
