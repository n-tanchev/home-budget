import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, symbol = '€'): string {
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${amount < 0 ? '-' : ''}${symbol}${formatted}`;
}

export function formatCompact(amount: number, symbol = '€'): string {
  if (Math.abs(amount) >= 1000) {
    return `${symbol}${(amount / 1000).toFixed(1)}k`;
  }
  return `${symbol}${amount.toFixed(0)}`;
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

export function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Category colors for charts
const COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#84cc16', '#14b8a6',
  '#e11d48', '#7c3aed', '#0ea5e9', '#d946ef', '#f43f5e',
];

export function getCategoryColor(index: number): string {
  return COLORS[index % COLORS.length];
}

export function getCategoryColorMap(categories: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  categories.forEach((cat, i) => {
    map[cat] = COLORS[i % COLORS.length];
  });
  return map;
}
