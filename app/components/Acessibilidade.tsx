import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AVISO_SEM_VOZ, falar, pararFala, VELOCIDADES } from '~/lib/speech'
import { guardar, lerGuardado } from '~/lib/guardado'
import { SEM_MESA } from '~/edicao'

export const CHAVE_PREFERENCIAS = 'cds-preferencias'

export interface Preferencias {
  letraGrande: boolean
  altoContraste: boolean
  modoEscuro: boolean
  respostasFaladas: boolean
  velocidade: number
}

const PADRAO: Preferencias = {
  letraGrande: false,
  altoContraste: false,
  modoEscuro: false,
  respostasFaladas: false,
  velocidade: 1,
}

// Aplica as preferências antes da primeira pintura, para a tela não piscar.
export const SCRIPT_PREFERENCIAS = `try{var p=JSON.parse(localStorage.getItem('${CHAVE_PREFERENCIAS}')||'{}'),d=document.documentElement.dataset;if(p.letraGrande)d.letraGrande='';if(p.altoContraste)d.altoContraste='';if(p.modoEscuro)d.modoEscuro=''}catch(e){}`

interface Contexto {
  preferencias: Preferencias
  alternar: (chave: 'letraGrande' | 'altoContraste' | 'modoEscuro' | 'respostasFaladas') => void
  definirVelocidade: (velocidade: number) => void
  /** Anuncia na região aria-live; fala em voz alta se "Respostas faladas" estiver ativa. */
  anunciar: (texto: string) => void
  /** Lê em voz alta a pedido do usuário; se não houver voz, explica na tela e no leitor. */
  ouvir: (texto: string) => void
  parar: () => void
}

const AcessibilidadeContexto = createContext<Contexto | null>(null)

export function useAcessibilidade() {
  const contexto = useContext(AcessibilidadeContexto)
  if (!contexto) throw new Error('AcessibilidadeProvider ausente')
  return contexto
}

export function AcessibilidadeProvider({ children }: { children: ReactNode }) {
  const [preferencias, setPreferencias] = useState<Preferencias>(PADRAO)
  const [anuncio, setAnuncio] = useState('')
  const [semVoz, setSemVoz] = useState(false)
  // Estado (e não ref): a gravação só acontece depois que a leitura foi aplicada,
  // senão os valores padrão sobrescreveriam o que estava guardado.
  const [carregado, setCarregado] = useState(false)
  const prefs = useRef(preferencias)
  prefs.current = preferencias

  useEffect(() => {
    setPreferencias({ ...PADRAO, ...lerGuardado(CHAVE_PREFERENCIAS, {}) })
    setCarregado(true)
    return pararFala
  }, [])

  useEffect(() => {
    if (!carregado) return
    guardar(CHAVE_PREFERENCIAS, preferencias)
    const html = document.documentElement
    html.toggleAttribute('data-letra-grande', preferencias.letraGrande)
    html.toggleAttribute('data-alto-contraste', preferencias.altoContraste)
    html.toggleAttribute('data-modo-escuro', preferencias.modoEscuro)
  }, [preferencias, carregado])

  // Esvaziar antes de escrever faz o leitor de tela repetir avisos idênticos.
  const escrever = useCallback((texto: string) => {
    setAnuncio('')
    window.setTimeout(() => setAnuncio(texto), 60)
  }, [])

  const anunciar = useCallback(
    (texto: string) => {
      escrever(texto)
      if (!SEM_MESA && prefs.current.respostasFaladas && !falar(texto, prefs.current.velocidade)) {
        setSemVoz(true)
      }
    },
    [escrever],
  )

  const ouvir = useCallback(
    (texto: string) => {
      if (falar(texto, prefs.current.velocidade)) {
        setSemVoz(false)
      } else {
        setSemVoz(true)
        escrever(`${AVISO_SEM_VOZ} ${texto}`)
      }
    },
    [escrever],
  )

  const valor = useMemo<Contexto>(
    () => ({
      preferencias,
      alternar: (chave) => {
        const ligado = !prefs.current[chave]
        setPreferencias((p) => ({ ...p, [chave]: ligado }))
        if (chave === 'respostasFaladas' && !ligado) pararFala()
        const nomes = {
          letraGrande: 'Letra grande',
          altoContraste: 'Alto contraste',
          modoEscuro: 'Modo escuro',
          respostasFaladas: 'Respostas faladas',
        }
        const frase = `${nomes[chave]} ${ligado ? 'ativado' : 'desativado'}.`
        if (chave === 'respostasFaladas' && ligado) {
          escrever(frase)
          if (!falar(frase, prefs.current.velocidade)) setSemVoz(true)
        } else {
          escrever(frase)
        }
      },
      definirVelocidade: (velocidade) => {
        setPreferencias((p) => ({ ...p, velocidade }))
        const rotulo = VELOCIDADES.find((v) => v.valor === velocidade)?.rotulo
        escrever(`Velocidade da voz: ${rotulo}.`)
      },
      anunciar,
      ouvir,
      parar: pararFala,
    }),
    [preferencias, anunciar, ouvir, escrever],
  )

  return (
    <AcessibilidadeContexto.Provider value={valor}>
      {children}
      {semVoz && (
        <div className="aviso-voz" role="note">
          <p>{AVISO_SEM_VOZ}</p>
          <button type="button" className="botao botao-linha" onClick={() => setSemVoz(false)}>
            Fechar aviso
          </button>
        </div>
      )}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {anuncio}
      </div>
    </AcessibilidadeContexto.Provider>
  )
}

export function BarraDeAcessibilidade() {
  const { preferencias, alternar, definirVelocidade } = useAcessibilidade()
  const opcoes = [
    ['letraGrande', 'Letra grande'],
    ['altoContraste', 'Alto contraste'],
    ['modoEscuro', 'Modo escuro'],
    ...(SEM_MESA ? [] : ([['respostasFaladas', 'Respostas faladas']] as const)),
  ] as const
  return (
    <section className="barra-acess" aria-label="Opções de acessibilidade">
      <div className="barra-acess-itens">
        {opcoes.map(([chave, rotulo]) => (
          <button
            key={chave}
            type="button"
            className="chip"
            aria-pressed={preferencias[chave]}
            onClick={() => alternar(chave)}
          >
            {rotulo}
          </button>
        ))}
        <label className="chip chip-select">
          <span>Velocidade da voz</span>
          <select
            value={preferencias.velocidade}
            onChange={(e) => definirVelocidade(Number(e.target.value))}
          >
            {VELOCIDADES.map((v) => (
              <option key={v.valor} value={v.valor}>
                {v.rotulo}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  )
}

export function BotaoOuvir({ texto, rotulo = 'Ouvir' }: { texto: string; rotulo?: string }) {
  const { ouvir } = useAcessibilidade()
  return (
    <button type="button" className="botao botao-linha" onClick={() => ouvir(texto)}>
      <span aria-hidden="true">🔊 </span>
      {rotulo}
    </button>
  )
}
