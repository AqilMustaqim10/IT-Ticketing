/**
 * @file postgresBridgeService.ts
 * @description Bridge utility to communicate directly with the PostgreSQL backend API endpoints.
 */

import { BusinessUnit, Department, User, Ticket, TicketActivity } from '../types';

export interface DbStatus {
  connected: boolean;
  mode: 'PostgreSQL' | 'localStorage';
  database?: string;
  time?: string;
  error?: string;
  message?: string;
}

export interface DbFullPayload {
  businessUnits: BusinessUnit[];
  departments: Department[];
  users: User[];
  tickets: Ticket[];
  auditLogs: any[];
}

export const postgresBridge = {
  /**
   * Check connection status to PostgreSQL
   */
  checkStatus: async (): Promise<DbStatus> => {
    try {
      const res = await fetch('/api/db/status');
      if (!res.ok) {
        return { connected: false, mode: 'localStorage', error: `HTTP ${res.status}` };
      }
      return await res.json();
    } catch (err: any) {
      return { connected: false, mode: 'localStorage', error: err.message };
    }
  },

  /**
   * Fetch entire dataset straight from PostgreSQL tables
   */
  fetchAllData: async (): Promise<DbFullPayload | null> => {
    try {
      const res = await fetch('/api/db/all');
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  /**
   * Save / Create a new ticket directly in PostgreSQL
   */
  createTicket: async (ticket: Ticket): Promise<boolean> => {
    try {
      const res = await fetch('/api/db/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticket),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Update ticket fields, status, activities, resolution in PostgreSQL
   */
  updateTicket: async (id: string, updates: Partial<Ticket>): Promise<boolean> => {
    try {
      const res = await fetch(`/api/db/tickets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Delete a ticket from PostgreSQL
   */
  deleteTicket: async (ticketId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/db/tickets/${ticketId}`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Delete ALL tickets from PostgreSQL
   */
  clearAllTickets: async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/db/tickets', {
        method: 'DELETE',
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Create or update a user account in PostgreSQL
   */
  saveUser: async (user: User | Partial<User>, isNew = false): Promise<boolean> => {
    try {
      if (isNew) {
        const res = await fetch('/api/db/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user),
        });
        return res.ok;
      } else if (user.id) {
        const res = await fetch(`/api/db/users/${user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user),
        });
        if (res.ok) return true;
        // If not found on PUT, attempt POST fallback
        const postRes = await fetch('/api/db/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user),
        });
        return postRes.ok;
      } else {
        const res = await fetch('/api/db/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user),
        });
        return res.ok;
      }
    } catch {
      return false;
    }
  },

  /**
   * Delete user account from PostgreSQL
   */
  deleteUser: async (userId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/db/users/${userId}`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Delete department from PostgreSQL
   */
  deleteDepartment: async (deptId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/db/departments/${deptId}`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Update Business Unit branding in PostgreSQL
   */
  updateBusinessUnit: async (id: string, updates: Partial<BusinessUnit>): Promise<boolean> => {
    try {
      const res = await fetch(`/api/db/business-units/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Push all current local state to PostgreSQL (Sync button)
   */
  syncAllToPostgres: async (): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      const businessUnits = JSON.parse(localStorage.getItem('it_ticketing_business_units_v2') || '[]');
      const departments = JSON.parse(localStorage.getItem('it_ticketing_departments_v2') || '[]');
      const users = JSON.parse(localStorage.getItem('it_ticketing_users_v2') || '[]');
      const tickets = JSON.parse(localStorage.getItem('it_ticketing_tickets_v2') || '[]');

      const res = await fetch('/api/db/sync-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessUnits, departments, users, tickets }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Sync failed' };
      }
      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  /**
   * Reset database back to SQL script defaults
   */
  resetAll: async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/db/reset-all', { method: 'POST' });
      return res.ok;
    } catch {
      return false;
    }
  },
};
