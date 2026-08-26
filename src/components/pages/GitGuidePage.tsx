/**
 * @file GitGuidePage.tsx
 * @description Dedicated Full Page for Git Version Control & Deployment Commands.
 * Provides copyable step-by-step terminal commands organized by module.
 */

import React, { useState } from 'react';
import {
  GitBranch,
  Copy,
  Check,
  Terminal,
  FolderTree,
  FileCode,
  Layers,
  ShieldCheck,
  CheckCircle2,
  GitCommit,
  GitPullRequest,
  ExternalLink,
} from 'lucide-react';

interface GitGuidePageProps {}

export const GitGuidePage: React.FC<GitGuidePageProps> = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const gitSteps = [
    {
      title: 'Step 1: Multi-Business Unit Data Models & Schema Setup',
      desc: 'Stage and commit the core types, business unit seeds, and RBAC storage layer.',
      command: `git add src/types.ts src/data/seedData.ts src/services/storageService.ts\ngit commit -m "feat(schema): initialize multi-business-unit data models, seed data & storage service"\ngit push origin main`,
    },
    {
      title: 'Step 2: Role-Based Access Control & User Provisioning',
      desc: 'Stage and commit the user management directory, role permissions, and scoped IT registration views.',
      command: `git add src/components/Sidebar.tsx src/components/TopBar.tsx src/components/pages/UserDirectoryPage.tsx\ngit commit -m "feat(auth): implement RBAC sidebar, user directory page, and scoped staff registration"\ngit push origin main`,
    },
    {
      title: 'Step 3: Dashboard Timeframe & Business Unit Filters',
      desc: 'Stage and commit the interactive filter bar with daily/weekly/monthly/yearly toggles and metrics.',
      command: `git add src/components/FilterBar.tsx src/components/StatCards.tsx\ngit commit -m "feat(dashboard): add timeframe filters, BU selector, and priority stat cards"\ngit push origin main`,
    },
    {
      title: 'Step 4: Ticket Management & PDF Summary Exporter',
      desc: 'Stage and commit ticket list, detail modal, ticket creation, and jsPDF reporting utilities.',
      command: `git add src/components/TicketList.tsx src/components/TicketDetailModal.tsx src/components/CreateTicketModal.tsx src/utils/pdfExport.ts\ngit commit -m "feat(tickets): add ticket creation, lifecycle workflows, and PDF report export"\ngit push origin main`,
    },
    {
      title: 'Step 5: Dedicated Full-Page Navigation & Individual BU Report Generator',
      desc: 'Stage and commit the full-page layout router, separate BU PDF generation, and branding center.',
      command: `git add src/components/pages/ src/components/ExportReportModal.tsx src/App.tsx\ngit commit -m "feat(pages): convert sidebar tabs to full pages & add standalone BU PDF reports"\ngit push origin main`,
    },
    {
      title: 'Step 6: Complete Application Integration & Full Build Verification',
      desc: 'Stage all files and commit the finalized full-stack architecture.',
      command: `git add .\ngit commit -m "feat: complete IT Service Desk with full-page navigation, RBAC, branding & multi-BU reports"\ngit push origin main`,
    },
  ];

  const handleCopy = (cmd: string, index: number) => {
    navigator.clipboard.writeText(cmd);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  return (
    <div id="page-git-guide" className="space-y-4 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-2xs shrink-0">
            <GitBranch className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                Git Workflow & CLI Guide
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/60">
                DevOps
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Copyable command-line instructions for staging, committing, and pushing changes to GitHub.
            </p>
          </div>
        </div>
      </div>

      {/* Initial Remote Setup Box */}
      <div className="bg-slate-900 rounded-xl p-4 text-white shadow-2xs border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-blue-400" />
            <h2 className="text-xs font-semibold text-white">
              Initial Git Remote Setup
            </h2>
          </div>
          <span className="text-[10px] font-mono text-slate-400">bash / zsh</span>
        </div>

        <div className="bg-black/50 rounded-lg p-3 font-mono text-xs text-emerald-400 overflow-x-auto border border-slate-800 space-y-1">
          <p className="text-slate-500"># 1. Initialize local repository</p>
          <p>git init</p>
          <p className="text-slate-500 pt-1"># 2. Add remote repository origin</p>
          <p>git remote add origin https://github.com/YOUR_ORGANIZATION/it-support-portal.git</p>
          <p className="text-slate-500 pt-1"># 3. Rename branch to main</p>
          <p>git branch -M main</p>
        </div>
      </div>

      {/* Step by Step Progression Cards */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Modular Feature Commits
        </h2>

        <div className="grid grid-cols-1 gap-3">
          {gitSteps.map((step, idx) => {
            const isCopied = copiedIndex === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs space-y-2.5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 text-xs font-black flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">{step.title}</h3>
                    </div>
                    <p className="text-xs text-slate-500">{step.desc}</p>
                  </div>

                  <button
                    onClick={() => handleCopy(step.command, idx)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                      isCopied
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-white text-slate-700'
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copy Commands</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-slate-900 rounded-xl p-3.5 font-mono text-xs text-teal-300 overflow-x-auto border border-slate-800">
                  <pre className="whitespace-pre">{step.command}</pre>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
