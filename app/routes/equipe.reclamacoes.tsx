import { useCallback, useEffect, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useAcessibilidade } from '~/components/Acessibilidade'
import { PainelDaEquipe, useEquipe } from '~/components/Equipe'
import { atualizarReclamacao, listarReclamacoesDaEquipe } from '~/lib/api'
import {
  ehEmail,
  fraseDaReclamacaoParaEquipe,
  NOTA_MAXIMA,
  nomeAssunto,
  protocolo,
  ROTULO_RECLAMACAO,
  type Reclamacao,
  type StatusReclamacao,
} from '~/lib/reclamacoes'
import { formatarTelefone } from '~/lib/reservas'

export const Route = createFileRoute('/equipe/reclamacoes')({
  head: () => ({
    meta: [{ title: 'Reclamações · Painel da equipe' }, { name: 'robots', content: 'noindex' }],
  }),
  component: () => (
    <PainelDaEquipe titulo="Reclamações dos clientes">
      <ReclamacoesDaEquipe />
    </PainelDaEquipe>
  ),
})

const INTERVALO_MS = 30000

const GRUPOS: { status: StatusReclamacao; titulo: (n: number) => string; vazio: string }[] = [
  {
    status: 'recebida',
    titulo: (n) => (n === 1 ? '1 reclamação nova' : `${n} reclamações novas`),
    vazio: 'Nenhuma reclamação nova.',
  },
  { status: 'em_analise', titulo: (n) => `Em análise (${n})`, vazio: 'Nenhuma em análise.' },
  {
    status: 'resolvida',
    titulo: (n) => `Resolvidas (${n})`,
    vazio: 'Nenhuma resolvida nos últimos 90 dias.',
  },
]

function ReclamacoesDaEquipe() {
  const { anunciar } = useAcessibilidade()
  const { pin, unidade, falha, limparErro } = useEquipe()
  const [lista, setLista] = useState<Reclamacao[] | null>(null)
  const conhecidas = useRef<Set<string> | null>(null)

  const carregar = useCallback(async () => {
    try {
      const { reclamacoes } = await listarReclamacoesDaEquipe(unidade, pin)
      limparErro()
      setLista(reclamacoes)
      const novas = reclamacoes.filter(
        (r) => r.status === 'recebida' && conhecidas.current && !conhecidas.current.has(r.id),
      )
      conhecidas.current = new Set(reclamacoes.map((r) => r.id))
      if (novas.length) anunciar(novas.map(fraseDaReclamacaoParaEquipe).join(' '))
    } catch (e) {
      falha(e)
    }
  }, [unidade, pin, anunciar, falha, limparErro])

  useEffect(() => {
    conhecidas.current = null
    setLista(null)
    carregar()
    const timer = window.setInterval(carregar, INTERVALO_MS)
    return () => window.clearInterval(timer)
  }, [carregar])

  async function mudar(r: Reclamacao, mudancas: { status?: StatusReclamacao; nota?: string }, aviso: string) {
    try {
      await atualizarReclamacao(r.id, mudancas, pin)
      anunciar(aviso)
      await carregar()
      return true
    } catch (e) {
      falha(e)
      return false
    }
  }

  if (lista === null) {
    return (
      <section>
        <h2>Carregando reclamações…</h2>
      </section>
    )
  }

  return (
    <>
      {GRUPOS.map((g) => {
        const doGrupo = lista.filter((r) => r.status === g.status)
        return (
          <section key={g.status} aria-labelledby={`titulo-${g.status}`}>
            <h2 id={`titulo-${g.status}`}>{g.titulo(doGrupo.length)}</h2>
            {doGrupo.length === 0 && <p className="vazio">{g.vazio}</p>}
            <ul className="lista">
              {doGrupo.map((r) => (
                <li key={r.id}>
                  <CartaoDaReclamacao reclamacao={r} aoMudar={mudar} />
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </>
  )
}

function CartaoDaReclamacao({
  reclamacao: r,
  aoMudar,
}: {
  reclamacao: Reclamacao
  aoMudar: (r: Reclamacao, m: { status?: StatusReclamacao; nota?: string }, aviso: string) => Promise<boolean>
}) {
  const [nota, setNota] = useState(r.nota ?? '')
  const p = protocolo(r.id)
  return (
    <article className="cartao">
      <div className="linha-topo">
        <h3>{nomeAssunto(r.assunto)}</h3>
        <span className="situacao" data-status={r.status === 'resolvida' ? 'concluido' : 'aguardando'}>
          {ROTULO_RECLAMACAO[r.status]}
        </span>
      </div>
      <p className="dica">
        Protocolo {p} · {new Date(r.criadoEm).toLocaleString('pt-BR', { timeZone: 'America/Fortaleza' })}
      </p>
      <p className="mensagem">{r.mensagem}</p>
      <p>
        {r.nome ?? 'Cliente não se identificou'}
        {r.contato ? '' : ' · não pediu resposta'}
      </p>
      {r.contato && (
        <div className="acoes">
          {ehEmail(r.contato) ? (
            <a className="botao botao-linha" href={`mailto:${r.contato}?subject=Cabana do Sol, protocolo ${p}`}>
              E-mail: {r.contato}
            </a>
          ) : (
            <>
              <a className="botao botao-linha" href={`tel:+55${r.contato}`}>
                Ligar: {formatarTelefone(r.contato)}
              </a>
              <a className="botao botao-linha" href={`https://wa.me/55${r.contato}`} target="_blank" rel="noreferrer">
                WhatsApp<span className="sr-only"> (abre em outra aba)</span>
              </a>
            </>
          )}
        </div>
      )}
      <div className="campo">
        <label htmlFor={`nota-${r.id}`}>O que foi feito (só a equipe vê)</label>
        <textarea
          id={`nota-${r.id}`}
          rows={2}
          maxLength={NOTA_MAXIMA}
          value={nota}
          onChange={(e) => setNota(e.target.value)}
        />
      </div>
      <div className="acoes">
        {nota !== (r.nota ?? '') && (
          <button type="button" className="botao botao-linha" onClick={() => aoMudar(r, { nota }, 'Anotação salva.')}>
            Salvar anotação<span className="sr-only"> do protocolo {p}</span>
          </button>
        )}
        {r.status === 'recebida' && (
          <button
            type="button"
            className="botao botao-linha"
            onClick={() => aoMudar(r, { status: 'em_analise', nota }, `Protocolo ${p} em análise.`)}
          >
            Marcar em análise<span className="sr-only">: protocolo {p}</span>
          </button>
        )}
        {r.status !== 'resolvida' ? (
          <button
            type="button"
            className="botao botao-principal"
            onClick={() => aoMudar(r, { status: 'resolvida', nota }, `Protocolo ${p} resolvido.`)}
          >
            Marcar como resolvida<span className="sr-only">: protocolo {p}</span>
          </button>
        ) : (
          <button
            type="button"
            className="botao botao-linha"
            onClick={() => aoMudar(r, { status: 'em_analise' }, `Protocolo ${p} reaberto.`)}
          >
            Reabrir<span className="sr-only"> protocolo {p}</span>
          </button>
        )}
      </div>
    </article>
  )
}
