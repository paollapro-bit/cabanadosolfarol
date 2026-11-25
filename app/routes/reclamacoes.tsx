import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { BotaoOuvir, useAcessibilidade } from '~/components/Acessibilidade'
import { consultarReclamacao, enviarReclamacao, ErroDeApi } from '~/lib/api'
import { ehUnidade, nomeUnidade, UNIDADES, type UnidadeId } from '~/lib/chamados'
import { guardar, lerGuardado } from '~/lib/guardado'
import { SEM_MESA } from '~/edicao'
import {
  ASSUNTOS,
  fraseDaReclamacao,
  MENSAGEM_MAXIMA_RECLAMACAO,
  nomeAssunto,
  protocolo,
  ROTULO_RECLAMACAO,
  validarReclamacao,
  type Reclamacao,
} from '~/lib/reclamacoes'

export const Route = createFileRoute('/reclamacoes')({
  head: () => ({ meta: [{ title: 'Reclamações · Cabana do Sol' }] }),
  component: Reclamacoes,
})

const CHAVE_LOCAL = 'cds-local'
const CHAVE_RECLAMACOES = 'cds-reclamacoes'

interface Acompanhada {
  id: string
  segredo: string
  reclamacao?: Reclamacao
}

const INTRO =
  'Reclamações. Sentimos muito que algo não saiu como deveria. Escolha a unidade e o assunto, e conte o que aconteceu. A gerência lê todas as mensagens. O nome é opcional. Se quiser resposta, marque a opção e deixe um telefone ou e-mail. Ao enviar, você recebe um número de protocolo.'

function Reclamacoes() {
  const { anunciar } = useAcessibilidade()
  const [unidade, setUnidade] = useState<UnidadeId | ''>('')
  const [assunto, setAssunto] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [nome, setNome] = useState('')
  const [querResposta, setQuerResposta] = useState(false)
  const [contato, setContato] = useState('')
  const [erro, setErro] = useState<{ campo?: string; texto: string } | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [minhas, setMinhas] = useState<Acompanhada[]>([])
  const [carregado, setCarregado] = useState(false)
  const tituloMinhas = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const local = lerGuardado<{ unidade?: string }>(CHAVE_LOCAL, {})
    if (ehUnidade(local.unidade)) setUnidade(local.unidade)
    const guardadas = lerGuardado<Acompanhada[]>(CHAVE_RECLAMACOES, []).map(({ id, segredo }) => ({ id, segredo }))
    setMinhas(guardadas)
    setCarregado(true)
    // Busca a situação atual de cada reclamação enviada deste aparelho.
    Promise.all(
      guardadas.map(async (item) => {
        try {
          return { ...item, reclamacao: (await consultarReclamacao(item.id, item.segredo)).reclamacao }
        } catch (e) {
          return e instanceof ErroDeApi && e.status === 404 ? null : item
        }
      }),
    ).then((lista) => setMinhas(lista.filter((i): i is Acompanhada => i !== null)))
  }, [])

  useEffect(() => {
    if (carregado) guardar(CHAVE_RECLAMACOES, minhas.map(({ id, segredo }) => ({ id, segredo })))
  }, [minhas, carregado])

  function falhar(texto: string, campo?: string) {
    setErro({ campo, texto })
    anunciar(texto)
    const alvo = { unidade: 'reclamacao-unidade-litoranea', assunto: 'reclamacao-assunto' }[campo ?? ''] ?? `reclamacao-${campo}`
    document.getElementById(alvo)?.focus()
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (enviando) return
    const dados = { unidade, assunto, mensagem, nome, querResposta, contato }
    const validacao = validarReclamacao(dados)
    if (!validacao.ok) return falhar(validacao.erro, validacao.campo)
    setErro(null)
    setEnviando(true)
    try {
      const { reclamacao, segredo } = await enviarReclamacao(dados)
      setMinhas((atuais) => [{ id: reclamacao.id, segredo, reclamacao }, ...atuais])
      setAssunto('')
      setMensagem('')
      setContato('')
      setQuerResposta(false)
      anunciar(`Reclamação enviada. ${fraseDaReclamacao(reclamacao)}`)
      window.setTimeout(() => tituloMinhas.current?.focus(), 80)
    } catch (e) {
      falhar(e instanceof Error ? e.message : 'Não foi possível enviar.', e instanceof ErroDeApi ? e.campo : undefined)
    } finally {
      setEnviando(false)
    }
  }

  const visiveis = minhas.filter((i) => i.reclamacao)
  const descreve = (campo: string, dica?: string) =>
    [dica, erro?.campo === campo ? 'reclamacao-erro' : undefined].filter(Boolean).join(' ') || undefined

  return (
    <div className="tela">
      <section aria-labelledby="titulo-pagina">
        <p className="sobrancelha">Sua opinião</p>
        <h1 id="titulo-pagina">Reclamações</h1>
        <p className="intro">
          Sentimos muito que algo não saiu como deveria. Conte para a gente: a gerência lê todas as mensagens.
        </p>
        <div className="acoes">
          <BotaoOuvir texto={INTRO} rotulo="Ouvir como funciona" />
          {!SEM_MESA && (
            <Link to="/" className="botao botao-linha">
              Está no restaurante? Chame a equipe agora
            </Link>
          )}
        </div>
      </section>

      {visiveis.length > 0 && (
        <section aria-labelledby="titulo-minhas">
          <h2 id="titulo-minhas" ref={tituloMinhas} tabIndex={-1}>
            Suas reclamações
          </h2>
          <ul className="lista">
            {visiveis.map(({ id, reclamacao: r }) => (
              <li key={id}>
                <article className="cartao">
                  <div className="linha-topo">
                    <h3>Protocolo {protocolo(r!.id)}</h3>
                    <span className="situacao" data-status={r!.status === 'resolvida' ? 'concluido' : 'aguardando'}>
                      {ROTULO_RECLAMACAO[r!.status]}
                    </span>
                  </div>
                  <p>
                    {nomeAssunto(r!.assunto)} · {nomeUnidade(r!.unidade)} ·{' '}
                    {new Date(r!.criadoEm).toLocaleDateString('pt-BR', { timeZone: 'America/Fortaleza' })}
                  </p>
                  <p className="mensagem">{r!.mensagem}</p>
                  <div className="acoes">
                    <BotaoOuvir texto={fraseDaReclamacao(r!)} rotulo="Ouvir situação" />
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </section>
      )}

      <form className="cartao" onSubmit={enviar} noValidate aria-labelledby="titulo-form">
        <h2 id="titulo-form">{visiveis.length ? 'Enviar outra reclamação' : 'O que aconteceu?'}</h2>
        <fieldset className="campo">
          <legend className="legenda">Unidade</legend>
          <div className="opcoes">
            {UNIDADES.map((u) => (
              <label key={u.id} className="opcao">
                <input
                  id={`reclamacao-unidade-${u.id}`}
                  type="radio"
                  name="reclamacao-unidade"
                  checked={unidade === u.id}
                  onChange={() => setUnidade(u.id)}
                  aria-describedby={descreve('unidade')}
                />
                <span>{u.nome}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="campo">
          <label htmlFor="reclamacao-assunto">Assunto</label>
          <select
            id="reclamacao-assunto"
            value={assunto}
            onChange={(e) => setAssunto(e.target.value)}
            aria-invalid={erro?.campo === 'assunto'}
            aria-describedby={descreve('assunto')}
          >
            <option value="">Escolha o assunto</option>
            {ASSUNTOS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="reclamacao-mensagem">Conte o que aconteceu</label>
          <textarea
            id="reclamacao-mensagem"
            rows={5}
            maxLength={MENSAGEM_MAXIMA_RECLAMACAO}
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            aria-invalid={erro?.campo === 'mensagem'}
            aria-describedby={descreve('mensagem', 'reclamacao-dica-mensagem')}
          />
          <p id="reclamacao-dica-mensagem" className="dica">
            Se puder, diga o dia, o horário e a mesa. {mensagem.length} de {MENSAGEM_MAXIMA_RECLAMACAO} caracteres.
          </p>
        </div>
        <div className="campo">
          <label htmlFor="reclamacao-nome">Seu nome (opcional)</label>
          <input
            id="reclamacao-nome"
            autoComplete="name"
            maxLength={80}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>
        <label className="marcar">
          <input
            id="reclamacao-quer-resposta"
            type="checkbox"
            checked={querResposta}
            onChange={(e) => setQuerResposta(e.target.checked)}
            aria-controls="reclamacao-bloco-contato"
          />
          <span>Quero receber uma resposta</span>
        </label>
        <div id="reclamacao-bloco-contato" className="campo" hidden={!querResposta}>
          <label htmlFor="reclamacao-contato">Telefone com DDD ou e-mail</label>
          <input
            id="reclamacao-contato"
            autoComplete="tel"
            maxLength={120}
            value={contato}
            onChange={(e) => setContato(e.target.value)}
            aria-invalid={erro?.campo === 'contato'}
            aria-describedby={descreve('contato', 'reclamacao-dica-contato')}
          />
          <p id="reclamacao-dica-contato" className="dica">
            Usado só para responder a esta reclamação.
          </p>
        </div>
        {erro && (
          <p id="reclamacao-erro" className="erro">
            {erro.texto}
          </p>
        )}
        <button type="submit" className="botao botao-principal" aria-disabled={enviando}>
          Enviar reclamação
        </button>
      </form>
    </div>
  )
}
