import { useI18n } from '@/lib/i18n';
import {
  BookOpen, Table2, Sparkles, Copy, PiggyBank, BarChart3,
  CalendarDays, Users, Settings, Keyboard, Lightbulb, LayoutDashboard,
  TrendingUp, CreditCard, FileText, ShoppingCart, Scale, PieChart,
  ArrowUpDown, TrendingDown, LineChart, TableProperties,
} from 'lucide-react';

function HelpSection({ icon: Icon, title, children, sub }: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  sub?: boolean;
}) {
  if (sub) {
    return (
      <div className="mt-4 pl-4 border-l-2 border-primary/20">
        <div className="flex items-center gap-2 mb-2">
          <Icon size={14} className="text-primary/60" />
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        {children}
      </div>
    );
  }
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon size={16} className="text-primary" />
        </div>
        <h2 className="font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function HelpImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="mt-3 rounded-lg border border-border overflow-hidden bg-muted/30">
      <img src={src} alt={alt} className="w-full h-auto" />
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>;
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm mono font-semibold text-foreground">
      {children}
    </div>
  );
}

export default function Help() {
  const { t } = useI18n();

  return (
    <div className="space-y-4 animate-fade-in max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold tracking-tight">{t('help.title')}</h1>

      {/* Getting started */}
      <HelpSection icon={BookOpen} title={t('help.gettingStarted')}>
        <P>{t('help.gettingStartedDesc')}</P>
      </HelpSection>

      {/* Data sections */}
      <HelpSection icon={TableProperties} title={t('help.dataSectionsTitle')}>
        <P>{t('help.dataSectionsDesc')}</P>

        <HelpSection icon={TrendingUp} title={t('help.incomeTitle')} sub>
          <P>{t('help.incomeDesc')}</P>
        </HelpSection>

        <HelpSection icon={CreditCard} title={t('help.debtTitle')} sub>
          <P>{t('help.debtDesc')}</P>
        </HelpSection>

        <HelpSection icon={FileText} title={t('help.billsTitle')} sub>
          <P>{t('help.billsDesc')}</P>
        </HelpSection>

        <HelpSection icon={ShoppingCart} title={t('help.expensesTitle')} sub>
          <P>{t('help.expensesDesc')}</P>
        </HelpSection>

        <HelpSection icon={Scale} title={t('help.netBalanceTitle')} sub>
          <P>{t('help.netBalanceDesc')}</P>
          <Formula>Net = Income - Expenses - Bills - Debt - Savings - Investments</Formula>
        </HelpSection>
      </HelpSection>

      {/* Monthly view */}
      <HelpSection icon={CalendarDays} title={t('help.monthlyViewTitle')}>
        <P>{t('help.monthlyViewDesc')}</P>

        <HelpSection icon={BarChart3} title={t('help.monthSummaryBarTitle')} sub>
          <P>{t('help.monthSummaryBarDesc')}</P>
        </HelpSection>

        <HelpSection icon={PieChart} title={t('help.monthExpenseBreakdownTitle')} sub>
          <P>{t('help.monthExpenseBreakdownDesc')}</P>
        </HelpSection>

        <HelpSection icon={ArrowUpDown} title={t('help.monthBudgetVsSpentTitle')} sub>
          <P>{t('help.monthBudgetVsSpentDesc')}</P>
        </HelpSection>

        <HelpSection icon={Users} title={t('help.monthUserStatsTitle')} sub>
          <P>{t('help.monthUserStatsDesc')}</P>
        </HelpSection>
      </HelpSection>

      {/* Inline editing */}
      <HelpSection icon={Table2} title={t('help.inlineEditingTitle')}>
        <P>{t('help.inlineEditingDesc')}</P>
        <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
          {[t('help.inlineEditingTip1'), t('help.inlineEditingTip2'), t('help.inlineEditingTip3'), t('help.inlineEditingTip4')].map((tip, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              {tip}
            </li>
          ))}
        </ul>
        <HelpImage src="/help-inline-edit.svg" alt="Inline editing example" />
      </HelpSection>

      {/* Auto-suggest */}
      <HelpSection icon={Sparkles} title={t('help.autoSuggestTitle')}>
        <P>{t('help.autoSuggestDesc')}</P>
        <HelpImage src="/help-autosuggest.svg" alt="Auto-suggest example" />
      </HelpSection>

      {/* Copy */}
      <HelpSection icon={Copy} title={t('help.copyTitle')}>
        <P>{t('help.copyDesc')}</P>
        <HelpImage src="/help-copy.svg" alt="Copy from previous month" />
      </HelpSection>

      {/* Budgets */}
      <HelpSection icon={BarChart3} title={t('help.budgetsTitle')}>
        <P>{t('help.budgetsDesc')}</P>
      </HelpSection>

      {/* Savings */}
      <HelpSection icon={PiggyBank} title={t('help.savingsTitle')}>
        <P>{t('help.savingsDesc')}</P>
      </HelpSection>

      {/* Dashboard */}
      <HelpSection icon={LayoutDashboard} title={t('help.dashboardTitle')}>
        <P>{t('help.dashboardDesc')}</P>

        <HelpSection icon={TrendingUp} title={t('help.dashboardCurrentMonthTitle')} sub>
          <P>{t('help.dashboardCurrentMonthDesc')}</P>
        </HelpSection>

        <HelpSection icon={BarChart3} title={t('help.dashboardSummaryCardsTitle')} sub>
          <P>{t('help.dashboardSummaryCardsDesc')}</P>
        </HelpSection>

        <HelpSection icon={BarChart3} title={t('help.dashboardMonthlyOverviewTitle')} sub>
          <P>{t('help.dashboardMonthlyOverviewDesc')}</P>
        </HelpSection>

        <HelpSection icon={PieChart} title={t('help.dashboardCategoryPieTitle')} sub>
          <P>{t('help.dashboardCategoryPieDesc')}</P>
        </HelpSection>

        <HelpSection icon={PiggyBank} title={t('help.dashboardSavingsTitle')} sub>
          <P>{t('help.dashboardSavingsDesc')}</P>
        </HelpSection>

        <HelpSection icon={CreditCard} title={t('help.dashboardDebtTitle')} sub>
          <P>{t('help.dashboardDebtDesc')}</P>
        </HelpSection>

        <HelpSection icon={CalendarDays} title={t('help.dashboardMonthlyGridTitle')} sub>
          <P>{t('help.dashboardMonthlyGridDesc')}</P>
        </HelpSection>
      </HelpSection>

      {/* Yearly view */}
      <HelpSection icon={LineChart} title={t('help.yearlyTitle')}>
        <P>{t('help.yearlyDesc')}</P>

        <HelpSection icon={BarChart3} title={t('help.yearTotalsTitle')} sub>
          <P>{t('help.yearTotalsDesc')}</P>
        </HelpSection>

        <HelpSection icon={BarChart3} title={t('help.yearMonthlyChartTitle')} sub>
          <P>{t('help.yearMonthlyChartDesc')}</P>
        </HelpSection>

        <HelpSection icon={TrendingDown} title={t('help.yearNetCashFlowTitle')} sub>
          <P>{t('help.yearNetCashFlowDesc')}</P>
          <Formula>Monthly Net = Income - Expenses - Bills - Debt</Formula>
        </HelpSection>

        <HelpSection icon={TrendingUp} title={t('help.yearCumulativeNetTitle')} sub>
          <P>{t('help.yearCumulativeNetDesc')}</P>
        </HelpSection>

        <HelpSection icon={PiggyBank} title={t('help.yearSavingsTitle')} sub>
          <P>{t('help.yearSavingsDesc')}</P>
        </HelpSection>

        <HelpSection icon={PieChart} title={t('help.yearCategoryPieTitle')} sub>
          <P>{t('help.yearCategoryPieDesc')}</P>
        </HelpSection>

        <HelpSection icon={TableProperties} title={t('help.yearMonthlyTableTitle')} sub>
          <P>{t('help.yearMonthlyTableDesc')}</P>
        </HelpSection>
      </HelpSection>

      {/* User filter */}
      <HelpSection icon={Users} title={t('help.userFilterTitle')}>
        <P>{t('help.userFilterDesc')}</P>
        <HelpImage src="/help-user-filter.svg" alt="User filter example" />
      </HelpSection>

      {/* Settings */}
      <HelpSection icon={Settings} title={t('help.settingsTitle')}>
        <P>{t('help.settingsDesc')}</P>
      </HelpSection>

      {/* Keyboard shortcuts */}
      <HelpSection icon={Keyboard} title={t('help.keyboardTitle')}>
        <div className="space-y-2">
          {[
            { key: t('help.keyTab'), desc: t('help.keyTabDesc') },
            { key: t('help.keyEnter'), desc: t('help.keyEnterDesc') },
            { key: t('help.keyClick'), desc: t('help.keyClickDesc') },
          ].map(({ key, desc }) => (
            <div key={key} className="flex items-center gap-3 text-sm">
              <kbd className="px-2 py-1 rounded-md bg-muted border border-border text-xs font-mono font-semibold min-w-[80px] text-center">{key}</kbd>
              <span className="text-muted-foreground">{desc}</span>
            </div>
          ))}
        </div>
        <HelpImage src="/help-keyboard.svg" alt="Keyboard shortcuts" />
      </HelpSection>

      {/* Tips */}
      <HelpSection icon={Lightbulb} title={t('help.tipsTitle')}>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {[t('help.tip1'), t('help.tip2'), t('help.tip3'), t('help.tip4'), t('help.tip5'), t('help.tip6')].map((tip, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              {tip}
            </li>
          ))}
        </ul>
      </HelpSection>
    </div>
  );
}
