/**
 * @file ExportReportModal.tsx
 * @description Dedicated Report Generation and Export Center Modal.
 * Enables Global Administrators to generate and download separate individual PDF reports
 * for every Business Unit (CCEC, F&B, HOTEL, KLBS, KLW, UOA HQ) rather than compiling into one report,
 * as well as generating individual BU reports with custom timeframes and filters.
 */

import React, { useState } from 'react';
import {
  X,
  FileDown,
  Building2,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  Loader2,
  FileText,
  Clock,
  Filter,
  CheckSquare,
  Square,
  AlertCircle,
  Download,
} from 'lucide-react';
import {
  BusinessUnit,
  Department,
  Ticket,
  User,
  TimeframeOption,
  DashboardFilterState,
} from '../types';
import {
  generateSingleBUReportPDF,
  generateAllIndividualBUReportsPDF,
  generateSupportReportPDF,
  computeTicketMetrics,
} from '../utils/pdfExport';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessUnits: BusinessUnit[];
  departments: Department[];
  allTickets: Ticket[];
  allUsers: User[];
  currentUser: User;
  activeFilters: DashboardFilterState;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const ExportReportModal: React.FC<ExportReportModalProps> = ({
  isOpen,
  onClose,
  businessUnits,
  departments,
  allTickets,
  allUsers,
  currentUser,
  activeFilters,
  onShowToast,
}) => {
  const isAdmin = currentUser.role === 'ADMIN';

  // State for timeframe and filters inside modal
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeOption>(
    activeFilters.timeframe || 'MONTHLY'
  );
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');

  // Selected BUs for batch export (defaults to all BUs for admin)
  const [selectedBuIds, setSelectedBuIds] = useState<string[]>(
    businessUnits.map((b) => b.id)
  );

  // Batch export progress state
  const [isExportingBatch, setIsExportingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
    currentBuName: string;
  } | null>(null);
  const [completedBUs, setCompletedBUs] = useState<string[]>([]);

  // Single export loading tracking by BU ID
  const [exportingBuId, setExportingBuId] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleSelectBu = (buId: string) => {
    setSelectedBuIds((prev) =>
      prev.includes(buId) ? prev.filter((id) => id !== buId) : [...prev, buId]
    );
  };

  const handleSelectAllBUs = () => {
    if (selectedBuIds.length === businessUnits.length) {
      setSelectedBuIds([]);
    } else {
      setSelectedBuIds(businessUnits.map((b) => b.id));
    }
  };

  // 1. Export Single Business Unit Report
  const handleExportSingleBU = (bu: BusinessUnit) => {
    setExportingBuId(bu.id);
    try {
      generateSingleBUReportPDF({
        businessUnit: bu,
        timeframe: selectedTimeframe,
        allTickets,
        departments,
        allUsers,
        currentUser,
        status: selectedStatus,
        priority: selectedPriority,
      });
      onShowToast(`Individual PDF report for ${bu.code} downloaded successfully!`, 'success');
    } catch (err) {
      console.error('Error generating single BU report:', err);
      onShowToast(`Failed to generate report for ${bu.name}.`, 'error');
    } finally {
      setExportingBuId(null);
    }
  };

  // 2. Export Separate Reports for ALL (or Selected) Business Units in Sequence
  const handleBatchExportSeparateReports = async () => {
    const targetBUs = businessUnits.filter((bu) => selectedBuIds.includes(bu.id));
    if (targetBUs.length === 0) {
      onShowToast('Please select at least one Business Unit to export.', 'error');
      return;
    }

    setIsExportingBatch(true);
    setCompletedBUs([]);
    setBatchProgress({ current: 0, total: targetBUs.length, currentBuName: 'Starting...' });

    try {
      await generateAllIndividualBUReportsPDF({
        businessUnits: targetBUs,
        timeframe: selectedTimeframe,
        allTickets,
        departments,
        allUsers,
        currentUser,
        status: selectedStatus,
        priority: selectedPriority,
        onProgress: (currentBU, index, total) => {
          setBatchProgress({
            current: index,
            total,
            currentBuName: currentBU.name,
          });
          setCompletedBUs((prev) => [...prev, currentBU.id]);
        },
      });

      onShowToast(
        `Successfully generated and downloaded ${targetBUs.length} separate Business Unit reports!`,
        'success'
      );
    } catch (err) {
      console.error('Batch export error:', err);
      onShowToast('Encountered an issue generating some reports.', 'error');
    } finally {
      setIsExportingBatch(false);
      setTimeout(() => {
        setBatchProgress(null);
      }, 2500);
    }
  };

  // 3. Optional Consolidated Master PDF
  const handleExportConsolidated = () => {
    try {
      generateSupportReportPDF({
        tickets: allTickets,
        metrics: computeTicketMetrics(allTickets),
        filters: {
          timeframe: selectedTimeframe,
          businessUnitId: 'ALL',
          departmentId: 'ALL',
          status: selectedStatus,
          priority: selectedPriority,
          searchQuery: '',
        },
        currentUser,
        businessUnits,
        departments,
        allUsers,
      });
      onShowToast('Consolidated Master PDF downloaded!', 'success');
    } catch (err) {
      console.error('Consolidated export error:', err);
      onShowToast('Failed to export consolidated report.', 'error');
    }
  };

  return (
    <div
      id="export-report-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        id="export-report-modal-container"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <FileDown className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Export Business Unit Audit Reports
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate separate, dedicated PDF reports for each individual Business Unit
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700">
          {/* Top Filter Parameters Row */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Report Generation Parameters
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Timeframe selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Timeframe Period
                </label>
                <div className="relative">
                  <select
                    value={selectedTimeframe}
                    onChange={(e) => setSelectedTimeframe(e.target.value as TimeframeOption)}
                    className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="MONTHLY">This Month (Past 30 Days)</option>
                    <option value="WEEKLY">This Week (Past 7 Days)</option>
                    <option value="DAILY">Today (Past 24 Hours)</option>
                    <option value="YEARLY">This Year (Past 365 Days)</option>
                  </select>
                </div>
              </div>

              {/* Status selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Status Scope
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="ALL">All Statuses (Open, In Progress, Resolved, Closed)</option>
                  <option value="OPEN">Open Only</option>
                  <option value="IN_PROGRESS">In Progress Only</option>
                  <option value="RESOLVED">Resolved Only</option>
                  <option value="CLOSED">Closed Only</option>
                </select>
              </div>

              {/* Priority selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Priority Scope
                </label>
                <select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="URGENT">Urgent (Red)</option>
                  <option value="HIGH">High (Amber)</option>
                  <option value="MEDIUM">Medium (Blue)</option>
                  <option value="LOW">Low (Gray)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Primary Action for Admin: Batch Export Separate BU Reports */}
          {isAdmin && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-2xl p-5 border border-blue-200/80 shadow-xs relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white">
                      Recommended Admin Action
                    </span>
                    <span className="text-xs font-semibold text-blue-900">
                      Multi-File Batch Generation
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Generate Separate PDF Reports for Every Business Unit
                  </h3>
                  <p className="text-xs text-slate-600 max-w-xl">
                    Downloads {selectedBuIds.length} individual, dedicated PDF reports (one file per Business Unit) with custom brand headers, isolated KPIs, and specific department ticket registries.
                  </p>
                </div>

                <button
                  id="btn-batch-export-all-bu"
                  disabled={isExportingBatch || selectedBuIds.length === 0}
                  onClick={handleBatchExportSeparateReports}
                  className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  {isExportingBatch ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Generating ({batchProgress?.current}/{batchProgress?.total})...</span>
                    </>
                  ) : (
                    <>
                      <FileDown className="w-4 h-4 text-white" />
                      <span>Download {selectedBuIds.length} Separate BU Reports</span>
                    </>
                  )}
                </button>
              </div>

              {/* Live Batch Progress Indicator */}
              {isExportingBatch && batchProgress && (
                <div className="mt-4 pt-4 border-t border-blue-200/60 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs font-medium text-blue-900 mb-1.5">
                    <span>
                      Generating individual PDF: <strong className="font-bold">{batchProgress.currentBuName}</strong>
                    </span>
                    <span className="font-mono font-bold">
                      {Math.round((batchProgress.current / batchProgress.total) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-blue-200/60 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Business Unit Selection Grid & Individual Instant Exports */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  {isAdmin ? 'Business Units (Export Individual or Select Subset)' : 'Your Assigned Business Unit'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {isAdmin
                    ? 'Click "Download PDF" on any card for an instant single-unit report, or toggle checkboxes for batch export.'
                    : 'Download your department’s standalone operational audit report.'}
                </p>
              </div>

              {isAdmin && (
                <button
                  type="button"
                  onClick={handleSelectAllBUs}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 transition"
                >
                  {selectedBuIds.length === businessUnits.length ? (
                    <>
                      <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                      <span>Deselect All</span>
                    </>
                  ) : (
                    <>
                      <Square className="w-3.5 h-3.5 text-slate-400" />
                      <span>Select All 6 Units</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {businessUnits.map((bu) => {
                const isSelected = selectedBuIds.includes(bu.id);
                const isCompleted = completedBUs.includes(bu.id);
                const isCurrentlyExporting = exportingBuId === bu.id;
                const buTickets = allTickets.filter((t) => t.businessUnitId === bu.id);
                const buDepts = departments.filter((d) => d.businessUnitId === bu.id);
                const openCount = buTickets.filter((t) => t.status === 'OPEN').length;
                const urgentCount = buTickets.filter((t) => t.priority === 'URGENT').length;
                const brandColor = bu.branding?.primaryColor || '#2563eb';

                // For non-admin, only show their own BU
                if (!isAdmin && bu.id !== currentUser.businessUnitId) {
                  return null;
                }

                return (
                  <div
                    key={bu.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-white border-blue-300 shadow-xs ring-1 ring-blue-100'
                        : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start space-x-3">
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => toggleSelectBu(bu.id)}
                            className="mt-0.5 text-slate-400 hover:text-blue-600 transition"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300" />
                            )}
                          </button>
                        )}

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-2xs"
                              style={{ backgroundColor: brandColor }}
                            >
                              {bu.code}
                            </span>
                            <h4 className="text-xs font-bold text-slate-900">
                              {bu.name}
                            </h4>
                          </div>

                          <div className="text-[11px] text-slate-500 flex items-center gap-3">
                            <span>
                              <strong>{buTickets.length}</strong> total tickets
                            </span>
                            <span>•</span>
                            <span className="text-amber-700 font-medium">
                              <strong>{openCount}</strong> open
                            </span>
                            {urgentCount > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-rose-600 font-bold">
                                  <strong>{urgentCount}</strong> urgent
                                </span>
                              </>
                            )}
                          </div>

                          <div className="text-[10px] text-slate-400">
                            Depts: {buDepts.map((d) => d.code).join(', ') || 'General'}
                          </div>
                        </div>
                      </div>

                      {/* Instant Single BU Download Button */}
                      <button
                        id={`btn-export-single-bu-${bu.code}`}
                        disabled={isCurrentlyExporting || isExportingBatch}
                        onClick={() => handleExportSingleBU(bu)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-300 hover:border-blue-500 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-semibold shadow-2xs transition flex items-center gap-1.5 shrink-0"
                        title={`Download separate PDF report for ${bu.name}`}
                      >
                        {isCurrentlyExporting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                        ) : isCompleted ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Download className="w-3.5 h-3.5 text-slate-500" />
                        )}
                        <span className="text-[11px]">PDF</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Secondary Option: Consolidated Master Report */}
          {isAdmin && (
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>Need a single combined audit document instead?</span>
              </div>
              <button
                type="button"
                onClick={handleExportConsolidated}
                className="text-slate-700 hover:text-blue-600 font-semibold underline underline-offset-2 transition cursor-pointer"
              >
                Download Consolidated Master PDF (All Units in 1 file)
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Format: High-resolution vector PDF with individual BU KPI matrices</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              Close
            </button>

            {isAdmin && (
              <button
                disabled={isExportingBatch || selectedBuIds.length === 0}
                onClick={handleBatchExportSeparateReports}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5"
              >
                <FileDown className="w-3.5 h-3.5 text-white" />
                <span>Export ({selectedBuIds.length}) Reports</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
