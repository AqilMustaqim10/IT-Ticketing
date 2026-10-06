import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const STORAGE_FILE = path.join(DATA_DIR, 'helpdesk_storage.json');

interface TableData {
  [id: string]: any;
}

interface DatabaseState {
  business_units: TableData;
  departments: TableData;
  users: TableData;
  tickets: TableData;
  ticket_comments: TableData;
  audit_logs: TableData;
  email_config: TableData;
  processed_email_messages: TableData;
  email_logs: TableData;
}

function getDefaultState(): DatabaseState {
  return {
    business_units: {
      'bu-ccec': { id: 'bu-ccec', code: 'CCEC', name: 'Convention Centre & Events Corp', description: 'Convention halls, audio-visual staging, exhibition logistics', icon: 'Building2', theme_color: '#2563eb' },
      'bu-fnb': { id: 'bu-fnb', code: 'FNB', name: 'Food & Beverage Division', description: 'Restaurant point-of-sale terminals, kitchen display systems', icon: 'Utensils', theme_color: '#d97706' },
      'bu-hotel': { id: 'bu-hotel', code: 'HOTEL', name: 'Hotel & Hospitality Group', description: 'Room management, guest keycard systems, property management', icon: 'Hotel', theme_color: '#0891b2' },
      'bu-klbs': { id: 'bu-klbs', code: 'KLBS', name: 'Building Services & Facilities', description: 'HVAC, elevators, electrical infrastructure, building maintenance', icon: 'Wrench', theme_color: '#0d9488' },
      'bu-klw': { id: 'bu-klw', code: 'KLW', name: 'Corporate Office Tower', description: 'Tenant networking, access card security, workspace IT support', icon: 'Briefcase', theme_color: '#4f46e5' },
      'bu-hq': { id: 'bu-hq', code: 'UOA HQ', name: 'Group IT Headquarters', description: 'Central ERP, cybersecurity, enterprise infrastructure', icon: 'ShieldCheck', theme_color: '#475569' }
    },
    departments: {
      'dept-ccec-ops': { id: 'dept-ccec-ops', name: 'AV & Stage Operations', code: 'CCEC-AV', business_unit_id: 'bu-ccec' },
      'dept-fnb-pos': { id: 'dept-fnb-pos', name: 'POS & Kitchen Systems', code: 'FNB-POS', business_unit_id: 'bu-fnb' },
      'dept-hotel-pms': { id: 'dept-hotel-pms', name: 'Front Desk & Keycard Systems', code: 'HOTEL-PMS', business_unit_id: 'bu-hotel' },
      'dept-hq-it': { id: 'dept-hq-it', name: 'Enterprise Helpdesk & Networks', code: 'HQ-NET', business_unit_id: 'bu-hq' }
    },
    users: {
      'user-admin-01': {
        id: 'user-admin-01',
        username: 'admin',
        password_hash: '906a2d1d0337b51e06dbcdba69d3fec8933ae4c25f483c66f2c42245b74bf7fc',
        full_name: 'System Administrator',
        email: 'admin@uoa.com.my',
        role: 'ADMIN',
        business_unit_id: 'bu-hq',
        department_id: 'dept-hq-it',
        department: 'Enterprise Helpdesk & Networks',
        must_change_password: false
      },
      'user-staff-01': {
        id: 'user-staff-01',
        username: 'aaqil',
        password_hash: '906a2d1d0337b51e06dbcdba69d3fec8933ae4c25f483c66f2c42245b74bf7fc',
        full_name: 'Aaqil Mustaqim',
        email: 'aaqil.mustaqim@uoa.com.my',
        role: 'USER',
        business_unit_id: 'bu-ccec',
        department_id: 'dept-ccec-ops',
        department: 'AV & Stage Operations',
        must_change_password: false
      }
    },
    tickets: {},
    ticket_comments: {},
    audit_logs: {},
    email_config: {},
    processed_email_messages: {},
    email_logs: {}
  };
}

class LocalJsonDatabase {
  private state: DatabaseState;

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORAGE_FILE)) {
      try {
        const raw = fs.readFileSync(STORAGE_FILE, 'utf8');
        this.state = { ...getDefaultState(), ...JSON.parse(raw) };
      } catch {
        this.state = getDefaultState();
      }
    } else {
      this.state = getDefaultState();
      this.save();
    }
  }

  private save() {
    try {
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(this.state, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to save local database state:', e);
    }
  }

  public async query(sql: string, params: any[] = []): Promise<{ rows: any[], rowCount: number }> {
    const cleanSql = sql.trim();
    const upper = cleanSql.toUpperCase();

    // Replace $1, $2, ... or ? with params
    let paramIdx = 0;
    const resolvedSql = cleanSql.replace(/\$(\d+)/g, (_, num) => {
      const idx = parseInt(num, 10) - 1;
      return JSON.stringify(params[idx] !== undefined ? params[idx] : null);
    }).replace(/\?/g, () => {
      const val = params[paramIdx++];
      return JSON.stringify(val !== undefined ? val : null);
    });

    // Handle SELECT NOW()
    if (upper.startsWith('SELECT NOW()')) {
      return { rows: [{ current_time: new Date().toISOString(), db_name: 'uoa_helpdesk_local' }], rowCount: 1 };
    }

    // Handle SELECT COUNT(*)
    if (upper.includes('COUNT(*)') || upper.includes('COUNT( * )')) {
      if (upper.includes('FROM tickets')) {
        const count = Object.keys(this.state.tickets).length;
        return { rows: [{ cnt: count }], rowCount: 1 };
      }
      if (upper.includes('FROM business_units')) {
        const count = Object.keys(this.state.business_units).length;
        return { rows: [{ cnt: count }], rowCount: 1 };
      }
    }

    // Handle SELECT from business_units
    if (upper.includes('FROM BUSINESS_UNITS')) {
      const rows = Object.values(this.state.business_units);
      if (upper.includes('LIMIT 1') && rows.length > 0) {
        return { rows: [rows[0]], rowCount: 1 };
      }
      return { rows, rowCount: rows.length };
    }

    // Handle SELECT from departments
    if (upper.includes('FROM DEPARTMENTS')) {
      let rows = Object.values(this.state.departments);
      if (upper.includes('WHERE ID =')) {
        // extract id
        const match = upper.match(/ID\s*=\s*'([^']+)'/);
        if (match && match[1]) {
          rows = rows.filter((d: any) => d.id === match[1]);
        }
      }
      if (upper.includes('LIMIT 1') && rows.length > 0) {
        return { rows: [rows[0]], rowCount: 1 };
      }
      return { rows, rowCount: rows.length };
    }

    // Handle SELECT from users
    if (upper.includes('FROM USERS')) {
      let rows = Object.values(this.state.users);
      if (upper.includes('LOWER(EMAIL) =')) {
        const emailMatch = resolvedSql.toLowerCase().match(/lower\(email\)\s*=\s*'([^']+)'/);
        if (emailMatch && emailMatch[1]) {
          rows = rows.filter((u: any) => String(u.email).toLowerCase() === emailMatch[1]);
        }
      } else if (upper.includes('USERNAME =')) {
        const userMatch = resolvedSql.match(/username\s*=\s*'([^']+)'/i);
        if (userMatch && userMatch[1]) {
          rows = rows.filter((u: any) => u.username === userMatch[1]);
        }
      }
      if (upper.includes('LIMIT 1') && rows.length > 0) {
        return { rows: [rows[0]], rowCount: 1 };
      }
      return { rows, rowCount: rows.length };
    }

    // Handle SELECT from tickets
    if (upper.includes('FROM TICKETS')) {
      let rows = Object.values(this.state.tickets);
      if (upper.includes('UPPER(TICKET_NUMBER) =')) {
        const match = resolvedSql.toUpperCase().match(/UPPER\(TICKET_NUMBER\)\s*=\s*'([^']+)'/);
        if (match && match[1]) {
          rows = rows.filter((t: any) => String(t.ticket_number).toUpperCase() === match[1]);
        }
      } else if (upper.includes('ORDER BY CREATED_AT DESC')) {
        rows.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
      if (upper.includes('LIMIT 1') && rows.length > 0) {
        return { rows: [rows[0]], rowCount: 1 };
      }
      return { rows, rowCount: rows.length };
    }

    // Handle SELECT from email_logs
    if (upper.includes('FROM EMAIL_LOGS')) {
      let rows = Object.values(this.state.email_logs);
      rows.sort((a: any, b: any) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime());
      return { rows, rowCount: rows.length };
    }

    // Handle INSERT INTO users
    if (upper.startsWith('INSERT INTO USERS')) {
      const [id, username, password_hash, full_name, email, role, business_unit_id, department_id] = params;
      this.state.users[id || email] = {
        id: id || `user-${Date.now()}`,
        username: username || email.split('@')[0],
        password_hash: password_hash || 'password123',
        full_name: full_name || email,
        email,
        role: role || 'USER',
        business_unit_id: business_unit_id || 'bu-ccec',
        department_id: department_id || null,
        created_at: new Date().toISOString()
      };
      this.save();
      return { rows: [], rowCount: 1 };
    }

    // Handle INSERT INTO tickets
    if (upper.startsWith('INSERT INTO TICKETS')) {
      const [
        id, ticket_number, title, description, category, priority, status,
        business_unit_id, department_id, created_by_id, assigned_to_id,
        activities, attachments
      ] = params;
      this.state.tickets[id] = {
        id,
        ticket_number,
        title,
        description,
        category,
        priority,
        status: status || 'OPEN',
        business_unit_id,
        department_id,
        created_by_id,
        assigned_to_id,
        activities: typeof activities === 'string' ? JSON.parse(activities) : activities,
        attachments: typeof attachments === 'string' ? JSON.parse(attachments) : attachments,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this.save();
      return { rows: [], rowCount: 1 };
    }

    // Handle INSERT INTO email_logs
    if (upper.startsWith('INSERT INTO EMAIL_LOGS')) {
      const [
        id, message_id, from_address, from_name, to_address, subject,
        body_preview, raw_body, status, created_ticket_id, created_ticket_number,
        matched_user_id, matched_business_unit_id, matched_department_id,
        attachments_count, auto_reply_sent, auto_reply_subject, auto_reply_body, error_message
      ] = params;
      this.state.email_logs[id] = {
        id,
        message_id,
        from_address,
        from_name,
        to_address,
        subject,
        body_preview,
        raw_body,
        received_at: new Date().toISOString(),
        status,
        created_ticket_id,
        created_ticket_number,
        matched_user_id,
        matched_business_unit_id,
        matched_department_id,
        attachments_count,
        auto_reply_sent,
        auto_reply_subject,
        auto_reply_body,
        error_message
      };
      this.save();
      return { rows: [], rowCount: 1 };
    }

    // Handle INSERT INTO processed_email_messages
    if (upper.startsWith('INSERT INTO PROCESSED_EMAIL_MESSAGES')) {
      const [message_id, ticket_id] = params;
      this.state.processed_email_messages[message_id] = { message_id, ticket_id, created_at: new Date().toISOString() };
      this.save();
      return { rows: [], rowCount: 1 };
    }

    // Handle INSERT INTO audit_logs
    if (upper.startsWith('INSERT INTO AUDIT_LOGS')) {
      const [id, action, details, user_id, username, ticket_id, business_unit_id] = params;
      this.state.audit_logs[id] = {
        id,
        action,
        details,
        user_id,
        username,
        ticket_id,
        business_unit_id,
        timestamp: new Date().toISOString()
      };
      this.save();
      return { rows: [], rowCount: 1 };
    }

    // Handle DELETE queries
    if (upper.startsWith('DELETE FROM')) {
      if (upper.includes('FROM TICKETS')) {
        if (upper.includes('WHERE ID =')) {
          const id = params[0];
          delete this.state.tickets[id];
        } else {
          this.state.tickets = {};
        }
        this.save();
        return { rows: [], rowCount: 1 };
      }
      if (upper.includes('FROM USERS')) {
        const id = params[0];
        delete this.state.users[id];
        this.save();
        return { rows: [], rowCount: 1 };
      }
      if (upper.includes('FROM DEPARTMENTS')) {
        const id = params[0];
        delete this.state.departments[id];
        this.save();
        return { rows: [], rowCount: 1 };
      }
      if (upper.includes('FROM TICKET_COMMENTS')) {
        if (upper.includes('WHERE TICKET_ID =')) {
          const tId = params[0];
          for (const k of Object.keys(this.state.ticket_comments)) {
            if (this.state.ticket_comments[k].ticket_id === tId) {
              delete this.state.ticket_comments[k];
            }
          }
        } else if (upper.includes('WHERE USER_ID =')) {
          const uId = params[0];
          for (const k of Object.keys(this.state.ticket_comments)) {
            if (this.state.ticket_comments[k].user_id === uId) {
              delete this.state.ticket_comments[k];
            }
          }
        } else {
          this.state.ticket_comments = {};
        }
        this.save();
        return { rows: [], rowCount: 1 };
      }
      if (upper.includes('FROM EMAIL_LOGS')) {
        this.state.email_logs = {};
        this.save();
        return { rows: [], rowCount: 1 };
      }
    }

    // Handle UPDATE tickets
    if (upper.startsWith('UPDATE TICKETS')) {
      // Find id from params or query
      const ticketId = params[params.length - 1];
      if (this.state.tickets[ticketId]) {
        if (upper.includes('ACTIVITIES')) {
          this.state.tickets[ticketId].activities = typeof params[0] === 'string' ? JSON.parse(params[0]) : params[0];
          this.state.tickets[ticketId].attachments = typeof params[1] === 'string' ? JSON.parse(params[1]) : params[1];
        }
        this.state.tickets[ticketId].updated_at = new Date().toISOString();
        this.save();
      }
      return { rows: [], rowCount: 1 };
    }

    // Default fallback for any other query
    return { rows: [], rowCount: 0 };
  }
}

const dbInstance = new LocalJsonDatabase();

export class LocalPoolClient {
  constructor() {}
  async query(sql: string, params: any[] = []) {
    return dbInstance.query(sql, params);
  }
  async beginTransaction() {}
  async commit() {}
  async rollback() {}
  release() {}
}

export class LocalPool {
  async connect() {
    return new LocalPoolClient();
  }
  async getConnection() {
    return new LocalPoolClient();
  }
  async query(sql: string, params: any[] = []) {
    return dbInstance.query(sql, params);
  }
}
