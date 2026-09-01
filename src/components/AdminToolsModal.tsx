/**
 * @file AdminToolsModal.tsx
 * @description Dedicated Administrative System Utilities dialog.
 * Consolidates destructive and maintenance actions (Clear tickets, Reset seed data, Database sync)
 * in a clean, safe, and controlled dialog.
 */

import React, { useState } from 'react';
import {
  ShieldAlert,
  Trash2,
  RotateCcw,
  Database,
  RefreshCw,
  X,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { postgresBridge } from '../services/postgresBridgeService';
import { storageService } from '../services/storageService';
import { ConfirmModal } from './ConfirmModal';

interface AdminToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetData: () => void;
  onClearTickets: () => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const AdminToolsModal: React.FC<AdminToolsModalProps> = ({
  isOpen,
  onClose,
  onResetData,
  onClearTickets,
  onShowToast,
}) => {
  const [confirmAction, setConfirmAction] = useState<'CLEAR_TICKETS' | 'RESET_USERS' | null>(null);
  const [syncing, setSyncing] = useState(false);

  if (!isOpen) return null;

  const handleSyncDatabase = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await postgresBridge.syncAllToPostgres();
      if (res.success) {
        onShowToast('Database synchronized successfully with PostgreSQL!', 'success');
      } else {
        onShowToast('PostgreSQL sync failed: ' + (res.error || 'Server error'), 'error');
      }
    } catch {
      onShowToast('Could not reach PostgreSQL server.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-slate-900 text-white">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Admin System Utilities</h3>
                <p className="text-xs text-slate-500">Maintenance &amp; database operations</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {/* Tool 1: PostgreSQL Direct Sync */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800">Synchronize to PostgreSQL</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Push all local tickets, user profiles, and logs into your database tables.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSyncDatabase}
                disabled={syncing}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shrink-0 flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-blue-600' : ''}`} />
                <span>{syncing ? 'Syncing...' : 'Sync DB'}</span>
              </button>
            </div>

            {/* Tool 2: Reset User Accounts & Roles */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-slate-800">Reset User Directory</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Restore default accounts (admin, IT officers, staff) and initial passwords.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmAction('RESET_USERS')}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-amber-200 text-amber-800 hover:bg-amber-50 transition shrink-0 cursor-pointer shadow-2xs"
              >
                Reset Users
              </button>
            </div>

            {/* Tool 3: Clear All Support Tickets */}
            <div className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/30 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span className="text-xs font-bold text-rose-900">Clear All Tickets</span>
                </div>
                <p className="text-[11px] text-rose-700/70 mt-0.5">
                  Permanently delete all registered ticket data and email ingestion records.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmAction('CLEAR_TICKETS')}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition shrink-0 cursor-pointer shadow-2xs"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modals */}
      {confirmAction === 'CLEAR_TICKETS' && (
        <ConfirmModal
          isOpen={true}
          title="Clear All Tickets"
          message="Are you sure you want to permanently delete all tickets and activity records? This action cannot be undone."
          confirmLabel="Permanently Clear All Tickets"
          isDestructive={true}
          onConfirm={() => {
            onClearTickets();
            setConfirmAction(null);
            onClose();
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {confirmAction === 'RESET_USERS' && (
        <ConfirmModal
          isOpen={true}
          title="Reset User Accounts"
          message="Are you sure you want to reset all user accounts and departments back to default factory presets?"
          confirmLabel="Reset Accounts"
          isDestructive={true}
          onConfirm={() => {
            onResetData();
            setConfirmAction(null);
            onClose();
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </>
  );
};
