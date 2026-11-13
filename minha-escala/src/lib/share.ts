import type { DayEntry } from '../db/db';
import { formatMonthYear, monthDates, parseISO, WEEKDAY_SHORT, weekdayIndex, type ISODate } from './dates';
import { shiftTimeRange, TYPE_LABEL, type ShiftDef } from './shifts';

export function dayLine(date: ISODate, entry: DayEntry | undefined, shifts: Map<string, ShiftDef>): string {
  const { day } = parseISO(date);
  const prefix = `${WEEKDAY_SHORT[weekdayIndex(date)]} ${String(day).padStart(2, '0')}`;
  const shift = entry?.code ? shifts.get(entry.code) : undefined;
  let body: string;
  if (!shift) body = 'Sem escala';
  else if (shift.type === 'folga') body = '🌿 Folga';
  else body = `${shiftTimeRange(shift)} · ${TYPE_LABEL[shift.type]} · ${shift.role} (${shift.code})`;
  const note = entry?.note?.trim() ? ` — ${entry.note.trim()}` : '';
  return `${prefix} · ${body}${note}`;
}

export function scheduleText(
  title: string,
  dates: ISODate[],
  days: Map<ISODate, DayEntry>,
  shifts: Map<string, ShiftDef>,
): string {
  return [`📅 ${title}`, '', ...dates.map((d) => dayLine(d, days.get(d), shifts))].join('\n');
}

export function monthTitle(year: number, month: number, name = ''): string {
  return name ? `Escala de ${name} — ${formatMonthYear(year, month)}` : `A minha escala — ${formatMonthYear(year, month)}`;
}

export function monthText(year: number, month: number, days: Map<ISODate, DayEntry>, shifts: Map<string, ShiftDef>, name = '') {
  return scheduleText(monthTitle(year, month, name), monthDates(year, month), days, shifts);
}

export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** Abre o WhatsApp com a mensagem pronta a enviar. */
export function shareOnWhatsApp(text: string) {
  window.open(whatsappUrl(text), '_blank', 'noopener');
}

/** Usa a folha de partilha do sistema (iPhone) quando existe; caso contrário, WhatsApp. */
export async function shareText(text: string): Promise<'partilhado' | 'cancelado' | 'whatsapp'> {
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return 'partilhado';
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return 'cancelado';
    }
  }
  shareOnWhatsApp(text);
  return 'whatsapp';
}
