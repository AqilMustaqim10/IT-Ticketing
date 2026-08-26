import express from 'express';
import path from 'path';
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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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

  // GET: Business Units
  app.get('/api/db/business-units', async (req, res) => {
    const db = getDbPool();
    if (!db) return res.status(503).json({ error: 'PostgreSQL not configured' });
    try {
      const { rows } = await db.query('SELECT * FROM business_units ORDER BY name ASC');
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET: Departments
  app.get('/api/db/departments', async (req, res) => {
    const db = getDbPool();
    if (!db) return res.status(503).json({ error: 'PostgreSQL not configured' });
    try {
      const { rows } = await db.query('SELECT * FROM departments ORDER BY name ASC');
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET: Users
  app.get('/api/db/users', async (req, res) => {
    const db = getDbPool();
    if (!db) return res.status(503).json({ error: 'PostgreSQL not configured' });
    try {
      const { rows } = await db.query('SELECT id, username, full_name, email, role, business_unit_id, department_id, avatar_url, created_at FROM users ORDER BY full_name ASC');
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET: Tickets
  app.get('/api/db/tickets', async (req, res) => {
    const db = getDbPool();
    if (!db) return res.status(503).json({ error: 'PostgreSQL not configured' });
    try {
      const { rows } = await db.query(`
        SELECT t.*, 
               json_agg(c.*) FILTER (WHERE c.id IS NOT NULL) as comments
        FROM tickets t
        LEFT JOIN ticket_comments c ON t.id = c.ticket_id
        GROUP BY t.id
        ORDER BY t.created_at DESC
      `);
      res.json(rows);
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
      } = req.body;

      const query = `
        INSERT INTO tickets (
          id, ticket_number, title, description, category, priority, status,
          business_unit_id, department_id, created_by_id, assigned_to_id, resolution_notes, due_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *;
      `;
      const values = [
        id,
        ticketNumber,
        title,
        description,
        category,
        priority || 'MEDIUM',
        status || 'OPEN',
        businessUnitId,
        departmentId || null,
        createdById,
        assignedToId || null,
        resolutionNotes || null,
        dueDate || null,
      ];

      const { rows } = await db.query(query, values);
      res.json({ success: true, ticket: rows[0] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST: Sync/Import Full Local Data into PostgreSQL
  app.post('/api/db/sync-all', async (req, res) => {
    const db = getDbPool();
    if (!db) return res.status(503).json({ error: 'PostgreSQL not configured' });
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const { businessUnits, departments, users, tickets } = req.body;

      // Sync Business Units
      if (businessUnits && Array.isArray(businessUnits)) {
        for (const bu of businessUnits) {
          await client.query(`
            INSERT INTO business_units (id, code, name, description)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (id) DO UPDATE SET code = $2, name = $3, description = $4
          `, [bu.id, bu.code, bu.name, bu.description || '']);
        }
      }

      // Sync Departments
      if (departments && Array.isArray(departments)) {
        for (const dept of departments) {
          await client.query(`
            INSERT INTO departments (id, name, business_unit_id)
            VALUES ($1, $2, $3)
            ON CONFLICT (id) DO UPDATE SET name = $2, business_unit_id = $3
          `, [dept.id, dept.name, dept.businessUnitId]);
        }
      }

      // Sync Users
      if (users && Array.isArray(users)) {
        for (const u of users) {
          await client.query(`
            INSERT INTO users (id, username, password_hash, full_name, email, role, business_unit_id, department_id, avatar_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (id) DO UPDATE SET username = $2, password_hash = $3, full_name = $4, email = $5, role = $6, business_unit_id = $7, department_id = $8, avatar_url = $9
          `, [u.id, u.username, u.password || 'password123', u.fullName, u.email, u.role, u.businessUnitId || null, u.departmentId || null, u.avatarUrl || null]);
        }
      }

      // Sync Tickets
      if (tickets && Array.isArray(tickets)) {
        for (const t of tickets) {
          await client.query(`
            INSERT INTO tickets (
              id, ticket_number, title, description, category, priority, status,
              business_unit_id, department_id, created_by_id, assigned_to_id, resolution_notes, due_date, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            ON CONFLICT (id) DO UPDATE SET
              ticket_number = $2, title = $3, description = $4, category = $5, priority = $6, status = $7,
              business_unit_id = $8, department_id = $9, created_by_id = $10, assigned_to_id = $11,
              resolution_notes = $12, due_date = $13, updated_at = $15
          `, [
            t.id,
            t.ticketNumber,
            t.title,
            t.description,
            t.category,
            t.priority,
            t.status,
            t.businessUnitId,
            t.departmentId || null,
            t.createdById,
            t.assignedToId || null,
            t.resolutionNotes || null,
            t.dueDate || null,
            t.createdAt || new Date().toISOString(),
            t.updatedAt || new Date().toISOString(),
          ]);
        }
      }

      await client.query('COMMIT');
      res.json({ success: true, message: 'All tables synchronized successfully to PostgreSQL!' });
    } catch (err: any) {
      await client.query('ROLLBACK');
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
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
