export type ShiftType = 'abertura' | 'fecho' | 'intermedio' | 'folga';

export interface ShiftDef {
  code: string;
  /** "HH:MM" ou null nas folgas. */
  start: string | null;
  end: string | null;
  type: ShiftType;
  role: string;
}

export const DEFAULT_SHIFTS: ShiftDef[] = [
  { code: 'A1', start: '07:30', end: '16:15', type: 'abertura', role: 'Caixa' },
  { code: 'A2', start: '07:30', end: '16:15', type: 'abertura', role: 'Máquina' },
  { code: 'A3', start: '07:30', end: '16:15', type: 'abertura', role: 'Copa' },
  { code: 'B1', start: '11:45', end: '20:30', type: 'fecho', role: 'Caixa' },
  { code: 'B2', start: '11:45', end: '20:30', type: 'fecho', role: 'Máquina' },
  { code: 'B3', start: '11:45', end: '20:30', type: 'fecho', role: 'Copa' },
  { code: 'C', start: '10:00', end: '18:45', type: 'intermedio', role: 'Suporte' },
  { code: 'D', start: null, end: null, type: 'folga', role: 'Descanso' },
];

export const SHIFT_CODES = DEFAULT_SHIFTS.map((s) => s.code);

export const TYPE_LABEL: Record<ShiftType, string> = {
  abertura: 'Abertura',
  fecho: 'Fecho',
  intermedio: 'Intermédio',
  folga: 'Folga',
};

export const DEFAULT_BREAK_MINUTES = 45;

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function isValidTime(v: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}

/** Duração bruta do turno em minutos (suporta turnos que passam a meia-noite). */
export function grossMinutes(shift: ShiftDef): number {
  if (shift.type === 'folga' || !shift.start || !shift.end) return 0;
  let d = timeToMinutes(shift.end) - timeToMinutes(shift.start);
  if (d <= 0) d += 24 * 60;
  return d;
}

/** Duração líquida, descontando o intervalo de descanso. */
export function netMinutes(shift: ShiftDef, breakMinutes: number): number {
  const gross = grossMinutes(shift);
  if (gross === 0) return 0;
  return Math.max(0, gross - Math.max(0, breakMinutes));
}

/** 525 → "8 h 45 min"; 480 → "8 h"; 30 → "30 min" */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${String(m).padStart(2, '0')} min`;
}

export function shiftTimeRange(shift: ShiftDef, sep = '–'): string {
  return shift.start && shift.end ? `${shift.start}${sep}${shift.end}` : '';
}

export function shiftMap(shifts: ShiftDef[]): Map<string, ShiftDef> {
  return new Map(shifts.map((s) => [s.code, s]));
}
