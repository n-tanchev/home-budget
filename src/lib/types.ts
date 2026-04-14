export interface Income {
  id: string;
  name: string;
  actual: number;
}

export interface Debt {
  id: string;
  name: string;
  actual: number;
}

export interface Bill {
  id: string;
  name: string;
  category: string;
  actual: number;
}

export interface Expense {
  id: string;
  name: string;
  category: string;
  date: string; // YYYY-MM-DD
  amount: number;
  addedBy: string; // user email who added this expense
}

export interface CategoryBudget {
  category: string;
  budget: number;
}

export interface SavingsGoal {
  target: number;
  actual: number;
}

export interface MonthData {
  incomes: Income[];
  debts: Debt[];
  bills: Bill[];
  expenses: Expense[];
  budgets: CategoryBudget[];
  savings: SavingsGoal;
  investments: SavingsGoal;
}

export interface AppSettings {
  currency: string;
  currencySymbol: string;
  expenseCategories: string[];
  billCategories: string[];
  allowedEmails: string[];
}

export interface AppState {
  settings: AppSettings;
  months: Record<string, MonthData>; // key: "2026-02"
  currentYear: number;
}

export interface UserInfo {
  email: string;
  displayName: string;
  photoURL: string | null;
  uid: string;
}

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Groceries', 'Trips', 'Car', 'Shopping', 'Home', 'Clothes',
  'Restaurants', 'Fitness', 'Health', 'Hobby', 'Other',
];

export const DEFAULT_BILL_CATEGORIES = [
  'Electricity', 'Heating', 'Internet', 'Phone', 'Water', 'Services', 'Other',
];

export function emptyMonthData(): MonthData {
  return {
    incomes: [],
    debts: [],
    bills: [],
    expenses: [],
    budgets: [],
    savings: { target: 0, actual: 0 },
    investments: { target: 0, actual: 0 },
  };
}

export function getMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}
