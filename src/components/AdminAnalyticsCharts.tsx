/**
 * @file AdminAnalyticsCharts.tsx
 * @description Compact 2-chart visualization card for Admins with filter controls.
 * Contains:
 * 1. Bar Chart: Tickets by Business Unit (or by Department when a BU is selected)
 * 2. Donut Chart: Ticket Status Breakdown (Open, In Progress, Resolved, Closed)
 * Filters: Business Unit dropdown and Timeframe selector.
 */

import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { BarChart3, Filter } from 'lucide-react';
import { Ticket, BusinessUnit, Department, User } from '../types';

interface AdminAnalyticsChartsProps {
  tickets: Ticket[];
  businessUnits: BusinessUnit[];
  departments: Department[];
  currentUser: User;
  onFilterStatus?: (status: string) => void;
  onFilterBU?: (buId: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: '#f59e0b', // Amber
  IN_PROGRESS: '#3b82f6', // Blue
  RESOLVED: '#10b981', // Emerald
  CLOSED: '#64748b', // Slate
};

export const AdminAnalyticsCharts: React.FC<AdminAnalyticsChartsProps> = ({
  tickets,
  businessUnits,
  departments,
  onFilterStatus,
  onFilterBU,
}) => {
  const [selectedBU, setSelectedBU] = useState<string>('ALL');
  const [selectedTimeRange, setSelectedTimeRange] = useState<'all' | '30d' | '7d'>('all');

  // Filter tickets by both Business Unit and Timeframe
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      // BU Filter
      if (selectedBU !== 'ALL' && t.businessUnitId !== selectedBU) {
        return false;
      }
      // Timeframe Filter
      if (selectedTimeRange !== 'all') {
        const days = selectedTimeRange === '7d' ? 7 : 30;
        const threshold = Date.now() - days * 24 * 60 * 60 * 1000;
        const created = new Date(t.createdAt).getTime();
        if (isNaN(created) || created < threshold) {
          return false;
        }
      }
      return true;
    });
  }, [tickets, selectedBU, selectedTimeRange]);

  // Chart 1 Data: Tickets by Business Unit (or by Department if a specific BU is selected)
  const barChartData = useMemo(() => {
    if (selectedBU === 'ALL') {
      return businessUnits.map((bu) => {
        const buTickets = filteredTickets.filter((t) => t.businessUnitId === bu.id);
        return {
          id: bu.id,
          name: bu.code,
          fullName: bu.name,
          total: buTickets.length,
          open: buTickets.filter((t) => t.status === 'OPEN').length,
          resolved: buTickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length,
        };
      });
    } else {
      // Show departments under the selected BU
      const buDepts = departments.filter((d) => d.businessUnitId === selectedBU);
      return buDepts.map((d) => {
        const deptTickets = filteredTickets.filter((t) => t.departmentId === d.id);
        return {
          id: d.id,
          name: d.code || d.name.slice(0, 8),
          fullName: d.name,
          total: deptTickets.length,
          open: deptTickets.filter((t) => t.status === 'OPEN').length,
          resolved: deptTickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length,
        };
      });
    }
  }, [selectedBU, businessUnits, departments, filteredTickets]);

  // Chart 2 Data: Status Distribution Donut
  const statusChartData = useMemo(() => {
    const counts = {
      OPEN: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
      CLOSED: 0,
    };
    filteredTickets.forEach((t) => {
      if (counts[t.status] !== undefined) {
        counts[t.status]++;
      }
    });

    return [
      { name: 'Open', key: 'OPEN', value: counts.OPEN, color: STATUS_COLORS.OPEN },
      { name: 'In Progress', key: 'IN_PROGRESS', value: counts.IN_PROGRESS, color: STATUS_COLORS.IN_PROGRESS },
      { name: 'Resolved', key: 'RESOLVED', value: counts.RESOLVED, color: STATUS_COLORS.RESOLVED },
      { name: 'Closed', key: 'CLOSED', value: counts.CLOSED, color: STATUS_COLORS.CLOSED },
    ].filter((item) => item.value > 0);
  }, [filteredTickets]);

  const totalCount = filteredTickets.length;
  const resolvedCount = filteredTickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
  const openCount = filteredTickets.filter((t) => t.status === 'OPEN').length;

  return (
    <div
      id="admin-analytics-2-charts"
      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs space-y-4"
    >
      {/* Header & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">Admin Overview</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {totalCount} total &bull; {openCount} open &bull; {resolvedCount} resolved
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Business Unit Selector */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              id="filter-analytics-bu"
              value={selectedBU}
              onChange={(e) => {
                setSelectedBU(e.target.value);
                if (onFilterBU && e.target.value !== 'ALL') {
                  onFilterBU(e.target.value);
                }
              }}
              className="text-xs font-medium px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">All Business Units</option>
              {businessUnits.map((bu) => (
                <option key={bu.id} value={bu.id}>
                  {bu.code} - {bu.name}
                </option>
              ))}
            </select>
          </div>

          {/* Timeframe Selector */}
          <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setSelectedTimeRange('all')}
              className={`px-2 py-0.5 font-medium rounded-md transition cursor-pointer text-[11px] ${
                selectedTimeRange === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              All Time
            </button>
            <button
              type="button"
              onClick={() => setSelectedTimeRange('30d')}
              className={`px-2 py-0.5 font-medium rounded-md transition cursor-pointer text-[11px] ${
                selectedTimeRange === '30d'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              30 Days
            </button>
            <button
              type="button"
              onClick={() => setSelectedTimeRange('7d')}
              className={`px-2 py-0.5 font-medium rounded-md transition cursor-pointer text-[11px] ${
                selectedTimeRange === '7d'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              7 Days
            </button>
          </div>
        </div>
      </div>

      {/* Exactly 2 Clean Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Chart 1: Ticket Volume Bar Chart */}
        <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {selectedBU === 'ALL' ? 'Tickets by Business Unit' : 'Tickets by Department'}
            </span>
            <span className="text-[10px] text-slate-400">Total volume</span>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barChartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.2} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="p-2 bg-slate-900 text-white rounded text-xs border border-slate-700 shadow-sm">
                          <div className="font-bold text-blue-300">{data.fullName}</div>
                          <div>Total: {data.total} tickets</div>
                          <div className="text-amber-400">Open: {data.open}</div>
                          <div className="text-emerald-400">Resolved: {data.resolved}</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="total" name="Total Tickets" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Status Breakdown Donut Chart */}
        <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Tickets by Status
            </span>
            <span className="text-[10px] text-slate-400">Current state</span>
          </div>

          <div className="h-52 w-full flex items-center justify-center">
            {statusChartData.length === 0 ? (
              <div className="text-xs text-slate-400">No tickets found for filter</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    innerRadius={45}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusChartData.map((entry) => (
                      <Cell key={`cell-${entry.key}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        const pct = totalCount > 0 ? Math.round((d.value / totalCount) * 100) : 0;
                        return (
                          <div className="p-2 bg-slate-900 text-white rounded text-xs">
                            <div className="font-bold">{d.name}</div>
                            <div>{d.value} tickets ({pct}%)</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11, paddingTop: '4px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
