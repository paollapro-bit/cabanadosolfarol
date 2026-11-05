import { describe, expect, it } from 'vitest';
import { DEFAULT_SHIFTS, formatDuration, grossMinutes, netMinutes } from '../src/lib/shifts';
import { shiftProgress } from '../src/lib/summary';

const get = (c: string) => DEFAULT_SHIFTS.find((s) => s.code === c)!;

describe('turnos e horas', () => {
  it('tem os 8 códigos com os horários pedidos', () => {
    expect(DEFAULT_SHIFTS.map((s) => s.code)).toEqual(['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C', 'D']);
    expect(get('A3')).toMatchObject({ start: '07:30', end: '16:15', type: 'abertura', role: 'Copa' });
    expect(get('B3')).toMatchObject({ start: '11:45', end: '20:30', type: 'fecho', role: 'Copa' });
    expect(get('C')).toMatchObject({ start: '10:00', end: '18:45', type: 'intermedio', role: 'Suporte' });
    expect(get('D')).toMatchObject({ start: null, type: 'folga' });
  });

  it('calcula a duração bruta e líquida', () => {
    expect(grossMinutes(get('A1'))).toBe(525); // 8 h 45
    expect(netMinutes(get('A1'), 45)).toBe(480);
    expect(netMinutes(get('B2'), 30)).toBe(495);
    expect(netMinutes(get('D'), 45)).toBe(0);
    expect(grossMinutes({ code: 'N', start: '22:00', end: '06:00', type: 'fecho', role: 'Noite' })).toBe(480);
  });

  it('formata durações', () => {
    expect(formatDuration(525)).toBe('8 h 45 min');
    expect(formatDuration(480)).toBe('8 h');
    expect(formatDuration(30)).toBe('30 min');
    expect(formatDuration(136 * 60)).toBe('136 h');
  });

  it('indica o estado do turno ao longo do dia', () => {
    const b3 = get('B3');
    expect(shiftProgress(b3, 9 * 60)).toBe('Entras daqui a 2 h 45 min');
    expect(shiftProgress(b3, 20 * 60)).toBe('Em curso · faltam 30 min');
    expect(shiftProgress(b3, 21 * 60)).toBe('Turno concluído');
  });
});
