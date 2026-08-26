/**
 * @file ExportReportsPage.tsx
 * @description Dedicated Full Page for Business Unit Report Generation & PDF Audit Center.
 * Allows Global Administrators to generate and download individual PDF reports for each
 * Business Unit separately (CCEC, F&B, HOTEL, KLBS, KLW, UOA HQ) or run batch exports.
 */

import React, { useState } from 'react';
import {
  FileDown,
  Building2,
  CheckCircle2,
  Layers,
  Loader2,
  Filter,
  CheckSquare,
  Square,
  Download,
  Calendar,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import {
  BusinessUnit,
  Department,
  Ticket,
  User,
  TimeframeOption,
  DashboardFilterState,
} from '../../types';
import {
  generateSingleBUReportPDF,
  generateAllIndividualBUReportsPDF,
  generateSupportReportPDF,
  computeTicketMetrics,
} from '../../utils/pdfExport';

interface ExportReportsPageProps {
  currentUser: User;
  businessUnits: BusinessUnit[];
  departments: Department[];
  allTickets: Ticket[];
  allUsers: User[];
  activeFilters: DashboardFilterState;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const ExportReportsPage: React.FC<ExportReportsPageProps> = ({
  currentUser,
  businessUnits,
  departments,
  allTickets,
  allUsers,
  activeFilters,
  onShowToast,
}) => {
  const isAdmin = currentUser.role === 'ADMIN';

  // Filters for report generation
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeOption>(
    activeFilters.timeframe || 'MONTHLY'
  );
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');

  // Selected BUs for batch export
  const [selectedBuIds, setSelectedBuIds] = useState<string[]>(
    businessUnits.map((b) => b.id)
  );

  // Export progress states
  const [isExportingBatch, setIsExportingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
    currentBuName: string;
  } | null>(null);
  const [completedBUs, setCompletedBUs] = useState<string[]>([]);
  const [exportingBuId, setExportingBuId] = useState<string | null>(null);

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

  // 1. Export Single BU Report
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
      console.error('Single BU report error:', err);
      onShowToast(`Failed to generate report for ${bu.name}.`, 'error');
    } finally {
      setExportingBuId(null);
    }
  };

  // 2. Batch Export Separate Reports
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
        `Generated & downloaded ${targetBUs.length} separate Business Unit PDF reports!`,
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

  // 3. Consolidated Master Report
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
    <div id="page-export-reports" className="space-y-4 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-2xs shrink-0">
            <FileDown className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                Business Unit Audit & Reports
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/60">
                PDF Generator
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Generate isolated PDF audit reports for each Business Unit with branding and KPI metrics.
            </p>
          </div>
        </div>

        {isAdmin && (
          <button
            id="btn-page-batch-export-all"
            disabled={isExportingBatch || selectedBuIds.length === 0}
            onClick={handleBatchExportSeparateReports}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold text-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
          >
            {isExportingBatch ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                <span>Exporting ({batchProgress?.current}/{batchProgress?.total})...</span>
              </>
            ) : (
              <>
                <FileDown className="w-3.5 h-3.5 text-white" />
                <span>Batch Download ({selectedBuIds.length}) Reports</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Report Parameters Toolbar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-blue-600" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Audit Period & Scope Parameters
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Timeframe Period
            </label>
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value as TimeframeOption)}
              className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
            >
              <option value="MONTHLY">This Month (Past 30 Days)</option>
              <option value="WEEKLY">This Week (Past 7 Days)</option>
              <option value="DAILY">Today (Past 24 Hours)</option>
              <option value="YEARLY">This Year (Past 365 Days)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Status Scope
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
            >
              <option value="ALL">All Statuses (Open, In Progress, Resolved, Closed)</option>
              <option value="OPEN">Open Only</option>
              <option value="IN_PROGRESS">In Progress Only</option>
              <option value="RESOLVED">Resolved Only</option>
              <option value="CLOSED">Closed Only</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Priority Scope
            </label>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
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

      {/* Admin Multi-File Batch Export Feature Card */}
      {isAdmin && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50/60 rounded-2xl p-6 border border-blue-200/80 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-blue-600 text-white">
                  Multi-File Generator
                </span>
                <span className="text-xs font-bold text-blue-900">
                  Individual PDF Per Business Unit
                </span>
              </div>
              <h3 className="text-base font-black text-slate-900">
                Batch Generate Separate Reports for All Business Units
              </h3>
              <p className="text-xs text-slate-600 max-w-2xl">
                Automatically compiles and triggers {selectedBuIds.length} discrete PDF documents (CCEC, F&B, HOTEL, KLBS, KLW, UOA HQ) with custom brand headers, isolated KPIs, and department ticket tables.
              </p>
            </div>

            <button
              disabled={isExportingBatch || selectedBuIds.length === 0}
              onClick={handleBatchExportSeparateReports}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              {isExportingBatch ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Processing ({batchProgress?.current}/{batchProgress?.total})...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4 text-white" />
                  <span>Download {selectedBuIds.length} Separate PDFs</span>
                </>
              )}
            </button>
          </div>

          {/* Live Progress Bar */}
          {isExportingBatch && batchProgress && (
            <div className="pt-4 border-t border-blue-200/70 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-semibold text-blue-900">
                <span>
                  Generating individual PDF for: <strong>{batchProgress.currentBuName}</strong>
                </span>
                <span className="font-mono font-bold">
                  {Math.round((batchProgress.current / batchProgress.total) * 100)}%
                </span>
              </div>
              <div className="w-full bg-blue-200/70 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Business Unit Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              {isAdmin ? 'Business Units (Individual 1-Click Downloads)' : 'Your Assigned Business Unit'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAdmin
                ? 'Download a single unit’s standalone report instantly, or toggle checkboxes to customize batch export.'
                : 'Download your department’s standalone operational audit report.'}
            </p>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={handleSelectAllBUs}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 transition"
            >
              {selectedBuIds.length === businessUnits.length ? (
                <>
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                  <span>Deselect All</span>
                </>
              ) : (
                <>
                  <Square className="w-4 h-4 text-slate-400" />
                  <span>Select All ({businessUnits.length})</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {businessUnits.map((bu) => {
            const isSelected = selectedBuIds.includes(bu.id);
            const isCompleted = completedBUs.includes(bu.id);
            const isCurrentlyExporting = exportingBuId === bu.id;
            const buTickets = allTickets.filter((t) => t.businessUnitId === bu.id);
            const buDepts = departments.filter((d) => d.businessUnitId === bu.id);
            const openCount = buTickets.filter((t) => t.status === 'OPEN').length;
            const inProgressCount = buTickets.filter((t) => t.status === 'IN_PROGRESS').length;
            const resolvedCount = buTickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
            const urgentCount = buTickets.filter((t) => t.priority === 'URGENT').length;
            const brandColor = bu.branding?.primaryColor || '#2563eb';

            if (!isAdmin && bu.id !== currentUser.businessUnitId) {
              return null;
            }

            return (
              <div
                key={bu.id}
                className={`bg-white rounded-2xl p-5 border transition-all shadow-xs flex flex-col justify-between ${
                  isSelected ? 'border-blue-300 ring-1 ring-blue-100' : 'border-slate-200'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2.5">
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => toggleSelectBu(bu.id)}
                          className="text-slate-400 hover:text-blue-600 transition"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </button>
                      )}
                      <span
                        className="px-2.5 py-0.5 rounded-lg text-xs font-black text-white shadow-2xs"
                        style={{ backgroundColor: brandColor }}
                      >
                        {bu.code}
                      </span>
                    </div>

                    <span className="text-[11px] font-mono text-slate-400">
                      {buDepts.length} Departments
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{bu.name}</h3>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {buDepts.map((d) => d.name).join(', ') || 'General Ops'}
                    </p>
                  </div>

                  {/* Micro KPI Matrix */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Total</div>
                      <div className="text-xs font-black text-slate-900">{buTickets.length}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-amber-600 uppercase">Open</div>
                      <div className="text-xs font-black text-amber-700">{openCount + inProgressCount}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-emerald-600 uppercase">Resolved</div>
                      <div className="text-xs font-black text-emerald-700">{resolvedCount}</div>
                    </div>
                  </div>

                  {urgentCount > 0 && (
                    <div className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100 flex items-center gap-1.5">
                      <span>⚠️ {urgentCount} Urgent Tickets</span>
                    </div>
                  )}
                </div>

                {/* Instant Single BU Download Action */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Single Unit PDF</span>
                  <button
                    id={`btn-page-export-single-bu-${bu.code}`}
                    disabled={isCurrentlyExporting || isExportingBatch}
                    onClick={() => handleExportSingleBU(bu)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-bold shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {isCurrentlyExporting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    ) : isCompleted ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Secondary Combined Master Report Link */}
      {isAdmin && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-400" />
            <span>Need all Business Units compiled together into one single master PDF?</span>
          </div>
          <button
            type="button"
            onClick={handleExportConsolidated}
            className="text-blue-600 hover:text-blue-800 font-bold underline underline-offset-2 transition cursor-pointer"
          >
            Download Consolidated Master PDF
          </button>
        </div>
      )}
    </div>
  );
};
