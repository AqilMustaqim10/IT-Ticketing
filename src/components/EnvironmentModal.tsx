/**
 * @file EnvironmentModal.tsx
 * @description Dialog for switching between UAT (Testing Sandbox) and Production (Live Operational) environments.
 * Highlights data isolation, current dataset statistics, and provides sandbox reset functionality.
 */

import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  FlaskConical,
  Database,
  ArrowRightLeft,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  Server,
  Layers,
} from 'lucide-react';
import { AppEnvironment } from '../types';
import { storageService } from '../services/storageService';

interface EnvironmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEnvironment: AppEnvironment;
  onEnvironmentChange: (env: AppEnvironment) => void;
  onShowToast: (type: 'success' | 'info' | 'error', text: string) => void;
}

export const EnvironmentModal: React.FC<EnvironmentModalProps> = ({
  isOpen,
  onClose,
  currentEnvironment,
  onEnvironmentChange,
  onShowToast,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const stats = storageService.getEnvironmentStats();

  if (!isOpen) return null;

  const handleSwitch = (targetEnv: AppEnvironment) => {
    if (targetEnv === currentEnvironment) return;
    onEnvironmentChange(targetEnv);
    onShowToast(
      'success',
      targetEnv === 'UAT'
        ? 'Switched to UAT Testing Sandbox. Changes are isolated.'
        : 'Switched to Production Live environment.'
    );
    onClose();
  };

  const handleResetUat = () => {
    if (window.confirm('Reset all UAT sandbox tickets and restore factory test cases? This will not affect Production.')) {
      storageService.resetUatSandbox();
      onShowToast('info', 'UAT Sandbox tickets restored to default test scenario.');
      onClose();
    }
  };

  const handleCopyEnvLink = (env: AppEnvironment) => {
    const url = new URL(window.location.href);
    url.searchParams.set('env', env.toLowerCase());
    navigator.clipboard.writeText(url.toString());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    onShowToast('success', `Copied direct link to ${env} environment!`);
  };

  return (
    <div
      id="modal-environment-switch"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Environment Management
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Separate testing activities from live operational helpdesk data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Active Environment Banner */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3.5 ${
              currentEnvironment === 'UAT'
                ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                : 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
            }`}
          >
            <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 shadow-xs shrink-0 mt-0.5">
              {currentEnvironment === 'UAT' ? (
                <FlaskConical className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">
                  Active Mode: {currentEnvironment === 'UAT' ? 'UAT (Testing Sandbox)' : 'Production (Live)'}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/90 dark:bg-slate-900/90 shadow-2xs">
                  Current
                </span>
              </div>
              <p className="text-xs mt-1 text-slate-600 dark:text-slate-300 leading-relaxed">
                {currentEnvironment === 'UAT'
                  ? 'All ticket creation, email simulations, and status updates are strictly contained within the isolated UAT data partition. Production records are safe and untouched.'
                  : 'You are operating on the live company ticketing system. Incident tickets, SLAs, and assignments represent real business workflows.'}
              </p>
            </div>
          </div>

          {/* Environment Cards Comparison & Switcher */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* UAT Card */}
            <div
              className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                currentEnvironment === 'UAT'
                  ? 'border-amber-500 bg-amber-50/30 dark:bg-amber-950/20 ring-2 ring-amber-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40'
              }`}
              onClick={() => handleSwitch('UAT')}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <FlaskConical className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">UAT Sandbox</h4>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Testing & Trial</span>
                  </div>
                </div>
                {currentEnvironment === 'UAT' && (
                  <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                )}
              </div>

              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-normal mb-3">
                Pre-seeded with test tickets, hardware incident simulations, and diagnostic logs.
              </p>

              <div className="flex items-center justify-between text-[11px] font-medium pt-2 border-t border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <span>Stored Tickets:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{stats.uatTicketCount} tickets</span>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSwitch('UAT');
                  }}
                  disabled={currentEnvironment === 'UAT'}
                  className={`w-full py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                    currentEnvironment === 'UAT'
                      ? 'bg-amber-600 text-white cursor-default'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {currentEnvironment === 'UAT' ? 'Active Sandbox' : 'Switch to UAT'}
                </button>
              </div>
            </div>

            {/* Production Card */}
            <div
              className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                currentEnvironment === 'PRODUCTION'
                  ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40'
              }`}
              onClick={() => handleSwitch('PRODUCTION')}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Production</h4>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Live Operations</span>
                  </div>
                </div>
                {currentEnvironment === 'PRODUCTION' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                )}
              </div>

              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-normal mb-3">
                Live helpdesk environment connected to official corporate mailboxes and operational audit trails.
              </p>

              <div className="flex items-center justify-between text-[11px] font-medium pt-2 border-t border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <span>Stored Tickets:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{stats.prodTicketCount} tickets</span>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSwitch('PRODUCTION');
                  }}
                  disabled={currentEnvironment === 'PRODUCTION'}
                  className={`w-full py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                    currentEnvironment === 'PRODUCTION'
                      ? 'bg-emerald-600 text-white cursor-default'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {currentEnvironment === 'PRODUCTION' ? 'Active Live' : 'Switch to Production'}
                </button>
              </div>
            </div>
          </div>

          {/* Sandbox Controls & Direct Links */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <RotateCcw className="w-4 h-4 text-slate-400" />
              <span>Need fresh test records for QA?</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopyEnvLink(currentEnvironment)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold cursor-pointer"
                title="Copy link to current environment"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>Copy {currentEnvironment} Link</span>
              </button>
              {currentEnvironment === 'UAT' && (
                <button
                  type="button"
                  onClick={handleResetUat}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-2xs transition cursor-pointer"
                  title="Reset UAT tickets only"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Sandbox</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
