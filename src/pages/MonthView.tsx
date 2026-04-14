import { useState, useMemo, useRef, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { type Income, type Debt, type Bill, type Expense, type CategoryBudget, type MonthData } from '@/lib/types';
import { useI18n, useMonthNames } from '@/lib/i18n';
import { formatCurrency, getCategoryColor, cn } from '@/lib/utils';
import {
  ChevronLeft, ChevronRight, Trash2, Copy, X,
  TrendingUp, TrendingDown, CreditCard, FileText, PiggyBank, Landmark,
  ShoppingCart, ChevronDown, ChevronUp, Save, AlertTriangle, Users, Pencil,
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface Props {
  year: number;
  month: number;
  onMonthChange: (m: number) => void;
  onYearChange: (y: number) => void;
  userEmail: string;
}

// ─── Generic Modal ──────────────────────────────────────────────
function Modal({ open, onClose, title, children }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-card border border-border rounded-t-2xl sm:rounded-2xl p-6 max-h-[85vh] overflow-y-auto animate-fade-in shadow-2xl"
      >
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Confirm Delete Dialog ─────────────────────────────────────
function ConfirmDialog({ open, onClose, onConfirm, title, message }: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}) {
  const { t } = useI18n();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 animate-fade-in shadow-2xl mx-4"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-destructive" />
          </div>
          <h2 className="text-lg font-bold">{title}</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors">
            {t('common.cancel')}
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className="px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors"
          >
            {t('common.delete')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Collapsible Section with localStorage persistence ─────────
function Section({ id, title, icon: Icon, iconColor, count, children, defaultOpen = true }: {
  id: string;
  title: string;
  icon: React.ElementType;
  iconColor: string;
  count?: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(() => {
    const stored = localStorage.getItem(`section-${id}`);
    if (stored !== null) return stored === 'true';
    return defaultOpen;
  });

  const toggle = () => {
    const next = !open;
    setOpen(next);
    localStorage.setItem(`section-${id}`, String(next));
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        onClick={toggle}
        className="w-full flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors"
      >
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', iconColor)}>
          <Icon size={16} className="text-white" />
        </div>
        <span className="font-semibold flex-1 text-left">{title}</span>
        {count !== undefined && (
          <span className="text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">{count}</span>
        )}
        {open ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
      </button>
      {open && <div className="border-t border-border">{children}</div>}
    </div>
  );
}

// ─── Date format helper (DD.MM) ────────────────────────────────
function formatDateBg(dateStr: string): string {
  if (!dateStr || dateStr.length < 10) return dateStr;
  const [, m, d] = dateStr.split('-');
  return `${d}.${m}`;
}

// ─── Inline cell styling (table-like) ──────────────────────────
const cellBase = 'w-full h-9 px-2.5 text-sm bg-transparent rounded-none focus:outline-none focus:ring-2 focus:ring-ring/20 focus:ring-inset focus:bg-background/80 transition-colors';

// Fixed grid templates — same constant used in row component + section header + add row
const gridSimple = 'grid-cols-[1fr_120px_36px]';
const gridBill = 'grid-cols-[1fr_120px_120px_36px]';
const gridExpense = 'grid-cols-[1fr_120px_140px_120px_36px]';

// ─── Editable row: Income / Debt (name + amount) ───────────────
function EditableSimpleRow({ item, onUpdate, onDelete, onEnter, listId, color }: {
  item: { id: string; name: string; actual: number };
  onUpdate: (updated: { id: string; name: string; actual: number }) => void;
  onDelete: () => void;
  onEnter: () => void;
  listId: string;
  color: string;
}) {
  const [name, setName] = useState(item.name);
  const [actual, setActual] = useState(item.actual ? String(item.actual) : '');
  const amountRef = useRef<HTMLInputElement>(null);

  const save = () => {
    const n = name.trim();
    const a = Number(actual) || 0;
    if (n !== item.name || a !== item.actual) {
      onUpdate({ id: item.id, name: n, actual: a });
    }
  };

  return (
    <div className={cn('grid items-center', gridSimple)}>
      <input
        value={name} onChange={(e) => setName(e.target.value)} onBlur={save}
        list={listId} className={cellBase}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); amountRef.current?.focus(); } }}
      />
      <input
        ref={amountRef} type="number" step="0.01" value={actual}
        onChange={(e) => setActual(e.target.value)} onBlur={save}
        className={cn(cellBase, 'text-right mono font-semibold border-l border-border', color)} placeholder="0"
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save(); onEnter(); } }}
      />
      <button onClick={onDelete} className="h-9 w-full flex items-center justify-center border-l border-border hover:bg-destructive/10 transition-colors">
        <Trash2 size={14} className="text-destructive" />
      </button>
    </div>
  );
}

// ─── Editable row: Bill (name + category + amount) ─────────────
function EditableBillRow({ item, onUpdate, onDelete, onEnter, listId, categories, color }: {
  item: Bill;
  onUpdate: (updated: Bill) => void;
  onDelete: () => void;
  onEnter: () => void;
  listId: string;
  categories: string[];
  color: string;
}) {
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category);
  const [actual, setActual] = useState(item.actual ? String(item.actual) : '');
  const catRef = useRef<HTMLSelectElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  const save = () => {
    const n = name.trim();
    const a = Number(actual) || 0;
    if (n !== item.name || category !== item.category || a !== item.actual) {
      onUpdate({ ...item, name: n, category, actual: a });
    }
  };

  return (
    <div className={cn('grid items-center', gridBill)}>
      <input
        value={name} onChange={(e) => setName(e.target.value)} onBlur={save}
        list={listId} className={cellBase}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); catRef.current?.focus(); } }}
      />
      <select
        ref={catRef} value={category}
        onChange={(e) => { setCategory(e.target.value); }}
        onBlur={save}
        className={cn(cellBase, 'text-xs cursor-pointer border-l border-border')}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); amountRef.current?.focus(); } }}
      >
        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <input
        ref={amountRef} type="number" step="0.01" value={actual}
        onChange={(e) => setActual(e.target.value)} onBlur={save}
        className={cn(cellBase, 'text-right mono font-semibold border-l border-border', color)} placeholder="0"
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save(); onEnter(); } }}
      />
      <button onClick={onDelete} className="h-9 w-full flex items-center justify-center border-l border-border hover:bg-destructive/10 transition-colors">
        <Trash2 size={14} className="text-destructive" />
      </button>
    </div>
  );
}

// ─── Editable row: Expense (name + category + date + amount) ───
function EditableExpenseRow({ item, onUpdate, onDelete, onEnter, listId, categories, color }: {
  item: Expense;
  onUpdate: (updated: Expense) => void;
  onDelete: () => void;
  onEnter: () => void;
  listId: string;
  categories: string[];
  color: string;
}) {
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category);
  const [date, setDate] = useState(item.date);
  const [amount, setAmount] = useState(item.amount ? String(item.amount) : '');
  const catRef = useRef<HTMLSelectElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  const save = () => {
    const n = name.trim();
    const a = Number(amount) || 0;
    if (n !== item.name || category !== item.category || date !== item.date || a !== item.amount) {
      onUpdate({ ...item, name: n, category, date, amount: a });
    }
  };

  return (
    <div className={cn('grid items-center', gridExpense)}>
      <div className="flex items-center h-9">
        <input
          value={name} onChange={(e) => setName(e.target.value)} onBlur={save}
          list={listId} className={cn(cellBase, 'min-w-0')}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); catRef.current?.focus(); } }}
        />
        {item.addedBy && (
          <span className="text-[10px] text-muted-foreground/60 px-1.5 flex-shrink-0 truncate max-w-[60px]">{item.addedBy.split('@')[0]}</span>
        )}
      </div>
      <select
        ref={catRef} value={category}
        onChange={(e) => { setCategory(e.target.value); }}
        onBlur={save}
        className={cn(cellBase, 'text-xs cursor-pointer border-l border-border')}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); dateRef.current?.focus(); } }}
      >
        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <input
        ref={dateRef} type="date" value={date}
        onChange={(e) => setDate(e.target.value)} onBlur={save}
        className={cn(cellBase, 'text-xs mono border-l border-border')}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); amountRef.current?.focus(); } }}
      />
      <input
        ref={amountRef} type="number" step="0.01" value={amount}
        onChange={(e) => setAmount(e.target.value)} onBlur={save}
        className={cn(cellBase, 'text-right mono font-semibold border-l border-border', color)} placeholder="0"
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save(); onEnter(); } }}
      />
      <button onClick={onDelete} className="h-9 w-full flex items-center justify-center border-l border-border hover:bg-destructive/10 transition-colors">
        <Trash2 size={14} className="text-destructive" />
      </button>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────
export default function MonthView({ year, month, onMonthChange, onYearChange, userEmail }: Props) {
  const store = useStore();
  const { t } = useI18n();
  const { months } = useMonthNames();
  const md = store.getMonthData(year, month);
  const sym = store.state.settings.currencySymbol;
  const expCats = store.state.settings.expenseCategories;
  const billCats = store.state.settings.billCategories;

  // ─── Optimistic items (shown until Firebase confirms) ───────
  const [optimistic, setOptimistic] = useState<{
    incomes: Income[]; debts: Debt[]; bills: Bill[]; expenses: Expense[];
  }>({ incomes: [], debts: [], bills: [], expenses: [] });

  useEffect(() => {
    setOptimistic({ incomes: [], debts: [], bills: [], expenses: [] });
  }, [md]);

  // ─── Copy modal state ───────────────────────────────────────
  const [showCopy, setShowCopy] = useState(false);
  const [copySections, setCopySections] = useState<string[]>(['incomes', 'debts', 'bills', 'budgets', 'savings', 'investments']);

  // ─── Delete confirmation ────────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'income' | 'debt' | 'bill' | 'expense';
    id: string;
    name: string;
  } | null>(null);

  const handleDeleteConfirm = () => {
    if (!deleteConfirm) return;
    const { type, id } = deleteConfirm;
    if (type === 'income') store.deleteIncome(year, month, id);
    else if (type === 'debt') store.deleteDebt(year, month, id);
    else if (type === 'bill') store.deleteBill(year, month, id);
    else if (type === 'expense') store.deleteExpense(year, month, id);
    setDeleteConfirm(null);
  };

  // ─── Suggestions from all months ────────────────────────────
  const suggestions = useMemo(() => {
    const incomeMap = new Map<string, number>();
    const debtMap = new Map<string, number>();
    const billMap = new Map<string, { category: string; actual: number }>();
    const expenseMap = new Map<string, { category: string; amount: number }>();

    Object.values(store.state.months).forEach((m: MonthData) => {
      m.incomes.forEach((i) => { if (i.name) incomeMap.set(i.name, i.actual); });
      m.debts.forEach((d) => { if (d.name) debtMap.set(d.name, d.actual); });
      m.bills.forEach((b) => { if (b.name) billMap.set(b.name, { category: b.category, actual: b.actual }); });
      m.expenses.forEach((e) => { if (e.name) expenseMap.set(e.name, { category: e.category, amount: e.amount }); });
    });

    return { incomeMap, debtMap, billMap, expenseMap };
  }, [store.state.months]);

  // ─── Add row state ──────────────────────────────────────────
  const todayStr = `${year}-${String(month).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;

  const [newIncome, setNewIncome] = useState({ name: '', actual: '' });
  const [newDebt, setNewDebt] = useState({ name: '', actual: '' });
  const [newBill, setNewBill] = useState({ name: '', category: billCats[0] || '', actual: '' });
  const [newExpense, setNewExpense] = useState({ name: '', category: expCats[0] || '', date: todayStr, amount: '' });

  // Refs for focusing add rows
  const addIncomeNameRef = useRef<HTMLInputElement>(null);
  const addIncomeAmountRef = useRef<HTMLInputElement>(null);
  const addDebtNameRef = useRef<HTMLInputElement>(null);
  const addDebtAmountRef = useRef<HTMLInputElement>(null);
  const addBillNameRef = useRef<HTMLInputElement>(null);
  const addBillCatRef = useRef<HTMLSelectElement>(null);
  const addBillAmountRef = useRef<HTMLInputElement>(null);
  const addExpenseNameRef = useRef<HTMLInputElement>(null);
  const addExpenseCatRef = useRef<HTMLSelectElement>(null);
  const addExpenseDateRef = useRef<HTMLInputElement>(null);
  const addExpenseAmountRef = useRef<HTMLInputElement>(null);

  // ─── Add row name change handlers (autosuggest values) ──────
  const handleNewIncomeNameChange = (name: string) => {
    setNewIncome((prev) => {
      const next = { ...prev, name };
      const match = suggestions.incomeMap.get(name);
      if (match !== undefined && !prev.actual) next.actual = String(match);
      return next;
    });
  };

  const handleNewDebtNameChange = (name: string) => {
    setNewDebt((prev) => {
      const next = { ...prev, name };
      const match = suggestions.debtMap.get(name);
      if (match !== undefined && !prev.actual) next.actual = String(match);
      return next;
    });
  };

  const handleNewBillNameChange = (name: string) => {
    setNewBill((prev) => {
      const next = { ...prev, name };
      const match = suggestions.billMap.get(name);
      if (match !== undefined) {
        if (!prev.actual) next.actual = String(match.actual);
        if (prev.category === (billCats[0] || '')) next.category = match.category;
      }
      return next;
    });
  };

  const handleNewExpenseNameChange = (name: string) => {
    setNewExpense((prev) => {
      const next = { ...prev, name };
      const match = suggestions.expenseMap.get(name);
      if (match !== undefined) {
        if (!prev.amount) next.amount = String(match.amount);
        if (prev.category === (expCats[0] || '')) next.category = match.category;
      }
      return next;
    });
  };

  // ─── Save new row handlers (with optimistic rendering) ──────
  const saveNewIncome = () => {
    const n = newIncome.name.trim();
    if (!n) return;
    const a = Number(newIncome.actual) || 0;
    setOptimistic((prev) => ({ ...prev, incomes: [...prev.incomes, { id: `opt-${Date.now()}`, name: n, actual: a }] }));
    store.addIncome(year, month, { name: n, actual: a });
    setNewIncome({ name: '', actual: '' });
  };

  const saveNewDebt = () => {
    const n = newDebt.name.trim();
    if (!n) return;
    const a = Number(newDebt.actual) || 0;
    setOptimistic((prev) => ({ ...prev, debts: [...prev.debts, { id: `opt-${Date.now()}`, name: n, actual: a }] }));
    store.addDebt(year, month, { name: n, actual: a });
    setNewDebt({ name: '', actual: '' });
  };

  const saveNewBill = () => {
    const n = newBill.name.trim();
    if (!n) return;
    const a = Number(newBill.actual) || 0;
    const item: Bill = { id: `opt-${Date.now()}`, name: n, category: newBill.category, actual: a };
    setOptimistic((prev) => ({ ...prev, bills: [...prev.bills, item] }));
    store.addBill(year, month, { name: n, category: newBill.category, actual: a });
    setNewBill({ name: '', category: billCats[0] || '', actual: '' });
  };

  const saveNewExpense = () => {
    const n = newExpense.name.trim();
    if (!n) return;
    const a = Number(newExpense.amount) || 0;
    const item: Expense = { id: `opt-${Date.now()}`, name: n, category: newExpense.category, date: newExpense.date, amount: a, addedBy: userEmail };
    setOptimistic((prev) => ({ ...prev, expenses: [...prev.expenses, item] }));
    store.addExpense(year, month, { name: n, category: newExpense.category, date: newExpense.date, amount: a, addedBy: userEmail });
    setNewExpense({ name: '', category: expCats[0] || '', date: todayStr, amount: '' });
  };

  // ─── Budgets inline editing ─────────────────────────────────
  const [editingBudgets, setEditingBudgets] = useState(false);
  const [budgetValues, setBudgetValues] = useState<Record<string, number>>({});

  const startEditBudgets = () => {
    const vals: Record<string, number> = {};
    expCats.forEach((cat) => {
      const existing = md.budgets.find((b) => b.category === cat);
      vals[cat] = existing?.budget || 0;
    });
    setBudgetValues(vals);
    setEditingBudgets(true);
  };

  const saveBudgets = () => {
    const budgets: CategoryBudget[] = Object.entries(budgetValues).map(([category, budget]) => ({ category, budget }));
    store.setBudgets(year, month, budgets);
    setEditingBudgets(false);
  };

  // ─── Savings/Investments inline ─────────────────────────────
  const [editSavings, setEditSavings] = useState(false);
  const [savingsTarget, setSavingsTarget] = useState(String(md.savings.target));
  const [savingsActual, setSavingsActual] = useState(String(md.savings.actual));
  const [editInvest, setEditInvest] = useState(false);
  const [investTarget, setInvestTarget] = useState(String(md.investments.target));
  const [investActual, setInvestActual] = useState(String(md.investments.actual));

  // ─── Computed ───────────────────────────────────────────────
  const totalIncome = md.incomes.reduce((s, i) => s + i.actual, 0);
  const totalExpense = md.expenses.reduce((s, e) => s + e.amount, 0);
  const totalBills = md.bills.reduce((s, b) => s + b.actual, 0);
  const totalDebt = md.debts.reduce((s, d) => s + d.actual, 0);
  const totalOut = totalExpense + totalBills + totalDebt + md.savings.actual + md.investments.actual;
  const netBalance = totalIncome - totalOut;

  // ─── Chart user filter ────────────────────────────────────────
  const [chartFilterUser, setChartFilterUser] = useState('');

  const chartUsers = useMemo(() => {
    const users = new Set<string>();
    md.expenses.forEach((e) => { if (e.addedBy) users.add(e.addedBy); });
    return [...users].sort();
  }, [md.expenses]);

  const chartExpenses = useMemo(() => {
    return chartFilterUser ? md.expenses.filter((e) => e.addedBy === chartFilterUser) : md.expenses;
  }, [md.expenses, chartFilterUser]);

  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    chartExpenses.forEach((e) => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map)
      .map(([cat, amount]) => ({ category: cat, amount, color: getCategoryColor(expCats.indexOf(cat)) }))
      .sort((a, b) => b.amount - a.amount);
  }, [chartExpenses, expCats]);

  const budgetComparison = useMemo(() => {
    return expCats.map((cat) => {
      const budget = md.budgets.find((b) => b.category === cat)?.budget || 0;
      const spent = chartExpenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0);
      return { category: cat, budget, spent, diff: budget - spent, color: getCategoryColor(expCats.indexOf(cat)) };
    }).filter((b) => b.budget > 0 || b.spent > 0);
  }, [md.budgets, chartExpenses, expCats]);

  const expensesByUser = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    md.expenses.forEach((e) => {
      const key = e.addedBy || '';
      if (!map[key]) map[key] = { count: 0, total: 0 };
      map[key].count++;
      map[key].total += e.amount;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [md.expenses]);

  // ─── Month navigation ──────────────────────────────────────
  const changeMonth = (dir: number) => {
    let m = month + dir;
    let y = year;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    onMonthChange(m);
    if (y !== year) onYearChange(y);
  };

  const inputClass = 'w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm';
  const labelClass = 'text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block';

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Datalists for autosuggest */}
      <datalist id="income-suggestions">
        {[...suggestions.incomeMap.keys()].map((n) => <option key={n} value={n} />)}
      </datalist>
      <datalist id="debt-suggestions">
        {[...suggestions.debtMap.keys()].map((n) => <option key={n} value={n} />)}
      </datalist>
      <datalist id="bill-suggestions">
        {[...suggestions.billMap.keys()].map((n) => <option key={n} value={n} />)}
      </datalist>
      <datalist id="expense-suggestions">
        {[...suggestions.expenseMap.keys()].map((n) => <option key={n} value={n} />)}
      </datalist>

      {/* Month header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => changeMonth(-1)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <ChevronLeft size={18} />
          </button>
          <div className="text-center min-w-[160px]">
            <h1 className="text-xl font-bold">{months[month - 1]} {year}</h1>
          </div>
          <button onClick={() => changeMonth(1)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>
        <button
          onClick={() => setShowCopy(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border hover:bg-secondary text-sm font-medium transition-colors"
        >
          <Copy size={14} /> {t('month.copyFromPrevious')}
        </button>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { label: t('month.incomeTitle'), value: totalIncome, color: 'text-emerald-500' },
          { label: t('month.expensesTitle'), value: totalExpense, color: 'text-red-500' },
          { label: t('month.billsTitle'), value: totalBills, color: 'text-amber-500' },
          { label: t('month.debtTitle'), value: totalDebt, color: 'text-orange-500' },
          { label: t('dashboard.net'), value: netBalance, color: netBalance >= 0 ? 'text-primary' : 'text-red-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">{label}</div>
            <div className={cn('text-sm font-bold mono', color)}>{formatCurrency(value, sym)}</div>
          </div>
        ))}
      </div>

      {/* ─── INCOME ─── */}
      <Section id="income" title={t('month.incomeTitle')} icon={TrendingUp} iconColor="bg-emerald-500" count={md.incomes.length}>
        <div className="divide-y divide-border">
          <div className={cn('grid', gridSimple, 'bg-muted/50')}>
            <div className="h-8 px-2.5 flex items-center text-xs font-semibold text-muted-foreground">{t('common.name')}</div>
            <div className="h-8 px-2.5 flex items-center justify-end text-xs font-semibold text-muted-foreground border-l border-border">{t('month.amount')}</div>
            <div className="h-8 border-l border-border" />
          </div>
          {[...md.incomes, ...optimistic.incomes].map((inc) => (
            <EditableSimpleRow
              key={inc.id}
              item={inc}
              onUpdate={(updated) => store.updateIncome(year, month, updated as Income)}
              onDelete={() => setDeleteConfirm({ type: 'income', id: inc.id, name: inc.name })}
              onEnter={() => addIncomeNameRef.current?.focus()}
              listId="income-suggestions"
              color="text-emerald-500"
            />
          ))}
          <div
            className={cn('grid items-center', gridSimple, 'bg-muted/10')}
            onBlur={(e) => {
              if (e.currentTarget.contains(e.relatedTarget as Node)) return;
              if (newIncome.name.trim()) saveNewIncome();
            }}
          >
            <input
              ref={addIncomeNameRef}
              value={newIncome.name}
              onChange={(e) => handleNewIncomeNameChange(e.target.value)}
              list="income-suggestions"
              className={cn(cellBase, 'placeholder:text-muted-foreground/40')}
              placeholder={t('month.namePlaceholder')}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addIncomeAmountRef.current?.focus(); } }}
            />
            <input
              ref={addIncomeAmountRef}
              type="number" step="0.01"
              value={newIncome.actual}
              onChange={(e) => setNewIncome((prev) => ({ ...prev, actual: e.target.value }))}
              className={cn(cellBase, 'text-right mono font-semibold text-emerald-500 border-l border-border placeholder:text-muted-foreground/40')}
              placeholder="0"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  saveNewIncome();
                  setTimeout(() => addIncomeNameRef.current?.focus(), 50);
                }
              }}
            />
            <div className="h-9 border-l border-border" />
          </div>
          <div className="h-9 flex items-center justify-end px-2.5 bg-muted/30">
            <div className="text-sm font-bold mono text-emerald-500">{formatCurrency(totalIncome, sym)}</div>
          </div>
        </div>
      </Section>

      {/* ─── DEBT ─── */}
      <Section id="debt" title={t('month.debtTitle')} icon={CreditCard} iconColor="bg-orange-500" count={md.debts.length}>
        <div className="divide-y divide-border">
          <div className={cn('grid', gridSimple, 'bg-muted/50')}>
            <div className="h-8 px-2.5 flex items-center text-xs font-semibold text-muted-foreground">{t('common.name')}</div>
            <div className="h-8 px-2.5 flex items-center justify-end text-xs font-semibold text-muted-foreground border-l border-border">{t('month.amount')}</div>
            <div className="h-8 border-l border-border" />
          </div>
          {[...md.debts, ...optimistic.debts].map((d) => (
            <EditableSimpleRow
              key={d.id}
              item={d}
              onUpdate={(updated) => store.updateDebt(year, month, updated as Debt)}
              onDelete={() => setDeleteConfirm({ type: 'debt', id: d.id, name: d.name })}
              onEnter={() => addDebtNameRef.current?.focus()}
              listId="debt-suggestions"
              color="text-orange-500"
            />
          ))}
          <div
            className={cn('grid items-center', gridSimple, 'bg-muted/10')}
            onBlur={(e) => {
              if (e.currentTarget.contains(e.relatedTarget as Node)) return;
              if (newDebt.name.trim()) saveNewDebt();
            }}
          >
            <input
              ref={addDebtNameRef}
              value={newDebt.name}
              onChange={(e) => handleNewDebtNameChange(e.target.value)}
              list="debt-suggestions"
              className={cn(cellBase, 'placeholder:text-muted-foreground/40')}
              placeholder={t('month.namePlaceholder')}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDebtAmountRef.current?.focus(); } }}
            />
            <input
              ref={addDebtAmountRef}
              type="number" step="0.01"
              value={newDebt.actual}
              onChange={(e) => setNewDebt((prev) => ({ ...prev, actual: e.target.value }))}
              className={cn(cellBase, 'text-right mono font-semibold text-orange-500 border-l border-border placeholder:text-muted-foreground/40')}
              placeholder="0"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  saveNewDebt();
                  setTimeout(() => addDebtNameRef.current?.focus(), 50);
                }
              }}
            />
            <div className="h-9 border-l border-border" />
          </div>
          <div className="h-9 flex items-center justify-end px-2.5 bg-muted/30">
            <div className="text-sm font-bold mono text-orange-500">{formatCurrency(totalDebt, sym)}</div>
          </div>
        </div>
      </Section>

      {/* ─── BILLS ─── */}
      <Section id="bills" title={t('month.billsTitle')} icon={FileText} iconColor="bg-amber-500" count={md.bills.length}>
        <div className="divide-y divide-border">
          <div className={cn('grid', gridBill, 'bg-muted/50')}>
            <div className="h-8 px-2.5 flex items-center text-xs font-semibold text-muted-foreground">{t('common.name')}</div>
            <div className="h-8 px-2.5 flex items-center text-xs font-semibold text-muted-foreground border-l border-border">{t('month.category')}</div>
            <div className="h-8 px-2.5 flex items-center justify-end text-xs font-semibold text-muted-foreground border-l border-border">{t('month.amount')}</div>
            <div className="h-8 border-l border-border" />
          </div>
          {[...md.bills, ...optimistic.bills].map((b) => (
            <EditableBillRow
              key={b.id}
              item={b}
              onUpdate={(updated) => store.updateBill(year, month, updated)}
              onDelete={() => setDeleteConfirm({ type: 'bill', id: b.id, name: b.name })}
              onEnter={() => addBillNameRef.current?.focus()}
              listId="bill-suggestions"
              categories={billCats}
              color="text-amber-500"
            />
          ))}
          <div
            className={cn('grid items-center', gridBill, 'bg-muted/10')}
            onBlur={(e) => {
              if (e.currentTarget.contains(e.relatedTarget as Node)) return;
              if (newBill.name.trim()) saveNewBill();
            }}
          >
            <input
              ref={addBillNameRef}
              value={newBill.name}
              onChange={(e) => handleNewBillNameChange(e.target.value)}
              list="bill-suggestions"
              className={cn(cellBase, 'placeholder:text-muted-foreground/40')}
              placeholder={t('month.billNamePlaceholder')}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBillCatRef.current?.focus(); } }}
            />
            <select
              ref={addBillCatRef}
              value={newBill.category}
              onChange={(e) => setNewBill((prev) => ({ ...prev, category: e.target.value }))}
              className={cn(cellBase, 'text-xs cursor-pointer border-l border-border')}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBillAmountRef.current?.focus(); } }}
            >
              {billCats.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              ref={addBillAmountRef}
              type="number" step="0.01"
              value={newBill.actual}
              onChange={(e) => setNewBill((prev) => ({ ...prev, actual: e.target.value }))}
              className={cn(cellBase, 'text-right mono font-semibold text-amber-500 border-l border-border placeholder:text-muted-foreground/40')}
              placeholder="0"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  saveNewBill();
                  setTimeout(() => addBillNameRef.current?.focus(), 50);
                }
              }}
            />
            <div className="h-9 border-l border-border" />
          </div>
          <div className="h-9 flex items-center justify-end px-2.5 bg-muted/30">
            <div className="text-sm font-bold mono text-amber-500">{formatCurrency(totalBills, sym)}</div>
          </div>
        </div>
      </Section>

      {/* ─── EXPENSES ─── */}
      <Section id="expenses" title={t('month.expensesTitle')} icon={ShoppingCart} iconColor="bg-red-500" count={md.expenses.length}>
        <div className="divide-y divide-border">
          <div className={cn('grid', gridExpense, 'bg-muted/50')}>
            <div className="h-8 px-2.5 flex items-center text-xs font-semibold text-muted-foreground">{t('common.name')}</div>
            <div className="h-8 px-2.5 flex items-center text-xs font-semibold text-muted-foreground border-l border-border">{t('month.category')}</div>
            <div className="h-8 px-2.5 flex items-center text-xs font-semibold text-muted-foreground border-l border-border">{t('month.date')}</div>
            <div className="h-8 px-2.5 flex items-center justify-end text-xs font-semibold text-muted-foreground border-l border-border">{t('month.amount')}</div>
            <div className="h-8 border-l border-border" />
          </div>
          {[...md.expenses, ...optimistic.expenses].sort((a, b) => b.date.localeCompare(a.date)).map((e) => (
            <EditableExpenseRow
              key={e.id}
              item={e}
              onUpdate={(updated) => store.updateExpense(year, month, updated)}
              onDelete={() => setDeleteConfirm({ type: 'expense', id: e.id, name: e.name })}
              onEnter={() => addExpenseNameRef.current?.focus()}
              listId="expense-suggestions"
              categories={expCats}
              color="text-red-500"
            />
          ))}
          <div
            className={cn('grid items-center', gridExpense, 'bg-muted/10')}
            onBlur={(e) => {
              if (e.currentTarget.contains(e.relatedTarget as Node)) return;
              if (newExpense.name.trim()) saveNewExpense();
            }}
          >
            <input
              ref={addExpenseNameRef}
              value={newExpense.name}
              onChange={(e) => handleNewExpenseNameChange(e.target.value)}
              list="expense-suggestions"
              className={cn(cellBase, 'placeholder:text-muted-foreground/40')}
              placeholder={t('month.expenseNamePlaceholder')}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addExpenseCatRef.current?.focus(); } }}
            />
            <select
              ref={addExpenseCatRef}
              value={newExpense.category}
              onChange={(e) => setNewExpense((prev) => ({ ...prev, category: e.target.value }))}
              className={cn(cellBase, 'text-xs cursor-pointer border-l border-border')}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addExpenseDateRef.current?.focus(); } }}
            >
              {expCats.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              ref={addExpenseDateRef}
              type="date"
              value={newExpense.date}
              onChange={(e) => setNewExpense((prev) => ({ ...prev, date: e.target.value }))}
              className={cn(cellBase, 'text-xs mono border-l border-border')}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addExpenseAmountRef.current?.focus(); } }}
            />
            <input
              ref={addExpenseAmountRef}
              type="number" step="0.01"
              value={newExpense.amount}
              onChange={(e) => setNewExpense((prev) => ({ ...prev, amount: e.target.value }))}
              className={cn(cellBase, 'text-right mono font-semibold text-red-500 border-l border-border placeholder:text-muted-foreground/40')}
              placeholder="0"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  saveNewExpense();
                  setTimeout(() => addExpenseNameRef.current?.focus(), 50);
                }
              }}
            />
            <div className="h-9 border-l border-border" />
          </div>
          <div className="h-9 flex items-center justify-end px-2.5 bg-muted/30">
            <div className="text-sm font-bold mono text-red-500">{formatCurrency(totalExpense, sym)}</div>
          </div>
        </div>
      </Section>

      {/* ─── EXPENSE STATISTICS BY USER ─── */}
      {expensesByUser.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-muted-foreground" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('month.userStatistics')}</h3>
          </div>
          <div className="space-y-2">
            {expensesByUser.map(([email, data]) => (
              <div key={email} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground truncate mr-3">{email ? email.split('@')[0] : t('month.unknownUser')}</span>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-muted-foreground">{data.count} {data.count === 1 ? t('month.expenseSingular') : t('month.expensePlural')}</span>
                  <span className="mono font-semibold text-red-500">{formatCurrency(data.total, sym)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── BUDGET vs ACTUAL ─── */}
      <Section id="budgets" title={t('month.budgetVsActual')} icon={TrendingDown} iconColor="bg-violet-500" defaultOpen={true}>
        <div className="p-4">
          {editingBudgets ? (
            <div className="space-y-2">
              {expCats.map((cat) => (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-sm flex-1 min-w-0">{cat}</span>
                  <input
                    type="number"
                    value={budgetValues[cat] || ''}
                    onChange={(e) => setBudgetValues((prev) => ({ ...prev, [cat]: Number(e.target.value) || 0 }))}
                    placeholder="0"
                    className="w-24 px-2 py-1.5 rounded-lg border border-input bg-background text-right text-sm mono focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <button onClick={saveBudgets} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
                  <Save size={14} /> {t('month.saveBudgets')}
                </button>
                <button onClick={() => setEditingBudgets(false)} className="px-3 py-2 rounded-lg border border-border text-sm">{t('common.cancel')}</button>
              </div>
            </div>
          ) : (
            <>
              {budgetComparison.length > 0 ? (
                <div className="space-y-3">
                  {budgetComparison.map((b) => (
                    <div key={b.category}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">{b.category}</span>
                        <div className="flex items-center gap-3 text-xs mono">
                          <span className="text-muted-foreground">{formatCurrency(b.spent, sym)} / {formatCurrency(b.budget, sym)}</span>
                          <span className={cn('font-semibold', b.diff >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                            {b.diff >= 0 ? '+' : ''}{formatCurrency(b.diff, sym)}
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all',
                            b.budget > 0 && b.spent / b.budget > 1 ? 'bg-red-500' : 'bg-primary'
                          )}
                          style={{ width: `${b.budget > 0 ? Math.min(100, (b.spent / b.budget) * 100) : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">{t('month.noBudgetsYet')}</p>
              )}
              <button onClick={startEditBudgets} className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline mt-3">
                <Pencil size={14} /> {t('month.editBudgets')}
              </button>
            </>
          )}
        </div>
      </Section>

      {/* ─── SAVINGS & INVESTMENTS ─── */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
              <PiggyBank size={16} className="text-white" />
            </div>
            <span className="font-semibold">{t('month.savings')}</span>
          </div>
          {editSavings ? (
            <div className="space-y-2">
              <div>
                <label className={labelClass}>{t('common.target')}</label>
                <input type="number" value={savingsTarget} onChange={(e) => setSavingsTarget(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{t('common.actual')}</label>
                <input type="number" value={savingsActual} onChange={(e) => setSavingsActual(e.target.value)} className={inputClass} />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { store.setSavings(year, month, { target: Number(savingsTarget) || 0, actual: Number(savingsActual) || 0 }); setEditSavings(false); }}
                  className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
                >{t('common.save')}</button>
                <button onClick={() => setEditSavings(false)} className="px-3 py-1.5 rounded-lg border border-border text-sm">{t('common.cancel')}</button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">{t('common.target')}</span>
                <span className="mono font-semibold">{formatCurrency(md.savings.target, sym)}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">{t('common.actual')}</span>
                <span className="mono font-semibold text-emerald-500">{formatCurrency(md.savings.actual, sym)}</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden mb-2">
                <div className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${md.savings.target > 0 ? Math.min(100, (md.savings.actual / md.savings.target) * 100) : 0}%` }}
                />
              </div>
              <button onClick={() => { setSavingsTarget(String(md.savings.target)); setSavingsActual(String(md.savings.actual)); setEditSavings(true); }}
                className="text-xs text-primary font-medium hover:underline"
              >{t('common.edit')}</button>
            </>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
              <Landmark size={16} className="text-white" />
            </div>
            <span className="font-semibold">{t('month.investments')}</span>
          </div>
          {editInvest ? (
            <div className="space-y-2">
              <div>
                <label className={labelClass}>{t('common.target')}</label>
                <input type="number" value={investTarget} onChange={(e) => setInvestTarget(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{t('common.actual')}</label>
                <input type="number" value={investActual} onChange={(e) => setInvestActual(e.target.value)} className={inputClass} />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { store.setInvestments(year, month, { target: Number(investTarget) || 0, actual: Number(investActual) || 0 }); setEditInvest(false); }}
                  className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
                >{t('common.save')}</button>
                <button onClick={() => setEditInvest(false)} className="px-3 py-1.5 rounded-lg border border-border text-sm">{t('common.cancel')}</button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">{t('common.target')}</span>
                <span className="mono font-semibold">{formatCurrency(md.investments.target, sym)}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">{t('common.actual')}</span>
                <span className="mono font-semibold text-blue-500">{formatCurrency(md.investments.actual, sym)}</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden mb-2">
                <div className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${md.investments.target > 0 ? Math.min(100, (md.investments.actual / md.investments.target) * 100) : 0}%` }}
                />
              </div>
              <button onClick={() => { setInvestTarget(String(md.investments.target)); setInvestActual(String(md.investments.actual)); setEditInvest(true); }}
                className="text-xs text-primary font-medium hover:underline"
              >{t('common.edit')}</button>
            </>
          )}
        </div>
      </div>

      {/* ─── Monthly Charts ─── */}
      {(expenseByCategory.length > 0 || budgetComparison.length > 0) && (
        <div className="space-y-4">
          {chartUsers.length > 1 && (
            <div className="flex items-center gap-2">
              <Users size={14} className="text-muted-foreground" />
              <select
                value={chartFilterUser}
                onChange={(e) => setChartFilterUser(e.target.value)}
                className="px-2 py-1 rounded-lg border border-input bg-background text-sm"
              >
                <option value="">{t('common.allUsers')}</option>
                {chartUsers.map((u) => (
                  <option key={u} value={u}>{u.split('@')[0]}</option>
                ))}
              </select>
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
          {expenseByCategory.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">{t('month.expenseBreakdown')}</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={expenseByCategory} dataKey="amount" nameKey="category" innerRadius={50} outerRadius={80} paddingAngle={2} cornerRadius={3}>
                    {expenseByCategory.map((e, i) => <Cell key={i} fill={e.color} stroke="transparent" />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }}
                    formatter={(v: number) => [formatCurrency(v, sym), '']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-2">
                {expenseByCategory.map((c) => (
                  <div key={c.category} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                    <span className="flex-1 truncate text-muted-foreground">{c.category}</span>
                    <span className="mono font-medium">{formatCurrency(c.amount, sym)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {budgetComparison.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">{t('month.budgetVsSpent')}</h3>
              <ResponsiveContainer width="100%" height={200 + budgetComparison.length * 10}>
                <BarChart data={budgetComparison} layout="vertical" barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="category" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }}
                    formatter={(v: number) => [formatCurrency(v, sym), '']}
                  />
                  <Bar dataKey="budget" fill="hsl(var(--muted))" radius={[0, 4, 4, 0]} name={t('month.budget')} />
                  <Bar dataKey="spent" fill="#6366f1" radius={[0, 4, 4, 0]} name={t('month.spent')} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          </div>
        </div>
      )}

      {/* ─── Copy Modal ─── */}
      <Modal open={showCopy} onClose={() => setShowCopy(false)} title={t('month.copyFromPreviousTitle')}>
        <p className="text-sm text-muted-foreground mb-4">
          {t('month.copyDescription', { from: months[month === 1 ? 11 : month - 2], to: months[month - 1] })}
        </p>
        <div className="space-y-2 mb-4">
          {[
            { key: 'incomes', label: t('month.copyIncomeEntries') },
            { key: 'debts', label: t('month.copyDebtEntries') },
            { key: 'bills', label: t('month.copyBillsSubscriptions') },
            { key: 'budgets', label: t('month.copyCategoryBudgets') },
            { key: 'savings', label: t('month.copySavingsTarget') },
            { key: 'investments', label: t('month.copyInvestmentTarget') },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3 text-sm cursor-pointer hover:bg-secondary p-2 rounded-lg transition-colors">
              <input
                type="checkbox"
                checked={copySections.includes(key)}
                onChange={(e) => {
                  if (e.target.checked) setCopySections([...copySections, key]);
                  else setCopySections(copySections.filter((s) => s !== key));
                }}
                className="w-4 h-4 rounded border-input accent-primary"
              />
              {label}
            </label>
          ))}
        </div>
        <button
          onClick={() => { store.copyFromPreviousMonth(year, month, copySections); setShowCopy(false); }}
          disabled={copySections.length === 0}
          className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-40"
        >
          {t('month.copySelected')}
        </button>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        title={t('month.confirmDeleteTitle')}
        message={t('month.confirmDeleteMessage', { name: deleteConfirm?.name || '' })}
      />
    </div>
  );
}
