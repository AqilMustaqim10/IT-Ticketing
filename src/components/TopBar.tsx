/**
 * @file TopBar.tsx
 * @description Minimal, clean top navigation bar.
 * Lightweight search, quick BU context, database status, and responsive actions.
 */

import React, { useState, useEffect } from 'react';
import {
  Menu,
  Search,
  Plus,
  Building2,
  FileDown,
  ChevronDown,
  Database,
  RefreshCw,
  FlaskConical,
  ShieldCheck,
  Share2,
} from 'lucide-react';
import { User, BusinessUnit, DashboardFilterState, AppEnvironment } from '../types';
import { getBUTheme } from '../utils/themeUtils';
import { postgresBridge, DbStatus } from '../services/postgresBridgeService';
import { storageService } from '../services/storageService';

interface TopBarProps {
  currentUser: User;
  businessUnits: BusinessUnit[];
  filters: DashboardFilterState;
  currentEnvironment: AppEnvironment;
  onFilterChange: (filters: DashboardFilterState) => void;
  onOpenMobileSidebar: () => void;
  onOpenCreateTicket: () => void;
  onExportPDF: () => void;
  onOpenEnvironmentModal: () => void;
  onOpenShareModal: () => void;
  onLogout?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentUser,
  businessUnits,
  filters,
  currentEnvironment,
  onFilterChange,
  onOpenMobileSidebar,
  onOpenCreateTicket,
  onExportPDF,
  onOpenEnvironmentModal,
  onOpenShareModal,
}) => {
  // Determine the active BU context (from filters for Admin, or currentUser's BU for staff)
  const activeBUId = currentUser.role === 'ADMIN' && filters.businessUnitId !== 'ALL'
    ? filters.businessUnitId
    : currentUser.businessUnitId;
  const currentBU = businessUnits.find((b) => b.id === activeBUId);
  const theme = getBUTheme(currentBU, businessUnits);

  const [dbStatus, setDbStatus] = useState<DbStatus | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    postgresBridge.checkStatus().then(setDbStatus);
  }, []);

  const handleBUChange = (newBuId: string) => {
    onFilterChange({
      ...filters,
      businessUnitId: newBuId,
      departmentId: 'ALL',
    });
  };

  const handleSyncToPostgres = async () => {
    if (syncing) return;
    setSyncing(true);
    const loaded = await storageService.loadFromPostgres();
    setSyncing(false);
    if (loaded) {
      window.location.reload();
    } else {
      const res = await postgresBridge.syncAllToPostgres();
      if (res.success) {
        alert('Synchronized directly with PostgreSQL database!');
        window.location.reload();
      }
    }
  };

  return (
    <header
      id="app-topbar"
      className="sticky top-0 z-30 h-14 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/70 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between transition-all"
    >
      {/* Left: Mobile Menu & BU Context */}
      <div className="flex items-center space-x-3">
        <button
          id="btn-open-mobile-sidebar"
          onClick={onOpenMobileSidebar}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden transition cursor-pointer"
          aria-label="Open Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {currentUser.role === 'ADMIN' ? (
          <div className="relative flex items-center">
            <select
              id="topbar-select-business-unit"
              value={filters.businessUnitId}
              onChange={(e) => handleBUChange(e.target.value)}
              style={filters.businessUnitId !== 'ALL' ? {
                backgroundColor: theme.bgLight,
                borderColor: theme.border,
                color: theme.primary,
              } : undefined}
              className="appearance-none pl-7 pr-7 py-1 text-xs font-semibold rounded-lg bg-slate-100/80 hover:bg-slate-100 dark:bg-slate-800/90 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer transition"
              title="Select Business Unit Scope"
            >
              <option value="ALL" className="dark:bg-slate-800 dark:text-slate-100">All Business Units (Group)</option>
              {businessUnits.map((bu) => (
                <option key={bu.id} value={bu.id} className="dark:bg-slate-800 dark:text-slate-100">
                  {bu.code} — {bu.name}
                </option>
              ))}
            </select>
            <Building2
              style={filters.businessUnitId !== 'ALL' ? { color: theme.primary } : undefined}
              className={`w-3.5 h-3.5 absolute left-2 pointer-events-none ${filters.businessUnitId === 'ALL' ? 'text-slate-500 dark:text-slate-400' : ''}`}
            />
            <ChevronDown className="w-3 h-3 text-slate-400 dark:text-slate-400 absolute right-2 pointer-events-none" />
          </div>
        ) : (
          <div
            id="topbar-scope-badge"
            style={{
              backgroundColor: theme.bgLight,
              borderColor: theme.border,
              color: theme.primary,
            }}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border font-medium text-xs shadow-2xs"
          >
            {currentBU?.branding?.logoUrl ? (
              <img
                src={currentBU.branding.logoUrl}
                alt={currentBU.code}
                referrerPolicy="no-referrer"
                className="h-4 w-auto max-w-[48px] object-contain rounded-xs bg-white dark:bg-slate-800 p-0.5"
              />
            ) : (
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: theme.primary }}
              />
            )}
            <span className="font-semibold">{currentBU?.code || 'Business Unit'}</span>
          </div>
        )}
      </div>

      {/* Right: Environment Switcher, Share, DB status & Actions */}
      <div className="flex items-center space-x-2">
        {/* Environment Pill / Switcher */}
        <button
          id="topbar-btn-environment"
          type="button"
          onClick={onOpenEnvironmentModal}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition border shadow-2xs cursor-pointer ${
            currentEnvironment === 'UAT'
              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40'
              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
          }`}
          title={`Active Mode: ${currentEnvironment}. Click to switch between UAT Sandbox & Production`}
        >
          {currentEnvironment === 'UAT' ? (
            <FlaskConical className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          ) : (
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          )}
          <span className="hidden xs:inline">
            {currentEnvironment === 'UAT' ? 'UAT' : 'Prod'}
          </span>
          <span className="hidden sm:inline font-normal text-[10px] opacity-80">
            {currentEnvironment === 'UAT' ? '(Sandbox)' : '(Live)'}
          </span>
        </button>

        {/* Share App CTA with friends */}
        <button
          id="topbar-btn-share"
          type="button"
          onClick={onOpenShareModal}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 transition cursor-pointer shadow-2xs"
          title="Share Desk with Friends & Colleagues (Live link, QR code, and Localhost guide)"
        >
          <Share2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span className="hidden sm:inline">Share</span>
        </button>

        {/* DB Connection Indicator for Admins & IT */}
        {currentUser.role !== 'USER' && (
          <div className="hidden sm:flex items-center space-x-1.5 px-2 py-1 rounded-md text-[11px] bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700 text-slate-600 dark:text-slate-300">
            <Database className={`w-3 h-3 ${dbStatus?.connected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
            <span className="font-mono text-[10px]">{dbStatus?.connected ? 'PostgreSQL' : 'Local'}</span>
            <button
              id="topbar-btn-sync-db"
              onClick={handleSyncToPostgres}
              disabled={syncing}
              title="Sync current records with database"
              className="p-0.5 ml-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              <RefreshCw className={`w-2.5 h-2.5 ${syncing ? 'animate-spin text-blue-600 dark:text-blue-400' : ''}`} />
            </button>
          </div>
        )}

        {currentUser.role !== 'USER' && (
          <button
            id="topbar-btn-export-pdf"
            onClick={onExportPDF}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 transition cursor-pointer"
            title="Reports & Audit Center"
          >
            <FileDown className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="hidden sm:inline">Reports</span>
          </button>
        )}

        {/* Mobile/Compact New Ticket CTA (Sidebar CTA handles large desktop view) */}
        <button
          id="topbar-btn-create-ticket"
          onClick={onOpenCreateTicket}
          style={{ backgroundColor: theme.primary }}
          className="lg:hidden inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-white shadow-2xs transition hover:opacity-90 cursor-pointer"
          title="Create New Ticket"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New</span>
        </button>
      </div>
    </header>
  );
};

