/**
 * @file pdfExport.ts
 * @description Generates professional PDF summary reports for individual Business Units or batch exports
 * separate dedicated PDF reports for every Business Unit.
 * Includes dynamic BU branding colors, executive KPI metrics, departmental breakdowns, and formatted ticket listings.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Ticket,
  MetricSummary,
  DashboardFilterState,
  User,
  BusinessUnit,
  Department,
  TimeframeOption,
} from '../types';

/**
 * Converts Hex color string (#2563eb) to RGB array [37, 99, 235]
 */
function hexToRgb(hex?: string): [number, number, number] {
  if (!hex || !hex.startsWith('#')) return [15, 23, 42];
  let c = hex.substring(1);
  if (c.length === 3) {
    c = c.split('').map((char) => char + char).join('');
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return [15, 23, 42];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * Computes summary metrics for a given subset of tickets.
 */
export function computeTicketMetrics(ticketList: Ticket[]): MetricSummary {
  const total = ticketList.length;
  const open = ticketList.filter((t) => t.status === 'OPEN').length;
  const inProgress = ticketList.filter((t) => t.status === 'IN_PROGRESS').length;
  const resolved = ticketList.filter((t) => t.status === 'RESOLVED').length;
  const closed = ticketList.filter((t) => t.status === 'CLOSED').length;
  const urgent = ticketList.filter((t) => t.priority === 'URGENT').length;
  const high = ticketList.filter((t) => t.priority === 'HIGH').length;

  const completed = resolved + closed;
  const resolutionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  let totalResolutionHours = 0;
  let countedTickets = 0;
  ticketList.forEach((t) => {
    if ((t.status === 'RESOLVED' || t.status === 'CLOSED') && t.updatedAt) {
      const start = new Date(t.createdAt).getTime();
      const end = new Date(t.updatedAt).getTime();
      const hours = Math.max(0.5, (end - start) / (1000 * 60 * 60));
      totalResolutionHours += hours;
      countedTickets += 1;
    }
  });

  const avgResolutionHours =
    countedTickets > 0 ? Number((totalResolutionHours / countedTickets).toFixed(1)) : 3.5;

  return {
    totalTickets: total,
    openTickets: open,
    inProgressTickets: inProgress,
    resolvedTickets: resolved,
    closedTickets: closed,
    urgentTickets: urgent,
    highTickets: high,
    resolutionRate,
    avgResolutionHours,
  };
}

/**
 * Filters tickets by timeframe, status, and priority
 */
function filterTicketsByCriteria(
  tickets: Ticket[],
  timeframe: TimeframeOption,
  status?: string,
  priority?: string,
  departmentId?: string
): Ticket[] {
  const now = new Date();
  return tickets.filter((t) => {
    // Timeframe filter
    const createdDate = new Date(t.createdAt);
    const diffDays = (now.getTime() - createdDate.getTime()) / (1000 * 3600 * 24);

    let matchTime = true;
    switch (timeframe) {
      case 'DAILY':
        matchTime = diffDays <= 1;
        break;
      case 'WEEKLY':
        matchTime = diffDays <= 7;
        break;
      case 'MONTHLY':
        matchTime = diffDays <= 31;
        break;
      case 'YEARLY':
        matchTime = diffDays <= 366;
        break;
      default:
        matchTime = true;
    }
    if (!matchTime) return false;

    if (status && status !== 'ALL' && t.status !== status) return false;
    if (priority && priority !== 'ALL' && t.priority !== priority) return false;
    if (departmentId && departmentId !== 'ALL' && t.departmentId !== departmentId) return false;

    return true;
  });
}

export interface SingleBUReportOptions {
  businessUnit: BusinessUnit;
  timeframe: TimeframeOption;
  allTickets: Ticket[];
  departments: Department[];
  allUsers: User[];
  currentUser: User;
  status?: string;
  priority?: string;
  departmentId?: string;
}

/**
 * Generates and downloads a dedicated, standalone PDF report for a SINGLE Business Unit.
 */
export function generateSingleBUReportPDF({
  businessUnit,
  timeframe,
  allTickets,
  departments,
  allUsers,
  currentUser,
  status = 'ALL',
  priority = 'ALL',
  departmentId = 'ALL',
}: SingleBUReportOptions): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const currentDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const currentTimeStr = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Filter tickets strictly for this Business Unit
  const buTickets = allTickets.filter((t) => t.businessUnitId === businessUnit.id);
  const scopedTickets = filterTicketsByCriteria(buTickets, timeframe, status, priority, departmentId);
  const metrics = computeTicketMetrics(scopedTickets);
  const buDepts = departments.filter((d) => d.businessUnitId === businessUnit.id);

  const primaryRgb = hexToRgb(businessUnit.branding?.primaryColor || '#1e3a8a');
  const accentRgb = hexToRgb(businessUnit.branding?.accentColor || '#3b82f6');

  // =========================================================================
  // 1. Header Banner & Dynamic Brand Identity
  // =========================================================================
  // Primary BU Color Header Box
  doc.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Accent Line
  doc.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2]);
  doc.rect(0, 42, pageWidth, 2.5, 'F');

  // BU Badge Tag
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(14, 10, 24, 7, 1.5, 1.5, 'F');
  doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(businessUnit.code, 26, 14.8, { align: 'center' });

  // BU Name & Portal Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  const headerTitle = businessUnit.branding?.welcomeBannerTitle || `${businessUnit.name} Technical Operations`;
  doc.text(headerTitle, 42, 15.5);

  // Subtitle
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(226, 232, 240); // slate-200
  doc.text(
    `Business Unit: ${businessUnit.name} (${businessUnit.code}) • Timeframe: ${timeframe} Period`,
    14,
    25
  );

  // Support Contacts & Generation Metadata
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225); // slate-300
  const hotline = businessUnit.branding?.supportHotline || 'Internal Ext. 1800';
  const email = businessUnit.branding?.supportEmail || `it-support@${businessUnit.code.toLowerCase()}.uoa.my`;
  doc.text(`Support Desk: ${hotline} | ${email} | Desk: ${businessUnit.branding?.deskLocation || 'Level 3 IT'}`, 14, 31);
  doc.text(`Generated on ${currentDateStr} at ${currentTimeStr} by ${currentUser.fullName} (${currentUser.role})`, 14, 37);

  // =========================================================================
  // 2. Executive Parameters & Scope Table
  // =========================================================================
  doc.setTextColor(30, 41, 59); // slate-800
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Business Unit Operational Parameters', 14, 52);

  const filterRows = [
    [
      { content: 'Business Unit:', styles: { fontStyle: 'bold' as const, fillColor: [248, 250, 252] as [number, number, number] } },
      `${businessUnit.name} [${businessUnit.code}]`,
      { content: 'Timeframe Window:', styles: { fontStyle: 'bold' as const, fillColor: [248, 250, 252] as [number, number, number] } },
      `${timeframe} Filter`,
    ],
    [
      { content: 'Total BU Departments:', styles: { fontStyle: 'bold' as const, fillColor: [248, 250, 252] as [number, number, number] } },
      `${buDepts.length} Departments (${buDepts.map((d) => d.code).join(', ')})`,
      { content: 'Status Scope:', styles: { fontStyle: 'bold' as const, fillColor: [248, 250, 252] as [number, number, number] } },
      status === 'ALL' ? 'All Lifecycle Stages' : status,
    ],
    [
      { content: 'Priority Scope:', styles: { fontStyle: 'bold' as const, fillColor: [248, 250, 252] as [number, number, number] } },
      priority === 'ALL' ? 'All Priority Tiers' : priority,
      { content: 'Total Tickets in Unit:', styles: { fontStyle: 'bold' as const, fillColor: [248, 250, 252] as [number, number, number] } },
      `${scopedTickets.length} Support Incident Records`,
    ],
  ];

  autoTable(doc, {
    startY: 55,
    theme: 'grid',
    body: filterRows,
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 55 },
      2: { cellWidth: 38 },
      3: { cellWidth: 55 },
    },
  });

  // =========================================================================
  // 3. Operational Performance Summary Metrics (Stat Grid)
  // =========================================================================
  const nextY1 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`2. Key Performance Indicators for ${businessUnit.code}`, 14, nextY1);

  const kpiData = [
    [
      { content: 'Total Tickets', styles: { fontStyle: 'bold' as const } },
      { content: 'Open', styles: { fontStyle: 'bold' as const } },
      { content: 'In Progress', styles: { fontStyle: 'bold' as const } },
      { content: 'Resolved', styles: { fontStyle: 'bold' as const } },
      { content: 'Closed', styles: { fontStyle: 'bold' as const } },
      { content: 'Urgent/High', styles: { fontStyle: 'bold' as const } },
      { content: 'Resolution Rate', styles: { fontStyle: 'bold' as const } },
    ],
    [
      String(metrics.totalTickets),
      String(metrics.openTickets),
      String(metrics.inProgressTickets),
      String(metrics.resolvedTickets),
      String(metrics.closedTickets),
      `${metrics.urgentTickets} Urgent / ${metrics.highTickets} High`,
      `${metrics.resolutionRate}%`,
    ],
  ];

  autoTable(doc, {
    startY: nextY1 + 3,
    theme: 'plain',
    head: [kpiData[0]],
    body: [kpiData[1]],
    styles: {
      fontSize: 8.5,
      halign: 'center',
      cellPadding: 2.5,
      textColor: [15, 23, 42],
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: primaryRgb,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fillColor: [248, 250, 252],
      fontSize: 9.5,
      fontStyle: 'bold',
    },
  });

  // =========================================================================
  // 4. Ticket Breakdown Listing Table for this BU
  // =========================================================================
  const nextY2 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`3. Detailed Ticket Registry (${businessUnit.code} Records)`, 14, nextY2);

  const tableHeaders = ['Ticket #', 'Title & Subject', 'Department', 'Priority', 'Status', 'Assignee', 'Date'];

  const tableBody = scopedTickets.map((t) => {
    const dept = departments.find((d) => d.id === t.departmentId)?.code || 'N/A';
    const assignee = allUsers.find((u) => u.id === t.assignedToId)?.fullName.split(' ')[0] || 'Unassigned';
    const dateFormatted = new Date(t.createdAt).toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
    });

    return [
      t.ticketNumber,
      t.title.length > 42 ? t.title.substring(0, 40) + '...' : t.title,
      dept,
      t.priority,
      t.status.replace('_', ' '),
      assignee,
      dateFormatted,
    ];
  });

  autoTable(doc, {
    startY: nextY2 + 3,
    head: [tableHeaders],
    body: tableBody.length > 0 ? tableBody : [['No support tickets found for this Business Unit and filter.', '', '', '', '', '', '']],
    theme: 'striped',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: [30, 41, 59],
      valign: 'middle',
    },
    headStyles: {
      fillColor: primaryRgb,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 20, fontStyle: 'bold' },
      1: { cellWidth: 62 },
      2: { cellWidth: 20 },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 22, halign: 'center' },
      5: { cellWidth: 24 },
      6: { cellWidth: 18, halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        const val = data.cell.raw as string;
        if (val === 'URGENT') {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'HIGH') {
          data.cell.styles.textColor = [217, 119, 6];
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'MEDIUM') {
          data.cell.styles.textColor = [37, 99, 235];
        } else if (val === 'LOW') {
          data.cell.styles.textColor = [75, 85, 99];
        }
      }
    },
  });

  // =========================================================================
  // 5. Footer & Page Numbers
  // =========================================================================
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `IT Support Ticketing Web Application • ${businessUnit.name} [${businessUnit.code}] Audit • Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  // Trigger individual PDF download
  const cleanCode = businessUnit.code.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
  const filename = `IT-Support-Report-${cleanCode}-${timeframe}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

export interface BatchBUExportOptions {
  businessUnits: BusinessUnit[];
  timeframe: TimeframeOption;
  allTickets: Ticket[];
  departments: Department[];
  allUsers: User[];
  currentUser: User;
  status?: string;
  priority?: string;
  onProgress?: (currentBU: BusinessUnit, index: number, total: number) => void;
}

/**
 * Generates and downloads separate individual PDF files for ALL (or selected) Business Units in sequence.
 */
export async function generateAllIndividualBUReportsPDF({
  businessUnits,
  timeframe,
  allTickets,
  departments,
  allUsers,
  currentUser,
  status = 'ALL',
  priority = 'ALL',
  onProgress,
}: BatchBUExportOptions): Promise<{ totalGenerated: number }> {
  for (let i = 0; i < businessUnits.length; i++) {
    const bu = businessUnits[i];
    if (onProgress) {
      onProgress(bu, i + 1, businessUnits.length);
    }

    generateSingleBUReportPDF({
      businessUnit: bu,
      timeframe,
      allTickets,
      departments,
      allUsers,
      currentUser,
      status,
      priority,
    });

    // Small delay between consecutive browser downloads to prevent popup blocking
    if (i < businessUnits.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }

  return { totalGenerated: businessUnits.length };
}

interface LegacyPDFExportOptions {
  tickets: Ticket[];
  metrics: MetricSummary;
  filters: DashboardFilterState;
  currentUser: User;
  businessUnits: BusinessUnit[];
  departments: Department[];
  allUsers: User[];
}

/**
 * Generates single consolidated report (used as fallback or for scoped single BU).
 */
export function generateSupportReportPDF({
  tickets,
  metrics,
  filters,
  currentUser,
  businessUnits,
  departments,
  allUsers,
}: LegacyPDFExportOptions): void {
  if (filters.businessUnitId !== 'ALL') {
    const targetBU = businessUnits.find((b) => b.id === filters.businessUnitId);
    if (targetBU) {
      generateSingleBUReportPDF({
        businessUnit: targetBU,
        timeframe: filters.timeframe,
        allTickets: tickets,
        departments,
        allUsers,
        currentUser,
        status: filters.status,
        priority: filters.priority,
        departmentId: filters.departmentId,
      });
      return;
    }
  }

  // Fallback for full multi-unit consolidated summary if explicitly triggered
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const currentDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const currentTimeStr = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Dark Navy Header Box
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 38, 'F');

  // Accent Line
  doc.setFillColor(37, 99, 235); // blue-600
  doc.rect(0, 38, pageWidth, 2, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('CONSOLIDATED ENTERPRISE SUPPORT AUDIT', 14, 16);

  // Subtitle
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`Generated on ${currentDateStr} at ${currentTimeStr} | Author: ${currentUser.fullName} (${currentUser.role})`, 14, 23);
  doc.text('Scope: All 6 Business Units (CCEC, FNB, HOTEL, KLBS, KLW, UOA HQ)', 14, 29);

  // Summary Stat Table
  const nextY1 = 46;
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('1. Operational Performance Metrics', 14, nextY1);

  const kpiData = [
    [
      { content: 'Total Tickets', styles: { fontStyle: 'bold' as const } },
      { content: 'Open', styles: { fontStyle: 'bold' as const } },
      { content: 'In Progress', styles: { fontStyle: 'bold' as const } },
      { content: 'Resolved', styles: { fontStyle: 'bold' as const } },
      { content: 'Closed', styles: { fontStyle: 'bold' as const } },
      { content: 'Urgent/High', styles: { fontStyle: 'bold' as const } },
      { content: 'Resolution Rate', styles: { fontStyle: 'bold' as const } },
    ],
    [
      String(metrics.totalTickets),
      String(metrics.openTickets),
      String(metrics.inProgressTickets),
      String(metrics.resolvedTickets),
      String(metrics.closedTickets),
      `${metrics.urgentTickets} Urgent / ${metrics.highTickets} High`,
      `${metrics.resolutionRate}%`,
    ],
  ];

  autoTable(doc, {
    startY: nextY1 + 3,
    theme: 'plain',
    head: [kpiData[0]],
    body: [kpiData[1]],
    styles: {
      fontSize: 8.5,
      halign: 'center',
      cellPadding: 2.5,
      textColor: [15, 23, 42],
    },
    headStyles: {
      fillColor: [238, 242, 255],
      textColor: [30, 58, 138],
      fontStyle: 'bold',
    },
    bodyStyles: {
      fillColor: [248, 250, 252],
      fontSize: 9.5,
      fontStyle: 'bold',
    },
  });

  const nextY2 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('2. Consolidated Ticket Registry', 14, nextY2);

  const tableHeaders = ['Ticket #', 'Title & Summary', 'Unit', 'Dept', 'Priority', 'Status', 'Assignee', 'Date'];
  const tableBody = tickets.map((t) => {
    const unit = businessUnits.find((b) => b.id === t.businessUnitId)?.code || t.businessUnitId;
    const dept = departments.find((d) => d.id === t.departmentId)?.code || 'N/A';
    const assignee = allUsers.find((u) => u.id === t.assignedToId)?.fullName.split(' ')[0] || 'Unassigned';
    const dateFormatted = new Date(t.createdAt).toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
    });

    return [
      t.ticketNumber,
      t.title.length > 38 ? t.title.substring(0, 36) + '...' : t.title,
      unit,
      dept,
      t.priority,
      t.status.replace('_', ' '),
      assignee,
      dateFormatted,
    ];
  });

  autoTable(doc, {
    startY: nextY2 + 3,
    head: [tableHeaders],
    body: tableBody.length > 0 ? tableBody : [['No support tickets match the selected filters.', '', '', '', '', '', '', '']],
    theme: 'striped',
    styles: {
      fontSize: 7.8,
      cellPadding: 2,
      textColor: [30, 41, 59],
      valign: 'middle',
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 18, fontStyle: 'bold' },
      1: { cellWidth: 55 },
      2: { cellWidth: 15 },
      3: { cellWidth: 16 },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 20, halign: 'center' },
      6: { cellWidth: 24 },
      7: { cellWidth: 15, halign: 'center' },
    },
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `IT Support Ticketing Web Application • Consolidated Audit • Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  const filename = `IT-Support-Consolidated-Report-${filters.timeframe}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

