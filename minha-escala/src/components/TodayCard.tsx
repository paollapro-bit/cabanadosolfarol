import { CalendarX2, Palmtree, Pencil } from 'lucide-react';
import type { DayEntry } from '../db/db';
import { formatDuration, netMinutes, TYPE_LABEL, type ShiftDef } from '../lib/shifts';
import { CARD_GRADIENT } from '../lib/theme';
import { shiftProgress } from '../lib/summary';

interface Props {
  entry: DayEntry | null | undefined;
  shift: ShiftDef | undefined;
  nowMinutes: number;
  breakMinutes: number;
  onOpen: () => void;
}

/** O cartão gigante do ecrã inicial: o turno de hoje, num relance. */
export function TodayCard({ entry, shift, nowMinutes, breakMinutes, onOpen }: Props) {
  if (entry === undefined) return <div className="h-[300px] animate-pulse rounded-[32px] bg-[var(--surface)]" />;
  const kind = shift ? shift.type : 'vazio';
  const working = shift && shift.type !== 'folga';

  let label: string;
  if (working)
    label = `Hoje trabalhas das ${shift.start} às ${shift.end}. ${TYPE_LABEL[shift.type]}, ${shift.role}, código ${shift.code}.`;
  else if (shift) label = 'Hoje é dia de folga.';
  else label = 'Sem turno registado para hoje.';

  return (
    <button
      onClick={onOpen}
      aria-label={`${label} Tocar para ver ou alterar.`}
      className={`press anim-rise relative block w-full overflow-hidden rounded-[32px] p-7 text-left shadow-[0_18px_40px_-18px_rgba(0,0,0,0.45)] ${CARD_GRADIENT[kind]}`}
    >
      {/* brilho decorativo */}
      {kind !== 'vazio' && (
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/15 blur-2xl" />
      )}
      <span aria-hidden className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full bg-black/10 dark:bg-white/10">
        <Pencil size={16} className="opacity-80" />
      </span>

      {working && (
        <>
          <div className="text-[14px] font-bold uppercase tracking-[0.14em] opacity-90">Hoje trabalhas</div>
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
            {shiftProgress(shift, nowMinutes) && (
              <span className="rounded-full bg-white/20 px-3 py-1.5">{shiftProgress(shift, nowMinutes)}</span>
            )}
            <span className="rounded-full bg-white/20 px-3 py-1.5">{formatDuration(netMinutes(shift, breakMinutes))} de trabalho</span>
          </div>
        </>
      )}

      {shift?.type === 'folga' && (
        <>
          <Palmtree size={44} strokeWidth={1.8} aria-hidden />
          <div className="mt-5 text-[clamp(2.1rem,10vw,2.8rem)] font-extrabold uppercase leading-[1.02] tracking-tight">
            Hoje é dia
            <br />
            de folga
          </div>
          <div className="mt-4 text-xl font-semibold opacity-95">Aproveita o teu descanso!</div>
        </>
      )}

      {!shift && (
        <>
          <CalendarX2 size={40} strokeWidth={1.8} className="text-[var(--muted)]" aria-hidden />
          <div className="mt-5 text-[clamp(1.9rem,9vw,2.4rem)] font-extrabold leading-tight tracking-tight">Sem turno registado</div>
          <div className="mt-2 text-[17px] text-[var(--muted)]">Ainda não há escala para hoje. Toca para adicionar.</div>
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
