import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { BotaoOuvir, useAcessibilidade } from '~/components/Acessibilidade'
import { ListaDeCanais } from '~/components/Canais'
import { canaisDoGrupo } from '~/data/atendimento'
import {
  cancelarReserva,
  consultarReserva,
  ErroDeApi,
  listarSaloes,
  pedirReserva,
  urlDaFoto,
  type SalaoComOcupacao,
} from '~/lib/api'
import { ehUnidade, nomeUnidade, UNIDADES, type UnidadeId } from '~/lib/chamados'
import { guardar, lerGuardado } from '~/lib/guardado'
import {
  ANTECEDENCIA_MAXIMA_DIAS,
  dataPorExtenso,
  ehData,
  fraseDaReserva,
  fraseDoSalao,
  hojeNoMaranhao,
  nomePeriodo,
  PERIODOS,
  pessoasPorExtenso,
  reservaEmAberto,
  ROTULO_RESERVA,
  somarDias,
  validarReserva,
  type PeriodoId,
  type Reserva,
} from '~/lib/reservas'

export const Route = createFileRoute('/reservas')({
  head: () => ({ meta: [{ title: 'Reserva de salões · Cabana do Sol' }] }),
  component: Reservas,
})

const CHAVE_LOCAL = 'cds-local'
const CHAVE_RESERVAS = 'cds-reservas'
const INTERVALO_MS = 20000

interface Acompanhada {
  id: string
  segredo: string
  reserva?: Reserva
}

const INTRO =
  'Reserva de salões do Cabana do Sol. Escolha a unidade, a data e o período. A lista mostra cada salão com a quantidade de pessoas, a descrição das fotos e se está disponível. Toque em Reservar, informe quantas pessoas vão, seu nome e telefone. A reserva só vale depois que a equipe confirmar.'

function Reservas() {
  const { anunciar } = useAcessibilidade()
  const [hoje] = useState(() => hojeNoMaranhao())
  const [unidade, setUnidade] = useState<UnidadeId | ''>('')
  const [data, setData] = useState(() => somarDias(hojeNoMaranhao(), 1))
  const [periodo, setPeriodo] = useState<PeriodoId>('almoco')
  const [saloes, setSaloes] = useState<SalaoComOcupacao[] | null>(null)
  const [erroDaLista, setErroDaLista] = useState('')
  const [escolhido, setEscolhido] = useState('')
  const [minhas, setMinhas] = useState<Acompanhada[]>([])
  const [carregado, setCarregado] = useState(false)
  const tituloMinhas = useRef<HTMLHeadingElement>(null)
  const lista = useRef(minhas)
  lista.current = minhas

  useEffect(() => {
    const local = lerGuardado<{ unidade?: string }>(CHAVE_LOCAL, {})
    if (ehUnidade(local.unidade)) setUnidade(local.unidade)
    setMinhas(
      lerGuardado<Acompanhada[]>(CHAVE_RESERVAS, []).map(({ id, segredo }) => ({ id, segredo })),
    )
    setCarregado(true)
  }, [])

  useEffect(() => {
    if (!carregado) return
    guardar(
      CHAVE_RESERVAS,
      minhas.map(({ id, segredo }) => ({ id, segredo })),
    )
  }, [minhas, carregado])

  function escolherUnidade(id: UnidadeId) {
    setUnidade(id)
    guardar(CHAVE_LOCAL, { ...lerGuardado<object>(CHAVE_LOCAL, {}), unidade: id })
  }

  const carregarSaloes = useCallback(async () => {
    if (!unidade) return
    try {
      const { saloes: resposta } = await listarSaloes(unidade, ehData(data) ? data : undefined)
      setSaloes(resposta)
      setErroDaLista('')
    } catch (e) {
      const texto = e instanceof Error ? e.message : 'Não foi possível carregar os salões.'
      setErroDaLista(texto)
      anunciar(texto)
    }
  }, [unidade, data, anunciar])

  useEffect(() => {
    setSaloes(null)
    setEscolhido('')
    carregarSaloes()
  }, [carregarSaloes])

  const atualizarMinhas = useCallback(async () => {
    const resultados = await Promise.all(
      lista.current.map(async (item) => {
        if (item.reserva && !reservaEmAberto(item.reserva)) return item
        try {
          const { reserva } = await consultarReserva(item.id, item.segredo)
          return { ...item, reserva }
        } catch (e) {
          return e instanceof ErroDeApi && e.status === 404 ? { ...item, sumiu: true } : item
        }
      }),
    )
    for (const item of resultados) {
      const anterior = lista.current.find((i) => i.id === item.id)?.reserva?.status
      if (item.reserva && anterior && anterior !== item.reserva.status) {
        anunciar(fraseDaReserva(item.reserva))
      }
    }
    setMinhas((atuais) =>
      atuais.flatMap((atual) => {
        const novo = resultados.find((r) => r.id === atual.id)
        if (novo && 'sumiu' in novo) return []
        return [novo ?? atual]
      }),
    )
  }, [anunciar])

  const haAbertas = minhas.some((i) => !i.reserva || reservaEmAberto(i.reserva))
  useEffect(() => {
    if (!haAbertas) return
    atualizarMinhas()
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') atualizarMinhas()
    }, INTERVALO_MS)
    return () => window.clearInterval(timer)
  }, [haAbertas, atualizarMinhas])

  async function cancelar(item: Acompanhada) {
    try {
      const { reserva } = await cancelarReserva(item.id, item.segredo)
      setMinhas((atuais) => atuais.map((i) => (i.id === item.id ? { ...i, reserva } : i)))
      anunciar(fraseDaReserva(reserva))
      carregarSaloes()
    } catch (e) {
      anunciar(e instanceof Error ? e.message : 'Não foi possível cancelar a reserva.')
    }
  }

  function aoReservar(reserva: Reserva, segredo: string) {
    setMinhas((atuais) => [{ id: reserva.id, segredo, reserva }, ...atuais])
    setEscolhido('')
    anunciar(fraseDaReserva(reserva))
    window.setTimeout(() => tituloMinhas.current?.focus(), 80)
  }

  const visiveis = minhas.filter((i) => i.reserva)
  const canaisDeReserva = canaisDoGrupo('reservas')
  const dataValida = ehData(data) && data >= hoje

  return (
    <div className="tela">
      <section aria-labelledby="titulo-pagina">
        <p className="sobrancelha">Eventos e grupos</p>
        <h1 id="titulo-pagina">Reserva de salões</h1>
        <p className="intro">
          Conheça os salões, veja quantas pessoas cada um recebe e peça a sua reserva.
        </p>
        <div className="acoes">
          <BotaoOuvir texto={INTRO} rotulo="Ouvir como funciona" />
        </div>
      </section>

      {visiveis.length > 0 && (
        <section aria-labelledby="titulo-minhas">
          <h2 id="titulo-minhas" ref={tituloMinhas} tabIndex={-1}>
            Suas reservas
          </h2>
          <ul className="lista">
            {visiveis.map((item) => {
              const r = item.reserva!
              return (
                <li key={item.id}>
                  <article className="cartao">
                    <div className="linha-topo">
                      <h3>{r.salaoNome}</h3>
                      <span className="situacao" data-status={r.status}>
                        {ROTULO_RESERVA[r.status]}
                      </span>
                    </div>
                    <p>
                      {dataPorExtenso(r.data)} · {nomePeriodo(r.periodo)}
                      <br />
                      {pessoasPorExtenso(r.pessoas)} · {nomeUnidade(r.unidade)}
                    </p>
                    {r.status === 'pendente' && (
                      <p className="dica">A reserva só vale depois que a equipe confirmar.</p>
                    )}
                    <div className="acoes">
                      <BotaoOuvir texto={fraseDaReserva(r)} rotulo="Ouvir situação" />
                      {reservaEmAberto(r) ? (
                        <button type="button" className="botao botao-linha" onClick={() => cancelar(item)}>
                          Cancelar reserva
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="botao botao-linha"
                          onClick={() => {
                            setMinhas((atuais) => atuais.filter((i) => i.id !== item.id))
                            anunciar('Aviso fechado.')
                          }}
                        >
                          Fechar aviso
                        </button>
                      )}
                    </div>
                  </article>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section aria-labelledby="titulo-quando" className="cartao">
        <h2 id="titulo-quando">1. Onde e quando?</h2>
        <fieldset className="campo">
          <legend className="legenda">Unidade</legend>
          <div className="opcoes">
            {UNIDADES.map((u) => (
              <label key={u.id} className="opcao">
                <input
                  type="radio"
                  name="unidade"
                  checked={unidade === u.id}
                  onChange={() => escolherUnidade(u.id)}
                />
                <span>{u.nome}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="campo">
          <label htmlFor="data">Data</label>
          <input
            id="data"
            type="date"
            min={hoje}
            max={somarDias(hoje, ANTECEDENCIA_MAXIMA_DIAS)}
            value={data}
            onChange={(e) => setData(e.target.value)}
            aria-invalid={!dataValida}
            aria-describedby="dica-data"
          />
          <p id="dica-data" className={dataValida ? 'dica' : 'erro'}>
            {dataValida ? dataPorExtenso(data) : 'Escolha uma data a partir de hoje.'}
          </p>
        </div>
        <fieldset className="campo">
          <legend className="legenda">Período</legend>
          <div className="opcoes">
            {PERIODOS.map((p) => (
              <label key={p.id} className="opcao">
                <input
                  type="radio"
                  name="periodo"
                  checked={periodo === p.id}
                  onChange={() => setPeriodo(p.id)}
                />
                <span>{p.nome}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section aria-labelledby="titulo-saloes">
        <h2 id="titulo-saloes">2. Escolha o salão</h2>
        {!unidade && <p className="vazio">Escolha a unidade para ver os salões.</p>}
        {erroDaLista && <p className="erro">{erroDaLista}</p>}
        {unidade && saloes === null && !erroDaLista && <p className="dica">Carregando salões…</p>}
        {unidade && saloes?.length === 0 && (
          <p className="vazio">
            Os salões de {nomeUnidade(unidade)} ainda não foram cadastrados. Para reservar, fale com a
            equipe do restaurante.
          </p>
        )}
        {canaisDeReserva.length > 0 && (
          <>
            <p className="dica">Prefere falar com uma pessoa? A equipe de reservas atende por aqui:</p>
            <ListaDeCanais canais={canaisDeReserva} />
          </>
        )}
        <ul className="lista">
          {saloes?.map((salao) => {
            const ocupado = dataValida ? Boolean(salao.ocupacao?.[periodo]) : undefined
            const aberto = escolhido === salao.id
            return (
              <li key={salao.id}>
                <article className="cartao">
                  {salao.fotos.length > 0 && (
                    <ul className="galeria" tabIndex={0} aria-label={`Fotos: ${salao.nome}`}>
                      {salao.fotos.map((foto) => (
                        <li key={foto.id}>
                          <img src={urlDaFoto(foto.id)} alt={foto.descricao} loading="lazy" />
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="linha-topo">
                    <h3 className="mesa">{salao.nome}</h3>
                    {ocupado !== undefined && (
                      <span className="situacao" data-status={ocupado ? 'cancelado' : 'concluido'}>
                        {ocupado ? 'Já reservado' : 'Disponível'}
                      </span>
                    )}
                  </div>
                  <p>
                    <strong>Até {pessoasPorExtenso(salao.capacidade)}</strong>
                  </p>
                  {salao.descricao && <p>{salao.descricao}</p>}
                  <div className="acoes">
                    <BotaoOuvir texto={fraseDoSalao(salao, ocupado)} rotulo={`Ouvir sobre ${salao.nome}`} />
                    {ocupado === false && (
                      <button
                        type="button"
                        className="botao botao-principal"
                        aria-expanded={aberto}
                        onClick={() => setEscolhido(aberto ? '' : salao.id)}
                      >
                        Reservar {salao.nome}
                      </button>
                    )}
                  </div>
                  {ocupado && (
                    <p className="dica">
                      Já existe reserva confirmada neste dia e período. Tente outra data ou período.
                    </p>
                  )}
                  {aberto && (
                    <FormularioDeReserva
                      salao={salao}
                      data={data}
                      periodo={periodo}
                      hoje={hoje}
                      aoReservar={aoReservar}
                      aoConflito={carregarSaloes}
                    />
                  )}
                </article>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

function FormularioDeReserva({
  salao,
  data,
  periodo,
  hoje,
  aoReservar,
  aoConflito,
}: {
  salao: SalaoComOcupacao
  data: string
  periodo: PeriodoId
  hoje: string
  aoReservar: (reserva: Reserva, segredo: string) => void
  aoConflito: () => void
}) {
  const { anunciar } = useAcessibilidade()
  const [pessoas, setPessoas] = useState('')
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [observacao, setObservacao] = useState('')
  const [erro, setErro] = useState<{ campo?: string; texto: string } | null>(null)
  const [enviando, setEnviando] = useState(false)
  const primeiro = useRef<HTMLInputElement>(null)

  useEffect(() => primeiro.current?.focus(), [])

  function falhar(texto: string, campo?: string) {
    setErro({ campo, texto })
    anunciar(texto)
    document.getElementById(campo === 'data' ? 'data' : `reserva-${campo}`)?.focus()
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (enviando) return
    const validacao = validarReserva(
      { salaoId: salao.id, data, periodo, pessoas, nome, telefone, observacao },
      salao,
      hoje,
    )
    if (!validacao.ok) return falhar(validacao.erro, validacao.campo)
    setErro(null)
    setEnviando(true)
    try {
      const { reserva, segredo } = await pedirReserva(validacao.dados)
      aoReservar(reserva, segredo)
    } catch (e) {
      falhar(
        e instanceof Error ? e.message : 'Não foi possível enviar a reserva.',
        e instanceof ErroDeApi ? e.campo : undefined,
      )
      if (e instanceof ErroDeApi && e.status === 409) aoConflito()
    } finally {
      setEnviando(false)
    }
  }

  const descreve = (campo: string) => (erro?.campo === campo ? 'reserva-erro' : undefined)

  return (
    <form className="cartao" onSubmit={enviar} aria-label={`Reservar ${salao.nome}`} noValidate>
      <p>
        <strong>
          {dataPorExtenso(data)} · {nomePeriodo(periodo)}
        </strong>
      </p>
      <div className="campo">
        <label htmlFor="reserva-pessoas">Quantas pessoas?</label>
        <input
          id="reserva-pessoas"
          ref={primeiro}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          value={pessoas}
          onChange={(e) => setPessoas(e.target.value.replace(/\D/g, ''))}
          aria-invalid={erro?.campo === 'pessoas'}
          aria-describedby={`reserva-dica-pessoas ${descreve('pessoas') ?? ''}`}
        />
        <p id="reserva-dica-pessoas" className="dica">
          Este salão recebe até {pessoasPorExtenso(salao.capacidade)}.
        </p>
      </div>
      <div className="campo">
        <label htmlFor="reserva-nome">Seu nome</label>
        <input
          id="reserva-nome"
          autoComplete="name"
          maxLength={80}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          aria-invalid={erro?.campo === 'nome'}
          aria-describedby={descreve('nome')}
        />
      </div>
      <div className="campo">
        <label htmlFor="reserva-telefone">Telefone com DDD</label>
        <input
          id="reserva-telefone"
          type="tel"
          autoComplete="tel-national"
          maxLength={16}
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          aria-invalid={erro?.campo === 'telefone'}
          aria-describedby={`reserva-dica-telefone ${descreve('telefone') ?? ''}`}
        />
        <p id="reserva-dica-telefone" className="dica">
          A equipe usa este número para confirmar a reserva com você.
        </p>
      </div>
      <div className="campo">
        <label htmlFor="reserva-observacao">Observação (opcional)</label>
        <textarea
          id="reserva-observacao"
          rows={3}
          maxLength={300}
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          aria-invalid={erro?.campo === 'observacao'}
          aria-describedby={descreve('observacao')}
        />
      </div>
      {erro && (
        <p id="reserva-erro" className="erro">
          {erro.texto}
        </p>
      )}
      <button type="submit" className="botao botao-principal" aria-disabled={enviando}>
        Pedir reserva
      </button>
    </form>
  )
}
