import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { AppState, MonthData, Income, Debt, Bill, Expense, CategoryBudget, SavingsGoal, AppSettings } from './types';
import { emptyMonthData, getMonthKey, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_BILL_CATEGORIES } from './types';
import { generateId } from './utils';
import { saveAppState, loadAppState, budgetDocId } from './firebase';

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
      { id: generateId(), name: 'Заплата Нико', expected: 3619.69, actual: 3619.69 },
      { id: generateId(), name: 'Заплата Михаела', expected: 8501.67, actual: 8501.67 },
      { id: generateId(), name: 'Ваучери Нико', expected: 102.26, actual: 102.26 },
      { id: generateId(), name: 'Ваучери Михаела', expected: 102.26, actual: 102.26 },
    ],
    debts: [
      { id: generateId(), name: 'Mortgage Raya str.', estimated: 289.83, actual: 289.83 },
      { id: generateId(), name: 'Leasing Mazda', estimated: 366.42, actual: 366.42 },
      { id: generateId(), name: 'Mortgage Royal Garden', estimated: 1251.21, actual: 1251.21 },
    ],
    bills: [
      { id: generateId(), name: 'Home cleaning', category: 'Other', estimated: 180, actual: 180 },
      { id: generateId(), name: 'Raya str. Complex Bill', category: 'Other', estimated: 38.36, actual: 38.36 },
      { id: generateId(), name: 'Electricity Raya str.', category: 'Electricity', estimated: 53.02, actual: 53.02 },
      { id: generateId(), name: 'SOT Raya str.', category: 'Other', estimated: 14.4, actual: 14.4 },
      { id: generateId(), name: 'Water Raya str.', category: 'Water', estimated: 15.19, actual: 15.19 },
      { id: generateId(), name: 'Water I. Ivanov bul.', category: 'Water', estimated: 2.59, actual: 2.59 },
      { id: generateId(), name: 'Heating I Ivanov bul.', category: 'Heating', estimated: 82.04, actual: 82.04 },
      { id: generateId(), name: 'Electricity I Ivanov bul.', category: 'Electricity', estimated: 2.33, actual: 2.33 },
      { id: generateId(), name: 'Internet I Ivanov bul.', category: 'Internet', estimated: 14.32, actual: 14.32 },
      { id: generateId(), name: 'Phone Niko', category: 'Phone', estimated: 18.51, actual: 18.51 },
      { id: generateId(), name: 'Internet G. Kondolov str.', category: 'Internet', estimated: 2, actual: 2 },
      { id: generateId(), name: 'Phone Mihaela', category: 'Phone', estimated: 20.9, actual: 20.9 },
      { id: generateId(), name: 'HBO Max', category: 'Services', estimated: 5.32, actual: 5.32 },
      { id: generateId(), name: 'Spotify', category: 'Services', estimated: 9.97, actual: 9.97 },
      { id: generateId(), name: 'Sky', category: 'Services', estimated: 2.99, actual: 2.99 },
      { id: generateId(), name: 'Netflix', category: 'Services', estimated: 9.99, actual: 9.99 },
      { id: generateId(), name: 'OpenAI Mihaela', category: 'Services', estimated: 20.72, actual: 20.72 },
      { id: generateId(), name: 'OpenAI Niko', category: 'Services', estimated: 20.72, actual: 20.72 },
      { id: generateId(), name: 'Revolut Metal', category: 'Services', estimated: 14.99, actual: 14.99 },
      { id: generateId(), name: 'Apple iCloud', category: 'Services', estimated: 2.99, actual: 2.99 },
    ],
    expenses: [
      { id: generateId(), name: 'Lidle', category: 'Groceries', date: '2026-02-01', amount: 200 },
      { id: generateId(), name: 'Leksi', category: 'Groceries', date: '2026-02-03', amount: 100 },
      { id: generateId(), name: 'Shell', category: 'Car', date: '2026-02-04', amount: 120 },
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
  const [state, setState] = useState<AppState>(defaultState);
  const [loading, setLoading] = useState(true);

  const saveTimer = useRef<number>(0);

  // Load from Firestore on mount (shared doc for all users)
  useEffect(() => {
    if (uid) {
      loadAppState(budgetDocId).then((remote) => {
        if (remote) {
          setState(remote);
        } else {
          // First time — seed with sample data and save to Firestore
          const seed = seedFromSpreadsheet();
          setState(seed);
          saveAppState(budgetDocId, seed);
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [uid]);

  // Debounced save to Firestore (shared doc)
  const persist = useCallback((newState: AppState) => {
    if (uid) {
      clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        saveAppState(budgetDocId, newState);
      }, 2000);
    }
  }, [uid]);

  const update = useCallback((fn: (prev: AppState) => AppState) => {
    setState((prev) => {
      const next = fn(prev);
      persist(next);
      return next;
    });
  }, [persist]);

  const ensureMonth = (s: AppState, year: number, month: number): AppState => {
    const key = getMonthKey(year, month);
    if (!s.months[key]) {
      return { ...s, months: { ...s.months, [key]: emptyMonthData() } };
    }
    return s;
  };

  const getMonthData = useCallback((year: number, month: number): MonthData => {
    const key = getMonthKey(year, month);
    return state.months[key] || emptyMonthData();
  }, [state]);

  // Income CRUD
  const addIncome = useCallback((year: number, month: number, income: Omit<Income, 'id'>) => {
    update((s) => {
      s = ensureMonth(s, year, month);
      const key = getMonthKey(year, month);
      const md = { ...s.months[key] };
      md.incomes = [...md.incomes, { ...income, id: generateId() }];
      return { ...s, months: { ...s.months, [key]: md } };
    });
  }, [update]);

  const updateIncome = useCallback((year: number, month: number, income: Income) => {
    update((s) => {
      const key = getMonthKey(year, month);
      const md = { ...s.months[key] };
      md.incomes = md.incomes.map((i) => (i.id === income.id ? income : i));
      return { ...s, months: { ...s.months, [key]: md } };
    });
  }, [update]);

  const deleteIncome = useCallback((year: number, month: number, id: string) => {
    update((s) => {
      const key = getMonthKey(year, month);
      const md = { ...s.months[key] };
      md.incomes = md.incomes.filter((i) => i.id !== id);
      return { ...s, months: { ...s.months, [key]: md } };
    });
  }, [update]);

  // Debt CRUD
  const addDebt = useCallback((year: number, month: number, debt: Omit<Debt, 'id'>) => {
    update((s) => {
      s = ensureMonth(s, year, month);
      const key = getMonthKey(year, month);
      const md = { ...s.months[key] };
      md.debts = [...md.debts, { ...debt, id: generateId() }];
      return { ...s, months: { ...s.months, [key]: md } };
    });
  }, [update]);

  const updateDebt = useCallback((year: number, month: number, debt: Debt) => {
    update((s) => {
      const key = getMonthKey(year, month);
      const md = { ...s.months[key] };
      md.debts = md.debts.map((d) => (d.id === debt.id ? debt : d));
      return { ...s, months: { ...s.months, [key]: md } };
    });
  }, [update]);

  const deleteDebt = useCallback((year: number, month: number, id: string) => {
    update((s) => {
      const key = getMonthKey(year, month);
      const md = { ...s.months[key] };
      md.debts = md.debts.filter((d) => d.id !== id);
      return { ...s, months: { ...s.months, [key]: md } };
    });
  }, [update]);

  // Bill CRUD
  const addBill = useCallback((year: number, month: number, bill: Omit<Bill, 'id'>) => {
    update((s) => {
      s = ensureMonth(s, year, month);
      const key = getMonthKey(year, month);
      const md = { ...s.months[key] };
      md.bills = [...md.bills, { ...bill, id: generateId() }];
      return { ...s, months: { ...s.months, [key]: md } };
    });
  }, [update]);

  const updateBill = useCallback((year: number, month: number, bill: Bill) => {
    update((s) => {
      const key = getMonthKey(year, month);
      const md = { ...s.months[key] };
      md.bills = md.bills.map((b) => (b.id === bill.id ? bill : b));
      return { ...s, months: { ...s.months, [key]: md } };
    });
  }, [update]);

  const deleteBill = useCallback((year: number, month: number, id: string) => {
    update((s) => {
      const key = getMonthKey(year, month);
      const md = { ...s.months[key] };
      md.bills = md.bills.filter((b) => b.id !== id);
      return { ...s, months: { ...s.months, [key]: md } };
    });
  }, [update]);

  // Expense CRUD
  const addExpense = useCallback((year: number, month: number, expense: Omit<Expense, 'id'>) => {
    update((s) => {
      s = ensureMonth(s, year, month);
      const key = getMonthKey(year, month);
      const md = { ...s.months[key] };
      md.expenses = [...md.expenses, { ...expense, id: generateId() }];
      return { ...s, months: { ...s.months, [key]: md } };
    });
  }, [update]);

  const updateExpense = useCallback((year: number, month: number, expense: Expense) => {
    update((s) => {
      const key = getMonthKey(year, month);
      const md = { ...s.months[key] };
      md.expenses = md.expenses.map((e) => (e.id === expense.id ? expense : e));
      return { ...s, months: { ...s.months, [key]: md } };
    });
  }, [update]);

  const deleteExpense = useCallback((year: number, month: number, id: string) => {
    update((s) => {
      const key = getMonthKey(year, month);
      const md = { ...s.months[key] };
      md.expenses = md.expenses.filter((e) => e.id !== id);
      return { ...s, months: { ...s.months, [key]: md } };
    });
  }, [update]);

  // Budgets
  const setBudgets = useCallback((year: number, month: number, budgets: CategoryBudget[]) => {
    update((s) => {
      s = ensureMonth(s, year, month);
      const key = getMonthKey(year, month);
      const md = { ...s.months[key], budgets };
      return { ...s, months: { ...s.months, [key]: md } };
    });
  }, [update]);

  // Savings & Investments
  const setSavings = useCallback((year: number, month: number, savings: SavingsGoal) => {
    update((s) => {
      s = ensureMonth(s, year, month);
      const key = getMonthKey(year, month);
      const md = { ...s.months[key], savings };
      return { ...s, months: { ...s.months, [key]: md } };
    });
  }, [update]);

  const setInvestments = useCallback((year: number, month: number, investments: SavingsGoal) => {
    update((s) => {
      s = ensureMonth(s, year, month);
      const key = getMonthKey(year, month);
      const md = { ...s.months[key], investments };
      return { ...s, months: { ...s.months, [key]: md } };
    });
  }, [update]);

  // Settings
  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    update((s) => ({
      ...s,
      settings: { ...s.settings, ...partial },
    }));
  }, [update]);

  // Copy from previous month
  const copyFromPreviousMonth = useCallback((year: number, month: number, sections: string[]) => {
    update((s) => {
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      const prevKey = getMonthKey(prevYear, prevMonth);
      const prev = s.months[prevKey];
      if (!prev) return s;

      s = ensureMonth(s, year, month);
      const key = getMonthKey(year, month);
      const md = { ...s.months[key] };

      if (sections.includes('incomes')) {
        md.incomes = prev.incomes.map((i) => ({ ...i, id: generateId(), actual: 0 }));
      }
      if (sections.includes('debts')) {
        md.debts = prev.debts.map((d) => ({ ...d, id: generateId(), actual: 0 }));
      }
      if (sections.includes('bills')) {
        md.bills = prev.bills.map((b) => ({ ...b, id: generateId(), actual: 0 }));
      }
      if (sections.includes('budgets')) {
        md.budgets = prev.budgets.map((b) => ({ ...b }));
      }
      if (sections.includes('savings')) {
        md.savings = { target: prev.savings.target, actual: 0 };
      }
      if (sections.includes('investments')) {
        md.investments = { target: prev.investments.target, actual: 0 };
      }

      return { ...s, months: { ...s.months, [key]: md } };
    });
  }, [update]);

  const importState = useCallback((newState: AppState) => {
    setState(newState);
    persist(newState);
  }, [persist]);

  const setCurrentYear = useCallback((year: number) => {
    update((s) => ({ ...s, currentYear: year }));
  }, [update]);

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
        updateSettings, copyFromPreviousMonth,
        importState, setCurrentYear,
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
