/**
 * @file LoginScreen.tsx
 * @description Enterprise Multi-Business Unit Login Screen (Refined Light Theme).
 * Supports standard authentication, first-time password reset redirect, and quick demo role selection.
 */

import React, { useState } from 'react';
import {
  Lock,
  User as UserIcon,
  Shield,
  Building2,
  Building,
  Utensils,
  Hotel,
  Activity,
  Landmark,
  ArrowRight,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { User, BusinessUnit } from '../types';
import { SEED_USERS } from '../data/seedData';
import { getBUTheme } from '../utils/themeUtils';
import { BUBadge } from './BUBadge';

interface LoginScreenProps {
  onLogin: (userOrUsername: User | string, password?: string) => { success: boolean; error?: string; user?: User } | void;
  businessUnits: BusinessUnit[];
  allUsers?: User[];
  onResetSeedData?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLogin,
  businessUnits,
  allUsers,
  onResetSeedData,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const availableUsers = allUsers && allUsers.length > 0 ? allUsers : SEED_USERS;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername) {
      setErrorMessage('Please enter your username.');
      return;
    }

    if (!cleanPassword) {
      setErrorMessage('Please enter your password.');
      return;
    }

    const result = onLogin(cleanUsername, cleanPassword);
    if (result && !result.success) {
      setErrorMessage(result.error || 'Invalid credentials. Please verify your username and password.');
    }
  };

  const handleSelectUser = (user: User, autoSubmit: boolean = false) => {
    setUsername(user.username);
    setPassword(user.password || 'password123');
    setSelectedUserId(user.id);
    setErrorMessage(null);

    if (autoSubmit) {
      onLogin(user);
    }
  };

  const getBUIcon = (code?: string) => {
    switch (code) {
      case 'CCEC':
        return <Building2 className="w-3.5 h-3.5 text-blue-600" />;
      case 'FNB':
        return <Utensils className="w-3.5 h-3.5 text-amber-600" />;
      case 'HOTEL':
        return <Hotel className="w-3.5 h-3.5 text-indigo-600" />;
      case 'KLBS':
        return <Building className="w-3.5 h-3.5 text-sky-600" />;
      case 'KLW':
        return <Activity className="w-3.5 h-3.5 text-emerald-600" />;
      case 'UOA HQ':
      case 'UOA_HQ':
        return <Landmark className="w-3.5 h-3.5 text-purple-600" />;
      default:
        return <Building2 className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 font-sans antialiased">
      {/* Background Decorative Accent */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-100/60 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-1/3 w-[400px] h-[400px] bg-indigo-100/60 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Portal Authentication Card (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col justify-between">
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
                  Multi-Business Unit Portal (CCEC • F&amp;B • HOTEL • KLBS • KLW • UOA HQ)
                </p>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Sign In to Your Workspace</h2>
                {selectedUserId && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 animate-in fade-in">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Autofilled
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Enter your credentials or click any demo persona from the right to auto-fill.
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
                  <span>Username</span>
                </label>
                <input
                  id="login-input-username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin or marcus.hall"
                  className="w-full text-xs rounded-xl bg-slate-50 border border-slate-300 p-3 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none font-mono transition"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-blue-600" />
                    <span>Password</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Default: password123</span>
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
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center space-x-2 transition"
              >
                <span>Authenticate &amp; Access Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-purple-600" />
              Role-Based Access (Admin / IT / Staff)
            </span>
            <span className="font-mono text-slate-400">v2.4.0</span>
          </div>
        </div>

        {/* Right Column: Quick Demo Personas (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                Quick Demo Access
              </h3>
              <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 font-semibold px-2 py-0.5 rounded-full">
                Instant Login
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Select any role below to test RBAC boundaries and permissions instantly:
            </p>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {availableUsers.map((user) => {
                const bu = businessUnits.find((b) => b.id === user.businessUnitId);
                const buTheme = getBUTheme(bu, businessUnits);
                const isGlobalAdmin = user.role === 'ADMIN';
                const isSelected = selectedUserId === user.id;

                return (
                  <div
                    key={user.id}
                    className={`w-full p-2.5 rounded-2xl border transition flex items-center justify-between group cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-400 shadow-xs'
                        : 'bg-slate-50 hover:bg-blue-50/40 border-slate-200/80 hover:border-blue-200'
                    }`}
                    onClick={() => handleSelectUser(user, false)}
                  >
                    <div className="flex items-center space-x-2.5 truncate flex-1 min-w-0">
                      <img
                        src={
                          user.avatarUrl ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`
                        }
                        alt={user.fullName}
                        className="w-8 h-8 rounded-full object-cover border border-slate-200 bg-white shrink-0"
                      />
                      <div className="truncate">
                        <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700 truncate">
                          {user.fullName}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                          <span
                            className={`font-semibold ${
                              user.role === 'ADMIN'
                                ? 'text-purple-600'
                                : user.role === 'IT'
                                ? 'text-blue-600'
                                : 'text-emerald-600'
                            }`}
                          >
                            {user.role}
                          </span>
                          <span>•</span>
                          {isGlobalAdmin ? (
                            <span className="text-purple-700 font-semibold">Global Admin</span>
                          ) : (
                            <BUBadge businessUnit={bu} allBusinessUnits={businessUnits} size="sm" />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center space-x-1 pl-2">
                      <button
                        type="button"
                        id={`login-quick-${user.username}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectUser(user, true);
                        }}
                        style={!isGlobalAdmin ? { backgroundColor: buTheme.primary } : undefined}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold text-white shadow-xs transition flex items-center gap-1 hover:opacity-90 cursor-pointer ${
                          isGlobalAdmin ? 'bg-purple-600 hover:bg-purple-700' : ''
                        }`}
                        title={`Instant Login as ${user.fullName}`}
                      >
                        <span>Login</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Click any persona above for immediate one-click testing</span>
          </div>
        </div>
      </div>
    </div>
  );
};
