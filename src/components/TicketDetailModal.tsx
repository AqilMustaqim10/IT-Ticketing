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
    const validImageFiles = fileArray.filter((f) => f.type.startsWith('image/'));

    validImageFiles.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          const newAtt: TicketAttachment = {
            id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            name: file.name,
            url: result,
            size: file.size,
            type: file.type,
            uploadedAt: new Date().toISOString(),
            uploadedBy: currentUser.fullName,
          };
          setPendingAttachments((prev) => [...prev, newAtt]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSaveChanges = () => {
    setIsSaving(true);
    onUpdateTicket(ticket.id, {
      status: selectedStatus,
      priority: selectedPriority,
      assignedToId: selectedAssignee || undefined,
      resolutionNotes: resolutionNotes.trim() ? resolutionNotes.trim() : undefined,
      comment: newComment.trim() ? newComment.trim() : undefined,
      newAttachments: pendingAttachments.length > 0 ? pendingAttachments : undefined,
    });
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

  const formatTimeAgo = (isoString: string) => {
    const date = new Date(isoString);
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

  return (
    <>
      <div
        id="modal-ticket-detail-backdrop"
        className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      >
        <div
          id="modal-ticket-detail-panel"
          className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 my-4"
        >
          {/* Header (Clean Light Theme) */}
          <div className="px-6 py-4 bg-slate-50 text-slate-900 flex items-center justify-between border-b border-slate-200">
            <div className="flex items-center space-x-3">
              <span
                style={{ backgroundColor: buTheme.primary }}
                className="font-mono text-xs font-bold text-white px-2.5 py-1 rounded shadow-xs"
              >
                {ticket.ticketNumber}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 leading-tight">
                    Support Incident Details
                  </h2>
                  <BUBadge businessUnit={bu} allBusinessUnits={businessUnits} size="sm" />
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                  <span>{bu?.name}</span>
                  <span>•</span>
                  <span>{dept?.name}</span>
                </div>
              </div>
            </div>

            <button
              id="btn-close-ticket-modal"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto space-y-6">
            {/* Main Title & Description */}
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-900 leading-snug">
                {ticket.title}
              </h3>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                {ticket.description}
              </div>
            </div>

            {/* Ticket Meta Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50/70 border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block uppercase text-[10px]">
                  Created By
                </span>
                <span className="font-bold text-slate-800 mt-0.5 block">
                  {creator?.fullName || 'Staff Member'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block uppercase text-[10px]">
                  Submitted On
                </span>
                <span className="font-medium text-slate-700 mt-0.5 block">
                  {new Date(ticket.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block uppercase text-[10px]">
                  Business Unit
                </span>
                <div className="mt-1">
                  <BUBadge businessUnit={bu} allBusinessUnits={businessUnits} size="sm" />
                </div>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block uppercase text-[10px]">
                  Department
                </span>
                <span className="font-medium text-slate-700 mt-0.5 block">
                  {dept?.code} - {dept?.name}
                </span>
              </div>
            </div>

            {/* Attached Pictures & Evidence Section */}
            {ticket.attachments && ticket.attachments.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-blue-600" />
                    Attached Pictures &amp; Screenshot Evidence ({ticket.attachments.length})
                  </h4>
                  <span className="text-[11px] text-slate-400">Click any image for high-res preview</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {ticket.attachments.map((att) => (
                    <div
                      key={att.id}
                      onClick={() => setActiveLightboxImage(att)}
                      className="group relative bg-slate-900 rounded-xl overflow-hidden border border-slate-200 shadow-xs cursor-pointer hover:shadow-md transition transform hover:-translate-y-0.5"
                    >
                      <img
                        src={att.url}
                        alt={att.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-28 object-cover opacity-90 group-hover:opacity-100 transition"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-between p-2">
                        <div className="flex justify-end opacity-0 group-hover:opacity-100 transition">
                          <span className="p-1 bg-black/60 text-white rounded-lg backdrop-blur-xs">
                            <Maximize2 className="w-3.5 h-3.5" />
                          </span>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-white truncate drop-shadow-xs">
                            {att.name}
                          </p>
                          <div className="flex items-center justify-between text-[9px] text-slate-300 mt-0.5">
                            <span>{formatFileSize(att.size)}</span>
                            {att.uploadedBy && <span className="truncate max-w-[80px]">{att.uploadedBy}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* IT Support Action Controls (Status, Priority, Assignee) */}
            <div className="border border-blue-100 bg-blue-50/40 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-blue-600" />
                  Workflow &amp; Status Controls
                </h4>
                {!isITOrAdmin && (
                  <span className="text-[11px] text-slate-500 italic">
                    Read-only (Managed by IT Team)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Status Selector */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Status</label>
                  <select
                    id="modal-select-status"
                    value={selectedStatus}
                    disabled={!isITOrAdmin}
                    onChange={(e) => setSelectedStatus(e.target.value as TicketStatus)}
                    className="w-full text-xs font-semibold rounded-lg border border-slate-300 bg-white p-2 text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    <option value="OPEN">Open (Pending)</option>
                    <option value="IN_PROGRESS">In Progress (Active)</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>

                {/* Priority Selector */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Priority</label>
                  <select
                    id="modal-select-priority"
                    value={selectedPriority}
                    disabled={!isITOrAdmin}
                    onChange={(e) => setSelectedPriority(e.target.value as TicketPriority)}
                    className="w-full text-xs font-semibold rounded-lg border border-slate-300 bg-white p-2 text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    <option value="LOW">Low (Standard)</option>
                    <option value="MEDIUM">Medium (Normal)</option>
                    <option value="HIGH">High (Urgent Attention)</option>
                    <option value="URGENT">Urgent (Immediate SLA)</option>
                  </select>
                </div>

                {/* Assignee Selector */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">
                    Assigned IT Technician
                  </label>
                  <select
                    id="modal-select-assignee"
                    value={selectedAssignee}
                    disabled={!isITOrAdmin}
                    onChange={(e) => setSelectedAssignee(e.target.value)}
                    className="w-full text-xs font-semibold rounded-lg border border-slate-300 bg-white p-2 text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    <option value="">Unassigned</option>
                    {eligibleTechs.map((tech) => (
                      <option key={tech.id} value={tech.id}>
                        {tech.fullName} ({tech.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Resolution Notes (Shown if Resolved or Closed) */}
              {(selectedStatus === 'RESOLVED' || selectedStatus === 'CLOSED' || ticket.resolutionNotes) && (
                <div className="space-y-1 pt-2 border-t border-blue-100">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Resolution &amp; Root Cause Notes
                  </label>
                  <textarea
                    id="modal-textarea-resolution"
                    rows={2}
                    value={resolutionNotes}
                    disabled={!isITOrAdmin}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Detail the technical fix, firmware version, or hardware replacement implemented..."
                    className="w-full text-xs rounded-lg border border-slate-300 bg-white p-2 text-slate-800 disabled:bg-slate-100"
                  />
                </div>
              )}
            </div>

            {/* Activity Timeline & Discussion */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                Activity Log &amp; Discussion ({ticket.activities?.length || 0})
              </h4>

              {/* Timeline Stream */}
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {ticket.activities && ticket.activities.length > 0 ? (
                  ticket.activities.map((act) => (
                    <div
                      key={act.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-start space-x-2.5"
                    >
                      <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                        {act.userName.charAt(0)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">
                            {act.userName}{' '}
                            <span className="font-normal text-slate-400 text-[10px]">
                              ({act.userRole})
                            </span>
                          </span>
                          <span
                            className="text-[10px] text-slate-400 font-medium inline-flex items-center gap-1 cursor-default"
                            title={new Date(act.timestamp).toLocaleString('en-US', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          >
                            <Clock className="w-2.5 h-2.5 text-slate-400" />
                            {formatTimeAgo(act.timestamp)}
                          </span>
                        </div>
                        {act.message && <p className="text-slate-600">{act.message}</p>}

                        {/* Attachments inside activity */}
                        {act.attachments && act.attachments.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1.5">
                            {act.attachments.map((att) => (
                              <div
                                key={att.id}
                                onClick={() => setActiveLightboxImage(att)}
                                className="group relative rounded-lg overflow-hidden border border-slate-300 cursor-pointer"
                              >
                                <img
                                  src={att.url}
                                  alt={att.name}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-16 object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                  <Maximize2 className="w-4 h-4 text-white" />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-400 italic">No activity recorded yet.</div>
                )}
              </div>

              {/* Pending Attachments preview before posting note */}
              {pendingAttachments.length > 0 && (
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl space-y-1.5">
                  <div className="text-[11px] font-bold text-blue-900 flex items-center gap-1">
                    <ImageIcon className="w-3 h-3 text-blue-600" />
                    Ready to attach with next remark ({pendingAttachments.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {pendingAttachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center gap-1.5 bg-white border border-blue-200 rounded-lg p-1 pr-2 text-[10px]"
                      >
                        <img
                          src={att.url}
                          alt={att.name}
                          className="w-6 h-6 object-cover rounded"
                        />
                        <span className="max-w-[120px] truncate font-medium text-slate-700">
                          {att.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPendingAttachments((prev) => prev.filter((p) => p.id !== att.id))}
                          className="text-rose-500 hover:text-rose-700 ml-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
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
                  className="flex-1 text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => e.target.files && handleProcessFiles(e.target.files)}
                  className="hidden"
                />

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition"
                    title="Attach Picture"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                    <span>Attach Photo</span>
                  </button>

                  <button
                    id="btn-modal-save-comment"
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
                  >
                    <Send className="w-3 h-3" />
                    <span>Post Note</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                id="btn-modal-dismiss"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
              >
                Close
              </button>

              {onDeleteTicket && (currentUser.role === 'ADMIN' || (currentUser.role === 'IT' && currentUser.businessUnitId === ticket.businessUnitId)) && (
                <button
                  id="btn-modal-delete-ticket"
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="px-3 py-2 text-xs font-bold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1.5 transition cursor-pointer"
                  title="Permanently remove ticket"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
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
