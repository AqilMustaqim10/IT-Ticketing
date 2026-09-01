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
} from 'lucide-react';
import { User, BusinessUnit, DashboardFilterState } from '../types';
import { getBUTheme } from '../utils/themeUtils';
import { postgresBridge, DbStatus } from '../services/postgresBridgeService';
import { storageService } from '../services/storageService';

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
      className="sticky top-0 z-30 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/70 px-4 sm:px-6 flex items-center justify-between transition-all"
    >
      {/* Left: Mobile Menu & BU Context */}
      <div className="flex items-center space-x-3">
        <button
          id="btn-open-mobile-sidebar"
          onClick={onOpenMobileSidebar}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 lg:hidden transition cursor-pointer"
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
              className="appearance-none pl-7 pr-7 py-1 text-xs font-semibold rounded-lg bg-slate-100/80 hover:bg-slate-100 border border-slate-200/80 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer transition"
              title="Select Business Unit Scope"
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

      {/* Right: DB status & Actions */}
      <div className="flex items-center space-x-2">
        {/* DB Connection Indicator for Admins & IT */}
        {currentUser.role !== 'USER' && (
          <div className="hidden sm:flex items-center space-x-1.5 px-2 py-1 rounded-md text-[11px] bg-slate-50 border border-slate-200/70 text-slate-600">
            <Database className={`w-3 h-3 ${dbStatus?.connected ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span className="font-mono text-[10px]">{dbStatus?.connected ? 'PostgreSQL' : 'Local'}</span>
            <button
              id="topbar-btn-sync-db"
              onClick={handleSyncToPostgres}
              disabled={syncing}
              title="Sync current records with database"
              className="p-0.5 ml-0.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200 transition cursor-pointer"
            >
              <RefreshCw className={`w-2.5 h-2.5 ${syncing ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        )}

        {currentUser.role !== 'USER' && (
          <button
            id="topbar-btn-export-pdf"
            onClick={onExportPDF}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-700 hover:bg-slate-100 border border-slate-200/80 transition cursor-pointer"
            title="Reports & Audit Center"
          >
            <FileDown className="w-3.5 h-3.5 text-slate-500" />
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

