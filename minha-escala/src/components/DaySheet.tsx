import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, CircleSlash, ScanEye, StickyNote } from 'lucide-react';
import { Sheet } from './Sheet';
import { CodePad } from './CodePad';
import { useNotify } from './Announcer';
import { useDay } from '../hooks/useData';
import { confirmDay, setDayNote, setDaysCode } from '../db/repo';
import { addDays, diffDays, formatLongDate, type ISODate } from '../lib/dates';
import { formatDuration, netMinutes, shiftTimeRange, TYPE_LABEL, type ShiftDef } from '../lib/shifts';
import { CHIP } from '../lib/theme';

const AUTO_KEY = 'me-avancar';
const readAuto = () => {
  try {
    return localStorage.getItem(AUTO_KEY) === '1';
  } catch {
    return false;
  }
};

function relative(today: ISODate, date: ISODate): string | undefined {
  const d = diffDays(today, date);
  return d === 0 ? 'Hoje' : d === 1 ? 'Amanhã' : d === -1 ? 'Ontem' : undefined;
}

interface Props {
  date: ISODate | null;
  today: ISODate;
  shifts: ShiftDef[];
  shiftMap: Map<string, ShiftDef>;
  breakMinutes: number;
  onClose: () => void;
  onNavigate: (date: ISODate) => void;
}

export function DaySheet({ date, today, shifts, shiftMap, breakMinutes, onClose, onNavigate }: Props) {
  return (
    <Sheet
      open={date !== null}
      onClose={onClose}
      title={date ? formatLongDate(date, true) : ''}
      subtitle={date ? relative(today, date) : undefined}
    >
      {date && (
        <DayEditor
          key={date}
          date={date}
          shifts={shifts}
          shiftMap={shiftMap}
          breakMinutes={breakMinutes}
          onNavigate={onNavigate}
        />
      )}
    </Sheet>
  );
}

function DayEditor({
  date,
  shifts,
  shiftMap,
  breakMinutes,
  onNavigate,
}: Omit<Props, 'onClose' | 'date' | 'today'> & { date: ISODate }) {
  const entry = useDay(date);
  const notify = useNotify();
  const [auto, setAuto] = useState(readAuto);
  const [note, setNote] = useState('');
  const noteDirty = useRef(false);
  const noteRef = useRef('');
  noteRef.current = note;

  // Se mudar de dia ou fechar antes de o atraso terminar, guarda na mesma.
  useEffect(
    () => () => {
      if (noteDirty.current) void setDayNote(date, noteRef.current);
    },
    [date],
  );

  useEffect(() => {
    if (entry !== undefined && !noteDirty.current) setNote(entry?.note ?? '');
  }, [entry]);

  // Guarda a observação automaticamente (com pequeno atraso enquanto escreve).
  useEffect(() => {
    if (!noteDirty.current) return;
    const t = setTimeout(async () => {
      await setDayNote(date, note);
      noteDirty.current = false;
      notify('Observação guardada');
    }, 700);
    return () => clearTimeout(t);
  }, [note, date, notify]);

  const shift = entry?.code ? shiftMap.get(entry.code) : undefined;
  const kind = shift ? shift.type : 'vazio';

  const pick = async (code: string | null) => {
    await setDaysCode([date], code);
    const label = code ? (shiftMap.get(code)?.type === 'folga' ? 'Folga' : code) : 'Sem escala';
    notify(`${label} guardado`);
    if (auto) onNavigate(addDays(date, 1));
  };

  const toggleAuto = () => {
    setAuto((v) => {
      try {
        localStorage.setItem(AUTO_KEY, v ? '0' : '1');
      } catch {
        /* sem armazenamento: só nesta sessão */
      }
      return !v;
    });
  };

  if (entry === undefined) return <div className="h-64" />;

  return (
    <div className="space-y-5 pt-1">
      {/* Resumo do dia */}
      <div className={`flex items-center gap-4 rounded-3xl p-4 ${CHIP[kind]} ${kind === 'vazio' ? 'border-2 border-dashed border-[var(--line)]' : ''}`}>
        <div className="min-w-0 flex-1">
          {shift && shift.type !== 'folga' && (
            <>
              <div className="tabular text-3xl font-bold tracking-tight">{shiftTimeRange(shift, ' — ')}</div>
              <div className="mt-0.5 text-[15px] font-semibold">
                {TYPE_LABEL[shift.type]} · {shift.role} · {shift.code}
              </div>
              <div className="text-[13px] opacity-75">{formatDuration(netMinutes(shift, breakMinutes))} de trabalho</div>
            </>
          )}
          {shift?.type === 'folga' && <div className="text-2xl font-bold">Dia de folga</div>}
          {!shift && (
            <>
              <div className="text-xl font-bold text-[var(--ink)]">Sem turno registado</div>
              <div className="text-[14px]">Escolhe um turno abaixo.</div>
            </>
          )}
        </div>
      </div>

      {entry?.source === 'importado' && (
        <div className="flex items-center gap-3 rounded-2xl bg-sky-50 p-3 text-sky-950 dark:bg-sky-500/15 dark:text-sky-100">
          <ScanEye size={22} className="shrink-0" aria-hidden />
          <p className="flex-1 text-[14px] leading-snug">Transcrito da fotografia. Confere se está certo.</p>
          <button
            onClick={async () => {
              await confirmDay(date);
              notify('Dia conferido');
            }}
            className="press rounded-full bg-sky-600 px-3.5 py-2 text-[14px] font-semibold text-white"
          >
            Está certo
          </button>
        </div>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[var(--muted)]">Turno</h3>
          <label className="flex cursor-pointer items-center gap-2 text-[14px] text-[var(--muted)]">
            Avançar para o dia seguinte
            <input type="checkbox" checked={auto} onChange={toggleAuto} className="peer sr-only" />
            <span
              aria-hidden
              className="relative h-[26px] w-[44px] rounded-full bg-[var(--line)] transition-colors peer-checked:bg-emerald-500 peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-[var(--accent)] after:absolute after:left-[3px] after:top-[3px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-[18px]"
            />
          </label>
        </div>
        <CodePad shifts={shifts} selected={entry?.code ?? null} onPick={pick} />
        <button
          onClick={() => pick(null)}
          className={`press mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-3 text-[15px] font-semibold ${
            !shift ? 'border-[var(--ink)] text-[var(--ink)]' : 'border-[var(--line)] text-[var(--muted)]'
          }`}
        >
          <CircleSlash size={18} aria-hidden /> Sem escala
        </button>
      </section>

      <section>
        <label htmlFor="nota" className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          <StickyNote size={14} aria-hidden /> Observações
        </label>
        <textarea
          id="nota"
          value={note}
          onChange={(e) => {
            noteDirty.current = true;
            setNote(e.target.value);
          }}
          rows={2}
          placeholder="Ex.: trocar com a Ana, formação, consulta…"
          className="w-full resize-none rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 text-[16px] outline-none focus:border-[var(--accent)]"
        />
      </section>

      <div className="flex gap-2">
        <button
          onClick={() => onNavigate(addDays(date, -1))}
          className="press flex flex-1 items-center justify-center gap-1 rounded-2xl bg-[var(--surface-2)] py-3 text-[15px] font-semibold"
        >
          <ChevronLeft size={20} aria-hidden /> Dia anterior
        </button>
        <button
          onClick={() => onNavigate(addDays(date, 1))}
          className="press flex flex-1 items-center justify-center gap-1 rounded-2xl bg-[var(--surface-2)] py-3 text-[15px] font-semibold"
        >
          Dia seguinte <ChevronRight size={20} aria-hidden />
        </button>
      </div>
    </div>
  );
}
