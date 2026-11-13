import { beforeEach, describe, expect, it } from 'vitest';
import { EscalaDB } from '../src/db/db';
import { initDatabase } from '../src/db/seed';
import { confirmDays, setDayNote, setDaysCode } from '../src/db/repo';
import { createBackup, parseBackup, restoreBackup, BackupError } from '../src/lib/backup';
import { summarizeMonth, findNext } from '../src/lib/summary';
import { shiftMap } from '../src/lib/shifts';
import { monthText } from '../src/lib/share';
import { scheduleCsv, scheduleIcs } from '../src/lib/export';

let n = 0;
let db: EscalaDB;
beforeEach(async () => {
  db = new EscalaDB(`teste-${n++}`);
  await initDatabase(db);
});

async function state(database = db) {
  const days = new Map((await database.days.toArray()).map((d) => [d.date, d]));
  const shifts = shiftMap(await database.shifts.toArray());
  return { days, shifts };
}

describe('base de dados local', () => {
  it('importa novembro de 2026 com os dias 1–5 sem dados', async () => {
    expect(await db.days.count()).toBe(25);
    expect(await db.days.get('2026-11-05')).toBeUndefined();
    expect((await db.days.get('2026-11-06'))?.code).toBe('A3');
    expect((await db.days.get('2026-11-19'))?.code).toBe('B1');
    expect((await db.days.get('2026-11-30'))?.code).toBe('A3');
    expect((await db.days.get('2026-11-06'))?.source).toBe('importado');
    expect(await db.shifts.count()).toBe(8);
  });

  it('não sobrescreve alterações da utilizadora quando a app volta a arrancar', async () => {
    await setDaysCode(['2026-11-06'], 'B1', db);
    await setDaysCode(['2026-11-10'], null, db); // apagar folga
    await setDaysCode(['2026-11-03'], 'C', db);
    await db.shifts.update('C', { start: '09:00' });
    db.close();

    const reopened = new EscalaDB(db.name);
    await initDatabase(reopened);
    await initDatabase(reopened);
    expect((await reopened.days.get('2026-11-06'))?.code).toBe('B1');
    expect(await reopened.days.get('2026-11-10')).toBeUndefined();
    expect((await reopened.days.get('2026-11-03'))?.code).toBe('C');
    expect((await reopened.shifts.get('C'))?.start).toBe('09:00');
    db = reopened;
  });

  it('não importa por cima de dias que já existiam antes da primeira instalação', async () => {
    const fresh = new EscalaDB(`fresh-${n++}`);
    await fresh.days.put({ date: '2026-11-07', code: 'A1', source: 'utilizadora', updatedAt: 1 });
    await initDatabase(fresh);
    expect((await fresh.days.get('2026-11-07'))?.code).toBe('A1');
    expect(await fresh.days.count()).toBe(25);
  });

  it('edita vários dias de uma vez e mantém as observações', async () => {
    await setDayNote('2026-11-12', 'Formação às 9h', db);
    await setDaysCode(['2026-11-01', '2026-11-02', '2026-11-12'], 'B2', db);
    const d12 = await db.days.get('2026-11-12');
    expect(d12).toMatchObject({ code: 'B2', note: 'Formação às 9h', source: 'utilizadora' });
    expect((await db.days.get('2026-11-01'))?.code).toBe('B2');
  });

  it('distingue folga de dia sem escala, mesmo com observação', async () => {
    await setDayNote('2026-11-04', 'Perguntar escala à gerente', db);
    const d4 = await db.days.get('2026-11-04');
    expect(d4).toMatchObject({ code: null, note: 'Perguntar escala à gerente' });
    await setDayNote('2026-11-04', '', db);
    expect(await db.days.get('2026-11-04')).toBeUndefined();
    expect((await db.days.get('2026-11-10'))?.code).toBe('D');
  });

  it('marca dias como conferidos', async () => {
    await confirmDays(['2026-11-06', '2026-11-07'], db);
    expect((await db.days.get('2026-11-06'))?.source).toBe('conferido');
    expect((await db.days.get('2026-11-08'))?.source).toBe('importado');
  });
});

describe('cálculos do calendário', () => {
  it('resume novembro de 2026', async () => {
    const { days, shifts } = await state();
    const s = summarizeMonth(2026, 11, days, shifts, 45);
    expect(s).toMatchObject({ totalDays: 30, worked: 17, off: 8, noData: 5, unverified: 25 });
    expect(s.byType).toEqual({ abertura: 6, fecho: 10, intermedio: 1 });
    expect(s.netMinutes).toBe(17 * 8 * 60); // 136 h
    expect(summarizeMonth(2026, 11, days, shifts, 0).netMinutes).toBe(17 * 525);
  });

  it('encontra a próxima folga e o próximo turno', async () => {
    const { days, shifts } = await state();
    const list = [...days.values()];
    expect(findNext('2026-11-05', list, shifts, 'folga')?.date).toBe('2026-11-10');
    expect(findNext('2026-11-05', list, shifts, 'turno')?.date).toBe('2026-11-06');
    expect(findNext('2026-11-16', list, shifts, 'turno')?.date).toBe('2026-11-18');
    expect(findNext('2026-11-30', list, shifts, 'folga')).toBeUndefined();
  });

  it('gera o texto para WhatsApp', async () => {
    const { days, shifts } = await state();
    const text = monthText(2026, 11, days, shifts, 'Lorena');
    expect(text).toContain('Escala de Lorena — novembro de 2026');
    expect(text).toContain('Dom 01 · Sem escala');
    expect(text).toContain('Sex 06 · 07:30–16:15 · Abertura · Copa (A3)');
    expect(text).toContain('Ter 10 · 🌿 Folga');
  });

  it('exporta CSV e ICS', async () => {
    const { days, shifts } = await state();
    const csv = scheduleCsv([...days.values()], shifts);
    expect(csv.split('\r\n')[1]).toBe('2026-11-06;A3;Abertura;Copa;07:30;16:15;');
    const ics = scheduleIcs([...days.values()], shifts);
    expect(ics).toContain('DTSTART;TZID=Europe/Lisbon:20261106T073000');
    expect(ics).toContain('DTSTART;VALUE=DATE:20261110');
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(25);
  });
});

describe('cópia de segurança', () => {
  it('exporta e restaura sem perder nada', async () => {
    await setDaysCode(['2026-12-01'], 'C', db);
    await setDayNote('2026-12-01', 'Natal', db);
    const json = JSON.stringify(await createBackup(db));

    const other = new EscalaDB(`restauro-${n++}`);
    await initDatabase(other);
    await setDaysCode(['2026-11-06'], 'D', other);
    await restoreBackup(other, parseBackup(json));
    expect((await other.days.get('2026-12-01'))).toMatchObject({ code: 'C', note: 'Natal' });
    expect((await other.days.get('2026-11-06'))?.code).toBe('A3');
    expect(await other.days.count()).toBe(26);

    // Reabrir depois de restaurar não volta a importar novembro por cima.
    await initDatabase(other);
    expect(await other.days.count()).toBe(26);
  });

  it('rejeita ficheiros inválidos com mensagens em português', () => {
    expect(() => parseBackup('isto não é json')).toThrow(BackupError);
    expect(() => parseBackup('{"app":"outra"}')).toThrow('não é uma cópia da Minha Escala');
    expect(() =>
      parseBackup(JSON.stringify({ app: 'minha-escala', version: 1, days: [{ date: '6/11', code: 'A3' }], shifts: [], settings: [] })),
    ).toThrow('dias com formato inválido');
  });
});
