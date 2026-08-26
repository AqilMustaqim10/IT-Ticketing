/**
 * @file TopBar.tsx
 * @description Minimal, clean top navigation bar.
 * Lightweight search, quick BU filter, and direct actions.
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
} from 'lucide-react';
import { User, BusinessUnit, DashboardFilterState } from '../types';
import { getBUTheme } from '../utils/themeUtils';
import { BUBadge } from './BUBadge';
import { postgresBridge, DbStatus } from '../services/postgresBridgeService';

interface TopBarProps {
  currentUser: User;
  businessUnits: BusinessUnit[];
  filters: DashboardFilterState;
  onFilterChange: (filters: DashboardFilterState) => void;
  onOpenMobileSidebar: () => void;
  onOpenCreateTicket: () => void;
  onExportPDF: () => void;
  onLogout?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentUser,
  businessUnits,
  filters,
  onFilterChange,
  onOpenMobileSidebar,
  onOpenCreateTicket,
  onExportPDF,
  onLogout,
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
    const res = await postgresBridge.syncAllToPostgres();
    setSyncing(false);
    if (res.success) {
      alert('Success: Local records synchronized directly to PostgreSQL database!');
      postgresBridge.checkStatus().then(setDbStatus);
    } else {
      alert(`PostgreSQL Sync Note: ${res.error || 'Check server connection'}`);
    }
  };

  return (
    <header
      id="app-topbar"
      className="sticky top-0 z-30 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between transition-all"
    >
      {/* Left: Mobile Menu & BU Selector */}
      <div className="flex items-center space-x-3">
        <button
          id="btn-open-mobile-sidebar"
          onClick={onOpenMobileSidebar}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 lg:hidden transition"
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
              className="appearance-none pl-7 pr-7 py-1 text-xs font-semibold rounded-lg bg-slate-100/80 hover:bg-slate-100 border border-slate-200 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer transition"
              title="Filter by Business Unit"
            >
              <option value="ALL">All Business Units (Group)</option>
              {businessUnits.map((bu) => (
                <option key={bu.id} value={bu.id}>
                  {bu.code} — {bu.name}
                </option>
              ))}
            </select>
            <Building2
              style={filters.businessUnitId !== 'ALL' ? { color: theme.primary } : undefined}
              className={`w-3.5 h-3.5 absolute left-2 pointer-events-none ${filters.businessUnitId === 'ALL' ? 'text-slate-500' : ''}`}
            />
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 pointer-events-none" />
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
                className="h-4 w-auto max-w-[48px] object-contain rounded-xs"
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

      {/* Center: Search Field */}
      <div className="hidden md:flex flex-1 max-w-sm mx-4">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="topbar-search-input"
            type="text"
            placeholder="Search tickets, subject, requester..."
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200/60 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 placeholder:text-slate-400 transition"
          />
        </div>
      </div>

      {/* Right: Actions & User Info */}
      <div className="flex items-center space-x-2">
        {/* DB Connection Indicator for Admins & IT */}
        {currentUser.role !== 'USER' && (
          <div className="hidden xl:flex items-center space-x-1.5 px-2 py-1 rounded-md text-[11px] bg-slate-100/90 border border-slate-200 text-slate-600">
            <Database className={`w-3.5 h-3.5 ${dbStatus?.connected ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span className="font-mono">{dbStatus?.connected ? 'PostgreSQL' : 'Local Storage'}</span>
            <button
              id="topbar-btn-sync-db"
              onClick={handleSyncToPostgres}
              disabled={syncing}
              title="Sync current records into PostgreSQL"
              className="p-0.5 ml-1 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-200 transition"
            >
              <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        )}

        <button
          id="topbar-btn-export-pdf"
          onClick={onExportPDF}
          className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-700 hover:bg-slate-100 border border-slate-200/80 transition cursor-pointer"
          title="Export Reports"
        >
          <FileDown className="w-3.5 h-3.5 text-slate-500" />
          <span>Reports</span>
        </button>

        <button
          id="topbar-btn-create-ticket"
          onClick={onOpenCreateTicket}
          style={{ backgroundColor: theme.primary }}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg text-white shadow-2xs transition hover:opacity-90 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Ticket</span>
        </button>

        <div className="hidden lg:flex items-center space-x-2 pl-2 border-l border-slate-200/80 text-xs">
          <div
            style={{
              backgroundColor: theme.bgLight,
              color: theme.primary,
              borderColor: theme.border,
            }}
            className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs border"
          >
            {currentUser.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="text-right">
            <span className="font-semibold text-slate-800 block text-xs leading-none">
              {currentUser.fullName}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {currentUser.role}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
