import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db, type DayEntry } from '../db/db';
import { BREAK_KEY } from '../db/repo';
import { DEFAULT_BREAK_MINUTES, shiftMap, type ShiftDef } from '../lib/shifts';
import type { ISODate } from '../lib/dates';

export function useShifts(): { list: ShiftDef[]; map: Map<string, ShiftDef> } | undefined {
  const list = useLiveQuery(() => db.shifts.toArray(), []);
  return useMemo(() => {
    if (!list) return undefined;
    const order = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C', 'D'];
    const sorted = [...list].sort((a, b) => {
      const ia = order.indexOf(a.code);
      const ib = order.indexOf(b.code);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.code.localeCompare(b.code);
    });
    return { list: sorted, map: shiftMap(sorted) };
  }, [list]);
}

export function useDaysRange(from: ISODate, to: ISODate): Map<ISODate, DayEntry> | undefined {
  const rows = useLiveQuery(() => db.days.where('date').between(from, to, true, true).toArray(), [from, to]);
  return useMemo(() => (rows ? new Map(rows.map((r) => [r.date, r])) : undefined), [rows]);
}

export function useDay(date: ISODate): DayEntry | null | undefined {
  return useLiveQuery(async () => (await db.days.get(date)) ?? null, [date]);
}

export function useBreakMinutes(): number {
  const v = useLiveQuery(() => db.settings.get(BREAK_KEY), []);
  return typeof v?.value === 'number' ? v.value : DEFAULT_BREAK_MINUTES;
}
