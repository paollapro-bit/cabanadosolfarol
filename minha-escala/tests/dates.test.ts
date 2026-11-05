import { describe, expect, it } from 'vitest';
import {
  addDays,
  daysInMonth,
  formatLongDate,
  formatMonthYear,
  lisbonNow,
  monthGrid,
  shiftMonth,
  startOfWeek,
  todayInLisbon,
  weekdayIndex,
} from '../src/lib/dates';

describe('datas em Europe/Lisbon', () => {
  it('usa o dia de Lisboa e não o do dispositivo', () => {
    // 23:30 UTC no inverno = 23:30 em Lisboa (ainda dia 5)
    expect(todayInLisbon(new Date('2026-11-05T23:30:00Z'))).toBe('2026-11-05');
    // 23:30 UTC no verão = 00:30 do dia seguinte em Lisboa (WEST, UTC+1)
    expect(todayInLisbon(new Date('2026-07-05T23:30:00Z'))).toBe('2026-07-06');
    // 23:30 em São Paulo (UTC-3) já é dia seguinte em Lisboa
    expect(todayInLisbon(new Date('2026-11-06T02:30:00Z'))).toBe('2026-11-06');
  });

  it('calcula os minutos desde a meia-noite em Lisboa', () => {
    expect(lisbonNow(new Date('2026-11-05T11:45:00Z')).minutes).toBe(11 * 60 + 45);
    expect(lisbonNow(new Date('2026-07-05T11:45:00Z')).minutes).toBe(12 * 60 + 45);
  });

  it('soma dias atravessando meses, anos e mudança de hora', () => {
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25');
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26');
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29');
  });

  it('semana começa à segunda-feira', () => {
    expect(weekdayIndex('2026-11-02')).toBe(0); // segunda
    expect(weekdayIndex('2026-11-01')).toBe(6); // domingo
    expect(startOfWeek('2026-11-05')).toBe('2026-11-02');
    expect(startOfWeek('2026-11-01')).toBe('2026-10-26');
  });

  it('constrói a grelha de novembro de 2026', () => {
    const grid = monthGrid(2026, 11);
    expect(daysInMonth(2026, 11)).toBe(30);
    expect(grid[0]).toEqual([null, null, null, null, null, null, '2026-11-01']);
    expect(grid[grid.length - 1][0]).toBe('2026-11-30');
    expect(grid.flat().filter(Boolean)).toHaveLength(30);
    expect(grid.every((w) => w.length === 7)).toBe(true);
  });

  it('navega entre meses e anos', () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth(2026, 11, -23)).toEqual({ year: 2024, month: 12 });
  });

  it('formata em português de Portugal', () => {
    expect(formatLongDate('2026-11-05')).toBe('Quinta-feira, 5 de novembro');
    expect(formatMonthYear(2026, 11)).toBe('novembro de 2026');
  });
});
