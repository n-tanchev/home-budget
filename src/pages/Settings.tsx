import { useState, useRef } from 'react';
import { useStore } from '@/lib/store';
import { exportData, importData } from '@/lib/firebase';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import {
  Plus, X, Download, Upload, Trash2, Tag, CreditCard, Globe,
  ShieldCheck, AlertTriangle,
} from 'lucide-react';

export default function Settings() {
  const { state, updateSettings, importState } = useStore();
  const { t } = useI18n();
  const { settings } = state;
  const fileRef = useRef<HTMLInputElement>(null);

  // ─── Category editing ─────────────────────────────────────────
  const [newExpCat, setNewExpCat] = useState('');
  const [newBillCat, setNewBillCat] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const addExpenseCategory = () => {
    if (!newExpCat.trim() || settings.expenseCategories.includes(newExpCat.trim())) return;
    updateSettings({ expenseCategories: [...settings.expenseCategories, newExpCat.trim()] });
    setNewExpCat('');
  };

  const removeExpenseCategory = (cat: string) => {
    updateSettings({ expenseCategories: settings.expenseCategories.filter((c) => c !== cat) });
  };

  const addBillCategory = () => {
    if (!newBillCat.trim() || settings.billCategories.includes(newBillCat.trim())) return;
    updateSettings({ billCategories: [...settings.billCategories, newBillCat.trim()] });
    setNewBillCat('');
  };

  const removeBillCategory = (cat: string) => {
    updateSettings({ billCategories: settings.billCategories.filter((c) => c !== cat) });
  };

  const addEmail = () => {
    if (!newEmail.trim() || settings.allowedEmails.includes(newEmail.trim().toLowerCase())) return;
    updateSettings({ allowedEmails: [...settings.allowedEmails, newEmail.trim().toLowerCase()] });
    setNewEmail('');
  };

  const removeEmail = (email: string) => {
    updateSettings({ allowedEmails: settings.allowedEmails.filter((e) => e !== email) });
  };

  // ─── Currency ─────────────────────────────────────────────────
  const currencies = [
    { code: 'EUR', symbol: '€' },
    { code: 'USD', symbol: '$' },
    { code: 'GBP', symbol: '£' },
    { code: 'BGN', symbol: 'лв' },
    { code: 'PLN', symbol: 'zł' },
    { code: 'UAH', symbol: '₴' },
    { code: 'JPY', symbol: '¥' },
    { code: 'CAD', symbol: 'C$' },
    { code: 'AUD', symbol: 'A$' },
    { code: 'CHF', symbol: 'CHF' },
    { code: 'CZK', symbol: 'Kč' },
    { code: 'RON', symbol: 'lei' },
  ];

  // ─── Import/Export ────────────────────────────────────────────
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleExport = () => {
    exportData(state);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await importData(file);
      importState(data);
      setImportStatus('success');
      setTimeout(() => setImportStatus('idle'), 3000);
    } catch {
      setImportStatus('error');
      setTimeout(() => setImportStatus('idle'), 3000);
    }
    // Reset input
    if (fileRef.current) fileRef.current.value = '';
  };

  const [confirmReset, setConfirmReset] = useState(false);

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    importState({
      settings: { ...settings },
      months: {},
      currentYear: new Date().getFullYear(),
      projects: [],
    });
    setConfirmReset(false);
  };

  const inputClass = 'w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm';
  const labelClass = 'text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block';

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight">{t('settings.title')}</h1>

      {/* Currency */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Globe size={16} className="text-primary" />
          <h2 className="font-semibold">{t('settings.currency')}</h2>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {currencies.map(({ code, symbol }) => (
            <button
              key={code}
              onClick={() => updateSettings({ currency: code, currencySymbol: symbol })}
              className={cn(
                'px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors',
                settings.currency === code
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:bg-secondary text-muted-foreground'
              )}
            >
              {symbol} {code}
            </button>
          ))}
        </div>
      </div>

      {/* Expense Categories */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Tag size={16} className="text-red-500" />
          <h2 className="font-semibold">{t('settings.expenseCategories')}</h2>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {settings.expenseCategories.map((cat) => (
            <span key={cat} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-sm group">
              {cat}
              <button onClick={() => removeExpenseCategory(cat)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                <X size={14} className="text-destructive" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newExpCat}
            onChange={(e) => setNewExpCat(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addExpenseCategory()}
            placeholder={t('settings.newCategoryPlaceholder')}
            className={inputClass}
          />
          <button
            onClick={addExpenseCategory}
            disabled={!newExpCat.trim()}
            className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm disabled:opacity-40 flex-shrink-0"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Bill Categories */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard size={16} className="text-amber-500" />
          <h2 className="font-semibold">{t('settings.billCategories')}</h2>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {settings.billCategories.map((cat) => (
            <span key={cat} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-sm group">
              {cat}
              <button onClick={() => removeBillCategory(cat)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                <X size={14} className="text-destructive" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newBillCat}
            onChange={(e) => setNewBillCat(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addBillCategory()}
            placeholder={t('settings.newCategoryPlaceholder')}
            className={inputClass}
          />
          <button
            onClick={addBillCategory}
            disabled={!newBillCat.trim()}
            className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm disabled:opacity-40 flex-shrink-0"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Allowed Emails */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck size={16} className="text-emerald-500" />
          <h2 className="font-semibold">{t('settings.allowedEmails')}</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          {t('settings.allowedEmailsDesc')}
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {settings.allowedEmails.length === 0 && (
            <span className="text-sm text-muted-foreground">{t('settings.noEmailsConfigured')}</span>
          )}
          {settings.allowedEmails.map((email) => (
            <span key={email} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-sm group">
              {email}
              <button onClick={() => removeEmail(email)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                <X size={14} className="text-destructive" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addEmail()}
            placeholder={t('settings.emailPlaceholder')}
            className={inputClass}
          />
          <button
            onClick={addEmail}
            disabled={!newEmail.trim()}
            className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm disabled:opacity-40 flex-shrink-0"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Import / Export */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="font-semibold mb-4">{t('settings.dataManagement')}</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:bg-secondary text-sm font-medium transition-colors"
          >
            <Download size={16} /> {t('settings.exportJson')}
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:bg-secondary text-sm font-medium transition-colors"
          >
            <Upload size={16} /> {t('settings.importJson')}
          </button>
          <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
        </div>
        {importStatus === 'success' && (
          <div className="mt-3 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm">
            {t('settings.importSuccess')}
          </div>
        )}
        {importStatus === 'error' && (
          <div className="mt-3 px-4 py-2 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {t('settings.importError')}
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="bg-card border border-destructive/20 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={16} className="text-destructive" />
          <h2 className="font-semibold text-destructive">{t('settings.dangerZone')}</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          {t('settings.dangerZoneDesc')}
        </p>
        <button
          onClick={handleReset}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
            confirmReset
              ? 'bg-destructive text-destructive-foreground'
              : 'border border-destructive/30 text-destructive hover:bg-destructive/10'
          )}
        >
          <Trash2 size={16} />
          {confirmReset ? t('settings.confirmReset') : t('settings.resetAllData')}
        </button>
      </div>
    </div>
  );
}
