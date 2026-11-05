import type { DayEntry } from '../db/db';
import { monthDates, type ISODate } from './dates';
import { netMinutes, type ShiftDef, type ShiftType } from './shifts';

export interface MonthSummary {
  totalDays: number;
  worked: number;
  off: number;
  noData: number;
  unverified: number;
  netMinutes: number;
  byType: Record<Exclude<ShiftType, 'folga'>, number>;
}

export function summarizeMonth(
  year: number,
  month: number,
  days: Map<ISODate, DayEntry>,
  shifts: Map<string, ShiftDef>,
  breakMinutes: number,
): MonthSummary {
  const s: MonthSummary = {
    totalDays: 0,
    worked: 0,
    off: 0,
    noData: 0,
    unverified: 0,
    netMinutes: 0,
    byType: { abertura: 0, fecho: 0, intermedio: 0 },
  };
  for (const date of monthDates(year, month)) {
    s.totalDays++;
    const entry = days.get(date);
    const shift = entry?.code ? shifts.get(entry.code) : undefined;
    if (entry?.source === 'importado') s.unverified++;
    if (!shift) {
      s.noData++;
    } else if (shift.type === 'folga') {
      s.off++;
    } else {
      s.worked++;
      s.byType[shift.type]++;
      s.netMinutes += netMinutes(shift, breakMinutes);
    }
  }
  return s;
}

/** Procura, a partir do dia seguinte a `from`, o primeiro dia que satisfaz o critério. */
export function findNext(
  from: ISODate,
  days: DayEntry[],
  shifts: Map<string, ShiftDef>,
  want: 'folga' | 'turno',
): DayEntry | undefined {
  const sorted = days.filter((d) => d.date > from).sort((a, b) => a.date.localeCompare(b.date));
  return sorted.find((d) => {
    const shift = d.code ? shifts.get(d.code) : undefined;
    if (!shift) return false;
    return want === 'folga' ? shift.type === 'folga' : shift.type !== 'folga';
  });
}

/** Estado do turno de hoje em relação à hora atual (minutos desde a meia-noite em Lisboa). */
export function shiftProgress(shift: ShiftDef, nowMinutes: number): string | null {
  if (!shift.start || !shift.end) return null;
  const [sh, sm] = shift.start.split(':').map(Number);
  const [eh, em] = shift.end.split(':').map(Number);
  const start = sh * 60 + sm;
  let end = eh * 60 + em;
  if (end <= start) end += 24 * 60;
  const fmt = (m: number) => {
    const h = Math.floor(m / 60);
    const r = m % 60;
    if (h === 0) return `${r} min`;
    return r === 0 ? `${h} h` : `${h} h ${r} min`;
  };
  if (nowMinutes < start) return `Entras daqui a ${fmt(start - nowMinutes)}`;
  if (nowMinutes < end) return `Em curso · faltam ${fmt(end - nowMinutes)}`;
  return 'Turno concluído';
}

