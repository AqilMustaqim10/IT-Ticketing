/**
 * @file StatCards.tsx
 * @description Sleek, unified, compact KPI metric overview for tickets.
 * Flat, minimalist layout that saves vertical screen space with clean typography.
 */

import React from 'react';
import {
  Inbox,
  AlertCircle,
  Clock,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { MetricSummary, TimeframeOption } from '../types';

interface StatCardsProps {
  metrics: MetricSummary;
  timeframe: TimeframeOption;
  activeStatus?: string;
  onFilterStatus?: (status: string) => void;
  onFilterPriority?: (priority: string) => void;
}

export const StatCards: React.FC<StatCardsProps> = ({
  metrics,
  timeframe,
  activeStatus = 'ALL',
  onFilterStatus,
}) => {
  const statItems = [
    {
      id: 'stat-total',
      label: 'Total Tickets',
      value: metrics.totalTickets,
      statusKey: 'ALL',
      dotColor: 'bg-slate-400',
      textColor: 'text-slate-900',
      icon: Inbox,
    },
    {
      id: 'stat-open',
      label: 'Open & Pending',
      value: metrics.openTickets,
      statusKey: 'OPEN',
      dotColor: 'bg-amber-500',
      textColor: 'text-amber-700',
      icon: AlertCircle,
    },
    {
      id: 'stat-inprogress',
      label: 'In Progress',
      value: metrics.inProgressTickets,
      statusKey: 'IN_PROGRESS',
      dotColor: 'bg-blue-500',
      textColor: 'text-blue-700',
      icon: Clock,
    },
    {
      id: 'stat-resolved',
      label: 'Resolved',
      value: metrics.resolvedTickets + metrics.closedTickets,
      statusKey: 'RESOLVED',
      dotColor: 'bg-emerald-500',
      textColor: 'text-emerald-700',
      icon: CheckCircle2,
    },
    {
      id: 'stat-rate',
      label: 'Resolution Rate',
      value: `${metrics.resolutionRate}%`,
      statusKey: null,
      dotColor: 'bg-purple-500',
      textColor: 'text-purple-700',
      icon: TrendingUp,
    },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-800 shadow-2xs overflow-hidden">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800">
        {statItems.map((item) => {
          const isInteractive = Boolean(item.statusKey && onFilterStatus);
          const isActive = item.statusKey && activeStatus === item.statusKey;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              id={item.id}
              type="button"
              disabled={!isInteractive}
              onClick={() => item.statusKey && onFilterStatus && onFilterStatus(item.statusKey)}
              className={`text-left p-3 sm:px-4 sm:py-3 transition-all relative ${
                isInteractive
                  ? 'hover:bg-slate-50/80 dark:hover:bg-slate-800/60 cursor-pointer'
                  : 'cursor-default'
              } ${isActive ? 'bg-slate-50/90 dark:bg-slate-800/90' : ''}`}
            >
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-500 rounded-full" />
              )}
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.dotColor}`} />
                  {item.label}
                </span>
                <Icon className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-xl font-bold tracking-tight ${item.textColor} ${
                  item.id === 'stat-total'
                    ? 'dark:text-slate-100'
                    : item.id === 'stat-open'
                    ? 'dark:text-amber-400'
                    : item.id === 'stat-inprogress'
                    ? 'dark:text-blue-400'
                    : item.id === 'stat-resolved'
                    ? 'dark:text-emerald-400'
                    : 'dark:text-purple-400'
                }`}>
                  {item.value}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

