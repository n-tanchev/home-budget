import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { en, type Translations } from './en';
import { bg } from './bg';

export type Locale = 'en' | 'bg';

const translations: Record<Locale, Translations> = { en, bg };

const STORAGE_KEY = 'locale';

function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'en' || stored === 'bg') return stored;
  const browserLang = navigator.language || '';
  if (browserLang.startsWith('bg')) return 'bg';
  return 'en';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getNestedValue(obj: any, path: string): string | undefined {
  return path.split('.').reduce((acc, key) => acc?.[key], obj) as string | undefined;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return params[key] !== undefined ? String(params[key]) : `{${key}}`;
  });
}

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const value = getNestedValue(translations[locale], key);
    if (typeof value === 'string') return interpolate(value, params);
    // Fallback to English
    const fallback = getNestedValue(translations.en, key);
    if (typeof fallback === 'string') return interpolate(fallback, params);
    return key;
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextType {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

// Month name helpers — replaces MONTHS / MONTH_SHORT from types.ts
const MONTH_KEYS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
] as const;

const MONTH_SHORT_KEYS = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
] as const;

export function useMonthNames() {
  const { t } = useI18n();
  const months = useMemo(() => MONTH_KEYS.map((k) => t(`months.${k}`)), [t]);
  const monthsShort = useMemo(() => MONTH_SHORT_KEYS.map((k) => t(`monthsShort.${k}`)), [t]);
  return { months, monthsShort };
}
