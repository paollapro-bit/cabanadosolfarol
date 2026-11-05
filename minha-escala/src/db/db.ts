import Dexie, { type Table } from 'dexie';
import type { ShiftDef } from '../lib/shifts';
import type { ISODate } from '../lib/dates';

/**
 * Um dia da escala. A ausência de registo significa "sem escala";
 * `code: null` com nota significa "sem escala, mas com observação".
 */
export interface DayEntry {
  date: ISODate;
  code: string | null;
  note?: string;
  /** 'importado' = transcrito da fotografia e ainda por conferir. */
  source: 'importado' | 'utilizadora';
  updatedAt: number;
}

export interface Setting {
  key: string;
  value: unknown;
}

/** Fotografia de referência de uma escala (sem reconhecimento automático). */
export interface Attachment {
  id?: number;
  /** "AAAA-MM" */
  month: string;
  name: string;
  type: string;
  blob: Blob;
  createdAt: number;
}

export class EscalaDB extends Dexie {
  days!: Table<DayEntry, string>;
  shifts!: Table<ShiftDef, string>;
  settings!: Table<Setting, string>;
  attachments!: Table<Attachment, number>;

  constructor(name = 'minha-escala') {
    super(name);
    this.version(1).stores({
      days: 'date',
      shifts: 'code',
      settings: 'key',
      attachments: '++id, month',
    });
  }
}

export const db = new EscalaDB();
