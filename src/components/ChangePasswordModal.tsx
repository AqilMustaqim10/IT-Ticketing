/**
 * @file ChangePasswordModal.tsx
 * @description Mandatory First-Time / Administrative Reset Password Change Modal.
 * Blockingly prevents user from accessing the system until they change their default password.
 * Enforces strong password validation, rejects default password reuse, and automatically
 * logs out the user upon successful update so they must log in with their new credentials.
 */

import React, { useState } from 'react';
import {
  KeyRound,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  ArrowRight,
  LogOut,
  Info,
} from 'lucide-react';
import { User } from '../types';
import { DEFAULT_USER_PASSWORD } from '../services/storageService';

interface ChangePasswordModalProps {
  currentUser: User;
  onPasswordChanged: () => void;
  onCancelLogout: () => void;
  onChangePasswordSubmit: (
    currentPass: string,
    newPass: string
  ) => { success: boolean; error?: string };
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  currentUser,
  onPasswordChanged,
  onCancelLogout,
  onChangePasswordSubmit,
}) => {
  const [currentPassword, setCurrentPassword] = useState(DEFAULT_USER_PASSWORD);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // 1. Basic validation
    if (!currentPassword.trim()) {
      setErrorMessage('Please enter your current temporary password.');
      return;
    }

    if (!newPassword.trim() || newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword === DEFAULT_USER_PASSWORD) {
      setErrorMessage(
        `Your new password cannot be the system default password ('${DEFAULT_USER_PASSWORD}'). Please choose a unique password.`
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirmation do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = onChangePasswordSubmit(currentPassword, newPassword);
      if (result.success) {
        onPasswordChanged();
      } else {
        setErrorMessage(result.error || 'Failed to update password.');
      }
    } catch {
      setErrorMessage('An unexpected error occurred while updating your password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="modal-change-password-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-change-password-title"
    >
      <div
        id="modal-change-password-panel"
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 px-6 py-5 text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur-xs text-white border border-white/20">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h2 id="modal-change-password-title" className="text-base font-bold text-white leading-snug">
                Password Change Required
              </h2>
              <p className="text-xs text-blue-100 mt-0.5">
                First-time sign-in / Credential security update
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Informational Advisory Notice */}
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-950">
                Welcome, {currentUser.fullName}!
              </p>
              <p className="mt-1 text-amber-800 leading-relaxed text-[11px]">
                Your account was provisioned with a default password. For security reasons, you must set a private password before accessing the system.
              </p>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div
              id="change-pass-error-alert"
              className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Current / Default Password */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Current / Default Password</span>
              <span className="text-[11px] font-normal text-slate-400">
                Default is <code className="font-mono text-blue-600 font-semibold bg-blue-50 px-1 rounded">{DEFAULT_USER_PASSWORD}</code>
              </span>
            </label>
            <div className="relative">
              <input
                id="input-current-password"
                type={showCurrent ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current default password"
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 pr-10 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <Lock className="w-3 h-3 text-slate-400" />
              <span>New Personalized Password *</span>
            </label>
            <div className="relative">
              <input
                id="input-new-password"
                type={showNew ? 'text' : 'password'}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 pr-10 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowNew(!showNew)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-500">
              Must not equal default password ({DEFAULT_USER_PASSWORD}).
            </p>
          </div>

          {/* Confirm New Password */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-slate-400" />
              <span>Confirm New Password *</span>
            </label>
            <div className="relative">
              <input
                id="input-confirm-password"
                type={showConfirm ? 'text' : 'password'}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 pr-10 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Workflow Explanation Banner */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2">
            <span className="font-semibold text-slate-800">Note:</span>
            <span>After setting your new password, you will be automatically signed out and will need to log in with your new credentials.</span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
            <button
              id="btn-cancel-logout"
              type="button"
              onClick={onCancelLogout}
              className="w-full sm:w-auto sm:flex-1 py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
            <button
              id="btn-submit-change-password"
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto sm:flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Updating...' : 'Set Password & Log Out'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
