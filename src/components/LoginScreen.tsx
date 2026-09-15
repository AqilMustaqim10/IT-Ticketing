/**
 * @file LoginScreen.tsx
 * @description Enterprise Multi-Business Unit Login Screen (Refined Light Theme).
 * Enforces standard credential-based authentication.
 */

import React, { useState } from 'react';
import {
  Lock,
  User as UserIcon,
  Shield,
  Building2,
  ArrowRight,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { User, BusinessUnit } from '../types';

interface LoginScreenProps {
  onLogin: (userOrUsername: User | string, password?: string) => { success: boolean; error?: string; user?: User } | void;
  businessUnits: BusinessUnit[];
  allUsers?: User[];
  onResetSeedData?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLogin,
  businessUnits,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername) {
      setErrorMessage('Please enter your Staff Email or User ID.');
      return;
    }

    if (!cleanPassword) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      const result = onLogin(cleanUsername, cleanPassword);
      if (result && !result.success) {
        setErrorMessage(result.error || 'Invalid credentials. Please check your username and password.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col justify-center items-center p-4 sm:p-6 font-sans antialiased">
      {/* Background Decorative Accent */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-100/60 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-1/3 w-[400px] h-[400px] bg-indigo-100/60 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col justify-between">
          <div>
            {/* Branding Header */}
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-blue-500/20">
                IT
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  IT Support Desk
                </h1>
                <p className="text-xs text-slate-500">
                  UOA Hospitality Enterprise Portal
                </p>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900">Sign In to Your Workspace</h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter your Corporate Email or Staff User ID to continue.
              </p>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div
                id="login-error-alert"
                className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 animate-in fade-in"
              >
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-blue-600" />
                  <span>Staff Email or User ID</span>
                </label>
                <input
                  id="login-input-username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin@uoa.com.my or aaqil"
                  className="w-full text-xs rounded-xl bg-slate-50 border border-slate-300 p-3 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none font-sans transition"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-blue-600" />
                    <span>Password</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Default: password123</span>
                </label>
                <input
                  id="login-input-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full text-xs rounded-xl bg-slate-50 border border-slate-300 p-3 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition"
                />
              </div>

              <button
                id="login-btn-submit"
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center space-x-2 transition cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Authenticate &amp; Access Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-purple-600" />
              Enterprise RBAC Enforcement
            </span>
            <span className="font-mono text-slate-400">v2.4.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};
