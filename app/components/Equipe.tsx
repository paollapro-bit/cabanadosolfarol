import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import { Link } from '@tanstack/react-router'
import { useAcessibilidade } from './Acessibilidade'
import { ErroDeApi } from '~/lib/api'
import { ehUnidade, UNIDADES, type UnidadeId } from '~/lib/chamados'
import { guardar, lerGuardado } from '~/lib/guardado'

const CHAVE_PIN = 'cds-equipe-pin'
const CHAVE_UNIDADE = 'cds-equipe-unidade'

interface Contexto {
  pin: string
  unidade: UnidadeId
  /** Trata um erro de API: código errado encerra a sessão; o resto é mostrado e anunciado. */
  falha: (e: unknown) => void
  limparErro: () => void
}

const EquipeContexto = createContext<Contexto | null>(null)

export function useEquipe() {
  const contexto = useContext(EquipeContexto)
  if (!contexto) throw new Error('PainelDaEquipe ausente')
  return contexto
}

const SECOES = [
  { to: '/equipe', rotulo: 'Chamados' },
  { to: '/equipe/reservas', rotulo: 'Reservas' },
  { to: '/equipe/saloes', rotulo: 'Salões' },
  { to: '/equipe/cardapio', rotulo: 'Cardápio' },
] as const

/** Moldura das telas da equipe: pede o código, escolhe a unidade e navega entre as seções. */
export function PainelDaEquipe({ titulo, children }: { titulo: string; children: ReactNode }) {
  const { anunciar } = useAcessibilidade()
  const [pin, setPin] = useState('')
  const [digitado, setDigitado] = useState('')
  const [unidade, setUnidade] = useState<UnidadeId>('sao-luis')
  const [erro, setErro] = useState('')
  const ultimoErro = useRef('')
  const pinAtual = useRef(pin)
  pinAtual.current = pin

  useEffect(() => {
    setPin(lerGuardado(CHAVE_PIN, '', window.sessionStorage))
    const guardada = lerGuardado<string>(CHAVE_UNIDADE, 'sao-luis')
    if (ehUnidade(guardada)) setUnidade(guardada)
  }, [])

  const sair = useCallback(
    (motivo = '') => {
      setPin('')
      guardar(CHAVE_PIN, '', window.sessionStorage)
      setErro(motivo)
      if (motivo) anunciar(motivo)
    },
    [anunciar],
  )

  const contexto = useMemo<Contexto>(
    () => ({
      pin,
      unidade,
      falha: (e) => {
        // Resposta atrasada de um código antigo não pode derrubar a sessão atual.
        if (pinAtual.current !== pin) return
        if (e instanceof ErroDeApi && (e.status === 401 || e.status === 503)) {
          sair(e.message)
          return
        }
        const texto = e instanceof Error ? e.message : 'Algo deu errado. Tente de novo.'
        // Erros repetidos da atualização automática são anunciados uma vez só.
        if (ultimoErro.current !== texto) anunciar(texto)
        ultimoErro.current = texto
        setErro(texto)
      },
      limparErro: () => {
        ultimoErro.current = ''
        setErro('')
      },
    }),
    [pin, unidade, sair, anunciar],
  )

  function entrar(e: FormEvent) {
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

  if (!pin) {
    return (
      <div className="tela">
        <section aria-labelledby="titulo-pagina">
          <p className="sobrancelha">Uso interno</p>
          <h1 id="titulo-pagina">{titulo}</h1>
          <p className="intro">Digite o código da equipe para continuar.</p>
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

  return (
    <EquipeContexto.Provider value={contexto}>
      <div className="tela">
        <section aria-labelledby="titulo-pagina">
          <p className="sobrancelha">Uso interno</p>
          <h1 id="titulo-pagina">{titulo}</h1>
          <nav className="abas" aria-label="Seções do painel da equipe">
            {SECOES.map((s) => (
              <Link
                key={s.to}
                to={s.to}
                className="chip"
                activeOptions={{ exact: true }}
                activeProps={{ 'aria-current': 'page' }}
              >
                {s.rotulo}
              </Link>
            ))}
            <button type="button" className="chip" onClick={() => sair()}>
              Sair
            </button>
          </nav>
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
                      setErro('')
                      guardar(CHAVE_UNIDADE, u.id)
                    }}
                  />
                  <span>{u.nome}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {erro && <p className="erro">{erro}</p>}
        </section>
        {children}
      </div>
    </EquipeContexto.Provider>
  )
}
