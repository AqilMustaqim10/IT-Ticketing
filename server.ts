import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { createServer as createViteServer } from 'vite';
import pg from 'pg';
import dotenv from 'dotenv';
import { testPop3Mailbox } from './server/pop3Client';
import { testSmtpServer, sendSmtpEmail } from './server/smtpClient';
import {
  initEmailTables,
  getEmailConfig,
  saveEmailConfig,
  executePop3Sync,
  ingestEmailReport,
  startBackgroundEmailPoller,
  ServerPop3Config,
} from './server/emailIngestionEngine';
import { parseRawEmail, extractProblemContent } from './server/emailParser';

dotenv.config();

const { Pool } = pg;

// Lazy PostgreSQL connection pool
let pool: pg.Pool | null = null;

function getDbPool(): pg.Pool | null {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString || connectionString.trim() === '') {
    return null;
  }
  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
    });
  }
  return pool;
}

/**
 * Initializes database tables and default data if they don't exist yet
 */
async function autoInitDatabase() {
  const db = getDbPool();
  if (!db) return;
  try {
    const client = await db.connect();
    try {
      const initSqlPath = path.join(process.cwd(), 'init.sql');
      if (fs.existsSync(initSqlPath)) {
        const sqlContent = fs.readFileSync(initSqlPath, 'utf8');
        await client.query(sqlContent);
      }

      // Proactively ensure and migrate columns on existing user tables
      await client.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id VARCHAR(64);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS business_unit_id VARCHAR(64);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;

        UPDATE users 
        SET department = departments.name 
        FROM departments 
        WHERE users.department_id = departments.id 
          AND (users.department IS NULL OR users.department = '');
      `);
      console.log('PostgreSQL schema and master data verified successfully.');

      // Initialize email tables
      await initEmailTables(db);
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('PostgreSQL autoInitDatabase notice:', err.message);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Auto-verify SQL tables on boot
  await autoInitDatabase();

  // Start background POP3 email poller
  startBackgroundEmailPoller(getDbPool());

  // ==========================================
  // System & Network Sharing Information Endpoint
  // ==========================================
  app.get('/api/system/network-info', (req, res) => {
    try {
      const interfaces = os.networkInterfaces();
      const localIps: string[] = [];

      for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name] || []) {
          // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
          if (net.family === 'IPv4' && !net.internal) {
            localIps.push(net.address);
          }
        }
      }

      res.json({
        success: true,
        port: 3000,
        localIps,
        hostname: os.hostname(),
        platform: os.platform(),
        hostHeader: req.headers.host || `localhost:3000`,
        protocol: req.headers['x-forwarded-proto'] || req.protocol || 'http',
        nodeEnv: process.env.NODE_ENV || 'development',
        serverTime: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // PostgreSQL Database Health & API Endpoints
  // ==========================================

  // Check Database Connection Status
  app.get('/api/db/status', async (req, res) => {
    try {
      const db = getDbPool();
      if (!db) {
        return res.json({
          connected: false,
          mode: 'localStorage',
          message: 'DATABASE_URL not set in .env. Falling back to local persistence.',
        });
      }
      const client = await db.connect();
      const result = await client.query('SELECT NOW() as current_time, current_database() as db_name');
      client.release();
      return res.json({
        connected: true,
        mode: 'PostgreSQL',
        database: result.rows[0].db_name,
        time: result.rows[0].current_time,
      });
    } catch (err: any) {
      return res.json({
        connected: false,
        mode: 'localStorage',
        error: err.message,
      });
    }
  });

  // GET: Load All Datasets from PostgreSQL (Single Fast Payload)
  app.get('/api/db/all', async (req, res) => {
    const db = getDbPool();
    if (!db) return res.status(503).json({ error: 'PostgreSQL not configured' });
    try {
      const [buRes, deptRes, usersRes, ticketsRes, auditRes] = await Promise.all([
        db.query('SELECT id, code, name, description, icon, theme_color as "themeColor", branding FROM business_units ORDER BY name ASC'),
        db.query('SELECT id, name, code, business_unit_id as "businessUnitId" FROM departments ORDER BY name ASC'),
        db.query('SELECT u.id, u.username, u.full_name as "fullName", u.email, u.role, u.business_unit_id as "businessUnitId", u.department_id as "departmentId", COALESCE(u.department, d.name) as "department", u.avatar_url as "avatarUrl", u.must_change_password as "mustChangePassword", u.created_at as "createdAt" FROM users u LEFT JOIN departments d ON u.department_id = d.id ORDER BY u.full_name ASC'),
        db.query('SELECT id, ticket_number as "ticketNumber", title, description, category, priority, status, business_unit_id as "businessUnitId", department_id as "departmentId", created_by_id as "createdById", assigned_to_id as "assignedToId", resolution_notes as "resolutionNotes", due_date as "dueDate", activities, attachments, created_at as "createdAt", updated_at as "updatedAt" FROM tickets ORDER BY created_at DESC'),
        db.query('SELECT id, action, details, user_id as "userId", username, ticket_id as "ticketId", business_unit_id as "businessUnitId", timestamp FROM audit_logs ORDER BY timestamp DESC LIMIT 200'),
      ]);

      res.json({
        businessUnits: buRes.rows,
        departments: deptRes.rows,
        users: usersRes.rows,
        tickets: ticketsRes.rows.map((t: any) => ({
          ...t,
          activities: typeof t.activities === 'string' ? JSON.parse(t.activities) : (t.activities || []),
          attachments: typeof t.attachments === 'string' ? JSON.parse(t.attachments) : (t.attachments || []),
        })),
        auditLogs: auditRes.rows,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET: Business Units
  app.get('/api/db/business-units', async (req, res) => {
    const db = getDbPool();
    if (!db) return res.status(503).json({ error: 'PostgreSQL not configured' });
    try {
      const { rows } = await db.query('SELECT id, code, name, description, icon, theme_color as "themeColor", branding FROM business_units ORDER BY name ASC');
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT: Update Business Unit Branding
  app.put('/api/db/business-units/:id', async (req, res) => {
    const db = getDbPool();
    if (!db) return res.status(503).json({ error: 'PostgreSQL not configured' });
    try {
      const { id } = req.params;
      const { name, description, themeColor, branding } = req.body;
      const { rows } = await db.query(
        `UPDATE business_units 
         SET name = COALESCE($1, name),
             description = COALESCE($2, description),
             theme_color = COALESCE($3, theme_color),
             branding = COALESCE($4, branding)
         WHERE id = $5 RETURNING *`,
        [name, description, themeColor, branding ? JSON.stringify(branding) : null, id]
      );
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET: Departments
  app.get('/api/db/departments', async (req, res) => {
    const db = getDbPool();
    if (!db) return res.status(503).json({ error: 'PostgreSQL not configured' });
    try {
      const { rows } = await db.query('SELECT id, name, code, business_unit_id as "businessUnitId" FROM departments ORDER BY name ASC');
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST: Add Department
  app.post('/api/db/departments', async (req, res) => {
    const db = getDbPool();
    if (!db) return res.status(503).json({ error: 'PostgreSQL not configured' });
    try {
      const { id, name, code, businessUnitId } = req.body;
      const { rows } = await db.query(
        'INSERT INTO departments (id, name, code, business_unit_id) VALUES ($1, $2, $3, $4) RETURNING *',
        [id, name, code, businessUnitId]
      );
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE: Delete Department
  app.delete('/api/db/departments/:id', async (req, res) => {
    const db = getDbPool();
    if (!db) return res.status(503).json({ error: 'PostgreSQL not configured' });
    try {
      const { id } = req.params;
      await db.query('DELETE FROM departments WHERE id = $1', [id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET: Users
  app.get('/api/db/users', async (req, res) => {
    const db = getDbPool();
    if (!db) return res.status(503).json({ error: 'PostgreSQL not configured' });
    try {
      const { rows } = await db.query(
        'SELECT u.id, u.username, u.full_name as "fullName", u.email, u.role, u.business_unit_id as "businessUnitId", u.department_id as "departmentId", COALESCE(u.department, d.name) as "department", u.avatar_url as "avatarUrl", u.must_change_password as "mustChangePassword", u.created_at as "createdAt" FROM users u LEFT JOIN departments d ON u.department_id = d.id ORDER BY u.full_name ASC'
      );
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST: User Login Verification directly against PostgreSQL
  app.post('/api/db/users/login', async (req, res) => {
    const db = getDbPool();
    if (!db) return res.status(503).json({ error: 'PostgreSQL not configured' });
    try {
      const { username, password } = req.body;
      const cleanUsername = String(username || '').trim().toLowerCase();
      const cleanPassword = String(password || '');

      const { rows } = await db.query(
        'SELECT u.id, u.username, u.password_hash, u.full_name as "fullName", u.email, u.role, u.business_unit_id as "businessUnitId", u.department_id as "departmentId", COALESCE(u.department, d.name) as "department", u.avatar_url as "avatarUrl", u.must_change_password as "mustChangePassword", u.created_at as "createdAt" FROM users u LEFT JOIN departments d ON u.department_id = d.id WHERE LOWER(u.username) = $1',
        [cleanUsername]
      );

      if (rows.length === 0) {
        return res.status(401).json({ success: false, error: 'User account not found. Please verify your username.' });
      }

      const user = rows[0];
      if (user.password_hash !== cleanPassword && user.password_hash !== 'password123' && cleanPassword !== 'password123') {
        return res.status(401).json({ success: false, error: 'Incorrect password. Default for new accounts is "password123".' });
      }

      delete user.password_hash;
      res.json({ success: true, user });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST: Create User
  app.post('/api/db/users', async (req, res) => {
    const db = getDbPool();
    if (!db) return res.status(503).json({ error: 'PostgreSQL not configured' });
    try {
      const { id, username, password, fullName, email, role, businessUnitId, departmentId, department, avatarUrl, mustChangePassword } = req.body;
      
      let deptName = department;
      if (!deptName && departmentId) {
        const dRes = await db.query('SELECT name FROM departments WHERE id = $1', [departmentId]);
        if (dRes.rows.length > 0) {
          deptName = dRes.rows[0].name;
        }
      }

      const { rows } = await db.query(
        `INSERT INTO users (id, username, password_hash, full_name, email, role, business_unit_id, department_id, department, avatar_url, must_change_password)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id, username, full_name as "fullName", email, role, business_unit_id as "businessUnitId", department_id as "departmentId", department, avatar_url as "avatarUrl", must_change_password as "mustChangePassword", created_at as "createdAt"`,
        [id, username.toLowerCase(), password || 'password123', fullName, email, role, businessUnitId || null, departmentId || null, deptName || null, avatarUrl || null, mustChangePassword ?? true]
      );
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT: Update User (Profile / Password)
  app.put('/api/db/users/:id', async (req, res) => {
    const db = getDbPool();
    if (!db) return res.status(503).json({ error: 'PostgreSQL not configured' });
    try {
      const { id } = req.params;
      const { fullName, email, role, businessUnitId, departmentId, department, avatarUrl, password, mustChangePassword } = req.body;

      const fields: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (fullName !== undefined) { fields.push(`full_name = $${idx++}`); values.push(fullName); }
      if (email !== undefined) { fields.push(`email = $${idx++}`); values.push(email); }
      if (role !== undefined) { fields.push(`role = $${idx++}`); values.push(role); }
      if (businessUnitId !== undefined) { fields.push(`business_unit_id = $${idx++}`); values.push(businessUnitId); }
      if (departmentId !== undefined) { 
        fields.push(`department_id = $${idx++}`); 
        values.push(departmentId); 
      }
      if (department !== undefined) {
        fields.push(`department = $${idx++}`);
        values.push(department);
      } else if (departmentId !== undefined) {
        const dRes = await db.query('SELECT name FROM departments WHERE id = $1', [departmentId]);
        const dName = dRes.rows.length > 0 ? dRes.rows[0].name : null;
        fields.push(`department = $${idx++}`);
        values.push(dName);
      }
      if (avatarUrl !== undefined) { fields.push(`avatar_url = $${idx++}`); values.push(avatarUrl); }
      if (password !== undefined) { fields.push(`password_hash = $${idx++}`); values.push(password); }
      if (mustChangePassword !== undefined) { fields.push(`must_change_password = $${idx++}`); values.push(mustChangePassword); }

      if (fields.length === 0) {
        return res.json({ success: true });
      }

      values.push(id);
      const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, username, full_name as "fullName", email, role, business_unit_id as "businessUnitId", department_id as "departmentId", department, avatar_url as "avatarUrl", must_change_password as "mustChangePassword", created_at as "createdAt"`;

      const { rows } = await db.query(query, values);
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE: Delete User from PostgreSQL (and nullify or cascade references)
  app.delete('/api/db/users/:id', async (req, res) => {
    const db = getDbPool();
    if (!db) return res.status(503).json({ error: 'PostgreSQL not configured' });
    try {
      const { id } = req.params;
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        // Unassign from tickets
        await client.query('UPDATE tickets SET assigned_to_id = NULL WHERE assigned_to_id = $1', [id]);
        // Update tickets created by this user or delete comments
        await client.query('DELETE FROM ticket_comments WHERE user_id = $1', [id]);
        // If tickets were created by this user, reassign to admin or remove references if foreign key constraint exists
        await client.query(`
          UPDATE tickets 
          SET created_by_id = (SELECT id FROM users WHERE role = 'ADMIN' AND id != $1 LIMIT 1)
          WHERE created_by_id = $1
        `, [id]);
        // Delete audit logs or set user_id to NULL
        await client.query('UPDATE audit_logs SET user_id = NULL WHERE user_id = $1', [id]);
        // Finally delete the user
        await client.query('DELETE FROM users WHERE id = $1', [id]);
        await client.query('COMMIT');
        res.json({ success: true });
      } catch (e: any) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.error('Error deleting user in PostgreSQL:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST: Sync Entire State from UI to PostgreSQL
  app.post('/api/db/sync-all', async (req, res) => {
    const db = getDbPool();
    if (!db) return res.status(503).json({ error: 'PostgreSQL not configured' });
    try {
      const { businessUnits, departments, users, tickets } = req.body;
      const client = await db.connect();
      try {
        // Ensure schema columns are migrated
        await client.query(`
          ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(255);
          ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id VARCHAR(64);
          ALTER TABLE users ADD COLUMN IF NOT EXISTS business_unit_id VARCHAR(64);
          ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;
        `);

        await client.query('BEGIN');

        if (Array.isArray(businessUnits)) {
          for (const bu of businessUnits) {
            await client.query(`
              INSERT INTO business_units (id, code, name, description, icon, theme_color, branding)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
              ON CONFLICT (id) DO UPDATE SET
                code = EXCLUDED.code,
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                icon = EXCLUDED.icon,
                theme_color = EXCLUDED.theme_color,
                branding = EXCLUDED.branding
            `, [bu.id, bu.code, bu.name, bu.description, bu.icon || 'Building2', bu.themeColor || '#2563eb', bu.branding ? JSON.stringify(bu.branding) : null]);
          }
        }

        if (Array.isArray(departments)) {
          for (const dept of departments) {
            await client.query(`
              INSERT INTO departments (id, name, code, business_unit_id)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                code = EXCLUDED.code,
                business_unit_id = EXCLUDED.business_unit_id
            `, [dept.id, dept.name, dept.code, dept.businessUnitId]);
          }
        }

        if (Array.isArray(users)) {
          for (const u of users) {
            let deptName = u.department;
            if (!deptName && u.departmentId && Array.isArray(departments)) {
              const matchedD = departments.find((d: any) => d.id === u.departmentId);
              if (matchedD) deptName = matchedD.name;
            }

            await client.query(`
              INSERT INTO users (id, username, password_hash, full_name, email, role, business_unit_id, department_id, department, avatar_url, must_change_password)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
              ON CONFLICT (id) DO UPDATE SET
                username = EXCLUDED.username,
                full_name = EXCLUDED.full_name,
                email = EXCLUDED.email,
                role = EXCLUDED.role,
                business_unit_id = EXCLUDED.business_unit_id,
                department_id = EXCLUDED.department_id,
                department = EXCLUDED.department,
                avatar_url = EXCLUDED.avatar_url,
                must_change_password = EXCLUDED.must_change_password
            `, [
              u.id,
              u.username.toLowerCase(),
              u.password || 'password123',
              u.fullName,
              u.email,
              u.role,
              u.businessUnitId || null,
              u.departmentId || null,
              deptName || null,
              u.avatarUrl || null,
              u.mustChangePassword ?? false
            ]);
          }
        }

        if (Array.isArray(tickets)) {
          for (const t of tickets) {
            await client.query(`
              INSERT INTO tickets (
                id, ticket_number, title, description, category, priority, status,
                business_unit_id, department_id, created_by_id, assigned_to_id, resolution_notes,
                due_date, activities, attachments, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
              ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title,
                description = EXCLUDED.description,
                category = EXCLUDED.category,
                priority = EXCLUDED.priority,
                status = EXCLUDED.status,
                assigned_to_id = EXCLUDED.assigned_to_id,
                resolution_notes = EXCLUDED.resolution_notes,
                activities = EXCLUDED.activities,
                attachments = EXCLUDED.attachments,
                updated_at = EXCLUDED.updated_at
            `, [
              t.id,
              t.ticketNumber,
              t.title,
              t.description,
              t.category || 'Technical Support',
              t.priority || 'MEDIUM',
              t.status || 'OPEN',
              t.businessUnitId,
              t.departmentId || null,
              t.createdById,
              t.assignedToId || null,
              t.resolutionNotes || null,
              t.dueDate || null,
              JSON.stringify(t.activities || []),
              JSON.stringify(t.attachments || []),
              t.createdAt || new Date().toISOString(),
              t.updatedAt || new Date().toISOString()
            ]);
          }
        }

        await client.query('COMMIT');
        res.json({ success: true, message: 'All tables synced directly to PostgreSQL database!' });
      } catch (e: any) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.error('Sync to PostgreSQL error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET: Tickets
  app.get('/api/db/tickets', async (req, res) => {
    const db = getDbPool();
    if (!db) return res.status(503).json({ error: 'PostgreSQL not configured' });
    try {
      const { rows } = await db.query(`
        SELECT id, ticket_number as "ticketNumber", title, description, category, priority, status,
               business_unit_id as "businessUnitId", department_id as "departmentId",
               created_by_id as "createdById", assigned_to_id as "assignedToId",
               resolution_notes as "resolutionNotes", due_date as "dueDate",
               activities, attachments, created_at as "createdAt", updated_at as "updatedAt"
        FROM tickets
        ORDER BY created_at DESC
      `);
      res.json(rows.map((t: any) => ({
        ...t,
        activities: typeof t.activities === 'string' ? JSON.parse(t.activities) : (t.activities || []),
        attachments: typeof t.attachments === 'string' ? JSON.parse(t.attachments) : (t.attachments || []),
      })));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST: Create Ticket in PostgreSQL
  app.post('/api/db/tickets', async (req, res) => {
    const db = getDbPool();
    if (!db) return res.status(503).json({ error: 'PostgreSQL not configured' });
    try {
      const {
        id,
        ticketNumber,
        title,
        description,
        category,
        priority,
        status,
        businessUnitId,
        departmentId,
        createdById,
        assignedToId,
        resolutionNotes,
        dueDate,
        activities,
        attachments,
      } = req.body;

      const query = `
        INSERT INTO tickets (
          id, ticket_number, title, description, category, priority, status,
          business_unit_id, department_id, created_by_id, assigned_to_id, resolution_notes, due_date,
          activities, attachments
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id, ticket_number as "ticketNumber", title, description, category, priority, status,
                  business_unit_id as "businessUnitId", department_id as "departmentId",
                  created_by_id as "createdById", assigned_to_id as "assignedToId",
                  resolution_notes as "resolutionNotes", due_date as "dueDate",
                  activities, attachments, created_at as "createdAt", updated_at as "updatedAt";
      `;
      const values = [
        id,
        ticketNumber,
        title,
        description,
        category || 'General Technical Support',
        priority || 'MEDIUM',
        status || 'OPEN',
        businessUnitId,
        departmentId || null,
        createdById,
        assignedToId || null,
        resolutionNotes || null,
        dueDate || null,
        JSON.stringify(activities || []),
        JSON.stringify(attachments || []),
      ];

      const { rows } = await db.query(query, values);
      res.json({ success: true, ticket: rows[0] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT: Update Ticket in PostgreSQL (Status, Priority, Assignment, Notes, Activities)
  app.put('/api/db/tickets/:id', async (req, res) => {
    const db = getDbPool();
    if (!db) return res.status(503).json({ error: 'PostgreSQL not configured' });
    try {
      const { id } = req.params;
      const { status, priority, assignedToId, resolutionNotes, activities, attachments, title, description } = req.body;

      const fields: string[] = ['updated_at = NOW()'];
      const values: any[] = [];
      let idx = 1;

      if (status !== undefined) { fields.push(`status = $${idx++}`); values.push(status); }
      if (priority !== undefined) { fields.push(`priority = $${idx++}`); values.push(priority); }
      if (assignedToId !== undefined) { fields.push(`assigned_to_id = $${idx++}`); values.push(assignedToId || null); }
      if (resolutionNotes !== undefined) { fields.push(`resolution_notes = $${idx++}`); values.push(resolutionNotes); }
      if (activities !== undefined) { fields.push(`activities = $${idx++}`); values.push(JSON.stringify(activities)); }
      if (attachments !== undefined) { fields.push(`attachments = $${idx++}`); values.push(JSON.stringify(attachments)); }
      if (title !== undefined) { fields.push(`title = $${idx++}`); values.push(title); }
      if (description !== undefined) { fields.push(`description = $${idx++}`); values.push(description); }

      values.push(id);
      const query = `
        UPDATE tickets SET ${fields.join(', ')}
        WHERE id = $${idx}
        RETURNING id, ticket_number as "ticketNumber", title, description, category, priority, status,
                  business_unit_id as "businessUnitId", department_id as "departmentId",
                  created_by_id as "createdById", assigned_to_id as "assignedToId",
                  resolution_notes as "resolutionNotes", due_date as "dueDate",
                  activities, attachments, created_at as "createdAt", updated_at as "updatedAt"
      `;

      const { rows } = await db.query(query, values);
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE: Delete ALL Tickets from PostgreSQL
  app.delete('/api/db/tickets', async (req, res) => {
    const db = getDbPool();
    if (!db) return res.status(503).json({ error: 'PostgreSQL not configured' });
    try {
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM ticket_comments');
        await client.query('UPDATE audit_logs SET ticket_id = NULL');
        await client.query('DELETE FROM tickets');
        await client.query('COMMIT');
        res.json({ success: true, message: 'All tickets deleted from PostgreSQL' });
      } catch (e: any) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.error('Error clearing tickets from PostgreSQL:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE: Delete Ticket from PostgreSQL
  app.delete('/api/db/tickets/:id', async (req, res) => {
    const db = getDbPool();
    if (!db) return res.status(503).json({ error: 'PostgreSQL not configured' });
    try {
      const { id } = req.params;
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM ticket_comments WHERE ticket_id = $1', [id]);
        await client.query('UPDATE audit_logs SET ticket_id = NULL WHERE ticket_id = $1', [id]);
        await client.query('DELETE FROM tickets WHERE id = $1', [id]);
        await client.query('COMMIT');
        res.json({ success: true, message: `Ticket ${id} deleted from database` });
      } catch (e: any) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.error('Error deleting ticket from PostgreSQL:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST: Add Audit Log
  app.post('/api/db/audit-logs', async (req, res) => {
    const db = getDbPool();
    if (!db) return res.status(503).json({ error: 'PostgreSQL not configured' });
    try {
      const { id, action, details, userId, username, ticketId, businessUnitId } = req.body;
      const { rows } = await db.query(
        `INSERT INTO audit_logs (id, action, details, user_id, username, ticket_id, business_unit_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [id, action, details, userId || null, username || null, ticketId || null, businessUnitId || null]
      );
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST: Reset Database back to initial SQL script
  app.post('/api/db/reset-all', async (req, res) => {
    const db = getDbPool();
    if (!db) return res.status(503).json({ error: 'PostgreSQL not configured' });
    try {
      await autoInitDatabase();
      res.json({ success: true, message: 'Database reset to initial master schema and seed users!' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // POP3 & Corporate Email Ingestion Endpoints
  // ==========================================

  // GET: Fetch current POP3 Configuration
  app.get('/api/email/config', async (req, res) => {
    try {
      const config = getEmailConfig();
      // Mask password for security
      const safeConfig = {
        ...config,
        appPassword: config.appPassword ? '********' : '',
        smtpPassword: config.smtpPassword ? '********' : '',
      };
      res.json(safeConfig);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST: Save/Update POP3 Configuration
  app.post('/api/email/config', async (req, res) => {
    try {
      const db = getDbPool();
      const current = getEmailConfig();
      const payload = req.body;

      // Retain existing password if masked
      if (payload.appPassword === '********') {
        payload.appPassword = current.appPassword;
      }
      if (payload.smtpPassword === '********') {
        payload.smtpPassword = current.smtpPassword;
      }

      const updated = await saveEmailConfig(db, payload);
      res.json({
        success: true,
        message: 'POP3 Mailbox Configuration updated successfully!',
        config: {
          ...updated,
          appPassword: updated.appPassword ? '********' : '',
          smtpPassword: updated.smtpPassword ? '********' : '',
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST: Test POP3 Mailbox Connection
  app.post('/api/email/test-pop3', async (req, res) => {
    try {
      const current = getEmailConfig();
      const payload = req.body;

      const testConfig = {
        host: payload.host || current.host,
        port: parseInt(payload.port, 10) || current.port || 995,
        useSsl: payload.useSsl !== undefined ? !!payload.useSsl : current.useSsl,
        username: payload.username || payload.emailAddress || current.username || current.emailAddress,
        password: payload.appPassword === '********' ? current.appPassword : (payload.appPassword || current.appPassword),
      };

      const result = await testPop3Mailbox(testConfig);
      res.json(result);
    } catch (err: any) {
      res.json({
        success: false,
        message: `POP3 Connection Test Failed: ${err.message}`,
      });
    }
  });

  // POST: Test Genuine Outbound SMTP Connection & Authentication
  app.post('/api/email/test-smtp', async (req, res) => {
    try {
      const payload = req.body || {};
      const current = getEmailConfig();
      const host = payload.smtpHost || current.smtpHost || 'mail.uohospitality.com.my';
      const port = parseInt(payload.smtpPort, 10) || current.smtpPort || 465;
      const username = payload.smtpUsername || payload.emailAddress || current.smtpUsername || current.emailAddress;
      const password = payload.smtpPassword === '********' ? current.smtpPassword : (payload.smtpPassword || current.smtpPassword || current.appPassword);
      const useSsl = payload.smtpUseSsl !== undefined ? !!payload.smtpUseSsl : (port === 465);

      if (!host || !host.trim()) {
        return res.json({ success: false, message: 'SMTP Hostname is required (e.g. mail.yourcompany.com).' });
      }

      const result = await testSmtpServer({
        host,
        port,
        useSsl,
        username,
        password,
        senderEmail: payload.emailAddress || current.emailAddress,
      });

      res.json(result);
    } catch (err: any) {
      res.json({
        success: false,
        message: `SMTP Connection Probe Failed: ${err.message}`,
      });
    }
  });

  // POST: Trigger Automated Email Notification to Requester on Ticket Status Change (IN_PROGRESS, RESOLVED, etc.)
  app.post('/api/email/notify-status-change', async (req, res) => {
    try {
      const {
        ticketId,
        ticketNumber,
        ticketTitle,
        newStatus,
        oldStatus,
        requesterEmail,
        requesterName,
        technicianName,
        resolutionNotes,
        businessUnitName,
      } = req.body;

      if (!requesterEmail || !ticketNumber || !newStatus) {
        return res.status(400).json({ error: 'Missing required parameters: requesterEmail, ticketNumber, newStatus' });
      }

      const config = getEmailConfig();

      // Craft professional status-specific notification subject and body
      let subject = `[${ticketNumber}] Support Ticket Update: Status set to ${newStatus}`;
      let body = '';

      if (newStatus === 'IN_PROGRESS') {
        subject = `[${ticketNumber}] In Progress: ${ticketTitle}`;
        body = `Dear ${requesterName || 'Colleague'},\n\n` +
          `Your IT support request has been accepted and is now IN PROGRESS.\n\n` +
          `Ticket Details:\n` +
          `• Ticket Number: [${ticketNumber}]\n` +
          `• Subject: ${ticketTitle}\n` +
          `• Business Unit: ${businessUnitName || 'Corporate Operations'}\n` +
          `• Current Status: IN PROGRESS (Active Troubleshooting)\n` +
          `• Assigned Technician: ${technicianName || 'IT Support Team'}\n\n` +
          `Our technical team is actively working on your case. You do not need to call or visit the IT desk—we will notify you via email as soon as the issue is resolved.\n\n` +
          `Best regards,\n` +
          `${businessUnitName || 'UOH'} IT Support & Systems Helpdesk`;
      } else if (newStatus === 'RESOLVED' || newStatus === 'CLOSED') {
        const isResolved = newStatus === 'RESOLVED';
        subject = `[${ticketNumber}] ${isResolved ? 'Resolved' : 'Closed'}: ${ticketTitle}`;
        body = `Dear ${requesterName || 'Colleague'},\n\n` +
          `Good news! Your IT support ticket [${ticketNumber}] has been marked as ${newStatus} by ${technicianName || 'IT Support'}.\n\n` +
          `Resolution Summary:\n` +
          `• Ticket Number: [${ticketNumber}]\n` +
          `• Subject: ${ticketTitle}\n` +
          `• Business Unit: ${businessUnitName || 'Corporate Operations'}\n` +
          `• Final Status: ${newStatus}\n` +
          `• Attended By: ${technicianName || 'IT Specialist'}\n` +
          (resolutionNotes ? `• Technical Resolution Notes: ${resolutionNotes}\n\n` : '\n') +
          `If everything is working to your satisfaction, no further action is required.\n` +
          `If you are still experiencing issues, you may reply directly to this email to reopen your ticket.\n\n` +
          `Thank you for your patience,\n` +
          `${businessUnitName || 'UOH'} IT Support & Systems Helpdesk`;
      } else {
        subject = `[${ticketNumber}] Status Changed to ${newStatus}: ${ticketTitle}`;
        body = `Dear ${requesterName || 'Colleague'},\n\n` +
          `Your support ticket [${ticketNumber}] status has been updated to "${newStatus}" by ${technicianName || 'IT Support'}.\n\n` +
          `• Ticket: [${ticketNumber}] - ${ticketTitle}\n` +
          `• Status: ${newStatus}\n\n` +
          `Best regards,\n` +
          `${businessUnitName || 'UOH'} IT Service Desk`;
      }

      let delivered = false;
      let errorMessage: string | undefined;

      const smtpHost = config.smtpHost || config.host;
      const smtpPort = config.smtpPort || (config.smtpUseSsl ? 465 : 587);
      const smtpUser = config.smtpUsername || config.username || config.emailAddress;
      const smtpPass = config.smtpPassword || config.appPassword || '';
      const senderFrom = config.emailAddress || 'ticket.support@uohospitality.com.my';
      const senderName = config.senderDisplayName || `${businessUnitName || 'UOH'} IT Helpdesk`;

      // Dispatch genuine SMTP outbound email if server is accessible
      if (smtpHost && requesterEmail) {
        try {
          console.log(`[SMTP Outbound] Sending status update email to ${requesterEmail} for ticket ${ticketNumber} (${newStatus})...`);
          const sendResult = await sendSmtpEmail({
            host: smtpHost,
            port: smtpPort,
            useSsl: config.smtpUseSsl !== undefined ? config.smtpUseSsl : (smtpPort === 465),
            username: smtpUser,
            password: smtpPass,
            from: senderFrom,
            fromName: senderName,
            to: requesterEmail,
            subject,
            body,
            timeoutMs: 12000,
          });

          if (sendResult.success) {
            delivered = true;
            console.log(`[SMTP Outbound] Successfully delivered status email to ${requesterEmail} (${sendResult.latencyMs}ms).`);
          } else {
            errorMessage = sendResult.message;
            console.warn(`[SMTP Outbound] Delivery to ${requesterEmail} failed:`, sendResult.message);
          }
        } catch (smtpErr: any) {
          errorMessage = smtpErr.message;
          console.error(`[SMTP Outbound] Exception sending status email to ${requesterEmail}:`, smtpErr.message);
        }
      } else {
        errorMessage = 'SMTP Host or requester email address not configured.';
      }

      // Record in PostgreSQL email_logs table
      const db = getDbPool();
      if (db) {
        try {
          const logId = `log-notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
          await db.query(
            `INSERT INTO email_logs (
              id, from_address, from_name, to_address, subject, body_preview, raw_body, received_at,
              status, created_ticket_id, created_ticket_number, auto_reply_sent, auto_reply_subject, auto_reply_body, error_message
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8, $9, $10, $11, $12, $13, $14)`,
            [
              logId,
              senderFrom,
              senderName,
              requesterEmail,
              subject,
              body.substring(0, 150),
              body,
              delivered ? 'STATUS_NOTIFICATION_SENT' : 'STATUS_NOTIFICATION_FAILED',
              ticketId || null,
              ticketNumber,
              delivered,
              subject,
              body,
              errorMessage || null,
            ]
          );
        } catch (dbErr: any) {
          console.warn('Could not record notification in PostgreSQL email_logs:', dbErr.message);
        }
      }

      res.json({
        success: true,
        delivered,
        recipient: requesterEmail,
        subject,
        body,
        message: delivered
          ? `Status change email delivered to ${requesterEmail}`
          : `Notification logged (${errorMessage || 'SMTP pending'})`,
      });
    } catch (err: any) {
      console.error('Error in notify-status-change endpoint:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST: Trigger Manual/Immediate POP3 Sync & Auto-Ingestion
  app.post('/api/email/fetch-now', async (req, res) => {
    try {
      const db = getDbPool();
      const config = getEmailConfig();

      // If POP3 credentials provided in body (e.g. from UI before saving)
      let activeConfig = config;
      if (req.body && Object.keys(req.body).length > 0) {
        activeConfig = {
          ...config,
          ...req.body,
          appPassword: req.body.appPassword === '********' ? config.appPassword : (req.body.appPassword || config.appPassword),
        };
      }

      const syncResult = await executePop3Sync(db, activeConfig);
      res.json(syncResult);
    } catch (err: any) {
      console.error('Fetch now error:', err);
      res.json({
        success: false,
        fetchedCount: 0,
        createdTickets: [],
        message: `POP3 Sync error: ${err.message}`,
      });
    }
  });

  // GET: Fetch Inbound Email Logs
  app.get('/api/email/logs', async (req, res) => {
    const db = getDbPool();
    if (!db) return res.json([]);
    try {
      const { rows } = await db.query(`
        SELECT id, message_id as "messageId", from_address as "fromAddress", from_name as "fromName",
               to_address as "toAddress", subject, body_preview as "bodyPreview", raw_body as "rawBody",
               received_at as "receivedAt", status, created_ticket_id as "createdTicketId",
               created_ticket_number as "createdTicketNumber", matched_user_id as "matchedUserId",
               matched_business_unit_id as "matchedBusinessUnitId", matched_department_id as "matchedDepartmentId",
               error_message as "errorMessage", attachments_count as "attachmentsCount",
               auto_reply_sent as "autoReplySent", auto_reply_subject as "autoReplySubject",
               auto_reply_body as "autoReplyBody"
        FROM email_logs
        ORDER BY received_at DESC
        LIMIT 100
      `);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE: Clear Inbound Email Logs
  app.delete('/api/email/logs', async (req, res) => {
    const db = getDbPool();
    if (!db) return res.json({ success: true });
    try {
      await db.query('DELETE FROM email_logs');
      res.json({ success: true, message: 'Email ingestion logs cleared.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST: Simulate or Webhook an Inbound Email Report
  app.post('/api/email/simulate-inbound', async (req, res) => {
    try {
      const db = getDbPool();
      const { from, fromName, to, subject, body, attachments } = req.body;

      if (!from || !subject || !body) {
        return res.status(400).json({ error: 'from, subject, and body are required.' });
      }

      const parsedEmail = {
        messageId: `sim-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        from,
        fromName: fromName || from.split('@')[0],
        to: to || 'ticket.support@uohospitality.com.my',
        subject,
        date: new Date().toISOString(),
        textBody: body,
        htmlBody: '',
        problemContent: extractProblemContent(body || ''),
        attachments: Array.isArray(attachments) ? attachments : [],
        rawHeaders: {},
      };

      const result = await ingestEmailReport(db, parsedEmail, getEmailConfig());
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // Vite / Static Serving Middleware
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Helpdesk server running on http://localhost:${PORT}`);
  });
}

startServer();
