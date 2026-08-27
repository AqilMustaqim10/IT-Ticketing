-- ==========================================================
-- IT Helpdesk System Database Schema & Initialization (PostgreSQL)
-- ==========================================================

-- 1. Create Business Units Table
CREATE TABLE IF NOT EXISTS business_units (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(32) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(64) DEFAULT 'Building2',
    theme_color VARCHAR(32) DEFAULT '#2563eb',
    branding JSONB DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Departments Table
CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(64),
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
    department VARCHAR(255),
    avatar_url TEXT,
    must_change_password BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure department column exists in existing deployments
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(255);

-- 4. Create Support Tickets Table
CREATE TABLE IF NOT EXISTS tickets (
    id VARCHAR(64) PRIMARY KEY,
    ticket_number VARCHAR(32) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    status VARCHAR(30) NOT NULL CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
    business_unit_id VARCHAR(64) NOT NULL REFERENCES business_units(id),
    department_id VARCHAR(64) REFERENCES departments(id),
    created_by_id VARCHAR(64) NOT NULL REFERENCES users(id),
    assigned_to_id VARCHAR(64) REFERENCES users(id),
    resolution_notes TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    activities JSONB DEFAULT '[]'::jsonb,
    attachments JSONB DEFAULT '[]'::jsonb,
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

-- ==========================================================
-- Initial Master Data Seeding
-- ==========================================================

-- Seed Business Units
INSERT INTO business_units (id, code, name, description, icon, theme_color, branding) VALUES
('bu-ccec', 'CCEC', 'Convention Centre & Events Corp', 'Convention halls, audio-visual staging, exhibition logistics, and large conference networking.', 'Building2', '#2563eb', '{"portalTitle": "CCEC Convention & Exhibition IT Portal", "welcomeBannerTitle": "Convention Centre Technical Services", "welcomeBannerSubtitle": "Rapid technical support for audio-visual staging, high-density keynote Wi-Fi, and booth networking.", "bannerAnnouncement": "📢 Notice: Main Auditorium Optical Matrix switch firmware upgrade scheduled for 11:00 PM.", "primaryColor": "#2563eb", "accentColor": "#4f46e5", "accentGradient": "from-blue-700 via-indigo-700 to-slate-900", "bannerTheme": "blue", "supportHotline": "+1 (555) 019-4001 (Command Desk)", "supportEmail": "av-support@ccec.internal", "deskLocation": "Exhibition Hall 1 • IT Operations Room 204"}'::jsonb),
('bu-fnb', 'FNB', 'Food & Beverage Division', 'Restaurant point-of-sale terminals, kitchen display systems, cellar inventory, and dining POS.', 'Utensils', '#d97706', '{"portalTitle": "F&B Hospitality Systems & POS Helpdesk", "welcomeBannerTitle": "Food & Beverage Operations Support", "welcomeBannerSubtitle": "Immediate assistance for point-of-sale terminals, kitchen displays (KDS), and cellar inventory sensors.", "bannerAnnouncement": "⚡ Priority: Dinner rush live support on standby for dining outlets and banqueting bars.", "primaryColor": "#d97706", "accentColor": "#ea580c", "accentGradient": "from-amber-600 via-orange-600 to-stone-900", "bannerTheme": "amber", "supportHotline": "+1 (555) 019-5002 (KDS Hotline)", "supportEmail": "pos-help@fnb.internal", "deskLocation": "Culinary Central Hub • Office 108"}'::jsonb),
('bu-hotel', 'HOTEL', 'Luxury Hotel & Resort Operations', 'Guest PMS, RFID keycard management, in-room smart amenities, IPTV, and concierge infrastructure.', 'Hotel', '#0d9488', '{"portalTitle": "Grand Resort & Hotel IT Concierge", "welcomeBannerTitle": "Luxury Hotel & Resort IT Service Desk", "welcomeBannerSubtitle": "Ensuring 5-star guest satisfaction across PMS reservations, RFID keycards, in-room IPTV, and guest Wi-Fi.", "bannerAnnouncement": "🛎️ Note: High VIP check-in window between 2:00 PM - 5:00 PM. Front desk encoders prioritized.", "primaryColor": "#0d9488", "accentColor": "#059669", "accentGradient": "from-teal-700 via-emerald-700 to-slate-900", "bannerTheme": "teal", "supportHotline": "+1 (555) 019-6003 (Front Desk Support)", "supportEmail": "guest-tech@hotel.internal", "deskLocation": "Hotel Lobby Level • Concierge Tech Suite B"}'::jsonb),
('bu-klbs', 'KLBS', 'KL Gateway & Bangsar South', 'Commercial office towers, retail mall connectivity, high-speed fiber links, and smart property infrastructure.', 'Building2', '#0284c7', '{"portalTitle": "KLBS Bangsar South IT Helpdesk", "welcomeBannerTitle": "KLBS Commercial & Retail Tech Services", "welcomeBannerSubtitle": "High-availability corporate broadband, tenant network integration, and smart office infrastructure across Bangsar South.", "bannerAnnouncement": "📶 Redundant 10Gbps backbone link maintenance completed successfully at Bangsar South.", "primaryColor": "#0284c7", "accentColor": "#0369a1", "accentGradient": "from-sky-700 via-blue-800 to-slate-900", "bannerTheme": "sky", "supportHotline": "+60 3-2242 8000 (KLBS IT Operations)", "supportEmail": "it-support@klbs.internal", "deskLocation": "Tower 3, Level 5 • KLBS IT Operations Hub"}'::jsonb),
('bu-klw', 'KLW', 'KL West Operations', 'Healthcare suites, wellness centres, smart medical IoT, patient kiosks, and clinical portal infrastructure.', 'Activity', '#059669', '{"portalTitle": "KLW Integrated Healthcare & IT Desk", "welcomeBannerTitle": "KLW Health & Operations IT Services", "welcomeBannerSubtitle": "Mission-critical IoT monitoring, clinical appointment kiosks, secure patient record systems, and wellness suites.", "bannerAnnouncement": "🛡️ Compliance: Clinical portal data backup snapshot and telemetry sensors verified.", "primaryColor": "#059669", "accentColor": "#047857", "accentGradient": "from-emerald-700 via-teal-800 to-slate-900", "bannerTheme": "emerald", "supportHotline": "+60 3-7988 9001 (KLW Tech Desk)", "supportEmail": "tech-desk@klw.internal", "deskLocation": "Medical Wing B • Level 2 Helpdesk"}'::jsonb),
('bu-uoahq', 'UOA HQ', 'UOA Corporate Headquarters', 'Group executive management, central ERP financials, enterprise cloud infrastructure, and boardrooms.', 'Building2', '#7c3aed', '{"portalTitle": "UOA Corporate Headquarters IT Services", "welcomeBannerTitle": "UOA Corporate Executive IT Helpdesk", "welcomeBannerSubtitle": "Executive boardrooms, SAP/ERP financials, corporate cloud security, identity governance, and group systems.", "bannerAnnouncement": "🔐 Notice: Executive Boardroom Telepresence and Cisco Webex Room Kit firmware updated.", "primaryColor": "#7c3aed", "accentColor": "#6d28d9", "accentGradient": "from-purple-700 via-indigo-800 to-slate-900", "bannerTheme": "purple", "supportHotline": "+60 3-2282 9999 (Executive Helpdesk)", "supportEmail": "hq-it@uoa.com.my", "deskLocation": "UOA Corporate Tower • Level 38 Executive Suite"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  theme_color = EXCLUDED.theme_color,
  branding = EXCLUDED.branding;

-- Seed Departments
INSERT INTO departments (id, name, code, business_unit_id) VALUES
('dept-ccec-av', 'Audio Visual & Event Staging', 'AV-STG', 'bu-ccec'),
('dept-ccec-ops', 'Conference Operations & Facilities', 'CONF-OPS', 'bu-ccec'),
('dept-ccec-sec', 'Exhibition Registration & Access', 'REG-ACC', 'bu-ccec'),
('dept-fnb-pos', 'POS Terminals & Kitchen Displays', 'KDS-POS', 'bu-fnb'),
('dept-fnb-inv', 'Beverage & Pantry Inventory Systems', 'INV-LOG', 'bu-fnb'),
('dept-fnb-rest', 'Dining Outlets & Banqueting', 'REST-OPS', 'bu-fnb'),
('dept-htl-front', 'Front Desk & Guest Reservations (PMS)', 'PMS-FD', 'bu-hotel'),
('dept-htl-hk', 'Housekeeping Mobility & Asset Tracking', 'HK-ASSET', 'bu-hotel'),
('dept-htl-net', 'Guest Room Networks & IPTV Systems', 'IPTV-NET', 'bu-hotel'),
('dept-klbs-infra', 'Building Infrastructure & Access Control', 'INFRA-ACC', 'bu-klbs'),
('dept-klbs-prop', 'Property Management & Tenant Tech', 'PROP-TECH', 'bu-klbs'),
('dept-klbs-mall', 'Retail Mall Wi-Fi & Digital Signage', 'MALL-SIGN', 'bu-klbs'),
('dept-klw-iot', 'Healthcare Smart IoT & Sensors', 'IOT-SENS', 'bu-klw'),
('dept-klw-kiosk', 'Clinical Appointment Kiosks', 'CLIN-KIOSK', 'bu-klw'),
('dept-klw-ops', 'Wellness Centre Operations', 'WELL-OPS', 'bu-klw'),
('dept-uoa-erp', 'Central ERP & SAP Finance', 'ERP-FIN', 'bu-uoahq'),
('dept-uoa-cld', 'Corporate Cloud & Data Infrastructure', 'CLD-INFRA', 'bu-uoahq'),
('dept-uoa-sec', 'Enterprise Cybersecurity & Identity', 'SEC-IAM', 'bu-uoahq')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  business_unit_id = EXCLUDED.business_unit_id;

-- Seed Initial Users (Default Password: password123)
INSERT INTO users (id, username, password_hash, full_name, email, role, business_unit_id, department_id, department, avatar_url, must_change_password) VALUES
('user-admin-01', 'admin', 'password123', 'Alex Vance (Global Administrator)', 'alex.vance@enterprise-it.internal', 'ADMIN', 'bu-uoahq', 'dept-uoa-sec', 'Enterprise Cybersecurity & Identity', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', false),
('user-it-ccec', 'it.ccec', 'password123', 'David Thorne (CCEC IT Lead)', 'david.thorne@ccec.internal', 'IT', 'bu-ccec', 'dept-ccec-av', 'Audio Visual & Event Staging', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', false),
('user-it-fnb', 'it.fnb', 'password123', 'Nadia Rostova (F&B Systems Tech)', 'nadia.rostova@fnb.internal', 'IT', 'bu-fnb', 'dept-fnb-pos', 'POS Terminals & Kitchen Displays', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', false),
('user-it-hotel', 'it.hotel', 'password123', 'Kenji Sato (Hotel IT Specialist)', 'kenji.sato@hotel.internal', 'IT', 'bu-hotel', 'dept-htl-net', 'Guest Room Networks & IPTV Systems', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', false),
('user-it-klbs', 'it.klbs', 'password123', 'Farhan Razak (KLBS IT Lead)', 'farhan.razak@klbs.internal', 'IT', 'bu-klbs', 'dept-klbs-infra', 'Building Infrastructure & Access Control', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', false),
('user-it-klw', 'it.klw', 'password123', 'Dr. Melissa Tan (KLW Systems Admin)', 'melissa.tan@klw.internal', 'IT', 'bu-klw', 'dept-klw-iot', 'Healthcare Smart IoT & Sensors', 'https://images.unsplash.com/photo-1594824813593-3d026938cb1d?w=150&auto=format&fit=crop&q=80', false),
('user-it-uoahq', 'it.uoahq', 'password123', 'Brandon Lee (HQ IT Infrastructure Lead)', 'brandon.lee@uoa.com.my', 'IT', 'bu-uoahq', 'dept-uoa-sec', 'Enterprise Cybersecurity & Identity', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80', false),
('user-ccec-staff1', 'sarah.events', 'password123', 'Sarah Jenkins', 'sarah.jenkins@ccec.internal', 'USER', 'bu-ccec', 'dept-ccec-av', 'Audio Visual & Event Staging', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80', false),
('user-ccec-staff2', 'marcus.hall', 'password123', 'Marcus Hall (First-Time User)', 'marcus.hall@ccec.internal', 'USER', 'bu-ccec', 'dept-ccec-ops', 'Conference Operations & Facilities', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80', true),
('user-fnb-staff1', 'chef.robert', 'password123', 'Chef Robert Chen', 'robert.chen@fnb.internal', 'USER', 'bu-fnb', 'dept-fnb-pos', 'POS Terminals & Kitchen Displays', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=150&auto=format&fit=crop&q=80', false),
('user-fnb-staff2', 'lisa.floor', 'password123', 'Lisa Alvarez (First-Time User)', 'lisa.alvarez@fnb.internal', 'USER', 'bu-fnb', 'dept-fnb-rest', 'Dining Outlets & Banqueting', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80', true),
('user-htl-staff1', 'elena.frontdesk', 'password123', 'Elena Gomez (First-Time User)', 'elena.gomez@hotel.internal', 'USER', 'bu-hotel', 'dept-htl-front', 'Front Desk & Guest Reservations (PMS)', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80', true),
('user-htl-staff2', 'david.concierge', 'password123', 'David Morales', 'david.morales@hotel.internal', 'USER', 'bu-hotel', 'dept-htl-hk', 'Housekeeping Mobility & Asset Tracking', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80', false),
('user-klbs-staff1', 'amira.sani', 'password123', 'Amira Sani', 'amira.sani@klbs.internal', 'USER', 'bu-klbs', 'dept-klbs-prop', 'Property Management & Tenant Tech', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', false),
('user-klbs-staff2', 'kamal.ariff', 'password123', 'Kamal Ariff (First-Time User)', 'kamal.ariff@klbs.internal', 'USER', 'bu-klbs', 'dept-klbs-mall', 'Retail Mall Wi-Fi & Digital Signage', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', true),
('user-klw-staff1', 'zack.wong', 'password123', 'Zackary Wong (First-Time User)', 'zackary.wong@klw.internal', 'USER', 'bu-klw', 'dept-klw-kiosk', 'Clinical Appointment Kiosks', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80', true),
('user-klw-staff2', 'nurse.jenny', 'password123', 'Jenny Koh', 'jenny.koh@klw.internal', 'USER', 'bu-klw', 'dept-klw-ops', 'Wellness Centre Operations', 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80', false),
('user-uoa-staff1', 'claire.ng', 'password123', 'Claire Ng (Finance Director)', 'claire.ng@uoa.com.my', 'USER', 'bu-uoahq', 'dept-uoa-erp', 'Central ERP & SAP Finance', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80', false),
('user-uoa-staff2', 'azman.hashim', 'password123', 'Azman Hashim (Legal Counsel)', 'azman.hashim@uoa.com.my', 'USER', 'bu-uoahq', 'dept-uoa-sec', 'Enterprise Cybersecurity & Identity', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80', false)
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  password_hash = EXCLUDED.password_hash,
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  business_unit_id = EXCLUDED.business_unit_id,
  department_id = EXCLUDED.department_id,
  department = EXCLUDED.department,
  avatar_url = EXCLUDED.avatar_url,
  must_change_password = EXCLUDED.must_change_password;

-- Backfill any existing users whose department name is null
UPDATE users
SET department = departments.name
FROM departments
WHERE users.department_id = departments.id
  AND (users.department IS NULL OR users.department = '');
