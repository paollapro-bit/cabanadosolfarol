import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Undo2 } from 'lucide-react';
import type { DayEntry } from '../db/db';
import type { ISODate } from '../lib/dates';
import type { ShiftDef } from '../lib/shifts';
import { DayCard, dayHeadingShort } from './DayCard';

interface Props {
  dates: ISODate[];
  today: ISODate;
  days: Map<ISODate, DayEntry>;
  shifts: Map<string, ShiftDef>;
  nowMinutes: number;
  breakMinutes: number;
  onOpen: (date: ISODate) => void;
}

/** Cartão principal deslizante: começa em hoje e passa de dia em dia com o dedo. */
export function DayCarousel({ dates, today, days, shifts, nowMinutes, breakMinutes, onOpen }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const todayIndex = Math.max(0, dates.indexOf(today));
  const [index, setIndex] = useState(todayIndex);

  const step = () => {
    const el = scroller.current;
    const first = el?.children[0] as HTMLElement | undefined;
    const second = el?.children[1] as HTMLElement | undefined;
    if (!first) return 1;
    return second ? second.offsetLeft - first.offsetLeft : first.offsetWidth;
  };

  const scrollToIndex = useCallback((i: number, smooth = true) => {
    const el = scroller.current;
    if (!el) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left: i * step(), behavior: smooth && !reduce ? 'smooth' : 'auto' });
  }, []);

  // Abre sempre em hoje (e volta a hoje quando muda o dia).
  useLayoutEffect(() => {
    scrollToIndex(todayIndex, false);
    setIndex(todayIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, dates.length === 0]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const i = Math.round(el.scrollLeft / step());
        setIndex(Math.min(Math.max(i, 0), dates.length - 1));
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [dates.length]);

  const current = dates[index] ?? today;
  const go = (i: number) => scrollToIndex(Math.min(Math.max(i, 0), dates.length - 1));

  return (
    <section aria-roledescription="carrossel" aria-label="Turnos dia a dia">
      <div
        ref={scroller}
        className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-2 pt-1"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {dates.map((date, i) => {
          const entry = days.get(date);
          const shift = entry?.code ? shifts.get(entry.code) : undefined;
          return (
            <div
              key={date}
              className="w-[calc(100%-28px)] shrink-0 snap-start snap-always"
              role="group"
              aria-roledescription="dia"
              aria-label={`${i + 1} de ${dates.length}`}
              aria-hidden={i !== index}
            >
              <DayCard
                date={date}
                today={today}
                entry={entry}
                shift={shift}
                nowMinutes={nowMinutes}
                breakMinutes={breakMinutes}
                onOpen={() => onOpen(date)}
                focusable={i === index}
              />
            </div>
          );
        })}
      </div>

      {dates.length > 1 && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <button
            onClick={() => go(index - 1)}
            disabled={index === 0}
            aria-label="Dia anterior"
            className="press grid h-10 w-10 place-items-center rounded-full bg-[var(--surface)] text-[var(--muted)] shadow-sm disabled:opacity-30"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex min-w-0 flex-1 items-center justify-center gap-2 text-[14px]" aria-live="polite">
            {current === today ? (
              <span className="text-[var(--muted)]">Desliza para ver os outros dias</span>
            ) : (
              <>
                <span className="truncate font-semibold">{dayHeadingShort(today, current)}</span>
                <button
                  onClick={() => go(todayIndex)}
                  className="press flex shrink-0 items-center gap-1 rounded-full bg-[var(--ink)] px-3 py-1.5 text-[13px] font-bold text-[var(--bg)]"
                >
                  <Undo2 size={14} aria-hidden /> Hoje
                </button>
              </>
            )}
          </div>
          <button
            onClick={() => go(index + 1)}
            disabled={index === dates.length - 1}
            aria-label="Dia seguinte"
            className="press grid h-10 w-10 place-items-center rounded-full bg-[var(--surface)] text-[var(--muted)] shadow-sm disabled:opacity-30"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </section>
  );
}
