import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import type { AppState } from './types';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if Firebase is configured
export const isFirebaseConfigured = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_API_KEY !== 'your-api-key'
);

// Allowed emails (comma-separated in env). Empty = allow all.
const allowedEmailsRaw = (import.meta.env.VITE_ALLOWED_EMAILS || '') as string;
export const allowedEmails: string[] = allowedEmailsRaw
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// Shared budget document ID — all allowed users read/write the same doc.
// Falls back to 'family' if not set.
export const budgetDocId: string = (import.meta.env.VITE_BUDGET_ID as string) || 'family';

export function isEmailAllowed(email: string): boolean {
  if (allowedEmails.length === 0) return true; // no whitelist = allow all
  return allowedEmails.includes(email.toLowerCase());
}

let app: ReturnType<typeof initializeApp> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle(): Promise<User | null> {
  if (!auth) return null;
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Enforce email whitelist
    if (!isEmailAllowed(user.email || '')) {
      await firebaseSignOut(auth);
      throw new Error('ACCESS_DENIED');
    }

    return user;
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'ACCESS_DENIED') {
      throw error; // Re-throw so the UI can show a specific message
    }
    console.error('Sign in error:', error);
    return null;
  }
}

export async function signOut(): Promise<void> {
  if (!auth) return;
  await firebaseSignOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

// Firestore persistence
export async function loadAppState(uid: string): Promise<AppState | null> {
  if (!db) return null;
  try {
    const docRef = doc(db, 'budgets', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as AppState;
    }
    return null;
  } catch (error) {
    console.error('Load error:', error);
    return null;
  }
}

export async function saveAppState(uid: string, state: AppState): Promise<void> {
  if (!db) return;
  try {
    const docRef = doc(db, 'budgets', uid);
    await setDoc(docRef, JSON.parse(JSON.stringify(state)));
  } catch (error) {
    console.error('Save error:', error);
  }
}

export function exportData(state: AppState): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `homebudget-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importData(file: File): Promise<AppState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        resolve(data as AppState);
      } catch {
        reject(new Error('Invalid file format'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
