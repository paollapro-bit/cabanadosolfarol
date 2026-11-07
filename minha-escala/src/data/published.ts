import { daysInMonth, toISO, type ISODate } from '../lib/dates';

/**
 * Escalas publicadas com a aplicação: um ficheiro JSON por mês em
 * `src/data/escalas/AAAA-MM.json`. Para atualizar a escala de um mês, cria-se
 * (ou corrige-se) o ficheiro, aumenta-se `versao` e publica-se a aplicação.
 * Ver ESCALAS.md.
 */
export interface PublishedMonthFile {
  /** "AAAA-MM" */
  mes: string;
  /** Aumentar sempre que o ficheiro é corrigido, para a app reaplicar o mês. */
  versao: number;
  /** De onde veio (fotografia, PDF…) — só para referência. */
  origem?: string;
  /** Dia do mês ("01"–"31") → código do turno (A1…D). Dias omitidos ficam sem escala. */
  dias: Record<string, string>;
  /** Observações opcionais por dia. */
  observacoes?: Record<string, string>;
}

export interface PublishedMonth {
  month: string;
  year: number;
  monthNumber: number;
  version: number;
  origin?: string;
  days: Map<ISODate, string>;
  notes: Map<ISODate, string>;
}

export class PublishedMonthError extends Error {}

export function parsePublishedMonth(file: PublishedMonthFile, validCodes: string[], fileName = file.mes): PublishedMonth {
  const m = /^(\d{4})-(\d{2})$/.exec(file.mes ?? '');
  if (!m) throw new PublishedMonthError(`${fileName}: "mes" deve ser AAAA-MM`);
  const year = Number(m[1]);
  const monthNumber = Number(m[2]);
  if (monthNumber < 1 || monthNumber > 12) throw new PublishedMonthError(`${fileName}: mês inválido`);
  if (!Number.isInteger(file.versao) || file.versao < 1) throw new PublishedMonthError(`${fileName}: "versao" deve ser um inteiro ≥ 1`);
  const last = daysInMonth(year, monthNumber);
  const toDate = (key: string) => {
    const d = Number(key);
    if (!/^\d{1,2}$/.test(key) || d < 1 || d > last) throw new PublishedMonthError(`${fileName}: dia "${key}" não existe neste mês`);
    return toISO(year, monthNumber, d);
  };
  const days = new Map<ISODate, string>();
  for (const [key, code] of Object.entries(file.dias ?? {})) {
    if (!validCodes.includes(code)) throw new PublishedMonthError(`${fileName}: código "${code}" desconhecido no dia ${key}`);
    days.set(toDate(key), code);
  }
  const notes = new Map<ISODate, string>();
  for (const [key, note] of Object.entries(file.observacoes ?? {})) {
    if (note.trim()) notes.set(toDate(key), note.trim());
  }
  return { month: file.mes, year, monthNumber, version: file.versao, origin: file.origem, days, notes };
}

const files = import.meta.glob<PublishedMonthFile>('./escalas/*.json', { eager: true, import: 'default' });

export function bundledMonthFiles(): PublishedMonthFile[] {
  return Object.values(files).sort((a, b) => a.mes.localeCompare(b.mes));
}
