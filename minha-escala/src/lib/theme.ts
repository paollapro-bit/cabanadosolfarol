/** Cores por tipo de turno, usadas no cartão principal, calendário e lista. */
import type { ShiftType } from './shifts';

export type DayKind = ShiftType | 'vazio';

export const CARD_GRADIENT: Record<DayKind, string> = {
  abertura: 'bg-gradient-to-br from-orange-500 to-amber-700 text-white',
  fecho: 'bg-gradient-to-br from-indigo-600 to-violet-800 text-white',
  intermedio: 'bg-gradient-to-br from-pink-500 to-rose-700 text-white',
  folga: 'bg-gradient-to-br from-emerald-500 to-green-700 text-white',
  vazio: 'bg-[var(--surface)] text-[var(--ink)] border-2 border-dashed border-[var(--line)]',
};

/** Fundo suave + texto escuro (calendário, etiquetas). */
export const CHIP: Record<DayKind, string> = {
  abertura: 'bg-amber-100 text-amber-900 dark:bg-amber-500/25 dark:text-amber-100',
  fecho: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-500/30 dark:text-indigo-100',
  intermedio: 'bg-pink-100 text-pink-900 dark:bg-pink-500/25 dark:text-pink-100',
  folga: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/25 dark:text-emerald-100',
  vazio: 'bg-transparent text-[var(--muted)]',
};

export const DOT: Record<DayKind, string> = {
  abertura: 'bg-amber-500',
  fecho: 'bg-indigo-500',
  intermedio: 'bg-pink-500',
  folga: 'bg-emerald-500',
  vazio: 'border border-dashed border-[var(--muted)]',
};

export type ThemePref = 'sistema' | 'claro' | 'escuro';
const KEY = 'me-tema';

export function getThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'claro' || v === 'escuro' ? v : 'sistema';
  } catch {
    return 'sistema';
  }
}

export function applyTheme(pref: ThemePref) {
  try {
    localStorage.setItem(KEY, pref);
  } catch {
    /* modo privado: aplica só nesta sessão */
  }
  const dark = pref === 'escuro' || (pref === 'sistema' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    m.setAttribute('content', dark ? '#000000' : '#f2f2f7');
    m.removeAttribute('media');
  });
}
