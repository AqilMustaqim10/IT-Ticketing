/**
 * @file storageService.ts
 * @description Centralized data access & state management engine implementing strict
 * Multi-Business Unit Role-Based Access Control (RBAC), localStorage synchronization,
 * timeframe date filtering, metric aggregation, and IT staff user provisioning.
 */

import {
  BusinessUnit,
  Department,
  User,
  Ticket,
  UserRole,
  DashboardFilterState,
  MetricSummary,
  TicketStatus,
  TicketPriority,
  TicketActivity,
  TicketAttachment,
  BusinessUnitBranding,
} from '../types';
import {
  SEED_BUSINESS_UNITS,
  SEED_DEPARTMENTS,
  SEED_USERS,
  SEED_TICKETS,
} from '../data/seedData';

// Storage keys (v2 includes CCEC, FNB, HOTEL, KLBS, KLW, UOA HQ)
const STORAGE_KEYS = {
  BUSINESS_UNITS: 'it_ticketing_business_units_v2',
  DEPARTMENTS: 'it_ticketing_departments_v2',
  USERS: 'it_ticketing_users_v2',
  TICKETS: 'it_ticketing_tickets_v2',
  CURRENT_USER: 'it_ticketing_current_user_v2',
};

/**
 * Standard System Default Password
 * Assigned to newly registered accounts and when IT/Admin triggers a password reset.
 */
export const DEFAULT_USER_PASSWORD = 'password123';

/**
 * StorageService Class
 * Encapsulates full CRUD operations, security checks, analytical calculations,
 * and user credential lifecycle management.
 */
class StorageService {
  /**
   * Initializes the repository with seed data if not present in browser storage.
   * Also ensures newly added Business Units (KLBS, KLW, UOA HQ) are seamlessly synchronized.
   */
  public initialize(): void {
    if (!localStorage.getItem(STORAGE_KEYS.BUSINESS_UNITS)) {
      localStorage.setItem(
        STORAGE_KEYS.BUSINESS_UNITS,
        JSON.stringify(SEED_BUSINESS_UNITS)
      );
    }

    if (!localStorage.getItem(STORAGE_KEYS.DEPARTMENTS)) {
      localStorage.setItem(
        STORAGE_KEYS.DEPARTMENTS,
        JSON.stringify(SEED_DEPARTMENTS)
      );
    }

    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_USERS));
    }

    if (!localStorage.getItem(STORAGE_KEYS.TICKETS)) {
      localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(SEED_TICKETS));
    }

    if (!localStorage.getItem(STORAGE_KEYS.CURRENT_USER)) {
      // Default to Global Admin on initial load for full demo inspection
      localStorage.setItem(
        STORAGE_KEYS.CURRENT_USER,
        JSON.stringify(SEED_USERS[0])
      );
    }
  }

  /**
   * Resets all data back to the default seed datasets.
   */
  public resetToSeed(): void {
    localStorage.setItem(
      STORAGE_KEYS.BUSINESS_UNITS,
      JSON.stringify(SEED_BUSINESS_UNITS)
    );
    localStorage.setItem(
      STORAGE_KEYS.DEPARTMENTS,
      JSON.stringify(SEED_DEPARTMENTS)
    );
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_USERS));
    localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(SEED_TICKETS));
    localStorage.setItem(
      STORAGE_KEYS.CURRENT_USER,
      JSON.stringify(SEED_USERS[0])
    );
  }

  // ==========================================
  // Session & Authentication Helpers
  // ==========================================

  /**
   * Retrieves the currently active authenticated user session.
   */
  public getCurrentUser(): User | null {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!raw) {
      return null;
    }
    try {
      const parsedUser = JSON.parse(raw);
      if (!parsedUser || !parsedUser.id) return null;
      // Sync fresh user data from user repository (to catch mustChangePassword changes)
      const allUsers = this.getAllUsers();
      const freshUser = allUsers.find((u) => u.id === parsedUser.id);
      return freshUser || parsedUser;
    } catch {
      return null;
    }
  }

  /**
   * Sets the active user session (simulates user login or quick role switch).
   */
  public setCurrentUser(user: User | null): void {
    if (!user) {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    } else {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    }
  }

  /**
   * Logs a user into the system by verifying username and password credentials.
   */
  public login(
    username: string,
    password: string
  ): { success: boolean; error?: string; user?: User } {
    const allUsers = this.getAllUsers();
    const cleanUsername = username.trim().toLowerCase();
    const user = allUsers.find(
      (u) => u.username.toLowerCase() === cleanUsername
    );

    if (!user) {
      return { success: false, error: 'Invalid username. Account not found.' };
    }

    const storedPassword = user.password || DEFAULT_USER_PASSWORD;
    if (storedPassword !== password.trim()) {
      return { success: false, error: 'Invalid password. Please verify your credentials.' };
    }

    // Set authenticated user in session
    this.setCurrentUser(user);
    return { success: true, user };
  }

  /**
   * Clears the active session and logs out the user.
   */
  public logout(): void {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }

  /**
   * Updates user's password, clears the mustChangePassword flag, and logs them out.
   */
  public changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): { success: boolean; error?: string } {
    const allUsers = this.getAllUsers();
    const userIndex = allUsers.findIndex((u) => u.id === userId);

    if (userIndex === -1) {
      return { success: false, error: 'User account not found.' };
    }

    const targetUser = allUsers[userIndex];
    const storedPassword = targetUser.password || DEFAULT_USER_PASSWORD;

    // Validate current password
    if (storedPassword !== currentPassword.trim()) {
      return { success: false, error: 'Current password does not match.' };
    }

    // Validate new password rules
    const trimmedNew = newPassword.trim();
    if (!trimmedNew || trimmedNew.length < 6) {
      return {
        success: false,
        error: 'New password must be at least 6 characters long.',
      };
    }

    if (trimmedNew === DEFAULT_USER_PASSWORD) {
      return {
        success: false,
        error: `New password cannot be the default password ('${DEFAULT_USER_PASSWORD}'). Please choose a personalized password.`,
      };
    }

    if (trimmedNew === storedPassword && !targetUser.mustChangePassword) {
      return {
        success: false,
        error: 'New password must be different from your current password.',
      };
    }

    // Update password and revoke mustChangePassword requirement
    const updatedUser: User = {
      ...targetUser,
      password: trimmedNew,
      mustChangePassword: false,
    };
    allUsers[userIndex] = updatedUser;

    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(allUsers));

    // Synchronize password update with Firestore
    try {
      import('./firestoreService').then(({ saveUser }) => {
        saveUser(updatedUser).catch(console.error);
      });
    } catch (e) {
      console.warn('Firestore sync error on password change:', e);
    }

    // Force automatic logout after password change
    this.logout();

    return { success: true };
  }

  /**
   * Resets a user's password back to the default password ('password123')
   * and sets mustChangePassword = true.
   *
   * RBAC Enforcement:
   * - IT Support: Can only reset passwords for USER accounts in their own Business Unit.
   * - Admin: Can reset passwords for any account in any Business Unit.
   * - Staff (USER): Cannot reset passwords.
   */
  public resetPasswordToDefault(
    requester: User,
    targetUserId: string
  ): { success: boolean; error?: string; targetUser?: User } {
    if (requester.role === 'USER') {
      return {
        success: false,
        error: 'Unauthorized: Staff users cannot reset account credentials.',
      };
    }

    const allUsers = this.getAllUsers();
    const userIndex = allUsers.findIndex((u) => u.id === targetUserId);

    if (userIndex === -1) {
      return { success: false, error: 'Target user account not found.' };
    }

    const targetUser = allUsers[userIndex];

    // IT Support RBAC enforcement
    if (requester.role === 'IT') {
      if (targetUser.role !== 'USER') {
        return {
          success: false,
          error: 'Forbidden: IT Support can only reset passwords for Staff (role: USER).',
        };
      }
      if (targetUser.businessUnitId !== requester.businessUnitId) {
        return {
          success: false,
          error: 'Forbidden: IT Support can only reset passwords for staff in their assigned Business Unit.',
        };
      }
    }

    // Reset password to default and mark flag
    const updatedTargetUser: User = {
      ...targetUser,
      password: DEFAULT_USER_PASSWORD,
      mustChangePassword: true,
    };

    allUsers[userIndex] = updatedTargetUser;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(allUsers));

    // Synchronize reset password with Firestore
    try {
      import('./firestoreService').then(({ saveUser }) => {
        saveUser(updatedTargetUser).catch(console.error);
      });
    } catch (e) {
      console.warn('Firestore sync error on password reset:', e);
    }

    // If target user is the currently logged in user, refresh their session
    const currentSession = this.getCurrentUser();
    if (currentSession && currentSession.id === targetUserId) {
      this.setCurrentUser(updatedTargetUser);
    }

    return { success: true, targetUser: updatedTargetUser };
  }

  // ==========================================
  // Business Units & Departments
  // ==========================================

  public getBusinessUnits(): BusinessUnit[] {
    const raw = localStorage.getItem(STORAGE_KEYS.BUSINESS_UNITS);
    if (!raw) return SEED_BUSINESS_UNITS;
    try {
      const parsed: BusinessUnit[] = JSON.parse(raw);
      // Ensure branding is present on all units (merge with seeds if missing)
      return parsed.map((bu) => {
        const seed = SEED_BUSINESS_UNITS.find((s) => s.id === bu.id);
        if (!bu.branding && seed?.branding) {
          bu.branding = seed.branding;
        }
        return bu;
      });
    } catch {
      return SEED_BUSINESS_UNITS;
    }
  }

  /**
   * Updates custom branding & theme configuration for a specific Business Unit.
   * RBAC Enforcement:
   * - ADMIN (Global Admin): EXCLUSIVE permission to configure and customize business unit branding.
   * - IT / USER: Unauthorized.
   */
  public updateBusinessUnitBranding(
    currentUser: User,
    businessUnitId: string,
    branding: import('../types').BusinessUnitBranding
  ): { success: boolean; error?: string; businessUnit?: BusinessUnit } {
    if (currentUser.role !== 'ADMIN') {
      return {
        success: false,
        error: 'Forbidden: Only Global Administrators have permission to modify business unit portal branding.',
      };
    }

    const businessUnits = this.getBusinessUnits();
    const index = businessUnits.findIndex((b) => b.id === businessUnitId);

    if (index === -1) {
      return { success: false, error: 'Business Unit not found.' };
    }

    businessUnits[index] = {
      ...businessUnits[index],
      themeColor: branding.primaryColor || businessUnits[index].themeColor || '#2563eb',
      branding: {
        ...businessUnits[index].branding,
        ...branding,
      },
    };

    localStorage.setItem(STORAGE_KEYS.BUSINESS_UNITS, JSON.stringify(businessUnits));
    // Asynchronously synchronize to Cloud Firestore
    try {
      import('./firestoreService').then(({ saveBusinessUnit }) => {
        saveBusinessUnit(businessUnits[index]).catch(console.error);
      });
    } catch (e) {
      console.warn('Firestore sync error:', e);
    }
    return { success: true, businessUnit: businessUnits[index] };
  }

  public getDepartments(businessUnitId?: string): Department[] {
    const raw = localStorage.getItem(STORAGE_KEYS.DEPARTMENTS);
    const depts: Department[] = raw ? JSON.parse(raw) : SEED_DEPARTMENTS;
    if (businessUnitId && businessUnitId !== 'ALL') {
      return depts.filter((d) => d.businessUnitId === businessUnitId);
    }
    return depts;
  }

  /**
   * Adds a new department to a business unit.
   * RBAC Enforcement:
   * - ADMIN and IT (in any business unit): Can add departments for user registration.
   * - USER: Unauthorized.
   */
  public addDepartment(
    currentUser: User,
    deptData: {
      name: string;
      code: string;
      businessUnitId: string;
    }
  ): { success: boolean; error?: string; department?: Department } {
    if (currentUser.role === 'USER') {
      return { success: false, error: 'Unauthorized: Staff users cannot add new departments.' };
    }

    const trimmedName = deptData.name.trim();
    const trimmedCode = deptData.code.trim().toUpperCase();
    const targetBUId = (deptData.businessUnitId || currentUser.businessUnitId || '').trim();

    if (!trimmedName) {
      return { success: false, error: 'Department name is required.' };
    }

    if (!trimmedCode) {
      return { success: false, error: 'Department code is required.' };
    }

    if (!targetBUId) {
      return { success: false, error: 'Business unit assignment is required.' };
    }

    const allDepts = this.getDepartments();

    // Check uniqueness of department name or code within the target business unit
    const exists = allDepts.some(
      (d) =>
        d.businessUnitId === targetBUId &&
        (d.name.toLowerCase() === trimmedName.toLowerCase() ||
          d.code.toUpperCase() === trimmedCode)
    );

    if (exists) {
      return {
        success: false,
        error: `A department with name "${trimmedName}" or code "${trimmedCode}" already exists in this Business Unit.`,
      };
    }

    const cleanBu = targetBUId.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanCode = trimmedCode.toLowerCase().replace(/[^a-z0-9]/g, '');
    const newDept: Department = {
      id: `dept_${cleanBu}_${cleanCode}_${Date.now().toString(36)}`,
      name: trimmedName,
      code: trimmedCode,
      businessUnitId: targetBUId,
    };

    const updatedDepts = [...allDepts, newDept];
    localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(updatedDepts));

    // Asynchronously synchronize with Cloud Firestore
    try {
      import('./firestoreService').then(({ saveDepartment }) => {
        saveDepartment(newDept).catch(console.error);
      });
    } catch (e) {
      console.warn('Firestore department sync error:', e);
    }

    return { success: true, department: newDept };
  }

  /**
   * Updates an existing department.
   * RBAC Enforcement:
   * - ADMIN: Can update any department in any Business Unit.
   * - IT: Can update departments belonging to their assigned Business Unit.
   * - USER: Unauthorized.
   */
  public updateDepartment(
    currentUser: User,
    deptId: string,
    updates: {
      name?: string;
      code?: string;
      businessUnitId?: string;
    }
  ): { success: boolean; error?: string; department?: Department } {
    if (currentUser.role === 'USER') {
      return { success: false, error: 'Unauthorized: Staff users cannot modify departments.' };
    }

    const allDepts = this.getDepartments();
    const deptIndex = allDepts.findIndex((d) => d.id === deptId);

    if (deptIndex === -1) {
      return { success: false, error: 'Department not found.' };
    }

    const existingDept = allDepts[deptIndex];

    // IT can only edit departments within their business unit
    if (currentUser.role === 'IT' && existingDept.businessUnitId !== currentUser.businessUnitId) {
      return {
        success: false,
        error: 'Forbidden: IT Support can only modify departments within their assigned Business Unit.',
      };
    }

    const targetBUId =
      currentUser.role === 'ADMIN' && updates.businessUnitId
        ? updates.businessUnitId.trim()
        : existingDept.businessUnitId;

    const trimmedName = updates.name !== undefined ? updates.name.trim() : existingDept.name;
    const trimmedCode =
      updates.code !== undefined ? updates.code.trim().toUpperCase() : existingDept.code;

    if (!trimmedName) {
      return { success: false, error: 'Department name cannot be empty.' };
    }
    if (!trimmedCode) {
      return { success: false, error: 'Department code cannot be empty.' };
    }

    // Check uniqueness (ignoring current dept)
    const exists = allDepts.some(
      (d) =>
        d.id !== deptId &&
        d.businessUnitId === targetBUId &&
        (d.name.toLowerCase() === trimmedName.toLowerCase() ||
          d.code.toUpperCase() === trimmedCode)
    );

    if (exists) {
      return {
        success: false,
        error: `Another department with name "${trimmedName}" or code "${trimmedCode}" already exists in this Business Unit.`,
      };
    }

    const updatedDept: Department = {
      ...existingDept,
      name: trimmedName,
      code: trimmedCode,
      businessUnitId: targetBUId,
    };

    allDepts[deptIndex] = updatedDept;
    localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(allDepts));

    // Asynchronously synchronize with Cloud Firestore
    try {
      import('./firestoreService').then(({ saveDepartment }) => {
        saveDepartment(updatedDept).catch(console.error);
      });
    } catch (e) {
      console.warn('Firestore department sync error on update:', e);
    }

    return { success: true, department: updatedDept };
  }

  /**
   * Deletes a department and cleanly handles reassignment of affected users.
   * RBAC Enforcement:
   * - ADMIN: Can delete any department.
   * - IT: Can delete departments strictly within their assigned Business Unit.
   * - USER: Unauthorized.
   */
  public deleteDepartment(
    currentUser: User,
    deptId: string
  ): { success: boolean; error?: string } {
    if (currentUser.role === 'USER') {
      return { success: false, error: 'Unauthorized: Staff users cannot delete departments.' };
    }

    const allDepts = this.getDepartments();
    const deptToDelete = allDepts.find((d) => d.id === deptId);

    if (!deptToDelete) {
      return { success: false, error: 'Department not found.' };
    }

    // IT can only delete departments within their business unit
    if (currentUser.role === 'IT' && deptToDelete.businessUnitId !== currentUser.businessUnitId) {
      return {
        success: false,
        error: 'Forbidden: IT Support can only delete departments within their assigned Business Unit.',
      };
    }

    const updatedDepts = allDepts.filter((d) => d.id !== deptId);
    localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(updatedDepts));

    // Cleanly reassign users who were in this department to the first available department in that BU or empty
    const remainingDeptsInBU = updatedDepts.filter((d) => d.businessUnitId === deptToDelete.businessUnitId);
    const fallbackDeptId = remainingDeptsInBU.length > 0 ? remainingDeptsInBU[0].id : '';

    const allUsers = this.getAllUsers();
    let usersModified = false;
    const updatedUsers = allUsers.map((u) => {
      if (u.departmentId === deptId) {
        usersModified = true;
        const patchedUser = { ...u, departmentId: fallbackDeptId };
        // Sync re-assigned user to Firestore
        try {
          import('./firestoreService').then(({ saveUser }) => {
            saveUser(patchedUser).catch(console.error);
          });
        } catch (e) {
          console.warn('Firestore user reassign sync error:', e);
        }
        return patchedUser;
      }
      return u;
    });

    if (usersModified) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
      const activeSession = this.getCurrentUser();
      if (activeSession && activeSession.departmentId === deptId) {
        this.setCurrentUser({ ...activeSession, departmentId: fallbackDeptId });
      }
    }

    // Sync deletion to Firestore
    try {
      import('./firestoreService').then(({ deleteDepartment }) => {
        deleteDepartment(deptId).catch(console.error);
      });
    } catch (e) {
      console.warn('Firestore department deletion sync error:', e);
    }

    return { success: true };
  }

  // ==========================================
  // Users & Multi-Business Unit RBAC User Management
  // ==========================================

  public getAllUsers(): User[] {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    return raw ? JSON.parse(raw) : SEED_USERS;
  }

  /**
   * Scoped User Retrieval based on RBAC:
   * - ADMIN: returns all users across all business units.
   * - IT: returns users only within their assigned business unit.
   * - USER: returns users within their business unit.
   */
  public getScopedUsers(currentUser: User): User[] {
    const allUsers = this.getAllUsers();
    if (currentUser.role === 'ADMIN') {
      return allUsers;
    }
    // IT and USER only see accounts within their own Business Unit
    return allUsers.filter(
      (u) => u.businessUnitId === currentUser.businessUnitId
    );
  }

  /**
   * Registers a new user with strict multi-business unit constraints:
   * - ADMIN: Can register any role (ADMIN, IT, USER) in any Business Unit.
   * - IT: Can ONLY register users with role 'USER' locked strictly to their own Business Unit.
   * - USER: Cannot register any new accounts.
   */
  public registerUser(
    currentUser: User,
    newUserPayload: {
      username: string;
      fullName: string;
      email: string;
      role: UserRole;
      businessUnitId: string;
      departmentId: string;
      password?: string;
      avatarUrl?: string;
    }
  ): { success: boolean; error?: string; user?: User } {
    // 1. Role enforcement check
    if (currentUser.role === 'USER') {
      return { success: false, error: 'Unauthorized: Staff users cannot register new accounts.' };
    }

    if (currentUser.role === 'IT') {
      // IT can only register USER role
      if (newUserPayload.role !== 'USER') {
        return {
          success: false,
          error: 'Forbidden: IT Support staff can only register Staff accounts (role: USER).',
        };
      }
      // IT can only register in their own Business Unit
      if (newUserPayload.businessUnitId !== currentUser.businessUnitId) {
        return {
          success: false,
          error: 'Forbidden: IT Support can only register users inside their assigned Business Unit.',
        };
      }
    }

    const allUsers = this.getAllUsers();

    // 2. Check for username uniqueness
    const exists = allUsers.some(
      (u) => u.username.toLowerCase() === newUserPayload.username.toLowerCase()
    );
    if (exists) {
      return { success: false, error: `Username '${newUserPayload.username}' is already taken.` };
    }

    // 3. Create and persist user entity (assigned standard default password & mustChangePassword flag)
    const newUser: User = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      username: newUserPayload.username.trim(),
      fullName: newUserPayload.fullName.trim(),
      email: newUserPayload.email.trim(),
      role: newUserPayload.role,
      businessUnitId: newUserPayload.businessUnitId,
      departmentId: newUserPayload.departmentId,
      password: DEFAULT_USER_PASSWORD,
      mustChangePassword: true, // Requires password change upon first login
      avatarUrl:
        newUserPayload.avatarUrl ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
          newUserPayload.username
        )}`,
      createdAt: new Date().toISOString(),
    };

    allUsers.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(allUsers));
    try {
      import('./firestoreService').then(({ saveUser }) => {
        saveUser(newUser).catch(console.error);
      });
    } catch (e) {
      console.warn('Firestore sync error:', e);
    }

    return { success: true, user: newUser };
  }

  /**
   * Updates an existing user account's profile, role, and department.
   * RBAC Enforcement:
   * - ADMIN: Global authority to edit any user across any Business Unit, including role and BU reassignment.
   * - IT: Can edit personnel strictly within their assigned Business Unit (fullName, email, departmentId). Cannot promote to ADMIN or move outside their BU.
   * - USER: Unauthorized to edit other user profiles.
   */
  public updateUser(
    currentUser: User,
    userId: string,
    updates: {
      fullName?: string;
      email?: string;
      username?: string;
      role?: UserRole;
      businessUnitId?: string;
      departmentId?: string;
      avatarUrl?: string;
    }
  ): { success: boolean; error?: string; user?: User } {
    if (currentUser.role === 'USER') {
      return { success: false, error: 'Unauthorized: Staff users cannot edit user profiles.' };
    }

    const allUsers = this.getAllUsers();
    const userIndex = allUsers.findIndex((u) => u.id === userId);

    if (userIndex === -1) {
      return { success: false, error: 'User not found.' };
    }

    const targetUser = allUsers[userIndex];

    // IT Scope checks
    if (currentUser.role === 'IT') {
      if (targetUser.businessUnitId !== currentUser.businessUnitId) {
        return {
          success: false,
          error: 'Forbidden: IT Support can only edit staff accounts within their assigned Business Unit.',
        };
      }
      if (updates.role && updates.role === 'ADMIN') {
        return {
          success: false,
          error: 'Forbidden: IT Support cannot grant Administrator privileges.',
        };
      }
      if (updates.businessUnitId && updates.businessUnitId !== currentUser.businessUnitId) {
        return {
          success: false,
          error: 'Forbidden: IT Support cannot transfer users to other Business Units.',
        };
      }
    }

    // Username uniqueness check if username is changed
    if (updates.username && updates.username.trim().toLowerCase() !== targetUser.username.toLowerCase()) {
      const usernameExists = allUsers.some(
        (u) => u.id !== userId && u.username.toLowerCase() === updates.username!.trim().toLowerCase()
      );
      if (usernameExists) {
        return { success: false, error: `Username '${updates.username}' is already taken.` };
      }
    }

    const updatedUser: User = {
      ...targetUser,
      fullName: updates.fullName !== undefined ? updates.fullName.trim() : targetUser.fullName,
      email: updates.email !== undefined ? updates.email.trim() : targetUser.email,
      username: updates.username !== undefined ? updates.username.trim() : targetUser.username,
      role:
        currentUser.role === 'ADMIN' && updates.role !== undefined
          ? updates.role
          : targetUser.role,
      businessUnitId:
        currentUser.role === 'ADMIN' && updates.businessUnitId !== undefined
          ? updates.businessUnitId
          : targetUser.businessUnitId,
      departmentId:
        updates.departmentId !== undefined ? updates.departmentId : targetUser.departmentId,
      avatarUrl: updates.avatarUrl !== undefined ? updates.avatarUrl : targetUser.avatarUrl,
    };

    allUsers[userIndex] = updatedUser;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(allUsers));

    // Asynchronously synchronize with Cloud Firestore
    try {
      import('./firestoreService').then(({ saveUser }) => {
        saveUser(updatedUser).catch(console.error);
      });
    } catch (e) {
      console.warn('Firestore user update sync error:', e);
    }

    // If target user is the currently logged in user, refresh active session
    const currentSession = this.getCurrentUser();
    if (currentSession && currentSession.id === userId) {
      this.setCurrentUser(updatedUser);
    }

    return { success: true, user: updatedUser };
  }

  /**
   * Deletes a user account from storage and syncs to Firestore.
   * RBAC: Only ADMIN (all users except self) and IT (STAFF users in their own BU except self) can delete users.
   */
  public deleteUser(currentUser: User, userId: string): { success: boolean; error?: string } {
    if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'IT')) {
      return { success: false, error: 'Unauthorized: Only Administrators and IT Support can delete users.' };
    }

    const allUsers = this.getAllUsers();
    const targetUser = allUsers.find((u) => u.id === userId);

    if (!targetUser) {
      return { success: false, error: 'User not found.' };
    }

    if (currentUser.id === userId) {
      return { success: false, error: 'Cannot delete your own active account.' };
    }

    if (currentUser.role === 'IT') {
      if (targetUser.businessUnitId !== currentUser.businessUnitId) {
        return {
          success: false,
          error: 'Forbidden: IT Support can only delete staff within their assigned Business Unit.',
        };
      }
      if (targetUser.role === 'ADMIN') {
        return {
          success: false,
          error: 'Forbidden: IT Support cannot delete Administrator accounts.',
        };
      }
      if (targetUser.role === 'IT') {
        return {
          success: false,
          error: 'Forbidden: IT Support cannot delete other IT Support accounts.',
        };
      }
    }

    const updatedUsers = allUsers.filter((u) => u.id !== userId);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
    try {
      import('./firestoreService').then(({ deleteUser }) => {
        deleteUser(userId).catch(console.error);
      });
    } catch (e) {
      console.warn('Firestore sync error on user deletion:', e);
    }

    return { success: true };
  }

  // ==========================================
  // Tickets & RBAC Scoped Queries
  // ==========================================

  public getAllTickets(): Ticket[] {
    const raw = localStorage.getItem(STORAGE_KEYS.TICKETS);
    return raw ? JSON.parse(raw) : SEED_TICKETS;
  }

  /**
   * Filters tickets according to RBAC and Dashboard UI filter states.
   *
   * RBAC Hierarchy:
   * 1. ADMIN: Can access all tickets across all Business Units.
   * 2. IT Support: Restricted to tickets where ticket.businessUnitId === currentUser.businessUnitId.
   * 3. USER (Staff): Restricted to tickets where ticket.createdById === currentUser.id.
   */
  public getFilteredTickets(
    currentUser: User,
    filters: DashboardFilterState
  ): Ticket[] {
    let tickets = this.getAllTickets();

    // --- STEP 1: Apply Strict RBAC Scope ---
    if (currentUser.role === 'ADMIN') {
      // Admin can view all, or optionally filter by Business Unit selector
      if (filters.businessUnitId && filters.businessUnitId !== 'ALL') {
        tickets = tickets.filter((t) => t.businessUnitId === filters.businessUnitId);
      }
    } else if (currentUser.role === 'IT') {
      // IT is strictly locked to their Business Unit regardless of filter
      tickets = tickets.filter(
        (t) => t.businessUnitId === currentUser.businessUnitId
      );
    } else if (currentUser.role === 'USER') {
      // Standard staff only see their own tickets
      tickets = tickets.filter((t) => t.createdById === currentUser.id);
    }

    // --- STEP 2: Timeframe Filter ---
    // Reference date: Simulated as August 20, 2026 or real now
    const now = new Date();
    tickets = tickets.filter((t) => {
      const createdDate = new Date(t.createdAt);
      const diffMs = now.getTime() - createdDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      switch (filters.timeframe) {
        case 'DAILY':
          // Past 24 hours / 1 day
          return diffDays <= 1.5;
        case 'WEEKLY':
          // Past 7 days
          return diffDays <= 7.5;
        case 'MONTHLY':
          // Past 30 days
          return diffDays <= 31;
        case 'YEARLY':
          // Past 365 days
          return diffDays <= 366;
        default:
          return true;
      }
    });

    // --- STEP 3: Department Filter ---
    if (filters.departmentId && filters.departmentId !== 'ALL') {
      tickets = tickets.filter((t) => t.departmentId === filters.departmentId);
    }

    // --- STEP 4: Status Filter ---
    if (filters.status && filters.status !== 'ALL') {
      tickets = tickets.filter((t) => t.status === filters.status);
    }

    // --- STEP 5: Priority Filter ---
    if (filters.priority && filters.priority !== 'ALL') {
      tickets = tickets.filter((t) => t.priority === filters.priority);
    }

    // --- STEP 6: Assigned IT Staff Filter ---
    if (filters.assignedToId && filters.assignedToId !== 'ALL') {
      if (filters.assignedToId === 'UNASSIGNED') {
        tickets = tickets.filter((t) => !t.assignedToId);
      } else {
        tickets = tickets.filter((t) => t.assignedToId === filters.assignedToId);
      }
    }

    // --- STEP 7: Text Search Query ---
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      tickets = tickets.filter(
        (t) =>
          t.ticketNumber.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
      );
    }

    // Sort newest first
    return tickets.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Computes summary metrics for stat cards based on a list of tickets.
   */
  public calculateMetrics(tickets: Ticket[]): MetricSummary {
    const total = tickets.length;
    const open = tickets.filter((t) => t.status === 'OPEN').length;
    const inProgress = tickets.filter((t) => t.status === 'IN_PROGRESS').length;
    const resolved = tickets.filter((t) => t.status === 'RESOLVED').length;
    const closed = tickets.filter((t) => t.status === 'CLOSED').length;
    const urgent = tickets.filter((t) => t.priority === 'URGENT').length;
    const high = tickets.filter((t) => t.priority === 'HIGH').length;

    const completed = resolved + closed;
    const resolutionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Calculate approximate resolution time in hours for resolved/closed items
    let totalResolutionHours = 0;
    let countedTickets = 0;

    tickets.forEach((t) => {
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

  // ==========================================
  // Ticket Actions (Create, Update, Assign)
  // ==========================================

  /**
   * Creates a new support ticket automatically bound to the creator's Business Unit.
   */
  public createTicket(
    currentUser: User,
    payload: {
      title: string;
      description: string;
      priority: TicketPriority;
      departmentId?: string;
      businessUnitId?: string; // Optional for Admin, otherwise locked to currentUser.businessUnitId
      attachments?: TicketAttachment[];
    }
  ): Ticket {
    const allTickets = this.getAllTickets();

    // Determine target BU
    const targetBU =
      currentUser.role === 'ADMIN' && payload.businessUnitId
        ? payload.businessUnitId
        : currentUser.businessUnitId;

    // Auto-resolve department from payload or directly from the reporting user
    const targetDept = payload.departmentId || currentUser.departmentId || '';

    // Generate readable Ticket number e.g. TCK-1045
    const nextNumber = 1000 + allTickets.length + 1;
    const ticketNumber = `TCK-${nextNumber}`;
    const nowIso = new Date().toISOString();

    const newTicket: Ticket = {
      id: `tck-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      ticketNumber,
      title: payload.title.trim(),
      description: payload.description.trim(),
      status: 'OPEN',
      priority: payload.priority,
      createdById: currentUser.id,
      businessUnitId: targetBU,
      departmentId: targetDept,
      createdAt: nowIso,
      updatedAt: nowIso,
      attachments: payload.attachments && payload.attachments.length > 0 ? payload.attachments : [],
      activities: [
        {
          id: `act-${Date.now()}`,
          ticketId: '',
          userId: currentUser.id,
          userName: currentUser.fullName,
          userRole: currentUser.role,
          action: 'CREATED',
          message: payload.attachments && payload.attachments.length > 0
            ? `Ticket submitted with ${payload.priority} priority and ${payload.attachments.length} attachment(s).`
            : `Ticket submitted with ${payload.priority} priority.`,
          timestamp: nowIso,
          attachments: payload.attachments && payload.attachments.length > 0 ? payload.attachments : [],
        },
      ],
    };

    newTicket.activities![0].ticketId = newTicket.id;
    allTickets.unshift(newTicket);
    localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(allTickets));
    try {
      import('./firestoreService').then(({ saveTicket }) => {
        saveTicket(newTicket).catch(console.error);
      });
    } catch (e) {
      console.warn('Firestore sync error:', e);
    }

    return newTicket;
  }

  /**
   * Updates ticket status, assignee, priority, resolution notes, comments, or attachments with RBAC verification.
   */
  public updateTicket(
    currentUser: User,
    ticketId: string,
    updates: {
      status?: TicketStatus;
      priority?: TicketPriority;
      assignedToId?: string;
      resolutionNotes?: string;
      comment?: string;
      newAttachments?: TicketAttachment[];
    }
  ): { success: boolean; error?: string; ticket?: Ticket } {
    const allTickets = this.getAllTickets();
    const index = allTickets.findIndex((t) => t.id === ticketId);

    if (index === -1) {
      return { success: false, error: 'Ticket not found.' };
    }

    const ticket = allTickets[index];

    // RBAC validation: IT staff cannot alter tickets outside their business unit
    if (currentUser.role === 'IT' && ticket.businessUnitId !== currentUser.businessUnitId) {
      return { success: false, error: 'Forbidden: You can only manage tickets in your Business Unit.' };
    }

    // RBAC validation: USER can only comment or close their own tickets
    if (currentUser.role === 'USER') {
      if (ticket.createdById !== currentUser.id) {
        return { success: false, error: 'Forbidden: You can only update your own tickets.' };
      }
      // Staff cannot reassign or change priority arbitrarily
      if (updates.assignedToId !== undefined || updates.priority !== undefined) {
        return { success: false, error: 'Forbidden: Staff cannot reassign or change ticket priority.' };
      }
    }

    const nowIso = new Date().toISOString();
    const activities: TicketActivity[] = ticket.activities || [];

    // Track new attachments added directly or via comment
    if (updates.newAttachments && updates.newAttachments.length > 0) {
      ticket.attachments = [...(ticket.attachments || []), ...updates.newAttachments];
    }

    // Track status update
    if (updates.status && updates.status !== ticket.status) {
      activities.push({
        id: `act-${Date.now()}-status`,
        ticketId: ticket.id,
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        action: 'STATUS_CHANGED',
        message: `Status updated from ${ticket.status} to ${updates.status}.`,
        timestamp: nowIso,
      });
      ticket.status = updates.status;
    }

    // Track priority update
    if (updates.priority && updates.priority !== ticket.priority) {
      activities.push({
        id: `act-${Date.now()}-pri`,
        ticketId: ticket.id,
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        action: 'PRIORITY_CHANGED',
        message: `Priority changed from ${ticket.priority} to ${updates.priority}.`,
        timestamp: nowIso,
      });
      ticket.priority = updates.priority;
    }

    // Track assignee update
    if (updates.assignedToId !== undefined && updates.assignedToId !== ticket.assignedToId) {
      const allUsers = this.getAllUsers();
      const assignee = allUsers.find((u) => u.id === updates.assignedToId);
      const assigneeName = assignee ? assignee.fullName : 'Unassigned';

      activities.push({
        id: `act-${Date.now()}-assign`,
        ticketId: ticket.id,
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        action: 'ASSIGNED',
        message: `Assigned ticket to ${assigneeName}.`,
        timestamp: nowIso,
      });
      ticket.assignedToId = updates.assignedToId || undefined;
    }

    // Resolution notes
    if (updates.resolutionNotes !== undefined) {
      ticket.resolutionNotes = updates.resolutionNotes;
    }

    // New Comment (with optional comment attachments)
    if ((updates.comment && updates.comment.trim()) || (updates.newAttachments && updates.newAttachments.length > 0)) {
      activities.push({
        id: `act-${Date.now()}-comment`,
        ticketId: ticket.id,
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        action: 'COMMENT',
        message: updates.comment?.trim() || (updates.newAttachments ? `Attached ${updates.newAttachments.length} image(s).` : ''),
        timestamp: nowIso,
        attachments: updates.newAttachments && updates.newAttachments.length > 0 ? updates.newAttachments : undefined,
      });
    }

    ticket.activities = activities;
    ticket.updatedAt = nowIso;
    allTickets[index] = ticket;

    localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(allTickets));
    try {
      import('./firestoreService').then(({ saveTicket }) => {
        saveTicket(ticket).catch(console.error);
      });
    } catch (e) {
      console.warn('Firestore sync error:', e);
    }
    return { success: true, ticket };
  }

  /**
   * Deletes a single ticket by ID from local storage and firestore.
   * RBAC: Only ADMIN (any ticket) and IT (tickets within their assigned Business Unit) can delete tickets.
   */
  public deleteTicket(currentUser: User, ticketId: string): { success: boolean; error?: string } {
    if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'IT')) {
      return { success: false, error: 'Unauthorized: Only Administrators and IT Support can delete tickets.' };
    }

    const allTickets = this.getAllTickets();
    const targetTicket = allTickets.find((t) => t.id === ticketId);

    if (!targetTicket) {
      return { success: false, error: 'Ticket not found.' };
    }

    // RBAC check: IT can only delete within their assigned Business Unit
    if (currentUser.role === 'IT') {
      if (targetTicket.businessUnitId !== currentUser.businessUnitId) {
        return { success: false, error: 'Forbidden: IT Support can only delete tickets within their Business Unit.' };
      }
    }

    const updatedTickets = allTickets.filter((t) => t.id !== ticketId);
    localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(updatedTickets));

    try {
      import('./firestoreService').then(({ deleteTicket }) => {
        deleteTicket(ticketId).catch(console.error);
      });
    } catch (e) {
      console.warn('Firestore sync error on deleteTicket:', e);
    }

    return { success: true };
  }

  /**
   * Deletes all tickets from local storage and firestore.
   */
  public clearAllTickets(): void {
    localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify([]));
    try {
      import('./firestoreService').then(({ clearAllTicketsFromFirestore }) => {
        clearAllTicketsFromFirestore().catch(console.error);
      });
    } catch (e) {
      console.warn('Firestore sync error on clearAllTickets:', e);
    }
  }
}

export const storageService = new StorageService();

