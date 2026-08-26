/**
 * @file StatCards.tsx
 * @description Minimal, executive KPI metric cards for ticket overview.
 * Clean typography, subtle borders, and distraction-free layout.
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
  onFilterStatus?: (status: string) => void;
  onFilterPriority?: (priority: string) => void;
}

export const StatCards: React.FC<StatCardsProps> = ({
  metrics,
  timeframe,
  onFilterStatus,
}) => {
  const getTimeframeLabel = () => {
    switch (timeframe) {
      case 'DAILY':
        return 'Today';
      case 'WEEKLY':
        return '7 Days';
      case 'MONTHLY':
        return '30 Days';
      case 'YEARLY':
        return 'This Year';
    }
  };

  const statItems = [
    {
      id: 'stat-card-total',
      label: 'Total Tickets',
      value: metrics.totalTickets,
      sub: `${getTimeframeLabel()} volume`,
      icon: Inbox,
      iconColor: 'text-slate-600',
      iconBg: 'bg-slate-100',
      onClick: () => onFilterStatus && onFilterStatus('ALL'),
    },
    {
      id: 'stat-card-open',
      label: 'Open & Pending',
      value: metrics.openTickets,
      sub: 'Needs action',
      icon: AlertCircle,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-50',
      onClick: () => onFilterStatus && onFilterStatus('OPEN'),
    },
    {
      id: 'stat-card-inprogress',
      label: 'In Progress',
      value: metrics.inProgressTickets,
      sub: 'Being handled',
      icon: Clock,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
      onClick: () => onFilterStatus && onFilterStatus('IN_PROGRESS'),
    },
    {
      id: 'stat-card-resolved',
      label: 'Resolved',
      value: metrics.resolvedTickets + metrics.closedTickets,
      sub: 'Completed',
      icon: CheckCircle2,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
      onClick: () => onFilterStatus && onFilterStatus('RESOLVED'),
    },
    {
      id: 'stat-card-rate',
      label: 'Resolution Rate',
      value: `${metrics.resolutionRate}%`,
      sub: 'Efficiency',
      icon: TrendingUp,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-50',
      onClick: undefined,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {statItems.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.id}
            id={item.id}
            onClick={item.onClick}
            className={`bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs transition-all ${
              item.onClick
                ? 'hover:border-slate-300 hover:shadow-xs cursor-pointer'
                : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                {item.label}
              </span>
              <div className={`p-1.5 rounded-lg ${item.iconBg} ${item.iconColor}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-slate-900 tracking-tight">
                {item.value}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400 truncate">
              {item.sub}
            </p>
          </div>
        );
      })}
    </div>
  );
};
