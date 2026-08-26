import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export const firebaseConfig = {
  apiKey: "AIzaSyBKQZUc1sgG53-g4GWm6M0dRa5iMJS8WQw",
  authDomain: "it-ticketing-app-3819c.firebaseapp.com",
  projectId: "it-ticketing-app-3819c",
  storageBucket: "it-ticketing-app-3819c.firebasestorage.app",
  messagingSenderId: "553557108393",
  appId: "1:553557108393:web:90366c593fe3bb0d9cabb8",
  measurementId: "G-LGBCQE2RV3"
};

// Initialize Firebase SDK
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
