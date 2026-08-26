import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BusinessUnit, Department, User, Ticket } from '../types';
import {
  SEED_BUSINESS_UNITS,
  SEED_DEPARTMENTS,
  SEED_USERS,
  SEED_TICKETS,
} from '../data/seedData';

// Firestore collection names
export const BU_COLLECTION = 'businessUnits';
export const DEPT_COLLECTION = 'departments';
export const USERS_COLLECTION = 'users';
export const TICKETS_COLLECTION = 'tickets';

/**
 * Sanitizes data for Firestore by removing any keys with `undefined` values recursively.
 * Firestore throws a runtime error if any property in an object is `undefined`.
 */
export function removeUndefinedFields<T>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj
      .map((item) => removeUndefinedFields(item))
      .filter((item) => item !== undefined) as any;
  }
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = removeUndefinedFields(value);
    }
  }
  return result;
}

/**
 * Checks if the Firestore database is already seeded.
 * If empty or forced, seeds initial business units, departments, users, and tickets.
 */
export async function initializeFirestoreDatabase(force: boolean = false): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    const buSnapshot = await getDocs(collection(db, BU_COLLECTION));
    if (buSnapshot.empty || force) {
      console.log('🌱 Seeding initial records to Cloud Firestore project it-ticketing-app-3819c...');
      
      // 1. Business Units
      for (const bu of SEED_BUSINESS_UNITS) {
        await setDoc(doc(db, BU_COLLECTION, bu.id), removeUndefinedFields(bu), { merge: true });
      }

      // 2. Departments
      for (const dept of SEED_DEPARTMENTS) {
        await setDoc(doc(db, DEPT_COLLECTION, dept.id), removeUndefinedFields(dept), { merge: true });
      }

      // 3. Users
      for (const user of SEED_USERS) {
        await setDoc(doc(db, USERS_COLLECTION, user.id), removeUndefinedFields(user), { merge: true });
      }

      // 4. Tickets (seed initial set)
      for (const ticket of SEED_TICKETS) {
        await setDoc(doc(db, TICKETS_COLLECTION, ticket.id), removeUndefinedFields(ticket), { merge: true });
      }

      console.log('✅ Cloud Firestore successfully seeded with all initial data!');
      return { success: true, message: 'All collections successfully created and populated in Firestore!' };
    }
    return { success: true, message: 'Firestore collections are already present and synced.' };
  } catch (error: any) {
    console.error('Error initializing Firestore database:', error);
    const isPermissionError = error?.code === 'permission-denied' || error?.message?.includes('permission');
    return {
      success: false,
      message: isPermissionError
        ? 'Permission denied: Please update the Rules tab in your Firebase Console to allow read/write.'
        : `Firestore sync error: ${error?.message || 'Unknown error'}`,
      error: error?.message,
    };
  }
}

// ----------------------------------------------------
// Firestore Real-Time Subscriptions & CRUD Services
// ----------------------------------------------------

export function subscribeToBusinessUnits(callback: (bus: BusinessUnit[]) => void) {
  return onSnapshot(collection(db, BU_COLLECTION), (snapshot) => {
    const data = snapshot.docs.map((d) => d.data() as BusinessUnit);
    callback(data);
  }, (err) => console.error('Error subscribing to business units:', err));
}

export function subscribeToDepartments(callback: (depts: Department[]) => void) {
  return onSnapshot(collection(db, DEPT_COLLECTION), (snapshot) => {
    const data = snapshot.docs.map((d) => d.data() as Department);
    callback(data);
  }, (err) => console.error('Error subscribing to departments:', err));
}

export function subscribeToUsers(callback: (users: User[]) => void) {
  return onSnapshot(collection(db, USERS_COLLECTION), (snapshot) => {
    const data = snapshot.docs.map((d) => d.data() as User);
    callback(data);
  }, (err) => console.error('Error subscribing to users:', err));
}

export function subscribeToTickets(callback: (tickets: Ticket[]) => void) {
  return onSnapshot(collection(db, TICKETS_COLLECTION), (snapshot) => {
    const data = snapshot.docs.map((d) => d.data() as Ticket);
    callback(data);
  }, (err) => console.error('Error subscribing to tickets:', err));
}

// Mutations
export async function saveBusinessUnit(bu: BusinessUnit): Promise<void> {
  await setDoc(doc(db, BU_COLLECTION, bu.id), removeUndefinedFields(bu), { merge: true });
}

export async function saveDepartment(dept: Department): Promise<void> {
  await setDoc(doc(db, DEPT_COLLECTION, dept.id), removeUndefinedFields(dept), { merge: true });
}

export async function deleteDepartment(deptId: string): Promise<void> {
  await deleteDoc(doc(db, DEPT_COLLECTION, deptId));
}

export async function saveUser(user: User): Promise<void> {
  await setDoc(doc(db, USERS_COLLECTION, user.id), removeUndefinedFields(user), { merge: true });
}

export async function updateUser(userId: string, updates: Partial<User>): Promise<void> {
  await updateDoc(doc(db, USERS_COLLECTION, userId), removeUndefinedFields(updates));
}

export async function deleteUser(userId: string): Promise<void> {
  await deleteDoc(doc(db, USERS_COLLECTION, userId));
}

export async function saveTicket(ticket: Ticket): Promise<void> {
  await setDoc(doc(db, TICKETS_COLLECTION, ticket.id), removeUndefinedFields(ticket), { merge: true });
}

export async function updateTicket(ticketId: string, updates: Partial<Ticket>): Promise<void> {
  await updateDoc(doc(db, TICKETS_COLLECTION, ticketId), removeUndefinedFields(updates));
}

export async function deleteTicket(ticketId: string): Promise<void> {
  await deleteDoc(doc(db, TICKETS_COLLECTION, ticketId));
}

export async function clearAllTicketsFromFirestore(): Promise<void> {
  try {
    const snapshot = await getDocs(collection(db, TICKETS_COLLECTION));
    if (snapshot.empty) return;
    const batch = writeBatch(db);
    snapshot.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
    console.log('✅ Cleared all tickets from Firestore');
  } catch (error) {
    console.error('Error clearing tickets from firestore:', error);
  }
}
