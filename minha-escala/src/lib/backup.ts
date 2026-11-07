import type { DayEntry, EscalaDB, Setting } from '../db/db';
import { SEED_FLAG_NOV_2026, SEED_FLAG_SHIFTS } from '../db/seed';
import type { ShiftDef } from './shifts';

export const BACKUP_APP_ID = 'minha-escala';
export const BACKUP_VERSION = 1;

export interface Backup {
  app: typeof BACKUP_APP_ID;
  version: number;
  exportedAt: string;
  days: DayEntry[];
  shifts: ShiftDef[];
  settings: Setting[];
}

export async function createBackup(database: EscalaDB): Promise<Backup> {
  const [days, shifts, settings] = await Promise.all([
    database.days.orderBy('date').toArray(),
    database.shifts.toArray(),
    database.settings.toArray(),
  ]);
  return { app: BACKUP_APP_ID, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), days, shifts, settings };
}

export class BackupError extends Error {}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const TYPES = ['abertura', 'fecho', 'intermedio', 'folga'];

/** Valida um ficheiro de cópia de segurança. Lança `BackupError` com mensagem em português. */
export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError('O ficheiro não é uma cópia de segurança válida (JSON ilegível).');
  }
  const b = data as Partial<Backup>;
  if (!b || b.app !== BACKUP_APP_ID) throw new BackupError('Este ficheiro não é uma cópia da Minha Escala.');
  if (typeof b.version !== 'number' || b.version > BACKUP_VERSION)
    throw new BackupError('Esta cópia foi criada por uma versão mais recente da aplicação.');
  if (!Array.isArray(b.days) || !Array.isArray(b.shifts) || !Array.isArray(b.settings))
    throw new BackupError('A cópia está incompleta.');
  for (const d of b.days) {
    if (!d || typeof d.date !== 'string' || !DATE_RE.test(d.date) || !(d.code === null || typeof d.code === 'string'))
      throw new BackupError('A cópia contém dias com formato inválido.');
  }
  for (const s of b.shifts) {
    const timesOk = s.type === 'folga' || (s.start && s.end && TIME_RE.test(s.start) && TIME_RE.test(s.end));
    if (!s || typeof s.code !== 'string' || !TYPES.includes(s.type) || !timesOk)
      throw new BackupError('A cópia contém turnos com formato inválido.');
  }
  return b as Backup;
}

/** Substitui todos os dados pela cópia. As fotografias guardadas não são afetadas. */
export async function restoreBackup(database: EscalaDB, backup: Backup): Promise<void> {
  const now = Date.now();
  await database.transaction('rw', database.days, database.shifts, database.settings, async () => {
    await Promise.all([database.days.clear(), database.shifts.clear(), database.settings.clear()]);
    await database.days.bulkPut(
      backup.days.map((d) => ({
        date: d.date,
        code: d.code,
        note: d.note || undefined,
        source: d.source === 'importado' || d.source === 'conferido' ? d.source : 'utilizadora',
        updatedAt: d.updatedAt ?? now,
      })),
    );
    await database.shifts.bulkPut(backup.shifts);
    await database.settings.bulkPut(backup.settings);
    // Garante que a escala inicial nunca volta a ser importada por cima da cópia.
    await database.settings.put({ key: SEED_FLAG_SHIFTS, value: now });
    await database.settings.put({ key: SEED_FLAG_NOV_2026, value: now });
  });
}

export function backupFileName(date = new Date()): string {
  const d = date.toISOString().slice(0, 10);
  return `minha-escala-copia-${d}.json`;
}
