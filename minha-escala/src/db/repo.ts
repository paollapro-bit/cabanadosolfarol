import { db as defaultDb, type DayEntry, type EscalaDB } from './db';
import type { ISODate } from '../lib/dates';
import { DEFAULT_BREAK_MINUTES, DEFAULT_SHIFTS, type ShiftDef } from '../lib/shifts';

/** Define o turno de um ou vários dias, mantendo as observações existentes. */
export async function setDaysCode(dates: ISODate[], code: string | null, database: EscalaDB = defaultDb) {
  const now = Date.now();
  await database.transaction('rw', database.days, async () => {
    const existing = await database.days.bulkGet(dates);
    const puts: DayEntry[] = [];
    const deletes: string[] = [];
    dates.forEach((date, i) => {
      const prev = existing[i];
      const note = prev?.note?.trim() ? prev.note : undefined;
      if (code === null && !note) deletes.push(date);
      else puts.push({ date, code, note, source: 'utilizadora', updatedAt: now });
    });
    if (puts.length) await database.days.bulkPut(puts);
    if (deletes.length) await database.days.bulkDelete(deletes);
  });
}

export async function setDayNote(date: ISODate, note: string, database: EscalaDB = defaultDb) {
  await database.transaction('rw', database.days, async () => {
    const prev = await database.days.get(date);
    const clean = note.trim() ? note : undefined;
    if (!prev && !clean) return;
    if (prev && prev.code === null && !clean) {
      await database.days.delete(date);
      return;
    }
    await database.days.put({
      date,
      code: prev?.code ?? null,
      note: clean,
      source: prev?.source ?? 'utilizadora',
      updatedAt: Date.now(),
    });
  });
}

/** Marca um dia transcrito da fotografia como conferido. */
export async function confirmDay(date: ISODate, database: EscalaDB = defaultDb) {
  await database.days.update(date, { source: 'conferido', updatedAt: Date.now() });
}

export async function confirmDays(dates: ISODate[], database: EscalaDB = defaultDb) {
  await database.transaction('rw', database.days, async () => {
    for (const d of dates) await database.days.update(d, { source: 'conferido', updatedAt: Date.now() });
  });
}

export async function getSetting<T>(key: string, fallback: T, database: EscalaDB = defaultDb): Promise<T> {
  const row = await database.settings.get(key);
  return row === undefined ? fallback : (row.value as T);
}

export async function putSetting(key: string, value: unknown, database: EscalaDB = defaultDb) {
  await database.settings.put({ key, value });
}

export const BREAK_KEY = 'intervaloMinutos';
export const LAST_BACKUP_KEY = 'ultimaCopia';

export async function getBreakMinutes(database: EscalaDB = defaultDb): Promise<number> {
  return getSetting(BREAK_KEY, DEFAULT_BREAK_MINUTES, database);
}

export async function saveShift(shift: ShiftDef, database: EscalaDB = defaultDb) {
  await database.shifts.put(shift);
}

export async function resetShifts(database: EscalaDB = defaultDb) {
  await database.shifts.bulkPut(DEFAULT_SHIFTS);
}

/**
 * Grava dias lidos de uma fotografia. Ficam marcados como 'importado' (ponto
 * azul, por conferir); as observações existentes mantêm-se.
 */
export async function setDaysImported(entries: { date: ISODate; code: string | null }[], database: EscalaDB = defaultDb) {
  const now = Date.now();
  await database.transaction('rw', database.days, async () => {
    const existing = await database.days.bulkGet(entries.map((e) => e.date));
    const puts: DayEntry[] = [];
    const deletes: string[] = [];
    entries.forEach(({ date, code }, i) => {
      const note = existing[i]?.note?.trim() ? existing[i]!.note : undefined;
      if (code === null && !note) deletes.push(date);
      else puts.push({ date, code, note, source: 'importado', updatedAt: now });
    });
    if (puts.length) await database.days.bulkPut(puts);
    if (deletes.length) await database.days.bulkDelete(deletes);
  });
}
