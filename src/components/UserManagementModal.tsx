/**
 * @file UserManagementModal.tsx
 * @description Multi-Business Unit RBAC User Directory and Registration Modal.
 * Strictly enforces that IT Support can ONLY register 'USER' staff within their own Business Unit,
 * while Administrators have global user provisioning across CCEC, FNB, and HOTEL.
 * Allows IT Support and Admins to reset user passwords back to default ('password123'),
 * requiring the user to change their password on next login.
 */

import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Users,
  Building2,
  Layers,
  Lock,
  CheckCircle2,
  AlertCircle,
  Shield,
  KeyRound,
  RotateCcw,
  Info,
  Trash2,
} from 'lucide-react';
import { User, BusinessUnit, Department, UserRole } from '../types';
import { DEFAULT_USER_PASSWORD } from '../services/storageService';
import { ConfirmModal } from './ConfirmModal';

interface UserManagementModalProps {
  currentUser: User;
  users: User[];
  businessUnits: BusinessUnit[];
  departments: Department[];
  onClose: () => void;
  onRegisterUser: (payload: {
    username: string;
    fullName: string;
    email: string;
    role: UserRole;
    businessUnitId: string;
    departmentId: string;
    avatarUrl?: string;
  }) => { success: boolean; error?: string };
  onResetPassword: (targetUserId: string) => { success: boolean; error?: string };
  onDeleteUser?: (targetUserId: string) => { success: boolean; error?: string };
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  currentUser,
  users,
  businessUnits,
  departments,
  onClose,
  onRegisterUser,
  onResetPassword,
  onDeleteUser,
}) => {
  const [activeTab, setActiveTab] = useState<'LIST' | 'REGISTER'>('LIST');

  // Form State
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('USER');
  const [selectedBUId, setSelectedBUId] = useState<string>(currentUser.businessUnitId);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Eligible Departments based on selected or locked Business Unit
  const activeBUId = currentUser.role === 'ADMIN' ? selectedBUId : currentUser.businessUnitId;
  const eligibleDepartments = departments.filter((d) => d.businessUnitId === activeBUId);

  // Ensure default department is selected
  React.useEffect(() => {
    if (eligibleDepartments.length > 0 && !selectedDeptId) {
      setSelectedDeptId(eligibleDepartments[0].id);
    }
  }, [eligibleDepartments, selectedDeptId]);

  const currentBU = businessUnits.find((b) => b.id === currentUser.businessUnitId);

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!username.trim() || !fullName.trim() || !email.trim()) {
      setFeedback({ type: 'error', message: 'Please fill in all required fields.' });
      return;
    }

    if (!selectedDeptId) {
      setFeedback({ type: 'error', message: 'Please assign a department.' });
      return;
    }

    const payload = {
      username: username.trim(),
      fullName: fullName.trim(),
      email: email.trim(),
      role: currentUser.role === 'ADMIN' ? role : 'USER',
      businessUnitId: currentUser.role === 'ADMIN' ? selectedBUId : currentUser.businessUnitId,
      departmentId: selectedDeptId,
    };

    const result = onRegisterUser(payload);
    if (result.success) {
      setFeedback({
        type: 'success',
        message: `Successfully registered new user '${payload.username}' in ${
          businessUnits.find((b) => b.id === payload.businessUnitId)?.name
        }! Assigned default password ('${DEFAULT_USER_PASSWORD}').`,
      });
      // Reset form
      setUsername('');
      setFullName('');
      setEmail('');
      // Switch to list after slight delay
      setTimeout(() => {
        setActiveTab('LIST');
        setFeedback(null);
      }, 1800);
    } else {
      setFeedback({ type: 'error', message: result.error || 'Failed to register user.' });
    }
  };

  const handleTriggerResetPassword = (targetUser: User) => {
    setFeedback(null);
    setResettingUserId(targetUser.id);

    try {
      const result = onResetPassword(targetUser.id);
      if (result.success) {
        setFeedback({
          type: 'success',
          message: `Password for @${targetUser.username} (${targetUser.fullName}) has been reset to default ('${DEFAULT_USER_PASSWORD}'). They will be prompted to change password on their next login.`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: result.error || 'Failed to reset password.',
        });
      }
    } catch {
      setFeedback({
        type: 'error',
        message: 'An unexpected error occurred during password reset.',
      });
    } finally {
      setResettingUserId(null);
    }
  };

  return (
    <div
      id="modal-user-management-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        id="modal-user-management-panel"
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95"
      >
        {/* Header (Clean Light Theme) */}
        <div className="px-6 py-4 bg-slate-50 text-slate-900 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {currentUser.role === 'ADMIN'
                  ? 'Global User Directory & Provisioning'
                  : `User Management — ${currentBU?.name}`}
              </h2>
              <div className="text-xs text-slate-500">
                {currentUser.role === 'ADMIN'
                  ? 'Global scope across CCEC, FNB, HOTEL, KLBS, KLW, and UOA HQ'
                  : `Scoped to ${currentBU?.code} business unit`}
              </div>
            </div>
          </div>

          <button
            id="btn-close-user-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-200 bg-slate-50 flex space-x-4">
          <button
            id="tab-user-list"
            onClick={() => {
              setActiveTab('LIST');
              setFeedback(null);
            }}
            className={`py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'LIST'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Scoped User Directory ({users.length})</span>
          </button>

          <button
            id="tab-user-register"
            onClick={() => {
              setActiveTab('REGISTER');
              setFeedback(null);
            }}
            className={`py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'REGISTER'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>
              {currentUser.role === 'ADMIN' ? 'Register Account' : `Register ${currentBU?.code} Staff`}
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {feedback && (
            <div
              className={`mb-4 p-3 rounded-lg border text-xs flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {activeTab === 'LIST' ? (
            /* Scoped User Directory Table */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
                <span>Accounts matching current business unit scope</span>
                <span className="font-semibold text-slate-700">Total: {users.length}</span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="p-3">User</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Business Unit</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Password Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => {
                      const bu = businessUnits.find((b) => b.id === u.businessUnitId);
                      const dept = departments.find((d) => d.id === u.departmentId);
                      const isPendingChange = u.mustChangePassword;

                      // RBAC check for password reset capability
                      const canReset =
                        currentUser.role === 'ADMIN' ||
                        (currentUser.role === 'IT' &&
                          u.role === 'USER' &&
                          u.businessUnitId === currentUser.businessUnitId);

                      // RBAC check for user deletion capability (Admin and IT in their BU, cannot delete self)
                      const canDelete =
                        u.id !== currentUser.id &&
                        (currentUser.role === 'ADMIN' ||
                          (currentUser.role === 'IT' &&
                            u.role === 'USER' &&
                            u.businessUnitId === currentUser.businessUnitId));

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center justify-center border border-blue-200 shrink-0">
                                {u.fullName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900">{u.fullName}</div>
                                <div className="text-[11px] text-slate-500 font-mono">
                                  @{u.username}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            {u.role === 'ADMIN' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                ADMIN
                              </span>
                            )}
                            {u.role === 'IT' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                IT TECH
                              </span>
                            )}
                            {u.role === 'USER' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                STAFF
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="font-semibold text-slate-800">{bu?.code}</span>
                            <span className="text-slate-400 block text-[10px]">{bu?.name}</span>
                          </td>
                          <td className="p-3">
                            <span className="text-slate-700 font-medium">{u.department || dept?.name || 'General / Unassigned'}</span>
                          </td>
                          <td className="p-3">
                            {isPendingChange ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                <KeyRound className="w-3 h-3 text-amber-600" />
                                <span>Default (Needs Change)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Active (Custom Pass)</span>
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {canReset && (
                                <button
                                  id={`btn-reset-user-password-${u.username}`}
                                  onClick={() => handleTriggerResetPassword(u)}
                                  disabled={resettingUserId === u.id}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition cursor-pointer"
                                  title="Reset password to default (password123)"
                                >
                                  <RotateCcw className="w-3 h-3 text-amber-700" />
                                  <span>Reset</span>
                                </button>
                              )}

                              {canDelete && onDeleteUser && (
                                <button
                                  id={`btn-delete-user-${u.username}`}
                                  onClick={() => setUserToDelete(u)}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer"
                                  title="Permanently remove user"
                                >
                                  <Trash2 className="w-3 h-3 text-rose-600" />
                                  <span>Delete</span>
                                </button>
                              )}

                              {!canReset && !canDelete && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  No Permission
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* User Registration Form with Multi-Business Unit RBAC Enforcement */
            <form onSubmit={handleRegisterSubmit} className="space-y-4 max-w-xl mx-auto">
              {/* Role Scope Notice */}
              {currentUser.role === 'IT' ? (
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Business Unit Scoped Registration:</span> As an IT
                    technician for <strong>{currentBU?.name}</strong>, you can register staff
                    members (role: <code>USER</code>) bound to this business unit only.
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 flex items-start gap-2.5">
                  <Shield className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Global Admin Provisioning:</span> You have full
                    authorization to create Admins, IT Technicians, or Staff across CCEC, FNB,
                    HOTEL, KLBS, KLW, and UOA HQ.
                  </div>
                </div>
              )}

              {/* Default Password Policy Advisory */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900">Default Password Policy:</span> Newly registered users are assigned the standard default password (<code className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 font-bold text-blue-600">{DEFAULT_USER_PASSWORD}</code>). Upon logging in for the first time, they will be automatically prompted to create a private new password.
                </div>
              </div>

              {/* Full Name & Username */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Full Name *</label>
                  <input
                    id="reg-input-fullname"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Jason Miller"
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Username *</label>
                  <input
                    id="reg-input-username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. jason.events"
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Email Address *</label>
                <input
                  id="reg-input-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jason.miller@internal.net"
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Role & Business Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Role */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Role Assignment</label>
                  {currentUser.role === 'ADMIN' ? (
                    <select
                      id="reg-select-role"
                      value={role}
                      onChange={(e) => setRole(e.target.value as UserRole)}
                      className="w-full text-xs font-semibold rounded-lg border border-slate-300 p-2.5 text-slate-800"
                    >
                      <option value="USER">USER (Standard Staff)</option>
                      <option value="IT">IT (Business Unit IT Support)</option>
                      <option value="ADMIN">ADMIN (Global Administrator)</option>
                    </select>
                  ) : (
                    <div className="w-full text-xs font-semibold rounded-lg border border-slate-200 bg-slate-100 p-2.5 text-slate-600 flex items-center justify-between">
                      <span>USER (Staff Member)</span>
                      <Lock className="w-3 h-3 text-slate-400" />
                    </div>
                  )}
                </div>

                {/* Business Unit */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-slate-400" />
                    Business Unit Target
                  </label>
                  {currentUser.role === 'ADMIN' ? (
                    <select
                      id="reg-select-bu"
                      value={selectedBUId}
                      onChange={(e) => {
                        setSelectedBUId(e.target.value);
                        const newDepts = departments.filter(
                          (d) => d.businessUnitId === e.target.value
                        );
                        if (newDepts.length > 0) setSelectedDeptId(newDepts[0].id);
                      }}
                      className="w-full text-xs font-semibold rounded-lg border border-slate-300 p-2.5 text-slate-800"
                    >
                      {businessUnits.map((bu) => (
                        <option key={bu.id} value={bu.id}>
                          {bu.code} — {bu.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full text-xs font-semibold rounded-lg border border-slate-200 bg-slate-100 p-2.5 text-slate-700 flex items-center justify-between">
                      <span>{currentBU?.name}</span>
                      <Lock className="w-3 h-3 text-slate-400" />
                    </div>
                  )}
                </div>
              </div>

              {/* Department */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-slate-400" />
                  Assigned Department
                </label>
                <select
                  id="reg-select-dept"
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  className="w-full text-xs font-semibold rounded-lg border border-slate-300 p-2.5 text-slate-800"
                >
                  {eligibleDepartments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Submit Button */}
              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('LIST')}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-register-user"
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Register &amp; Provision User</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {userToDelete && (
        <ConfirmModal
          isOpen={!!userToDelete}
          title="Delete Staff Account"
          message="Are you sure you want to permanently delete this user account? All access privileges for this account will be revoked. This action cannot be reversed."
          itemName={`${userToDelete.fullName} (@${userToDelete.username})`}
          confirmLabel="Delete User"
          isDestructive={true}
          onConfirm={() => {
            if (onDeleteUser && userToDelete) {
              const res = onDeleteUser(userToDelete.id);
              if (res && !res.success) {
                setFeedback({ type: 'error', message: res.error || 'Failed to delete user.' });
              } else {
                setFeedback({ type: 'success', message: `User @${userToDelete.username} deleted successfully.` });
              }
            }
            setUserToDelete(null);
          }}
          onCancel={() => setUserToDelete(null)}
        />
      )}
    </div>
  );
};

