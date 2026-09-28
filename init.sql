-- ==========================================================
-- IT Helpdesk System Database Schema & Initialization (PostgreSQL)
-- ==========================================================

CREATE TABLE IF NOT EXISTS business_units (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(32) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(64) DEFAULT 'Building2',
    theme_color VARCHAR(32) DEFAULT '#2563eb',
    branding JSONB DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(64),
    business_unit_id VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_dept_bu FOREIGN KEY (business_unit_id) REFERENCES business_units(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL,
    business_unit_id VARCHAR(64),
    department_id VARCHAR(64),
    department VARCHAR(255),
    avatar_url TEXT,
    must_change_password BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_bu FOREIGN KEY (business_unit_id) REFERENCES business_units(id) ON DELETE SET NULL,
    CONSTRAINT fk_user_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tickets (
    id VARCHAR(64) PRIMARY KEY,
    ticket_number VARCHAR(32) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    priority VARCHAR(20) NOT NULL,
    status VARCHAR(30) NOT NULL,
    business_unit_id VARCHAR(64) NOT NULL,
    department_id VARCHAR(64),
    created_by_id VARCHAR(64) NOT NULL,
    assigned_to_id VARCHAR(64),
    resolution_notes TEXT,
    due_date TIMESTAMP NULL,
    activities JSONB DEFAULT NULL,
    attachments JSONB DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ticket_bu FOREIGN KEY (business_unit_id) REFERENCES business_units(id),
    CONSTRAINT fk_ticket_user FOREIGN KEY (created_by_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS ticket_comments (
    id VARCHAR(64) PRIMARY KEY,
    ticket_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    text TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_comment_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    CONSTRAINT fk_comment_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    user_id VARCHAR(64),
    username VARCHAR(100),
    ticket_id VARCHAR(64),
    business_unit_id VARCHAR(64),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_config (
    id VARCHAR(64) PRIMARY KEY,
    config JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS processed_email_messages (
    message_id VARCHAR(255) PRIMARY KEY,
    ticket_id VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_logs (
    id VARCHAR(64) PRIMARY KEY,
    message_id VARCHAR(255),
    from_address VARCHAR(255),
    from_name VARCHAR(255),
    to_address VARCHAR(255),
    subject VARCHAR(500),
    body_preview TEXT,
    raw_body TEXT,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50),
    created_ticket_id VARCHAR(64),
    created_ticket_number VARCHAR(32),
    matched_user_id VARCHAR(64),
    matched_business_unit_id VARCHAR(64),
    matched_department_id VARCHAR(64),
    attachments_count INT DEFAULT 0,
    auto_reply_sent BOOLEAN DEFAULT FALSE,
    auto_reply_subject VARCHAR(500),
    auto_reply_body TEXT,
    error_message TEXT
);
