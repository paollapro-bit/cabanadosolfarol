/**
 * Datas como texto "AAAA-MM-DD" (ISODate). Toda a aritmética é feita em UTC
 * para não ser afetada pela mudança de hora; o "hoje" é sempre calculado no
 * fuso Europe/Lisbon, independentemente do fuso do dispositivo.
 */
export type ISODate = string;

export const TIME_ZONE = 'Europe/Lisbon';
export const LOCALE = 'pt-PT';

const partsFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Data e minutos desde a meia-noite, em Lisboa, para um instante. */
export function lisbonNow(now: Date = new Date()): { date: ISODate; minutes: number } {
  const p: Record<string, string> = {};
  for (const part of partsFmt.formatToParts(now)) p[part.type] = part.value;
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    minutes: Number(p.hour) * 60 + Number(p.minute),
  };
}

export function todayInLisbon(now: Date = new Date()): ISODate {
  return lisbonNow(now).date;
}

export function toISO(year: number, month: number, day: number): ISODate {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function parseISO(iso: ISODate): { year: number; month: number; day: number } {
  const [year, month, day] = iso.split('-').map(Number);
  return { year, month, day };
}

function toUTC(iso: ISODate): Date {
  const { year, month, day } = parseISO(iso);
  return new Date(Date.UTC(year, month - 1, day));
}

function fromUTC(d: Date): ISODate {
  return toISO(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function addDays(iso: ISODate, n: number): ISODate {
  const d = toUTC(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return fromUTC(d);
}

/** 0 = segunda-feira … 6 = domingo (semana portuguesa). */
export function weekdayIndex(iso: ISODate): number {
  return (toUTC(iso).getUTCDay() + 6) % 7;
}

export function startOfWeek(iso: ISODate): ISODate {
  return addDays(iso, -weekdayIndex(iso));
}

export function weekDates(iso: ISODate): ISODate[] {
  const start = startOfWeek(iso);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function monthDates(year: number, month: number): ISODate[] {
  return Array.from({ length: daysInMonth(year, month) }, (_, i) => toISO(year, month, i + 1));
}

/** Grelha do mês em semanas de segunda a domingo; `null` nas casas vazias. */
export function monthGrid(year: number, month: number): (ISODate | null)[][] {
  const dates = monthDates(year, month);
  const cells: (ISODate | null)[] = Array(weekdayIndex(dates[0])).fill(null);
  cells.push(...dates);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (ISODate | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const longFmt = new Intl.DateTimeFormat(LOCALE, { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
const longYearFmt = new Intl.DateTimeFormat(LOCALE, { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const shortWeekdayFmt = new Intl.DateTimeFormat(LOCALE, { timeZone: 'UTC', weekday: 'short' });
const monthFmt = new Intl.DateTimeFormat(LOCALE, { timeZone: 'UTC', month: 'long' });

/** "Quinta-feira, 5 de novembro" */
export function formatLongDate(iso: ISODate, withYear = false): string {
  return capitalize((withYear ? longYearFmt : longFmt).format(toUTC(iso)));
}

/** "Seg", "Ter", … */
export function formatShortWeekday(iso: ISODate): string {
  return capitalize(shortWeekdayFmt.format(toUTC(iso)).replace('.', ''));
}

export function monthName(month: number): string {
  return monthFmt.format(new Date(Date.UTC(2000, month - 1, 1)));
}

/** "novembro de 2026" */
export function formatMonthYear(year: number, month: number): string {
  return `${monthName(month)} de ${year}`;
}

export const WEEKDAY_INITIALS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
export const WEEKDAY_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

/** Diferença em dias entre duas datas (b − a). */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((toUTC(b).getTime() - toUTC(a).getTime()) / 86_400_000);
}

/** "hoje", "amanhã", "daqui a 3 dias", "sábado, 14 de novembro" */
export function relativeDayLabel(today: ISODate, target: ISODate): string {
  const d = diffDays(today, target);
  if (d === 0) return 'Hoje';
  if (d === 1) return 'Amanhã';
  if (d > 1 && d < 7) return `${formatLongDate(target)} · daqui a ${d} dias`;
  return formatLongDate(target);
}
