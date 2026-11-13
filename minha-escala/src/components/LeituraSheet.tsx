import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Camera, ChevronLeft, ChevronRight, ImagePlus, Info, Loader2, RotateCcw, Sparkles, UserSearch, WifiOff } from 'lucide-react';
import { Sheet } from './Sheet';
import { ConfirmChange } from './ConfirmChange';
import { useNotify } from './Announcer';
import { db } from '../db/db';
import { setDaysImported } from '../db/repo';
import { useShifts } from '../hooks/useData';
import { useOnline } from '../hooks/useNow';
import { useNome } from '../lib/perfil';
import { formatMonthYear, monthDates, parseISO, shiftMonth, toISO, WEEKDAY_SHORT, weekdayIndex, type ISODate } from '../lib/dates';
import { CODIGO_OUTRO, type ResultadoLeitura } from '../lib/leitura';
import { ErroLeitura, lerEscala } from '../lib/leituraCliente';
import { prepararImagem } from '../lib/imagem';
import { shiftTimeRange, TYPE_LABEL } from '../lib/shifts';
import { CHIP } from '../lib/theme';

const mesAno = (y: number, m: number) => {
  const t = formatMonthYear(y, m);
  return t.charAt(0).toUpperCase() + t.slice(1);
};

interface Props {
  open: boolean;
  year: number;
  month: number;
  onClose: () => void;
  /** Depois de guardar, para o calendário mostrar o mês importado. */
  onSaved?: (year: number, month: number) => void;
}

type Fase =
  | { tipo: 'form' }
  | { tipo: 'lendo' }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'nao-encontrado'; resultado: ResultadoLeitura }
  | { tipo: 'revisao'; resultado: ResultadoLeitura };

/** Ler a escala de uma fotografia com IA, rever dia a dia e só depois guardar. */
export function LeituraSheet(props: Props) {
  return (
    <Sheet open={props.open} onClose={props.onClose} title="Ler escala da fotografia" subtitle="A IA lê a tua linha da folha; tu confirmas antes de guardar.">
      {props.open && <Leitura key={`${props.year}-${props.month}`} {...props} />}
    </Sheet>
  );
}

function Leitura({ year, month, onClose, onSaved }: Props) {
  const nomeGuardado = useNome();
  const shifts = useShifts();
  const online = useOnline();
  const notify = useNotify();
  const [ym, setYm] = useState({ year, month });
  const [nome, setNomeLocal] = useState<string | null>(null);
  const [foto, setFoto] = useState<{ base64: string; url: string } | null>(null);
  const [fase, setFase] = useState<Fase>({ tipo: 'form' });
  const abort = useRef<AbortController | null>(null);
  const camara = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);

  const nomeAtual = nome ?? nomeGuardado ?? '';
  useEffect(() => () => abort.current?.abort(), []);

  const escolherFoto = async (file: File | undefined) => {
    if (!file) return;
    try {
      const p = await prepararImagem(file);
      setFoto({ base64: p.base64, url: p.url });
      setFase({ tipo: 'form' });
    } catch (e) {
      setFase({ tipo: 'erro', mensagem: (e as Error).message });
    }
  };

  const ler = async (nomeParaLer = nomeAtual) => {
    if (!foto || !shifts) return;
    abort.current?.abort();
    abort.current = new AbortController();
    setFase({ tipo: 'lendo' });
    try {
      const resultado = await lerEscala(
        {
          imagem: foto.base64,
          tipo: 'image/jpeg',
          nome: nomeParaLer,
          ano: ym.year,
          mes: ym.month,
          turnos: shifts.list.map((s) => ({
            codigo: s.code,
            descricao: s.type === 'folga' ? 'Folga / descanso' : `${TYPE_LABEL[s.type]}, ${s.role}, ${shiftTimeRange(s)}`,
          })),
        },
        abort.current.signal,
      );
      setFase(resultado.pessoa_encontrada ? { tipo: 'revisao', resultado } : { tipo: 'nao-encontrado', resultado });
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return;
      setFase({ tipo: 'erro', mensagem: e instanceof ErroLeitura ? e.message : 'Algo correu mal. Tenta outra vez.' });
    }
  };

  if (!shifts || nomeGuardado === undefined) return <div className="h-64" />;

  if (fase.tipo === 'lendo')
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center" role="status" aria-live="polite">
        <Loader2 size={40} className="animate-spin text-[var(--accent)]" aria-hidden />
        <div>
          <p className="text-[18px] font-bold">A ler a escala de {nomeAtual}…</p>
          <p className="mt-1 text-[15px] text-[var(--muted)]">Pode demorar até um minuto. Não feches a aplicação.</p>
        </div>
        <button
          onClick={() => {
            abort.current?.abort();
            setFase({ tipo: 'form' });
          }}
          className="press rounded-full bg-[var(--surface-2)] px-5 py-2.5 text-[15px] font-semibold"
        >
          Cancelar
        </button>
      </div>
    );

  if (fase.tipo === 'revisao')
    return (
      <Revisao
        resultado={fase.resultado}
        year={ym.year}
        month={ym.month}
        foto={foto}
        onVoltar={() => setFase({ tipo: 'form' })}
        onGuardado={(n) => {
          notify(n === 0 ? 'Já estava tudo igual' : `${n} ${n === 1 ? 'dia guardado' : 'dias guardados'}`);
          onSaved?.(ym.year, ym.month);
          onClose();
        }}
      />
    );

  return (
    <div className="space-y-5 pt-1">
      {fase.tipo === 'erro' && (
        <div role="alert" className="rounded-2xl bg-red-50 p-4 text-[15px] text-red-900 dark:bg-red-500/15 dark:text-red-100">
          {fase.mensagem}
        </div>
      )}

      {fase.tipo === 'nao-encontrado' && (
        <div className="rounded-2xl bg-amber-50 p-4 text-amber-950 dark:bg-amber-500/15 dark:text-amber-50">
          <p className="flex items-center gap-2 text-[16px] font-bold">
            <UserSearch size={20} aria-hidden /> Não encontrei “{nomeAtual}” na folha
          </p>
          {fase.resultado.nomes_na_folha.length > 0 ? (
            <>
              <p className="mt-1 text-[14px]">Toca no teu nome tal como aparece:</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {fase.resultado.nomes_na_folha.map((n) => (
                  <button
                    key={n}
                    onClick={() => {
                      setNomeLocal(n);
                      void ler(n);
                    }}
                    className="press rounded-full bg-white px-3.5 py-2 text-[14px] font-semibold text-neutral-900 shadow-sm dark:bg-white/15 dark:text-white"
                  >
                    {n}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-1 text-[14px]">Não consegui ler os nomes. Experimenta uma fotografia mais nítida e de frente.</p>
          )}
        </div>
      )}

      {/* Mês */}
      <section>
        <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-[var(--muted)]">Mês da escala</h3>
        <div className="flex items-center gap-2 rounded-2xl bg-[var(--surface-2)] p-1.5">
          <button onClick={() => setYm((p) => shiftMonth(p.year, p.month, -1))} aria-label="Mês anterior" className="press grid h-10 w-10 place-items-center rounded-xl bg-[var(--surface)]">
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1 text-center text-[17px] font-bold" aria-live="polite">
            {mesAno(ym.year, ym.month)}
          </div>
          <button onClick={() => setYm((p) => shiftMonth(p.year, p.month, 1))} aria-label="Mês seguinte" className="press grid h-10 w-10 place-items-center rounded-xl bg-[var(--surface)]">
            <ChevronRight size={20} />
          </button>
        </div>
      </section>

      {/* Nome */}
      <label className="block">
        <span className="mb-2 block text-[13px] font-semibold uppercase tracking-wide text-[var(--muted)]">O teu nome na folha</span>
        <input
          value={nomeAtual}
          onChange={(e) => setNomeLocal(e.target.value)}
          placeholder="Ex.: Lorena Mineiro"
          autoComplete="name"
          className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 text-[17px] outline-none focus:border-[var(--accent)]"
        />
      </label>

      {/* Fotografia */}
      <section>
        <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-[var(--muted)]">Fotografia</h3>
        {foto ? (
          <div className="overflow-hidden rounded-2xl bg-[var(--surface-2)]">
            <img src={foto.url} alt="Fotografia da escala escolhida" className="max-h-56 w-full object-contain" />
          </div>
        ) : (
          <p className="rounded-2xl border-2 border-dashed border-[var(--line)] p-4 text-[14px] leading-snug text-[var(--muted)]">
            Fotografa a folha inteira, de frente, com boa luz e sem sombras por cima da tua linha.
          </p>
        )}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button onClick={() => camara.current?.click()} className="press flex items-center justify-center gap-2 rounded-2xl bg-[var(--surface-2)] py-3.5 text-[15px] font-bold">
            <Camera size={19} aria-hidden /> {foto ? 'Tirar outra' : 'Tirar fotografia'}
          </button>
          <button onClick={() => galeria.current?.click()} className="press flex items-center justify-center gap-2 rounded-2xl bg-[var(--surface-2)] py-3.5 text-[15px] font-bold">
            <ImagePlus size={19} aria-hidden /> Da galeria
          </button>
        </div>
        <input ref={camara} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => escolherFoto(e.target.files?.[0])} />
        <input ref={galeria} type="file" accept="image/*" className="hidden" onChange={(e) => escolherFoto(e.target.files?.[0])} />
      </section>

      {!online && (
        <p className="flex items-center gap-2 rounded-2xl bg-[var(--surface-2)] p-3 text-[14px] text-[var(--muted)]">
          <WifiOff size={18} aria-hidden /> A leitura precisa de internet. Liga-te e tenta outra vez.
        </p>
      )}

      <button
        onClick={() => void ler()}
        disabled={!foto || !online || nomeAtual.trim().length < 2}
        className="press flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--ink)] py-4 text-[17px] font-bold text-[var(--bg)] disabled:opacity-40"
      >
        <Sparkles size={20} aria-hidden /> Ler escala
      </button>

      <p className="flex gap-2 pb-2 text-[13px] leading-snug text-[var(--muted)]">
        <Info size={16} className="mt-0.5 shrink-0" aria-hidden />
        A fotografia é enviada para ser lida por inteligência artificial e não fica guardada no servidor. A IA pode enganar-se: vais rever cada dia antes de guardar.
      </p>
    </div>
  );
}

function Revisao({
  resultado,
  year,
  month,
  foto,
  onVoltar,
  onGuardado,
}: {
  resultado: ResultadoLeitura;
  year: number;
  month: number;
  foto: { base64: string; url: string } | null;
  onVoltar: () => void;
  onGuardado: (n: number) => void;
}) {
  const shifts = useShifts();
  const dates = useMemo(() => monthDates(year, month), [year, month]);
  const existing = useLiveQuery(async () => new Map((await db.days.bulkGet(dates)).map((d, i) => [dates[i], d?.code ?? null])), [dates]);
  const [escolhas, setEscolhas] = useState<Map<ISODate, string>>(
    () => new Map(resultado.dias.map((d) => [toISO(year, month, d.dia), d.codigo === CODIGO_OUTRO ? '' : d.codigo])),
  );
  const [confirmar, setConfirmar] = useState<ISODate[] | null>(null);
  const duvidas = new Set(resultado.dias.filter((d) => d.certeza === 'baixa' || d.codigo === CODIGO_OUTRO).map((d) => toISO(year, month, d.dia)));
  const lidoPorData = new Map(resultado.dias.map((d) => [toISO(year, month, d.dia), d]));
  const mesFolha = resultado.mes_na_folha;
  const mesDiferente = mesFolha && mesFolha !== `${year}-${String(month).padStart(2, '0')}`;

  if (!shifts || !existing) return <div className="h-64" />;

  const alteracoes = dates.filter((d) => (escolhas.get(d) || null) !== (existing.get(d) ?? null));
  const substituidos = alteracoes.filter((d) => existing.get(d) !== null);

  const guardar = async (confirmado = false) => {
    if (substituidos.length && !confirmado) return setConfirmar(substituidos);
    await setDaysImported(alteracoes.map((d) => ({ date: d, code: escolhas.get(d) || null })));
    if (foto) {
      const key = `${year}-${String(month).padStart(2, '0')}`;
      const blob = await (await fetch(foto.url)).blob();
      await db.transaction('rw', db.attachments, async () => {
        await db.attachments.where('month').equals(key).delete();
        await db.attachments.add({ month: key, name: `escala-${key}.jpg`, type: 'image/jpeg', blob, createdAt: Date.now() });
      });
    }
    onGuardado(alteracoes.length);
  };

  return (
    <div className="space-y-4 pt-1">
      <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-950 dark:bg-emerald-500/15 dark:text-emerald-50">
        <p className="text-[16px] font-bold">Encontrei “{resultado.nome_na_folha}”</p>
        <p className="text-[14px]">
          {mesAno(year, month)} · {duvidas.size > 0 ? `${duvidas.size} ${duvidas.size === 1 ? 'dia a conferir' : 'dias a conferir'} (a amarelo)` : 'confere os dias abaixo'}
        </p>
      </div>
      {mesDiferente && (
        <p role="alert" className="rounded-2xl bg-amber-50 p-3 text-[14px] text-amber-950 dark:bg-amber-500/15 dark:text-amber-50">
          A folha parece ser de <strong>{formatMonthYear(...(mesFolha.split('-').map(Number) as [number, number]))}</strong>. Se for esse o mês,
          volta atrás e escolhe-o antes de guardar.
        </p>
      )}
      {resultado.observacoes && <p className="rounded-2xl bg-[var(--surface-2)] p-3 text-[14px] leading-snug">{resultado.observacoes}</p>}

      <ul className="divide-y divide-[var(--line)] overflow-hidden rounded-2xl border border-[var(--line)]">
        {dates.map((date) => {
          const valor = escolhas.get(date) ?? '';
          const atual = existing.get(date) ?? null;
          const s = valor ? shifts.map.get(valor) : undefined;
          const lido = lidoPorData.get(date);
          const duvida = duvidas.has(date);
          const muda = (valor || null) !== atual;
          const { day } = parseISO(date);
          return (
            <li key={date} className={`flex items-center gap-3 px-3 py-2.5 ${duvida ? 'bg-amber-50 dark:bg-amber-500/10' : ''}`}>
              <div className="w-10 shrink-0 text-center">
                <div className="text-[11px] font-semibold uppercase text-[var(--muted)]">{WEEKDAY_SHORT[weekdayIndex(date)]}</div>
                <div className="tabular text-[18px] font-bold leading-tight">{day}</div>
              </div>
              <select
                value={valor}
                onChange={(e) => setEscolhas((m) => new Map(m).set(date, e.target.value))}
                aria-label={`Turno do dia ${day}`}
                className={`h-11 w-[92px] shrink-0 rounded-xl px-2 text-[16px] font-bold outline-none ${s ? CHIP[s.type] : 'border border-dashed border-[var(--line)] bg-transparent text-[var(--muted)]'}`}
              >
                <option value="">—</option>
                {shifts.list.map((sh) => (
                  <option key={sh.code} value={sh.code}>
                    {sh.code}
                  </option>
                ))}
              </select>
              <div className="min-w-0 flex-1 text-[13px] leading-tight">
                <div className="font-semibold">{s ? (s.type === 'folga' ? 'Folga' : `${shiftTimeRange(s)} · ${s.role}`) : 'Sem escala'}</div>
                {duvida && (
                  <div className="text-amber-800 dark:text-amber-200">
                    {lido?.codigo === CODIGO_OUTRO ? `Lido “${lido.texto_lido}” — escolhe o turno` : 'Leitura incerta — confere'}
                  </div>
                )}
                {muda && atual && <div className="text-[var(--muted)]">Agora: {atual} → passa a {valor || 'sem escala'}</div>}
              </div>
            </li>
          );
        })}
      </ul>

      {confirmar ? (
        <ConfirmChange
          title={`Substituir ${confirmar.length} ${confirmar.length === 1 ? 'dia que já tem' : 'dias que já têm'} turno?`}
          to={null}
          shifts={shifts.map}
          detail={confirmar.map((d) => `dia ${parseISO(d).day}: ${existing.get(d)} → ${escolhas.get(d) || 'sem escala'}`).join(' · ')}
          confirmLabel="Sim, substituir"
          cancelLabel="Não, rever"
          onConfirm={() => void guardar(true)}
          onCancel={() => setConfirmar(null)}
        />
      ) : (
        <div className="sticky bottom-0 -mx-5 space-y-2 bg-[var(--surface)] px-5 pb-1 pt-2">
          <button onClick={() => void guardar()} className="press w-full rounded-2xl bg-[var(--ink)] py-4 text-[17px] font-bold text-[var(--bg)]">
            {alteracoes.length === 0 ? 'Concluir (sem alterações)' : `Guardar ${alteracoes.length} ${alteracoes.length === 1 ? 'dia' : 'dias'}`}
          </button>
          <button onClick={onVoltar} className="press flex w-full items-center justify-center gap-1.5 py-2 text-[15px] font-semibold text-[var(--accent)]">
            <RotateCcw size={16} aria-hidden /> Voltar e ler outra vez
          </button>
        </div>
      )}
    </div>
  );
}
