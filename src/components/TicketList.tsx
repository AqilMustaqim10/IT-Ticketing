/**
 * @file TicketList.tsx
 * @description Minimal, high-clarity support ticket registry.
 * Clean modern list design with subtle badges, clear hierarchy, and smooth interactions.
 */

import React, { useState } from 'react';
import {
  AlertCircle,
  Building2,
  Calendar,
  ChevronRight,
  UserCheck,
  Trash2,
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
}

export const TicketList: React.FC<TicketListProps> = ({
  tickets,
  businessUnits,
  departments,
  allUsers,
  currentUser,
  onSelectTicket,
  onDeleteTicket,
}) => {
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
  // Minimal Priority Badge
  const renderPriorityBadge = (priority: TicketPriority) => {
    switch (priority) {
      case 'URGENT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-md bg-rose-50 text-rose-700 border border-rose-200/80">
            Urgent
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-md bg-amber-50 text-amber-700 border border-amber-200/80">
            High
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-md bg-blue-50 text-blue-700 border border-blue-200/80">
            Medium
          </span>
        );
      case 'LOW':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-md bg-slate-100 text-slate-600 border border-slate-200/60">
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
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-md bg-amber-50 text-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Open
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-md bg-blue-50 text-blue-800">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            In Progress
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-md bg-emerald-50 text-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Resolved
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-md bg-slate-100 text-slate-600">
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
        className="bg-white rounded-xl border border-slate-200/80 p-12 text-center shadow-2xs"
      >
        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2.5">
          <AlertCircle className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-semibold text-slate-800">No tickets found</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
          No support requests match your current filters. Try changing or clearing your search options.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Tickets ({tickets.length})
        </h2>
        <span className="text-[11px] text-slate-400">
          Sorted by newest
        </span>
      </div>

      <div className="space-y-2">
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
              className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/70 hover:border-slate-300 hover:shadow-2xs transition-all cursor-pointer group relative overflow-hidden"
            >
              {/* Left subtle Business Unit color indicator bar */}
              <div
                style={{ backgroundColor: buTheme.primary }}
                className="absolute left-0 top-0 bottom-0 w-1 opacity-80 group-hover:opacity-100 transition-opacity"
              />

              {/* Row 1: Badges & Metadata */}
              <div className="flex flex-wrap items-center justify-between gap-2 pl-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-xs font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                    {ticket.ticketNumber}
                  </span>

                  {/* Business Unit Tag with its specific theme color */}
                  <BUBadge businessUnit={bu} allBusinessUnits={businessUnits} size="sm" />

                  {renderStatusBadge(ticket.status)}
                  {renderPriorityBadge(ticket.priority)}

                  {dept?.name && (
                    <span className="text-xs text-slate-500 flex items-center gap-1 ml-0.5">
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-500 font-medium">{dept.name}</span>
                    </span>
                  )}
                </div>

                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-300" />
                  {formatTimeAgo(ticket.createdAt)}
                </span>
              </div>

              {/* Row 2: Title & Snippet */}
              <div className="mt-2 space-y-0.5 pl-1">
                <h3
                  className="text-sm font-semibold text-slate-900 group-hover:underline transition"
                  style={{ textDecorationColor: buTheme.primary }}
                >
                  {ticket.title}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-1 leading-relaxed">
                  {ticket.description}
                </p>
              </div>

              {/* Row 3: Requester, Assignee & Action */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 pl-1">
                <div className="flex items-center gap-3">
                  <span className="text-[11px]">
                    by <strong className="text-slate-700 font-medium">{creator?.fullName || 'Staff'}</strong>
                  </span>
                  <span className="text-slate-300">•</span>
                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="text-slate-400">Tech:</span>
                    {assignee ? (
                      <span className="text-slate-700 font-medium flex items-center gap-1">
                        <UserCheck
                          className="w-3 h-3"
                          style={{ color: buTheme.primary }}
                        />
                        {assignee.fullName.split(' ')[0]}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Unassigned</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {onDeleteTicket && (currentUser.role === 'ADMIN' || (currentUser.role === 'IT' && currentUser.businessUnitId === ticket.businessUnitId)) && (
                    <button
                      id={`btn-delete-ticket-${ticket.ticketNumber.toLowerCase()}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTicketToDelete(ticket);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Remove Ticket"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <div
                    style={{ color: buTheme.primary }}
                    className="flex items-center gap-0.5 transition text-[11px] font-medium"
                  >
                    <span>View</span>
                    <ChevronRight className="w-3.5 h-3.5" />
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
