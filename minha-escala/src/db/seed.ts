import type { DayEntry, EscalaDB } from './db';
import { DEFAULT_SHIFTS, SHIFT_CODES } from '../lib/shifts';
import { monthDates, type ISODate } from '../lib/dates';
import { bundledMonthFiles, parsePublishedMonth, type PublishedMonth } from '../data/published';

export const SEED_FLAG_SHIFTS = 'seed:turnos';
/** Marca da primeira versão da app (novembro importado de forma fixa). */
export const SEED_FLAG_NOV_2026 = 'seed:novembro-2026';
export const MONTH_FLAG_PREFIX = 'escala:';
export const IMPORT_NOTICE_KEY = 'aviso:escala';

export interface MonthImportReport {
  month: string;
  version: number;
  /** Primeira vez que o mês chega (true) ou correção de um mês já existente. */
  isNew: boolean;
  added: number;
  updated: number;
  removed: number;
  /** Dias em que a escala publicada difere de uma alteração feita pela Lorena (mantida). */
  kept: ISODate[];
}

export interface ImportNotice {
  at: number;
  reports: MonthImportReport[];
}

/**
 * Aplica um mês publicado. Regras:
 * - dias alterados à mão pela utilizadora ('utilizadora') nunca são tocados;
 * - dias importados ou conferidos passam a ter o código publicado;
 * - dias que deixaram de constar da escala publicada ficam sem escala
 *   (as observações são mantidas).
 */
export async function applyPublishedMonth(database: EscalaDB, pub: PublishedMonth, isNew: boolean, now = Date.now()) {
  const report: MonthImportReport = { month: pub.month, version: pub.version, isNew, added: 0, updated: 0, removed: 0, kept: [] };
  const dates = monthDates(pub.year, pub.monthNumber);
  const existing = await database.days.bulkGet(dates);
  const puts: DayEntry[] = [];
  const deletes: ISODate[] = [];
  dates.forEach((date, i) => {
    const prev = existing[i];
    const code = pub.days.get(date);
    const note = prev?.note ?? pub.notes.get(date);
    if (prev?.source === 'utilizadora') {
      if (code !== undefined && code !== prev.code) report.kept.push(date);
      return;
    }
    if (code !== undefined) {
      if (!prev || prev.code === null) report.added++;
      else if (prev.code !== code) report.updated++;
      else if (note === prev.note) return; // igual ao que já está (mantém "conferido")
      puts.push({ date, code, note, source: prev?.code === code ? prev.source : 'importado', updatedAt: now });
    } else if (prev && prev.code !== null) {
      report.removed++;
      if (prev.note) puts.push({ ...prev, code: null, updatedAt: now });
      else deletes.push(date);
    }
  });
  if (puts.length) await database.days.bulkPut(puts);
  if (deletes.length) await database.days.bulkDelete(deletes);
  await database.settings.put({ key: MONTH_FLAG_PREFIX + pub.month, value: pub.version });
  return report;
}

/**
 * Corre a cada arranque. Cria os turnos predefinidos uma única vez e aplica os
 * meses publicados cuja versão ainda não foi aplicada neste dispositivo.
 */
export async function initDatabase(
  database: EscalaDB,
  now = Date.now(),
  files = bundledMonthFiles(),
): Promise<MonthImportReport[]> {
  const months = files.map((f) => parsePublishedMonth(f, SHIFT_CODES));
  return database.transaction('rw', database.days, database.shifts, database.settings, async () => {
    if (!(await database.settings.get(SEED_FLAG_SHIFTS))) {
      for (const shift of DEFAULT_SHIFTS) {
        if (!(await database.shifts.get(shift.code))) await database.shifts.add(shift);
      }
      await database.settings.put({ key: SEED_FLAG_SHIFTS, value: now });
    }

    // Instalações da primeira versão: novembro v1 já foi importado.
    if ((await database.settings.get(SEED_FLAG_NOV_2026)) && !(await database.settings.get(MONTH_FLAG_PREFIX + '2026-11'))) {
      await database.settings.put({ key: MONTH_FLAG_PREFIX + '2026-11', value: 1 });
    }

    const reports: MonthImportReport[] = [];
    for (const pub of months) {
      const applied = (await database.settings.get(MONTH_FLAG_PREFIX + pub.month))?.value;
      if (typeof applied === 'number' && applied >= pub.version) continue;
      reports.push(await applyPublishedMonth(database, pub, typeof applied !== 'number', now));
    }

    // Aviso no ecrã inicial — só para atualizações depois da instalação.
    const firstRun = !(await database.settings.get(SEED_FLAG_NOV_2026));
    if (firstRun) await database.settings.put({ key: SEED_FLAG_NOV_2026, value: now });
    const visible = reports.filter((r) => r.added + r.updated + r.removed + r.kept.length > 0);
    if (!firstRun && visible.length) {
      const prev = (await database.settings.get(IMPORT_NOTICE_KEY))?.value as ImportNotice | undefined;
      const merged = [...(prev?.reports ?? []).filter((r) => !visible.some((v) => v.month === r.month)), ...visible];
      await database.settings.put({ key: IMPORT_NOTICE_KEY, value: { at: now, reports: merged } satisfies ImportNotice });
    }
    return reports;
  });
}
