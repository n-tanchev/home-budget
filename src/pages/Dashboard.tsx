import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { useI18n, useMonthNames } from '@/lib/i18n';
import { formatCurrency, getCategoryColor, cn } from '@/lib/utils';
import {
  TrendingUp, TrendingDown, Wallet, PiggyBank, Landmark, CreditCard,
  ChevronLeft, ChevronRight, Users,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

interface Props {
  selectedYear: number;
  onNavigateToMonth: (year: number, month: number) => void;
  onYearChange: (year: number) => void;
}

export default function Dashboard({ selectedYear, onNavigateToMonth, onYearChange }: Props) {
  const { state, getMonthData } = useStore();
  const { t } = useI18n();
  const { monthsShort } = useMonthNames();
  const sym = state.settings.currencySymbol;

  // ─── User filter ────────────────────────────────────────────
  const [filterUser, setFilterUser] = useState('');

  const allUsers = useMemo(() => {
    const users = new Set<string>();
    for (let m = 1; m <= 12; m++) {
      const md = getMonthData(selectedYear, m);
      md.expenses.forEach((e) => { if (e.addedBy) users.add(e.addedBy); });
    }
    return [...users].sort();
  }, [selectedYear, getMonthData]);

  const yearData = useMemo(() => {
    const data = [];
    let totalIncome = 0, totalExpense = 0, totalBills = 0, totalDebt = 0;
    let totalSavingsTarget = 0, totalSavingsActual = 0;
    let totalInvestTarget = 0, totalInvestActual = 0;

    for (let m = 1; m <= 12; m++) {
      const md = getMonthData(selectedYear, m);
      const expenses = filterUser ? md.expenses.filter((e) => e.addedBy === filterUser) : md.expenses;
      const income = md.incomes.reduce((s, i) => s + i.actual, 0);
      const expense = expenses.reduce((s, e) => s + e.amount, 0);
      const bills = md.bills.reduce((s, b) => s + b.actual, 0);
      const debt = md.debts.reduce((s, d) => s + d.actual, 0);

      totalIncome += income;
      totalExpense += expense;
      totalBills += bills;
      totalDebt += debt;
      totalSavingsTarget += md.savings.target;
      totalSavingsActual += md.savings.actual;
      totalInvestTarget += md.investments.target;
      totalInvestActual += md.investments.actual;

      data.push({
        month: monthsShort[m - 1],
        monthNum: m,
        income,
        expense,
        bills,
        debt,
        net: income - expense - bills - debt,
        hasData: income > 0 || expense > 0 || bills > 0,
      });
    }

    return {
      monthly: data,
      totalIncome,
      totalExpense,
      totalBills,
      totalDebt,
      totalSavingsTarget,
      totalSavingsActual,
      totalInvestTarget,
      totalInvestActual,
      net: totalIncome - totalExpense - totalBills - totalDebt,
    };
  }, [selectedYear, getMonthData, monthsShort, filterUser]);

  // Category breakdown for the year
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (let m = 1; m <= 12; m++) {
      const md = getMonthData(selectedYear, m);
      const expenses = filterUser ? md.expenses.filter((e) => e.addedBy === filterUser) : md.expenses;
      expenses.forEach((e) => {
        map[e.category] = (map[e.category] || 0) + e.amount;
      });
    }
    return Object.entries(map)
      .map(([category, amount]) => ({
        category,
        amount,
        color: getCategoryColor(state.settings.expenseCategories.indexOf(category)),
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [selectedYear, getMonthData, state.settings.expenseCategories, filterUser]);

  // Current month
  const now = new Date();
  const currentMonthData = getMonthData(now.getFullYear(), now.getMonth() + 1);
  const currentExpenses = filterUser ? currentMonthData.expenses.filter((e) => e.addedBy === filterUser) : currentMonthData.expenses;
  const currentIncome = currentMonthData.incomes.reduce((s, i) => s + i.actual, 0);
  const currentExpense = currentExpenses.reduce((s, e) => s + e.amount, 0);
  const currentBills = currentMonthData.bills.reduce((s, b) => s + b.actual, 0);
  const currentDebt = currentMonthData.debts.reduce((s, d) => s + d.actual, 0);
  const currentNet = currentIncome - currentExpense - currentBills - currentDebt;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Year selector + user filter */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t('dashboard.title')}</h1>
        <div className="flex items-center gap-3">
          {allUsers.length > 1 && (
            <div className="flex items-center gap-1.5">
              <Users size={14} className="text-muted-foreground" />
              <select
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                className="px-2 py-1 rounded-lg border border-input bg-background text-sm"
              >
                <option value="">{t('common.allUsers')}</option>
                {allUsers.map((u) => (
                  <option key={u} value={u}>{u.split('@')[0]}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onYearChange(selectedYear - 1)}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-lg font-bold mono min-w-[4ch] text-center">{selectedYear}</span>
            <button
              onClick={() => onYearChange(selectedYear + 1)}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Current month snapshot */}
      {selectedYear === now.getFullYear() && (
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">
              {t('dashboard.thisMonth', { month: monthsShort[now.getMonth()] })}
            </h2>
            <button
              onClick={() => onNavigateToMonth(now.getFullYear(), now.getMonth() + 1)}
              className="text-xs text-primary font-semibold hover:underline"
            >
              {t('dashboard.viewDetails')}
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">{t('dashboard.income')}</div>
              <div className="text-lg font-bold mono text-emerald-500">{formatCurrency(currentIncome, sym)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">{t('dashboard.expenses')}</div>
              <div className="text-lg font-bold mono text-red-500">{formatCurrency(currentExpense, sym)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">{t('dashboard.bills')}</div>
              <div className="text-lg font-bold mono text-amber-500">{formatCurrency(currentBills, sym)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">{t('dashboard.debt')}</div>
              <div className="text-lg font-bold mono text-orange-500">{formatCurrency(currentDebt, sym)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">{t('dashboard.net')}</div>
              <div className={cn('text-lg font-bold mono', currentNet >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                {formatCurrency(currentNet, sym)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Year summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: t('dashboard.totalIncome'), value: yearData.totalIncome, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: t('dashboard.totalExpenses'), value: yearData.totalExpense, icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-500/10' },
          { label: t('dashboard.billsAndUtilities'), value: yearData.totalBills, icon: CreditCard, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: t('dashboard.netBalance'), value: yearData.net, icon: Wallet, color: yearData.net >= 0 ? 'text-primary' : 'text-red-500', bg: 'bg-primary/10' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', bg)}>
                <Icon size={16} className={color} />
              </div>
            </div>
            <div className={cn('text-xl font-bold mono', color)}>{formatCurrency(value, sym)}</div>
            <div className="text-xs text-muted-foreground mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Monthly income vs expense trend */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">{t('dashboard.monthlyOverview')}</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={yearData.monthly} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="month"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={55}
                tickFormatter={(v) => `${sym}${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  fontSize: 12,
                }}
                formatter={(value: number) => [formatCurrency(value, sym), '']}
              />
              <Bar
                dataKey="income"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                name={t('dashboard.income')}
                cursor="pointer"
                onClick={(data) => onNavigateToMonth(selectedYear, data.monthNum)}
              />
              <Bar
                dataKey="expense"
                fill="#ef4444"
                radius={[4, 4, 0, 0]}
                name={t('dashboard.expenses')}
              />
              <Bar
                dataKey="bills"
                fill="#f59e0b"
                radius={[4, 4, 0, 0]}
                name={t('dashboard.bills')}
              />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-5 mt-2">
            {[
              { label: t('dashboard.income'), color: '#10b981' },
              { label: t('dashboard.expenses'), color: '#ef4444' },
              { label: t('dashboard.bills'), color: '#f59e0b' },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Category donut */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            {t('dashboard.expensesByCategory')}
          </h3>
          {categoryBreakdown.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    dataKey="amount"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={2}
                    cornerRadius={3}
                  >
                    {categoryBreakdown.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: 12,
                    }}
                    formatter={(value: number) => [formatCurrency(value, sym), '']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {categoryBreakdown.slice(0, 6).map((cat) => (
                  <div key={cat.category} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                    <span className="flex-1 truncate text-muted-foreground">{cat.category}</span>
                    <span className="mono font-medium">{formatCurrency(cat.amount, sym)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
              {t('dashboard.noExpenseDataYet')}
            </div>
          )}
        </div>
      </div>

      {/* Savings & Investments + Debt row */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <PiggyBank size={16} className="text-emerald-500" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('dashboard.savings')}</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('common.target')}</span>
              <span className="mono font-semibold">{formatCurrency(yearData.totalSavingsTarget, sym)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('common.actual')}</span>
              <span className="mono font-semibold text-emerald-500">{formatCurrency(yearData.totalSavingsActual, sym)}</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{
                  width: `${yearData.totalSavingsTarget > 0
                    ? Math.min(100, (yearData.totalSavingsActual / yearData.totalSavingsTarget) * 100)
                    : 0}%`
                }}
              />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Landmark size={16} className="text-blue-500" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('dashboard.investments')}</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('common.target')}</span>
              <span className="mono font-semibold">{formatCurrency(yearData.totalInvestTarget, sym)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('common.actual')}</span>
              <span className="mono font-semibold text-blue-500">{formatCurrency(yearData.totalInvestActual, sym)}</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{
                  width: `${yearData.totalInvestTarget > 0
                    ? Math.min(100, (yearData.totalInvestActual / yearData.totalInvestTarget) * 100)
                    : 0}%`
                }}
              />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={16} className="text-orange-500" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('dashboard.totalDebtPaid')}</h3>
          </div>
          <div className="text-2xl font-bold mono text-orange-500 mb-1">
            {formatCurrency(yearData.totalDebt, sym)}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatCurrency(yearData.totalDebt / (yearData.monthly.filter(m => m.hasData).length || 1), sym)} {t('dashboard.monthAvg')}
          </div>
        </div>
      </div>

      {/* Monthly grid - quick access */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t('dashboard.monthlySummary')}</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {yearData.monthly.map((m) => (
            <button
              key={m.monthNum}
              onClick={() => onNavigateToMonth(selectedYear, m.monthNum)}
              className={cn(
                'bg-card border border-border rounded-xl p-3 text-left hover:border-primary/30 transition-colors group',
                m.hasData && 'border-border'
              )}
            >
              <div className="text-xs font-semibold text-muted-foreground group-hover:text-primary transition-colors mb-2">
                {m.month}
              </div>
              {m.hasData ? (
                <>
                  <div className="text-xs mono font-medium text-emerald-500">+{formatCurrency(m.income, sym)}</div>
                  <div className="text-xs mono font-medium text-red-500">-{formatCurrency(m.expense + m.bills, sym)}</div>
                  <div className={cn(
                    'text-xs mono font-bold mt-1 pt-1 border-t border-border',
                    m.net >= 0 ? 'text-foreground' : 'text-red-500'
                  )}>
                    {formatCurrency(m.net, sym)}
                  </div>
                </>
              ) : (
                <div className="text-xs text-muted-foreground/40">{t('common.noData')}</div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
