import { addDays, diffDays, type ISODate } from './dates';

export const CAROUSEL_DAYS_BEFORE = 7;
export const CAROUSEL_MAX_DAYS_AFTER = 120;

/**
 * Dias que o cartão deslizante mostra: até 7 dias para trás (só se houver
 * escala), hoje, e todos os dias seguintes até ao último dia com escala.
 */
export function carouselDates(today: ISODate, recordedDates: ISODate[]): ISODate[] {
  const minStart = addDays(today, -CAROUSEL_DAYS_BEFORE);
  const maxEnd = addDays(today, CAROUSEL_MAX_DAYS_AFTER);
  const inRange = recordedDates.filter((d) => d >= minStart && d <= maxEnd).sort();
  const start = inRange.length && inRange[0] < today ? inRange[0] : today;
  const end = inRange.length && inRange[inRange.length - 1] > today ? inRange[inRange.length - 1] : today;
  return Array.from({ length: diffDays(start, end) + 1 }, (_, i) => addDays(start, i));
}
