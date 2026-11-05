import type { ShiftDef } from '../lib/shifts';
import { CHIP } from '../lib/theme';

interface Props {
  shifts: ShiftDef[];
  selected?: string | null;
  onPick: (code: string) => void;
  compact?: boolean;
}

/** Botões grandes de edição rápida: A1 A2 A3 B1 / B2 B3 C D. */
export function CodePad({ shifts, selected, onPick, compact }: Props) {
  return (
    <div className="grid grid-cols-4 gap-2" role="group" aria-label="Escolher turno">
      {shifts.map((s) => {
        const active = selected === s.code;
        return (
          <button
            key={s.code}
            onClick={() => onPick(s.code)}
            aria-pressed={active}
            aria-label={`${s.code}: ${s.type === 'folga' ? 'Folga' : `${s.role}, ${s.start} às ${s.end}`}`}
            className={`press flex flex-col items-center justify-center rounded-2xl ${compact ? 'py-2' : 'py-3'} ${CHIP[s.type]} ${
              active ? 'ring-[3px] ring-[var(--ink)] ring-offset-2 ring-offset-[var(--surface)]' : ''
            }`}
          >
            <span className={`${compact ? 'text-lg' : 'text-2xl'} font-bold leading-none`}>{s.code}</span>
            <span className="mt-1 text-[11px] font-semibold leading-tight opacity-80">
              {s.type === 'folga' ? 'Folga' : s.role}
            </span>
            {!compact && s.start && (
              <span className="tabular mt-0.5 text-[10px] font-medium leading-tight opacity-70">{s.start}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
