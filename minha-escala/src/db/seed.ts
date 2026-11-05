import type { EscalaDB } from './db';
import { DEFAULT_SHIFTS } from '../lib/shifts';

export const SEED_FLAG_SHIFTS = 'seed:turnos';
export const SEED_FLAG_NOV_2026 = 'seed:novembro-2026';

/** Escala de novembro de 2026, transcrita de uma fotografia (dias 1 a 5 sem dados). */
export const NOVEMBER_2026: Record<string, string> = {
  '2026-11-06': 'A3',
  '2026-11-07': 'B3',
  '2026-11-08': 'C',
  '2026-11-09': 'B3',
  '2026-11-10': 'D',
  '2026-11-11': 'B3',
  '2026-11-12': 'A3',
  '2026-11-13': 'D',
  '2026-11-14': 'A3',
  '2026-11-15': 'B3',
  '2026-11-16': 'D',
  '2026-11-17': 'D',
  '2026-11-18': 'B3',
  '2026-11-19': 'B1',
  '2026-11-20': 'D',
  '2026-11-21': 'B3',
  '2026-11-22': 'A3',
  '2026-11-23': 'B3',
  '2026-11-24': 'D',
  '2026-11-25': 'B2',
  '2026-11-26': 'A3',
  '2026-11-27': 'D',
  '2026-11-28': 'D',
  '2026-11-29': 'B3',
  '2026-11-30': 'A3',
};

/**
 * Prepara a base de dados na primeira abertura. Cada passo corre uma única vez
 * (fica marcado em `settings`) e nunca substitui dias que já existam, por isso
 * as correções da utilizadora sobrevivem a atualizações da aplicação.
 */
export async function initDatabase(database: EscalaDB, now = Date.now()): Promise<void> {
  await database.transaction('rw', database.days, database.shifts, database.settings, async () => {
    if (!(await database.settings.get(SEED_FLAG_SHIFTS))) {
      for (const shift of DEFAULT_SHIFTS) {
        if (!(await database.shifts.get(shift.code))) await database.shifts.add(shift);
      }
      await database.settings.put({ key: SEED_FLAG_SHIFTS, value: now });
    }

    if (!(await database.settings.get(SEED_FLAG_NOV_2026))) {
      const existing = new Set(await database.days.where('date').anyOf(Object.keys(NOVEMBER_2026)).primaryKeys());
      const toAdd = Object.entries(NOVEMBER_2026)
        .filter(([date]) => !existing.has(date))
        .map(([date, code]) => ({ date, code, source: 'importado' as const, updatedAt: now }));
      await database.days.bulkAdd(toAdd);
      await database.settings.put({ key: SEED_FLAG_NOV_2026, value: now });
    }
  });
}
