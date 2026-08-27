/**
 * @file UserDirectoryPage.tsx
 * @description Dedicated Full Page for Multi-Business Unit User Directory, User Editing,
 * RBAC Management, and Department Customization (Add, Edit, Delete).
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Building2,
  Layers,
  Lock,
  CheckCircle2,
  AlertCircle,
  Shield,
  KeyRound,
  RotateCcw,
  Trash2,
  Search,
  Filter,
  UserCheck,
  Briefcase,
  Mail,
  ShieldAlert,
  X,
  Plus,
  FolderPlus,
  Pencil,
  Ticket as TicketIcon,
  HelpCircle,
} from 'lucide-react';
import { User, BusinessUnit, Department, UserRole, Ticket } from '../../types';
import { DEFAULT_USER_PASSWORD } from '../../services/storageService';
import { getBUTheme } from '../../utils/themeUtils';
import { BUBadge } from '../BUBadge';

interface UserDirectoryPageProps {
  currentUser: User;
  users: User[];
  businessUnits: BusinessUnit[];
  departments: Department[];
  allTickets?: Ticket[];
  onRegisterUser: (payload: {
    username: string;
    fullName: string;
    email: string;
    role: UserRole;
    businessUnitId: string;
    departmentId: string;
    avatarUrl?: string;
  }) => { success: boolean; error?: string };
  onUpdateUser?: (
    targetUserId: string,
    updates: {
      fullName?: string;
      email?: string;
      username?: string;
      role?: UserRole;
      businessUnitId?: string;
      departmentId?: string;
      avatarUrl?: string;
    }
  ) => { success: boolean; error?: string; user?: User };
  onResetPassword: (targetUserId: string) => { success: boolean; error?: string };
  onDeleteUser?: (targetUserId: string) => { success: boolean; error?: string };
  onAddDepartment?: (deptData: {
    name: string;
    code: string;
    businessUnitId: string;
  }) => { success: boolean; error?: string; department?: Department };
  onUpdateDepartment?: (
    deptId: string,
    updates: {
      name?: string;
      code?: string;
      businessUnitId?: string;
    }
  ) => { success: boolean; error?: string; department?: Department };
  onDeleteDepartment?: (deptId: string) => { success: boolean; error?: string };
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const UserDirectoryPage: React.FC<UserDirectoryPageProps> = ({
  currentUser,
  users,
  businessUnits,
  departments,
  allTickets = [],
  onRegisterUser,
  onUpdateUser,
  onResetPassword,
  onDeleteUser,
  onAddDepartment,
  onUpdateDepartment,
  onDeleteDepartment,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'LIST' | 'DEPARTMENTS' | 'REGISTER'>('LIST');

  // Modal dialog states for actions
  const [userToReset, setUserToReset] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);

  // Department Modal States
  const [isAddDeptModalOpen, setIsAddDeptModalOpen] = useState(false);
  const [deptToEdit, setDeptToEdit] = useState<Department | null>(null);
  const [deptToDelete, setDeptToDelete] = useState<Department | null>(null);

  // Notification Banner
  const [actionNotice, setActionNotice] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Edit User Form State
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('USER');
  const [editBUId, setEditBUId] = useState('');
  const [editDeptId, setEditDeptId] = useState('');
  const [editFeedback, setEditFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Add / Edit Department Form State
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newDeptBUId, setNewDeptBUId] = useState<string>(
    currentUser.role === 'ADMIN' ? (businessUnits[0]?.id || '') : currentUser.businessUnitId
  );
  const [deptFeedback, setDeptFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [deptSearchQuery, setDeptSearchQuery] = useState('');
  const [selectedBuFilter, setSelectedBuFilter] = useState<string>(
    currentUser.role === 'ADMIN' ? 'ALL' : currentUser.businessUnitId
  );
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');

  // Register Form State
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('USER');
  const [businessUnitId, setBusinessUnitId] = useState<string>(
    currentUser.role === 'ADMIN' ? (businessUnits[0]?.id || '') : currentUser.businessUnitId
  );
  const [departmentId, setDepartmentId] = useState<string>('');

  const [formFeedback, setFormFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const isGlobalAdmin = currentUser.role === 'ADMIN';
  const isITSupport = currentUser.role === 'IT';

  // Departments for registration dropdown based on selected BU
  const effectiveRegistrationBU = isGlobalAdmin ? businessUnitId : currentUser.businessUnitId;
  const availableDeptsForRegistration = departments.filter(
    (d) => d.businessUnitId === effectiveRegistrationBU
  );

  // Ensure valid department selection when available departments change
  useEffect(() => {
    if (availableDeptsForRegistration.length > 0) {
      if (!departmentId || !availableDeptsForRegistration.some((d) => d.id === departmentId)) {
        setDepartmentId(availableDeptsForRegistration[0].id);
      }
    } else {
      setDepartmentId('');
    }
  }, [availableDeptsForRegistration, departmentId]);

  // Available departments for edit user dropdown
  const effectiveEditBU = isGlobalAdmin ? editBUId : userToEdit?.businessUnitId || currentUser.businessUnitId;
  const availableDeptsForEdit = departments.filter(
    (d) => d.businessUnitId === effectiveEditBU
  );

  // Filtered Users List
  const filteredUsers = users.filter((u) => {
    if (isITSupport && u.businessUnitId !== currentUser.businessUnitId) {
      return false;
    }
    if (selectedBuFilter !== 'ALL' && u.businessUnitId !== selectedBuFilter) {
      return false;
    }
    if (selectedRoleFilter !== 'ALL' && u.role !== selectedRoleFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filtered Departments List
  const filteredDepartments = departments.filter((d) => {
    if (isITSupport && d.businessUnitId !== currentUser.businessUnitId) {
      return false;
    }
    if (selectedBuFilter !== 'ALL' && d.businessUnitId !== selectedBuFilter) {
      return false;
    }
    if (deptSearchQuery.trim()) {
      const q = deptSearchQuery.toLowerCase();
      return (
        d.name.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // =========================================================================
  // Handlers for Registration
  // =========================================================================
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormFeedback(null);

    if (!username.trim() || !fullName.trim() || !email.trim()) {
      setFormFeedback({ type: 'error', message: 'All required fields must be populated.' });
      return;
    }

    const assignedBU = isGlobalAdmin ? businessUnitId : currentUser.businessUnitId;
    const effectiveDept = departmentId || (availableDeptsForRegistration[0]?.id || '');

    const result = onRegisterUser({
      username: username.trim(),
      fullName: fullName.trim(),
      email: email.trim(),
      role: isGlobalAdmin ? role : 'USER',
      businessUnitId: assignedBU,
      departmentId: effectiveDept,
    });

    if (result.success) {
      setFormFeedback({
        type: 'success',
        message: `Staff member "${fullName}" registered! Default password is "${DEFAULT_USER_PASSWORD}". User must change password on first login.`,
      });
      setUsername('');
      setFullName('');
      setEmail('');
      setRole('USER');
    } else {
      setFormFeedback({
        type: 'error',
        message: result.error || 'Failed to register staff account.',
      });
    }
  };

  // =========================================================================
  // Handlers for Edit User
  // =========================================================================
  const handleInitiateEditUser = (user: User) => {
    setUserToEdit(user);
    setEditFullName(user.fullName);
    setEditEmail(user.email);
    setEditUsername(user.username);
    setEditRole(user.role);
    setEditBUId(user.businessUnitId);
    setEditDeptId(user.departmentId);
    setEditFeedback(null);
  };

  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit || !onUpdateUser) return;
    setEditFeedback(null);

    if (!editFullName.trim() || !editEmail.trim() || !editUsername.trim()) {
      setEditFeedback({ type: 'error', message: 'Full name, email, and username are required.' });
      return;
    }

    const targetBU = isGlobalAdmin ? editBUId : userToEdit.businessUnitId;
    const deptsInBU = departments.filter((d) => d.businessUnitId === targetBU);
    const validDeptId = deptsInBU.some((d) => d.id === editDeptId)
      ? editDeptId
      : deptsInBU[0]?.id || '';

    const res = onUpdateUser(userToEdit.id, {
      fullName: editFullName.trim(),
      email: editEmail.trim(),
      username: editUsername.trim(),
      role: isGlobalAdmin ? editRole : userToEdit.role,
      businessUnitId: targetBU,
      departmentId: validDeptId,
    });

    if (res.success) {
      setUserToEdit(null);
      setActionNotice({
        type: 'success',
        message: `User profile for @${editUsername} (${editFullName}) has been updated successfully.`,
      });
      if (onShowToast) {
        onShowToast(`User @${editUsername} updated successfully!`, 'success');
      }
    } else {
      setEditFeedback({
        type: 'error',
        message: res.error || 'Failed to update user profile.',
      });
    }
  };

  // =========================================================================
  // Handlers for Reset Password & Delete User
  // =========================================================================
  const handleInitiateResetPassword = (targetUser: User) => {
    setUserToReset(targetUser);
  };

  const handleConfirmResetPassword = () => {
    if (!userToReset) return;
    const targetUser = userToReset;
    const res = onResetPassword(targetUser.id);
    if (res.success) {
      setActionNotice({
        type: 'success',
        message: `Password for @${targetUser.username} (${targetUser.fullName}) has been reset to "${DEFAULT_USER_PASSWORD}". They will be prompted to create a new password on their next login.`,
      });
      if (onShowToast) {
        onShowToast(`Password for ${targetUser.fullName} reset to "${DEFAULT_USER_PASSWORD}"`, 'success');
      }
    } else {
      setActionNotice({
        type: 'error',
        message: res.error || 'Failed to reset user password.',
      });
      if (onShowToast) {
        onShowToast(res.error || 'Failed to reset password', 'error');
      }
    }
    setUserToReset(null);
  };

  const handleInitiateDeleteUser = (targetUser: User) => {
    setUserToDelete(targetUser);
  };

  const handleConfirmDeleteUser = () => {
    if (!userToDelete || !onDeleteUser) return;
    const targetUser = userToDelete;
    const res = onDeleteUser(targetUser.id);
    if (res.success) {
      setActionNotice({
        type: 'success',
        message: `User account @${targetUser.username} (${targetUser.fullName}) has been permanently deleted.`,
      });
      if (onShowToast) {
        onShowToast(`User @${targetUser.username} permanently deleted`, 'success');
      }
    } else {
      setActionNotice({
        type: 'error',
        message: res.error || 'Failed to delete user account.',
      });
      if (onShowToast) {
        onShowToast(res.error || 'Failed to delete user account', 'error');
      }
    }
    setUserToDelete(null);
  };

  // =========================================================================
  // Handlers for Department Management (Add, Edit, Delete)
  // =========================================================================
  const handleOpenAddDeptModal = (defaultBU?: string) => {
    setDeptFeedback(null);
    setNewDeptName('');
    setNewDeptCode('');
    setNewDeptBUId(
      defaultBU ||
        (isGlobalAdmin
          ? businessUnits[0]?.id || ''
          : currentUser.businessUnitId || businessUnits[0]?.id || '')
    );
    setIsAddDeptModalOpen(true);
  };

  const handleCreateDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    setDeptFeedback(null);

    const targetBU = newDeptBUId || currentUser.businessUnitId || businessUnits[0]?.id;

    if (!newDeptName.trim() || !newDeptCode.trim()) {
      setDeptFeedback({
        type: 'error',
        message: 'Department name and department code are required.',
      });
      return;
    }

    if (!onAddDepartment) {
      setDeptFeedback({
        type: 'error',
        message: 'Department creation handler is not configured.',
      });
      return;
    }

    const result = onAddDepartment({
      name: newDeptName.trim(),
      code: newDeptCode.trim().toUpperCase(),
      businessUnitId: targetBU,
    });

    if (result.success && result.department) {
      const created = result.department;
      // Auto-select in active contexts
      if (created.businessUnitId === (isGlobalAdmin ? businessUnitId : currentUser.businessUnitId)) {
        setDepartmentId(created.id);
      }
      if (userToEdit && created.businessUnitId === (isGlobalAdmin ? editBUId : userToEdit.businessUnitId)) {
        setEditDeptId(created.id);
      }
      setIsAddDeptModalOpen(false);
      setNewDeptName('');
      setNewDeptCode('');
      setActionNotice({
        type: 'success',
        message: `Department "${created.name} (${created.code})" created successfully!`,
      });
      if (onShowToast) {
        onShowToast(`Department "${created.name}" created successfully!`, 'success');
      }
    } else {
      setDeptFeedback({
        type: 'error',
        message: result.error || 'Failed to create department.',
      });
    }
  };

  const handleInitiateEditDept = (dept: Department) => {
    setDeptToEdit(dept);
    setNewDeptName(dept.name);
    setNewDeptCode(dept.code);
    setNewDeptBUId(dept.businessUnitId);
    setDeptFeedback(null);
  };

  const handleSaveEditDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptToEdit || !onUpdateDepartment) return;
    setDeptFeedback(null);

    if (!newDeptName.trim() || !newDeptCode.trim()) {
      setDeptFeedback({ type: 'error', message: 'Department name and code are required.' });
      return;
    }

    const targetBU = isGlobalAdmin ? newDeptBUId : deptToEdit.businessUnitId;

    const res = onUpdateDepartment(deptToEdit.id, {
      name: newDeptName.trim(),
      code: newDeptCode.trim().toUpperCase(),
      businessUnitId: targetBU,
    });

    if (res.success && res.department) {
      setDeptToEdit(null);
      setActionNotice({
        type: 'success',
        message: `Department "${res.department.name} (${res.department.code})" updated successfully.`,
      });
      if (onShowToast) {
        onShowToast(`Department "${res.department.name}" updated!`, 'success');
      }
    } else {
      setDeptFeedback({
        type: 'error',
        message: res.error || 'Failed to update department.',
      });
    }
  };

  const handleInitiateDeleteDept = (dept: Department) => {
    setDeptToDelete(dept);
  };

  const handleConfirmDeleteDept = () => {
    if (!deptToDelete || !onDeleteDepartment) return;
    const dept = deptToDelete;
    const res = onDeleteDepartment(dept.id);
    if (res.success) {
      setDeptToDelete(null);
      setActionNotice({
        type: 'success',
        message: `Department "${dept.name} (${dept.code})" has been removed. Assigned personnel have been updated.`,
      });
      if (onShowToast) {
        onShowToast(`Department "${dept.name}" deleted.`, 'success');
      }
    } else {
      setActionNotice({
        type: 'error',
        message: res.error || 'Failed to delete department.',
      });
      if (onShowToast) {
        onShowToast(res.error || 'Failed to delete department', 'error');
      }
      setDeptToDelete(null);
    }
  };

  return (
    <div id="page-user-directory" className="space-y-4 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-2xs shrink-0">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                Personnel & Department Management
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/60 font-mono">
                {isGlobalAdmin ? 'GLOBAL ADMIN' : `${currentUser.businessUnitId} IT SCOPE`}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Edit user profiles, manage organizational departments, and configure access permissions.
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center bg-slate-100/80 p-0.5 rounded-lg shrink-0 border border-slate-200/60">
          <button
            id="tab-staff-directory"
            onClick={() => setActiveTab('LIST')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              activeTab === 'LIST'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span>Staff Directory ({filteredUsers.length})</span>
          </button>

          <button
            id="tab-departments"
            onClick={() => setActiveTab('DEPARTMENTS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              activeTab === 'DEPARTMENTS'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>Departments ({filteredDepartments.length})</span>
          </button>

          <button
            id="tab-register-staff"
            onClick={() => setActiveTab('REGISTER')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              activeTab === 'REGISTER'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
            <span>Register New Staff</span>
          </button>
        </div>
      </div>

      {/* Global Notification Banner */}
      {actionNotice && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2.5 animate-in fade-in slide-in-from-top-1 ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionNotice.message}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="p-1 rounded-md hover:bg-black/5 text-slate-500 hover:text-slate-700 cursor-pointer"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: STAFF DIRECTORY LIST VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'LIST' && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search staff by name, email, username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {isGlobalAdmin && (
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={selectedBuFilter}
                    onChange={(e) => setSelectedBuFilter(e.target.value)}
                    className="text-xs rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">All Business Units</option>
                    {businessUnits.map((bu) => (
                      <option key={bu.id} value={bu.id}>
                        {bu.name} ({bu.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedRoleFilter}
                  onChange={(e) => setSelectedRoleFilter(e.target.value)}
                  className="text-xs rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Roles</option>
                  <option value="ADMIN">Administrators</option>
                  <option value="IT">IT Support</option>
                  <option value="USER">Staff / End Users</option>
                </select>
              </div>

              {(isGlobalAdmin || isITSupport) && onAddDepartment && (
                <button
                  type="button"
                  id="btn-toolbar-add-dept-from-list"
                  onClick={() => handleOpenAddDeptModal(selectedBuFilter !== 'ALL' ? selectedBuFilter : undefined)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition shadow-2xs cursor-pointer shrink-0"
                  title="Add new department"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-blue-600" />
                  <span>+ Department</span>
                </button>
              )}
            </div>
          </div>

          {/* User Table Card */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Role &amp; Scope</th>
                    <th className="py-3 px-4">Business Unit &amp; Dept</th>
                    <th className="py-3 px-4">Security Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-slate-600">No staff members found matching criteria</p>
                        <p className="text-xs text-slate-400 mt-0.5">Try clearing filters or search terms.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const bu = businessUnits.find((b) => b.id === user.businessUnitId);
                      const dept = departments.find((d) => d.id === user.departmentId);
                      const isCurrentUser = user.id === currentUser.id;
                      const canEditThisUser = isGlobalAdmin || (isITSupport && user.businessUnitId === currentUser.businessUnitId);
                      const canDeleteThisUser =
                        !isCurrentUser &&
                        (isGlobalAdmin ||
                          (isITSupport &&
                            user.role === 'USER' &&
                            user.businessUnitId === currentUser.businessUnitId));

                      return (
                        <tr key={user.id} className="hover:bg-slate-50/70 transition">
                          {/* Avatar & Name */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-200/80 shadow-2xs shrink-0">
                                {user.fullName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <span>{user.fullName}</span>
                                  {isCurrentUser && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-700">
                                      You
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-2">
                                  <span>@{user.username}</span>
                                  <span>•</span>
                                  <span>{user.email}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                                user.role === 'ADMIN'
                                  ? 'bg-purple-100 text-purple-800'
                                  : user.role === 'IT'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              <Shield className="w-3 h-3" />
                              <span>{user.role === 'ADMIN' ? 'Administrator' : user.role === 'IT' ? 'IT Support' : 'Staff User'}</span>
                            </span>
                          </td>

                          {/* Business Unit & Department */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 mb-1">
                              <BUBadge businessUnit={bu} allBusinessUnits={businessUnits} size="sm" />
                            </div>
                            <div className="text-[11px] text-slate-600 font-medium">
                              {user.department || (dept ? `${dept.name} (${dept.code})` : 'General / Unassigned')}
                            </div>
                          </td>

                          {/* Security Status */}
                          <td className="py-3.5 px-4">
                            {user.mustChangePassword ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800">
                                <KeyRound className="w-3 h-3" />
                                <span>Reset Pending (First Login)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Active &amp; Verified</span>
                              </span>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Edit User Button (Available for Admin & IT for their BU) */}
                              {canEditThisUser && onUpdateUser && (
                                <button
                                  id={`btn-edit-user-${user.username}`}
                                  onClick={() => handleInitiateEditUser(user)}
                                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-[11px] font-bold transition inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                                  title="Edit staff details, department assignment, and permissions"
                                >
                                  <Pencil className="w-3 h-3 text-blue-600" />
                                  <span>Edit</span>
                                </button>
                              )}

                              {/* Reset Password Button */}
                              <button
                                id={`btn-reset-pw-${user.username}`}
                                onClick={() => handleInitiateResetPassword(user)}
                                className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-amber-300 hover:bg-amber-50 text-slate-700 hover:text-amber-800 text-[11px] font-bold transition inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                                title="Reset Password to default ('password123')"
                              >
                                <RotateCcw className="w-3 h-3 text-amber-600" />
                                <span className="hidden sm:inline">Reset PW</span>
                              </button>

                              {/* Delete User Button (Global Admin and IT for Staff in their BU) */}
                              {canDeleteThisUser && onDeleteUser && (
                                <button
                                  id={`btn-delete-user-${user.username}`}
                                  onClick={() => handleInitiateDeleteUser(user)}
                                  className="p-1.5 rounded-lg border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-500 hover:text-rose-700 text-[11px] font-bold transition inline-flex items-center shadow-2xs cursor-pointer"
                                  title="Delete user account"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DEPARTMENTS & TEAMS MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === 'DEPARTMENTS' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search departments by name or code..."
                value={deptSearchQuery}
                onChange={(e) => setDeptSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              {isGlobalAdmin && (
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={selectedBuFilter}
                    onChange={(e) => setSelectedBuFilter(e.target.value)}
                    className="text-xs rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">All Business Units</option>
                    {businessUnits.map((bu) => (
                      <option key={bu.id} value={bu.id}>
                        {bu.name} ({bu.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(isGlobalAdmin || isITSupport) && (
                <button
                  type="button"
                  id="btn-add-department-main"
                  onClick={() => handleOpenAddDeptModal(selectedBuFilter !== 'ALL' ? selectedBuFilter : undefined)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-2xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Department</span>
                </button>
              )}
            </div>
          </div>

          {/* Departments Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Department Name</th>
                    <th className="py-3 px-4">Code Identifier</th>
                    <th className="py-3 px-4">Business Unit</th>
                    <th className="py-3 px-4 text-center">Assigned Personnel</th>
                    <th className="py-3 px-4 text-center">Tickets Logged</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredDepartments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <Layers className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-slate-600">No departments found</p>
                        <p className="text-xs text-slate-400 mt-0.5">Click "+ Add New Department" above to create one.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredDepartments.map((dept) => {
                      const bu = businessUnits.find((b) => b.id === dept.businessUnitId);
                      const assignedUsers = users.filter((u) => u.departmentId === dept.id);
                      const deptTickets = allTickets.filter((t) => t.departmentId === dept.id);
                      const canManageThisDept = isGlobalAdmin || (isITSupport && dept.businessUnitId === currentUser.businessUnitId);

                      return (
                        <tr key={dept.id} className="hover:bg-slate-50/70 transition">
                          {/* Name */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center border border-indigo-200/80 shadow-2xs shrink-0">
                                {dept.code.substring(0, 2)}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block">{dept.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">ID: {dept.id}</span>
                              </div>
                            </div>
                          </td>

                          {/* Code */}
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                              {dept.code}
                            </span>
                          </td>

                          {/* Business Unit */}
                          <td className="py-3.5 px-4">
                            <BUBadge businessUnit={bu} allBusinessUnits={businessUnits} size="sm" />
                          </td>

                          {/* Assigned Personnel Count */}
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                              <Users className="w-3 h-3" />
                              <span>{assignedUsers.length} staff</span>
                            </span>
                          </td>

                          {/* Tickets Count */}
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                              <TicketIcon className="w-3 h-3 text-slate-500" />
                              <span>{deptTickets.length}</span>
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {canManageThisDept && onUpdateDepartment && (
                                <button
                                  id={`btn-edit-dept-${dept.code}`}
                                  onClick={() => handleInitiateEditDept(dept)}
                                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-[11px] font-bold transition inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                                  title="Edit Department Name & Code"
                                >
                                  <Pencil className="w-3 h-3 text-blue-600" />
                                  <span>Edit</span>
                                </button>
                              )}

                              {canManageThisDept && onDeleteDepartment && (
                                <button
                                  id={`btn-delete-dept-${dept.code}`}
                                  onClick={() => handleInitiateDeleteDept(dept)}
                                  className="p-1.5 rounded-lg border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-500 hover:text-rose-700 text-[11px] font-bold transition inline-flex items-center shadow-2xs cursor-pointer"
                                  title="Delete Department"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: REGISTER NEW STAFF FORM VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'REGISTER' && (
        <div className="max-w-3xl mx-auto bg-white rounded-xl border border-slate-200/80 shadow-2xs p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Provision New Staff Account</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isGlobalAdmin
                ? 'Create user accounts with administrative, IT support, or standard staff roles across any Business Unit.'
                : `Provision staff accounts under ${currentUser.businessUnitId}. New users will be required to change their password upon first sign-in.`}
            </p>
          </div>

          {formFeedback && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2.5 ${
                formFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {formFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{formFeedback.message}</span>
            </div>
          )}

          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="input-reg-fullname"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Jessica Tan, David Lee"
                  className="w-full text-xs rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 font-medium"
                  required
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Username <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono font-bold">
                    @
                  </span>
                  <input
                    type="text"
                    id="input-reg-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                    placeholder="jessica.tan"
                    className="w-full text-xs rounded-lg border border-slate-200 bg-slate-50 pl-7 pr-3.5 py-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 font-mono font-semibold"
                    required
                  />
                </div>
              </div>

              {/* Corporate Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Corporate Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  id="input-reg-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jessica.tan@uoa.com.my"
                  className="w-full text-xs rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 font-medium"
                  required
                />
              </div>

              {/* Role Picker (Admin can choose; IT locked to USER) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Role Privilege <span className="text-rose-500">*</span>
                </label>
                {isGlobalAdmin ? (
                  <select
                    id="input-reg-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full text-xs rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 font-medium"
                  >
                    <option value="USER">Staff / End User</option>
                    <option value="IT">IT Support Specialist</option>
                    <option value="ADMIN">System Administrator</option>
                  </select>
                ) : (
                  <div className="w-full text-xs rounded-lg border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-slate-600 font-medium flex items-center justify-between">
                    <span>Staff User (USER)</span>
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                )}
              </div>

              {/* Business Unit Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Business Unit <span className="text-rose-500">*</span>
                </label>
                {isGlobalAdmin ? (
                  <select
                    id="input-reg-bu"
                    value={businessUnitId}
                    onChange={(e) => setBusinessUnitId(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 font-medium"
                  >
                    {businessUnits.map((bu) => (
                      <option key={bu.id} value={bu.id}>
                        {bu.name} ({bu.code})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full text-xs rounded-lg border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-slate-600 font-medium flex items-center justify-between">
                    <span>
                      {businessUnits.find((b) => b.id === currentUser.businessUnitId)?.name ||
                        currentUser.businessUnitId}{' '}
                      ({currentUser.businessUnitId})
                    </span>
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                )}
              </div>

              {/* Department Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Department <span className="text-rose-500">*</span>
                  </label>
                  {(isGlobalAdmin || isITSupport) && onAddDepartment && (
                    <button
                      type="button"
                      id="btn-quick-add-dept-from-reg"
                      onClick={() => handleOpenAddDeptModal(isGlobalAdmin ? businessUnitId : currentUser.businessUnitId)}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ New Dept</span>
                    </button>
                  )}
                </div>

                {availableDeptsForRegistration.length > 0 ? (
                  <select
                    id="input-reg-dept"
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 font-medium"
                  >
                    {availableDeptsForRegistration.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center justify-between p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800">
                    <span>No departments in this BU yet.</span>
                    <button
                      type="button"
                      onClick={() => handleOpenAddDeptModal(isGlobalAdmin ? businessUnitId : currentUser.businessUnitId)}
                      className="font-bold text-blue-700 underline"
                    >
                      Create Dept
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Default Password Notice */}
            <div className="p-3 bg-blue-50/60 border border-blue-200/70 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
              <KeyRound className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">
                  Initial Default Password: <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono font-bold text-blue-950">{DEFAULT_USER_PASSWORD}</code>
                </p>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  The user will be flagged with a mandatory first-time login password change prompt upon signing in.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                id="btn-submit-register-user"
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>Register Staff Member</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: EDIT USER MODAL (Admin & IT for their BU) */}
      {/* ========================================================================= */}
      {userToEdit && (
        <div
          id="modal-edit-user-backdrop"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            id="modal-edit-user-dialog"
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit Staff Profile</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Modify profile details, department, and role assignment.
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="btn-close-edit-user"
                onClick={() => setUserToEdit(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editFeedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                  editFeedback.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                {editFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <span>{editFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditUser} className="space-y-3.5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="input-edit-fullname"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 font-medium"
                  required
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Username <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono font-bold">
                    @
                  </span>
                  <input
                    type="text"
                    id="input-edit-username"
                    value={editUsername}
                    disabled={!isGlobalAdmin}
                    onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                    className={`w-full text-xs rounded-xl border border-slate-200 pl-7 pr-3.5 py-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono font-semibold ${
                      !isGlobalAdmin ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50 text-slate-800'
                    }`}
                    required
                  />
                </div>
              </div>

              {/* Corporate Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Corporate Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  id="input-edit-email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 font-medium"
                  required
                />
              </div>

              {/* Business Unit & Role (Editable for Admin, locked for IT) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Business Unit
                  </label>
                  {isGlobalAdmin ? (
                    <select
                      id="input-edit-bu"
                      value={editBUId}
                      onChange={(e) => setEditBUId(e.target.value)}
                      className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 font-medium"
                    >
                      {businessUnits.map((bu) => (
                        <option key={bu.id} value={bu.id}>
                          {bu.name} ({bu.code})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full text-xs rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-slate-600 font-medium flex items-center justify-between">
                      <span>{userToEdit.businessUnitId}</span>
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Role Privilege
                  </label>
                  {isGlobalAdmin ? (
                    <select
                      id="input-edit-role"
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as UserRole)}
                      className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 font-medium"
                    >
                      <option value="USER">Staff / End User</option>
                      <option value="IT">IT Support Specialist</option>
                      <option value="ADMIN">System Administrator</option>
                    </select>
                  ) : (
                    <div className="w-full text-xs rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-slate-600 font-medium flex items-center justify-between">
                      <span>{userToEdit.role}</span>
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  )}
                </div>
              </div>

              {/* Department Assignment with Quick Add */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Department Assignment <span className="text-rose-500">*</span>
                  </label>
                  {(isGlobalAdmin || isITSupport) && onAddDepartment && (
                    <button
                      type="button"
                      onClick={() => handleOpenAddDeptModal(effectiveEditBU)}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ New Dept</span>
                    </button>
                  )}
                </div>

                {availableDeptsForEdit.length > 0 ? (
                  <select
                    id="input-edit-dept"
                    value={editDeptId}
                    onChange={(e) => setEditDeptId(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 font-medium"
                  >
                    {availableDeptsForEdit.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center justify-between p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                    <span>No departments in this Business Unit yet.</span>
                    <button
                      type="button"
                      onClick={() => handleOpenAddDeptModal(effectiveEditBU)}
                      className="font-bold text-blue-700 underline"
                    >
                      Add Dept
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  id="btn-cancel-edit-user"
                  onClick={() => setUserToEdit(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-submit-edit-user"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: RESET PASSWORD CONFIRMATION */}
      {/* ========================================================================= */}
      {userToReset && (
        <div
          id="modal-reset-password-backdrop"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            id="modal-reset-password-dialog"
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">Reset User Password</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Are you sure you want to reset the password for{' '}
                  <strong className="text-slate-800">{userToReset.fullName}</strong> (
                  <span className="font-mono text-slate-700">@{userToReset.username}</span>)?
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <span>Default Password:</span>
                <code className="bg-amber-200/80 px-1.5 py-0.5 rounded font-mono font-bold text-amber-950">
                  {DEFAULT_USER_PASSWORD}
                </code>
              </p>
              <p className="text-[11px] text-amber-800">
                The user account will be flagged for password change. On their next sign-in attempt, they will be required to set a new custom password.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                id="btn-cancel-reset-password"
                onClick={() => setUserToReset(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-reset-password"
                onClick={handleConfirmResetPassword}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Confirm Reset</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: DELETE USER CONFIRMATION */}
      {/* ========================================================================= */}
      {userToDelete && (
        <div
          id="modal-delete-user-backdrop"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            id="modal-delete-user-dialog"
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">Delete Staff Account</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Are you sure you want to permanently delete{' '}
                  <strong className="text-slate-800">{userToDelete.fullName}</strong> (
                  <span className="font-mono text-slate-700">@{userToDelete.username}</span>)?
                </p>
              </div>
            </div>

            <div className="p-3 bg-rose-50/70 border border-rose-200/80 rounded-xl text-xs text-rose-900">
              <p className="text-[11px] leading-relaxed">
                This user account and their role privileges will be permanently deleted from the directory. This action cannot be reversed.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                id="btn-cancel-delete-user"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-delete-user"
                onClick={handleConfirmDeleteUser}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: ADD DEPARTMENT MODAL */}
      {/* ========================================================================= */}
      {isAddDeptModalOpen && (
        <div
          id="modal-add-department-backdrop"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            id="modal-add-department-dialog"
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add New Department</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Create a new organizational department
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="btn-close-add-dept-modal"
                onClick={() => setIsAddDeptModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {deptFeedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                  deptFeedback.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                {deptFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <span>{deptFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleCreateDepartment} className="space-y-3.5">
              {/* Target Business Unit */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Business Unit <span className="text-rose-500">*</span>
                </label>
                {isGlobalAdmin ? (
                  <select
                    id="input-new-dept-bu"
                    value={newDeptBUId}
                    onChange={(e) => setNewDeptBUId(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 font-medium"
                    required
                  >
                    {businessUnits.map((bu) => (
                      <option key={bu.id} value={bu.id}>
                        {bu.name} ({bu.code})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full text-xs rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-slate-600 font-medium flex items-center justify-between">
                    <span>
                      {businessUnits.find((b) => b.id === currentUser.businessUnitId)?.name || currentUser.businessUnitId} ({currentUser.businessUnitId})
                    </span>
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                )}
              </div>

              {/* Department Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Department Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="input-new-dept-name"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  placeholder="e.g. Quality Assurance, Food & Beverage, Engineering"
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 font-medium"
                  required
                />
              </div>

              {/* Department Code */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Department Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="input-new-dept-code"
                  value={newDeptCode}
                  onChange={(e) => setNewDeptCode(e.target.value.toUpperCase())}
                  placeholder="e.g. QA, FNB, ENG, HR, IT"
                  maxLength={10}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 font-mono font-bold uppercase"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  A short 2-6 character identifier used for badge tags and ticket metadata.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  id="btn-cancel-add-dept"
                  onClick={() => setIsAddDeptModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-submit-add-dept"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Department</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: EDIT DEPARTMENT MODAL */}
      {/* ========================================================================= */}
      {deptToEdit && (
        <div
          id="modal-edit-department-backdrop"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            id="modal-edit-department-dialog"
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit Department</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Update department name or code identifier
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="btn-close-edit-dept-modal"
                onClick={() => setDeptToEdit(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {deptFeedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                  deptFeedback.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                {deptFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <span>{deptFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditDept} className="space-y-3.5">
              {/* Target Business Unit */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Business Unit
                </label>
                {isGlobalAdmin ? (
                  <select
                    id="input-edit-dept-bu"
                    value={newDeptBUId}
                    onChange={(e) => setNewDeptBUId(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 font-medium"
                    required
                  >
                    {businessUnits.map((bu) => (
                      <option key={bu.id} value={bu.id}>
                        {bu.name} ({bu.code})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full text-xs rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-slate-600 font-medium flex items-center justify-between">
                    <span>
                      {businessUnits.find((b) => b.id === deptToEdit.businessUnitId)?.name || deptToEdit.businessUnitId}
                    </span>
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                )}
              </div>

              {/* Department Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Department Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="input-edit-dept-name"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 font-medium"
                  required
                />
              </div>

              {/* Department Code */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Department Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="input-edit-dept-code"
                  value={newDeptCode}
                  onChange={(e) => setNewDeptCode(e.target.value.toUpperCase())}
                  maxLength={10}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 font-mono font-bold uppercase"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  id="btn-cancel-edit-dept"
                  onClick={() => setDeptToEdit(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-submit-edit-dept"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: DELETE DEPARTMENT CONFIRMATION */}
      {/* ========================================================================= */}
      {deptToDelete && (
        <div
          id="modal-delete-dept-backdrop"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            id="modal-delete-dept-dialog"
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">Delete Department</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Are you sure you want to delete the department{' '}
                  <strong className="text-slate-800">{deptToDelete.name}</strong> (
                  <span className="font-mono text-slate-700">{deptToDelete.code}</span>)?
                </p>
              </div>
            </div>

            {/* Impact Details */}
            {(() => {
              const assignedCount = users.filter((u) => u.departmentId === deptToDelete.id).length;
              return (
                <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>{assignedCount} Assigned Staff Member(s)</span>
                  </p>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Deleting this department will automatically update all assigned personnel to a general department in the same Business Unit so their accounts remain active and accessible.
                  </p>
                </div>
              );
            })()}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                id="btn-cancel-delete-dept"
                onClick={() => setDeptToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-delete-dept"
                onClick={handleConfirmDeleteDept}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Department</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
