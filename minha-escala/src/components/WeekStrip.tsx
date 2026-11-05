import type { DayEntry } from '../db/db';
import { parseISO, WEEKDAY_SHORT, type ISODate } from '../lib/dates';
import { TYPE_LABEL, type ShiftDef } from '../lib/shifts';
import { CHIP } from '../lib/theme';

interface Props {
  dates: ISODate[];
  today: ISODate;
  days: Map<ISODate, DayEntry>;
  shifts: Map<string, ShiftDef>;
  onPick: (date: ISODate) => void;
}

/** Consulta rápida da semana (segunda a domingo). */
export function WeekStrip({ dates, today, days, shifts, onPick }: Props) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {dates.map((date, i) => {
        const entry = days.get(date);
        const shift = entry?.code ? shifts.get(entry.code) : undefined;
        const kind = shift ? shift.type : 'vazio';
        const isToday = date === today;
        const desc = shift
          ? shift.type === 'folga'
            ? 'folga'
            : `${shift.code}, ${TYPE_LABEL[shift.type]}, ${shift.start} às ${shift.end}`
          : 'sem escala';
        return (
          <button
            key={date}
            onClick={() => onPick(date)}
            aria-label={`${WEEKDAY_SHORT[i]} ${parseISO(date).day}: ${desc}${isToday ? ' (hoje)' : ''}`}
            className={`press flex flex-col items-center rounded-2xl py-2 ${isToday ? 'bg-[var(--surface-2)] ring-2 ring-[var(--ink)]' : ''}`}
          >
            <span className={`text-[11px] font-semibold uppercase ${isToday ? 'text-[var(--ink)]' : 'text-[var(--muted)]'}`}>
              {WEEKDAY_SHORT[i]}
            </span>
            <span className="tabular text-[17px] font-bold">{parseISO(date).day}</span>
            <span
              className={`mt-1 grid h-7 w-full max-w-[42px] place-items-center rounded-lg text-[12px] font-bold ${CHIP[kind]} ${
                kind === 'vazio' ? 'border border-dashed border-current opacity-60' : ''
              }`}
            >
              {shift ? shift.code : '—'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
