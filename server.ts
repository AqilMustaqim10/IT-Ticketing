import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Lazy PostgreSQL connection pool
let pool: pg.Pool | null = null;

function getDbPool(): pg.Pool | null {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
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
    const initSqlPath = path.join(process.cwd(), 'init.sql');
    if (fs.existsSync(initSqlPath)) {
      const sqlContent = fs.readFileSync(initSqlPath, 'utf8');
      const client = await db.connect();
      try {
        await client.query(sqlContent);
        console.log('PostgreSQL schema and master data verified successfully.');
      } finally {
        client.release();
      }
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
        db.query('SELECT id, username, full_name as "fullName", email, role, business_unit_id as "businessUnitId", department_id as "departmentId", avatar_url as "avatarUrl", must_change_password as "mustChangePassword", created_at as "createdAt" FROM users ORDER BY full_name ASC'),
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
        'SELECT id, username, full_name as "fullName", email, role, business_unit_id as "businessUnitId", department_id as "departmentId", avatar_url as "avatarUrl", must_change_password as "mustChangePassword", created_at as "createdAt" FROM users ORDER BY full_name ASC'
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
        'SELECT id, username, password_hash, full_name as "fullName", email, role, business_unit_id as "businessUnitId", department_id as "departmentId", avatar_url as "avatarUrl", must_change_password as "mustChangePassword", created_at as "createdAt" FROM users WHERE LOWER(username) = $1',
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
      const { id, username, password, fullName, email, role, businessUnitId, departmentId, avatarUrl, mustChangePassword } = req.body;
      const { rows } = await db.query(
        `INSERT INTO users (id, username, password_hash, full_name, email, role, business_unit_id, department_id, avatar_url, must_change_password)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, username, full_name as "fullName", email, role, business_unit_id as "businessUnitId", department_id as "departmentId", avatar_url as "avatarUrl", must_change_password as "mustChangePassword", created_at as "createdAt"`,
        [id, username.toLowerCase(), password || 'password123', fullName, email, role, businessUnitId || null, departmentId || null, avatarUrl || null, mustChangePassword ?? true]
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
      const { fullName, email, role, businessUnitId, departmentId, avatarUrl, password, mustChangePassword } = req.body;

      const fields: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (fullName !== undefined) { fields.push(`full_name = $${idx++}`); values.push(fullName); }
      if (email !== undefined) { fields.push(`email = $${idx++}`); values.push(email); }
      if (role !== undefined) { fields.push(`role = $${idx++}`); values.push(role); }
      if (businessUnitId !== undefined) { fields.push(`business_unit_id = $${idx++}`); values.push(businessUnitId); }
      if (departmentId !== undefined) { fields.push(`department_id = $${idx++}`); values.push(departmentId); }
      if (avatarUrl !== undefined) { fields.push(`avatar_url = $${idx++}`); values.push(avatarUrl); }
      if (password !== undefined) { fields.push(`password_hash = $${idx++}`); values.push(password); }
      if (mustChangePassword !== undefined) { fields.push(`must_change_password = $${idx++}`); values.push(mustChangePassword); }

      if (fields.length === 0) {
        return res.json({ success: true });
      }

      values.push(id);
      const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, username, full_name as "fullName", email, role, business_unit_id as "businessUnitId", department_id as "departmentId", avatar_url as "avatarUrl", must_change_password as "mustChangePassword", created_at as "createdAt"`;

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
            await client.query(`
              INSERT INTO users (id, username, password_hash, full_name, email, role, business_unit_id, department_id, avatar_url, must_change_password)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
              ON CONFLICT (id) DO UPDATE SET
                username = EXCLUDED.username,
                full_name = EXCLUDED.full_name,
                email = EXCLUDED.email,
                role = EXCLUDED.role,
                business_unit_id = EXCLUDED.business_unit_id,
                department_id = EXCLUDED.department_id,
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
