/**
 * @file App.tsx
 * @description Root Application component for the Multi-Business Unit IT Support Ticketing Web Application.
 * Orchestrates RBAC session states, credential security & first-time password change workflow,
 * dashboard filters, stat card metrics, ticket registry, modal dialogs, and PDF reporting.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  storageService,
} from './services/storageService';
import { User, Ticket, BusinessUnit, Department, DashboardFilterState, MetricSummary, TicketStatus, TicketPriority, UserRole, AppView } from './types';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { StatCards } from './components/StatCards';
import { FilterBar } from './components/FilterBar';
import { TicketList } from './components/TicketList';
import { TicketDetailModal } from './components/TicketDetailModal';
import { CreateTicketModal } from './components/CreateTicketModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { UserManagementModal } from './components/UserManagementModal';
import { AdminToolsModal } from './components/AdminToolsModal';
import { LoginScreen } from './components/LoginScreen';
import { UserDirectoryPage } from './components/pages/UserDirectoryPage';
import { PortalBrandingPage } from './components/pages/PortalBrandingPage';
import { ExportReportsPage } from './components/pages/ExportReportsPage';
import { GitGuidePage } from './components/pages/GitGuidePage';
import { EmailIntegrationPage } from './components/pages/EmailIntegrationPage';
import { generateSupportReportPDF } from './utils/pdfExport';
import {
  ShieldAlert,
  Info,
  CheckCircle2,
  AlertCircle,
  Building2,
  KeyRound,
  Palette,
  Sparkles,
  Mail,
  Plus,
  Search,
} from 'lucide-react';
import { TicketAttachment, BusinessUnitBranding } from './types';

export default function App() {
  // =========================================================================
  // 1. Application State & Storage Initialization
  // =========================================================================
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    storageService.initialize();
    return storageService.getCurrentUser();
  });

  const [currentView, setCurrentView] = useState<AppView>('DASHBOARD');
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [scopedUsers, setScopedUsers] = useState<User[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [metrics, setMetrics] = useState<MetricSummary>({
    totalTickets: 0,
    openTickets: 0,
    inProgressTickets: 0,
    resolvedTickets: 0,
    closedTickets: 0,
    urgentTickets: 0,
    highTickets: 0,
    resolutionRate: 0,
    avgResolutionHours: 0,
  });

  // Filter State
  const [filters, setFilters] = useState<DashboardFilterState>({
    timeframe: 'MONTHLY',
    businessUnitId: currentUser?.role === 'ADMIN' ? 'ALL' : currentUser?.businessUnitId || 'ALL',
    departmentId: 'ALL',
    status: 'ALL',
    priority: 'ALL',
    searchQuery: '',
    assignedToId: 'ALL',
  });

  // Active Modals & Selected Ticket
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [isAdminToolsOpen, setIsAdminToolsOpen] = useState(false);
  const [isBrandingOpen, setIsBrandingOpen] = useState(false);
  const [isGitGuideOpen, setIsGitGuideOpen] = useState(false);
  const [isExportReportOpen, setIsExportReportOpen] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'info' | 'error';
    text: string;
  } | null>(null);

  // Show auto-dismissing toast notifications
  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // =========================================================================
  // 2. Data Synchronization & RBAC Filter Pipeline
  // =========================================================================
  const refreshData = useCallback(() => {
    const bus = storageService.getBusinessUnits();
    const depts = storageService.getDepartments();
    const users = storageService.getAllUsers();
    setBusinessUnits(bus);
    setDepartments(depts);
    setAllUsers(users);

    if (currentUser) {
      const freshUser = users.find((u) => u.id === currentUser.id) || currentUser;
      const scopedU = storageService.getScopedUsers(freshUser);
      const filteredTicks = storageService.getFilteredTickets(freshUser, filters);
      const calculatedMetrics = storageService.calculateMetrics(filteredTicks);

      setScopedUsers(scopedU);
      setTickets(filteredTicks);
      setMetrics(calculatedMetrics);
    }
  }, [currentUser, filters]);

  // Sync data on mount from PostgreSQL and whenever user or filter configuration changes
  useEffect(() => {
    storageService.loadFromPostgres().then(() => {
      refreshData();
    }).catch(() => {
      refreshData();
    });

    // Periodic check to pull new tickets generated by background POP3 ingestion
    const interval = setInterval(async () => {
      try {
        const hasNew = await storageService.loadFromPostgres();
        if (hasNew) {
          refreshData();
        }
      } catch {
        // Ignore background polling errors
      }
    }, 25000);

    return () => clearInterval(interval);
  }, [refreshData]);

  // When user persona changes, align the business unit filter
  const handleSwitchUser = (newUser: User) => {
    storageService.setCurrentUser(newUser);
    setCurrentUser(newUser);
    setFilters((prev) => ({
      ...prev,
      businessUnitId: newUser.role === 'ADMIN' ? 'ALL' : newUser.businessUnitId,
      departmentId: 'ALL',
      searchQuery: '',
    }));
    showToast(`Switched persona to ${newUser.fullName} (${newUser.role})`, 'info');
  };

  // Clear all tickets from the database
  const handleClearAllTickets = () => {
    storageService.clearAllTickets();
    refreshData();
    showToast('All ticket data has been permanently removed.', 'success');
  };

  // Factory Reset to original seed datasets
  const handleResetData = () => {
    storageService.resetToSeed();
    const defaultUser = storageService.getCurrentUser();
    setCurrentUser(defaultUser);
    setFilters({
      timeframe: 'MONTHLY',
      businessUnitId: 'ALL',
      departmentId: 'ALL',
      status: 'ALL',
      priority: 'ALL',
      searchQuery: '',
      assignedToId: 'ALL',
    });
    refreshData();
    showToast('Database reset to default seed data successfully!', 'success');
  };

  // =========================================================================
  // 3. Authentication & Password Lifecycle Workflows
  // =========================================================================
  const handleLogin = (userOrUsername: User | string, password?: string) => {
    let authenticatedUser: User | null = null;

    if (typeof userOrUsername === 'string') {
      const result = storageService.login(userOrUsername, password || '');
      if (result.success && result.user) {
        authenticatedUser = result.user;
      } else {
        return { success: false, error: result.error || 'Authentication failed' };
      }
    } else if (userOrUsername && typeof userOrUsername === 'object') {
      authenticatedUser = userOrUsername;
      storageService.setCurrentUser(authenticatedUser);
    }

    if (authenticatedUser) {
      setCurrentUser(authenticatedUser);
      setFilters((prev) => ({
        ...prev,
        businessUnitId: authenticatedUser!.role === 'ADMIN' ? 'ALL' : authenticatedUser!.businessUnitId,
        departmentId: 'ALL',
      }));

      if (authenticatedUser.mustChangePassword) {
        showToast(`Welcome ${authenticatedUser.fullName}! Please set a new password.`, 'info');
      } else {
        showToast(`Welcome back, ${authenticatedUser.fullName}!`, 'success');
      }
      return { success: true, user: authenticatedUser };
    }
    return { success: false, error: 'User not found' };
  };

  const handleLogout = () => {
    storageService.logout();
    setCurrentUser(null);
    showToast('You have been signed out.', 'info');
  };

  const handleChangePasswordSubmit = (currentPass: string, newPass: string) => {
    if (!currentUser) return { success: false, error: 'No active session.' };
    return storageService.changePassword(currentUser.id, currentPass, newPass);
  };

  const handlePasswordChanged = () => {
    // Automatically logged out after password change
    setCurrentUser(null);
    refreshData();
    showToast(
      'Password updated successfully! Please log in with your new credentials.',
      'success'
    );
  };

  const handleResetUserPassword = (targetUserId: string) => {
    if (!currentUser) return { success: false, error: 'Unauthorized.' };
    const result = storageService.resetPasswordToDefault(currentUser, targetUserId);
    if (result.success) {
      refreshData();
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  // =========================================================================
  // 4. User Registration (Scoped for IT, Global for Admin)
  // =========================================================================
  const handleRegisterUser = (payload: {
    username: string;
    fullName: string;
    email: string;
    role: UserRole;
    businessUnitId: string;
    departmentId: string;
    avatarUrl?: string;
  }) => {
    if (!currentUser) return { success: false, error: 'Unauthorized' };
    const result = storageService.registerUser(currentUser, payload);
    if (result.success && result.user) {
      refreshData();
      showToast(
        `User @${payload.username} registered with default password! (Requires password change on first login)`,
        'success'
      );
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  const handleDeleteUser = (userId: string) => {
    if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'IT')) {
      return { success: false, error: 'Unauthorized. Only Administrators and IT Support can delete user accounts.' };
    }
    const result = storageService.deleteUser(currentUser, userId);
    if (result.success) {
      refreshData();
      showToast('User account permanently deleted.', 'success');
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  const handleUpdateUser = (
    userId: string,
    updates: {
      fullName?: string;
      email?: string;
      username?: string;
      role?: UserRole;
      businessUnitId?: string;
      departmentId?: string;
      avatarUrl?: string;
    }
  ) => {
    if (!currentUser) return { success: false, error: 'Unauthorized.' };
    const result = storageService.updateUser(currentUser, userId, updates);
    if (result.success && result.user) {
      refreshData();
      if (currentUser.id === userId) {
        setCurrentUser(result.user);
      }
      showToast(`User profile for @${result.user.username} updated successfully!`, 'success');
      return { success: true, user: result.user };
    }
    return { success: false, error: result.error };
  };

  const handleAddDepartment = (deptData: {
    name: string;
    code: string;
    businessUnitId: string;
  }) => {
    if (!currentUser) return { success: false, error: 'Unauthorized.' };
    const result = storageService.addDepartment(currentUser, deptData);
    if (result.success && result.department) {
      refreshData();
      showToast(
        `Department "${result.department.name} (${result.department.code})" created successfully!`,
        'success'
      );
      return { success: true, department: result.department };
    }
    return { success: false, error: result.error };
  };

  const handleUpdateDepartment = (
    deptId: string,
    updates: {
      name?: string;
      code?: string;
      businessUnitId?: string;
    }
  ) => {
    if (!currentUser) return { success: false, error: 'Unauthorized.' };
    const result = storageService.updateDepartment(currentUser, deptId, updates);
    if (result.success && result.department) {
      refreshData();
      showToast(
        `Department "${result.department.name} (${result.department.code})" updated successfully!`,
        'success'
      );
      return { success: true, department: result.department };
    }
    return { success: false, error: result.error };
  };

  const handleDeleteDepartment = (deptId: string) => {
    if (!currentUser) return { success: false, error: 'Unauthorized.' };
    const result = storageService.deleteDepartment(currentUser, deptId);
    if (result.success) {
      refreshData();
      showToast('Department deleted successfully.', 'success');
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  // =========================================================================
  // 5. Ticket Lifecycle Handlers (Create & Update with Attachments)
  // =========================================================================
  const handleCreateTicket = (payload: {
    title: string;
    description: string;
    priority: TicketPriority;
    departmentId?: string;
    businessUnitId?: string;
    attachments?: TicketAttachment[];
  }) => {
    if (!currentUser) return;
    const newTicket = storageService.createTicket(currentUser, payload);
    refreshData();
    showToast(`Ticket ${newTicket.ticketNumber} created successfully!`, 'success');
  };

  const handleUpdateTicket = (
    ticketId: string,
    updates: {
      status?: TicketStatus;
      priority?: TicketPriority;
      assignedToId?: string;
      resolutionNotes?: string;
      comment?: string;
      attachments?: TicketAttachment[];
    }
  ) => {
    if (!currentUser) return;
    const result = storageService.updateTicket(currentUser, ticketId, updates);
    if (result.success && result.ticket) {
      setSelectedTicket(result.ticket);
      refreshData();
      showToast(`Ticket ${result.ticket.ticketNumber} updated!`, 'success');
    } else {
      showToast(result.error || 'Failed to update ticket.', 'error');
    }
  };

  const handleDeleteTicket = (ticketId: string) => {
    if (!currentUser) return;
    const result = storageService.deleteTicket(currentUser, ticketId);
    if (result.success) {
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket(null);
      }
      refreshData();
      showToast('Ticket removed successfully.', 'success');
    } else {
      showToast(result.error || 'Failed to remove ticket.', 'error');
    }
  };

  // =========================================================================
  // 6. Custom Business Unit Branding Handler
  // =========================================================================
  const handleSaveBranding = (buId: string, branding: BusinessUnitBranding) => {
    if (!currentUser) return;
    const result = storageService.updateBusinessUnitBranding(currentUser, buId, branding);
    if (result.success) {
      refreshData();
      showToast('Portal branding updated successfully!', 'success');
    } else {
      showToast(result.error || 'Failed to save branding.', 'error');
    }
  };

  // =========================================================================
  // 7. PDF Executive Report Generation & Reports Center
  // =========================================================================
  const handleExportPDF = () => {
    if (!currentUser) return;
    setIsExportReportOpen(true);
  };

  // If user is not logged in, render the Login Screen portal
  if (!currentUser) {
    return (
      <>
        {/* Toast Notification Popup */}
        {toastMessage && (
          <div
            id="app-toast-notification"
            className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-2.5 text-xs font-bold animate-in slide-in-from-bottom-3 fade-in duration-200 ${
              toastMessage.type === 'success'
                ? 'bg-slate-900 text-white border-slate-700'
                : toastMessage.type === 'error'
                ? 'bg-rose-600 text-white border-rose-700'
                : 'bg-blue-600 text-white border-blue-700'
            }`}
          >
            {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {toastMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-white" />}
            {toastMessage.type === 'info' && <Info className="w-4 h-4 text-white" />}
            <span>{toastMessage.text}</span>
          </div>
        )}

        <LoginScreen
          allUsers={allUsers.length > 0 ? allUsers : storageService.getAllUsers()}
          businessUnits={businessUnits.length > 0 ? businessUnits : storageService.getBusinessUnits()}
          onLogin={handleLogin}
          onResetSeedData={handleResetData}
        />
      </>
    );
  }

  const userBU = businessUnits.find((b) => b.id === currentUser.businessUnitId);
  const selectedBU =
    filters.businessUnitId !== 'ALL'
      ? businessUnits.find((b) => b.id === filters.businessUnitId)
      : null;
  const activeBU = selectedBU || (currentUser.role !== 'ADMIN' ? userBU : null);
  const brandingTargetBU = activeBU || userBU || businessUnits[0];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans antialiased">
      {/* Toast Notification Popup */}
      {toastMessage && (
        <div
          id="app-toast-notification"
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-2.5 text-xs font-bold animate-in slide-in-from-bottom-3 fade-in duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-slate-900 text-white border-slate-700'
              : toastMessage.type === 'error'
              ? 'bg-rose-600 text-white border-rose-700'
              : 'bg-blue-600 text-white border-blue-700'
          }`}
        >
          {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {toastMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-white" />}
          {toastMessage.type === 'info' && <Info className="w-4 h-4 text-white" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        currentUser={currentUser}
        businessUnits={businessUnits}
        currentView={currentView}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onOpenCreateTicket={() => setIsCreateTicketOpen(true)}
        onNavigate={(view) => setCurrentView(view)}
        onOpenAdminTools={() => setIsAdminToolsOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area (Offset by sidebar width on desktop) */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-200 ${
          isSidebarCollapsed ? 'lg:pl-16' : 'lg:pl-60'
        }`}
      >
        {/* Slim Top Bar */}
        <TopBar
          currentUser={currentUser}
          businessUnits={businessUnits}
          filters={filters}
          onFilterChange={setFilters}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenCreateTicket={() => setIsCreateTicketOpen(true)}
          onExportPDF={() => setCurrentView('REPORTS')}
          onLogout={handleLogout}
        />

        {/* Main Container */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">
          {/* PAGE 1: USER DIRECTORY & RBAC */}
          {currentView === 'USERS' && (
            <UserDirectoryPage
              currentUser={currentUser}
              users={scopedUsers}
              businessUnits={businessUnits}
              departments={departments}
              allTickets={tickets}
              onRegisterUser={handleRegisterUser}
              onUpdateUser={handleUpdateUser}
              onResetPassword={handleResetUserPassword}
              onDeleteUser={handleDeleteUser}
              onAddDepartment={handleAddDepartment}
              onUpdateDepartment={handleUpdateDepartment}
              onDeleteDepartment={handleDeleteDepartment}
              onShowToast={showToast}
            />
          )}

          {/* PAGE 2: PORTAL BRANDING */}
          {currentView === 'BRANDING' && (
            <PortalBrandingPage
              currentUser={currentUser}
              businessUnits={businessUnits}
              activeBU={brandingTargetBU}
              onSaveBranding={handleSaveBranding}
              onShowToast={showToast}
            />
          )}

          {/* PAGE 3: DEDICATED BU AUDIT & PDF EXPORT CENTER */}
          {currentView === 'REPORTS' && (
            <ExportReportsPage
              currentUser={currentUser}
              businessUnits={businessUnits}
              departments={departments}
              allTickets={storageService.getAllTickets()}
              allUsers={allUsers}
              activeFilters={filters}
              onShowToast={showToast}
            />
          )}

          {/* PAGE 4: GIT DEPLOYMENT & CLI GUIDE */}
          {currentView === 'GIT_GUIDE' && (
            <GitGuidePage />
          )}

          {/* PAGE 5: EMAIL-TO-TICKET & POP3 INGESTION HUB */}
          {currentView === 'EMAIL_INTEGRATION' && (
            <EmailIntegrationPage
              currentUser={currentUser}
              businessUnits={businessUnits}
              departments={departments}
              onSelectTicket={setSelectedTicket}
              onTicketCreated={refreshData}
              onShowToast={showToast}
            />
          )}

          {/* PAGE 0 (DEFAULT): SERVICE DESK DASHBOARD */}
          {currentView === 'DASHBOARD' && (
            <>
              {/* Clean Header with Unit Logo */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60">
                <div className="flex items-center space-x-3.5">
                  {activeBU?.branding?.logoUrl ? (
                    <div className="h-14 sm:h-16 min-w-[72px] max-w-[220px] rounded-xl bg-white p-2 border border-slate-200/80 shadow-2xs flex items-center justify-center shrink-0">
                      <img
                        src={activeBU.branding.logoUrl}
                        alt={activeBU.name}
                        referrerPolicy="no-referrer"
                        className="max-h-full max-w-full w-auto h-auto object-contain rounded-md"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-2xs shrink-0">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                        {currentUser.role === 'USER'
                          ? 'My Support Requests'
                          : activeBU
                          ? activeBU.name
                          : 'Support Dashboard'}
                      </h1>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/60 font-mono">
                        {activeBU ? activeBU.code : 'ALL UNITS'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {currentUser.role === 'USER'
                        ? `Track your submitted tickets for ${userBU?.name || 'IT Support'}`
                        : activeBU
                        ? (activeBU.branding?.welcomeBannerSubtitle || `Incident ticketing desk for ${activeBU.name}`)
                        : 'Overview of support tickets across all business units (CCEC, F&B, HOTEL, KLBS, KLW, UOA HQ)'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {currentUser.role === 'USER' ? (
                    <button
                      id="btn-user-create-ticket-header"
                      onClick={() => setIsCreateTicketOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-xs cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New Request</span>
                    </button>
                  ) : (
                    <>
                      {activeBU?.branding?.bannerAnnouncement && (
                        <div className="text-xs bg-blue-50 text-blue-800 border border-blue-100 px-3 py-1.5 rounded-lg max-w-md truncate flex items-center gap-1.5">
                          <span className="font-semibold shrink-0">Notice:</span>
                          <span className="truncate">{activeBU.branding.bannerAnnouncement}</span>
                        </div>
                      )}
                      {currentUser.role === 'ADMIN' && (
                        <button
                          id="btn-edit-portal-branding-quick"
                          onClick={() => setCurrentView('BRANDING')}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition shadow-2xs cursor-pointer shrink-0"
                          title="Edit Portal Branding"
                        >
                          <Palette className="w-3.5 h-3.5 text-blue-600" />
                          <span>Branding</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* USER VIEW: Personalized Personal Summary Cards */}
              {currentUser.role === 'USER' ? (
                <section aria-label="Personal Requests Overview" className="space-y-4">
                  {/* Personal Stat Strip */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-medium text-slate-500 block">Total Submitted</span>
                        <span className="text-xl font-bold text-slate-900">{tickets.length}</span>
                      </div>
                      <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
                        {tickets.length}
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-medium text-slate-500 block">Open / In Progress</span>
                        <span className="text-xl font-bold text-amber-600">
                          {tickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length}
                        </span>
                      </div>
                      <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                        {tickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length}
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-medium text-slate-500 block">Resolved / Closed</span>
                        <span className="text-xl font-bold text-emerald-600">
                          {tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length}
                        </span>
                      </div>
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                        {tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length}
                      </div>
                    </div>
                  </div>

                  {/* Clean Search & Status Bar for Regular Users */}
                  <div className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                      <span className="text-xs font-bold text-slate-500 mr-1">Status:</span>
                      <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200/60">
                        {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'].map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setFilters((prev) => ({ ...prev, status: st }))}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                              filters.status === st
                                ? 'bg-white text-slate-900 shadow-2xs'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            {st === 'ALL' ? 'All My Tickets' : st.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={filters.searchQuery}
                        onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
                        placeholder="Search my tickets..."
                        className="w-full text-xs rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </section>
              ) : (
                <>
                  {/* 1. Summary Stat Cards for Admin / IT */}
                  <section aria-label="KPI Metrics">
                    <StatCards
                      metrics={metrics}
                      timeframe={filters.timeframe}
                      onFilterStatus={(st) => setFilters((prev) => ({ ...prev, status: st }))}
                      onFilterPriority={(pri) => setFilters((prev) => ({ ...prev, priority: pri }))}
                    />
                  </section>

                  {/* 2. Minimal Filter Control Bar for Admin / IT */}
                  <section aria-label="Filters and Search">
                    <FilterBar
                      filters={filters}
                      onFilterChange={setFilters}
                      businessUnits={businessUnits}
                      departments={departments}
                      currentUser={currentUser}
                      onExportPDF={() => setCurrentView('REPORTS')}
                      isExportingPDF={isExportingPDF}
                    />
                  </section>
                </>
              )}

              {/* 3. Ticket List */}
              <section aria-label="Support Tickets">
                <TicketList
                  tickets={tickets}
                  businessUnits={businessUnits}
                  departments={departments}
                  allUsers={allUsers}
                  currentUser={currentUser}
                  onSelectTicket={setSelectedTicket}
                  onDeleteTicket={handleDeleteTicket}
                />
              </section>
            </>
          )}
        </main>

        {/* Minimal Footer */}
        <footer className="border-t border-slate-200/60 py-3 mt-6">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
            <div>
              <span>IT Service Desk</span>
              <span className="mx-1.5">•</span>
              <span>CCEC, F&amp;B, HOTEL, KLBS, KLW, UOA HQ</span>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setCurrentView('REPORTS')}
                className="hover:text-slate-600 transition cursor-pointer"
              >
                Reports
              </button>
              <span>•</span>
              <button
                onClick={() => setCurrentView('GIT_GUIDE')}
                className="hover:text-slate-600 transition cursor-pointer"
              >
                Git Guide
              </button>
            </div>
          </div>
        </footer>
      </div>

      {/* Mandatory Change Password Popup Modal (Triggered when user must change password) */}
      {currentUser.mustChangePassword && (
        <ChangePasswordModal
          currentUser={currentUser}
          onPasswordChanged={handlePasswordChanged}
          onCancelLogout={handleLogout}
          onChangePasswordSubmit={handleChangePasswordSubmit}
        />
      )}

      {/* Ticket Detail & Workflow Modal */}
      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          currentUser={currentUser}
          businessUnits={businessUnits}
          departments={departments}
          allUsers={allUsers}
          onClose={() => setSelectedTicket(null)}
          onUpdateTicket={handleUpdateTicket}
          onDeleteTicket={handleDeleteTicket}
        />
      )}

      {/* Create Ticket Modal */}
      {isCreateTicketOpen && (
        <CreateTicketModal
          currentUser={currentUser}
          businessUnits={businessUnits}
          departments={departments}
          onClose={() => setIsCreateTicketOpen(false)}
          onSubmit={handleCreateTicket}
        />
      )}

      {/* User Management Modal */}
      {isUserManagementOpen && (
        <UserManagementModal
          currentUser={currentUser}
          users={scopedUsers}
          businessUnits={businessUnits}
          departments={departments}
          onClose={() => setIsUserManagementOpen(false)}
          onRegisterUser={handleRegisterUser}
          onResetPassword={handleResetUserPassword}
          onDeleteUser={handleDeleteUser}
        />
      )}

      {/* Admin System Utilities Modal */}
      {isAdminToolsOpen && (
        <AdminToolsModal
          isOpen={isAdminToolsOpen}
          onClose={() => setIsAdminToolsOpen(false)}
          onResetData={handleResetData}
          onClearTickets={handleClearAllTickets}
          onShowToast={showToast}
        />
      )}
    </div>
  );
}
