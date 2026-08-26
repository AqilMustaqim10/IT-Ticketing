/**
 * @file GitGuideModal.tsx
 * @description In-app interactive Git Workflow & Terminal Command Center.
 * Provides copyable step-by-step Git commands (git add, git commit, git push)
 * organized by feature module for clean GitHub version control.
 */

import React, { useState } from 'react';
import {
  X,
  GitBranch,
  Copy,
  Check,
  Terminal,
  FolderTree,
  FileCode,
  Layers,
} from 'lucide-react';

interface GitGuideModalProps {
  onClose: () => void;
}

export const GitGuideModal: React.FC<GitGuideModalProps> = ({ onClose }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const gitSteps = [
    {
      title: 'Step 1: Multi-Business Unit Data Models & Schema Setup',
      desc: 'Stage and commit the core types, business unit seeds, and RBAC storage layer.',
      command: `git add src/types.ts src/data/seedData.ts src/services/storageService.ts\ngit commit -m "feat(schema): initialize multi-business-unit data models, seed data & storage service"\ngit push origin main`,
    },
    {
      title: 'Step 2: Role-Based Access Control & User Provisioning UI',
      desc: 'Stage and commit the navigation header, user management directory, and IT registration modal.',
      command: `git add src/components/Header.tsx src/components/UserManagementModal.tsx\ngit commit -m "feat(auth): implement RBAC header, user directory, and scoped IT registration"\ngit push origin main`,
    },
    {
      title: 'Step 3: Dashboard Timeframe & Business Unit Filters',
      desc: 'Stage and commit the interactive filter bar with daily/weekly/monthly/yearly toggles.',
      command: `git add src/components/FilterBar.tsx src/components/StatCards.tsx\ngit commit -m "feat(dashboard): add timeframe filters, BU selector, and priority stat cards"\ngit push origin main`,
    },
    {
      title: 'Step 4: Ticket Management & PDF Summary Exporter',
      desc: 'Stage and commit ticket list, detail modal, ticket creation, and jsPDF reporting utility.',
      command: `git add src/components/TicketList.tsx src/components/TicketDetailModal.tsx src/components/CreateTicketModal.tsx src/utils/pdfExport.ts\ngit commit -m "feat(tickets): add ticket creation, lifecycle workflows, and PDF report export"\ngit push origin main`,
    },
    {
      title: 'Step 5: Password Lifecycle, First-Time Login & Admin Reset Workflow',
      desc: 'Stage and commit the mandatory Change Password modal, Login Screen, and Default Password reset actions.',
      command: `git add src/components/ChangePasswordModal.tsx src/components/LoginScreen.tsx src/components/UserManagementModal.tsx src/services/storageService.ts src/types.ts\ngit commit -m "feat(auth): add first-time password change popup, auto logout, and IT/Admin password reset"\ngit push origin main`,
    },
    {
      title: 'Step 6: Complete Application Integration & Full Build Verification',
      desc: 'Stage all files and commit the finalized full-stack architecture.',
      command: `git add .\ngit commit -m "feat: complete IT Support Ticketing system with multi-business-unit RBAC, password lifecycle & PDF reporting"\ngit push origin main`,
    },
  ];

  const handleCopy = (cmd: string, index: number) => {
    navigator.clipboard.writeText(cmd);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div
      id="modal-git-guide-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        id="modal-git-guide-panel"
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 text-slate-900 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-xs">
              <GitBranch className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Git Terminal Commands &amp; Push Guide
              </h2>
              <p className="text-xs text-slate-500">
                Step-by-step git version control commands for every feature module
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700 flex items-start gap-2">
            <Terminal className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Terminal Workflow:</span> Copy any command block below
              and paste it into your local terminal to commit your codebase changes incrementally to
              GitHub.
            </div>
          </div>

          <div className="space-y-4">
            {gitSteps.map((step, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2 hover:border-slate-300 transition"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900">{step.title}</h3>
                  <button
                    onClick={() => handleCopy(step.command, idx)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded transition"
                  >
                    {copiedIndex === idx ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Commands</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">{step.desc}</p>
                <pre className="p-3 rounded-lg bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
                  {step.command}
                </pre>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
