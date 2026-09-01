/**
 * @file FilterBar.tsx
 * @description Streamlined, modern filter bar for tickets.
 * Essential search and quick filters visible with a collapsible advanced filters panel and active chips.
 */

import React, { useState } from 'react';
import {
  Calendar,
  Building2,
  Filter,
  X,
  Lock,
  ChevronDown,
  ChevronUp,
  Search,
  SlidersHorizontal,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';
import {
  DashboardFilterState,
  TimeframeOption,
  BusinessUnit,
  Department,
  User,
} from '../types';

interface FilterBarProps {
  filters: DashboardFilterState;
  onFilterChange: (newFilters: DashboardFilterState) => void;
  businessUnits: BusinessUnit[];
  departments: Department[];
  currentUser: User;
  onExportPDF?: () => void;
  isExportingPDF?: boolean;
  onRefresh?: () => void;
  isSyncing?: boolean;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  businessUnits,
  departments,
  currentUser,
  onExportPDF,
  isExportingPDF,
  onRefresh,
  isSyncing = false,
}) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const timeframeOptions: { label: string; value: TimeframeOption }[] = [
    { label: 'Today', value: 'DAILY' },
    { label: '7d', value: 'WEEKLY' },
    { label: '30d', value: 'MONTHLY' },
    { label: 'Year', value: 'YEARLY' },
  ];

  const handleTimeframeSelect = (timeframe: TimeframeOption) => {
    onFilterChange({ ...filters, timeframe });
  };

  const handleBusinessUnitSelect = (buId: string) => {
    onFilterChange({ ...filters, businessUnitId: buId, departmentId: 'ALL' });
  };

  const activeBUId =
    currentUser.role === 'ADMIN' ? filters.businessUnitId : currentUser.businessUnitId;
  const filteredDepartments = departments.filter(
    (d) => activeBUId === 'ALL' || d.businessUnitId === activeBUId
  );

  // Count active non-default secondary filters
  const activeSecondaryCount = [
    filters.departmentId !== 'ALL',
    filters.priority !== 'ALL',
    filters.status !== 'ALL',
    currentUser.role === 'ADMIN' && filters.businessUnitId !== 'ALL',
    filters.timeframe !== 'MONTHLY',
  ].filter(Boolean).length;

  const hasActiveFilters =
    filters.status !== 'ALL' ||
    filters.priority !== 'ALL' ||
    filters.departmentId !== 'ALL' ||
    (currentUser.role === 'ADMIN' && filters.businessUnitId !== 'ALL') ||
    filters.timeframe !== 'MONTHLY' ||
    Boolean(filters.searchQuery);

  const resetAllFilters = () => {
    onFilterChange({
      timeframe: 'MONTHLY',
      businessUnitId: currentUser.role === 'ADMIN' ? 'ALL' : currentUser.businessUnitId,
      departmentId: 'ALL',
      status: 'ALL',
      priority: 'ALL',
      searchQuery: '',
      assignedToId: 'ALL',
    });
  };

  const selectedBU = businessUnits.find((b) => b.id === filters.businessUnitId);
  const selectedDept = departments.find((d) => d.id === filters.departmentId);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-800 p-3 shadow-2xs space-y-2.5">
      {/* Primary Bar: Search, Manual Refresh, Quick Status / Timeframe, and Filter Toggle */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        {/* Search Field & Refresh Button */}
        <div className="flex items-center gap-1.5 flex-1">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="filterbar-search-input"
              type="text"
              placeholder="Search tickets, subject, requester, department..."
              value={filters.searchQuery}
              onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
              className="w-full pl-8 pr-8 py-1.5 text-xs rounded-lg bg-slate-50 hover:bg-slate-100/60 dark:bg-slate-800/80 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 border border-slate-200/70 dark:border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition"
            />
            {filters.searchQuery && (
              <button
                onClick={() => onFilterChange({ ...filters, searchQuery: '' })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {onRefresh && (
            <button
              id="btn-filterbar-manual-refresh"
              type="button"
              onClick={onRefresh}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer shrink-0 disabled:opacity-50"
              title="Sync ticket list with PostgreSQL database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`} />
              <span className="hidden md:inline">{isSyncing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          )}
        </div>

        {/* Quick Actions: Timeframe & Collapsible Filter Toggle */}
        <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0">
          <div className="inline-flex p-0.5 bg-slate-100/80 dark:bg-slate-800 rounded-lg border border-slate-200/60 dark:border-slate-700">
            {timeframeOptions.map((opt) => {
              const active = filters.timeframe === opt.value;
              return (
                <button
                  key={opt.value}
                  id={`btn-timeframe-${opt.value.toLowerCase()}`}
                  onClick={() => handleTimeframeSelect(opt.value)}
                  className={`px-2 py-1 text-[11px] font-medium rounded-md transition cursor-pointer ${
                    active
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold shadow-2xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <button
            id="btn-toggle-advanced-filters"
            type="button"
            onClick={() => setIsAdvancedOpen((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition cursor-pointer ${
              isAdvancedOpen || activeSecondaryCount > 0
                ? 'bg-blue-50/80 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeSecondaryCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                {activeSecondaryCount}
              </span>
            )}
            {isAdvancedOpen ? (
              <ChevronUp className="w-3 h-3 text-slate-400" />
            ) : (
              <ChevronDown className="w-3 h-3 text-slate-400" />
            )}
          </button>
        </div>
      </div>

      {/* Collapsible Secondary Filters Drawer */}
      {isAdvancedOpen && (
        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* 1. Business Unit Filter (Admin only) */}
          {currentUser.role === 'ADMIN' ? (
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Business Unit
              </label>
              <select
                id="select-business-unit"
                value={filters.businessUnitId}
                onChange={(e) => handleBusinessUnitSelect(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-750 focus:bg-white dark:focus:bg-slate-800 px-2.5 py-1.5 text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
              >
                <option value="ALL" className="dark:bg-slate-800 dark:text-slate-100">All Business Units</option>
                {businessUnits.map((bu) => (
                  <option key={bu.id} value={bu.id} className="dark:bg-slate-800 dark:text-slate-100">
                    {bu.code} — {bu.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Scope
              </label>
              <div className="flex items-center px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200/60 dark:border-slate-700 font-medium truncate">
                <Lock className="w-3 h-3 text-slate-400 mr-1.5 shrink-0" />
                <span className="truncate">
                  {businessUnits.find((b) => b.id === currentUser.businessUnitId)?.code || 'Unit'} Scoped
                </span>
              </div>
            </div>
          )}

          {/* 2. Department Selector */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Department
            </label>
            <select
              id="select-department"
              value={filters.departmentId}
              onChange={(e) => onFilterChange({ ...filters, departmentId: e.target.value })}
              className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-750 focus:bg-white dark:focus:bg-slate-800 px-2.5 py-1.5 text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
            >
              <option value="ALL" className="dark:bg-slate-800 dark:text-slate-100">All Departments</option>
              {filteredDepartments.map((dept) => (
                <option key={dept.id} value={dept.id} className="dark:bg-slate-800 dark:text-slate-100">
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Status Selector */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Status
            </label>
            <select
              id="select-status"
              value={filters.status}
              onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
              className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-750 focus:bg-white dark:focus:bg-slate-800 px-2.5 py-1.5 text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
            >
              <option value="ALL" className="dark:bg-slate-800 dark:text-slate-100">All Statuses</option>
              <option value="OPEN" className="dark:bg-slate-800 dark:text-slate-100">Open</option>
              <option value="IN_PROGRESS" className="dark:bg-slate-800 dark:text-slate-100">In Progress</option>
              <option value="RESOLVED" className="dark:bg-slate-800 dark:text-slate-100">Resolved</option>
              <option value="CLOSED" className="dark:bg-slate-800 dark:text-slate-100">Closed</option>
            </select>
          </div>

          {/* 4. Priority Selector */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Priority
            </label>
            <select
              id="select-priority"
              value={filters.priority}
              onChange={(e) => onFilterChange({ ...filters, priority: e.target.value })}
              className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-750 focus:bg-white dark:focus:bg-slate-800 px-2.5 py-1.5 text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
            >
              <option value="ALL" className="dark:bg-slate-800 dark:text-slate-100">All Priorities</option>
              <option value="URGENT" className="dark:bg-slate-800 dark:text-slate-100">Urgent</option>
              <option value="HIGH" className="dark:bg-slate-800 dark:text-slate-100">High</option>
              <option value="MEDIUM" className="dark:bg-slate-800 dark:text-slate-100">Medium</option>
              <option value="LOW" className="dark:bg-slate-800 dark:text-slate-100">Low</option>
            </select>
          </div>
        </div>
      )}

      {/* Dismissible Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mr-0.5">Active:</span>

          {currentUser.role === 'ADMIN' && filters.businessUnitId !== 'ALL' && selectedBU && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-medium border border-slate-200 dark:border-slate-700">
              Unit: {selectedBU.code}
              <button
                onClick={() => handleBusinessUnitSelect('ALL')}
                className="hover:text-rose-600 dark:hover:text-rose-400 ml-0.5 cursor-pointer"
                title="Remove unit filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.departmentId !== 'ALL' && selectedDept && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-medium border border-slate-200 dark:border-slate-700">
              Dept: {selectedDept.name}
              <button
                onClick={() => onFilterChange({ ...filters, departmentId: 'ALL' })}
                className="hover:text-rose-600 dark:hover:text-rose-400 ml-0.5 cursor-pointer"
                title="Remove department filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.status !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-medium border border-slate-200 dark:border-slate-700">
              Status: {filters.status.replace('_', ' ')}
              <button
                onClick={() => onFilterChange({ ...filters, status: 'ALL' })}
                className="hover:text-rose-600 dark:hover:text-rose-400 ml-0.5 cursor-pointer"
                title="Remove status filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.priority !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-medium border border-slate-200 dark:border-slate-700">
              Priority: {filters.priority}
              <button
                onClick={() => onFilterChange({ ...filters, priority: 'ALL' })}
                className="hover:text-rose-600 dark:hover:text-rose-400 ml-0.5 cursor-pointer"
                title="Remove priority filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <button
            id="btn-reset-filters"
            onClick={resetAllFilters}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 px-1.5 py-0.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition ml-auto cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear all</span>
          </button>
        </div>
      )}
    </div>
  );
};

