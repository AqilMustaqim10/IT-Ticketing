/**
 * @file types.ts
 * @description Comprehensive TypeScript type definitions for the IT Support Ticketing System.
 * Defines the core models: BusinessUnit, Department, User, Ticket, along with RBAC roles,
 * ticket statuses, priority levels, timeframe filter types, and statistical metrics.
 */

// ==========================================
// 1. Core Enumerations & Literal Types
// ==========================================

/**
 * System Roles for Multi-Business Unit Role-Based Access Control (RBAC).
 * - ADMIN: Global scope across all Business Units (CCEC, FNB, HOTEL, KLBS, KLW, UOA HQ).
 * - IT: Scoped strictly to their assigned Business Unit (can view tickets & register staff in their BU).
 * - USER: Standard staff scoped to create tickets and track their personal submissions.
 */
export type UserRole = 'ADMIN' | 'IT' | 'USER';

/**
 * Business Unit codes representing the distinct operational branches.
 */
export type BusinessUnitCode = 'CCEC' | 'FNB' | 'HOTEL' | 'KLBS' | 'KLW' | 'UOA HQ' | string;

/**
 * Ticket Lifecycle Statuses.
 */
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

/**
 * Ticket Priority Levels with strict operational urgency.
 */
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

/**
 * Dashboard Timeframe Filter options for analytical aggregations.
 */
export type TimeframeOption = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

/**
 * Main application navigation view/page types.
 */
export type AppView = 'DASHBOARD' | 'USERS' | 'BRANDING' | 'REPORTS' | 'GIT_GUIDE' | 'EMAIL_INTEGRATION';

// ==========================================
// 1.5 Email Ingestion & POP3 Models
// ==========================================

export interface InboundEmailAttachment {
  name: string;
  size: string;
  type: string;
  dataUrl?: string;
}

export interface InboundEmailPayload {
  messageId?: string;
  from: string;
  fromName?: string;
  to: string;
  subject: string;
  date?: string;
  body: string;
  attachments?: InboundEmailAttachment[];
}

export interface EmailSettings {
  host: string;
  port: number;
  user: string;
  password?: string;
  useSSL: boolean;
  enabled?: boolean;
  pollIntervalMinutes?: number;
  emailAddress?: string;
  companyDomain?: string;
  provider?: 'COMPANY_POP3' | 'COMPANY_IMAP' | 'OFFICE365' | 'CUSTOM_SERVER';
  smtpEnabled?: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpUseSsl?: boolean;
  smtpUsername?: string;
  smtpPassword?: string;
  senderDisplayName?: string;
  targetBusinessUnitId?: string;
  defaultDepartmentId?: string;
  autoAssignCategory?: boolean;
  autoExtractPriority?: boolean;
  leaveCopyOnServer?: boolean;
  enableAutoReply?: boolean;
  autoReplySubjectTemplate?: string;
  autoReplyBodyTemplate?: string;
  lastSyncTimestamp?: string;
  // Aliases for multi-schema compatibility
  username?: string;
  appPassword?: string;
  useSsl?: boolean;
}

export interface Pop3MailboxConfig extends EmailSettings {
  enabled: boolean;
  provider: 'COMPANY_POP3' | 'COMPANY_IMAP' | 'OFFICE365' | 'CUSTOM_SERVER';
  companyDomain?: string;
  host: string;
  port: number;
  useSsl: boolean;
  emailAddress: string;
  username?: string;
  appPassword?: string;
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

export interface InboundEmailLog {
  id: string;
  messageId?: string;
  fromAddress: string;
  fromName?: string;
  toAddress: string;
  subject: string;
  bodyPreview: string;
  rawBody: string;
  receivedAt: string;
  status: 'PROCESSED' | 'FAILED' | 'REPLIED_TO_EXISTING';
  createdTicketId?: string;
  createdTicketNumber?: string;
  matchedUserId?: string;
  matchedBusinessUnitId?: string;
  matchedDepartmentId?: string;
  errorMessage?: string;
  attachmentsCount?: number;
  autoReplySent?: boolean;
  autoReplySubject?: string;
  autoReplyBody?: string;
}


// ==========================================
// 2. Relational Entity Models
// ==========================================

/**
 * BusinessUnit Branding & Customization Settings
 * Enables custom visual identity, colors, logo, and welcome banner for each business unit.
 */
export interface BusinessUnitBranding {
  logoUrl?: string;
  portalTitle: string;
  welcomeBannerTitle: string;
  welcomeBannerSubtitle: string;
  bannerAnnouncement?: string;
  primaryColor: string; // e.g. '#2563eb'
  accentColor: string;  // e.g. '#4f46e5'
  accentGradient: string; // CSS linear gradient string
  bannerTheme: 'blue' | 'amber' | 'emerald' | 'purple' | 'slate' | 'indigo' | 'rose' | 'teal' | 'sky' | 'orange' | 'cyan';
  supportHotline: string;
  supportEmail: string;
  deskLocation: string;
}

/**
 * BusinessUnit Entity
 * Represents an independent business unit / division within the organization.
 */
export interface BusinessUnit {
  id: string;
  name: string;
  code: BusinessUnitCode;
  description?: string;
  icon?: string;
  themeColor?: string; // Hex color code representing this Business Unit's distinct visual identity
  branding?: BusinessUnitBranding;
}

/**
 * Department Entity
 * Belongs to a specific Business Unit via foreign key businessUnitId.
 */
export interface Department {
  id: string;
  name: string;
  code: string;
  businessUnitId: string;
}

/**
 * User Entity
 * Multi-business unit account model with hashed password representation, role, business unit scoping,
 * and first-time login / password change enforcement state.
 */
export interface User {
  id: string;
  username: string;
  password?: string; // Hashed / mock-hashed storage
  fullName: string;
  email: string;
  role: UserRole;
  businessUnitId: string; // Foreign Key to BusinessUnit
  departmentId: string;   // Foreign Key to Department
  department?: string;    // Department Name (e.g. "Audio Visual & Event Staging")
  avatarUrl?: string;
  mustChangePassword?: boolean; // True for first-time login or after Admin/IT password reset
  createdAt: string;
}

/**
 * Attachment Model for Ticket Screenshots, Evidence, and Photos
 */
export interface TicketAttachment {
  id: string;
  name: string;
  url: string; // Base64 data URL or external asset URL
  size?: number; // Size in bytes
  type: string; // MIME type e.g. 'image/png'
  uploadedAt: string;
  uploadedBy?: string;
}

/**
 * Ticket Activity / Comment Entry
 * Keeps an audit trail of status changes, remarks, and IT assignments.
 */
export interface TicketActivity {
  id: string;
  ticketId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: 'CREATED' | 'STATUS_CHANGED' | 'ASSIGNED' | 'COMMENT' | 'PRIORITY_CHANGED';
  message: string;
  timestamp: string;
  attachments?: TicketAttachment[];
}

/**
 * Ticket Entity
 * The primary transactional record for IT support requests.
 */
export interface Ticket {
  id: string;
  ticketNumber: string; // e.g. "TCK-1001"
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdById: string; // Foreign Key to User (Ticket Creator)
  assignedToId?: string; // Optional Foreign Key to User (Assigned IT Staff)
  businessUnitId: string; // Foreign Key to BusinessUnit
  departmentId: string; // Foreign Key to Department
  createdAt: string; // ISO 8601 String
  updatedAt: string; // ISO 8601 String
  resolutionNotes?: string;
  activities?: TicketActivity[];
  attachments?: TicketAttachment[];
}

// ==========================================
// 3. UI State & Filter Definitions
// ==========================================

/**
 * Active Dashboard Filter Settings
 */
export interface DashboardFilterState {
  timeframe: TimeframeOption;
  businessUnitId: string; // 'ALL' or specific BusinessUnit ID
  departmentId: string;   // 'ALL' or specific Department ID
  status: string;         // 'ALL' or specific TicketStatus
  priority: string;       // 'ALL' or specific TicketPriority
  searchQuery: string;
  assignedToId?: string;  // 'ALL' or specific IT user ID
}

/**
 * Calculated Metrics and Stat Cards Summary Data
 */
export interface MetricSummary {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  urgentTickets: number;
  highTickets: number;
  resolutionRate: number; // Percentage 0 - 100
  avgResolutionHours: number;
}
