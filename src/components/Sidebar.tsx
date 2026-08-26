/**
 * @file Sidebar.tsx
 * @description Minimal, distraction-free navigation sidebar.
 * Clean light aesthetic, smooth collapse transitions, and RBAC persona switcher.
 */

import React from 'react';
import {
  Ticket as TicketIcon,
  Plus,
  Users,
  Palette,
  FileDown,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
  LayoutDashboard,
  Building2,
  Shield,
  HelpCircle,
  User as UserIcon,
  Trash2,
  Mail,
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
  onResetData: () => void;
  onClearTickets?: () => void;
  onLogout: () => void;
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
  onResetData,
  onClearTickets,
  onLogout,
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
    {
      view: 'USERS',
      label: currentUser.role === 'ADMIN' ? 'Users & Departments' : 'Staff & Departments',
      icon: Users,
      itAllowed: true,
    },
    {
      view: 'EMAIL_INTEGRATION',
      label: 'Email Integration',
      icon: Mail,
      adminOnly: true,
    },
    { view: 'BRANDING', label: 'Branding', icon: Palette, adminOnly: true },
    { view: 'REPORTS', label: 'Reports & Audit', icon: FileDown },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          id="sidebar-mobile-backdrop"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-xs transition-opacity lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="app-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-white border-r border-slate-200/80 text-slate-700 transition-all duration-200 ease-in-out ${
          isMobileOpen ? 'translate-x-0 w-60' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-16' : 'lg:w-60'}`}
      >
        {/* Brand Header */}
        <div className="h-14 flex items-center justify-between px-3 border-b border-slate-200/80 shrink-0">
          <div className="flex items-center space-x-2 overflow-hidden flex-1 min-w-0">
            {currentBU?.branding?.logoUrl ? (
              <div
                style={{ borderColor: theme.border }}
                className={`h-9 rounded-lg bg-white border p-1 flex items-center justify-center shrink-0 shadow-2xs ${
                  isCollapsed ? 'w-9' : 'min-w-[36px] max-w-[80px]'
                }`}
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
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: theme.primary }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-medium block truncate">
                  {currentBU ? currentBU.name : 'Enterprise Portal'}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={onCloseMobile}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 lg:hidden"
          >
            <X className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Primary Action */}
        <div className="p-2.5 shrink-0">
          <button
            id="sidebar-btn-create-ticket"
            onClick={onOpenCreateTicket}
            style={{ backgroundColor: theme.primary }}
            className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-white font-semibold text-xs transition shadow-2xs hover:opacity-90 cursor-pointer ${
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
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                } ${isCollapsed ? 'justify-center' : ''}`}
                title={item.label}
              >
                <Icon
                  style={isActive ? { color: theme.primary } : undefined}
                  className={`w-4 h-4 shrink-0 ${isActive ? '' : 'text-slate-400'}`}
                />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </div>

        {/* Bottom User Info & Logout */}
        <div className="p-2.5 border-t border-slate-200/80 bg-slate-50/50 shrink-0">
          {/* User Profile Card */}
          <div
            className={`w-full flex items-center space-x-2.5 p-2 rounded-lg bg-white border border-slate-200/70 shadow-2xs ${
              isCollapsed ? 'justify-center p-1.5' : ''
            }`}
          >
            <div
              style={{
                backgroundColor: theme.bgLight,
                color: theme.primary,
                borderColor: theme.border,
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border"
            >
              {currentUser.fullName.charAt(0).toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className="truncate flex-1 min-w-0">
                <span className="text-xs font-semibold text-slate-800 truncate block leading-tight">
                  {currentUser.fullName}
                </span>
                <span className="text-[10px] text-slate-500 truncate block font-medium">
                  {currentUser.role} • {currentBU?.code || 'Admin'}
                </span>
              </div>
            )}
          </div>

          {/* Logout Button directly below name */}
          <div className="mt-2">
            <button
              id="sidebar-btn-logout"
              onClick={onLogout}
              className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border border-slate-200 hover:border-rose-300 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-700 font-semibold text-xs transition shadow-2xs cursor-pointer ${
                isCollapsed ? 'px-0' : ''
              }`}
              title="Sign Out of Account"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              {!isCollapsed && <span>Log Out</span>}
            </button>
          </div>

          {!isCollapsed && onClearTickets && (
            <button
              id="sidebar-btn-clear-tickets"
              onClick={onClearTickets}
              className="mt-1 w-full flex items-center justify-center gap-1 text-[10px] text-slate-400 hover:text-rose-600 transition py-0.5 cursor-pointer"
              title="Permanently remove all ticket data"
            >
              <Trash2 className="w-3 h-3 text-slate-400" />
              <span>Clear All Tickets</span>
            </button>
          )}

          {!isCollapsed && (
            <button
              id="sidebar-btn-reset-data"
              onClick={onResetData}
              className="mt-1 w-full flex items-center justify-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 transition py-0.5 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset User Accounts</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
