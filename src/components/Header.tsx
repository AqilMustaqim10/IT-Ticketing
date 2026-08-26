/**
 * @file Header.tsx
 * @description Top navigation bar displaying organization branding, business unit badge,
 * active user profile, custom business unit branding switcher, quick role switcher, and action buttons.
 */

import React from 'react';
import {
  Shield,
  UserCheck,
  Building2,
  Building,
  Utensils,
  Hotel,
  Activity,
  Landmark,
  PlusCircle,
  UserPlus,
  RotateCcw,
  GitBranch,
  LogOut,
  ChevronDown,
  Layers,
  Palette,
} from 'lucide-react';
import { User, BusinessUnit } from '../types';
import { SEED_USERS } from '../data/seedData';

interface HeaderProps {
  currentUser: User;
  businessUnits: BusinessUnit[];
  onSwitchUser: (user: User) => void;
  onOpenCreateTicket: () => void;
  onOpenUserManagement: () => void;
  onOpenBranding?: () => void;
  onOpenGitGuide: () => void;
  onResetData: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  businessUnits,
  onSwitchUser,
  onOpenCreateTicket,
  onOpenUserManagement,
  onOpenBranding,
  onOpenGitGuide,
  onResetData,
  onLogout,
}) => {
  const [showSwitchMenu, setShowSwitchMenu] = React.useState(false);

  // Retrieve current user's business unit
  const currentBU = businessUnits.find((b) => b.id === currentUser.businessUnitId);
  const branding = currentBU?.branding;

  // Render role badge with distinct semantic styling
  const renderRoleBadge = () => {
    switch (currentUser.role) {
      case 'ADMIN':
        return (
          <span
            id="badge-role-admin"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-md bg-purple-100 text-purple-800 border border-purple-200"
          >
            <Shield className="w-3.5 h-3.5 text-purple-600" />
            Global Admin
          </span>
        );
      case 'IT':
        return (
          <span
            id="badge-role-it"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-md bg-blue-100 text-blue-800 border border-blue-200"
          >
            <UserCheck className="w-3.5 h-3.5 text-blue-600" />
            IT Support ({currentBU?.code})
          </span>
        );
      case 'USER':
      default:
        return (
          <span
            id="badge-role-user"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            Staff ({currentBU?.code})
          </span>
        );
    }
  };

  // Render Business Unit icon
  const getBUIcon = (code?: string) => {
    switch (code) {
      case 'CCEC':
        return <Building2 className="w-4 h-4 text-blue-400" />;
      case 'FNB':
        return <Utensils className="w-4 h-4 text-amber-400" />;
      case 'HOTEL':
        return <Hotel className="w-4 h-4 text-indigo-400" />;
      case 'KLBS':
        return <Building className="w-4 h-4 text-sky-400" />;
      case 'KLW':
        return <Activity className="w-4 h-4 text-emerald-400" />;
      case 'UOA HQ':
      case 'UOA_HQ':
        return <Landmark className="w-4 h-4 text-purple-400" />;
      default:
        return <Building2 className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-900 border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Business Unit Branding & Scoped Context */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              {branding?.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt={currentBU?.name || 'Business Unit Logo'}
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-lg object-contain bg-slate-800 p-1 border border-slate-700 shadow"
                />
              ) : (
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold shadow text-xs"
                  style={{
                    backgroundColor: branding?.primaryColor || '#2563eb',
                  }}
                >
                  {currentBU?.code || 'IT'}
                </div>
              )}

              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-base font-bold text-white tracking-tight">
                    {branding?.welcomeBannerTitle?.split('•')[0] || currentBU?.name || 'IT Support Desk'}
                  </h1>
                  <span
                    className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider"
                    style={{
                      backgroundColor: `${branding?.accentColor || '#3b82f6'}25`,
                      color: branding?.accentColor || '#60a5fa',
                      border: `1px solid ${branding?.accentColor || '#3b82f6'}50`,
                    }}
                  >
                    {currentBU?.code || 'v2.4 Business Unit'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 hidden md:block truncate max-w-sm">
                  {branding?.welcomeBannerSubtitle || 'CCEC • F&B • HOTEL • KLBS • KLW • UOA HQ'}
                </p>
              </div>
            </div>

            {/* Scoped Business Unit Pill */}
            <div
              id="header-bu-pill"
              className="hidden lg:flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-200"
            >
              {getBUIcon(currentBU?.code)}
              <span className="font-medium">
                {currentUser.role === 'ADMIN'
                  ? 'All Business Units (CCEC, FNB, HOTEL, KLBS, KLW, UOA HQ)'
                  : currentBU?.name}
              </span>
            </div>
          </div>

          {/* Right: Actions & User Switcher */}
          <div className="flex items-center space-x-3">
            {/* Git Workflow Guide Button */}
            <button
              id="btn-git-guide"
              onClick={onOpenGitGuide}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="View step-by-step Git commands"
            >
              <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Git Commands</span>
            </button>

            {/* Portal Branding Customization Button (Global Admin only) */}
            {currentUser.role === 'ADMIN' && onOpenBranding && (
              <button
                id="btn-open-branding"
                onClick={onOpenBranding}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                title="Customize Portal Branding, Logo & Colors (Admin Exclusive)"
              >
                <Palette className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">Branding</span>
              </button>
            )}

            {/* IT/Admin User Management & Registration */}
            {(currentUser.role === 'ADMIN' || currentUser.role === 'IT') && (
              <button
                id="btn-open-user-management"
                onClick={onOpenUserManagement}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              >
                <UserPlus className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden md:inline">
                  {currentUser.role === 'ADMIN' ? 'Manage Users' : 'Register User'}
                </span>
              </button>
            )}

            {/* New Ticket Creation Button */}
            <button
              id="btn-open-create-ticket"
              onClick={onOpenCreateTicket}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Ticket</span>
            </button>

            {/* Active User Avatar & Role Switch Dropdown */}
            <div className="relative">
              <button
                id="btn-user-switcher-toggle"
                onClick={() => setShowSwitchMenu(!showSwitchMenu)}
                className="flex items-center space-x-2 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-left border border-slate-700 transition"
              >
                <img
                  src={
                    currentUser.avatarUrl ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.username}`
                  }
                  alt={currentUser.fullName}
                  className="w-7 h-7 rounded-full object-cover bg-slate-700 border border-slate-600"
                />
                <div className="hidden sm:block text-left pr-1">
                  <div className="text-xs font-bold text-slate-200 line-clamp-1">
                    {currentUser.fullName.split(' ')[0]}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {currentUser.role}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Role Switcher Menu */}
              {showSwitchMenu && (
                <div
                  id="dropdown-user-switcher"
                  className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2"
                >
                  <div className="px-3 py-2 border-b border-slate-100">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Current Account
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-1">
                      {currentUser.fullName}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      {renderRoleBadge()}
                    </div>
                  </div>

                  <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Switch Persona (RBAC Testing)
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-1 px-1">
                    {SEED_USERS.map((user) => {
                      const bu = businessUnits.find((b) => b.id === user.businessUnitId);
                      const isSelected = user.id === currentUser.id;

                      return (
                        <button
                          key={user.id}
                          id={`switch-user-${user.username}`}
                          onClick={() => {
                            onSwitchUser(user);
                            setShowSwitchMenu(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition ${
                            isSelected
                              ? 'bg-blue-50 border border-blue-200 text-blue-900 font-semibold'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <img
                              src={
                                user.avatarUrl ||
                                `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`
                              }
                              alt={user.fullName}
                              className="w-6 h-6 rounded-full"
                            />
                            <div>
                              <div className="font-medium text-slate-900">
                                {user.fullName}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {user.role === 'ADMIN'
                                  ? 'Global Administrator'
                                  : `${user.role} • ${bu?.code}`}
                              </div>
                            </div>
                          </div>
                          {isSelected && (
                            <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold">
                              Active
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="border-t border-slate-100 pt-2 mt-1 px-2 space-y-1">
                    <button
                      id="btn-header-logout"
                      onClick={() => {
                        setShowSwitchMenu(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded-lg transition font-medium"
                    >
                      <LogOut className="w-3.5 h-3.5 text-slate-500" />
                      <span>Sign Out</span>
                    </button>

                    <button
                      id="btn-reset-demo-data"
                      onClick={() => {
                        onResetData();
                        setShowSwitchMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset All Data to Factory Seed</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Direct Sign Out Button */}
            <button
              id="btn-topbar-logout"
              onClick={onLogout}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
