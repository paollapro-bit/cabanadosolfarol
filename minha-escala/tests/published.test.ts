import { describe, expect, it } from 'vitest';
import { EscalaDB } from '../src/db/db';
import { IMPORT_NOTICE_KEY, initDatabase, SEED_FLAG_NOV_2026, SEED_FLAG_SHIFTS, type ImportNotice } from '../src/db/seed';
import { confirmDays, setDayNote, setDaysCode } from '../src/db/repo';
import { bundledMonthFiles, parsePublishedMonth, PublishedMonthError, type PublishedMonthFile } from '../src/data/published';
import { SHIFT_CODES } from '../src/lib/shifts';
import { carouselDates } from '../src/lib/carousel';

let n = 0;
const fresh = () => new EscalaDB(`pub-${n++}`);
const nov = bundledMonthFiles().find((f) => f.mes === '2026-11')!;
const dec: PublishedMonthFile = { mes: '2026-12', versao: 1, dias: { '01': 'A1', '02': 'D', '25': 'D' }, observacoes: { '24': 'Consoada' } };

describe('ficheiros de escala publicados', () => {
  it('todos os ficheiros em src/data/escalas são válidos', () => {
    const files = bundledMonthFiles();
    expect(files.map((f) => f.mes)).toContain('2026-11');
    for (const f of files) expect(() => parsePublishedMonth(f, SHIFT_CODES)).not.toThrow();
  });

  it('rejeita códigos e dias inválidos', () => {
    expect(() => parsePublishedMonth({ mes: '2026-11', versao: 1, dias: { '31': 'A1' } }, SHIFT_CODES)).toThrow(PublishedMonthError);
    expect(() => parsePublishedMonth({ mes: '2026-11', versao: 1, dias: { '01': 'Z9' } }, SHIFT_CODES)).toThrow('desconhecido');
    expect(() => parsePublishedMonth({ mes: '2026-13', versao: 1, dias: {} }, SHIFT_CODES)).toThrow('mês inválido');
  });
});

describe('atualização mensal', () => {
  it('na primeira instalação importa todos os meses sem mostrar aviso', async () => {
    const db = fresh();
    const reports = await initDatabase(db, 1, [nov, dec]);
    expect(reports.map((r) => r.month)).toEqual(['2026-11', '2026-12']);
    expect((await db.days.get('2026-12-01'))?.code).toBe('A1');
    expect((await db.days.get('2026-12-24'))).toBeUndefined(); // observação sem turno não cria dia
    expect(await db.settings.get(IMPORT_NOTICE_KEY)).toBeUndefined();
  });

  it('um mês novo chega numa atualização da app e mostra aviso', async () => {
    const db = fresh();
    await initDatabase(db, 1, [nov]);
    const reports = await initDatabase(db, 2, [nov, dec]);
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ month: '2026-12', isNew: true, added: 3 });
    const notice = (await db.settings.get(IMPORT_NOTICE_KEY))?.value as ImportNotice;
    expect(notice.reports[0].month).toBe('2026-12');
    // não volta a aplicar a mesma versão
    expect(await initDatabase(db, 3, [nov, dec])).toHaveLength(0);
  });

  it('uma correção (nova versão) atualiza dias importados/conferidos mas nunca os alterados à mão', async () => {
    const db = fresh();
    await initDatabase(db, 1, [nov]);
    await setDaysCode(['2026-11-07'], 'A1', db); // Lorena trocou à mão
    await confirmDays(['2026-11-08'], db); // conferiu o C
    await setDayNote('2026-11-09', 'Levar farda', db);

    const corrected: PublishedMonthFile = {
      ...nov,
      versao: 2,
      dias: { ...nov.dias, '07': 'B2', '08': 'B1', '09': 'D', '01': 'C' },
    };
    delete (corrected.dias as Record<string, string>)['30'];
    const [r] = await initDatabase(db, 2, [corrected]);

    expect(r).toMatchObject({ isNew: false, added: 1, updated: 2, removed: 1, kept: ['2026-11-07'] });
    expect((await db.days.get('2026-11-07'))?.code).toBe('A1');
    expect(await db.days.get('2026-11-08')).toMatchObject({ code: 'B1', source: 'importado' });
    expect(await db.days.get('2026-11-09')).toMatchObject({ code: 'D', note: 'Levar farda' });
    expect((await db.days.get('2026-11-01'))?.code).toBe('C');
    expect(await db.days.get('2026-11-30')).toBeUndefined();
    expect((await db.days.get('2026-11-12'))?.code).toBe('A3');
  });

  it('instalações da primeira versão não reimportam novembro', async () => {
    const db = fresh();
    await db.settings.bulkPut([
      { key: SEED_FLAG_SHIFTS, value: 1 },
      { key: SEED_FLAG_NOV_2026, value: 1 },
    ]);
    await db.days.put({ date: '2026-11-07', code: 'B3', source: 'importado', updatedAt: 1 });
    await db.days.delete('2026-11-06'); // apagado pela Lorena na versão antiga
    expect(await initDatabase(db, 2, [nov])).toHaveLength(0);
    expect(await db.days.get('2026-11-06')).toBeUndefined();
  });
});

describe('cartão deslizante', () => {
  it('vai de hoje até ao último dia com escala', () => {
    const recorded = ['2026-11-06', '2026-11-07', '2026-11-30'];
    const d = carouselDates('2026-11-07', recorded);
    expect(d[0]).toBe('2026-11-06');
    expect(d[d.length - 1]).toBe('2026-11-30');
    expect(d).toHaveLength(25);
  });

  it('mostra só hoje quando não há escala e ignora dias muito antigos', () => {
    expect(carouselDates('2026-11-05', [])).toEqual(['2026-11-05']);
    expect(carouselDates('2026-11-20', ['2026-11-06'])).toEqual(['2026-11-20']);
    expect(carouselDates('2026-11-03', ['2026-11-06'])).toEqual(['2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06']);
  });
});
