import { CalendarX2, Palmtree, Pencil } from 'lucide-react';
import type { DayEntry } from '../db/db';
import { diffDays, formatLongDate, monthName, parseISO, WEEKDAY_SHORT, weekdayIndex, type ISODate } from '../lib/dates';
import { formatDuration, netMinutes, TYPE_LABEL, type ShiftDef } from '../lib/shifts';
import { CARD_GRADIENT } from '../lib/theme';
import { shiftProgress } from '../lib/summary';

interface Props {
  date: ISODate;
  today: ISODate;
  entry: DayEntry | undefined;
  shift: ShiftDef | undefined;
  nowMinutes: number;
  breakMinutes: number;
  onOpen: () => void;
  /** false nos cartões fora do ecrã, para o teclado/VoiceOver não os apanhar. */
  focusable?: boolean;
}

/** "Hoje", "Amanhã", "Ontem" ou "Segunda-feira, 9 de novembro". */
export function dayHeading(today: ISODate, date: ISODate): string {
  const d = diffDays(today, date);
  if (d === 0) return 'Hoje';
  if (d === 1) return 'Amanhã';
  if (d === -1) return 'Ontem';
  return formatLongDate(date);
}

/** Versão curta: "Hoje", "Amanhã", "Ter 10 nov". */
export function dayHeadingShort(today: ISODate, date: ISODate): string {
  const d = diffDays(today, date);
  if (d >= -1 && d <= 1) return dayHeading(today, date);
  const { day, month } = parseISO(date);
  return `${WEEKDAY_SHORT[weekdayIndex(date)]} ${day} ${monthName(month).slice(0, 3)}`;
}

/** Cartão grande de um dia: horas em destaque, tipo, função e código. */
export function DayCard({ date, today, entry, shift, nowMinutes, breakMinutes, onOpen, focusable = true }: Props) {
  const kind = shift ? shift.type : 'vazio';
  const working = shift && shift.type !== 'folga';
  const heading = dayHeading(today, date);
  const isRelative = ['Hoje', 'Amanhã', 'Ontem'].includes(heading);
  const isPast = diffDays(today, date) < 0;

  let label: string;
  if (working)
    label = `${heading}: ${isPast ? 'trabalhaste' : 'trabalhas'} das ${shift.start} às ${shift.end}. ${TYPE_LABEL[shift.type]}, ${shift.role}, código ${shift.code}.`;
  else if (shift) label = `${heading}: dia de folga.`;
  else label = `${heading}: sem turno registado.`;

  return (
    <button
      onClick={onOpen}
      tabIndex={focusable ? 0 : -1}
      aria-label={`${label} Tocar para ver ou alterar.`}
      className={`press relative flex h-full w-full flex-col overflow-hidden rounded-[32px] p-7 text-left shadow-[0_18px_40px_-18px_rgba(0,0,0,0.45)] ${CARD_GRADIENT[kind]} ${
        isPast ? 'opacity-80' : ''
      }`}
    >
      {kind !== 'vazio' && (
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/15 blur-2xl" />
      )}
      <span aria-hidden className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full bg-black/10 dark:bg-white/10">
        <Pencil size={16} className="opacity-80" />
      </span>

      {/* Dia do cartão (o ecrã inicial mostra sempre a que dia se refere) */}
      <div className="pr-12 text-[14px] font-bold uppercase tracking-[0.14em] opacity-90">
        {working && isRelative ? `${heading} ${isPast ? 'trabalhaste' : 'trabalhas'}` : heading}
      </div>
      {working && !isRelative && (
        <div className="text-[14px] font-bold uppercase tracking-[0.14em] opacity-75">{isPast ? 'Trabalhaste' : 'Trabalhas'}</div>
      )}

      {working && (
        <>
          <div className="tabular mt-4 space-y-1">
            <div className="flex items-baseline gap-3">
              <span className="text-[clamp(3.4rem,17vw,4.75rem)] font-extrabold leading-none tracking-tight">{shift.start}</span>
              <span className="text-[15px] font-semibold uppercase tracking-wider opacity-80">entrada</span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-[clamp(3.4rem,17vw,4.75rem)] font-extrabold leading-none tracking-tight">{shift.end}</span>
              <span className="text-[15px] font-semibold uppercase tracking-wider opacity-80">saída</span>
            </div>
          </div>
          <div className="mt-6 text-[clamp(1.6rem,7vw,2rem)] font-extrabold uppercase tracking-wide">{TYPE_LABEL[shift.type]}</div>
          <div className="mt-1 text-xl font-semibold opacity-95">
            {shift.role} · {shift.code}
          </div>
          <div className="mt-5 flex flex-wrap gap-2 text-[14px] font-semibold">
            {date === today && shiftProgress(shift, nowMinutes) && (
              <span className="rounded-full bg-white/20 px-3 py-1.5">{shiftProgress(shift, nowMinutes)}</span>
            )}
            <span className="rounded-full bg-white/20 px-3 py-1.5">{formatDuration(netMinutes(shift, breakMinutes))} de trabalho</span>
          </div>
        </>
      )}

      {shift?.type === 'folga' && (
        <>
          <Palmtree size={44} strokeWidth={1.8} className="mt-5" aria-hidden />
          <div className="mt-5 text-[clamp(2.1rem,10vw,2.8rem)] font-extrabold uppercase leading-[1.02] tracking-tight">
            {date === today ? (
              <>
                Hoje é dia
                <br />
                de folga
              </>
            ) : (
              <>
                Dia de
                <br />
                folga
              </>
            )}
          </div>
          <div className="mt-4 text-xl font-semibold opacity-95">{isPast ? 'Foi dia de descanso.' : 'Aproveita o teu descanso!'}</div>
        </>
      )}

      {!shift && (
        <>
          <CalendarX2 size={40} strokeWidth={1.8} className="mt-5 text-[var(--muted)]" aria-hidden />
          <div className="mt-5 text-[clamp(1.9rem,9vw,2.4rem)] font-extrabold leading-tight tracking-tight">Sem turno registado</div>
          <div className="mt-2 text-[17px] text-[var(--muted)]">Ainda não há escala para este dia. Toca para adicionar.</div>
        </>
      )}

      {entry?.note && (
        <div className={`mt-5 rounded-2xl px-4 py-3 text-[15px] font-medium ${kind === 'vazio' ? 'bg-[var(--surface-2)]' : 'bg-black/15'}`}>
          📝 {entry.note}
        </div>
      )}
    </button>
  );
}
