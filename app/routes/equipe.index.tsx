import { useCallback, useEffect, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useAcessibilidade } from '~/components/Acessibilidade'
import { PainelDaEquipe, useEquipe } from '~/components/Equipe'
import { atualizarChamado, listarChamadosDaEquipe } from '~/lib/api'
import {
  dadosTipo,
  estaAberto,
  fraseParaEquipe,
  ROTULO_STATUS,
  tempoDecorrido,
  type Chamado,
} from '~/lib/chamados'

export const Route = createFileRoute('/equipe/')({
  head: () => ({
    meta: [{ title: 'Chamados · Painel da equipe' }, { name: 'robots', content: 'noindex' }],
  }),
  component: () => (
    <PainelDaEquipe titulo="Chamados das mesas">
      <Chamados />
    </PainelDaEquipe>
  ),
})

const INTERVALO_MS = 5000

function tocarAviso(audio: AudioContext) {
  for (const inicio of [0, 0.25]) {
    const oscilador = audio.createOscillator()
    const ganho = audio.createGain()
    oscilador.frequency.value = 880
    ganho.gain.setValueAtTime(0.25, audio.currentTime + inicio)
    ganho.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + inicio + 0.2)
    oscilador.connect(ganho).connect(audio.destination)
    oscilador.start(audio.currentTime + inicio)
    oscilador.stop(audio.currentTime + inicio + 0.2)
  }
}

function Chamados() {
  const { anunciar } = useAcessibilidade()
  const { pin, unidade, falha, limparErro } = useEquipe()
  const [chamados, setChamados] = useState<Chamado[] | null>(null)
  const [som, setSom] = useState(false)
  const [agora, setAgora] = useState(() => Date.now())
  const audio = useRef<AudioContext | null>(null)
  const conhecidos = useRef<Set<string> | null>(null)
  const somLigado = useRef(som)
  somLigado.current = som

  const carregar = useCallback(async () => {
    try {
      const { chamados: lista } = await listarChamadosDaEquipe(unidade, pin)
      limparErro()
      setAgora(Date.now())
      setChamados(lista)
      // Anuncia apenas o que chegou depois da primeira carga do painel.
      const novos = lista.filter(
        (c) =>
          c.status === 'aguardando' &&
          conhecidos.current &&
          !conhecidos.current.has(`${c.id}@${c.criadoEm}`),
      )
      conhecidos.current = new Set(lista.map((c) => `${c.id}@${c.criadoEm}`))
      if (novos.length) {
        anunciar(`Novo chamado. ${novos.map(fraseParaEquipe).join(' ')}`)
        if (somLigado.current && audio.current) tocarAviso(audio.current)
      }
    } catch (e) {
      falha(e)
    }
  }, [unidade, pin, anunciar, falha, limparErro])

  useEffect(() => {
    conhecidos.current = null
    setChamados(null)
    carregar()
    const timer = window.setInterval(carregar, INTERVALO_MS)
    return () => window.clearInterval(timer)
  }, [carregar])

  function alternarSom() {
    const ligado = !som
    if (ligado) {
      const Contexto =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Contexto) {
        anunciar(
          'Este navegador não consegue tocar o som de aviso. Os chamados novos continuam sendo anunciados na tela.',
        )
        return
      }
      audio.current ??= new Contexto()
      audio.current.resume()
      tocarAviso(audio.current)
    }
    setSom(ligado)
    anunciar(`Som de aviso ${ligado ? 'ativado' : 'desativado'}.`)
  }

  async function avancar(chamado: Chamado, status: 'a_caminho' | 'concluido') {
    try {
      await atualizarChamado(chamado.id, status, pin)
      anunciar(
        status === 'a_caminho'
          ? `Mesa ${chamado.mesa}: marcado como a caminho.`
          : `Mesa ${chamado.mesa}: atendimento concluído.`,
      )
    } catch (e) {
      falha(e)
    }
    carregar()
  }

  const abertos = (chamados ?? []).filter(estaAberto)
  const resumo =
    abertos.length === 0
      ? 'Nenhum chamado aberto'
      : abertos.length === 1
        ? '1 chamado aberto'
        : `${abertos.length} chamados abertos`

  return (
    <section aria-labelledby="titulo-fila">
      <div className="linha-topo">
        <h2 id="titulo-fila">{chamados === null ? 'Carregando chamados…' : resumo}</h2>
        <button type="button" className="chip" aria-pressed={som} onClick={alternarSom}>
          Som de aviso
        </button>
      </div>
      {chamados !== null && abertos.length === 0 && (
        <p className="vazio">
          Quando um cliente chamar, o pedido aparece aqui em poucos segundos. Deixe esta tela aberta.
        </p>
      )}
      <ul className="lista">
        {abertos.map((chamado) => (
          <li key={chamado.id}>
            <article className="cartao">
              <div className="linha-topo">
                <h3 className="mesa">Mesa {chamado.mesa}</h3>
                <span className="situacao" data-status={chamado.status}>
                  {ROTULO_STATUS[chamado.status]}
                </span>
              </div>
              <p>
                <strong>{dadosTipo(chamado.tipo).resumo}</strong> ·{' '}
                {tempoDecorrido(chamado.criadoEm, agora)}
              </p>
              {chamado.mensagem && <p className="mensagem">{chamado.mensagem}</p>}
              <div className="acoes">
                {chamado.status === 'aguardando' && (
                  <button
                    type="button"
                    className="botao botao-principal"
                    onClick={() => avancar(chamado, 'a_caminho')}
                  >
                    Estou a caminho
                    <span className="sr-only"> da mesa {chamado.mesa}</span>
                  </button>
                )}
                <button
                  type="button"
                  className="botao botao-linha"
                  onClick={() => avancar(chamado, 'concluido')}
                >
                  Concluir
                  <span className="sr-only"> atendimento da mesa {chamado.mesa}</span>
                </button>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}
