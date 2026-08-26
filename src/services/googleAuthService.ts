import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
];

const provider = new GoogleAuthProvider();
GMAIL_SCOPES.forEach((scope) => provider.addScope(scope));
// Force consent prompt so Google always shows the permission checkboxes
provider.setCustomParameters({
  prompt: 'consent select_account',
  access_type: 'offline',
});

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let activeGoogleUser: FirebaseUser | null = null;

export const initGmailAuth = (
  onAuthSuccess?: (user: FirebaseUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
    if (user) {
      activeGoogleUser = user;
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      activeGoogleUser = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const connectGmailAccount = async (): Promise<{
  user: FirebaseUser;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const freshProvider = new GoogleAuthProvider();
    freshProvider.addScope('https://mail.google.com/');
    freshProvider.addScope('https://www.googleapis.com/auth/gmail.readonly');
    freshProvider.addScope('https://www.googleapis.com/auth/gmail.send');
    freshProvider.addScope('https://www.googleapis.com/auth/gmail.modify');
    freshProvider.setCustomParameters({
      prompt: 'consent select_account',
      access_type: 'offline',
    });

    const result = await signInWithPopup(auth, freshProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('No access token returned from Google authentication');
    }

    cachedAccessToken = credential.accessToken;
    activeGoogleUser = result.user;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getCachedGmailToken = (): string | null => {
  return cachedAccessToken;
};

export const getActiveGoogleUser = (): FirebaseUser | null => {
  return activeGoogleUser;
};

export const disconnectGmailAccount = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  activeGoogleUser = null;
};
