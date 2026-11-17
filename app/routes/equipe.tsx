import { useCallback, useEffect, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useAcessibilidade } from '~/components/Acessibilidade'
import { atualizarChamado, ErroDeApi, listarChamadosDaEquipe } from '~/lib/api'
import {
  dadosTipo,
  ehUnidade,
  estaAberto,
  fraseParaEquipe,
  ROTULO_STATUS,
  tempoDecorrido,
  UNIDADES,
  type Chamado,
  type UnidadeId,
} from '~/lib/chamados'
import { guardar, lerGuardado } from '~/lib/guardado'

export const Route = createFileRoute('/equipe')({
  head: () => ({
    meta: [
      { title: 'Painel da equipe · Cabana do Sol' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: Equipe,
})

const CHAVE_PIN = 'cds-equipe-pin'
const CHAVE_UNIDADE = 'cds-equipe-unidade'
const CHAVE_SOM = 'cds-equipe-som'
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

function Equipe() {
  const { anunciar } = useAcessibilidade()
  const [pin, setPin] = useState('')
  const [digitado, setDigitado] = useState('')
  const [unidade, setUnidade] = useState<UnidadeId>('sao-luis')
  const [chamados, setChamados] = useState<Chamado[] | null>(null)
  const [erro, setErro] = useState('')
  const [som, setSom] = useState(false)
  const [agora, setAgora] = useState(() => Date.now())
  const audio = useRef<AudioContext | null>(null)
  const conhecidos = useRef<Set<string> | null>(null)
  const somLigado = useRef(som)
  somLigado.current = som

  useEffect(() => {
    setPin(lerGuardado(CHAVE_PIN, '', window.sessionStorage))
    const guardada = lerGuardado<string>(CHAVE_UNIDADE, 'sao-luis')
    if (ehUnidade(guardada)) setUnidade(guardada)
  }, [])

  const sair = useCallback(
    (motivo = '') => {
      setPin('')
      setChamados(null)
      conhecidos.current = null
      guardar(CHAVE_PIN, '', window.sessionStorage)
      setErro(motivo)
      if (motivo) anunciar(motivo)
    },
    [anunciar],
  )

  const carregar = useCallback(async () => {
    try {
      const { chamados: lista } = await listarChamadosDaEquipe(unidade, pin)
      setErro('')
      setAgora(Date.now())
      setChamados(lista)
      // Anuncia apenas o que chegou depois da primeira carga do painel.
      const novos = lista.filter(
        (c) => c.status === 'aguardando' && conhecidos.current && !conhecidos.current.has(`${c.id}@${c.criadoEm}`),
      )
      conhecidos.current = new Set(lista.map((c) => `${c.id}@${c.criadoEm}`))
      if (novos.length) {
        anunciar(`Novo chamado. ${novos.map(fraseParaEquipe).join(' ')}`)
        if (somLigado.current && audio.current) tocarAviso(audio.current)
      }
    } catch (e) {
      if (e instanceof ErroDeApi && (e.status === 401 || e.status === 503)) {
        sair(e.message)
      } else {
        const texto = e instanceof Error ? e.message : 'Falha ao carregar os chamados.'
        setErro((anterior) => {
          if (anterior !== texto) anunciar(texto)
          return texto
        })
      }
    }
  }, [unidade, pin, anunciar, sair])

  useEffect(() => {
    if (!pin) return
    conhecidos.current = null
    carregar()
    const timer = window.setInterval(carregar, INTERVALO_MS)
    return () => window.clearInterval(timer)
  }, [pin, carregar])

  function entrar(e: React.FormEvent) {
    e.preventDefault()
    const codigo = digitado.trim()
    if (!codigo) {
      setErro('Digite o código da equipe.')
      anunciar('Digite o código da equipe.')
      return
    }
    setErro('')
    guardar(CHAVE_PIN, codigo, window.sessionStorage)
    setPin(codigo)
    setDigitado('')
  }

  function alternarSom() {
    const ligado = !som
    if (ligado) {
      const Contexto = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Contexto) {
        anunciar('Este navegador não consegue tocar o som de aviso. Os chamados novos continuam sendo anunciados na tela.')
        return
      }
      audio.current ??= new Contexto()
      audio.current.resume()
      tocarAviso(audio.current)
    }
    setSom(ligado)
    guardar(CHAVE_SOM, ligado)
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
      anunciar(e instanceof Error ? e.message : 'Não foi possível atualizar o chamado.')
    }
    carregar()
  }

  if (!pin) {
    return (
      <div className="tela">
        <section aria-labelledby="titulo-pagina">
          <p className="sobrancelha">Uso interno</p>
          <h1 id="titulo-pagina">Painel da equipe</h1>
          <p className="intro">Digite o código da equipe para ver os chamados das mesas.</p>
        </section>
        <form className="cartao" onSubmit={entrar}>
          <div className="campo">
            <label htmlFor="pin">Código da equipe</label>
            <input
              id="pin"
              type="password"
              autoComplete="off"
              value={digitado}
              onChange={(e) => setDigitado(e.target.value)}
              aria-invalid={Boolean(erro)}
              aria-describedby={erro ? 'erro-pin' : undefined}
            />
            {erro && (
              <p id="erro-pin" className="erro">
                {erro}
              </p>
            )}
          </div>
          <button type="submit" className="botao botao-principal">
            Entrar
          </button>
        </form>
      </div>
    )
  }

  const abertos = (chamados ?? []).filter(estaAberto)
  const resumo =
    abertos.length === 0
      ? 'Nenhum chamado aberto'
      : abertos.length === 1
        ? '1 chamado aberto'
        : `${abertos.length} chamados abertos`

  return (
    <div className="tela">
      <section aria-labelledby="titulo-pagina">
        <p className="sobrancelha">Uso interno</p>
        <h1 id="titulo-pagina">Painel da equipe</h1>
        <fieldset className="campo">
          <legend className="legenda">Unidade</legend>
          <div className="opcoes">
            {UNIDADES.map((u) => (
              <label key={u.id} className="opcao">
                <input
                  type="radio"
                  name="unidade-equipe"
                  checked={unidade === u.id}
                  onChange={() => {
                    setUnidade(u.id)
                    setChamados(null)
                    guardar(CHAVE_UNIDADE, u.id)
                  }}
                />
                <span>{u.nome}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="acoes">
          <button type="button" className="chip" aria-pressed={som} onClick={alternarSom}>
            Som de aviso
          </button>
          <button type="button" className="botao botao-linha" onClick={() => sair()}>
            Sair
          </button>
        </div>
        {erro && <p className="erro">{erro}</p>}
      </section>

      <section aria-labelledby="titulo-fila">
        <h2 id="titulo-fila">{chamados === null ? 'Carregando chamados…' : resumo}</h2>
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
                  <strong>{dadosTipo(chamado.tipo).resumo}</strong> · {tempoDecorrido(chamado.criadoEm, agora)}
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
    </div>
  )
}
