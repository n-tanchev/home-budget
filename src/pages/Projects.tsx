import { useState, useMemo } from 'react';
import { useNavigate, useParams, NavLink } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { useI18n, useMonthNames } from '@/lib/i18n';
import { formatCurrency, cn, getCategoryColor } from '@/lib/utils';
import type { Project, Expense } from '@/lib/types';
import {
  Briefcase, Plus, X, Pencil, Archive, ArchiveRestore, Trash2,
  ChevronLeft, AlertTriangle, ShoppingCart,
} from 'lucide-react';

interface ExpenseWithMonth extends Expense {
  monthKey: string;
}

function projectStats(project: Project, allExpenses: ExpenseWithMonth[]) {
  const linked = allExpenses.filter((e) => e.projectId === project.id);
  const totalSpent = linked.reduce((s, e) => s + e.amount, 0);
  const remaining = project.totalBudget - totalSpent;
  const progress = project.totalBudget > 0 ? Math.min(100, (totalSpent / project.totalBudget) * 100) : 0;
  return { linked, totalSpent, remaining, progress };
}

function useAllExpenses(): ExpenseWithMonth[] {
  const store = useStore();
  return useMemo(() => {
    const out: ExpenseWithMonth[] = [];
    Object.entries(store.state.months).forEach(([monthKey, md]) => {
      md.expenses.forEach((e) => out.push({ ...e, monthKey }));
    });
    return out;
  }, [store.state.months]);
}

// ─── Modal & Confirm ────────────────────────────────────────────
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

// ─── Project Edit Form (shared between create + edit) ───────────
function ProjectForm({ initial, onSubmit, onCancel, submitLabel }: {
  initial?: Project;
  onSubmit: (data: { name: string; totalBudget: number; monthlyBudget?: number }) => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(initial?.name || '');
  const [totalBudget, setTotalBudget] = useState(initial?.totalBudget ? String(initial.totalBudget) : '');
  const [monthlyBudget, setMonthlyBudget] = useState(
    initial?.monthlyBudget ? String(initial.monthlyBudget) : ''
  );

  const inputClass = 'w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm';
  const labelClass = 'text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block';

  const submit = () => {
    const n = name.trim();
    if (!n) return;
    const total = Number(totalBudget) || 0;
    const monthly = Number(monthlyBudget) || 0;
    onSubmit({
      name: n,
      totalBudget: total,
      ...(monthly > 0 ? { monthlyBudget: monthly } : {}),
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>{t('projects.nameLabel')}</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('projects.namePlaceholder')}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>{t('projects.totalBudget')}</label>
        <input
          type="number" step="0.01"
          value={totalBudget}
          onChange={(e) => setTotalBudget(e.target.value)}
          placeholder="0.00"
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>{t('projects.monthlyBudgetOptional')}</label>
        <input
          type="number" step="0.01"
          value={monthlyBudget}
          onChange={(e) => setMonthlyBudget(e.target.value)}
          placeholder="0.00"
          className={inputClass}
        />
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <button onClick={onCancel} className="px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-secondary">
          {t('common.cancel')}
        </button>
        <button
          onClick={submit}
          disabled={!name.trim()}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

// ─── Project List Page ──────────────────────────────────────────
export default function Projects() {
  const store = useStore();
  const { t } = useI18n();
  const navigate = useNavigate();
  const allExpenses = useAllExpenses();
  const sym = store.state.settings.currencySymbol;

  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState<'active' | 'archived'>('active');

  const projects = store.state.projects;
  const visible = projects.filter((p) => (tab === 'active' ? !p.archived : p.archived));

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase size={20} className="text-primary" />
          <h1 className="text-xl font-bold">{t('projects.title')}</h1>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={16} /> {t('projects.newProject')}
        </button>
      </div>

      <div className="flex gap-1 bg-secondary/50 rounded-xl p-1 w-fit">
        {(['active', 'archived'] as const).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              tab === key ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'
            )}
          >
            {t(`projects.${key}`)}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
          {tab === 'active' ? t('projects.noProjects') : t('projects.noArchived')}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {visible.map((p, i) => {
            const { totalSpent, remaining, progress, linked } = projectStats(p, allExpenses);
            const over = remaining < 0;
            const color = getCategoryColor(i);
            return (
              <button
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}`)}
                className="text-left bg-card border border-border rounded-xl p-4 hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                  <span className="font-semibold flex-1 truncate">{p.name}</span>
                  <span className="text-xs text-muted-foreground">{linked.length}</span>
                </div>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-xs text-muted-foreground">{t('projects.totalSpent')}</span>
                  <span className="text-sm mono font-semibold">
                    {formatCurrency(totalSpent, sym)} / {formatCurrency(p.totalBudget, sym)}
                  </span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden mb-2">
                  <div
                    className={cn('h-full rounded-full transition-all', over ? 'bg-red-500' : 'bg-primary')}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="text-xs mono">
                  {over ? (
                    <span className="text-red-500 font-semibold">{t('projects.overBudget')}: {formatCurrency(Math.abs(remaining), sym)}</span>
                  ) : (
                    <span className="text-muted-foreground">{t('projects.remaining')}: {formatCurrency(remaining, sym)}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={t('projects.createProject')}>
        <ProjectForm
          onSubmit={(data) => {
            store.addProject({ ...data, archived: false });
            setShowCreate(false);
          }}
          onCancel={() => setShowCreate(false)}
          submitLabel={t('projects.createProject')}
        />
      </Modal>
    </div>
  );
}

// ─── Project Detail Page ────────────────────────────────────────
export function ProjectDetail({ userEmail }: { userEmail: string }) {
  const store = useStore();
  const { t } = useI18n();
  const { months: monthNames } = useMonthNames();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const allExpenses = useAllExpenses();
  const sym = store.state.settings.currencySymbol;
  const expCats = store.state.settings.expenseCategories;

  const project = store.state.projects.find((p) => p.id === id);

  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  // ─── Add expense form state ───
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState(expCats[0] || '');
  const [newDate, setNewDate] = useState(todayStr);
  const [newAmount, setNewAmount] = useState('');

  const stats = useMemo(() => {
    if (!project) return null;
    return projectStats(project, allExpenses);
  }, [project, allExpenses]);

  const monthlyBreakdown = useMemo(() => {
    if (!stats) return [];
    const map = new Map<string, number>();
    stats.linked.forEach((e) => {
      map.set(e.monthKey, (map.get(e.monthKey) || 0) + e.amount);
    });
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, total]) => {
        const [y, m] = key.split('-').map(Number);
        return { key, year: y, month: m, total };
      });
  }, [stats]);

  if (!project || !stats) {
    return (
      <div className="space-y-4 animate-fade-in">
        <NavLink to="/projects" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft size={16} /> {t('projects.backToProjects')}
        </NavLink>
        <div className="bg-card border border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
          {t('projects.noProjects')}
        </div>
      </div>
    );
  }

  const { totalSpent, remaining, progress, linked } = stats;
  const over = remaining < 0;

  const inputClass = 'w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm';

  const saveNewExpense = () => {
    const n = newName.trim();
    if (!n) return;
    const a = Number(newAmount) || 0;
    if (a <= 0) return;
    const [yStr, mStr] = newDate.split('-');
    const y = Number(yStr);
    const m = Number(mStr);
    if (!y || !m) return;
    store.addExpense(y, m, {
      name: n,
      category: newCategory,
      date: newDate,
      amount: a,
      addedBy: userEmail,
      projectId: project.id,
    });
    setNewName('');
    setNewAmount('');
    setNewDate(todayStr);
  };

  // Sort linked expenses by date descending
  const orderedExpenses = [...linked].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-4 animate-fade-in">
      <NavLink to="/projects" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft size={16} /> {t('projects.backToProjects')}
      </NavLink>

      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Briefcase size={18} className="text-primary" />
            </div>
            <h1 className="text-xl font-bold truncate">{project.name}</h1>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <button
              onClick={() => setShowEdit(true)}
              className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"
              aria-label={t('projects.editProject')}
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={() => store.updateProject({ ...project, archived: !project.archived })}
              className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"
              aria-label={project.archived ? t('projects.unarchive') : t('projects.archive')}
            >
              {project.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
            </button>
            <button
              onClick={() => setShowDelete(true)}
              className="p-2 rounded-lg hover:bg-destructive/10 text-destructive"
              aria-label={t('projects.deleteProject')}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <div className="text-xs text-muted-foreground mb-1">{t('projects.totalBudget')}</div>
            <div className="text-sm mono font-bold">{formatCurrency(project.totalBudget, sym)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">{t('projects.totalSpent')}</div>
            <div className="text-sm mono font-bold text-red-500">{formatCurrency(totalSpent, sym)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">
              {over ? t('projects.overBudget') : t('projects.remaining')}
            </div>
            <div className={cn('text-sm mono font-bold', over ? 'text-red-500' : 'text-emerald-500')}>
              {formatCurrency(Math.abs(remaining), sym)}
            </div>
          </div>
        </div>

        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', over ? 'bg-red-500' : 'bg-primary')}
            style={{ width: `${progress}%` }}
          />
        </div>

        {project.monthlyBudget !== undefined && project.monthlyBudget > 0 && (
          <div className="mt-3 text-xs text-muted-foreground">
            {t('projects.monthlyBudget')}: <span className="mono font-semibold text-foreground">{formatCurrency(project.monthlyBudget, sym)}</span>
          </div>
        )}
      </div>

      {/* Add expense form */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t('projects.addExpense')}</h3>
        <div className="grid sm:grid-cols-[1fr_140px_140px_120px_auto] gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('month.expenseNamePlaceholder')}
            className={inputClass}
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className={cn(inputClass, 'cursor-pointer')}
          >
            {expCats.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className={inputClass}
          />
          <input
            type="number" step="0.01"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            placeholder="0.00"
            className={cn(inputClass, 'text-right mono')}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveNewExpense(); } }}
          />
          <button
            onClick={saveNewExpense}
            disabled={!newName.trim() || !Number(newAmount)}
            className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            <Plus size={14} /> {t('common.add')}
          </button>
        </div>
      </div>

      {/* Monthly breakdown */}
      {monthlyBreakdown.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t('projects.monthlyBreakdown')}</h3>
          <div className="space-y-2">
            {monthlyBreakdown.map((row) => {
              const overMonthly = project.monthlyBudget !== undefined
                && project.monthlyBudget > 0
                && row.total > project.monthlyBudget;
              return (
                <button
                  key={row.key}
                  onClick={() => navigate(`/month/${row.year}/${row.month}`)}
                  className="w-full flex items-center justify-between p-2 -mx-2 rounded-lg hover:bg-secondary/50 transition-colors text-sm"
                >
                  <span className="text-muted-foreground">{monthNames[row.month - 1]} {row.year}</span>
                  <span className={cn('mono font-semibold', overMonthly ? 'text-red-500' : 'text-foreground')}>
                    {formatCurrency(row.total, sym)}
                    {project.monthlyBudget !== undefined && project.monthlyBudget > 0 && (
                      <span className="text-muted-foreground font-normal"> / {formatCurrency(project.monthlyBudget, sym)}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Expense list */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b border-border">
          <ShoppingCart size={16} className="text-muted-foreground" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex-1">{t('projects.expenses')}</h3>
          <span className="text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">{linked.length}</span>
        </div>
        {orderedExpenses.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">{t('projects.noExpenses')}</div>
        ) : (
          <div className="divide-y divide-border">
            {orderedExpenses.map((e) => {
              const [y, m] = e.monthKey.split('-').map(Number);
              return (
                <div key={e.id} className="flex items-center gap-3 p-3 hover:bg-secondary/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{e.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span>{e.category}</span>
                      <span>·</span>
                      <span className="mono">{e.date}</span>
                      {e.addedBy && (<><span>·</span><span className="truncate">{e.addedBy.split('@')[0]}</span></>)}
                    </div>
                  </div>
                  <div className="text-sm mono font-semibold text-red-500 flex-shrink-0">{formatCurrency(e.amount, sym)}</div>
                  <button
                    onClick={() => navigate(`/month/${y}/${m}`)}
                    className="text-xs text-primary hover:underline flex-shrink-0"
                  >
                    {monthNames[m - 1].slice(0, 3)}
                  </button>
                  <button
                    onClick={() => store.deleteExpense(y, m, e.id)}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive flex-shrink-0"
                    aria-label={t('common.delete')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title={t('projects.editProject')}>
        <ProjectForm
          initial={project}
          onSubmit={(data) => {
            store.updateProject({ ...project, ...data });
            setShowEdit(false);
          }}
          onCancel={() => setShowEdit(false)}
          submitLabel={t('common.save')}
        />
      </Modal>

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => {
          store.deleteProject(project.id);
          navigate('/projects');
        }}
        title={t('projects.confirmDeleteTitle')}
        message={t('projects.confirmDeleteMessage', { name: project.name })}
      />
    </div>
  );
}
