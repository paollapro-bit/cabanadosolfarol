import { useCallback, useEffect, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useAcessibilidade } from '~/components/Acessibilidade'
import { PainelDaEquipe, useEquipe } from '~/components/Equipe'
import { atualizarReserva, listarReservasDaEquipe } from '~/lib/api'
import {
  dataPorExtenso,
  formatarTelefone,
  fraseDaReservaParaEquipe,
  nomePeriodo,
  pessoasPorExtenso,
  reservaEmAberto,
  ROTULO_RESERVA,
  type Reserva,
  type StatusReserva,
} from '~/lib/reservas'

export const Route = createFileRoute('/equipe/reservas')({
  head: () => ({
    meta: [{ title: 'Reservas · Painel da equipe' }, { name: 'robots', content: 'noindex' }],
  }),
  component: () => (
    <PainelDaEquipe titulo="Reservas dos salões">
      <Reservas />
    </PainelDaEquipe>
  ),
})

const INTERVALO_MS = 15000

function Reservas() {
  const { anunciar } = useAcessibilidade()
  const { pin, unidade, falha, limparErro } = useEquipe()
  const [reservas, setReservas] = useState<Reserva[] | null>(null)
  const conhecidas = useRef<Set<string> | null>(null)

  const carregar = useCallback(async () => {
    try {
      const { reservas: lista } = await listarReservasDaEquipe(unidade, pin)
      limparErro()
      setReservas(lista)
      const novas = lista.filter(
        (r) => r.status === 'pendente' && conhecidas.current && !conhecidas.current.has(r.id),
      )
      conhecidas.current = new Set(lista.map((r) => r.id))
      if (novas.length) {
        anunciar(`Novo pedido de reserva. ${novas.map(fraseDaReservaParaEquipe).join(' ')}`)
      }
    } catch (e) {
      falha(e)
    }
  }, [unidade, pin, anunciar, falha, limparErro])

  useEffect(() => {
    conhecidas.current = null
    setReservas(null)
    carregar()
    const timer = window.setInterval(carregar, INTERVALO_MS)
    return () => window.clearInterval(timer)
  }, [carregar])

  async function mudar(reserva: Reserva, status: StatusReserva) {
    try {
      await atualizarReserva(reserva.id, status, pin)
      anunciar(`Reserva de ${reserva.nome}: ${ROTULO_RESERVA[status].toLowerCase()}.`)
    } catch (e) {
      falha(e)
    }
    carregar()
  }

  const pendentes = (reservas ?? []).filter((r) => r.status === 'pendente')
  const confirmadas = (reservas ?? []).filter((r) => r.status === 'confirmada')
  const encerradas = (reservas ?? []).filter((r) => !reservaEmAberto(r))

  if (reservas === null) {
    return (
      <section>
        <h2>Carregando reservas…</h2>
      </section>
    )
  }

  return (
    <>
      <Grupo
        id="pendentes"
        titulo={
          pendentes.length === 1
            ? '1 pedido aguardando confirmação'
            : `${pendentes.length} pedidos aguardando confirmação`
        }
        vazio="Nenhum pedido novo. Quando um cliente pedir uma reserva, ela aparece aqui."
        reservas={pendentes}
        aoMudar={mudar}
      />
      <Grupo
        id="confirmadas"
        titulo={`Confirmadas (${confirmadas.length})`}
        vazio="Nenhuma reserva confirmada a partir de hoje."
        reservas={confirmadas}
        aoMudar={mudar}
      />
      {encerradas.length > 0 && (
        <Grupo
          id="encerradas"
          titulo={`Recusadas e canceladas (${encerradas.length})`}
          vazio=""
          reservas={encerradas}
          aoMudar={mudar}
        />
      )}
    </>
  )
}

function Grupo({
  id,
  titulo,
  vazio,
  reservas,
  aoMudar,
}: {
  id: string
  titulo: string
  vazio: string
  reservas: Reserva[]
  aoMudar: (reserva: Reserva, status: StatusReserva) => void
}) {
  return (
    <section aria-labelledby={`titulo-${id}`}>
      <h2 id={`titulo-${id}`}>{titulo}</h2>
      {reservas.length === 0 && <p className="vazio">{vazio}</p>}
      <ul className="lista">
        {reservas.map((r) => (
          <li key={r.id}>
            <article className="cartao">
              <div className="linha-topo">
                <h3 className="mesa">{r.salaoNome}</h3>
                <span className="situacao" data-status={r.status}>
                  {ROTULO_RESERVA[r.status]}
                </span>
              </div>
              <p>
                <strong>
                  {dataPorExtenso(r.data)} · {nomePeriodo(r.periodo)}
                </strong>
                <br />
                {pessoasPorExtenso(r.pessoas)} · {r.nome}
              </p>
              {r.observacao && <p className="mensagem">{r.observacao}</p>}
              <div className="acoes">
                {r.status === 'pendente' && (
                  <>
                    <button
                      type="button"
                      className="botao botao-principal"
                      onClick={() => aoMudar(r, 'confirmada')}
                    >
                      Confirmar<span className="sr-only"> reserva de {r.nome}</span>
                    </button>
                    <button
                      type="button"
                      className="botao botao-linha"
                      onClick={() => aoMudar(r, 'recusada')}
                    >
                      Recusar<span className="sr-only"> reserva de {r.nome}</span>
                    </button>
                  </>
                )}
                {r.status === 'confirmada' && (
                  <button
                    type="button"
                    className="botao botao-linha"
                    onClick={() => aoMudar(r, 'cancelada')}
                  >
                    Cancelar reserva<span className="sr-only"> de {r.nome}</span>
                  </button>
                )}
                <a className="botao botao-linha" href={`tel:+55${r.telefone}`}>
                  Ligar: {formatarTelefone(r.telefone)}
                </a>
                <a
                  className="botao botao-linha"
                  href={`https://wa.me/55${r.telefone}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp<span className="sr-only"> de {r.nome} (abre em outra aba)</span>
                </a>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}
