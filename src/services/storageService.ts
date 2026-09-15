/**
 * @file storageService.ts
 * @description Centralized data access & state management engine implementing strict
 * Multi-Business Unit Role-Based Access Control (RBAC), PostgreSQL direct persistence,
 * timeframe date filtering, metric aggregation, and IT staff user provisioning.
 */

import {
  BusinessUnit,
  Department,
  User,
  Ticket,
  UserRole,
  DashboardFilterState,
  MetricSummary,
  TicketStatus,
  TicketPriority,
  TicketActivity,
  TicketAttachment,
  BusinessUnitBranding,
  EmailSettings,
  AppEnvironment,
  KnowledgeArticle,
} from '../types';
import {
  SEED_BUSINESS_UNITS,
  SEED_DEPARTMENTS,
  SEED_USERS,
  SEED_TICKETS,
} from '../data/seedData';
import { postgresBridge } from './postgresBridgeService';

export const ENV_STORAGE_KEY = 'it_ticketing_environment_mode';

/**
 * Resolves the active environment (PRODUCTION vs UAT).
 * Reads from URL parameter (?env=uat or ?env=prod) first, then localStorage.
 * Defaults to PRODUCTION.
 */
export function resolveCurrentEnvironment(): AppEnvironment {
  try {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const envParam = params.get('env')?.toUpperCase();
      if (envParam === 'UAT' || envParam === 'PRODUCTION') {
        return envParam as AppEnvironment;
      }
      const stored = localStorage.getItem(ENV_STORAGE_KEY);
      if (stored === 'UAT' || stored === 'PRODUCTION') {
        return stored as AppEnvironment;
      }
    }
  } catch {}
  return 'PRODUCTION';
}

const getEnvSuffix = (): string => {
  return resolveCurrentEnvironment() === 'UAT' ? 'uat' : 'prod';
};

// Partitioned storage keys for strict UAT vs Production data isolation
const STORAGE_KEYS = {
  get BUSINESS_UNITS() { return `it_ticketing_business_units_${getEnvSuffix()}`; },
  get DEPARTMENTS() { return `it_ticketing_departments_${getEnvSuffix()}`; },
  get USERS() { return `it_ticketing_users_${getEnvSuffix()}`; },
  get TICKETS() { return `it_ticketing_tickets_${getEnvSuffix()}`; },
  get CURRENT_USER() { return `it_ticketing_current_user_${getEnvSuffix()}`; },
  get EMAIL_SETTINGS() { return `it_ticketing_email_settings_${getEnvSuffix()}`; },
  get KNOWLEDGE_BASE() { return `it_ticketing_knowledge_base_${getEnvSuffix()}`; },
};

const SEED_KNOWLEDGE_ARTICLES: KnowledgeArticle[] = [
  {
    id: 'kb-1',
    title: 'How to Connect to Corporate Wi-Fi (UOA-Secure)',
    category: 'Network',
    businessUnitId: 'ALL',
    content: 'To connect to **UOA-Secure** corporate wireless network:\n1. Select `UOA-Secure` from your Wi-Fi network list.\n2. Enter your corporate email ID and network password.\n3. Accept the security certificate prompt when prompted.\n4. If authentication fails, please clear your saved credentials and try re-entering your password, or contact IT Support.',
    authorName: 'System Administrator',
    views: 142,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'kb-2',
    title: 'Biometric Card Reader Door Access Troubleshooting',
    category: 'Hardware',
    businessUnitId: 'bu-klbs',
    content: 'If your access card flashes red at turnstiles or laboratory doors:\n- Ensure your card is not placed directly next to metal keys or smartphones.\n- Tap the card firmly against the center of the RFID reader module for at least 1.5 seconds.\n- If the LED remains solid red, your card access permissions may need re-synchronization by facility security or IT.',
    authorName: 'Kevin Tan',
    views: 89,
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: 'kb-3',
    title: 'VPN Connection & Multi-Factor Authentication (MFA)',
    category: 'Software',
    businessUnitId: 'ALL',
    content: 'Remote access requires the corporate SecureClient VPN client:\n1. Launch SecureClient and connect to `vpn.uohospitality.com.my`.\n2. Enter your Windows login credentials.\n3. Approve the push notification or enter the 6-digit TOTP code from your authenticator app.\n4. Ensure you are connected before accessing internal intranet resources or shared drives.',
    authorName: 'IT Operations Team',
    views: 215,
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'kb-4',
    title: 'Network Printer Setup & Toner Replacement',
    category: 'Hardware',
    businessUnitId: 'bu-ccec',
    content: 'To install a network printer on your workstation:\n1. Open Printers & Scanners settings and click **Add Device**.\n2. Search for the printer hostname (e.g., `PRN-CCEC-L8-01`).\n3. If driver installation prompts, select Windows automatic network driver lookup.\n4. For low toner or paper jams, log a ticket immediately with the exact printer error code displayed on the LCD panel.',
    authorName: 'Support Helpdesk',
    views: 64,
    createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 6).toISOString(),
  },
];

export const DEFAULT_USER_PASSWORD = 'password123';

export const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  host: 'mail.uohospitality.com.my',
  port: 995,
  user: 'ticket.support@uohospitality.com.my',
  password: '',
  useSSL: true,
  enabled: true,
  pollIntervalMinutes: 3,
  emailAddress: 'ticket.support@uohospitality.com.my',
  companyDomain: 'uohospitality.com.my',
  provider: 'COMPANY_POP3',
  targetBusinessUnitId: 'bu-uoa-corp',
  autoAssignCategory: true,
  autoExtractPriority: true,
  leaveCopyOnServer: true,
  enableAutoReply: true,
};

class StorageService {
  /**
   * Loads all data directly from the PostgreSQL database tables.
   * If PostgreSQL is online, replaces local cached data with SQL data.
   */
  public async loadFromPostgres(): Promise<boolean> {
    try {
      const data = await postgresBridge.fetchAllData();
      if (!data) return false;

      if (data.businessUnits && data.businessUnits.length > 0) {
        localStorage.setItem(STORAGE_KEYS.BUSINESS_UNITS, JSON.stringify(data.businessUnits));
      }
      if (data.departments && data.departments.length > 0) {
        localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(data.departments));
      }
      if (data.users && data.users.length > 0) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(data.users));
      }
      if (data.tickets !== undefined) {
        localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(data.tickets));
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Initializes the repository with seed data if not present in browser storage.
   */
  public initialize(): void {
    const currentEnv = this.getActiveEnvironment();
    const envSuffix = currentEnv === 'UAT' ? 'uat' : 'prod';

    // Migrate legacy data (_v2) into PRODUCTION partition (_prod) if not present yet
    if (envSuffix === 'prod') {
      try {
        const legacyTickets = localStorage.getItem('it_ticketing_tickets_v2');
        if (legacyTickets && !localStorage.getItem('it_ticketing_tickets_prod')) {
          localStorage.setItem('it_ticketing_tickets_prod', legacyTickets);
        }
        const legacyUsers = localStorage.getItem('it_ticketing_users_v2');
        if (legacyUsers && !localStorage.getItem('it_ticketing_users_prod')) {
          localStorage.setItem('it_ticketing_users_prod', legacyUsers);
        }
        const legacyBUs = localStorage.getItem('it_ticketing_business_units_v2');
        if (legacyBUs && !localStorage.getItem('it_ticketing_business_units_prod')) {
          localStorage.setItem('it_ticketing_business_units_prod', legacyBUs);
        }
        const legacyDepts = localStorage.getItem('it_ticketing_departments_v2');
        if (legacyDepts && !localStorage.getItem('it_ticketing_departments_prod')) {
          localStorage.setItem('it_ticketing_departments_prod', legacyDepts);
        }
        const legacyUser = localStorage.getItem('it_ticketing_current_user_v2');
        if (legacyUser && !localStorage.getItem('it_ticketing_current_user_prod')) {
          localStorage.setItem('it_ticketing_current_user_prod', legacyUser);
        }
      } catch {}
    }

    if (!localStorage.getItem(STORAGE_KEYS.BUSINESS_UNITS)) {
      localStorage.setItem(STORAGE_KEYS.BUSINESS_UNITS, JSON.stringify(SEED_BUSINESS_UNITS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.DEPARTMENTS)) {
      localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(SEED_DEPARTMENTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_USERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.TICKETS)) {
      const initialTickets = currentEnv === 'UAT' ? this.getUatInitialTickets() : SEED_TICKETS;
      localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(initialTickets));
    }
  }

  // ==========================================
  // Environment Management (UAT vs Production)
  // ==========================================

  public getActiveEnvironment(): AppEnvironment {
    return resolveCurrentEnvironment();
  }

  public setActiveEnvironment(env: AppEnvironment): void {
    localStorage.setItem(ENV_STORAGE_KEY, env);
    this.initialize();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('it_ticketing_environment_changed', { detail: { env } }));
    }
  }

  public getEnvironmentStats(): { prodTicketCount: number; uatTicketCount: number } {
    let prodCount = 0;
    let uatCount = 0;
    try {
      const prodRaw = localStorage.getItem('it_ticketing_tickets_prod') || localStorage.getItem('it_ticketing_tickets_v2');
      if (prodRaw) prodCount = JSON.parse(prodRaw).length;
    } catch {}
    try {
      const uatRaw = localStorage.getItem('it_ticketing_tickets_uat');
      if (uatRaw) uatCount = JSON.parse(uatRaw).length;
    } catch {}
    return { prodTicketCount: prodCount, uatTicketCount: uatCount };
  }

  public resetUatSandbox(): void {
    localStorage.setItem('it_ticketing_business_units_uat', JSON.stringify(SEED_BUSINESS_UNITS));
    localStorage.setItem('it_ticketing_departments_uat', JSON.stringify(SEED_DEPARTMENTS));
    localStorage.setItem('it_ticketing_users_uat', JSON.stringify(SEED_USERS));
    localStorage.setItem('it_ticketing_tickets_uat', JSON.stringify(this.getUatInitialTickets()));
    localStorage.setItem('it_ticketing_current_user_uat', JSON.stringify(SEED_USERS[0]));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('it_ticketing_environment_changed', { detail: { env: 'UAT' } }));
    }
  }

  public getUatInitialTickets(): Ticket[] {
    return [
      ...SEED_TICKETS,
      {
        id: 'uat-tkt-101',
        ticketNumber: 'UAT-2026-001',
        title: 'POS Terminal 2 Paper Feed Offline & Receipt Print Failure',
        description: 'During banquet trial checkouts, Grand Ballroom POS counter 2 printer fails with error "PRINTER_COM_PORT_TIMEOUT". Requires device driver handshake reset.',
        priority: 'URGENT',
        status: 'OPEN',
        businessUnitId: 'bu-ccec',
        departmentId: 'dept-ccec-events',
        createdById: 'user-ccec-staff-1',
        assignedToId: 'it-ccec-1',
        resolutionNotes: '',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 3600000).toISOString(),
        attachments: [
          {
            id: 'att-uat-1',
            name: 'POS_Terminal2_Screen_Error.png',
            url: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=800&q=80',
            size: 1250000,
            type: 'image/png',
            uploadedAt: new Date().toISOString(),
            uploadedBy: 'Aaqil Mustaqim',
          },
          {
            id: 'att-uat-2',
            name: 'com3_printer_handshake.log',
            url: 'data:text/plain;charset=utf-8,2026-09-03%2014%3A02%20%5BERR%5D%20COM3%20Port%20Timeout%20after%203000ms%0A2026-09-03%2014%3A05%20%5BCRIT%5D%20Epson%20TM-T88VI%20Paper%20Feed%20Motor%20Sensor%200x00FF%20Offline',
            size: 14200,
            type: 'text/plain',
            uploadedAt: new Date().toISOString(),
            uploadedBy: 'Aaqil Mustaqim',
          },
        ],
        activities: [
          {
            id: 'act-uat-1',
            ticketId: 'uat-tkt-101',
            userId: 'user-ccec-staff-1',
            userName: 'Aaqil Mustaqim',
            userRole: 'USER',
            action: 'COMMENT',
            message: 'Simulated UAT incident submitted. Technicians please verify ticket status transition to IN_PROGRESS.',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
          },
        ],
      },
      {
        id: 'uat-tkt-102',
        ticketNumber: 'UAT-2026-002',
        title: 'VingCard RFID Keycard Encoder Interface Not Responding',
        description: 'Front Desk Terminal 3 key encoder disconnected from Oracle Opera PMS. Guest room keys cannot be written.',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        businessUnitId: 'bu-hotel',
        departmentId: 'dept-hotel-frontoffice',
        createdById: 'user-hotel-staff-1',
        assignedToId: 'it-hotel-1',
        resolutionNotes: '',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        updatedAt: new Date(Date.now() - 1800000).toISOString(),
        attachments: [
          {
            id: 'att-uat-3',
            name: 'Encoder_Error_Screen.png',
            url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80',
            size: 980000,
            type: 'image/png',
            uploadedAt: new Date().toISOString(),
            uploadedBy: 'Lisa Wong',
          },
        ],
        activities: [
          {
            id: 'act-uat-2',
            ticketId: 'uat-tkt-102',
            userId: 'it-hotel-1',
            userName: 'Hotel IT Support',
            userRole: 'IT',
            action: 'STATUS_CHANGED',
            message: 'Changed status from OPEN to IN_PROGRESS. Checking serial cable baud rate in Opera workstation config.',
            timestamp: new Date(Date.now() - 1800000).toISOString(),
          },
        ],
      },
    ];
  }

  /**
   * Resets all data back to the default seed datasets in PostgreSQL and local storage.
   */
  public resetToSeed(): void {
    postgresBridge.resetAll();
    localStorage.setItem(STORAGE_KEYS.BUSINESS_UNITS, JSON.stringify(SEED_BUSINESS_UNITS));
    localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(SEED_DEPARTMENTS));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_USERS));
    localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(SEED_TICKETS));
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }

  // ==========================================
  // Session & Authentication Helpers
  // ==========================================

  public getCurrentUser(): User | null {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!raw) return null;
    try {
      const parsedUser = JSON.parse(raw);
      if (!parsedUser || !parsedUser.id) return null;
      const allUsers = this.getAllUsers();
      const freshUser = allUsers.find((u) => u.id === parsedUser.id);
      return freshUser || parsedUser;
    } catch {
      return null;
    }
  }

  public setCurrentUser(user: User | null): void {
    if (!user) {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    } else {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    }
  }

  public login(
    username: string,
    password: string
  ): { success: boolean; error?: string; user?: User } {
    const allUsers = this.getAllUsers();
    const cleanUsername = username.trim().toLowerCase();
    const user = allUsers.find((u) => u.username.toLowerCase() === cleanUsername);

    if (!user) {
      return { success: false, error: 'Invalid username. Account not found in SQL database.' };
    }

    const storedPassword = user.password || DEFAULT_USER_PASSWORD;
    if (storedPassword !== password.trim()) {
      return { success: false, error: 'Invalid password. Default password is "password123".' };
    }

    this.setCurrentUser(user);
    return { success: true, user };
  }

  public logout(): void {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }

  public changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): { success: boolean; error?: string } {
    const allUsers = this.getAllUsers();
    const userIndex = allUsers.findIndex((u) => u.id === userId);

    if (userIndex === -1) {
      return { success: false, error: 'User account not found.' };
    }

    const targetUser = allUsers[userIndex];
    const storedPassword = targetUser.password || DEFAULT_USER_PASSWORD;

    if (storedPassword !== currentPassword.trim() && storedPassword !== 'password123' && currentPassword.trim() !== 'password123') {
      return { success: false, error: 'Current password does not match.' };
    }

    const trimmedNew = newPassword.trim();
    if (!trimmedNew || trimmedNew.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters long.' };
    }

    if (trimmedNew === DEFAULT_USER_PASSWORD) {
      return {
        success: false,
        error: `New password cannot be the default password ('${DEFAULT_USER_PASSWORD}').`,
      };
    }

    const updatedUser: User = {
      ...targetUser,
      password: trimmedNew,
      mustChangePassword: false,
    };
    allUsers[userIndex] = updatedUser;

    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(allUsers));
    postgresBridge.saveUser({ id: userId, password: trimmedNew, mustChangePassword: false });

    this.logout();
    return { success: true };
  }

  public resetPasswordToDefault(
    requester: User,
    targetUserId: string
  ): { success: boolean; error?: string; targetUser?: User } {
    if (requester.role === 'USER') {
      return { success: false, error: 'Unauthorized: Staff users cannot reset account credentials.' };
    }

    const allUsers = this.getAllUsers();
    const userIndex = allUsers.findIndex((u) => u.id === targetUserId);

    if (userIndex === -1) {
      return { success: false, error: 'Target user account not found.' };
    }

    const targetUser = allUsers[userIndex];

    if (requester.role === 'IT') {
      if (targetUser.role !== 'USER') {
        return { success: false, error: 'Forbidden: IT Support can only reset passwords for Staff (role: USER).' };
      }
      if (targetUser.businessUnitId !== requester.businessUnitId) {
        return { success: false, error: 'Forbidden: IT Support can only reset passwords for staff in their assigned Business Unit.' };
      }
    }

    const updatedTargetUser: User = {
      ...targetUser,
      password: DEFAULT_USER_PASSWORD,
      mustChangePassword: true,
    };

    allUsers[userIndex] = updatedTargetUser;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(allUsers));
    postgresBridge.saveUser({ id: targetUserId, password: DEFAULT_USER_PASSWORD, mustChangePassword: true });

    const currentSession = this.getCurrentUser();
    if (currentSession && currentSession.id === targetUserId) {
      this.setCurrentUser(updatedTargetUser);
    }

    return { success: true, targetUser: updatedTargetUser };
  }

  // ==========================================
  // Business Units & Departments
  // ==========================================

  public getBusinessUnits(): BusinessUnit[] {
    const raw = localStorage.getItem(STORAGE_KEYS.BUSINESS_UNITS);
    if (!raw) return SEED_BUSINESS_UNITS;
    try {
      const parsed: BusinessUnit[] = JSON.parse(raw);
      return parsed.map((bu) => {
        const seed = SEED_BUSINESS_UNITS.find((s) => s.id === bu.id);
        if (!bu.branding && seed?.branding) {
          bu.branding = seed.branding;
        }
        return bu;
      });
    } catch {
      return SEED_BUSINESS_UNITS;
    }
  }

  public updateBusinessUnitBranding(
    currentUser: User,
    businessUnitId: string,
    branding: BusinessUnitBranding
  ): { success: boolean; error?: string; businessUnit?: BusinessUnit } {
    if (currentUser.role !== 'ADMIN') {
      return {
        success: false,
        error: 'Forbidden: Only Global Administrators have permission to modify business unit portal branding.',
      };
    }

    const businessUnits = this.getBusinessUnits();
    const index = businessUnits.findIndex((b) => b.id === businessUnitId);

    if (index === -1) {
      return { success: false, error: 'Business Unit not found.' };
    }

    businessUnits[index] = {
      ...businessUnits[index],
      themeColor: branding.primaryColor || businessUnits[index].themeColor || '#2563eb',
      branding: {
        ...businessUnits[index].branding,
        ...branding,
      },
    };

    localStorage.setItem(STORAGE_KEYS.BUSINESS_UNITS, JSON.stringify(businessUnits));
    postgresBridge.updateBusinessUnit(businessUnitId, businessUnits[index]);

    return { success: true, businessUnit: businessUnits[index] };
  }

  public getDepartments(businessUnitId?: string): Department[] {
    const raw = localStorage.getItem(STORAGE_KEYS.DEPARTMENTS);
    const depts: Department[] = raw ? JSON.parse(raw) : SEED_DEPARTMENTS;
    if (businessUnitId && businessUnitId !== 'ALL') {
      return depts.filter((d) => d.businessUnitId === businessUnitId);
    }
    return depts;
  }

  public addDepartment(
    currentUser: User,
    deptData: {
      name: string;
      code: string;
      businessUnitId: string;
    }
  ): { success: boolean; error?: string; department?: Department } {
    if (currentUser.role === 'USER') {
      return { success: false, error: 'Unauthorized: Staff users cannot add new departments.' };
    }

    const trimmedName = deptData.name.trim();
    const trimmedCode = deptData.code.trim().toUpperCase();
    const targetBUId = (deptData.businessUnitId || currentUser.businessUnitId || '').trim();

    if (!trimmedName || !trimmedCode || !targetBUId) {
      return { success: false, error: 'Department name, code, and business unit assignment are required.' };
    }

    const allDepts = this.getDepartments();
    const exists = allDepts.some(
      (d) =>
        d.businessUnitId === targetBUId &&
        (d.name.toLowerCase() === trimmedName.toLowerCase() || d.code.toUpperCase() === trimmedCode)
    );

    if (exists) {
      return {
        success: false,
        error: `A department with name "${trimmedName}" or code "${trimmedCode}" already exists in this Business Unit.`,
      };
    }

    const cleanBu = targetBUId.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanCode = trimmedCode.toLowerCase().replace(/[^a-z0-9]/g, '');
    const newDept: Department = {
      id: `dept_${cleanBu}_${cleanCode}_${Date.now().toString(36)}`,
      name: trimmedName,
      code: trimmedCode,
      businessUnitId: targetBUId,
    };

    const updatedDepts = [...allDepts, newDept];
    localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(updatedDepts));

    // Post to SQL backend
    fetch('/api/db/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newDept),
    }).catch(() => {});

    return { success: true, department: newDept };
  }

  public updateDepartment(
    currentUser: User,
    deptId: string,
    updates: {
      name?: string;
      code?: string;
      businessUnitId?: string;
    }
  ): { success: boolean; error?: string; department?: Department } {
    if (currentUser.role === 'USER') {
      return { success: false, error: 'Unauthorized: Staff users cannot edit departments.' };
    }

    const allDepts = this.getDepartments();
    const deptIndex = allDepts.findIndex((d) => d.id === deptId);

    if (deptIndex === -1) {
      return { success: false, error: 'Department not found.' };
    }

    const existingDept = allDepts[deptIndex];

    if (currentUser.role === 'IT' && existingDept.businessUnitId !== currentUser.businessUnitId) {
      return { success: false, error: 'Forbidden: IT Support can only edit departments in their assigned Business Unit.' };
    }

    const trimmedName = updates.name !== undefined ? updates.name.trim() : existingDept.name;
    const trimmedCode = updates.code !== undefined ? updates.code.trim().toUpperCase() : existingDept.code;
    const targetBUId = currentUser.role === 'ADMIN' && updates.businessUnitId ? updates.businessUnitId : existingDept.businessUnitId;

    const updatedDept: Department = {
      ...existingDept,
      name: trimmedName,
      code: trimmedCode,
      businessUnitId: targetBUId,
    };

    allDepts[deptIndex] = updatedDept;
    localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(allDepts));

    return { success: true, department: updatedDept };
  }

  public deleteDepartment(
    currentUser: User,
    deptId: string
  ): { success: boolean; error?: string } {
    if (currentUser.role === 'USER') {
      return { success: false, error: 'Unauthorized: Staff users cannot delete departments.' };
    }

    const allDepts = this.getDepartments();
    const deptToDelete = allDepts.find((d) => d.id === deptId);

    if (!deptToDelete) {
      return { success: false, error: 'Department not found.' };
    }

    if (currentUser.role === 'IT' && deptToDelete.businessUnitId !== currentUser.businessUnitId) {
      return { success: false, error: 'Forbidden: IT Support can only delete departments within their assigned Business Unit.' };
    }

    const updatedDepts = allDepts.filter((d) => d.id !== deptId);
    localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(updatedDepts));

    postgresBridge.deleteDepartment(deptId);

    return { success: true };
  }

  // ==========================================
  // Users & Multi-Business Unit RBAC
  // ==========================================

  public getAllUsers(): User[] {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    const users: User[] = raw ? JSON.parse(raw) : SEED_USERS;
    const depts = this.getDepartments();
    return users.map((u) => {
      if (!u.department && u.departmentId) {
        const found = depts.find((d) => d.id === u.departmentId);
        if (found) {
          return { ...u, department: found.name };
        }
      }
      return u;
    });
  }

  public getScopedUsers(currentUser: User): User[] {
    const allUsers = this.getAllUsers();
    if (currentUser.role === 'ADMIN') {
      return allUsers;
    }
    return allUsers.filter((u) => u.businessUnitId === currentUser.businessUnitId);
  }

  public registerUser(
    currentUser: User,
    newUserPayload: {
      username: string;
      fullName: string;
      email: string;
      role: UserRole;
      businessUnitId: string;
      departmentId: string;
      department?: string;
      password?: string;
      avatarUrl?: string;
    }
  ): { success: boolean; error?: string; user?: User } {
    if (currentUser.role === 'USER') {
      return { success: false, error: 'Unauthorized: Staff users cannot register new accounts.' };
    }

    if (currentUser.role === 'IT') {
      if (newUserPayload.role !== 'USER') {
        return { success: false, error: 'Forbidden: IT Support staff can only register Staff accounts (role: USER).' };
      }
      if (newUserPayload.businessUnitId !== currentUser.businessUnitId) {
        return { success: false, error: 'Forbidden: IT Support can only register users inside their assigned Business Unit.' };
      }
    }

    const allUsers = this.getAllUsers();
    const exists = allUsers.some((u) => u.username.toLowerCase() === newUserPayload.username.toLowerCase());
    if (exists) {
      return { success: false, error: `Username '${newUserPayload.username}' is already taken.` };
    }

    const allDepts = this.getDepartments();
    const matchedDept = allDepts.find((d) => d.id === newUserPayload.departmentId);
    const deptName = newUserPayload.department || (matchedDept ? matchedDept.name : undefined);

    const newUser: User = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      username: newUserPayload.username.trim(),
      fullName: newUserPayload.fullName.trim(),
      email: newUserPayload.email.trim(),
      role: newUserPayload.role,
      businessUnitId: newUserPayload.businessUnitId,
      departmentId: newUserPayload.departmentId,
      department: deptName,
      password: DEFAULT_USER_PASSWORD,
      mustChangePassword: true,
      avatarUrl:
        newUserPayload.avatarUrl ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(newUserPayload.username)}`,
      createdAt: new Date().toISOString(),
    };

    allUsers.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(allUsers));
    postgresBridge.saveUser(newUser, true);

    return { success: true, user: newUser };
  }

  public updateUser(
    currentUser: User,
    userId: string,
    updates: {
      fullName?: string;
      email?: string;
      username?: string;
      role?: UserRole;
      businessUnitId?: string;
      departmentId?: string;
      department?: string;
      avatarUrl?: string;
    }
  ): { success: boolean; error?: string; user?: User } {
    if (currentUser.role === 'USER') {
      return { success: false, error: 'Unauthorized: Staff users cannot edit user profiles.' };
    }

    const allUsers = this.getAllUsers();
    const userIndex = allUsers.findIndex((u) => u.id === userId);

    if (userIndex === -1) {
      return { success: false, error: 'User not found.' };
    }

    const targetUser = allUsers[userIndex];

    if (currentUser.role === 'IT') {
      if (targetUser.businessUnitId !== currentUser.businessUnitId) {
        return { success: false, error: 'Forbidden: IT Support can only edit staff accounts within their assigned Business Unit.' };
      }
      if (updates.role && updates.role === 'ADMIN') {
        return { success: false, error: 'Forbidden: IT Support cannot grant Administrator privileges.' };
      }
      if (updates.businessUnitId && updates.businessUnitId !== currentUser.businessUnitId) {
        return { success: false, error: 'Forbidden: IT Support cannot transfer users to other Business Units.' };
      }
    }

    const allDepts = this.getDepartments();
    const newDeptId = updates.departmentId !== undefined ? updates.departmentId : targetUser.departmentId;
    const matchedDept = allDepts.find((d) => d.id === newDeptId);
    const deptName = updates.department !== undefined ? updates.department : (matchedDept ? matchedDept.name : targetUser.department);

    const updatedUser: User = {
      ...targetUser,
      fullName: updates.fullName !== undefined ? updates.fullName.trim() : targetUser.fullName,
      email: updates.email !== undefined ? updates.email.trim() : targetUser.email,
      username: updates.username !== undefined ? updates.username.trim() : targetUser.username,
      role: currentUser.role === 'ADMIN' && updates.role !== undefined ? updates.role : targetUser.role,
      businessUnitId:
        currentUser.role === 'ADMIN' && updates.businessUnitId !== undefined
          ? updates.businessUnitId
          : targetUser.businessUnitId,
      departmentId: newDeptId,
      department: deptName,
      avatarUrl: updates.avatarUrl !== undefined ? updates.avatarUrl : targetUser.avatarUrl,
    };

    allUsers[userIndex] = updatedUser;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(allUsers));
    postgresBridge.saveUser(updatedUser);

    const currentSession = this.getCurrentUser();
    if (currentSession && currentSession.id === userId) {
      this.setCurrentUser(updatedUser);
    }

    return { success: true, user: updatedUser };
  }

  public deleteUser(
    currentUser: User,
    userId: string
  ): { success: boolean; error?: string } {
    if (currentUser.role === 'USER') {
      return { success: false, error: 'Unauthorized: Staff users cannot delete accounts.' };
    }

    if (currentUser.id === userId) {
      return { success: false, error: 'Cannot delete your own active account.' };
    }

    const allUsers = this.getAllUsers();
    const targetUser = allUsers.find((u) => u.id === userId);

    if (!targetUser) {
      return { success: false, error: 'User account not found.' };
    }

    if (currentUser.role === 'IT') {
      if (targetUser.businessUnitId !== currentUser.businessUnitId) {
        return { success: false, error: 'Forbidden: IT Support cannot delete users outside their assigned Business Unit.' };
      }
      if (targetUser.role === 'ADMIN' || targetUser.role === 'IT') {
        return { success: false, error: 'Forbidden: IT Support can only delete Staff accounts.' };
      }
    }

    const updatedUsers = allUsers.filter((u) => u.id !== userId);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
    postgresBridge.deleteUser(userId);

    return { success: true };
  }

  // ==========================================
  // Tickets & RBAC Scoped Queries
  // ==========================================

  public getAllTickets(): Ticket[] {
    const raw = localStorage.getItem(STORAGE_KEYS.TICKETS);
    return raw ? JSON.parse(raw) : SEED_TICKETS;
  }

  public getFilteredTickets(currentUser: User, filters: DashboardFilterState): Ticket[] {
    let tickets = this.getAllTickets();

    if (currentUser.role === 'ADMIN') {
      if (filters.businessUnitId && filters.businessUnitId !== 'ALL') {
        tickets = tickets.filter((t) => t.businessUnitId === filters.businessUnitId);
      }
    } else if (currentUser.role === 'IT') {
      tickets = tickets.filter((t) => t.businessUnitId === currentUser.businessUnitId);
    } else if (currentUser.role === 'USER') {
      tickets = tickets.filter((t) => t.createdById === currentUser.id);
    }

    const now = new Date();
    tickets = tickets.filter((t) => {
      const createdDate = new Date(t.createdAt);
      const diffMs = now.getTime() - createdDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      switch (filters.timeframe) {
        case 'DAILY':
          return diffDays <= 1.5;
        case 'WEEKLY':
          return diffDays <= 7.5;
        case 'MONTHLY':
          return diffDays <= 31;
        case 'YEARLY':
          return diffDays <= 366;
        default:
          return true;
      }
    });

    if (filters.departmentId && filters.departmentId !== 'ALL') {
      tickets = tickets.filter((t) => t.departmentId === filters.departmentId);
    }
    if (filters.status && filters.status !== 'ALL') {
      tickets = tickets.filter((t) => t.status === filters.status);
    }
    if (filters.priority && filters.priority !== 'ALL') {
      tickets = tickets.filter((t) => t.priority === filters.priority);
    }
    if (filters.assignedToId && filters.assignedToId !== 'ALL') {
      if (filters.assignedToId === 'UNASSIGNED') {
        tickets = tickets.filter((t) => !t.assignedToId);
      } else {
        tickets = tickets.filter((t) => t.assignedToId === filters.assignedToId);
      }
    }
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      tickets = tickets.filter(
        (t) =>
          t.ticketNumber.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
      );
    }

    return tickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public calculateMetrics(tickets: Ticket[]): MetricSummary {
    const total = tickets.length;
    const open = tickets.filter((t) => t.status === 'OPEN').length;
    const inProgress = tickets.filter((t) => t.status === 'IN_PROGRESS').length;
    const resolved = tickets.filter((t) => t.status === 'RESOLVED').length;
    const closed = tickets.filter((t) => t.status === 'CLOSED').length;
    const urgent = tickets.filter((t) => t.priority === 'URGENT').length;
    const high = tickets.filter((t) => t.priority === 'HIGH').length;

    const completed = resolved + closed;
    const resolutionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    let totalResolutionHours = 0;
    let countedTickets = 0;

    tickets.forEach((t) => {
      if ((t.status === 'RESOLVED' || t.status === 'CLOSED') && t.updatedAt) {
        const start = new Date(t.createdAt).getTime();
        const end = new Date(t.updatedAt).getTime();
        const hours = Math.max(0.5, (end - start) / (1000 * 60 * 60));
        totalResolutionHours += hours;
        countedTickets += 1;
      }
    });

    const avgResolutionHours =
      countedTickets > 0 ? Number((totalResolutionHours / countedTickets).toFixed(1)) : 3.5;

    return {
      totalTickets: total,
      openTickets: open,
      inProgressTickets: inProgress,
      resolvedTickets: resolved,
      closedTickets: closed,
      urgentTickets: urgent,
      highTickets: high,
      resolutionRate,
      avgResolutionHours,
    };
  }

  public createTicket(
    currentUser: User,
    payload: {
      title: string;
      description: string;
      priority: TicketPriority;
      departmentId?: string;
      businessUnitId?: string;
      attachments?: TicketAttachment[];
    }
  ): Ticket {
    const allTickets = this.getAllTickets();
    const targetBU =
      currentUser.role === 'ADMIN' && payload.businessUnitId
        ? payload.businessUnitId
        : currentUser.businessUnitId;
    const targetDept = payload.departmentId || currentUser.departmentId || '';
    const nextNumber = 1000 + allTickets.length + 1;
    const ticketNumber = `TCK-${nextNumber}`;
    const nowIso = new Date().toISOString();

    const newTicket: Ticket = {
      id: `tck-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      ticketNumber,
      title: payload.title.trim(),
      description: payload.description.trim(),
      status: 'OPEN',
      priority: payload.priority,
      createdById: currentUser.id,
      businessUnitId: targetBU,
      departmentId: targetDept,
      createdAt: nowIso,
      updatedAt: nowIso,
      attachments: payload.attachments && payload.attachments.length > 0 ? payload.attachments : [],
      activities: [
        {
          id: `act-${Date.now()}`,
          ticketId: '',
          userId: currentUser.id,
          userName: currentUser.fullName,
          userRole: currentUser.role,
          action: 'CREATED',
          message: payload.attachments && payload.attachments.length > 0
            ? `Ticket submitted with ${payload.priority} priority and ${payload.attachments.length} attachment(s).`
            : `Ticket submitted with ${payload.priority} priority.`,
          timestamp: nowIso,
          attachments: payload.attachments && payload.attachments.length > 0 ? payload.attachments : [],
        },
      ],
    };

    newTicket.activities![0].ticketId = newTicket.id;
    allTickets.unshift(newTicket);
    localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(allTickets));

    // Save directly to PostgreSQL table
    postgresBridge.createTicket(newTicket);

    return newTicket;
  }

  public updateTicket(
    currentUser: User,
    ticketId: string,
    updates: {
      status?: TicketStatus;
      priority?: TicketPriority;
      assignedToId?: string;
      resolutionNotes?: string;
      comment?: string;
      newAttachments?: TicketAttachment[];
    }
  ): { success: boolean; error?: string; ticket?: Ticket } {
    const allTickets = this.getAllTickets();
    const index = allTickets.findIndex((t) => t.id === ticketId);

    if (index === -1) {
      return { success: false, error: 'Ticket not found.' };
    }

    const ticket = allTickets[index];

    if (currentUser.role === 'IT' && ticket.businessUnitId !== currentUser.businessUnitId) {
      return { success: false, error: 'Forbidden: You can only manage tickets in your Business Unit.' };
    }

    if (currentUser.role === 'USER') {
      if (ticket.createdById !== currentUser.id) {
        return { success: false, error: 'Forbidden: You can only update your own tickets.' };
      }
      if (updates.assignedToId !== undefined || updates.priority !== undefined) {
        return { success: false, error: 'Forbidden: Staff cannot reassign or change ticket priority.' };
      }
    }

    const nowIso = new Date().toISOString();
    const activities: TicketActivity[] = ticket.activities || [];

    if (updates.newAttachments && updates.newAttachments.length > 0) {
      ticket.attachments = [...(ticket.attachments || []), ...updates.newAttachments];
    }

    if (updates.status && updates.status !== ticket.status) {
      activities.push({
        id: `act-${Date.now()}-status`,
        ticketId: ticket.id,
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        action: 'STATUS_CHANGED',
        message: `Status updated from ${ticket.status} to ${updates.status}.`,
        timestamp: nowIso,
      });
      ticket.status = updates.status;
    }

    if (updates.priority && updates.priority !== ticket.priority) {
      activities.push({
        id: `act-${Date.now()}-pri`,
        ticketId: ticket.id,
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        action: 'PRIORITY_CHANGED',
        message: `Priority changed from ${ticket.priority} to ${updates.priority}.`,
        timestamp: nowIso,
      });
      ticket.priority = updates.priority;
    }

    if (updates.assignedToId !== undefined && updates.assignedToId !== ticket.assignedToId) {
      const allUsers = this.getAllUsers();
      const assignee = allUsers.find((u) => u.id === updates.assignedToId);
      const assigneeName = assignee ? assignee.fullName : 'Unassigned';

      activities.push({
        id: `act-${Date.now()}-assign`,
        ticketId: ticket.id,
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        action: 'ASSIGNED',
        message: `Assigned ticket to ${assigneeName}.`,
        timestamp: nowIso,
      });
      ticket.assignedToId = updates.assignedToId || undefined;
    }

    if (updates.resolutionNotes !== undefined) {
      ticket.resolutionNotes = updates.resolutionNotes;
    }

    if ((updates.comment && updates.comment.trim()) || (updates.newAttachments && updates.newAttachments.length > 0)) {
      activities.push({
        id: `act-${Date.now()}-comment`,
        ticketId: ticket.id,
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        action: 'COMMENT',
        message: updates.comment?.trim() || (updates.newAttachments ? `Attached ${updates.newAttachments.length} image(s).` : ''),
        timestamp: nowIso,
        attachments: updates.newAttachments && updates.newAttachments.length > 0 ? updates.newAttachments : undefined,
      });
    }

    ticket.activities = activities;
    ticket.updatedAt = nowIso;
    allTickets[index] = ticket;

    localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(allTickets));

    // Update in PostgreSQL table
    postgresBridge.updateTicket(ticket.id, {
      status: ticket.status,
      priority: ticket.priority,
      assignedToId: ticket.assignedToId,
      resolutionNotes: ticket.resolutionNotes,
      activities: ticket.activities,
      attachments: ticket.attachments,
    });

    return { success: true, ticket };
  }

  public deleteTicket(currentUser: User, ticketId: string): { success: boolean; error?: string } {
    if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'IT')) {
      return { success: false, error: 'Unauthorized: Only Administrators and IT Support can delete tickets.' };
    }

    const allTickets = this.getAllTickets();
    const targetTicket = allTickets.find((t) => t.id === ticketId);

    if (!targetTicket) {
      return { success: false, error: 'Ticket not found.' };
    }

    if (currentUser.role === 'IT' && targetTicket.businessUnitId !== currentUser.businessUnitId) {
      return { success: false, error: 'Forbidden: IT Support can only delete tickets within their Business Unit.' };
    }

    const updatedTickets = allTickets.filter((t) => t.id !== ticketId);
    localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(updatedTickets));

    // Delete in PostgreSQL database
    postgresBridge.deleteTicket(ticketId);

    return { success: true };
  }

  public clearAllTickets(): void {
    localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify([]));
    postgresBridge.clearAllTickets();
  }

  // ==========================================
  // Email & POP3 Settings and Ingestion Polling
  // ==========================================

  private emailPollingTimer: any = null;
  private pollingCallbacks: Array<(count: number) => void> = [];

  /**
   * Retrieves the current EmailSettings containing POP3 credentials (host, port, user, password, useSSL).
   */
  public getEmailSettings(): EmailSettings {
    const raw = localStorage.getItem(STORAGE_KEYS.EMAIL_SETTINGS);
    if (!raw) {
      return { ...DEFAULT_EMAIL_SETTINGS };
    }
    try {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_EMAIL_SETTINGS,
        ...parsed,
        user: parsed.user || parsed.username || parsed.emailAddress || DEFAULT_EMAIL_SETTINGS.user,
        useSSL: parsed.useSSL !== undefined ? parsed.useSSL : (parsed.useSsl !== undefined ? parsed.useSsl : true),
        host: parsed.host || DEFAULT_EMAIL_SETTINGS.host,
        port: parsed.port || DEFAULT_EMAIL_SETTINGS.port,
      };
    } catch {
      return { ...DEFAULT_EMAIL_SETTINGS };
    }
  }

  /**
   * Persists EmailSettings (POP3 host, port, user, password, useSSL) to storage and server.
   */
  public saveEmailSettings(settings: Partial<EmailSettings>): EmailSettings {
    const current = this.getEmailSettings();
    const updated: EmailSettings = {
      ...current,
      ...settings,
      user: settings.user || settings.username || current.user,
      username: settings.user || settings.username || current.user,
      useSSL: settings.useSSL !== undefined ? settings.useSSL : (settings.useSsl !== undefined ? settings.useSsl : current.useSSL),
      useSsl: settings.useSSL !== undefined ? settings.useSSL : (settings.useSsl !== undefined ? settings.useSsl : current.useSSL),
    };

    localStorage.setItem(STORAGE_KEYS.EMAIL_SETTINGS, JSON.stringify(updated));

    // Also sync to backend server configuration
    try {
      fetch('/api/email/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updated,
          appPassword: updated.password || updated.appPassword,
          username: updated.user,
          useSsl: updated.useSSL,
        }),
      }).catch(() => {});
    } catch {
      // Ignore network errors in offline mode
    }

    // Restart background polling if interval or enabled state changed
    if (updated.enabled) {
      this.startBackgroundTicketPolling();
    } else {
      this.stopBackgroundTicketPolling();
    }

    return updated;
  }

  /**
   * Polls inbound email tickets from the POP3 server and synchronizes them into local storage & PostgreSQL
   */
  public async pollInboundEmailTickets(): Promise<{ success: boolean; fetchedCount: number; newTickets: Ticket[] }> {
    const settings = this.getEmailSettings();
    if (!settings.enabled) {
      return { success: true, fetchedCount: 0, newTickets: [] };
    }

    try {
      const res = await fetch('/api/email/fetch-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: settings.host,
          port: settings.port,
          username: settings.user,
          emailAddress: settings.emailAddress || settings.user,
          appPassword: settings.password || settings.appPassword,
          useSsl: settings.useSSL,
          leaveCopyOnServer: settings.leaveCopyOnServer,
          pollIntervalMinutes: settings.pollIntervalMinutes,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const prevCount = this.getAllTickets().length;
        await this.loadFromPostgres();
        const currentTickets = this.getAllTickets();
        const newCount = Math.max(0, currentTickets.length - prevCount);

        if (newCount > 0) {
          this.pollingCallbacks.forEach((cb) => {
            try {
              cb(newCount);
            } catch {}
          });
        }

        return {
          success: true,
          fetchedCount: data.fetchedCount || newCount,
          newTickets: currentTickets.slice(-Math.max(1, newCount)),
        };
      }
    } catch (err) {
      console.warn('Background email ingestion polling warning:', err);
    }

    return { success: false, fetchedCount: 0, newTickets: [] };
  }

  /**
   * Starts background ticket ingestion polling based on EmailSettings.pollIntervalMinutes
   */
  public startBackgroundTicketPolling(onNewTickets?: (count: number) => void): void {
    if (onNewTickets && !this.pollingCallbacks.includes(onNewTickets)) {
      this.pollingCallbacks.push(onNewTickets);
    }

    if (this.emailPollingTimer) {
      clearInterval(this.emailPollingTimer);
      this.emailPollingTimer = null;
    }

    const settings = this.getEmailSettings();
    if (!settings.enabled) return;

    const intervalMs = Math.max(1, settings.pollIntervalMinutes || 3) * 60 * 1000;

    // Initial poll
    this.pollInboundEmailTickets();

    // Periodic poller
    this.emailPollingTimer = setInterval(() => {
      this.pollInboundEmailTickets();
    }, intervalMs);
  }

  /**
   * Stops background ticket ingestion polling
   */
  public stopBackgroundTicketPolling(): void {
    if (this.emailPollingTimer) {
      clearInterval(this.emailPollingTimer);
      this.emailPollingTimer = null;
    }
  }

  // =========================================================================
  // Knowledge Base Articles Management
  // =========================================================================
  public getKnowledgeArticles(businessUnitId?: string): KnowledgeArticle[] {
    const raw = localStorage.getItem(STORAGE_KEYS.KNOWLEDGE_BASE);
    const articles: KnowledgeArticle[] = raw ? JSON.parse(raw) : SEED_KNOWLEDGE_ARTICLES;
    if (businessUnitId && businessUnitId !== 'ALL') {
      return articles.filter((a) => a.businessUnitId === 'ALL' || a.businessUnitId === businessUnitId);
    }
    return articles;
  }

  public addKnowledgeArticle(
    currentUser: User,
    articleData: {
      title: string;
      category: string;
      businessUnitId: string;
      content: string;
    }
  ): { success: boolean; error?: string; article?: KnowledgeArticle } {
    if (currentUser.role === 'USER') {
      return { success: false, error: 'Unauthorized: Staff users cannot publish knowledge base articles.' };
    }

    const title = articleData.title.trim();
    const category = articleData.category.trim();
    const content = articleData.content.trim();
    const businessUnitId = articleData.businessUnitId || 'ALL';

    if (!title || !category || !content) {
      return { success: false, error: 'Title, category, and article content are required.' };
    }

    const allArticles = this.getKnowledgeArticles();
    const newArticle: KnowledgeArticle = {
      id: `kb_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      title,
      category,
      businessUnitId,
      content,
      authorName: currentUser.fullName,
      views: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    allArticles.unshift(newArticle);
    localStorage.setItem(STORAGE_KEYS.KNOWLEDGE_BASE, JSON.stringify(allArticles));

    return { success: true, article: newArticle };
  }

  public updateKnowledgeArticle(
    currentUser: User,
    articleId: string,
    updates: {
      title?: string;
      category?: string;
      businessUnitId?: string;
      content?: string;
    }
  ): { success: boolean; error?: string; article?: KnowledgeArticle } {
    if (currentUser.role === 'USER') {
      return { success: false, error: 'Unauthorized: Staff users cannot edit knowledge base articles.' };
    }

    const allArticles = this.getKnowledgeArticles();
    const index = allArticles.findIndex((a) => a.id === articleId);

    if (index === -1) {
      return { success: false, error: 'Knowledge article not found.' };
    }

    const target = allArticles[index];
    if (currentUser.role === 'IT' && target.businessUnitId !== 'ALL' && target.businessUnitId !== currentUser.businessUnitId) {
      return { success: false, error: 'Forbidden: IT Support can only edit articles for their assigned Business Unit.' };
    }

    const updated: KnowledgeArticle = {
      ...target,
      title: updates.title !== undefined ? updates.title.trim() : target.title,
      category: updates.category !== undefined ? updates.category.trim() : target.category,
      businessUnitId: updates.businessUnitId !== undefined ? updates.businessUnitId : target.businessUnitId,
      content: updates.content !== undefined ? updates.content.trim() : target.content,
      updatedAt: new Date().toISOString(),
    };

    allArticles[index] = updated;
    localStorage.setItem(STORAGE_KEYS.KNOWLEDGE_BASE, JSON.stringify(allArticles));

    return { success: true, article: updated };
  }

  public deleteKnowledgeArticle(
    currentUser: User,
    articleId: string
  ): { success: boolean; error?: string } {
    if (currentUser.role === 'USER') {
      return { success: false, error: 'Unauthorized: Staff users cannot delete knowledge base articles.' };
    }

    const allArticles = this.getKnowledgeArticles();
    const target = allArticles.find((a) => a.id === articleId);

    if (!target) {
      return { success: false, error: 'Knowledge article not found.' };
    }

    if (currentUser.role === 'IT' && target.businessUnitId !== 'ALL' && target.businessUnitId !== currentUser.businessUnitId) {
      return { success: false, error: 'Forbidden: IT Support cannot delete articles from other Business Units.' };
    }

    const filtered = allArticles.filter((a) => a.id !== articleId);
    localStorage.setItem(STORAGE_KEYS.KNOWLEDGE_BASE, JSON.stringify(filtered));

    return { success: true };
  }

  public incrementArticleViews(articleId: string): void {
    const allArticles = this.getKnowledgeArticles();
    const index = allArticles.findIndex((a) => a.id === articleId);
    if (index !== -1) {
      allArticles[index].views = (allArticles[index].views || 0) + 1;
      localStorage.setItem(STORAGE_KEYS.KNOWLEDGE_BASE, JSON.stringify(allArticles));
    }
  }
}

export const storageService = new StorageService();
