import { useMemo, useState } from 'react';
import {
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleSlash,
  Image as ImageIcon,
  List,
  ListChecks,
  ScanEye,
  Send,
  X,
} from 'lucide-react';
import { useBreakMinutes, useDaysRange, useShifts } from '../hooks/useData';
import { DaySheet } from '../components/DaySheet';
import { CodePad } from '../components/CodePad';
import { Card, OfflineBadge, SectionTitle } from '../components/Common';
import { Sheet } from '../components/Sheet';
import { useNotify } from '../components/Announcer';
import { PhotoSheet } from '../components/PhotoSheet';
import { confirmDays, setDaysCode } from '../db/repo';
import {
  formatMonthYear,
  monthDates,
  monthGrid,
  monthName,
  parseISO,
  shiftMonth,
  WEEKDAY_INITIALS,
  WEEKDAY_SHORT,
  weekdayIndex,
  type ISODate,
} from '../lib/dates';
import { summarizeMonth } from '../lib/summary';
import { formatDuration, shiftTimeRange, TYPE_LABEL, type ShiftDef } from '../lib/shifts';
import { CHIP, DOT, type DayKind } from '../lib/theme';
import { monthText, shareOnWhatsApp, shareText } from '../lib/share';
import type { DayEntry } from '../db/db';

interface Props {
  today: ISODate;
  initialMonth?: string;
  back: () => void;
}

const VIEW_KEY = 'me-vista';

export function Calendar({ today, initialMonth, back }: Props) {
  const start = parseISO(initialMonth ? `${initialMonth}-01` : today);
  const [ym, setYm] = useState({ year: start.year, month: start.month });
  const [view, setView] = useState<'grelha' | 'lista'>(() => {
    try {
      return localStorage.getItem(VIEW_KEY) === 'lista' ? 'lista' : 'grelha';
    } catch {
      return 'grelha';
    }
  });
  const [openDate, setOpenDate] = useState<ISODate | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<ISODate>>(new Set());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const notify = useNotify();

  const shifts = useShifts();
  const breakMinutes = useBreakMinutes();
  const dates = useMemo(() => monthDates(ym.year, ym.month), [ym]);
  const days = useDaysRange(dates[0], dates[dates.length - 1]);

  const changeView = (v: 'grelha' | 'lista') => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* ignora */
    }
  };

  const moveMonth = (delta: number) => {
    setYm((p) => shiftMonth(p.year, p.month, delta));
    setSelected(new Set());
  };

  const goToday = () => {
    const t = parseISO(today);
    setYm({ year: t.year, month: t.month });
  };

  const tapDay = (date: ISODate) => {
    if (!selecting) return setOpenDate(date);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const applyToSelected = async (code: string | null) => {
    const list = [...selected].sort();
    if (!list.length) return;
    await setDaysCode(list, code);
    notify(`${list.length} ${list.length === 1 ? 'dia guardado' : 'dias guardados'}`);
    setSelected(new Set());
  };

  const stopSelecting = () => {
    setSelecting(false);
    setSelected(new Set());
  };

  if (!shifts || !days) return null;
  const summary = summarizeMonth(ym.year, ym.month, days, shifts.map, breakMinutes);
  const isCurrentMonth = parseISO(today).year === ym.year && parseISO(today).month === ym.month;
  const unverified = dates.filter((d) => days.get(d)?.source === 'importado');
  const emptyDates = dates.filter((d) => !days.get(d)?.code);

  return (
    <div className="mx-auto max-w-lg px-4 pt-safe" style={{ paddingBottom: selecting ? 300 : 40 }}>
      {/* Barra superior */}
      <div className="flex items-center justify-between gap-2 pb-2 pt-2">
        <button onClick={back} className="press -ml-1 flex items-center gap-0.5 py-2 pr-2 text-[17px] font-semibold text-[var(--accent)]">
          <ChevronLeft size={26} aria-hidden /> Hoje
        </button>
        <OfflineBadge />
        <div role="tablist" aria-label="Vista" className="flex rounded-full bg-[var(--surface)] p-1 shadow-sm">
          <ViewTab active={view === 'grelha'} onClick={() => changeView('grelha')} label="Calendário">
            <CalendarDays size={18} />
          </ViewTab>
          <ViewTab active={view === 'lista'} onClick={() => changeView('lista')} label="Lista">
            <List size={18} />
          </ViewTab>
        </div>
      </div>

      {/* Navegação de meses */}
      <div className="flex items-center gap-2 py-2">
        <button onClick={() => moveMonth(-1)} aria-label="Mês anterior" className="press grid h-11 w-11 place-items-center rounded-full bg-[var(--surface)] shadow-sm">
          <ChevronLeft size={22} />
        </button>
        <button
          onClick={() => setPickerOpen(true)}
          className="press flex flex-1 items-center justify-center gap-1.5 py-2"
          aria-label={`${formatMonthYear(ym.year, ym.month)}. Escolher mês e ano`}
        >
          <span className="text-[24px] font-extrabold capitalize tracking-tight">{monthName(ym.month)}</span>
          <span className="text-[24px] font-light text-[var(--muted)]">{ym.year}</span>
          <ChevronDown size={18} className="text-[var(--muted)]" aria-hidden />
        </button>
        <button onClick={() => moveMonth(1)} aria-label="Mês seguinte" className="press grid h-11 w-11 place-items-center rounded-full bg-[var(--surface)] shadow-sm">
          <ChevronRight size={22} />
        </button>
      </div>

      {/* Ações */}
      <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
        {!isCurrentMonth && <Pill onClick={goToday}>Ir para hoje</Pill>}
        <Pill onClick={() => (selecting ? stopSelecting() : setSelecting(true))} active={selecting}>
          <ListChecks size={16} aria-hidden /> {selecting ? 'Terminar seleção' : 'Editar vários dias'}
        </Pill>
        <Pill onClick={() => setPhotoOpen(true)}>
          <ImageIcon size={16} aria-hidden /> Fotografia
        </Pill>
      </div>

      {selecting && (
        <div className="anim-fade mb-3 flex flex-wrap items-center justify-center gap-2 text-[14px]">
          <span className="text-[var(--muted)]">Toca nos dias que queres alterar.</span>
          {emptyDates.length > 0 && (
            <button className="font-semibold text-[var(--accent)]" onClick={() => setSelected(new Set(emptyDates))}>
              Selecionar dias vazios ({emptyDates.length})
            </button>
          )}
        </div>
      )}

      {view === 'grelha' ? (
        <Card className="anim-fade p-2" key={`g-${ym.year}-${ym.month}`}>
          <div className="grid grid-cols-7 pb-1" aria-hidden>
            {WEEKDAY_INITIALS.map((w, i) => (
              <div key={i} className={`py-1 text-center text-[12px] font-semibold ${i >= 5 ? 'text-[var(--muted)]/70' : 'text-[var(--muted)]'}`}>
                {w}
              </div>
            ))}
          </div>
          <div className="grid gap-1">
            {monthGrid(ym.year, ym.month).map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-1">
                {week.map((date, i) =>
                  date ? (
                    <DayCell
                      key={date}
                      date={date}
                      entry={days.get(date)}
                      shifts={shifts.map}
                      isToday={date === today}
                      selecting={selecting}
                      selected={selected.has(date)}
                      onTap={() => tapDay(date)}
                    />
                  ) : (
                    <div key={`e${i}`} />
                  ),
                )}
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="anim-fade divide-y divide-[var(--line)] overflow-hidden" key={`l-${ym.year}-${ym.month}`}>
          {dates.map((date) => (
            <ListRow
              key={date}
              date={date}
              entry={days.get(date)}
              shifts={shifts.map}
              isToday={date === today}
              selecting={selecting}
              selected={selected.has(date)}
              onTap={() => tapDay(date)}
            />
          ))}
        </Card>
      )}

      <Legend />

      {unverified.length > 0 && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-sky-50 p-3.5 text-sky-950 dark:bg-sky-500/15 dark:text-sky-100">
          <ScanEye size={22} className="shrink-0" aria-hidden />
          <p className="flex-1 text-[14px] leading-snug">
            {unverified.length} {unverified.length === 1 ? 'dia foi transcrito' : 'dias foram transcritos'} da fotografia (marcados com um ponto azul).
            Confere e corrige se necessário.
          </p>
          <button
            onClick={async () => {
              await confirmDays(unverified);
              notify('Escala conferida');
            }}
            className="press flex shrink-0 items-center gap-1 rounded-full bg-sky-600 px-3 py-2 text-[13px] font-semibold text-white"
          >
            <CheckCheck size={16} aria-hidden /> Tudo certo
          </button>
        </div>
      )}

      {/* Resumo mensal */}
      <section className="mt-6">
        <SectionTitle>Resumo do mês</SectionTitle>
        <Card className="p-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <BigStat value={summary.worked} label="dias de trabalho" />
            <BigStat value={summary.off} label="folgas" />
            <BigStat value={summary.noData} label="sem escala" />
          </div>
          <div className="mt-4 rounded-2xl bg-[var(--surface-2)] p-3 text-center">
            <div className="tabular text-[26px] font-extrabold tracking-tight">{formatDuration(summary.netMinutes)}</div>
            <div className="text-[13px] text-[var(--muted)]">
              de trabalho, descontando {breakMinutes} min de intervalo por turno
            </div>
          </div>
          <div className="mt-3 flex justify-center gap-4 text-[13px] text-[var(--muted)]">
            <span>Abertura: {summary.byType.abertura}</span>
            <span>Fecho: {summary.byType.fecho}</span>
            <span>Intermédio: {summary.byType.intermedio}</span>
          </div>
        </Card>
      </section>

      <section className="mt-6 grid grid-cols-2 gap-2">
        <button
          onClick={() => shareOnWhatsApp(monthText(ym.year, ym.month, days, shifts.map))}
          className="press flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] py-4 text-[16px] font-bold text-[#0b3d1f]"
        >
          <Send size={18} aria-hidden /> WhatsApp
        </button>
        <button
          onClick={async () => {
            const r = await shareText(monthText(ym.year, ym.month, days, shifts.map));
            if (r === 'partilhado') notify('Escala partilhada');
          }}
          className="press flex items-center justify-center gap-2 rounded-2xl bg-[var(--surface)] py-4 text-[16px] font-bold shadow-sm"
        >
          Partilhar mês
        </button>
      </section>

      {/* Barra de edição múltipla */}
      {selecting && (
        <div className="anim-sheet fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg rounded-t-[28px] bg-[var(--surface)] px-4 pt-4 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.3)] pb-safe">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[16px] font-bold" aria-live="polite">
              {selected.size === 0
                ? 'Nenhum dia selecionado'
                : `${selected.size} ${selected.size === 1 ? 'dia selecionado' : 'dias selecionados'}`}
            </div>
            <button onClick={stopSelecting} aria-label="Terminar seleção" className="press grid h-9 w-9 place-items-center rounded-full bg-[var(--surface-2)]">
              <X size={18} />
            </button>
          </div>
          <div className={selected.size === 0 ? 'pointer-events-none opacity-40' : ''} aria-disabled={selected.size === 0}>
            <CodePad shifts={shifts.list} onPick={applyToSelected} compact />
            <button
              onClick={() => applyToSelected(null)}
              className="press mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--line)] py-2.5 text-[14px] font-semibold text-[var(--muted)]"
            >
              <CircleSlash size={16} aria-hidden /> Sem escala
            </button>
          </div>
        </div>
      )}

      <DaySheet
        date={openDate}
        today={today}
        shifts={shifts.list}
        shiftMap={shifts.map}
        breakMinutes={breakMinutes}
        onClose={() => setOpenDate(null)}
        onNavigate={(d) => {
          const p = parseISO(d);
          if (p.year !== ym.year || p.month !== ym.month) setYm({ year: p.year, month: p.month });
          setOpenDate(d);
        }}
      />

      <MonthPicker
        key={pickerOpen ? `aberto-${ym.year}` : 'fechado'}
        open={pickerOpen}
        year={ym.year}
        month={ym.month}
        onClose={() => setPickerOpen(false)}
        onPick={(year, month) => {
          setYm({ year, month });
          setSelected(new Set());
          setPickerOpen(false);
        }}
      />

      <PhotoSheet open={photoOpen} year={ym.year} month={ym.month} onClose={() => setPhotoOpen(false)} />
    </div>
  );
}

function kindOf(entry: DayEntry | undefined, shifts: Map<string, ShiftDef>): { kind: DayKind; shift?: ShiftDef } {
  const shift = entry?.code ? shifts.get(entry.code) : undefined;
  return { kind: shift ? shift.type : 'vazio', shift };
}

function describe(entry: DayEntry | undefined, shift: ShiftDef | undefined): string {
  let s = !shift ? 'sem escala' : shift.type === 'folga' ? 'folga' : `${shift.code}, ${TYPE_LABEL[shift.type]}, ${shift.role}, ${shift.start} às ${shift.end}`;
  if (entry?.note) s += `. Observação: ${entry.note}`;
  if (entry?.source === 'importado') s += '. Por conferir';
  return s;
}

interface CellProps {
  date: ISODate;
  entry: DayEntry | undefined;
  shifts: Map<string, ShiftDef>;
  isToday: boolean;
  selecting: boolean;
  selected: boolean;
  onTap: () => void;
}

function DayCell({ date, entry, shifts, isToday, selecting, selected, onTap }: CellProps) {
  const { kind, shift } = kindOf(entry, shifts);
  const day = parseISO(date).day;
  return (
    <button
      onClick={onTap}
      aria-pressed={selecting ? selected : undefined}
      aria-label={`${day}, ${WEEKDAY_SHORT[weekdayIndex(date)]}: ${describe(entry, shift)}${isToday ? ' (hoje)' : ''}`}
      className={`press relative flex aspect-[4/5] flex-col items-center justify-between rounded-2xl pb-1.5 pt-1 ${CHIP[kind]} ${
        kind === 'vazio' ? 'border border-dashed border-[var(--line)]' : ''
      } ${selected ? 'ring-[3px] ring-[var(--accent)]' : ''}`}
    >
      <span
        className={`tabular grid h-6 min-w-6 place-items-center rounded-full px-1 text-[13px] font-semibold ${
          isToday ? 'bg-[var(--ink)] text-[var(--bg)]' : ''
        }`}
      >
        {day}
      </span>
      <span className="text-[15px] font-extrabold leading-none">{shift ? shift.code : ''}</span>
      <span className="h-1.5">
        {entry?.note && <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-60" />}
      </span>
      {entry?.source === 'importado' && !selecting && (
        <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-sky-500" aria-hidden />
      )}
      {selected && (
        <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-[var(--accent)] text-white" aria-hidden>
          <Check size={13} strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

function ListRow({ date, entry, shifts, isToday, selecting, selected, onTap }: CellProps) {
  const { kind, shift } = kindOf(entry, shifts);
  const day = parseISO(date).day;
  const wd = weekdayIndex(date);
  return (
    <button
      onClick={onTap}
      aria-pressed={selecting ? selected : undefined}
      className={`press flex w-full items-center gap-3 px-4 py-3 text-left ${isToday ? 'bg-[var(--surface-2)]' : ''} ${
        selected ? 'bg-[var(--accent)]/10' : ''
      }`}
    >
      <div className={`w-11 shrink-0 text-center ${wd >= 5 ? 'text-[var(--muted)]' : ''}`}>
        <div className="text-[11px] font-semibold uppercase text-[var(--muted)]">{WEEKDAY_SHORT[wd]}</div>
        <div className="tabular text-[20px] font-bold leading-tight">{day}</div>
      </div>
      <span
        className={`grid h-10 w-12 shrink-0 place-items-center rounded-xl text-[15px] font-extrabold ${CHIP[kind]} ${
          kind === 'vazio' ? 'border border-dashed border-[var(--line)]' : ''
        }`}
      >
        {shift ? shift.code : '—'}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[16px] font-semibold">
          {!shift ? <span className="text-[var(--muted)]">Sem escala</span> : shift.type === 'folga' ? 'Folga' : shiftTimeRange(shift, ' – ')}
          {isToday && <span className="ml-2 rounded-full bg-[var(--ink)] px-2 py-0.5 text-[11px] font-bold text-[var(--bg)]">HOJE</span>}
        </div>
        {shift && shift.type !== 'folga' && (
          <div className="text-[13px] text-[var(--muted)]">
            {TYPE_LABEL[shift.type]} · {shift.role}
          </div>
        )}
        {entry?.note && <div className="truncate text-[13px] text-[var(--muted)]">📝 {entry.note}</div>}
      </div>
      {entry?.source === 'importado' && <span className="h-2 w-2 shrink-0 rounded-full bg-sky-500" aria-label="por conferir" />}
      {selecting ? (
        <span
          className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${
            selected ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : 'border-[var(--line)]'
          }`}
          aria-hidden
        >
          {selected && <Check size={14} strokeWidth={3} />}
        </span>
      ) : (
        <ChevronRight size={18} className="shrink-0 text-[var(--muted)]" aria-hidden />
      )}
    </button>
  );
}

function Legend() {
  const items: [DayKind, string][] = [
    ['abertura', 'Abertura'],
    ['fecho', 'Fecho'],
    ['intermedio', 'Intermédio'],
    ['folga', 'Folga'],
    ['vazio', 'Sem escala'],
  ];
  return (
    <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-[13px] text-[var(--muted)]">
      {items.map(([k, label]) => (
        <span key={k} className="flex items-center gap-1.5">
          <span className={`inline-block h-3 w-3 rounded-full ${DOT[k]}`} aria-hidden /> {label}
        </span>
      ))}
    </div>
  );
}

function ViewTab({ active, onClick, label, children }: { active: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      aria-label={label}
      onClick={onClick}
      className={`press grid h-9 w-11 place-items-center rounded-full transition-colors ${active ? 'bg-[var(--ink)] text-[var(--bg)]' : 'text-[var(--muted)]'}`}
    >
      {children}
    </button>
  );
}

function Pill({ children, onClick, active }: { children: React.ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`press flex items-center gap-1.5 rounded-full px-4 py-2 text-[14px] font-semibold shadow-sm ${
        active ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface)]'
      }`}
    >
      {children}
    </button>
  );
}

function BigStat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="tabular text-[30px] font-extrabold leading-none">{value}</div>
      <div className="mt-1 text-[12px] leading-tight text-[var(--muted)]">{label}</div>
    </div>
  );
}

function MonthPicker({
  open,
  year,
  month,
  onClose,
  onPick,
}: {
  open: boolean;
  year: number;
  month: number;
  onClose: () => void;
  onPick: (y: number, m: number) => void;
}) {
  const [y, setY] = useState(year);
  return (
    <Sheet open={open} onClose={onClose} title="Escolher mês">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => setY((v) => v - 1)} aria-label="Ano anterior" className="press grid h-11 w-11 place-items-center rounded-full bg-[var(--surface-2)]">
          <ChevronLeft size={22} />
        </button>
        <div className="tabular text-[28px] font-extrabold" aria-live="polite">
          {y}
        </div>
        <button onClick={() => setY((v) => v + 1)} aria-label="Ano seguinte" className="press grid h-11 w-11 place-items-center rounded-full bg-[var(--surface-2)]">
          <ChevronRight size={22} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2 pb-2">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
          const active = y === year && m === month;
          return (
            <button
              key={m}
              onClick={() => onPick(y, m)}
              aria-pressed={active}
              className={`press rounded-2xl py-4 text-[16px] font-semibold capitalize ${active ? 'bg-[var(--ink)] text-[var(--bg)]' : 'bg-[var(--surface-2)]'}`}
            >
              {monthName(m)}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
