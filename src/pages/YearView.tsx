import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { getMonthKey } from '@/lib/types';
import { useI18n, useMonthNames } from '@/lib/i18n';
import { formatCurrency, getCategoryColor, cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';
// Types already use only 'actual' fields - no expected/estimated
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend,
} from 'recharts';

interface Props {
  year: number;
  onYearChange: (y: number) => void;
  onNavigateToMonth: (year: number, month: number) => void;
}

export default function YearView({ year, onYearChange, onNavigateToMonth }: Props) {
  const { state, getMonthData } = useStore();
  const { t } = useI18n();
  const { monthsShort } = useMonthNames();
  const sym = state.settings.currencySymbol;
  const expCats = state.settings.expenseCategories;
  const [compareYear, setCompareYear] = useState(year - 1);
  const [showCompare, setShowCompare] = useState(false);

  // ─── User filter ────────────────────────────────────────────
  const [filterUser, setFilterUser] = useState('');

  const allUsers = useMemo(() => {
    const users = new Set<string>();
    for (let m = 1; m <= 12; m++) {
      const md = getMonthData(year, m);
      md.expenses.forEach((e) => { if (e.addedBy) users.add(e.addedBy); });
    }
    return [...users].sort();
  }, [year, getMonthData]);

  const buildYearData = (y: number) => {
    const monthly = [];
    let totalIncome = 0, totalExpense = 0, totalBills = 0, totalDebt = 0;
    let totalSavingsT = 0, totalSavingsA = 0, totalInvestT = 0, totalInvestA = 0;
    const categoryTotals: Record<string, number> = {};

    for (let m = 1; m <= 12; m++) {
      const md = getMonthData(y, m);
      const expenses = filterUser ? md.expenses.filter((e) => e.addedBy === filterUser) : md.expenses;
      const income = md.incomes.reduce((s, i) => s + i.actual, 0);
      const expense = expenses.reduce((s, e) => s + e.amount, 0);
      const bills = md.bills.reduce((s, b) => s + b.actual, 0);
      const debt = md.debts.reduce((s, d) => s + d.actual, 0);

      totalIncome += income; totalExpense += expense; totalBills += bills; totalDebt += debt;
      totalSavingsT += md.savings.target; totalSavingsA += md.savings.actual;
      totalInvestT += md.investments.target; totalInvestA += md.investments.actual;

      expenses.forEach((e) => { categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount; });

      monthly.push({
        month: monthsShort[m - 1], monthNum: m,
        income, expense, bills, debt,
        net: income - expense - bills - debt,
        savingsTarget: md.savings.target, savingsActual: md.savings.actual,
        investTarget: md.investments.target, investActual: md.investments.actual,
        totalBudget: md.budgets.reduce((s, b) => s + b.budget, 0),
      });
    }

    const categories = Object.entries(categoryTotals)
      .map(([cat, amount]) => ({ category: cat, amount, color: getCategoryColor(expCats.indexOf(cat)) }))
      .sort((a, b) => b.amount - a.amount);

    return { monthly, totalIncome, totalExpense, totalBills, totalDebt, totalSavingsT, totalSavingsA, totalInvestT, totalInvestA, categories };
  };

  const data = useMemo(() => buildYearData(year), [year, getMonthData, monthsShort, filterUser]);
  const compData = useMemo(() => showCompare ? buildYearData(compareYear) : null, [showCompare, compareYear, getMonthData, monthsShort, filterUser]);

  // Combined data for comparison chart
  const comparisonData = useMemo(() => {
    if (!compData) return null;
    return data.monthly.map((m, i) => ({
      month: m.month,
      [`${year}_income`]: m.income,
      [`${year}_expense`]: m.expense + m.bills,
      [`${compareYear}_income`]: compData.monthly[i].income,
      [`${compareYear}_expense`]: compData.monthly[i].expense + compData.monthly[i].bills,
    }));
  }, [data, compData, year, compareYear]);

  // Net cash flow trend
  const netTrend = useMemo(() => {
    let cumulative = 0;
    return data.monthly.map((m) => {
      cumulative += m.net;
      return { month: m.month, net: m.net, cumulative };
    });
  }, [data]);

  // Savings vs target
  const savingsTrend = useMemo(() => {
    let cumulativeTarget = 0, cumulativeActual = 0;
    return data.monthly.map((m) => {
      cumulativeTarget += m.savingsTarget;
      cumulativeActual += m.savingsActual;
      return { month: m.month, target: cumulativeTarget, actual: cumulativeActual };
    });
  }, [data]);

  const tooltipStyle = {
    contentStyle: {
      background: 'hsl(var(--card))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '12px',
      fontSize: 12,
    },
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Year selector + user filter */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => onYearChange(year - 1)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <ChevronLeft size={18} />
          </button>
          <h1 className="text-2xl font-bold mono min-w-[4ch] text-center">{year}</h1>
          <button onClick={() => onYearChange(year + 1)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
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
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showCompare}
              onChange={(e) => setShowCompare(e.target.checked)}
              className="w-4 h-4 rounded accent-primary"
            />
            {t('year.compareWith')}
          </label>
          {showCompare && (
            <select
              value={compareYear}
              onChange={(e) => setCompareYear(Number(e.target.value))}
              className="px-2 py-1 rounded-lg border border-input bg-background text-sm"
            >
              {Array.from({ length: 5 }, (_, i) => year - i - 1).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Year totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t('year.income'), value: data.totalIncome, cValue: compData?.totalIncome, color: 'text-emerald-500' },
          { label: t('year.expensesAndBills'), value: data.totalExpense + data.totalBills, cValue: compData ? compData.totalExpense + compData.totalBills : undefined, color: 'text-red-500' },
          { label: t('year.debtPayments'), value: data.totalDebt, cValue: compData?.totalDebt, color: 'text-orange-500' },
          { label: t('year.netBalance'), value: data.totalIncome - data.totalExpense - data.totalBills - data.totalDebt, cValue: compData ? compData.totalIncome - compData.totalExpense - compData.totalBills - compData.totalDebt : undefined, color: '' },
        ].map(({ label, value, cValue, color }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4">
            <div className="text-xs text-muted-foreground mb-2">{label}</div>
            <div className={cn('text-lg font-bold mono', color || (value >= 0 ? 'text-primary' : 'text-red-500'))}>
              {formatCurrency(value, sym)}
            </div>
            {showCompare && cValue !== undefined && (
              <div className="text-xs mono text-muted-foreground mt-1">
                {compareYear}: {formatCurrency(cValue, sym)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Monthly Income vs Expenses Chart */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          {showCompare ? t('year.comparisonTitle', { year1: String(year), year2: String(compareYear) }) : t('year.monthlyIncomeVsOutflow')}
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          {showCompare && comparisonData ? (
            <BarChart data={comparisonData} barGap={1} barCategoryGap="15%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} width={55} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => [formatCurrency(v, sym), '']} />
              <Bar dataKey={`${year}_income`} fill="#10b981" radius={[3, 3, 0, 0]} name={t('year.yearIncome', { year: String(year) })} />
              <Bar dataKey={`${year}_expense`} fill="#ef4444" radius={[3, 3, 0, 0]} name={t('year.yearOutflow', { year: String(year) })} />
              <Bar dataKey={`${compareYear}_income`} fill="#10b98166" radius={[3, 3, 0, 0]} name={t('year.yearIncome', { year: String(compareYear) })} />
              <Bar dataKey={`${compareYear}_expense`} fill="#ef444466" radius={[3, 3, 0, 0]} name={t('year.yearOutflow', { year: String(compareYear) })} />
            </BarChart>
          ) : (
            <BarChart data={data.monthly} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} width={55} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => [formatCurrency(v, sym), '']} />
              <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name={t('year.income')} cursor="pointer" onClick={(d) => onNavigateToMonth(year, d.monthNum)} />
              <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name={t('year.expenses')} />
              <Bar dataKey="bills" fill="#f59e0b" radius={[4, 4, 0, 0]} name={t('year.bills')} />
              <Bar dataKey="debt" fill="#f97316" radius={[4, 4, 0, 0]} name={t('year.debt')} />
            </BarChart>
          )}
        </ResponsiveContainer>
        <div className="flex justify-center gap-4 mt-2 flex-wrap">
          {showCompare ? (
            <>
              {[
                { label: t('year.yearIncome', { year: String(year) }), color: '#10b981' },
                { label: t('year.yearOutflow', { year: String(year) }), color: '#ef4444' },
                { label: t('year.yearIncome', { year: String(compareYear) }), color: '#10b98166' },
                { label: t('year.yearOutflow', { year: String(compareYear) }), color: '#ef444466' },
              ].map(({ label, color }) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} /> {label}
                </div>
              ))}
            </>
          ) : (
            <>
              {[
                { label: t('year.income'), color: '#10b981' },
                { label: t('year.expenses'), color: '#ef4444' },
                { label: t('year.bills'), color: '#f59e0b' },
                { label: t('year.debt'), color: '#f97316' },
              ].map(({ label, color }) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} /> {label}
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Net Cash Flow & Cumulative */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">{t('year.netCashFlow')}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={netTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} width={55} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => [formatCurrency(v, sym), '']} />
              <Bar dataKey="net" name={t('year.net')} radius={[4, 4, 0, 0]}>
                {netTrend.map((entry, i) => (
                  <Cell key={i} fill={entry.net >= 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">{t('year.cumulativeNet')}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={netTrend}>
              <defs>
                <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} width={55} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => [formatCurrency(v, sym), '']} />
              <Area type="monotone" dataKey="cumulative" stroke="#6366f1" strokeWidth={2} fill="url(#netGrad)" name={t('year.cumulative')} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Savings progress */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">{t('year.cumulativeSavings')}</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={savingsTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} width={55} />
            <Tooltip {...tooltipStyle} formatter={(v: number) => [formatCurrency(v, sym), '']} />
            <Line type="monotone" dataKey="target" stroke="#94a3b8" strokeWidth={2} strokeDasharray="6 3" name={t('year.target')} dot={false} />
            <Line type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={2.5} name={t('year.actual')} dot={{ fill: '#10b981', r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Category breakdown for year */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">{t('year.expenseCategories', { year: String(year) })}</h3>
          {data.categories.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={data.categories} dataKey="amount" nameKey="category" innerRadius={55} outerRadius={85} paddingAngle={2} cornerRadius={3}>
                    {data.categories.map((e, i) => <Cell key={i} fill={e.color} stroke="transparent" />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} formatter={(v: number) => [formatCurrency(v, sym), '']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                {data.categories.map((c) => (
                  <div key={c.category} className="flex items-center gap-2 text-xs py-1">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
                    <span className="flex-1 truncate text-muted-foreground">{c.category}</span>
                    <span className="mono font-medium">{formatCurrency(c.amount, sym)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">{t('common.noData')}</div>
          )}
        </div>

        {/* Monthly breakdown table */}
        <div className="bg-card border border-border rounded-xl p-5 overflow-x-auto">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">{t('year.monthlyBreakdownTable')}</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-semibold text-muted-foreground">{t('year.month')}</th>
                <th className="text-right py-2 font-semibold text-emerald-500">{t('year.income')}</th>
                <th className="text-right py-2 font-semibold text-red-500">{t('year.expenses')}</th>
                <th className="text-right py-2 font-semibold text-amber-500">{t('year.bills')}</th>
                <th className="text-right py-2 font-semibold">{t('year.net')}</th>
              </tr>
            </thead>
            <tbody>
              {data.monthly.map((m) => (
                <tr
                  key={m.month}
                  className="border-b border-border/50 hover:bg-secondary/50 cursor-pointer transition-colors"
                  onClick={() => onNavigateToMonth(year, m.monthNum)}
                >
                  <td className="py-2 font-medium">{m.month}</td>
                  <td className="text-right py-2 mono text-emerald-500">{formatCurrency(m.income, sym)}</td>
                  <td className="text-right py-2 mono text-red-500">{formatCurrency(m.expense, sym)}</td>
                  <td className="text-right py-2 mono text-amber-500">{formatCurrency(m.bills, sym)}</td>
                  <td className={cn('text-right py-2 mono font-semibold', m.net >= 0 ? 'text-foreground' : 'text-red-500')}>
                    {formatCurrency(m.net, sym)}
                  </td>
                </tr>
              ))}
              <tr className="font-bold border-t-2 border-border">
                <td className="py-2">{t('common.total')}</td>
                <td className="text-right py-2 mono text-emerald-500">{formatCurrency(data.totalIncome, sym)}</td>
                <td className="text-right py-2 mono text-red-500">{formatCurrency(data.totalExpense, sym)}</td>
                <td className="text-right py-2 mono text-amber-500">{formatCurrency(data.totalBills, sym)}</td>
                <td className={cn('text-right py-2 mono', data.totalIncome - data.totalExpense - data.totalBills - data.totalDebt >= 0 ? '' : 'text-red-500')}>
                  {formatCurrency(data.totalIncome - data.totalExpense - data.totalBills - data.totalDebt, sym)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
