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
  updateDoc,
  deleteField,
  collection,
  getDocs,
  onSnapshot,
  runTransaction,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import type { AppState, MonthData, AppSettings } from './types';
import { emptyMonthData } from './types';
import { generateId } from './utils';

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
export const budgetDocId: string = (import.meta.env.VITE_BUDGET_ID as string) || 'family';

export function isEmailAllowed(email: string): boolean {
  if (allowedEmails.length === 0) return true;
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
    if (!isEmailAllowed(user.email || '')) {
      await firebaseSignOut(auth);
      throw new Error('ACCESS_DENIED');
    }
    return user;
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'ACCESS_DENIED') {
      throw error;
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

// ─── Sanitization helpers ──────────────────────────────────────
// Ensures data matches current schema (strips old fields, adds new ones)
function sanitizeMonthData(data: Record<string, unknown>): MonthData {
  const d = data as Record<string, unknown>;
  return {
    incomes: (Array.isArray(d.incomes) ? d.incomes : []).map((i: Record<string, unknown>) => ({
      id: (i.id as string) || generateId(),
      name: (i.name as string) || '',
      actual: (i.actual as number) ?? (i.expected as number) ?? 0,
    })),
    debts: (Array.isArray(d.debts) ? d.debts : []).map((dd: Record<string, unknown>) => ({
      id: (dd.id as string) || generateId(),
      name: (dd.name as string) || '',
      actual: (dd.actual as number) ?? (dd.estimated as number) ?? 0,
    })),
    bills: (Array.isArray(d.bills) ? d.bills : []).map((b: Record<string, unknown>) => ({
      id: (b.id as string) || generateId(),
      name: (b.name as string) || '',
      category: (b.category as string) || '',
      actual: (b.actual as number) ?? (b.estimated as number) ?? 0,
    })),
    expenses: (Array.isArray(d.expenses) ? d.expenses : []).map((e: Record<string, unknown>) => ({
      id: (e.id as string) || generateId(),
      name: (e.name as string) || '',
      category: (e.category as string) || '',
      date: (e.date as string) || '',
      amount: (e.amount as number) || 0,
      addedBy: (e.addedBy as string) || '',
    })),
    budgets: Array.isArray(d.budgets) ? d.budgets as MonthData['budgets'] : [],
    savings: (d.savings as MonthData['savings']) || { target: 0, actual: 0 },
    investments: (d.investments as MonthData['investments']) || { target: 0, actual: 0 },
  };
}

// ─── Migration: flat doc → subcollections ──────────────────────
export async function migrateIfNeeded(): Promise<void> {
  if (!db) return;
  const mainRef = doc(db, 'budgets', budgetDocId);
  const mainDoc = await getDoc(mainRef);

  if (!mainDoc.exists()) return;

  const data = mainDoc.data();
  // Old format has months as a top-level field in the main doc
  if (!data.months || typeof data.months !== 'object') return;

  console.log('Migrating data from flat document to subcollections...');
  const batch = writeBatch(db);
  const months = data.months as Record<string, Record<string, unknown>>;

  for (const [monthKey, monthData] of Object.entries(months)) {
    const monthRef = doc(db, 'budgets', budgetDocId, 'months', monthKey);
    batch.set(monthRef, sanitizeMonthData(monthData));
  }

  // Update main doc: remove months field, keep settings + currentYear
  batch.set(mainRef, {
    settings: data.settings || {},
    currentYear: data.currentYear || new Date().getFullYear(),
  });

  await batch.commit();
  console.log('Migration complete!');
}

// ─── Check if initial data setup is needed ─────────────────────
export async function checkInitialSetup(): Promise<boolean> {
  if (!db) return false;
  const mainRef = doc(db, 'budgets', budgetDocId);
  const mainDoc = await getDoc(mainRef);
  return !mainDoc.exists();
}

// ─── Initialize with seed data ─────────────────────────────────
export async function initializeData(state: AppState): Promise<void> {
  if (!db) return;
  const batch = writeBatch(db);

  // Main doc with settings
  const mainRef = doc(db, 'budgets', budgetDocId);
  batch.set(mainRef, {
    settings: state.settings,
    currentYear: state.currentYear,
  });

  // Month subcollection docs
  for (const [key, monthData] of Object.entries(state.months)) {
    const monthRef = doc(db, 'budgets', budgetDocId, 'months', key);
    batch.set(monthRef, JSON.parse(JSON.stringify(monthData)));
  }

  await batch.commit();
}

// ─── Real-time subscriptions ───────────────────────────────────
export function subscribeToSettings(
  callback: (settings: AppSettings | null, currentYear: number) => void
): Unsubscribe {
  if (!db) return () => {};
  const mainRef = doc(db, 'budgets', budgetDocId);
  return onSnapshot(mainRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      callback(
        (data.settings as AppSettings) || null,
        (data.currentYear as number) || new Date().getFullYear()
      );
    } else {
      callback(null, new Date().getFullYear());
    }
  });
}

export function subscribeToMonths(
  callback: (months: Record<string, MonthData>) => void
): Unsubscribe {
  if (!db) return () => {};
  const monthsRef = collection(db, 'budgets', budgetDocId, 'months');
  return onSnapshot(monthsRef, { includeMetadataChanges: true }, (snapshot) => {
    const months: Record<string, MonthData> = {};
    snapshot.forEach((docSnap) => {
      months[docSnap.id] = docSnap.data() as MonthData;
    });
    callback(months);
  });
}

// ─── Granular CRUD operations (transaction-safe) ───────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = any;

export async function addToMonthArray(
  monthKey: string,
  field: string,
  item: AnyRecord
): Promise<void> {
  if (!db) return;
  const monthRef = doc(db, 'budgets', budgetDocId, 'months', monthKey);
  await runTransaction(db, async (transaction) => {
    const monthDoc = await transaction.get(monthRef);
    if (monthDoc.exists()) {
      const data = monthDoc.data();
      const arr = [...(data[field] || []), item];
      transaction.update(monthRef, { [field]: arr });
    } else {
      const empty: AnyRecord = emptyMonthData();
      empty[field] = [item];
      transaction.set(monthRef, empty);
    }
  });
}

export async function updateInMonthArray(
  monthKey: string,
  field: string,
  item: AnyRecord
): Promise<void> {
  if (!db) return;
  const monthRef = doc(db, 'budgets', budgetDocId, 'months', monthKey);
  await runTransaction(db, async (transaction) => {
    const monthDoc = await transaction.get(monthRef);
    if (!monthDoc.exists()) return;
    const data = monthDoc.data();
    const arr = (data[field] || []).map((existing: AnyRecord) =>
      existing.id === item.id ? item : existing
    );
    transaction.update(monthRef, { [field]: arr });
  });
}

export async function deleteFromMonthArray(
  monthKey: string,
  field: string,
  id: string
): Promise<void> {
  if (!db) return;
  const monthRef = doc(db, 'budgets', budgetDocId, 'months', monthKey);
  await runTransaction(db, async (transaction) => {
    const monthDoc = await transaction.get(monthRef);
    if (!monthDoc.exists()) return;
    const data = monthDoc.data();
    const arr = (data[field] || []).filter((existing: AnyRecord) => existing.id !== id);
    transaction.update(monthRef, { [field]: arr });
  });
}

export async function setMonthField(
  monthKey: string,
  field: string,
  value: AnyRecord
): Promise<void> {
  if (!db) return;
  const monthRef = doc(db, 'budgets', budgetDocId, 'months', monthKey);
  await runTransaction(db, async (transaction) => {
    const monthDoc = await transaction.get(monthRef);
    if (monthDoc.exists()) {
      transaction.update(monthRef, { [field]: value });
    } else {
      const empty: AnyRecord = emptyMonthData();
      empty[field] = value;
      transaction.set(monthRef, empty);
    }
  });
}

export async function setMonthData(
  monthKey: string,
  data: MonthData
): Promise<void> {
  if (!db) return;
  const monthRef = doc(db, 'budgets', budgetDocId, 'months', monthKey);
  await setDoc(monthRef, JSON.parse(JSON.stringify(data)));
}

// Copy sections from one month to another (transaction-safe)
export async function copyMonthSections(
  fromKey: string,
  toKey: string,
  sections: string[]
): Promise<void> {
  if (!db) return;
  const fromRef = doc(db, 'budgets', budgetDocId, 'months', fromKey);
  const toRef = doc(db, 'budgets', budgetDocId, 'months', toKey);

  await runTransaction(db, async (transaction) => {
    const fromDoc = await transaction.get(fromRef);
    const toDoc = await transaction.get(toRef);

    if (!fromDoc.exists()) return;
    const prev = fromDoc.data() as MonthData;
    const current = toDoc.exists() ? (toDoc.data() as MonthData) : emptyMonthData();

    if (sections.includes('incomes')) {
      current.incomes = prev.incomes.map((i) => ({ ...i, id: generateId() }));
    }
    if (sections.includes('debts')) {
      current.debts = prev.debts.map((d) => ({ ...d, id: generateId() }));
    }
    if (sections.includes('bills')) {
      current.bills = prev.bills.map((b) => ({ ...b, id: generateId() }));
    }
    if (sections.includes('budgets')) {
      current.budgets = prev.budgets.map((b) => ({ ...b }));
    }
    if (sections.includes('savings')) {
      current.savings = { ...prev.savings };
    }
    if (sections.includes('investments')) {
      current.investments = { ...prev.investments };
    }

    if (toDoc.exists()) {
      transaction.update(toRef, current as AnyRecord);
    } else {
      transaction.set(toRef, current as AnyRecord);
    }
  });
}

// ─── Settings operations ───────────────────────────────────────

export async function saveSettings(
  settings: AppSettings,
  currentYear: number
): Promise<void> {
  if (!db) return;
  const mainRef = doc(db, 'budgets', budgetDocId);
  await setDoc(mainRef, { settings, currentYear }, { merge: true });
}

export async function updateSettingsPartial(
  partial: Partial<AppSettings>
): Promise<void> {
  if (!db) return;
  const mainRef = doc(db, 'budgets', budgetDocId);
  await runTransaction(db, async (transaction) => {
    const docSnap = await transaction.get(mainRef);
    const current = docSnap.exists() ? (docSnap.data().settings || {}) : {};
    transaction.update(mainRef, { settings: { ...current, ...partial } });
  });
}

export async function saveCurrentYear(year: number): Promise<void> {
  if (!db) return;
  const mainRef = doc(db, 'budgets', budgetDocId);
  await updateDoc(mainRef, { currentYear: year });
}

// ─── Bulk operations (import/reset) ────────────────────────────

export async function replaceAllData(state: AppState): Promise<void> {
  if (!db) return;

  // Delete all existing month docs
  const monthsColRef = collection(db, 'budgets', budgetDocId, 'months');
  const existing = await getDocs(monthsColRef);
  const batch = writeBatch(db);
  existing.forEach((docSnap) => batch.delete(docSnap.ref));

  // Add new months (sanitized)
  for (const [key, monthData] of Object.entries(state.months)) {
    const monthRef = doc(db, 'budgets', budgetDocId, 'months', key);
    batch.set(monthRef, JSON.parse(JSON.stringify(sanitizeMonthData(monthData as AnyRecord))));
  }

  // Update settings
  const mainRef = doc(db, 'budgets', budgetDocId);
  batch.set(mainRef, {
    settings: state.settings,
    currentYear: state.currentYear,
  });

  await batch.commit();
}

export async function deleteAllMonths(): Promise<void> {
  if (!db) return;
  const monthsColRef = collection(db, 'budgets', budgetDocId, 'months');
  const snapshot = await getDocs(monthsColRef);
  const batch = writeBatch(db);
  snapshot.forEach((docSnap) => batch.delete(docSnap.ref));
  await batch.commit();
}

// ─── Export/Import ─────────────────────────────────────────────

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
