/**
 * @file CreateTicketModal.tsx
 * @description Modal form allowing staff and administrators to log new IT tickets.
 * Supports image and screenshot attachments with real-time preview and business unit scoping.
 */

import React, { useState, useRef } from 'react';
import {
  X,
  PlusCircle,
  Building2,
  Layers,
  AlertCircle,
  Flame,
  AlertTriangle,
  Clock,
  HelpCircle,
  ImageIcon,
  Upload,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { User, BusinessUnit, Department, TicketPriority, TicketAttachment } from '../types';
import { getBUTheme } from '../utils/themeUtils';
import { BUBadge } from './BUBadge';

interface CreateTicketModalProps {
  currentUser: User;
  businessUnits: BusinessUnit[];
  departments: Department[];
  onClose: () => void;
  onSubmit: (payload: {
    title: string;
    description: string;
    priority: TicketPriority;
    departmentId: string;
    businessUnitId?: string;
    attachments?: TicketAttachment[];
  }) => void;
}

export const CreateTicketModal: React.FC<CreateTicketModalProps> = ({
  currentUser,
  businessUnits,
  departments,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('MEDIUM');
  const [selectedBUId, setSelectedBUId] = useState<string>(currentUser.businessUnitId);
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-detect reporting user's department and business unit
  const userDept = departments.find((d) => d.id === currentUser.departmentId);
  const activeBU = businessUnits.find(
    (b) => b.id === (currentUser.role === 'ADMIN' ? selectedBUId : currentUser.businessUnitId)
  );
  const theme = getBUTheme(activeBU, businessUnits);

  // Handle file uploads (converts images to base64 Data URLs)
  const processFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validImageFiles = fileArray.filter((f) => f.type.startsWith('image/'));

    if (validImageFiles.length === 0 && fileArray.length > 0) {
      setError('Please upload image files only (PNG, JPG, JPEG, WEBP, GIF).');
      return;
    }

    validImageFiles.forEach((file) => {
      // 5MB limit check per file
      if (file.size > 5 * 1024 * 1024) {
        setError(`File "${file.name}" exceeds 5MB size limit.`);
        return;
      }

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
          setAttachments((prev) => [...prev, newAtt]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Sample screenshot presets for rapid demo testing
  const addPresetScreenshot = (type: 'pos' | 'projector' | 'encoder') => {
    const presets = {
      pos: {
        name: 'POS_Terminal_Touch_Crash.png',
        url: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=800&auto=format&fit=crop&q=80',
        size: 198000,
        type: 'image/png',
      },
      projector: {
        name: 'Auditorium_4K_Signal_Loss.png',
        url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80',
        size: 245000,
        type: 'image/png',
      },
      encoder: {
        name: 'Keycard_VingCard_Error502.png',
        url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80',
        size: 165000,
        type: 'image/png',
      },
    };

    const target = presets[type];
    const newAtt: TicketAttachment = {
      id: `att-demo-${Date.now()}`,
      name: target.name,
      url: target.url,
      size: target.size,
      type: target.type,
      uploadedAt: new Date().toISOString(),
      uploadedBy: currentUser.fullName,
    };
    setAttachments((prev) => [...prev, newAtt]);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a brief summary title.');
      return;
    }
    if (!description.trim()) {
      setError('Please provide a detailed description of the technical issue.');
      return;
    }

    // Auto-derive department from the user who reported the issue
    const assignedBU = currentUser.role === 'ADMIN' ? selectedBUId : currentUser.businessUnitId;
    const effectiveDeptId =
      currentUser.departmentId ||
      departments.find((d) => d.businessUnitId === assignedBU)?.id ||
      '';

    setError(null);
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      priority,
      departmentId: effectiveDeptId,
      businessUnitId: currentUser.role === 'ADMIN' ? selectedBUId : undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
    });
    onClose();
  };

  const priorityOptions: {
    level: TicketPriority;
    label: string;
    desc: string;
    border: string;
    activeBg: string;
    icon: React.ReactNode;
  }[] = [
    {
      level: 'LOW',
      label: 'Low Priority',
      desc: 'Minor issue / cosmetic / routine request',
      border: 'border-slate-300',
      activeBg: 'bg-slate-100 border-slate-600 text-slate-900',
      icon: <HelpCircle className="w-4 h-4 text-slate-500" />,
    },
    {
      level: 'MEDIUM',
      label: 'Medium Priority',
      desc: 'Standard technical glitch, workaround exists',
      border: 'border-blue-300',
      activeBg: 'bg-blue-50 border-blue-600 text-blue-900',
      icon: <Clock className="w-4 h-4 text-blue-600" />,
    },
    {
      level: 'HIGH',
      label: 'High Priority',
      desc: 'Significant workflow impact or event delay',
      border: 'border-amber-300',
      activeBg: 'bg-amber-50 border-amber-600 text-amber-900',
      icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
    },
    {
      level: 'URGENT',
      label: 'Urgent Priority',
      desc: 'Critical outage / plenary or live POS stopped',
      border: 'border-rose-300',
      activeBg: 'bg-rose-50 border-rose-600 text-rose-900',
      icon: <Flame className="w-4 h-4 text-rose-600" />,
    },
  ];

  return (
    <div
      id="modal-create-ticket-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        id="modal-create-ticket-panel"
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 my-6"
      >
        {/* Header (Clean Light Theme) */}
        <div className="px-6 py-4 bg-slate-50 text-slate-900 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center space-x-2.5">
            <div
              style={{ backgroundColor: theme.primary }}
              className="p-2 rounded-xl text-white shadow-xs"
            >
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Create New IT Support Ticket</h2>
                <BUBadge businessUnit={activeBU} allBusinessUnits={businessUnits} size="sm" />
              </div>
              <p className="text-[11px] text-slate-500">
                Log technical incident with picture evidence and priority level
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Business Unit & Reporting Department Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Business Unit */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                Business Unit
              </label>
              {currentUser.role === 'ADMIN' ? (
                <select
                  id="create-select-bu"
                  value={selectedBUId}
                  onChange={(e) => setSelectedBUId(e.target.value)}
                  className="w-full text-xs font-semibold rounded-lg border border-slate-300 p-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {businessUnits.map((bu) => (
                    <option key={bu.id} value={bu.id}>
                      {bu.code} — {bu.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-700 truncate">
                  {activeBU?.name || currentUser.businessUnitId}
                </div>
              )}
            </div>

            {/* Department (Auto-derived from reporting user) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  Department
                </label>
                <span className="text-[10px] text-blue-600 font-medium bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200/60">
                  Auto from Reporter
                </span>
              </div>
              <div className="text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-700 flex items-center justify-between">
                <span className="truncate">
                  {userDept ? `${userDept.name} (${userDept.code})` : 'General Staff'}
                </span>
                <span className="text-[10.5px] text-slate-400 font-normal shrink-0 ml-1">
                  ({currentUser.fullName})
                </span>
              </div>
            </div>
          </div>

          {/* Ticket Title */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">
              Ticket Subject / Issue Summary *
            </label>
            <input
              id="create-input-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. POS terminal 2 in main dining room not printing kitchen slips"
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">
              Technical Description &amp; Reproduction Steps *
            </label>
            <textarea
              id="create-textarea-desc"
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happened, error codes displayed, equipment tags, or urgency factors..."
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Picture Attachments Section */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                Attach Pictures &amp; Screenshot Evidence
                <span className="text-[11px] font-normal text-slate-400">(Optional, Max 5MB each)</span>
              </label>
              {/* Quick Preset Buttons */}
              <div className="hidden sm:flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                  <Sparkles className="w-3 h-3 text-amber-500" /> Samples:
                </span>
                <button
                  type="button"
                  onClick={() => addPresetScreenshot('pos')}
                  className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 transition"
                >
                  + POS Error
                </button>
                <button
                  type="button"
                  onClick={() => addPresetScreenshot('projector')}
                  className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 transition"
                >
                  + AV Display
                </button>
                <button
                  type="button"
                  onClick={() => addPresetScreenshot('encoder')}
                  className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 transition"
                >
                  + Keycard PMS
                </button>
              </div>
            </div>

            {/* Drag and Drop Zone */}
            <div
              id="ticket-attachment-dropzone"
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition ${
                isDragging
                  ? 'border-blue-500 bg-blue-50/70'
                  : 'border-slate-300 hover:border-blue-400 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
                id="file-upload-input"
              />
              <div className="flex flex-col items-center justify-center space-y-1">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-full">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold text-slate-700">
                  <span className="text-blue-600 font-bold hover:underline">Click to browse</span> or drag and drop pictures here
                </div>
                <div className="text-[10px] text-slate-400">
                  Supports PNG, JPG, JPEG, WEBP, GIF, SVG screenshots and error photos
                </div>
              </div>
            </div>

            {/* Attachment Preview Gallery */}
            {attachments.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="relative group bg-slate-900 rounded-xl overflow-hidden border border-slate-200 shadow-xs"
                  >
                    <img
                      src={att.url}
                      alt={att.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-24 object-cover opacity-90 group-hover:opacity-100 transition"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-between p-2 pointer-events-none">
                      <div className="flex justify-end pointer-events-auto">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeAttachment(att.id);
                          }}
                          className="p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm transition"
                          title="Remove picture"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-white truncate drop-shadow-xs">
                          {att.name}
                        </p>
                        {att.size && (
                          <p className="text-[9px] text-slate-300">
                            {formatFileSize(att.size)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Priority Matrix Selector */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-bold text-slate-700">Priority Level</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {priorityOptions.map((opt) => {
                const isSelected = priority === opt.level;
                return (
                  <div
                    key={opt.level}
                    id={`priority-option-${opt.level.toLowerCase()}`}
                    onClick={() => setPriority(opt.level)}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-start space-x-2.5 ${
                      isSelected
                        ? opt.activeBg + ' ring-1 ring-blue-500'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="mt-0.5">{opt.icon}</div>
                    <div>
                      <div className="font-bold">{opt.label}</div>
                      <div className="text-[10px] text-slate-500 leading-tight">
                        {opt.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Form Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div className="text-[11px] text-slate-400">
              {attachments.length > 0 ? (
                <span className="text-blue-600 font-semibold flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5" /> {attachments.length} picture(s) attached
                </span>
              ) : (
                <span>No pictures attached</span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                id="btn-submit-new-ticket"
                type="submit"
                style={{ backgroundColor: theme.primary }}
                className="px-4 py-2 text-xs font-bold rounded-lg text-white shadow-sm transition hover:opacity-90 cursor-pointer"
              >
                Submit Ticket
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
