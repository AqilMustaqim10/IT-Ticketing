-- ==========================================================
-- IT Helpdesk System Database Initialization Script (Docker)
-- Automatically executed on first container boot
-- ==========================================================

-- 1. Create Business Units Table
CREATE TABLE IF NOT EXISTS business_units (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(32) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Departments Table
CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    business_unit_id VARCHAR(64) REFERENCES business_units(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'IT', 'USER')),
    business_unit_id VARCHAR(64) REFERENCES business_units(id) ON DELETE SET NULL,
    department_id VARCHAR(64) REFERENCES departments(id) ON DELETE SET NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create Support Tickets Table
CREATE TABLE IF NOT EXISTS tickets (
    id VARCHAR(64) PRIMARY KEY,
    ticket_number VARCHAR(32) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    status VARCHAR(30) NOT NULL CHECK (status IN ('OPEN', 'IN_PROGRESS', 'PENDING_VENDOR', 'RESOLVED', 'CLOSED')),
    business_unit_id VARCHAR(64) NOT NULL REFERENCES business_units(id),
    department_id VARCHAR(64) REFERENCES departments(id),
    created_by_id VARCHAR(64) NOT NULL REFERENCES users(id),
    assigned_to_id VARCHAR(64) REFERENCES users(id),
    resolution_notes TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create Ticket Comments Table
CREATE TABLE IF NOT EXISTS ticket_comments (
    id VARCHAR(64) PRIMARY KEY,
    ticket_id VARCHAR(64) NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id),
    user_name VARCHAR(255) NOT NULL,
    text TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Create Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    user_id VARCHAR(64),
    username VARCHAR(100),
    ticket_id VARCHAR(64),
    business_unit_id VARCHAR(64),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Seed Initial Business Units
INSERT INTO business_units (id, code, name, description) VALUES
('bu-ccec', 'CCEC', 'Connexion Conference & Event Centre', 'Event space, banquets, and convention facilities'),
('bu-fnb', 'FNB', 'UOA Hospitality - F&B Division', 'Restaurants, cafes, catering, and culinary outlets'),
('bu-hotel', 'HOTEL', 'VE Hotel & Residence', 'Hotel accommodations, guest services, and hospitality suites'),
('bu-klbs', 'KLBS', 'Komune Living & Wellness Bangsar South', 'Co-living, wellness facilities, and senior care spaces'),
('bu-komune', 'KOMUNE', 'Komune Co-working Spaces', 'Shared workspaces, meeting suites, and hot-desks'),
('bu-uoa', 'UOA_HQ', 'UOA Corporate Headquarters', 'Central corporate management and real estate development')
ON CONFLICT (code) DO NOTHING;

-- 8. Seed Initial Departments
INSERT INTO departments (id, name, business_unit_id) VALUES
('dept-ccec-sales', 'Events & Sales', 'bu-ccec'),
('dept-ccec-ops', 'Banquet & Venue Ops', 'bu-ccec'),
('dept-ccec-av', 'AV & Stage Engineering', 'bu-ccec'),
('dept-fnb-kitchen', 'Culinary / Kitchen', 'bu-fnb'),
('dept-fnb-pos', 'POS & Floor Operations', 'bu-fnb'),
('dept-htl-front', 'Front Office & Concierge', 'bu-hotel'),
('dept-htl-net', 'Guest Room Networks & IPTV', 'bu-hotel'),
('dept-klbs-infra', 'Building Infrastructure & Access', 'bu-klbs'),
('dept-kom-space', 'Community Management', 'bu-komune'),
('dept-hq-fin', 'Corporate Finance', 'bu-uoa')
ON CONFLICT (id) DO NOTHING;

-- 9. Seed Initial Users (Password: password123)
INSERT INTO users (id, username, password_hash, full_name, email, role, business_unit_id, department_id) VALUES
('user-admin-01', 'admin', 'password123', 'Alex Vance (Global Administrator)', 'alex.vance@enterprise-it.internal', 'ADMIN', 'bu-uoa', NULL),
('user-it-ccec', 'it.ccec', 'password123', 'David Thorne (CCEC IT Lead)', 'david.thorne@ccec.internal', 'IT', 'bu-ccec', 'dept-ccec-av'),
('user-it-fnb', 'it.fnb', 'password123', 'Nadia Rostova (F&B Systems Tech)', 'nadia.rostova@fnb.internal', 'IT', 'bu-fnb', 'dept-fnb-pos'),
('user-it-hotel', 'it.hotel', 'password123', 'Kenji Sato (Hotel IT Specialist)', 'kenji.sato@hotel.internal', 'IT', 'bu-hotel', 'dept-htl-net'),
('user-it-klbs', 'it.klbs', 'password123', 'Farhan Razak (KLBS IT Lead)', 'farhan.razak@klbs.internal', 'IT', 'bu-klbs', 'dept-klbs-infra'),
('user-ccec-user', 'user.ccec', 'password123', 'Sarah Jenkins (CCEC Events)', 'sarah.j@ccec.internal', 'USER', 'bu-ccec', 'dept-ccec-sales')
ON CONFLICT (username) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  role = EXCLUDED.role;
