import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { type Income, type Debt, type Bill, type Expense, type CategoryBudget } from '@/lib/types';
import { useI18n, useMonthNames } from '@/lib/i18n';
import { formatCurrency, getCategoryColor, cn, generateId } from '@/lib/utils';
import {
  ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Copy, X,
  TrendingUp, TrendingDown, CreditCard, FileText, PiggyBank, Landmark,
  ShoppingCart, ChevronDown, ChevronUp, Save,
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface Props {
  year: number;
  month: number;
  onMonthChange: (m: number) => void;
  onYearChange: (y: number) => void;
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

// ─── Collapsible Section ────────────────────────────────────────
function Section({ title, icon: Icon, iconColor, count, children, defaultOpen = true }: {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  count?: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
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
      {open && <div className="px-4 pb-4 border-t border-border">{children}</div>}
    </div>
  );
}

// ─── Inline Input Row (for quick editing) ───────────────────────
function ItemRow({ children, onEdit, onDelete }: {
  children: React.ReactNode;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-2 py-2.5 border-b border-border/50 last:border-0 group">
      <div className="flex-1 min-w-0">{children}</div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="p-1 rounded hover:bg-secondary"><Pencil size={14} className="text-muted-foreground" /></button>
        <button onClick={onDelete} className="p-1 rounded hover:bg-destructive/10"><Trash2 size={14} className="text-destructive" /></button>
      </div>
    </div>
  );
}

export default function MonthView({ year, month, onMonthChange, onYearChange }: Props) {
  const store = useStore();
  const { t } = useI18n();
  const { months } = useMonthNames();
  const md = store.getMonthData(year, month);
  const sym = store.state.settings.currencySymbol;
  const expCats = store.state.settings.expenseCategories;
  const billCats = store.state.settings.billCategories;

  // Modal state
  const [modal, setModal] = useState<{
    type: 'income' | 'debt' | 'bill' | 'expense' | 'copy' | null;
    edit?: any;
  }>({ type: null });

  // ─── Form states ──────────────────────────────────────────────
  const [formName, setFormName] = useState('');
  const [formAmount1, setFormAmount1] = useState('');
  const [formAmount2, setFormAmount2] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formDate, setFormDate] = useState('');

  const openModal = (type: 'income' | 'debt' | 'bill' | 'expense', edit?: any) => {
    setModal({ type, edit });
    if (edit) {
      setFormName(edit.name);
      if (type === 'income') { setFormAmount1(String(edit.expected)); setFormAmount2(String(edit.actual)); }
      else if (type === 'debt') { setFormAmount1(String(edit.estimated)); setFormAmount2(String(edit.actual)); }
      else if (type === 'bill') { setFormAmount1(String(edit.estimated)); setFormAmount2(String(edit.actual)); setFormCategory(edit.category); }
      else if (type === 'expense') { setFormAmount1(String(edit.amount)); setFormCategory(edit.category); setFormDate(edit.date); }
    } else {
      setFormName(''); setFormAmount1(''); setFormAmount2('');
      setFormCategory(type === 'bill' ? (billCats[0] || '') : type === 'expense' ? (expCats[0] || '') : '');
      setFormDate(`${year}-${String(month).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`);
    }
  };

  const handleSave = () => {
    const mType = modal.type;
    if (!mType || mType === 'copy') return;
    if (mType === 'income') {
      const data = { name: formName, expected: Number(formAmount1) || 0, actual: Number(formAmount2) || 0 };
      if (modal.edit) store.updateIncome(year, month, { ...data, id: modal.edit.id });
      else store.addIncome(year, month, data);
    } else if (mType === 'debt') {
      const data = { name: formName, estimated: Number(formAmount1) || 0, actual: Number(formAmount2) || 0 };
      if (modal.edit) store.updateDebt(year, month, { ...data, id: modal.edit.id });
      else store.addDebt(year, month, data);
    } else if (mType === 'bill') {
      const data = { name: formName, category: formCategory, estimated: Number(formAmount1) || 0, actual: Number(formAmount2) || 0 };
      if (modal.edit) store.updateBill(year, month, { ...data, id: modal.edit.id });
      else store.addBill(year, month, data);
    } else if (mType === 'expense') {
      const data = { name: formName, category: formCategory, date: formDate, amount: Number(formAmount1) || 0 };
      if (modal.edit) store.updateExpense(year, month, { ...data, id: modal.edit.id });
      else store.addExpense(year, month, data);
    }
    setModal({ type: null });
  };

  // ─── Budgets inline editing ───────────────────────────────────
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

  // ─── Savings/Investments inline ───────────────────────────────
  const [editSavings, setEditSavings] = useState(false);
  const [savingsTarget, setSavingsTarget] = useState(String(md.savings.target));
  const [savingsActual, setSavingsActual] = useState(String(md.savings.actual));
  const [editInvest, setEditInvest] = useState(false);
  const [investTarget, setInvestTarget] = useState(String(md.investments.target));
  const [investActual, setInvestActual] = useState(String(md.investments.actual));

  // ─── Computed ─────────────────────────────────────────────────
  const totalIncome = md.incomes.reduce((s, i) => s + i.actual, 0);
  const totalExpense = md.expenses.reduce((s, e) => s + e.amount, 0);
  const totalBills = md.bills.reduce((s, b) => s + b.actual, 0);
  const totalDebt = md.debts.reduce((s, d) => s + d.actual, 0);
  const totalOut = totalExpense + totalBills + totalDebt + md.savings.actual + md.investments.actual;
  const netBalance = totalIncome - totalOut;

  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    md.expenses.forEach((e) => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map)
      .map(([cat, amount]) => ({ category: cat, amount, color: getCategoryColor(expCats.indexOf(cat)) }))
      .sort((a, b) => b.amount - a.amount);
  }, [md.expenses, expCats]);

  const budgetComparison = useMemo(() => {
    return expCats.map((cat) => {
      const budget = md.budgets.find((b) => b.category === cat)?.budget || 0;
      const spent = md.expenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0);
      return { category: cat, budget, spent, diff: budget - spent, color: getCategoryColor(expCats.indexOf(cat)) };
    }).filter((b) => b.budget > 0 || b.spent > 0);
  }, [md, expCats]);

  // ─── Month navigation ────────────────────────────────────────
  const changeMonth = (dir: number) => {
    let m = month + dir;
    let y = year;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    onMonthChange(m);
    onYearChange(y);
  };

  // ─── Copy from previous ──────────────────────────────────────
  const [copySections, setCopySections] = useState<string[]>(['incomes', 'debts', 'bills', 'budgets', 'savings', 'investments']);

  const inputClass = 'w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm';
  const labelClass = 'text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block';

  // Modal title helper
  const getModalTitle = () => {
    if (!modal.type || modal.type === 'copy') return '';
    const isEdit = !!modal.edit;
    const titleMap: Record<string, string> = {
      income: isEdit ? t('month.editIncomeTitle') : t('month.addIncomeTitle'),
      debt: isEdit ? t('month.editDebtTitle') : t('month.addDebtTitle'),
      bill: isEdit ? t('month.editBillTitle') : t('month.addBillTitle'),
      expense: isEdit ? t('month.editExpenseTitle') : t('month.addExpenseTitle'),
    };
    return titleMap[modal.type] || '';
  };

  return (
    <div className="space-y-4 animate-fade-in">
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
          onClick={() => setModal({ type: 'copy' })}
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
      <Section title={t('month.incomeTitle')} icon={TrendingUp} iconColor="bg-emerald-500" count={md.incomes.length}>
        <div className="mt-3">
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 text-xs font-semibold text-muted-foreground mb-1 px-1">
            <span>{t('common.name')}</span><span className="w-20 text-right">{t('month.expected')}</span><span className="w-20 text-right">{t('common.actual')}</span>
          </div>
          {md.incomes.map((inc) => (
            <ItemRow key={inc.id} onEdit={() => openModal('income', inc)} onDelete={() => store.deleteIncome(year, month, inc.id)}>
              <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
                <span className="text-sm truncate">{inc.name}</span>
                <span className="w-20 text-right text-sm mono text-muted-foreground">{formatCurrency(inc.expected, sym)}</span>
                <span className="w-20 text-right text-sm mono font-semibold text-emerald-500">{formatCurrency(inc.actual, sym)}</span>
              </div>
            </ItemRow>
          ))}
          <div className="flex justify-between items-center pt-2 mt-1 border-t border-border">
            <button onClick={() => openModal('income')} className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline">
              <Plus size={14} /> {t('month.addIncome')}
            </button>
            <div className="text-sm font-bold mono text-emerald-500">{formatCurrency(totalIncome, sym)}</div>
          </div>
        </div>
      </Section>

      {/* ─── DEBT ─── */}
      <Section title={t('month.debtTitle')} icon={CreditCard} iconColor="bg-orange-500" count={md.debts.length}>
        <div className="mt-3">
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 text-xs font-semibold text-muted-foreground mb-1 px-1">
            <span>{t('common.name')}</span><span className="w-20 text-right">{t('month.estimated')}</span><span className="w-20 text-right">{t('common.actual')}</span>
          </div>
          {md.debts.map((d) => (
            <ItemRow key={d.id} onEdit={() => openModal('debt', d)} onDelete={() => store.deleteDebt(year, month, d.id)}>
              <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
                <span className="text-sm truncate">{d.name}</span>
                <span className="w-20 text-right text-sm mono text-muted-foreground">{formatCurrency(d.estimated, sym)}</span>
                <span className="w-20 text-right text-sm mono font-semibold text-orange-500">{formatCurrency(d.actual, sym)}</span>
              </div>
            </ItemRow>
          ))}
          <div className="flex justify-between items-center pt-2 mt-1 border-t border-border">
            <button onClick={() => openModal('debt')} className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline">
              <Plus size={14} /> {t('month.addDebt')}
            </button>
            <div className="text-sm font-bold mono text-orange-500">{formatCurrency(totalDebt, sym)}</div>
          </div>
        </div>
      </Section>

      {/* ─── BILLS ─── */}
      <Section title={t('month.billsTitle')} icon={FileText} iconColor="bg-amber-500" count={md.bills.length}>
        <div className="mt-3">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 text-xs font-semibold text-muted-foreground mb-1 px-1">
            <span>{t('common.name')}</span><span className="w-16 text-center">{t('month.category')}</span><span className="w-16 text-right">{t('month.est')}</span><span className="w-16 text-right">{t('common.actual')}</span>
          </div>
          {md.bills.map((b) => (
            <ItemRow key={b.id} onEdit={() => openModal('bill', b)} onDelete={() => store.deleteBill(year, month, b.id)}>
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
                <span className="text-sm truncate">{b.name}</span>
                <span className="w-16 text-center text-xs bg-secondary px-1.5 py-0.5 rounded-md truncate">{b.category}</span>
                <span className="w-16 text-right text-sm mono text-muted-foreground">{formatCurrency(b.estimated, sym)}</span>
                <span className="w-16 text-right text-sm mono font-semibold text-amber-500">{formatCurrency(b.actual, sym)}</span>
              </div>
            </ItemRow>
          ))}
          <div className="flex justify-between items-center pt-2 mt-1 border-t border-border">
            <button onClick={() => openModal('bill')} className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline">
              <Plus size={14} /> {t('month.addBill')}
            </button>
            <div className="text-sm font-bold mono text-amber-500">{formatCurrency(totalBills, sym)}</div>
          </div>
        </div>
      </Section>

      {/* ─── EXPENSES ─── */}
      <Section title={t('month.expensesTitle')} icon={ShoppingCart} iconColor="bg-red-500" count={md.expenses.length}>
        <div className="mt-3">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 text-xs font-semibold text-muted-foreground mb-1 px-1">
            <span>{t('common.name')}</span><span className="w-16 text-center">{t('month.category')}</span><span className="w-20 text-center">{t('month.date')}</span><span className="w-16 text-right">{t('month.amount')}</span>
          </div>
          {md.expenses.sort((a, b) => b.date.localeCompare(a.date)).map((e) => (
            <ItemRow key={e.id} onEdit={() => openModal('expense', e)} onDelete={() => store.deleteExpense(year, month, e.id)}>
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
                <span className="text-sm truncate">{e.name}</span>
                <span className="w-16 text-center text-xs bg-secondary px-1.5 py-0.5 rounded-md truncate">{e.category}</span>
                <span className="w-20 text-center text-xs mono text-muted-foreground">{e.date.slice(5)}</span>
                <span className="w-16 text-right text-sm mono font-semibold text-red-500">{formatCurrency(e.amount, sym)}</span>
              </div>
            </ItemRow>
          ))}
          <div className="flex justify-between items-center pt-2 mt-1 border-t border-border">
            <button onClick={() => openModal('expense')} className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline">
              <Plus size={14} /> {t('month.addExpense')}
            </button>
            <div className="text-sm font-bold mono text-red-500">{formatCurrency(totalExpense, sym)}</div>
          </div>
        </div>
      </Section>

      {/* ─── BUDGET vs ACTUAL ─── */}
      <Section title={t('month.budgetVsActual')} icon={TrendingDown} iconColor="bg-violet-500" defaultOpen={true}>
        <div className="mt-3">
          {editingBudgets ? (
            <div className="space-y-2">
              {expCats.map((cat) => (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-sm flex-1 truncate">{cat}</span>
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
      )}

      {/* ─── MODALS ─── */}
      {/* Income / Debt Modal */}
      <Modal
        open={modal.type === 'income' || modal.type === 'debt'}
        onClose={() => setModal({ type: null })}
        title={getModalTitle()}
      >
        <div className="space-y-3">
          <div>
            <label className={labelClass}>{t('common.name')}</label>
            <input value={formName} onChange={(e) => setFormName(e.target.value)} className={inputClass} placeholder={t('month.namePlaceholder')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>{modal.type === 'income' ? t('month.expected') : t('month.estimated')}</label>
              <input type="number" step="0.01" value={formAmount1} onChange={(e) => setFormAmount1(e.target.value)} className={inputClass} placeholder={t('month.amountPlaceholder')} />
            </div>
            <div>
              <label className={labelClass}>{t('common.actual')}</label>
              <input type="number" step="0.01" value={formAmount2} onChange={(e) => setFormAmount2(e.target.value)} className={inputClass} placeholder={t('month.amountPlaceholder')} />
            </div>
          </div>
          <button onClick={handleSave} disabled={!formName} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-40 mt-2">
            {modal.edit ? t('common.update') : t('common.add')}
          </button>
        </div>
      </Modal>

      {/* Bill Modal */}
      <Modal open={modal.type === 'bill'} onClose={() => setModal({ type: null })} title={getModalTitle()}>
        <div className="space-y-3">
          <div>
            <label className={labelClass}>{t('common.name')}</label>
            <input value={formName} onChange={(e) => setFormName(e.target.value)} className={inputClass} placeholder={t('month.billNamePlaceholder')} />
          </div>
          <div>
            <label className={labelClass}>{t('month.category')}</label>
            <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className={inputClass}>
              {billCats.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>{t('month.estimated')}</label>
              <input type="number" step="0.01" value={formAmount1} onChange={(e) => setFormAmount1(e.target.value)} className={inputClass} placeholder={t('month.amountPlaceholder')} />
            </div>
            <div>
              <label className={labelClass}>{t('common.actual')}</label>
              <input type="number" step="0.01" value={formAmount2} onChange={(e) => setFormAmount2(e.target.value)} className={inputClass} placeholder={t('month.amountPlaceholder')} />
            </div>
          </div>
          <button onClick={handleSave} disabled={!formName} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-40 mt-2">
            {modal.edit ? t('common.update') : t('common.add')}
          </button>
        </div>
      </Modal>

      {/* Expense Modal */}
      <Modal open={modal.type === 'expense'} onClose={() => setModal({ type: null })} title={getModalTitle()}>
        <div className="space-y-3">
          <div>
            <label className={labelClass}>{t('common.name')}</label>
            <input value={formName} onChange={(e) => setFormName(e.target.value)} className={inputClass} placeholder={t('month.expenseNamePlaceholder')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>{t('month.category')}</label>
              <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className={inputClass}>
                {expCats.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>{t('month.date')}</label>
              <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>{t('month.amount')}</label>
            <input type="number" step="0.01" value={formAmount1} onChange={(e) => setFormAmount1(e.target.value)} className={inputClass} placeholder={t('month.amountPlaceholder')} />
          </div>
          <button onClick={handleSave} disabled={!formName || !formAmount1} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-40 mt-2">
            {modal.edit ? t('common.update') : t('common.add')}
          </button>
        </div>
      </Modal>

      {/* Copy Modal */}
      <Modal open={modal.type === 'copy'} onClose={() => setModal({ type: null })} title={t('month.copyFromPreviousTitle')}>
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
          onClick={() => { store.copyFromPreviousMonth(year, month, copySections); setModal({ type: null }); }}
          disabled={copySections.length === 0}
          className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-40"
        >
          {t('month.copySelected')}
        </button>
      </Modal>
    </div>
  );
}
