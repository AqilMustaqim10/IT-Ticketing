/**
 * @file seedData.ts
 * @description Master multi-business unit seed dataset including Business Units (CCEC, FNB, HOTEL, KLBS, KLW, UOA HQ),
 * departments, and pre-configured role-based users.
 */

import { BusinessUnit, Department, User, Ticket } from '../types';

// ==========================================
// 1. Business Units (CCEC, FNB, HOTEL, KLBS, KLW, UOA HQ) with Business Unit Branding
// ==========================================
export const SEED_BUSINESS_UNITS: BusinessUnit[] = [
  {
    id: 'bu-ccec',
    name: 'Convention Centre & Events Corp',
    code: 'CCEC',
    description: 'Convention halls, audio-visual staging, exhibition logistics, and large conference networking.',
    icon: 'Building2',
    themeColor: '#2563eb',
    branding: {
      logoUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=160&auto=format&fit=crop&q=80',
      portalTitle: 'CCEC Convention & Exhibition IT Portal',
      welcomeBannerTitle: 'Convention Centre Technical Services',
      welcomeBannerSubtitle: 'Rapid technical support for audio-visual staging, high-density keynote Wi-Fi, and booth networking.',
      bannerAnnouncement: '📢 Notice: Main Auditorium Optical Matrix switch firmware upgrade scheduled for 11:00 PM.',
      primaryColor: '#2563eb',
      accentColor: '#4f46e5',
      accentGradient: 'from-blue-700 via-indigo-700 to-slate-900',
      bannerTheme: 'blue',
      supportHotline: '+1 (555) 019-4001 (Command Desk)',
      supportEmail: 'av-support@ccec.internal',
      deskLocation: 'Exhibition Hall 1 • IT Operations Room 204',
    },
  },
  {
    id: 'bu-fnb',
    name: 'Food & Beverage Division',
    code: 'FNB',
    description: 'Restaurant point-of-sale terminals, kitchen display systems, cellar inventory, and dining POS.',
    icon: 'Utensils',
    themeColor: '#d97706',
    branding: {
      logoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=160&auto=format&fit=crop&q=80',
      portalTitle: 'F&B Hospitality Systems & POS Helpdesk',
      welcomeBannerTitle: 'Food & Beverage Operations Support',
      welcomeBannerSubtitle: 'Immediate assistance for point-of-sale terminals, kitchen displays (KDS), and cellar inventory sensors.',
      bannerAnnouncement: '⚡ Priority: Dinner rush live support on standby for dining outlets and banqueting bars.',
      primaryColor: '#d97706',
      accentColor: '#ea580c',
      accentGradient: 'from-amber-600 via-orange-600 to-stone-900',
      bannerTheme: 'amber',
      supportHotline: '+1 (555) 019-5002 (KDS Hotline)',
      supportEmail: 'pos-help@fnb.internal',
      deskLocation: 'Culinary Central Hub • Office 108',
    },
  },
  {
    id: 'bu-hotel',
    name: 'Luxury Hotel & Resort Operations',
    code: 'HOTEL',
    description: 'Guest PMS, RFID keycard management, in-room smart amenities, IPTV, and concierge infrastructure.',
    icon: 'Hotel',
    themeColor: '#0d9488',
    branding: {
      logoUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=160&auto=format&fit=crop&q=80',
      portalTitle: 'Grand Resort & Hotel IT Concierge',
      welcomeBannerTitle: 'Luxury Hotel & Resort IT Service Desk',
      welcomeBannerSubtitle: 'Ensuring 5-star guest satisfaction across PMS reservations, RFID keycards, in-room IPTV, and guest Wi-Fi.',
      bannerAnnouncement: '🛎️ Note: High VIP check-in window between 2:00 PM - 5:00 PM. Front desk encoders prioritized.',
      primaryColor: '#0d9488',
      accentColor: '#059669',
      accentGradient: 'from-teal-700 via-emerald-700 to-slate-900',
      bannerTheme: 'teal',
      supportHotline: '+1 (555) 019-6003 (Front Desk Support)',
      supportEmail: 'guest-tech@hotel.internal',
      deskLocation: 'Hotel Lobby Level • Concierge Tech Suite B',
    },
  },
  {
    id: 'bu-klbs',
    name: 'KL Gateway & Bangsar South',
    code: 'KLBS',
    description: 'Commercial office towers, retail mall connectivity, high-speed fiber links, and smart property infrastructure.',
    icon: 'Building2',
    themeColor: '#0284c7',
    branding: {
      logoUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=160&auto=format&fit=crop&q=80',
      portalTitle: 'KLBS Bangsar South IT Helpdesk',
      welcomeBannerTitle: 'KLBS Commercial & Retail Tech Services',
      welcomeBannerSubtitle: 'High-availability corporate broadband, tenant network integration, and smart office infrastructure across Bangsar South.',
      bannerAnnouncement: '📶 Redundant 10Gbps backbone link maintenance completed successfully at Bangsar South.',
      primaryColor: '#0284c7',
      accentColor: '#0369a1',
      accentGradient: 'from-sky-700 via-blue-800 to-slate-900',
      bannerTheme: 'sky',
      supportHotline: '+60 3-2242 8000 (KLBS IT Operations)',
      supportEmail: 'it-support@klbs.internal',
      deskLocation: 'Tower 3, Level 5 • KLBS IT Operations Hub',
    },
  },
  {
    id: 'bu-klw',
    name: 'KL West Operations',
    code: 'KLW',
    description: 'Healthcare suites, wellness centres, smart medical IoT, patient kiosks, and clinical portal infrastructure.',
    icon: 'Activity',
    themeColor: '#059669',
    branding: {
      logoUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=160&auto=format&fit=crop&q=80',
      portalTitle: 'KLW Integrated Healthcare & IT Desk',
      welcomeBannerTitle: 'KLW Health & Operations IT Services',
      welcomeBannerSubtitle: 'Mission-critical IoT monitoring, clinical appointment kiosks, secure patient record systems, and wellness suites.',
      bannerAnnouncement: '🛡️ Compliance: Clinical portal data backup snapshot and telemetry sensors verified.',
      primaryColor: '#059669',
      accentColor: '#047857',
      accentGradient: 'from-emerald-700 via-teal-800 to-slate-900',
      bannerTheme: 'emerald',
      supportHotline: '+60 3-7988 9001 (KLW Tech Desk)',
      supportEmail: 'tech-desk@klw.internal',
      deskLocation: 'Medical Wing B • Level 2 Helpdesk',
    },
  },
  {
    id: 'bu-uoahq',
    name: 'UOA Corporate Headquarters',
    code: 'UOA HQ',
    description: 'Group executive management, central ERP financials, enterprise cloud infrastructure, and boardrooms.',
    icon: 'Building2',
    themeColor: '#7c3aed',
    branding: {
      logoUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=160&auto=format&fit=crop&q=80',
      portalTitle: 'UOA Corporate Headquarters IT Services',
      welcomeBannerTitle: 'UOA Corporate Executive IT Helpdesk',
      welcomeBannerSubtitle: 'Executive boardrooms, SAP/ERP financials, corporate cloud security, identity governance, and group systems.',
      bannerAnnouncement: '🔐 Notice: Executive Boardroom Telepresence and Cisco Webex Room Kit firmware updated.',
      primaryColor: '#7c3aed',
      accentColor: '#6d28d9',
      accentGradient: 'from-purple-700 via-indigo-800 to-slate-900',
      bannerTheme: 'purple',
      supportHotline: '+60 3-2282 9999 (Executive Helpdesk)',
      supportEmail: 'hq-it@uoa.com.my',
      deskLocation: 'UOA Corporate Tower • Level 38 Executive Suite',
    },
  },
];

// ==========================================
// 2. Departments by Business Unit
// ==========================================
export const SEED_DEPARTMENTS: Department[] = [
  // CCEC Departments
  {
    id: 'dept-ccec-av',
    name: 'Audio Visual & Event Staging',
    code: 'AV-STG',
    businessUnitId: 'bu-ccec',
  },
  {
    id: 'dept-ccec-ops',
    name: 'Conference Operations & Facilities',
    code: 'CONF-OPS',
    businessUnitId: 'bu-ccec',
  },
  {
    id: 'dept-ccec-sec',
    name: 'Exhibition Registration & Access',
    code: 'REG-ACC',
    businessUnitId: 'bu-ccec',
  },

  // FNB Departments
  {
    id: 'dept-fnb-pos',
    name: 'POS Terminals & Kitchen Displays',
    code: 'KDS-POS',
    businessUnitId: 'bu-fnb',
  },
  {
    id: 'dept-fnb-inv',
    name: 'Beverage & Pantry Inventory Systems',
    code: 'INV-LOG',
    businessUnitId: 'bu-fnb',
  },
  {
    id: 'dept-fnb-rest',
    name: 'Dining Outlets & Banqueting',
    code: 'REST-OPS',
    businessUnitId: 'bu-fnb',
  },

  // HOTEL Departments
  {
    id: 'dept-htl-front',
    name: 'Front Desk & Guest Reservations (PMS)',
    code: 'PMS-FD',
    businessUnitId: 'bu-hotel',
  },
  {
    id: 'dept-htl-hk',
    name: 'Housekeeping Mobility & Asset Tracking',
    code: 'HK-MOB',
    businessUnitId: 'bu-hotel',
  },
  {
    id: 'dept-htl-net',
    name: 'Guest High-Speed Wi-Fi & Smart IPTV',
    code: 'GUEST-NET',
    businessUnitId: 'bu-hotel',
  },

  // KLBS Departments
  {
    id: 'dept-klbs-infra',
    name: 'Corporate Network & Fiber Infrastructure',
    code: 'NET-FIBER',
    businessUnitId: 'bu-klbs',
  },
  {
    id: 'dept-klbs-prop',
    name: 'Commercial Property & Smart Facilities',
    code: 'PROP-FAC',
    businessUnitId: 'bu-klbs',
  },
  {
    id: 'dept-klbs-mall',
    name: 'Retail Mall Tech & Directory Kiosks',
    code: 'MALL-TECH',
    businessUnitId: 'bu-klbs',
  },

  // KLW Departments
  {
    id: 'dept-klw-iot',
    name: 'Clinical IoT & Biomedical Systems',
    code: 'MED-IOT',
    businessUnitId: 'bu-klw',
  },
  {
    id: 'dept-klw-kiosk',
    name: 'Patient Check-In & Smart Registration',
    code: 'REG-KIOSK',
    businessUnitId: 'bu-klw',
  },
  {
    id: 'dept-klw-ops',
    name: 'Healthcare Facilities & Telemetry',
    code: 'HLTH-OPS',
    businessUnitId: 'bu-klw',
  },

  // UOA HQ Departments
  {
    id: 'dept-uoa-erp',
    name: 'Enterprise ERP & Financial Systems',
    code: 'ERP-FIN',
    businessUnitId: 'bu-uoahq',
  },
  {
    id: 'dept-uoa-exec',
    name: 'Executive Boardroom & Telepresence',
    code: 'EXEC-AV',
    businessUnitId: 'bu-uoahq',
  },
  {
    id: 'dept-uoa-sec',
    name: 'Cybersecurity & Corporate Governance',
    code: 'SEC-GOV',
    businessUnitId: 'bu-uoahq',
  },
];

// ==========================================
// 3. User Seed Accounts (ADMIN, IT, USER)
// ==========================================
export const SEED_USERS: User[] = [
  // Global Administrator
  {
    id: 'user-admin-01',
    username: 'admin',
    password: 'password123',
    fullName: 'Alex Vance (Global Administrator)',
    email: 'alex.vance@enterprise-it.internal',
    role: 'ADMIN',
    businessUnitId: 'bu-ccec', // Global scope allows viewing all BUs
    departmentId: 'dept-ccec-ops',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    mustChangePassword: false,
    createdAt: '2026-01-01T08:00:00.000Z',
  },

  // CCEC IT Support
  {
    id: 'user-it-ccec',
    username: 'it.ccec',
    password: 'password123',
    fullName: 'David Thorne (CCEC IT Lead)',
    email: 'david.thorne@ccec.internal',
    role: 'IT',
    businessUnitId: 'bu-ccec',
    departmentId: 'dept-ccec-av',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    mustChangePassword: false,
    createdAt: '2026-01-05T09:00:00.000Z',
  },

  // FNB IT Support
  {
    id: 'user-it-fnb',
    username: 'it.fnb',
    password: 'password123',
    fullName: 'Nadia Rostova (F&B Systems Tech)',
    email: 'nadia.rostova@fnb.internal',
    role: 'IT',
    businessUnitId: 'bu-fnb',
    departmentId: 'dept-fnb-pos',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    mustChangePassword: false,
    createdAt: '2026-01-08T09:00:00.000Z',
  },

  // HOTEL IT Support
  {
    id: 'user-it-hotel',
    username: 'it.hotel',
    password: 'password123',
    fullName: 'Kenji Sato (Hotel IT Specialist)',
    email: 'kenji.sato@hotel.internal',
    role: 'IT',
    businessUnitId: 'bu-hotel',
    departmentId: 'dept-htl-net',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    mustChangePassword: false,
    createdAt: '2026-01-10T09:00:00.000Z',
  },

  // KLBS IT Support
  {
    id: 'user-it-klbs',
    username: 'it.klbs',
    password: 'password123',
    fullName: 'Farhan Razak (KLBS IT Lead)',
    email: 'farhan.razak@klbs.internal',
    role: 'IT',
    businessUnitId: 'bu-klbs',
    departmentId: 'dept-klbs-infra',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    mustChangePassword: false,
    createdAt: '2026-01-12T09:00:00.000Z',
  },

  // KLW IT Support
  {
    id: 'user-it-klw',
    username: 'it.klw',
    password: 'password123',
    fullName: 'Dr. Melissa Tan (KLW Systems Admin)',
    email: 'melissa.tan@klw.internal',
    role: 'IT',
    businessUnitId: 'bu-klw',
    departmentId: 'dept-klw-iot',
    avatarUrl: 'https://images.unsplash.com/photo-1594824813593-3d026938cb1d?w=150&auto=format&fit=crop&q=80',
    mustChangePassword: false,
    createdAt: '2026-01-14T09:00:00.000Z',
  },

  // UOA HQ IT Support
  {
    id: 'user-it-uoahq',
    username: 'it.uoahq',
    password: 'password123',
    fullName: 'Brandon Lee (HQ IT Infrastructure Lead)',
    email: 'brandon.lee@uoa.com.my',
    role: 'IT',
    businessUnitId: 'bu-uoahq',
    departmentId: 'dept-uoa-sec',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    mustChangePassword: false,
    createdAt: '2026-01-02T08:30:00.000Z',
  },

  // CCEC Staff Users
  {
    id: 'user-ccec-staff1',
    username: 'sarah.events',
    password: 'password123',
    fullName: 'Sarah Jenkins',
    email: 'sarah.jenkins@ccec.internal',
    role: 'USER',
    businessUnitId: 'bu-ccec',
    departmentId: 'dept-ccec-av',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    mustChangePassword: false,
    createdAt: '2026-01-15T10:00:00.000Z',
  },
  {
    id: 'user-ccec-staff2',
    username: 'marcus.hall',
    password: 'password123',
    fullName: 'Marcus Hall (First-Time User)',
    email: 'marcus.hall@ccec.internal',
    role: 'USER',
    businessUnitId: 'bu-ccec',
    departmentId: 'dept-ccec-ops',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    mustChangePassword: true, // First-time user pending password change
    createdAt: '2026-01-20T10:00:00.000Z',
  },

  // FNB Staff Users
  {
    id: 'user-fnb-staff1',
    username: 'chef.robert',
    password: 'password123',
    fullName: 'Chef Robert Chen',
    email: 'robert.chen@fnb.internal',
    role: 'USER',
    businessUnitId: 'bu-fnb',
    departmentId: 'dept-fnb-pos',
    avatarUrl: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=150&auto=format&fit=crop&q=80',
    mustChangePassword: false,
    createdAt: '2026-02-01T11:00:00.000Z',
  },
  {
    id: 'user-fnb-staff2',
    username: 'lisa.floor',
    password: 'password123',
    fullName: 'Lisa Alvarez (First-Time User)',
    email: 'lisa.alvarez@fnb.internal',
    role: 'USER',
    businessUnitId: 'bu-fnb',
    departmentId: 'dept-fnb-rest',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    mustChangePassword: true, // First-time user pending password change
    createdAt: '2026-02-05T11:00:00.000Z',
  },

  // HOTEL Staff Users
  {
    id: 'user-htl-staff1',
    username: 'elena.frontdesk',
    password: 'password123',
    fullName: 'Elena Gomez (First-Time User)',
    email: 'elena.gomez@hotel.internal',
    role: 'USER',
    businessUnitId: 'bu-hotel',
    departmentId: 'dept-htl-front',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    mustChangePassword: true, // First-time user pending password change
    createdAt: '2026-02-10T12:00:00.000Z',
  },
  {
    id: 'user-htl-staff2',
    username: 'david.concierge',
    password: 'password123',
    fullName: 'David Morales',
    email: 'david.morales@hotel.internal',
    role: 'USER',
    businessUnitId: 'bu-hotel',
    departmentId: 'dept-htl-hk',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    mustChangePassword: false,
    createdAt: '2026-02-12T12:00:00.000Z',
  },

  // KLBS Staff Users
  {
    id: 'user-klbs-staff1',
    username: 'amira.sani',
    password: 'password123',
    fullName: 'Amira Sani',
    email: 'amira.sani@klbs.internal',
    role: 'USER',
    businessUnitId: 'bu-klbs',
    departmentId: 'dept-klbs-prop',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    mustChangePassword: false,
    createdAt: '2026-02-14T10:00:00.000Z',
  },
  {
    id: 'user-klbs-staff2',
    username: 'kamal.ariff',
    password: 'password123',
    fullName: 'Kamal Ariff (First-Time User)',
    email: 'kamal.ariff@klbs.internal',
    role: 'USER',
    businessUnitId: 'bu-klbs',
    departmentId: 'dept-klbs-mall',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    mustChangePassword: true, // First-time user pending password change
    createdAt: '2026-02-16T10:00:00.000Z',
  },

  // KLW Staff Users
  {
    id: 'user-klw-staff1',
    username: 'zack.wong',
    password: 'password123',
    fullName: 'Zackary Wong (First-Time User)',
    email: 'zackary.wong@klw.internal',
    role: 'USER',
    businessUnitId: 'bu-klw',
    departmentId: 'dept-klw-kiosk',
    avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    mustChangePassword: true, // First-time user pending password change
    createdAt: '2026-02-18T11:00:00.000Z',
  },
  {
    id: 'user-klw-staff2',
    username: 'nurse.jenny',
    password: 'password123',
    fullName: 'Jenny Koh',
    email: 'jenny.koh@klw.internal',
    role: 'USER',
    businessUnitId: 'bu-klw',
    departmentId: 'dept-klw-ops',
    avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80',
    mustChangePassword: false,
    createdAt: '2026-02-19T11:00:00.000Z',
  },

  // UOA HQ Staff Users
  {
    id: 'user-uoa-staff1',
    username: 'claire.ng',
    password: 'password123',
    fullName: 'Claire Ng (Finance Director)',
    email: 'claire.ng@uoa.com.my',
    role: 'USER',
    businessUnitId: 'bu-uoahq',
    departmentId: 'dept-uoa-erp',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    mustChangePassword: false,
    createdAt: '2026-02-01T09:00:00.000Z',
  },
  {
    id: 'user-uoa-staff2',
    username: 'azman.hashim',
    password: 'password123',
    fullName: 'Azman Hashim (Legal Counsel)',
    email: 'azman.hashim@uoa.com.my',
    role: 'USER',
    businessUnitId: 'bu-uoahq',
    departmentId: 'dept-uoa-sec',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    mustChangePassword: false,
    createdAt: '2026-02-03T09:00:00.000Z',
  },
];

// ==========================================
// 4. Initial Seed Tickets Across Units (Empty by default)
// ==========================================
export const SEED_TICKETS: Ticket[] = [];
