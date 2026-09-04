/**
 * @file TicketDetailModal.tsx
 * @description Interactive modal dialog for inspecting ticket details, reassigning IT technicians,
 * updating lifecycle statuses, recording resolution notes, viewing/attaching pictures, and lightbox preview.
 */

import React, { useState, useRef } from 'react';
import {
  X,
  UserCheck,
  Building2,
  Calendar,
  Clock,
  Send,
  CheckCircle2,
  Shield,
  AlertTriangle,
  MessageSquare,
  FileText,
  ImageIcon,
  Maximize2,
  Download,
  Paperclip,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import {
  Ticket,
  User,
  BusinessUnit,
  Department,
  TicketStatus,
  TicketPriority,
  TicketAttachment,
} from '../types';
import { getBUTheme } from '../utils/themeUtils';
import { BUBadge } from './BUBadge';
import { ConfirmModal } from './ConfirmModal';
import { FilePreviewComponent } from './FilePreviewComponent';
import { emailIngestionService } from '../services/emailIngestionService';

interface TicketDetailModalProps {
  ticket: Ticket | null;
  currentUser: User;
  businessUnits: BusinessUnit[];
  departments: Department[];
  allUsers: User[];
  onClose: () => void;
  onUpdateTicket: (
    ticketId: string,
    updates: {
      status?: TicketStatus;
      priority?: TicketPriority;
      assignedToId?: string;
      resolutionNotes?: string;
      comment?: string;
      newAttachments?: TicketAttachment[];
    }
  ) => void;
  onDeleteTicket?: (ticketId: string) => void;
}

export const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  ticket,
  currentUser,
  businessUnits,
  departments,
  allUsers,
  onClose,
  onUpdateTicket,
  onDeleteTicket,
}) => {
  if (!ticket) return null;

  const [selectedStatus, setSelectedStatus] = useState<TicketStatus>(ticket.status);
  const [selectedPriority, setSelectedPriority] = useState<TicketPriority>(ticket.priority);
  const [selectedAssignee, setSelectedAssignee] = useState<string>(ticket.assignedToId || '');
  const [resolutionNotes, setResolutionNotes] = useState<string>(ticket.resolutionNotes || '');
  const [newComment, setNewComment] = useState<string>('');
  const [pendingAttachments, setPendingAttachments] = useState<TicketAttachment[]>([]);
  const [activeLightboxImage, setActiveLightboxImage] = useState<TicketAttachment | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Business Unit and Department details & Theme
  const bu = businessUnits.find((b) => b.id === ticket.businessUnitId);
  const buTheme = getBUTheme(bu, businessUnits);
  const dept = departments.find((d) => d.id === ticket.departmentId);
  const creator = allUsers.find((u) => u.id === ticket.createdById);
  const assignee = allUsers.find((u) => u.id === ticket.assignedToId);

  // Filter eligible IT technicians (Admin or IT in the ticket's Business Unit)
  const eligibleTechs = allUsers.filter(
    (u) =>
      (u.role === 'IT' && u.businessUnitId === ticket.businessUnitId) ||
      u.role === 'ADMIN'
  );

  // Permissions check
  const isITOrAdmin =
    currentUser.role === 'ADMIN' ||
    (currentUser.role === 'IT' && currentUser.businessUnitId === ticket.businessUnitId);

  const handleProcessFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter((f) => f.size <= 10 * 1024 * 1024);

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          const newAtt: TicketAttachment = {
            id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            name: file.name,
            url: result,
            size: file.size,
            type: file.type || 'application/octet-stream',
            uploadedAt: new Date().toISOString(),
            uploadedBy: currentUser.fullName,
          };
          setPendingAttachments((prev) => [...prev, newAtt]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    onUpdateTicket(ticket.id, {
      status: selectedStatus,
      priority: selectedPriority,
      assignedToId: selectedAssignee || undefined,
      resolutionNotes: resolutionNotes.trim() ? resolutionNotes.trim() : undefined,
      comment: newComment.trim() ? newComment.trim() : undefined,
      newAttachments: pendingAttachments.length > 0 ? pendingAttachments : undefined,
    });

    if (selectedStatus !== ticket.status && creator?.email) {
      await emailIngestionService.notifyTicketStatusChange({
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        ticketTitle: ticket.title,
        newStatus: selectedStatus,
        oldStatus: ticket.status,
        requesterEmail: creator.email,
        requesterName: creator.fullName,
        technicianName: currentUser.fullName,
        resolutionNotes: resolutionNotes.trim() || ticket.resolutionNotes,
        businessUnitName: bu?.name,
      });
    }

    setIsSaving(false);
    setNewComment('');
    setPendingAttachments([]);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatTimeAgo = (isoString?: string) => {
    if (!isoString) return 'Just now';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Recently';
    const now = new Date();
    const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);
    const diffMinutes = Math.round(diffSeconds / 60);
    const diffHours = Math.round(diffMinutes / 60);
    const diffDays = Math.round(diffHours / 24);

    if (diffSeconds < 45) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCreatedDate = (isoString?: string) => {
    if (!isoString) return 'Recent';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Recent';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <div
        id="modal-ticket-detail-backdrop"
        className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      >
        <div
          id="modal-ticket-detail-panel"
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 my-4"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-slate-100 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-3">
              <span
                style={{ backgroundColor: buTheme.primary }}
                className="font-mono text-xs font-bold text-white px-2.5 py-1 rounded shadow-xs"
              >
                {ticket.ticketNumber}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
                    Support Incident Details
                  </h2>
                  <BUBadge businessUnit={bu} allBusinessUnits={businessUnits} size="sm" />
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                  <span>{bu?.name}</span>
                  <span>•</span>
                  <span>{dept?.name}</span>
                </div>
              </div>
            </div>

            <button
              id="btn-close-ticket-modal"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto space-y-6">
            {/* Main Title & Description */}
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
                {ticket.title}
              </h3>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {ticket.description}
              </div>
            </div>

            {/* Ticket Meta Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs">
              <div>
                <span className="text-slate-400 dark:text-slate-400 font-semibold block uppercase text-[10px]">
                  Created By
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                  {creator?.fullName || 'Staff Member'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-400 font-semibold block uppercase text-[10px]">
                  Submitted On
                </span>
                <span className="font-medium text-slate-700 dark:text-slate-300 mt-0.5 block">
                  {formatCreatedDate(ticket.createdAt)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-400 font-semibold block uppercase text-[10px]">
                  Business Unit
                </span>
                <div className="mt-1">
                  <BUBadge businessUnit={bu} allBusinessUnits={businessUnits} size="sm" />
                </div>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-400 font-semibold block uppercase text-[10px]">
                  Department
                </span>
                <span className="font-medium text-slate-700 dark:text-slate-300 mt-0.5 block">
                  {dept?.code} - {dept?.name}
                </span>
              </div>
            </div>

            {/* File & Evidence Preview (Thumbnails, Doc Links, Lightbox, Clean Collapse) */}
            {ticket.attachments && ticket.attachments.length > 0 && (
              <div className="p-3.5 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80">
                <FilePreviewComponent
                  attachments={ticket.attachments}
                  title="Incident & Email Attachments"
                  maxInitialDisplay={6}
                />
              </div>
            )}

            {/* IT Support Action Controls (Status, Priority, Assignee) */}
            <div className="border border-blue-100 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/30 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-blue-950 dark:text-blue-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Workflow &amp; Status Controls
                </h4>
                {!isITOrAdmin && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                    Read-only (Managed by IT Team)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Status Selector */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Status</label>
                  <select
                    id="modal-select-status"
                    value={selectedStatus}
                    disabled={!isITOrAdmin}
                    onChange={(e) => setSelectedStatus(e.target.value as TicketStatus)}
                    className="w-full text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-800 dark:text-slate-100 disabled:bg-slate-100 dark:disabled:bg-slate-850 disabled:text-slate-500 dark:disabled:text-slate-500"
                  >
                    <option value="OPEN" className="dark:bg-slate-800">Open (Pending)</option>
                    <option value="IN_PROGRESS" className="dark:bg-slate-800">In Progress (Active)</option>
                    <option value="RESOLVED" className="dark:bg-slate-800">Resolved</option>
                    <option value="CLOSED" className="dark:bg-slate-800">Closed</option>
                  </select>
                </div>

                {/* Priority Selector */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Priority</label>
                  <select
                    id="modal-select-priority"
                    value={selectedPriority}
                    disabled={!isITOrAdmin}
                    onChange={(e) => setSelectedPriority(e.target.value as TicketPriority)}
                    className="w-full text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-800 dark:text-slate-100 disabled:bg-slate-100 dark:disabled:bg-slate-850 disabled:text-slate-500 dark:disabled:text-slate-500"
                  >
                    <option value="LOW" className="dark:bg-slate-800">Low (Standard)</option>
                    <option value="MEDIUM" className="dark:bg-slate-800">Medium (Normal)</option>
                    <option value="HIGH" className="dark:bg-slate-800">High (Urgent Attention)</option>
                    <option value="URGENT" className="dark:bg-slate-800">Urgent (Immediate SLA)</option>
                  </select>
                </div>

                {/* Assignee Selector */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Assigned IT Technician
                  </label>
                  <select
                    id="modal-select-assignee"
                    value={selectedAssignee}
                    disabled={!isITOrAdmin}
                    onChange={(e) => setSelectedAssignee(e.target.value)}
                    className="w-full text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-800 dark:text-slate-100 disabled:bg-slate-100 dark:disabled:bg-slate-850 disabled:text-slate-500 dark:disabled:text-slate-500"
                  >
                    <option value="" className="dark:bg-slate-800">Unassigned</option>
                    {eligibleTechs.map((tech) => (
                      <option key={tech.id} value={tech.id} className="dark:bg-slate-800">
                        {tech.fullName} ({tech.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Resolution Notes (Shown if Resolved or Closed) */}
              {(selectedStatus === 'RESOLVED' || selectedStatus === 'CLOSED' || ticket.resolutionNotes) && (
                <div className="space-y-1 pt-2 border-t border-blue-100 dark:border-blue-900/60">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Resolution &amp; Root Cause Notes
                  </label>
                  <textarea
                    id="modal-textarea-resolution"
                    rows={2}
                    value={resolutionNotes}
                    disabled={!isITOrAdmin}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Detail the technical fix, firmware version, or hardware replacement implemented..."
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-800 dark:text-slate-100 disabled:bg-slate-100 dark:disabled:bg-slate-850"
                  />
                </div>
              )}
            </div>

            {/* Activity Timeline & Discussion */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                Activity Log &amp; Discussion ({ticket.activities?.length || 0})
              </h4>

              {/* Timeline Stream */}
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {ticket.activities && ticket.activities.length > 0 ? (
                  ticket.activities.map((act: any) => {
                    const actName = act.userName || act.actorName || 'System';
                    const actRole = act.userRole || act.actorRole || 'SYSTEM';
                    const actText = act.message || act.details || '';
                    const actInitial = actName.charAt(0).toUpperCase() || 'S';

                    return (
                      <div
                        key={act.id || Math.random().toString()}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs flex items-start space-x-2.5"
                      >
                        <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center text-[10px] shrink-0">
                          {actInitial}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {actName}{' '}
                              <span className="font-normal text-slate-400 text-[10px]">
                                ({actRole})
                              </span>
                            </span>
                            <span
                              className="text-[10px] text-slate-400 dark:text-slate-500 font-medium inline-flex items-center gap-1 cursor-default"
                              title={act.timestamp ? new Date(act.timestamp).toLocaleString() : ''}
                            >
                              <Clock className="w-2.5 h-2.5 text-slate-400" />
                              {formatTimeAgo(act.timestamp)}
                            </span>
                          </div>
                          {actText && (
                            <p className="text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                              {actText}
                            </p>
                          )}

                          {/* Attachments inside activity */}
                          {act.attachments && act.attachments.length > 0 && (
                            <div className="pt-2">
                              <FilePreviewComponent
                                attachments={act.attachments}
                                compact={true}
                                maxInitialDisplay={3}
                                title="Attached Files"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-xs text-slate-400 dark:text-slate-500 italic">No activity recorded yet.</div>
                )}
              </div>

              {/* Pending Attachments preview before posting note */}
              {pendingAttachments.length > 0 && (
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl space-y-1.5">
                  <div className="text-[11px] font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1">
                    <Paperclip className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                    Ready to attach with next remark ({pendingAttachments.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {pendingAttachments.map((att) => {
                      const isImg = att.type?.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(att.name);
                      return (
                        <div
                          key={att.id}
                          className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 rounded-lg p-1 pr-2 text-[10px]"
                        >
                          {isImg ? (
                            <img
                              src={att.url}
                              alt={att.name}
                              className="w-6 h-6 object-cover rounded"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
                              <FileText className="w-3.5 h-3.5" />
                            </div>
                          )}
                          <span className="max-w-[120px] truncate font-medium text-slate-700 dark:text-slate-200">
                            {att.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => setPendingAttachments((prev) => prev.filter((p) => p.id !== att.id))}
                            className="text-rose-500 hover:text-rose-700 ml-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add Comment and Attach Picture Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2">
                <input
                  id="input-modal-comment"
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveChanges()}
                  placeholder="Add a remark, update, or troubleshooting note..."
                  className="flex-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.log,.zip"
                  onChange={(e) => e.target.files && handleProcessFiles(e.target.files)}
                  className="hidden"
                />

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700 transition cursor-pointer"
                    title="Attach File or Screenshot"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span>Attach File</span>
                  </button>

                  <button
                    id="btn-modal-save-comment"
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white text-xs font-bold transition cursor-pointer"
                  >
                    <Send className="w-3 h-3" />
                    <span>Post Note</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                id="btn-modal-dismiss"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Close
              </button>

              {onDeleteTicket && (currentUser.role === 'ADMIN' || (currentUser.role === 'IT' && currentUser.businessUnitId === ticket.businessUnitId)) && (
                <button
                  id="btn-modal-delete-ticket"
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="px-3 py-2 text-xs font-bold rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1.5 transition cursor-pointer"
                  title="Permanently remove ticket"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  <span>Remove Ticket</span>
                </button>
              )}
            </div>

            <button
              id="btn-modal-save-all"
              onClick={() => {
                handleSaveChanges();
                onClose();
              }}
              style={{ backgroundColor: buTheme.primary }}
              className="px-4 py-2 text-xs font-bold rounded-lg text-white shadow-sm transition hover:opacity-90 cursor-pointer"
            >
              Save &amp; Apply Updates
            </button>
          </div>
        </div>
      </div>

      {/* Delete Ticket Confirmation Dialog */}
      {isConfirmingDelete && (
        <ConfirmModal
          isOpen={isConfirmingDelete}
          title="Remove Support Ticket"
          message="Are you sure you want to permanently remove this ticket? This will delete the ticket records and associated attachments from the registry."
          itemName={`[${ticket.ticketNumber}] ${ticket.title}`}
          confirmLabel="Remove Ticket"
          isDestructive={true}
          onConfirm={() => {
            if (onDeleteTicket) {
              onDeleteTicket(ticket.id);
            }
            setIsConfirmingDelete(false);
            onClose();
          }}
          onCancel={() => setIsConfirmingDelete(false)}
        />
      )}

      {/* Lightbox Zoom Image Modal */}
      {activeLightboxImage && (
        <div
          id="modal-lightbox-backdrop"
          onClick={() => setActiveLightboxImage(null)}
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[88vh] flex flex-col items-center"
          >
            {/* Lightbox Header Bar */}
            <div className="w-full flex items-center justify-between py-2 text-white px-2">
              <div className="flex items-center gap-2 truncate">
                <ImageIcon className="w-4 h-4 text-blue-400" />
                <span className="font-semibold text-xs sm:text-sm truncate">
                  {activeLightboxImage.name}
                </span>
                {activeLightboxImage.size && (
                  <span className="text-[11px] text-slate-400">
                    ({formatFileSize(activeLightboxImage.size)})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={activeLightboxImage.url}
                  download={activeLightboxImage.name}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs inline-flex items-center gap-1 transition"
                  title="Download Image"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setActiveLightboxImage(null)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Lightbox Image Stage */}
            <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950 flex items-center justify-center">
              <img
                src={activeLightboxImage.url}
                alt={activeLightboxImage.name}
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[75vh] object-contain"
              />
            </div>

            {/* Lightbox Footer Meta */}
            <div className="w-full text-center py-2 text-xs text-slate-400">
              Uploaded by {activeLightboxImage.uploadedBy || 'Staff'} •{' '}
              {new Date(activeLightboxImage.uploadedAt).toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
