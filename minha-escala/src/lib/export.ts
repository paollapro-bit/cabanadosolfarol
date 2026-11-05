import type { DayEntry } from '../db/db';
import { addDays, type ISODate } from './dates';
import { shiftTimeRange, TYPE_LABEL, type ShiftDef } from './shifts';

/** CSV com ";" (o Excel em português abre-o diretamente) e BOM UTF-8. */
export function scheduleCsv(days: DayEntry[], shifts: Map<string, ShiftDef>): string {
  const esc = (v: string) => (/[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const rows = [['Data', 'Código', 'Tipo', 'Função', 'Entrada', 'Saída', 'Observações']];
  for (const d of [...days].sort((a, b) => a.date.localeCompare(b.date))) {
    const s = d.code ? shifts.get(d.code) : undefined;
    rows.push([
      d.date,
      d.code ?? '',
      s ? TYPE_LABEL[s.type] : 'Sem escala',
      s?.role ?? '',
      s?.start ?? '',
      s?.end ?? '',
      d.note ?? '',
    ]);
  }
  return '\uFEFF' + rows.map((r) => r.map(esc).join(';')).join('\r\n') + '\r\n';
}

const VTIMEZONE_LISBON = [
  'BEGIN:VTIMEZONE',
  'TZID:Europe/Lisbon',
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0000',
  'TZOFFSETTO:+0100',
  'TZNAME:WEST',
  'DTSTART:19700329T010000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0000',
  'TZNAME:WET',
  'DTSTART:19701025T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
];

const icsText = (v: string) => v.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
const compact = (date: ISODate) => date.replace(/-/g, '');

/** Ficheiro .ics para importar no Calendário do iPhone (fuso Europe/Lisbon). */
export function scheduleIcs(days: DayEntry[], shifts: Map<string, ShiftDef>, stamp = new Date()): string {
  const dtstamp = stamp.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Minha Escala//PT', 'CALSCALE:GREGORIAN', ...VTIMEZONE_LISBON];
  for (const d of [...days].sort((a, b) => a.date.localeCompare(b.date))) {
    const s = d.code ? shifts.get(d.code) : undefined;
    if (!s) continue;
    lines.push('BEGIN:VEVENT', `UID:${d.date}@minha-escala`, `DTSTAMP:${dtstamp}`);
    if (s.type === 'folga' || !s.start || !s.end) {
      lines.push(`DTSTART;VALUE=DATE:${compact(d.date)}`, `DTEND;VALUE=DATE:${compact(addDays(d.date, 1))}`, 'SUMMARY:Folga');
    } else {
      const endDate = s.end <= s.start ? addDays(d.date, 1) : d.date;
      lines.push(
        `DTSTART;TZID=Europe/Lisbon:${compact(d.date)}T${s.start.replace(':', '')}00`,
        `DTEND;TZID=Europe/Lisbon:${compact(endDate)}T${s.end.replace(':', '')}00`,
        `SUMMARY:${icsText(`${TYPE_LABEL[s.type]} · ${s.role} (${s.code})`)}`,
      );
    }
    const desc = [s.type !== 'folga' ? shiftTimeRange(s) : '', d.note ?? ''].filter(Boolean).join('\n');
    if (desc) lines.push(`DESCRIPTION:${icsText(desc)}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

/**
 * Guarda um ficheiro. No iPhone usa a folha de partilha (permite "Guardar em
 * Ficheiros", WhatsApp, e‑mail…); nos restantes casos faz uma transferência normal.
 */
export async function saveFile(content: string, fileName: string, mime: string): Promise<'partilhado' | 'cancelado' | 'transferido'> {
  const file = new File([content], fileName, { type: mime });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName });
      return 'partilhado';
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return 'cancelado';
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'transferido';
}
