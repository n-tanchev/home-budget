import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import type { AppState, MonthData, Income, Debt, Bill, Expense, CategoryBudget, SavingsGoal, AppSettings } from './types';
import { emptyMonthData, getMonthKey, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_BILL_CATEGORIES } from './types';
import { generateId } from './utils';
import {
  migrateIfNeeded,
  checkInitialSetup,
  initializeData,
  subscribeToSettings,
  subscribeToMonths,
  addToMonthArray,
  updateInMonthArray,
  deleteFromMonthArray,
  setMonthField,
  copyMonthSections,
  updateSettingsPartial,
  saveCurrentYear,
  replaceAllData,
  deleteAllMonths,
  saveSettings,
} from './firebase';

const defaultSettings: AppSettings = {
  currency: 'EUR',
  currencySymbol: '€',
  expenseCategories: [...DEFAULT_EXPENSE_CATEGORIES],
  billCategories: [...DEFAULT_BILL_CATEGORIES],
  allowedEmails: [],
};

function defaultState(): AppState {
  return {
    settings: { ...defaultSettings },
    months: {},
    currentYear: new Date().getFullYear(),
  };
}

// Seed data from the user's spreadsheet (February 2026)
function seedFromSpreadsheet(): AppState {
  const state = defaultState();
  const feb = getMonthKey(2026, 2);
  state.months[feb] = {
    incomes: [
      { id: generateId(), name: 'Заплата Нико', actual: 3619.69 },
      { id: generateId(), name: 'Заплата Михаела', actual: 8501.67 },
      { id: generateId(), name: 'Ваучери Нико', actual: 102.26 },
      { id: generateId(), name: 'Ваучери Михаела', actual: 102.26 },
    ],
    debts: [
      { id: generateId(), name: 'Mortgage Raya str.', actual: 289.83 },
      { id: generateId(), name: 'Leasing Mazda', actual: 366.42 },
      { id: generateId(), name: 'Mortgage Royal Garden', actual: 1251.21 },
    ],
    bills: [
      { id: generateId(), name: 'Home cleaning', category: 'Other', actual: 180 },
      { id: generateId(), name: 'Raya str. Complex Bill', category: 'Other', actual: 38.36 },
      { id: generateId(), name: 'Electricity Raya str.', category: 'Electricity', actual: 53.02 },
      { id: generateId(), name: 'SOT Raya str.', category: 'Other', actual: 14.4 },
      { id: generateId(), name: 'Water Raya str.', category: 'Water', actual: 15.19 },
      { id: generateId(), name: 'Water I. Ivanov bul.', category: 'Water', actual: 2.59 },
      { id: generateId(), name: 'Heating I Ivanov bul.', category: 'Heating', actual: 82.04 },
      { id: generateId(), name: 'Electricity I Ivanov bul.', category: 'Electricity', actual: 2.33 },
      { id: generateId(), name: 'Internet I Ivanov bul.', category: 'Internet', actual: 14.32 },
      { id: generateId(), name: 'Phone Niko', category: 'Phone', actual: 18.51 },
      { id: generateId(), name: 'Internet G. Kondolov str.', category: 'Internet', actual: 2 },
      { id: generateId(), name: 'Phone Mihaela', category: 'Phone', actual: 20.9 },
      { id: generateId(), name: 'HBO Max', category: 'Services', actual: 5.32 },
      { id: generateId(), name: 'Spotify', category: 'Services', actual: 9.97 },
      { id: generateId(), name: 'Sky', category: 'Services', actual: 2.99 },
      { id: generateId(), name: 'Netflix', category: 'Services', actual: 9.99 },
      { id: generateId(), name: 'OpenAI Mihaela', category: 'Services', actual: 20.72 },
      { id: generateId(), name: 'OpenAI Niko', category: 'Services', actual: 20.72 },
      { id: generateId(), name: 'Revolut Metal', category: 'Services', actual: 14.99 },
      { id: generateId(), name: 'Apple iCloud', category: 'Services', actual: 2.99 },
    ],
    expenses: [
      { id: generateId(), name: 'Lidle', category: 'Groceries', date: '2026-02-01', amount: 200, addedBy: '' },
      { id: generateId(), name: 'Leksi', category: 'Groceries', date: '2026-02-03', amount: 100, addedBy: '' },
      { id: generateId(), name: 'Shell', category: 'Car', date: '2026-02-04', amount: 120, addedBy: '' },
    ],
    budgets: [
      { category: 'Groceries', budget: 1000 },
      { category: 'Trips', budget: 0 },
      { category: 'Car', budget: 0 },
      { category: 'Shopping', budget: 0 },
      { category: 'Home', budget: 0 },
      { category: 'Clothes', budget: 0 },
      { category: 'Restaurants', budget: 0 },
      { category: 'Fitness', budget: 0 },
      { category: 'Health', budget: 0 },
      { category: 'Hobby', budget: 0 },
      { category: 'Other', budget: 0 },
    ],
    savings: { target: 0, actual: 0 },
    investments: { target: 0, actual: 0 },
  };
  return state;
}

interface StoreContextType {
  state: AppState;
  loading: boolean;
  uid: string | null;
  // Month data
  getMonthData: (year: number, month: number) => MonthData;
  // Income
  addIncome: (year: number, month: number, income: Omit<Income, 'id'>) => void;
  updateIncome: (year: number, month: number, income: Income) => void;
  deleteIncome: (year: number, month: number, id: string) => void;
  // Debt
  addDebt: (year: number, month: number, debt: Omit<Debt, 'id'>) => void;
  updateDebt: (year: number, month: number, debt: Debt) => void;
  deleteDebt: (year: number, month: number, id: string) => void;
  // Bills
  addBill: (year: number, month: number, bill: Omit<Bill, 'id'>) => void;
  updateBill: (year: number, month: number, bill: Bill) => void;
  deleteBill: (year: number, month: number, id: string) => void;
  // Expenses
  addExpense: (year: number, month: number, expense: Omit<Expense, 'id'>) => void;
  updateExpense: (year: number, month: number, expense: Expense) => void;
  deleteExpense: (year: number, month: number, id: string) => void;
  // Budgets
  setBudgets: (year: number, month: number, budgets: CategoryBudget[]) => void;
  // Savings & Investments
  setSavings: (year: number, month: number, savings: SavingsGoal) => void;
  setInvestments: (year: number, month: number, investments: SavingsGoal) => void;
  // Settings
  updateSettings: (settings: Partial<AppSettings>) => void;
  // Copy previous month
  copyFromPreviousMonth: (year: number, month: number, sections: string[]) => void;
  // Import / export
  importState: (newState: AppState) => void;
  // Set year
  setCurrentYear: (year: number) => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children, uid }: { children: React.ReactNode; uid: string | null }) {
  const [settings, setSettings] = useState<AppSettings>({ ...defaultSettings });
  const [months, setMonths] = useState<Record<string, MonthData>>({});
  const [currentYear, setCurrentYearState] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  // Combined state object for compatibility
  const state: AppState = useMemo(() => ({
    settings,
    months,
    currentYear,
  }), [settings, months, currentYear]);

  // Initialize and subscribe to real-time updates
  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    const unsubs: (() => void)[] = [];
    let mounted = true;

    (async () => {
      try {
        // Step 1: Migrate old format if needed
        await migrateIfNeeded();

        // Step 2: Check if initial setup is needed (new user/family)
        const needsSetup = await checkInitialSetup();
        if (needsSetup) {
          const seed = seedFromSpreadsheet();
          await initializeData(seed);
        }

        if (!mounted) return;

        // Step 3: Subscribe to real-time updates
        let settingsReady = false;
        let monthsReady = false;
        const checkReady = () => {
          if (settingsReady && monthsReady && mounted) {
            setLoading(false);
          }
        };

        unsubs.push(subscribeToSettings((s, y) => {
          if (!mounted) return;
          if (s) setSettings(s);
          setCurrentYearState(y);
          settingsReady = true;
          checkReady();
        }));

        unsubs.push(subscribeToMonths((m) => {
          if (!mounted) return;
          setMonths(m);
          monthsReady = true;
          checkReady();
        }));
      } catch (err) {
        console.error('Store initialization error:', err);
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      unsubs.forEach((u) => u());
    };
  }, [uid]);

  const getMonthData = useCallback((year: number, month: number): MonthData => {
    const key = getMonthKey(year, month);
    return months[key] || emptyMonthData();
  }, [months]);

  // ─── Income CRUD ──────────────────────────────────────────────
  const addIncome = useCallback((year: number, month: number, income: Omit<Income, 'id'>) => {
    const key = getMonthKey(year, month);
    addToMonthArray(key, 'incomes', { ...income, id: generateId() });
  }, []);

  const updateIncome = useCallback((year: number, month: number, income: Income) => {
    const key = getMonthKey(year, month);
    updateInMonthArray(key, 'incomes', { ...income });
  }, []);

  const deleteIncome = useCallback((year: number, month: number, id: string) => {
    const key = getMonthKey(year, month);
    deleteFromMonthArray(key, 'incomes', id);
  }, []);

  // ─── Debt CRUD ────────────────────────────────────────────────
  const addDebt = useCallback((year: number, month: number, debt: Omit<Debt, 'id'>) => {
    const key = getMonthKey(year, month);
    addToMonthArray(key, 'debts', { ...debt, id: generateId() });
  }, []);

  const updateDebt = useCallback((year: number, month: number, debt: Debt) => {
    const key = getMonthKey(year, month);
    updateInMonthArray(key, 'debts', { ...debt });
  }, []);

  const deleteDebt = useCallback((year: number, month: number, id: string) => {
    const key = getMonthKey(year, month);
    deleteFromMonthArray(key, 'debts', id);
  }, []);

  // ─── Bill CRUD ────────────────────────────────────────────────
  const addBill = useCallback((year: number, month: number, bill: Omit<Bill, 'id'>) => {
    const key = getMonthKey(year, month);
    addToMonthArray(key, 'bills', { ...bill, id: generateId() });
  }, []);

  const updateBill = useCallback((year: number, month: number, bill: Bill) => {
    const key = getMonthKey(year, month);
    updateInMonthArray(key, 'bills', { ...bill });
  }, []);

  const deleteBill = useCallback((year: number, month: number, id: string) => {
    const key = getMonthKey(year, month);
    deleteFromMonthArray(key, 'bills', id);
  }, []);

  // ─── Expense CRUD ─────────────────────────────────────────────
  const addExpense = useCallback((year: number, month: number, expense: Omit<Expense, 'id'>) => {
    const key = getMonthKey(year, month);
    addToMonthArray(key, 'expenses', { ...expense, id: generateId() });
  }, []);

  const updateExpense = useCallback((year: number, month: number, expense: Expense) => {
    const key = getMonthKey(year, month);
    updateInMonthArray(key, 'expenses', { ...expense });
  }, []);

  const deleteExpense = useCallback((year: number, month: number, id: string) => {
    const key = getMonthKey(year, month);
    deleteFromMonthArray(key, 'expenses', id);
  }, []);

  // ─── Budgets ──────────────────────────────────────────────────
  const setBudgets = useCallback((year: number, month: number, budgets: CategoryBudget[]) => {
    const key = getMonthKey(year, month);
    setMonthField(key, 'budgets', budgets);
  }, []);

  // ─── Savings & Investments ────────────────────────────────────
  const setSavings = useCallback((year: number, month: number, savings: SavingsGoal) => {
    const key = getMonthKey(year, month);
    setMonthField(key, 'savings', savings);
  }, []);

  const setInvestments = useCallback((year: number, month: number, investments: SavingsGoal) => {
    const key = getMonthKey(year, month);
    setMonthField(key, 'investments', investments);
  }, []);

  // ─── Settings ─────────────────────────────────────────────────
  const updateSettingsFn = useCallback((partial: Partial<AppSettings>) => {
    updateSettingsPartial(partial);
  }, []);

  // ─── Copy from previous month ────────────────────────────────
  const copyFromPreviousMonth = useCallback(async (year: number, month: number, sections: string[]) => {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevKey = getMonthKey(prevYear, prevMonth);
    const currentKey = getMonthKey(year, month);
    await copyMonthSections(prevKey, currentKey, sections);
  }, []);

  // ─── Import / Reset ──────────────────────────────────────────
  const importState = useCallback((newState: AppState) => {
    replaceAllData(newState);
  }, []);

  // ─── Set current year ─────────────────────────────────────────
  const setCurrentYearFn = useCallback((year: number) => {
    saveCurrentYear(year);
  }, []);

  return (
    <StoreContext.Provider
      value={{
        state,
        loading,
        uid,
        getMonthData,
        addIncome, updateIncome, deleteIncome,
        addDebt, updateDebt, deleteDebt,
        addBill, updateBill, deleteBill,
        addExpense, updateExpense, deleteExpense,
        setBudgets, setSavings, setInvestments,
        updateSettings: updateSettingsFn, copyFromPreviousMonth,
        importState, setCurrentYear: setCurrentYearFn,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextType {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
