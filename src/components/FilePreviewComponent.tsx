/**
 * @file FilePreviewComponent.tsx
 * @description Specialized file preview and attachment viewer for support tickets.
 * Handles both images (high-res lightbox, thumbnail grids) and documents (PDF, Excel, Word, Logs, Archives)
 * ingested via email or uploaded by staff. Maintains a clean, compact UI even with multiple embedded items.
 */

import React, { useState, useMemo } from 'react';
import {
  FileText,
  FileSpreadsheet,
  FileArchive,
  FileCode,
  File as FileGeneric,
  ImageIcon,
  Download,
  ExternalLink,
  Maximize2,
  Eye,
  Paperclip,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Mail,
  Copy,
  Check,
  X,
  FileCheck,
} from 'lucide-react';
import { TicketAttachment } from '../types';

export interface FilePreviewComponentProps {
  attachments?: TicketAttachment[];
  compact?: boolean;
  maxInitialDisplay?: number;
  title?: string;
  sourceContext?: 'EMAIL' | 'UPLOAD' | 'MIXED';
}

type FilterTab = 'ALL' | 'IMAGES' | 'DOCS';
type ViewMode = 'GRID' | 'LIST';

export const FilePreviewComponent: React.FC<FilePreviewComponentProps> = ({
  attachments = [],
  compact = false,
  maxInitialDisplay = 6,
  title,
  sourceContext,
}) => {
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>(compact ? 'LIST' : 'GRID');
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number | null>(null);
  const [activeDocPreview, setActiveDocPreview] = useState<TicketAttachment | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  if (!attachments || attachments.length === 0) {
    return null;
  }

  // Helper to determine file category
  const getFileCategory = (att: TicketAttachment): 'IMAGE' | 'PDF' | 'SHEET' | 'DOC' | 'ARCHIVE' | 'CODE' | 'OTHER' => {
    const type = (att.type || '').toLowerCase();
    const name = (att.name || '').toLowerCase();

    if (
      type.startsWith('image/') ||
      /\.(png|jpe?g|gif|webp|svg|bmp|ico|tiff?)$/i.test(name)
    ) {
      return 'IMAGE';
    }
    if (type.includes('pdf') || name.endsWith('.pdf')) {
      return 'PDF';
    }
    if (
      type.includes('spreadsheet') ||
      type.includes('excel') ||
      type.includes('csv') ||
      /\.(xlsx?|csv|tsv|ods)$/i.test(name)
    ) {
      return 'SHEET';
    }
    if (
      type.includes('word') ||
      type.includes('document') ||
      /\.(docx?|rtf|odt)$/i.test(name)
    ) {
      return 'DOC';
    }
    if (
      type.includes('zip') ||
      type.includes('archive') ||
      type.includes('compressed') ||
      /\.(zip|rar|7z|tar|gz|bz2)$/i.test(name)
    ) {
      return 'ARCHIVE';
    }
    if (
      type.includes('text') ||
      type.includes('json') ||
      type.includes('javascript') ||
      type.includes('xml') ||
      /\.(txt|log|json|xml|yaml|yml|sql|sh|js|ts|html|css|env)$/i.test(name)
    ) {
      return 'CODE';
    }
    return 'OTHER';
  };

  const isImage = (att: TicketAttachment) => getFileCategory(att) === 'IMAGE';

  // Format file size utility
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Grouping & Filtering
  const imageAttachments = useMemo(
    () => attachments.filter((att) => isImage(att)),
    [attachments]
  );
  const docAttachments = useMemo(
    () => attachments.filter((att) => !isImage(att)),
    [attachments]
  );

  const filteredAttachments = useMemo(() => {
    if (activeTab === 'IMAGES') return imageAttachments;
    if (activeTab === 'DOCS') return docAttachments;
    return attachments;
  }, [activeTab, attachments, imageAttachments, docAttachments]);

  const displayedAttachments = isExpanded
    ? filteredAttachments
    : filteredAttachments.slice(0, maxInitialDisplay);

  const hasHiddenItems = filteredAttachments.length > maxInitialDisplay;
  const hiddenCount = filteredAttachments.length - maxInitialDisplay;

  // Render Icon for non-image files
  const renderFileIcon = (category: string, sizeClass = 'w-5 h-5') => {
    switch (category) {
      case 'PDF':
        return <FileText className={`${sizeClass} text-rose-500 dark:text-rose-400`} />;
      case 'SHEET':
        return <FileSpreadsheet className={`${sizeClass} text-emerald-500 dark:text-emerald-400`} />;
      case 'DOC':
        return <FileText className={`${sizeClass} text-blue-500 dark:text-blue-400`} />;
      case 'ARCHIVE':
        return <FileArchive className={`${sizeClass} text-amber-500 dark:text-amber-400`} />;
      case 'CODE':
        return <FileCode className={`${sizeClass} text-purple-500 dark:text-purple-400`} />;
      default:
        return <FileGeneric className={`${sizeClass} text-slate-500 dark:text-slate-400`} />;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'PDF':
        return { label: 'PDF', bg: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800' };
      case 'SHEET':
        return { label: 'SHEET', bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' };
      case 'DOC':
        return { label: 'DOC', bg: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800' };
      case 'ARCHIVE':
        return { label: 'ZIP', bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800' };
      case 'CODE':
        return { label: 'LOG/CODE', bg: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800' };
      default:
        return { label: 'FILE', bg: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700' };
    }
  };

  // Lightbox navigation for images
  const openImageInLightbox = (att: TicketAttachment) => {
    const idx = imageAttachments.findIndex((img) => img.id === att.id);
    if (idx !== -1) {
      setActiveLightboxIndex(idx);
    }
  };

  const handleNextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (activeLightboxIndex !== null && imageAttachments.length > 0) {
      setActiveLightboxIndex((activeLightboxIndex + 1) % imageAttachments.length);
    }
  };

  const handlePrevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (activeLightboxIndex !== null && imageAttachments.length > 0) {
      setActiveLightboxIndex(
        (activeLightboxIndex - 1 + imageAttachments.length) % imageAttachments.length
      );
    }
  };

  // Decode text for doc preview if base64 text
  const getDecodedText = (url: string): string | null => {
    try {
      if (url.startsWith('data:text/') || url.startsWith('data:application/json')) {
        const parts = url.split(',');
        if (parts.length > 1) {
          if (parts[0].includes(';base64')) {
            return atob(parts[1]);
          }
          return decodeURIComponent(parts[1]);
        }
      }
    } catch {
      // Ignore error
    }
    return null;
  };

  const currentLightboxImage =
    activeLightboxIndex !== null ? imageAttachments[activeLightboxIndex] : null;

  return (
    <div className="space-y-3" id="component-file-preview">
      {/* Header bar with Counts, Type Tabs, and View Toggle */}
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Paperclip className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>{title || 'Attachments & Evidence'}</span>
              <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                {attachments.length}
              </span>
            </h4>

            {/* Email source badge */}
            {(sourceContext === 'EMAIL' ||
              attachments.some((a) => a.id.includes('email') || a.uploadedBy?.includes('Email'))) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-md bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <Mail className="w-3 h-3" />
                <span>Inbound Email Content</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Tabs if multiple types exist */}
            {imageAttachments.length > 0 && docAttachments.length > 0 && (
              <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('ALL')}
                  className={`px-2 py-1 rounded-md transition cursor-pointer ${
                    activeTab === 'ALL'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  All ({attachments.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('IMAGES')}
                  className={`px-2 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ${
                    activeTab === 'IMAGES'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <ImageIcon className="w-3 h-3" />
                  <span>Images ({imageAttachments.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('DOCS')}
                  className={`px-2 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ${
                    activeTab === 'DOCS'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  <span>Docs ({docAttachments.length})</span>
                </button>
              </div>
            )}

            {/* View Mode Toggle: Grid vs List */}
            <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 bg-slate-50 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setViewMode('GRID')}
                title="Grid preview"
                className={`p-1 rounded cursor-pointer transition ${
                  viewMode === 'GRID'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('LIST')}
                title="Compact list"
                className={`p-1 rounded cursor-pointer transition ${
                  viewMode === 'LIST'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid Mode View */}
      {viewMode === 'GRID' && !compact ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {displayedAttachments.map((att) => {
            const category = getFileCategory(att);
            const isImg = category === 'IMAGE';
            const badge = getCategoryBadge(category);
            const isFromEmail = att.id.includes('email') || att.uploadedBy?.includes('Email');

            if (isImg) {
              return (
                <div
                  key={att.id}
                  id={`attachment-card-${att.id}`}
                  onClick={() => openImageInLightbox(att)}
                  className="group relative bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer hover:shadow-md transition transform hover:-translate-y-0.5 flex flex-col justify-between"
                >
                  <div className="relative w-full h-28 bg-slate-950 flex items-center justify-center overflow-hidden">
                    <img
                      src={att.url}
                      alt={att.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition duration-200 group-hover:scale-105"
                      onError={(e) => {
                        // Fallback in case of broken inline data
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />

                    {/* Quick zoom badge */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      <span className="p-1.5 bg-black/70 text-white rounded-lg backdrop-blur-xs flex items-center gap-1 text-[10px] font-bold">
                        <Maximize2 className="w-3 h-3" />
                        <span>Preview</span>
                      </span>
                    </div>

                    {isFromEmail && (
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-amber-500/90 text-white text-[9px] font-bold tracking-tight shadow-xs backdrop-blur-xs flex items-center gap-0.5">
                        <Mail className="w-2.5 h-2.5" /> Email
                      </span>
                    )}
                  </div>

                  <div className="p-2 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                    <p
                      className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate"
                      title={att.name}
                    >
                      {att.name}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      <span>{formatFileSize(att.size)}</span>
                      <a
                        href={att.url}
                        download={att.name}
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 p-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/40 transition cursor-pointer"
                        title="Direct download"
                      >
                        <Download className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            }

            // Non-image document / PDF card
            return (
              <div
                key={att.id}
                id={`attachment-card-${att.id}`}
                onClick={() => setActiveDocPreview(att)}
                className="group relative bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between hover:border-blue-300 dark:hover:border-blue-700"
              >
                <div>
                  <div className="flex items-start justify-between gap-1 mb-2">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700/70 border border-slate-200 dark:border-slate-600">
                      {renderFileIcon(category, 'w-5 h-5')}
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold border ${badge.bg}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <p
                    className="text-xs font-semibold text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition"
                    title={att.name}
                  >
                    {att.name}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                  <span className="font-medium">{formatFileSize(att.size)}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDocPreview(att);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                      title="Inspect document"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={att.url}
                      download={att.name}
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                      title="Download file"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Compact List View Mode (Clean, space-efficient) */
        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
          {displayedAttachments.map((att) => {
            const category = getFileCategory(att);
            const isImg = category === 'IMAGE';
            const badge = getCategoryBadge(category);
            const isFromEmail = att.id.includes('email') || att.uploadedBy?.includes('Email');

            return (
              <div
                key={att.id}
                id={`attachment-row-${att.id}`}
                onClick={() => (isImg ? openImageInLightbox(att) : setActiveDocPreview(att))}
                className="group flex items-center justify-between p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/70 hover:bg-blue-50/60 dark:hover:bg-blue-950/30 border border-slate-200 dark:border-slate-700/80 transition cursor-pointer"
              >
                <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                  {isImg ? (
                    <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-300 dark:border-slate-600 bg-slate-900">
                      <img
                        src={att.url}
                        alt={att.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                      {renderFileIcon(category, 'w-4 h-4')}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400"
                        title={att.name}
                      >
                        {att.name}
                      </span>
                      <span
                        className={`hidden sm:inline-block px-1.5 py-0.2 rounded text-[9px] font-bold border ${badge.bg}`}
                      >
                        {badge.label}
                      </span>
                      {isFromEmail && (
                        <span className="hidden sm:inline-flex items-center gap-0.5 text-[9px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-1 py-0.2 rounded">
                          <Mail className="w-2.5 h-2.5" /> Inbound
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-2">
                      <span>{formatFileSize(att.size)}</span>
                      {att.uploadedBy && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[120px]">{att.uploadedBy}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isImg) openImageInLightbox(att);
                      else setActiveDocPreview(att);
                    }}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition"
                    title={isImg ? 'Preview image' : 'Inspect document'}
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  <a
                    href={att.url}
                    download={att.name}
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition"
                    title="Download attachment"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Expand / Collapse Toggle if more than threshold */}
      {hasHiddenItems && !compact && (
        <div className="pt-1 flex justify-center">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 py-1 px-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 transition cursor-pointer"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Show less (displaying all {filteredAttachments.length})</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Show {hiddenCount} more {activeTab === 'IMAGES' ? 'images' : activeTab === 'DOCS' ? 'documents' : 'attachments'}</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Lightbox Modal for Images with Prev / Next Navigation */}
      {currentLightboxImage && (
        <div
          id="modal-attachment-lightbox-backdrop"
          onClick={() => setActiveLightboxIndex(null)}
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-5 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl max-h-[92vh] flex flex-col items-center"
          >
            {/* Lightbox Header Bar */}
            <div className="w-full flex items-center justify-between py-2 text-white px-2">
              <div className="flex items-center gap-2 truncate">
                <ImageIcon className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="font-semibold text-xs sm:text-sm truncate">
                  {currentLightboxImage.name}
                </span>
                {currentLightboxImage.size && (
                  <span className="text-[11px] text-slate-400 shrink-0">
                    ({formatFileSize(currentLightboxImage.size)})
                  </span>
                )}
                {imageAttachments.length > 1 && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold shrink-0">
                    {activeLightboxIndex! + 1} / {imageAttachments.length}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={currentLightboxImage.url}
                  download={currentLightboxImage.name}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs inline-flex items-center gap-1 transition"
                  title="Download Image"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setActiveLightboxIndex(null)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Lightbox Stage with Next / Prev */}
            <div className="relative w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center min-h-[250px] max-h-[75vh]">
              <img
                src={currentLightboxImage.url}
                alt={currentLightboxImage.name}
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[72vh] object-contain select-none"
              />

              {imageAttachments.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-xs transition cursor-pointer"
                    title="Previous Image"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-xs transition cursor-pointer"
                    title="Next Image"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Lightbox Footer */}
            <div className="w-full flex items-center justify-between py-2 text-xs text-slate-400 px-2">
              <span>
                Uploaded by {currentLightboxImage.uploadedBy || 'Staff / Inbound Email'}
              </span>
              <span>
                {currentLightboxImage.uploadedAt
                  ? new Date(currentLightboxImage.uploadedAt).toLocaleString()
                  : ''}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Document / Non-Image Inspection Modal */}
      {activeDocPreview && (
        <div
          id="modal-document-preview-backdrop"
          onClick={() => setActiveDocPreview(null)}
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800">
                  {renderFileIcon(getFileCategory(activeDocPreview), 'w-4 h-4')}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {activeDocPreview.name}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    {formatFileSize(activeDocPreview.size)} • {activeDocPreview.type || 'Document'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={activeDocPreview.url}
                  download={activeDocPreview.name}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setActiveDocPreview(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body: Inspect document content or details */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* If it is a readable text / log file with decoded text */}
              {(() => {
                const decoded = getDecodedText(activeDocPreview.url);
                if (decoded) {
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Text / Log Contents Preview:
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(decoded);
                            setCopiedText(true);
                            setTimeout(() => setCopiedText(false), 2000);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          {copiedText ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Text</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono whitespace-pre-wrap max-h-80 overflow-y-auto border border-slate-800">
                        {decoded}
                      </pre>
                    </div>
                  );
                }

                // If PDF preview (embedded iframe if url is data or valid link)
                if (
                  activeDocPreview.type.includes('pdf') ||
                  activeDocPreview.name.toLowerCase().endsWith('.pdf')
                ) {
                  return (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-6 text-center space-y-3">
                        <FileText className="w-12 h-12 text-rose-500 mx-auto" />
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {activeDocPreview.name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Portable Document Format ({formatFileSize(activeDocPreview.size)})
                          </p>
                        </div>
                        <div className="pt-2 flex justify-center gap-2">
                          <a
                            href={activeDocPreview.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-slate-900 dark:bg-blue-600 text-white text-xs font-bold transition hover:opacity-90"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Open in Browser</span>
                          </a>
                          <a
                            href={activeDocPreview.url}
                            download={activeDocPreview.name}
                            className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Save PDF</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Generic document details card
                return (
                  <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
                      {renderFileIcon(getFileCategory(activeDocPreview), 'w-7 h-7')}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {activeDocPreview.name}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Format: {activeDocPreview.type || 'Document attachment'} • Size:{' '}
                        {formatFileSize(activeDocPreview.size)}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Received from{' '}
                        {activeDocPreview.uploadedBy || 'Corporate Inbound Mailbox'} on{' '}
                        {new Date(activeDocPreview.uploadedAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="pt-2 flex justify-center gap-3">
                      <a
                        href={activeDocPreview.url}
                        download={activeDocPreview.name}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download to Device</span>
                      </a>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
