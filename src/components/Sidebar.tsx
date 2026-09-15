/**
 * @file Sidebar.tsx
 * @description Minimal, distraction-free navigation sidebar.
 * Clean light aesthetic, smooth collapse transitions, and uncluttered footer.
 */

import React from 'react';
import {
  Ticket as TicketIcon,
  Plus,
  Users,
  Palette,
  FileDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
  LayoutDashboard,
  Building2,
  Shield,
  ShieldAlert,
  HelpCircle,
  User as UserIcon,
  Mail,
  Wrench,
  Moon,
  Sun,
  Share2,
  BarChart3,
  BookOpen,
} from 'lucide-react';
import { User, BusinessUnit, AppView } from '../types';
import { getBUTheme } from '../utils/themeUtils';

interface SidebarProps {
  currentUser: User;
  businessUnits: BusinessUnit[];
  currentView: AppView;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenCreateTicket: () => void;
  onNavigate: (view: AppView) => void;
  onOpenAdminTools?: () => void;
  onOpenShareModal: () => void;
  onLogout: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  businessUnits,
  currentView,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  onOpenCreateTicket,
  onNavigate,
  onOpenAdminTools,
  onOpenShareModal,
  onLogout,
  isDarkMode = false,
  onToggleDarkMode,
}) => {
  const currentBU = businessUnits.find((b) => b.id === currentUser.businessUnitId);
  const theme = getBUTheme(currentBU, businessUnits);

  const handleNavClick = (view: AppView) => {
    onNavigate(view);
    if (isMobileOpen) {
      onCloseMobile();
    }
  };

  const navItems: { view: AppView; label: string; icon: React.FC<{ className?: string; style?: React.CSSProperties }>; adminOnly?: boolean; itAllowed?: boolean }[] = [
    { view: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard },
    { view: 'KNOWLEDGE_BASE', label: 'Knowledge Base', icon: BookOpen },
    {
      view: 'USERS',
      label: currentUser.role === 'ADMIN' ? 'Users & Departments' : 'Staff & Departments',
      icon: Users,
      itAllowed: true,
    },
    {
      view: 'EMAIL_INTEGRATION',
      label: 'Email Ingestion',
      icon: Mail,
      adminOnly: true,
    },
    { view: 'BRANDING', label: 'Branding', icon: Palette, adminOnly: true },
    { view: 'REPORTS', label: 'Reports & Audit', icon: FileDown, itAllowed: true },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          id="sidebar-mobile-backdrop"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs transition-opacity lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="app-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200/70 dark:border-slate-800 text-slate-700 dark:text-slate-200 transition-all duration-200 ease-in-out ${
          isMobileOpen ? 'translate-x-0 w-60' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-16' : 'lg:w-60'}`}
      >
        {/* Brand Header */}
        <div className={`h-14 flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between px-3'} border-b border-slate-100 dark:border-slate-800 shrink-0`}>
          <div className={`flex items-center space-x-2 overflow-hidden flex-1 min-w-0 ${isCollapsed ? 'justify-center' : ''}`}>
            {!isCollapsed && currentBU?.branding?.logoUrl ? (
              <div
                style={{ borderColor: theme.border }}
                className="h-9 rounded-lg bg-white dark:bg-slate-800 border p-1 flex items-center justify-center shrink-0 shadow-2xs min-w-[36px] max-w-[80px]"
              >
                <img
                  src={currentBU.branding.logoUrl}
                  alt={currentBU.name}
                  referrerPolicy="no-referrer"
                  className="max-h-full max-w-full w-auto h-auto object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <div
                style={{ backgroundColor: theme.primary }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-2xs"
              >
                <TicketIcon className="w-4 h-4 text-white" />
              </div>
            )}
            {!isCollapsed && (
              <div className="truncate flex-1 min-w-0">
                <div className="flex items-center gap-1.5 truncate">
                  <span
                    style={{ color: theme.primary }}
                    className="text-xs font-bold tracking-tight block leading-tight truncate"
                  >
                    {currentBU ? currentBU.code : 'Service Desk'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium block truncate">
                  {currentBU ? currentBU.name : 'Enterprise Portal'}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={onCloseMobile}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 lg:hidden cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {!isCollapsed && (
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Expand button when collapsed (placed below logo or centered) */}
        {isCollapsed && (
          <div className="hidden lg:flex justify-center py-2 border-b border-slate-100 dark:border-slate-800">
            <button
              onClick={onToggleCollapse}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Expand sidebar"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Primary Action Button (Single Prominent CTA) */}
        <div className="p-2.5 shrink-0">
          <button
            id="sidebar-btn-create-ticket"
            onClick={onOpenCreateTicket}
            style={{ backgroundColor: theme.primary }}
            className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-white font-semibold text-xs transition shadow-2xs hover:opacity-90 active:scale-[0.98] cursor-pointer ${
              isCollapsed ? 'px-0' : 'px-3'
            }`}
            title="Create New Ticket"
          >
            <Plus className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>New Ticket</span>}
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-2.5 py-1 space-y-1">
          {navItems.map((item) => {
            if (item.adminOnly && currentUser.role !== 'ADMIN') return null;
            if (item.itAllowed && currentUser.role === 'USER') return null;

            const Icon = item.icon;
            const isActive = currentView === item.view;

            return (
              <button
                key={item.view}
                onClick={() => handleNavClick(item.view)}
                style={isActive ? { backgroundColor: theme.bgLight, color: theme.primary } : undefined}
                className={`w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-lg text-xs transition cursor-pointer ${
                  isActive
                    ? 'font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white font-medium'
                } ${isCollapsed ? 'justify-center' : ''}`}
                title={item.label}
              >
                <Icon
                  style={isActive ? { color: theme.primary } : undefined}
                  className={`w-4 h-4 shrink-0 ${isActive ? '' : 'text-slate-400 dark:text-slate-500'}`}
                />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}

          {/* Share Helpdesk Nav Item */}
          <button
            id="sidebar-btn-share"
            onClick={onOpenShareModal}
            className={`w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-lg text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50/70 dark:hover:bg-blue-950/40 font-semibold transition cursor-pointer ${
              isCollapsed ? 'justify-center' : ''
            }`}
            title="Share Desk with Friends (Live link, QR code, LAN guide)"
          >
            <Share2 className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span className="truncate">Share Helpdesk</span>}
          </button>

          {/* Admin System Utilities Nav Item */}
          {currentUser.role === 'ADMIN' && onOpenAdminTools && (
            <button
              id="sidebar-btn-admin-tools"
              onClick={onOpenAdminTools}
              className={`w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-lg text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white font-medium transition cursor-pointer ${
                isCollapsed ? 'justify-center' : ''
              }`}
              title="Admin Utilities"
            >
              <Wrench className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
              {!isCollapsed && <span className="truncate">Admin Utilities</span>}
            </button>
          )}
        </div>

        {/* Clean Sidebar Footer: Theme Toggle + User Profile + Logout */}
        <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/60 shrink-0 space-y-2">
          {/* Global Dark Mode Toggle */}
          {onToggleDarkMode && (
            <button
              id="sidebar-btn-theme-toggle"
              type="button"
              role="switch"
              aria-checked={isDarkMode}
              aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
              onClick={onToggleDarkMode}
              className={`w-full flex items-center justify-between p-2 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium transition shadow-2xs cursor-pointer ${
                isCollapsed ? 'justify-center' : ''
              }`}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              <div className="flex items-center space-x-2 truncate">
                {isDarkMode ? (
                  <Moon className="w-4 h-4 text-indigo-400 shrink-0" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                )}
                {!isCollapsed && (
                  <span className="truncate text-xs font-semibold">
                    {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                  </span>
                )}
              </div>

              {!isCollapsed && (
                <div
                  className={`w-8 h-4 flex items-center rounded-full p-0.5 transition-colors ${
                    isDarkMode ? 'bg-indigo-600 justify-end' : 'bg-slate-200 dark:bg-slate-700 justify-start'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full bg-white shadow-xs" />
                </div>
              )}
            </button>
          )}

          {/* User Profile Card */}
          <div
            className={`w-full flex items-center space-x-2.5 p-1.5 rounded-lg bg-white dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700/80 shadow-2xs ${
              isCollapsed ? 'justify-center' : ''
            }`}
          >
            <div
              style={{
                backgroundColor: theme.bgLight,
                color: theme.primary,
                borderColor: theme.border,
              }}
              className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border"
            >
              {currentUser.fullName.charAt(0).toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className="truncate flex-1 min-w-0">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate block leading-tight">
                  {currentUser.fullName}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-400 truncate block font-medium">
                  {currentUser.role} • {currentBU?.code || 'Group'}
                </span>
              </div>
            )}
          </div>

          {/* Clean Logout Button */}
          <button
            id="sidebar-btn-logout"
            onClick={onLogout}
            className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-800 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-300 hover:text-rose-700 dark:hover:text-rose-400 font-semibold text-xs transition shadow-2xs cursor-pointer ${
              isCollapsed ? 'px-0' : ''
            }`}
            title="Sign Out of Account"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            {!isCollapsed && <span>Log Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
};


