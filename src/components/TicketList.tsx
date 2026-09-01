/**
 * @file TicketList.tsx
 * @description Minimal, high-clarity support ticket registry.
 * Clean modern list design with subtle badges, clear hierarchy, and smooth interactions.
 */

import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Building2,
  Calendar,
  ChevronRight,
  UserCheck,
  Trash2,
  Database,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { Ticket, TicketPriority, TicketStatus, BusinessUnit, Department, User } from '../types';
import { getBUTheme } from '../utils/themeUtils';
import { BUBadge } from './BUBadge';
import { ConfirmModal } from './ConfirmModal';

interface TicketListProps {
  tickets: Ticket[];
  businessUnits: BusinessUnit[];
  departments: Department[];
  allUsers: User[];
  currentUser: User;
  onSelectTicket: (ticket: Ticket) => void;
  onDeleteTicket?: (ticketId: string) => void;
  lastSyncedAt?: Date;
  isSyncing?: boolean;
  onRefresh?: () => void;
}

export const TicketList: React.FC<TicketListProps> = ({
  tickets,
  businessUnits,
  departments,
  allUsers,
  currentUser,
  onSelectTicket,
  onDeleteTicket,
  lastSyncedAt,
  isSyncing = false,
  onRefresh,
}) => {
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
  const [, setTick] = useState(0);

  // Periodic tick to keep the 'Last synced' relative time text fresh
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const formatSyncTime = (date?: Date) => {
    if (!date) return 'Just now';
    const now = new Date();
    const diffSec = Math.max(0, Math.round((now.getTime() - date.getTime()) / 1000));
    if (diffSec < 10) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.round(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  // Minimal Priority Badge
  const renderPriorityBadge = (priority: TicketPriority) => {
    switch (priority) {
      case 'URGENT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800">
            Urgent
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800">
            High
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800">
            Medium
          </span>
        );
      case 'LOW':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
            Low
          </span>
        );
    }
  };

  // Minimal Status Badge
  const renderStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Open
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            In Progress
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Resolved
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Closed
          </span>
        );
    }
  };

  const formatTimeAgo = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffHours = Math.round((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.round(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (tickets.length === 0) {
    return (
      <div
        id="tickets-empty-state"
        className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-10 text-center shadow-2xs space-y-3"
      >
        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-400 mx-auto flex items-center justify-center mb-1">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">No tickets found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
            No support requests match your current filters. Try changing search criteria or sync with the database.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {lastSyncedAt && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <Database className="w-3 h-3 text-slate-400" />
              <span>Last synced: <strong>{formatSyncTime(lastSyncedAt)}</strong></span>
            </div>
          )}

          {onRefresh && (
            <button
              id="btn-empty-state-refresh"
              type="button"
              onClick={onRefresh}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200/80 dark:border-blue-800 rounded-lg transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600 dark:text-blue-400' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync with Database'}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div className="flex items-center flex-wrap gap-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Tickets ({tickets.length})
          </h2>

          {/* Database Sync Visual Indicator */}
          {lastSyncedAt && (
            <div
              id="ticketlist-sync-indicator"
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 shadow-2xs"
              title={`Last synced with database at ${lastSyncedAt.toLocaleTimeString()}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full bg-emerald-500 ${isSyncing ? 'animate-ping' : ''}`} />
              <Database className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>Synced with database: <strong className="font-semibold">{formatSyncTime(lastSyncedAt)}</strong></span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 text-[11px] text-slate-400 dark:text-slate-500 self-start sm:self-auto">
          {onRefresh && (
            <button
              id="btn-ticketlist-refresh"
              type="button"
              onClick={onRefresh}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200/80 dark:border-slate-700 px-2.5 py-1 rounded-lg transition shadow-2xs cursor-pointer disabled:opacity-50"
              title="Sync ticket list with PostgreSQL database"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          )}
          <span>Sorted by newest</span>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-2xs">
        {tickets.map((ticket) => {
          const bu = businessUnits.find((b) => b.id === ticket.businessUnitId);
          const buTheme = getBUTheme(bu, businessUnits);
          const dept = departments.find((d) => d.id === ticket.departmentId);
          const creator = allUsers.find((u) => u.id === ticket.createdById);
          const assignee = allUsers.find((u) => u.id === ticket.assignedToId);

          return (
            <div
              key={ticket.id}
              id={`ticket-card-${ticket.ticketNumber.toLowerCase()}`}
              onClick={() => onSelectTicket(ticket)}
              className="p-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group relative"
            >
              {/* Left subtle indicator on hover */}
              <div
                style={{ backgroundColor: buTheme.primary }}
                className="absolute left-0 top-0 bottom-0 w-1 opacity-0 group-hover:opacity-100 transition-opacity"
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                {/* Left Block: ID, Title, Badges */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-transparent dark:border-slate-700">
                      {ticket.ticketNumber}
                    </span>

                    {/* Business Unit Tag */}
                    <BUBadge businessUnit={bu} allBusinessUnits={businessUnits} size="sm" />

                    {renderStatusBadge(ticket.status)}
                    {renderPriorityBadge(ticket.priority)}

                    {dept?.name && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 hidden md:inline-flex items-center gap-1">
                        <span className="text-slate-300 dark:text-slate-600">•</span>
                        <span>{dept.name}</span>
                      </span>
                    )}
                  </div>

                  <h3
                    className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition truncate"
                  >
                    {ticket.title}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                    {ticket.description}
                  </p>
                </div>

                {/* Right Block: Creator, Tech & Date */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0 text-xs text-slate-500 dark:text-slate-400 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                    {formatTimeAgo(ticket.createdAt)}
                  </span>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] dark:text-slate-300">
                      {creator?.fullName ? creator.fullName.split(' ')[0] : 'Staff'}
                    </span>

                    {assignee && (
                      <span
                        style={{ color: buTheme.primary, backgroundColor: buTheme.bgLight }}
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded border"
                      >
                        {assignee.fullName.split(' ')[0]}
                      </span>
                    )}

                    {onDeleteTicket && (currentUser.role === 'ADMIN' || (currentUser.role === 'IT' && currentUser.businessUnitId === ticket.businessUnitId)) && (
                      <button
                        id={`btn-delete-ticket-${ticket.ticketNumber.toLowerCase()}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTicketToDelete(ticket);
                        }}
                        className="p-1 rounded text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                        title="Remove Ticket"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-300 group-hover:translate-x-0.5 transition" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {ticketToDelete && (
        <ConfirmModal
          isOpen={!!ticketToDelete}
          title="Remove Support Ticket"
          message="Are you sure you want to permanently remove this ticket? This will delete the ticket records and associated attachments from the registry."
          itemName={`[${ticketToDelete.ticketNumber}] ${ticketToDelete.title}`}
          confirmLabel="Remove Ticket"
          isDestructive={true}
          onConfirm={() => {
            if (onDeleteTicket) {
              onDeleteTicket(ticketToDelete.id);
            }
            setTicketToDelete(null);
          }}
          onCancel={() => setTicketToDelete(null)}
        />
      )}
    </div>
  );
};
