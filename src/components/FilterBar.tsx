/**
 * @file FilterBar.tsx
 * @description Clean, minimalist filter bar for tickets.
 * Compact single or two-tier layout with search, timeframe selector, and clean dropdowns.
 */

import React from 'react';
import {
  Calendar,
  Building2,
  Filter,
  X,
  Lock,
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
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  businessUnits,
  departments,
  currentUser,
}) => {
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

  const hasActiveFilters =
    filters.status !== 'ALL' ||
    filters.priority !== 'ALL' ||
    filters.departmentId !== 'ALL' ||
    (currentUser.role === 'ADMIN' && filters.businessUnitId !== 'ALL') ||
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

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-2xs space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Timeframe pill selector */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 mr-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Range:</span>
          </div>
          <div className="inline-flex p-0.5 bg-slate-100/80 rounded-lg border border-slate-200/60">
            {timeframeOptions.map((opt) => {
              const active = filters.timeframe === opt.value;
              return (
                <button
                  key={opt.value}
                  id={`btn-timeframe-${opt.value.toLowerCase()}`}
                  onClick={() => handleTimeframeSelect(opt.value)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
                    active
                      ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Reset Filter Pill (if any active) */}
        {hasActiveFilters && (
          <button
            id="btn-reset-filters"
            onClick={resetAllFilters}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-rose-600 px-2 py-1 rounded-md hover:bg-slate-50 transition"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset filters</span>
          </button>
        )}
      </div>

      {/* Filter Selectors Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100">
        {/* 1. Business Unit Filter (Admin only) */}
        {currentUser.role === 'ADMIN' ? (
          <div>
            <select
              id="select-business-unit"
              value={filters.businessUnitId}
              onChange={(e) => handleBusinessUnitSelect(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
            >
              <option value="ALL">All Business Units</option>
              {businessUnits.map((bu) => (
                <option key={bu.id} value={bu.id}>
                  {bu.code} — {bu.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex items-center px-2.5 py-1.5 text-xs text-slate-600 bg-slate-50 rounded-lg border border-slate-200/60 font-medium truncate">
            <Lock className="w-3 h-3 text-slate-400 mr-1.5 shrink-0" />
            <span className="truncate">
              {businessUnits.find((b) => b.id === currentUser.businessUnitId)?.code || 'Unit'} Scoped
            </span>
          </div>
        )}

        {/* 2. Department Selector */}
        <div>
          <select
            id="select-department"
            value={filters.departmentId}
            onChange={(e) => onFilterChange({ ...filters, departmentId: e.target.value })}
            className="w-full text-xs rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
          >
            <option value="ALL">All Departments</option>
            {filteredDepartments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Status Selector */}
        <div>
          <select
            id="select-status"
            value={filters.status}
            onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
            className="w-full text-xs rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>

        {/* 4. Priority Selector */}
        <div>
          <select
            id="select-priority"
            value={filters.priority}
            onChange={(e) => onFilterChange({ ...filters, priority: e.target.value })}
            className="w-full text-xs rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>
    </div>
  );
};
