import { useCallback, useEffect, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { BotaoOuvir, useAcessibilidade } from '~/components/Acessibilidade'
import { ListaDeCanais } from '~/components/Canais'
import { canais } from '~/data/atendimento'
import {
  abrirChamado,
  cancelarChamado,
  consultarChamado,
  ErroDeApi,
} from '~/lib/api'
import {
  dadosTipo,
  ehUnidade,
  estaAberto,
  fraseParaCliente,
  lerMesa,
  MENSAGEM_MAXIMA,
  nomeUnidade,
  ROTULO_STATUS,
  TIPOS,
  UNIDADES,
  validarNovoChamado,
  type Chamado,
  type TipoChamado,
  type UnidadeId,
} from '~/lib/chamados'
import { guardar, lerGuardado } from '~/lib/guardado'

export const Route = createFileRoute('/')({
  // O código QR da mesa abre a central já com ?unidade=litoranea&mesa=12.
  validateSearch: (busca: Record<string, unknown>): { unidade?: UnidadeId; mesa?: number } => ({
    unidade: ehUnidade(busca.unidade) ? busca.unidade : undefined,
    mesa: lerMesa(busca.mesa) ?? undefined,
  }),
  component: Atendimento,
})

const CHAVE_LOCAL = 'cds-local'
const CHAVE_CHAMADOS = 'cds-chamados'
const INTERVALO_MS = 5000

interface Acompanhado {
  id: string
  segredo?: string
  chamado?: Chamado
}

const INTRO =
  'Central de atendimento do Cabana do Sol. Informe a unidade e o número da sua mesa. Depois escolha: chamar garçom, pedir a conta, ajuda com acessibilidade ou outro pedido. A equipe é avisada na hora e você acompanha a situação nesta tela.'

function Atendimento() {
  const busca = Route.useSearch()
  const { anunciar } = useAcessibilidade()
  const [unidade, setUnidade] = useState<UnidadeId | ''>(busca.unidade ?? '')
  const [mesa, setMesa] = useState(busca.mesa ? String(busca.mesa) : '')
  const [acompanhados, setAcompanhados] = useState<Acompanhado[]>([])
  const [erro, setErro] = useState<{ campo: 'unidade' | 'mesa' | 'mensagem' | 'geral'; texto: string } | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [outroAberto, setOutroAberto] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [carregado, setCarregado] = useState(false)
  const tituloChamados = useRef<HTMLHeadingElement>(null)
  const lista = useRef(acompanhados)
  lista.current = acompanhados

  // Recupera o local e os chamados guardados neste aparelho.
  useEffect(() => {
    const local = lerGuardado<{ unidade?: string; mesa?: string }>(CHAVE_LOCAL, {})
    if (!busca.unidade && ehUnidade(local.unidade)) setUnidade(local.unidade)
    if (!busca.mesa && local.mesa) setMesa(local.mesa)
    setAcompanhados(
      lerGuardado<Acompanhado[]>(CHAVE_CHAMADOS, []).map(({ id, segredo }) => ({ id, segredo })),
    )
    setCarregado(true)
  }, [busca.unidade, busca.mesa])

  useEffect(() => {
    if (carregado) guardar(CHAVE_LOCAL, { unidade, mesa })
  }, [unidade, mesa, carregado])

  useEffect(() => {
    if (!carregado) return
    guardar(
      CHAVE_CHAMADOS,
      acompanhados.map(({ id, segredo }) => ({ id, segredo })),
    )
  }, [acompanhados, carregado])

  const atualizar = useCallback(async () => {
    const resultados = await Promise.all(
      lista.current.map(async (item) => {
        // Chamado encerrado não muda mais: não precisa consultar de novo.
        if (item.chamado && !estaAberto(item.chamado)) return item
        try {
          const { chamado } = await consultarChamado(item.id)
          return { ...item, chamado }
        } catch (e) {
          // 404: o chamado venceu ou foi removido. Outros erros: tenta de novo depois.
          return e instanceof ErroDeApi && e.status === 404 ? null : item
        }
      }),
    )
    const antes = new Map(lista.current.map((i) => [i.id, i.chamado?.status]))
    for (const item of resultados) {
      const anterior = item && antes.get(item.id)
      if (item?.chamado && anterior && anterior !== item.chamado.status) {
        anunciar(fraseParaCliente(item.chamado))
      }
    }
    // Mantém o que foi aberto ou fechado pelo usuário enquanto a consulta corria.
    setAcompanhados((atuais) =>
      atuais.flatMap((atual) => {
        const novo = resultados.find((r) => r?.id === atual.id)
        const sumiu = resultados.some((r, i) => r === null && lista.current[i]?.id === atual.id)
        return sumiu ? [] : [novo ?? atual]
      }),
    )
  }, [anunciar])

  const haAbertos = acompanhados.some((i) => !i.chamado || estaAberto(i.chamado))
  useEffect(() => {
    if (!haAbertos) return
    atualizar()
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') atualizar()
    }, INTERVALO_MS)
    return () => window.clearInterval(timer)
  }, [haAbertos, atualizar])

  function falhar(campo: 'unidade' | 'mesa' | 'mensagem' | 'geral', texto: string) {
    setErro({ campo, texto })
    anunciar(texto)
    const alvo = { unidade: 'unidade-litoranea', mesa: 'mesa', mensagem: 'mensagem', geral: '' }[campo]
    if (alvo) document.getElementById(alvo)?.focus()
  }

  async function enviar(tipo: TipoChamado, texto?: string) {
    if (enviando) return
    const validacao = validarNovoChamado({ unidade, mesa, tipo, mensagem: texto })
    if (!validacao.ok) {
      const campo = !ehUnidade(unidade) ? 'unidade' : lerMesa(mesa) === null ? 'mesa' : 'mensagem'
      falhar(campo, validacao.erro)
      return
    }
    setErro(null)
    setEnviando(true)
    try {
      const { chamado, segredo, repetido } = await abrirChamado(validacao.dados)
      setAcompanhados((atuais) => {
        const existente = atuais.find((i) => i.id === chamado.id)
        return [
          { id: chamado.id, chamado, segredo: segredo ?? existente?.segredo },
          ...atuais.filter((i) => i.id !== chamado.id),
        ]
      })
      anunciar(
        repetido
          ? `Este pedido já estava aberto para a mesa ${chamado.mesa}. ${fraseParaCliente(chamado)}`
          : `Chamado enviado. ${fraseParaCliente(chamado)}`,
      )
      setOutroAberto(false)
      setMensagem('')
      window.setTimeout(() => tituloChamados.current?.focus(), 80)
    } catch (e) {
      falhar('geral', e instanceof Error ? e.message : 'Não foi possível enviar o chamado.')
    } finally {
      setEnviando(false)
    }
  }

  async function cancelar(item: Acompanhado) {
    if (!item.segredo) return
    try {
      const { chamado } = await cancelarChamado(item.id, item.segredo)
      setAcompanhados((atuais) => atuais.map((i) => (i.id === item.id ? { ...i, chamado } : i)))
      anunciar(fraseParaCliente(chamado))
    } catch (e) {
      falhar('geral', e instanceof Error ? e.message : 'Não foi possível cancelar o chamado.')
    }
  }

  function fechar(id: string) {
    setAcompanhados((atuais) => atuais.filter((i) => i.id !== id))
    anunciar('Aviso fechado.')
  }

  const visiveis = acompanhados.filter((i) => i.chamado)

  return (
    <div className="tela">
      <section aria-labelledby="titulo-pagina">
        <p className="sobrancelha">Desde 1994 · São Luís</p>
        <h1 id="titulo-pagina">Central de atendimento</h1>
        <p className="intro">
          Chame a equipe, peça a conta e tire dúvidas com autonomia, sem precisar acenar para ninguém.
        </p>
        <div className="acoes">
          <BotaoOuvir texto={INTRO} rotulo="Ouvir como funciona" />
        </div>
      </section>

      {visiveis.length > 0 && (
        <section aria-labelledby="titulo-chamados">
          <h2 id="titulo-chamados" ref={tituloChamados} tabIndex={-1}>
            Seus chamados
          </h2>
          <ul className="lista">
            {visiveis.map((item) => (
              <li key={item.id}>
                <CartaoDoChamado
                  chamado={item.chamado!}
                  podeCancelar={Boolean(item.segredo)}
                  aoCancelar={() => cancelar(item)}
                  aoFechar={() => fechar(item.id)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="titulo-local" className="cartao">
        <h2 id="titulo-local">1. Onde você está?</h2>
        <fieldset className="campo">
          <legend className="legenda">Unidade</legend>
          <div className="opcoes">
            {UNIDADES.map((u) => (
              <label key={u.id} className="opcao">
                <input
                  id={`unidade-${u.id}`}
                  type="radio"
                  name="unidade"
                  value={u.id}
                  checked={unidade === u.id}
                  onChange={() => setUnidade(u.id)}
                  aria-describedby={erro?.campo === 'unidade' ? 'erro-local' : undefined}
                />
                <span>{u.nome}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="campo">
          <label htmlFor="mesa">Número da mesa</label>
          <input
            id="mesa"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            maxLength={3}
            value={mesa}
            onChange={(e) => setMesa(e.target.value.replace(/\D/g, ''))}
            aria-invalid={erro?.campo === 'mesa'}
            aria-describedby={erro?.campo === 'mesa' ? 'erro-local dica-mesa' : 'dica-mesa'}
          />
          <p id="dica-mesa" className="dica">
            Se não souber o número, pergunte a alguém da equipe.
          </p>
        </div>
        {(erro?.campo === 'unidade' || erro?.campo === 'mesa') && (
          <p id="erro-local" className="erro">
            {erro.texto}
          </p>
        )}
      </section>

      <section aria-labelledby="titulo-pedido">
        <h2 id="titulo-pedido">2. Do que você precisa?</h2>
        <div className="grade-acoes">
          {TIPOS.filter((t) => t.id !== 'outro').map((tipo) => (
            <button
              key={tipo.id}
              type="button"
              className="acao"
              aria-disabled={enviando}
              onClick={() => enviar(tipo.id)}
            >
              <span className="acao-titulo">{tipo.rotulo}</span>
              <span className="acao-descricao">{tipo.descricao}</span>
            </button>
          ))}
          <button
            type="button"
            className="acao acao-secundaria"
            aria-expanded={outroAberto}
            aria-controls="formulario-outro"
            onClick={() => setOutroAberto((aberto) => !aberto)}
          >
            <span className="acao-titulo">{dadosTipo('outro').rotulo}</span>
            <span className="acao-descricao">{dadosTipo('outro').descricao}</span>
          </button>
        </div>
        <form
          id="formulario-outro"
          className="cartao"
          hidden={!outroAberto}
          onSubmit={(e) => {
            e.preventDefault()
            enviar('outro', mensagem)
          }}
        >
          <div className="campo">
            <label htmlFor="mensagem">O que você precisa?</label>
            <textarea
              id="mensagem"
              rows={3}
              maxLength={MENSAGEM_MAXIMA}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              aria-invalid={erro?.campo === 'mensagem'}
              aria-describedby={erro?.campo === 'mensagem' ? 'erro-mensagem dica-mensagem' : 'dica-mensagem'}
            />
            <p id="dica-mensagem" className="dica">
              Até {MENSAGEM_MAXIMA} caracteres. Exemplo: mais guardanapos, cadeira para criança.
            </p>
            {erro?.campo === 'mensagem' && (
              <p id="erro-mensagem" className="erro">
                {erro.texto}
              </p>
            )}
          </div>
          <button type="submit" className="botao botao-principal" aria-disabled={enviando}>
            Enviar pedido
          </button>
        </form>
        {erro?.campo === 'geral' && <p className="erro">{erro.texto}</p>}
      </section>

      <section aria-labelledby="titulo-canais">
        <h2 id="titulo-canais">Outros canais</h2>
        <ListaDeCanais canais={canais} />
      </section>
    </div>
  )
}

const PASSOS = ['Enviado', 'A caminho', 'Atendido']

function CartaoDoChamado({
  chamado,
  podeCancelar,
  aoCancelar,
  aoFechar,
}: {
  chamado: Chamado
  podeCancelar: boolean
  aoCancelar: () => void
  aoFechar: () => void
}) {
  const aberto = estaAberto(chamado)
  const feitos = { aguardando: 1, a_caminho: 2, concluido: 3, cancelado: 0 }[chamado.status]
  return (
    <article className="cartao">
      <div className="linha-topo">
        <h3>{dadosTipo(chamado.tipo).resumo}</h3>
        <span className="situacao" data-status={chamado.status}>
          {ROTULO_STATUS[chamado.status]}
        </span>
      </div>
      <p>
        Mesa {chamado.mesa} · {nomeUnidade(chamado.unidade)}
      </p>
      {chamado.mensagem && <p className="mensagem">{chamado.mensagem}</p>}
      {chamado.status !== 'cancelado' && (
        <ol className="passos" aria-hidden="true">
          {PASSOS.map((passo, i) => (
            <li key={passo} data-feito={i < feitos ? '' : undefined}>
              {passo}
            </li>
          ))}
        </ol>
      )}
      <div className="acoes">
        <BotaoOuvir texto={fraseParaCliente(chamado)} rotulo="Ouvir situação" />
        {aberto && podeCancelar && (
          <button type="button" className="botao botao-linha" onClick={aoCancelar}>
            Cancelar chamado
          </button>
        )}
        {!aberto && (
          <button type="button" className="botao botao-linha" onClick={aoFechar}>
            Fechar aviso
          </button>
        )}
      </div>
    </article>
  )
}
