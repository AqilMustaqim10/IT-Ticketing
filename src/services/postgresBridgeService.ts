/**
 * @file postgresBridgeService.ts
 * @description Bridge utility to test PostgreSQL connection and synchronize data with PostgreSQL backend.
 */

export interface DbStatus {
  connected: boolean;
  mode: 'PostgreSQL' | 'localStorage';
  database?: string;
  time?: string;
  error?: string;
  message?: string;
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
   * Push all current local data (Business units, departments, users, tickets) into PostgreSQL
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
};
