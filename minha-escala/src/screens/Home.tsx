import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CalendarDays, ChevronRight, Clock, Palmtree, PieChart, Send, Settings } from 'lucide-react';
import { db } from '../db/db';
import { useBreakMinutes, useDay, useDaysRange, useShifts } from '../hooks/useData';
import { TodayCard } from '../components/TodayCard';
import { WeekStrip } from '../components/WeekStrip';
import { DaySheet } from '../components/DaySheet';
import { Card, IconBubble, OfflineBadge, SectionTitle } from '../components/Common';
import { useNotify } from '../components/Announcer';
import { addDays, formatLongDate, monthDates, monthName, parseISO, relativeDayLabel, weekDates, type ISODate } from '../lib/dates';
import { findNext, summarizeMonth } from '../lib/summary';
import { formatDuration, shiftTimeRange, TYPE_LABEL } from '../lib/shifts';
import { scheduleText, shareText } from '../lib/share';

interface Props {
  today: ISODate;
  nowMinutes: number;
  go: (path: string) => void;
}

export function Home({ today, nowMinutes, go }: Props) {
  const shifts = useShifts();
  const todayEntry = useDay(today);
  const breakMinutes = useBreakMinutes();
  const notify = useNotify();
  const [openDate, setOpenDate] = useState<ISODate | null>(null);

  const { year, month } = parseISO(today);
  const week = useMemo(() => weekDates(today), [today]);
  const monthDays = monthDates(year, month);
  const rangeFrom = week[0] < monthDays[0] ? week[0] : monthDays[0];
  const rangeTo = week[6] > monthDays[monthDays.length - 1] ? week[6] : monthDays[monthDays.length - 1];
  const days = useDaysRange(rangeFrom, rangeTo);

  // Próximos 120 dias, para encontrar a próxima folga e o próximo turno.
  const upcoming = useLiveQuery(
    () => db.days.where('date').between(today, addDays(today, 120), false, true).toArray(),
    [today],
  );

  if (!shifts) return null;
  const todayShift = todayEntry?.code ? shifts.map.get(todayEntry.code) : undefined;
  const nextOff = upcoming ? findNext(today, upcoming, shifts.map, 'folga') : undefined;
  const nextShiftEntry = upcoming ? findNext(today, upcoming, shifts.map, 'turno') : undefined;
  const nextShift = nextShiftEntry?.code ? shifts.map.get(nextShiftEntry.code) : undefined;
  const summary = days ? summarizeMonth(year, month, days, shifts.map, breakMinutes) : undefined;

  const shareWeek = async () => {
    if (!days) return;
    const r = await shareText(scheduleText('A minha escala desta semana', week, days, shifts.map));
    if (r === 'partilhado') notify('Escala partilhada');
  };

  return (
    <div className="mx-auto max-w-lg px-5 pt-safe pb-safe">
      <header className="anim-rise flex items-start justify-between gap-3 pb-5 pt-3">
        <div>
          <h1 className="text-[34px] font-extrabold leading-tight tracking-tight">Olá, Lorena</h1>
          <p className="mt-0.5 text-[17px] text-[var(--muted)]">{formatLongDate(today)}</p>
          <div className="mt-2">
            <OfflineBadge />
          </div>
        </div>
        <button
          onClick={() => go('/definicoes')}
          aria-label="Definições"
          className="press mt-1.5 grid h-11 w-11 place-items-center rounded-full bg-[var(--surface)] text-[var(--muted)] shadow-sm"
        >
          <Settings size={22} />
        </button>
      </header>

      <TodayCard
        entry={todayEntry}
        shift={todayShift}
        nowMinutes={nowMinutes}
        breakMinutes={breakMinutes}
        onOpen={() => setOpenDate(today)}
      />

      <button
        onClick={() => go('/calendario')}
        className="press anim-rise mt-4 flex w-full items-center justify-center gap-3 rounded-[24px] bg-[var(--ink)] py-5 text-[19px] font-bold uppercase tracking-wide text-[var(--bg)] shadow-lg"
        style={{ animationDelay: '60ms' }}
      >
        <CalendarDays size={24} aria-hidden /> Ver outros dias
      </button>

      <div className="anim-rise mt-8 space-y-6" style={{ animationDelay: '120ms' }}>
        <section>
          <SectionTitle
            action={
              <button onClick={shareWeek} className="press flex items-center gap-1 text-[14px] font-semibold text-[var(--accent)]">
                <Send size={14} aria-hidden /> Partilhar
              </button>
            }
          >
            Esta semana
          </SectionTitle>
          <Card className="p-2">
            {days && <WeekStrip dates={week} today={today} days={days} shifts={shifts.map} onPick={setOpenDate} />}
          </Card>
        </section>

        <section>
          <SectionTitle>Em breve</SectionTitle>
          <Card className="divide-y divide-[var(--line)]">
            <InfoRow
              icon={
                <IconBubble className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                  <Palmtree size={20} />
                </IconBubble>
              }
              title="Próxima folga"
              value={nextOff ? relativeDayLabel(today, nextOff.date) : 'Nenhuma folga registada'}
              onClick={nextOff ? () => setOpenDate(nextOff.date) : undefined}
            />
            <InfoRow
              icon={
                <IconBubble className="bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                  <Clock size={20} />
                </IconBubble>
              }
              title="Próximo turno"
              value={
                nextShiftEntry && nextShift
                  ? `${relativeDayLabel(today, nextShiftEntry.date)} · ${shiftTimeRange(nextShift)} ${TYPE_LABEL[nextShift.type]}`
                  : 'Nenhum turno registado'
              }
              onClick={nextShiftEntry ? () => setOpenDate(nextShiftEntry.date) : undefined}
            />
          </Card>
        </section>

        {summary && (
          <section>
            <SectionTitle>Resumo de {monthName(month)}</SectionTitle>
            <Card className="p-4">
              <button onClick={() => go('/calendario')} className="press flex w-full items-center gap-3 text-left">
                <IconBubble className="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                  <PieChart size={20} />
                </IconBubble>
                <div className="grid flex-1 grid-cols-3 gap-2">
                  <Stat value={summary.worked} label="a trabalhar" />
                  <Stat value={summary.off} label="folgas" />
                  <Stat value={formatDuration(summary.netMinutes)} label="de trabalho" />
                </div>
                <ChevronRight size={18} className="text-[var(--muted)]" aria-hidden />
              </button>
              {summary.noData > 0 && (
                <p className="mt-3 text-[13px] text-[var(--muted)]">
                  {summary.noData} {summary.noData === 1 ? 'dia' : 'dias'} sem escala neste mês.
                </p>
              )}
            </Card>
          </section>
        )}
      </div>

      <DaySheet
        date={openDate}
        today={today}
        shifts={shifts.list}
        shiftMap={shifts.map}
        breakMinutes={breakMinutes}
        onClose={() => setOpenDate(null)}
        onNavigate={setOpenDate}
      />
    </div>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div>
      <div className="tabular text-[19px] font-bold leading-tight">{value}</div>
      <div className="text-[12px] text-[var(--muted)]">{label}</div>
    </div>
  );
}

function InfoRow({ icon, title, value, onClick }: { icon: React.ReactNode; title: string; value: string; onClick?: () => void }) {
  const content = (
    <>
      {icon}
      <div className="min-w-0 flex-1">
        <div className="text-[13px] text-[var(--muted)]">{title}</div>
        <div className="text-[16px] font-semibold leading-snug">{value}</div>
      </div>
      {onClick && <ChevronRight size={18} className="shrink-0 text-[var(--muted)]" aria-hidden />}
    </>
  );
  return onClick ? (
    <button onClick={onClick} className="press flex w-full items-center gap-3 p-4 text-left">
      {content}
    </button>
  ) : (
    <div className="flex items-center gap-3 p-4">{content}</div>
  );
}
