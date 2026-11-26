import { useCallback, useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useAcessibilidade } from '~/components/Acessibilidade'
import { PainelDaEquipe, useEquipe } from '~/components/Equipe'
import { lerRelatorio } from '~/lib/api'
import {
  intervaloDoPeriodo,
  montarRelatorio,
  PERIODOS_DO_RELATORIO,
  relatorioEmCsv,
  type PeriodoId,
} from '~/lib/metricas'
import { dataPorExtenso, ehData, hojeNoMaranhao } from '~/lib/reservas'

export const Route = createFileRoute('/equipe/relatorio')({
  head: () => ({
    meta: [{ title: 'Relatório · Painel da equipe' }, { name: 'robots', content: 'noindex' }],
  }),
  component: () => (
    <PainelDaEquipe titulo="Relatório de cliques" semUnidade>
      <Relatorio />
    </PainelDaEquipe>
  ),
})

const numero = new Intl.NumberFormat('pt-BR')

function Relatorio() {
  const { anunciar } = useAcessibilidade()
  const { pin, falha, limparErro } = useEquipe()
  const [hoje] = useState(() => hojeNoMaranhao())
  const [periodo, setPeriodo] = useState<PeriodoId | 'datas'>('esta-semana')
  const [datas, setDatas] = useState(() => intervaloDoPeriodo('este-mes', hojeNoMaranhao()))
  const [contagens, setContagens] = useState<{ evento: string; total: number }[] | null>(null)

  const intervalo = periodo === 'datas' ? datas : intervaloDoPeriodo(periodo, hoje)
  const valido = ehData(intervalo.de) && ehData(intervalo.ate) && intervalo.de <= intervalo.ate

  const carregar = useCallback(async () => {
    if (!valido) return
    try {
      const resposta = await lerRelatorio(intervalo.de, intervalo.ate, pin)
      limparErro()
      setContagens(resposta.contagens)
    } catch (e) {
      falha(e)
    }
  }, [intervalo.de, intervalo.ate, valido, pin, falha, limparErro])

  useEffect(() => {
    setContagens(null)
    carregar()
  }, [carregar])

  const grupos = useMemo(() => (contagens ? montarRelatorio(contagens) : []), [contagens])
  const totalGeral = grupos.filter((g) => g.categoria !== 'visitas').reduce((s, g) => s + g.total, 0)
  const maior = Math.max(1, ...grupos.flatMap((g) => g.linhas.map((l) => l.total)))

  useEffect(() => {
    if (contagens) anunciar(`Relatório carregado: ${numero.format(totalGeral)} cliques em botões no período.`)
  }, [contagens, totalGeral, anunciar])

  const csv = useMemo(
    () => (contagens ? URL.createObjectURL(new Blob([relatorioEmCsv(grupos, intervalo.de, intervalo.ate)], { type: 'text/csv' })) : ''),
    [contagens, grupos, intervalo.de, intervalo.ate],
  )
  useEffect(() => () => (csv ? URL.revokeObjectURL(csv) : undefined), [csv])

  return (
    <>
      <section aria-labelledby="titulo-periodo" className="cartao">
        <h2 id="titulo-periodo">Período</h2>
        <div className="campo">
          <label htmlFor="relatorio-periodo">Mostrar</label>
          <select
            id="relatorio-periodo"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value as PeriodoId | 'datas')}
          >
            {PERIODOS_DO_RELATORIO.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
            <option value="datas">Escolher as datas</option>
          </select>
        </div>
        {periodo === 'datas' && (
          <div className="opcoes">
            <div className="campo">
              <label htmlFor="relatorio-de">De</label>
              <input
                id="relatorio-de"
                type="date"
                max={hoje}
                value={datas.de}
                onChange={(e) => setDatas((d) => ({ ...d, de: e.target.value }))}
              />
            </div>
            <div className="campo">
              <label htmlFor="relatorio-ate">Até</label>
              <input
                id="relatorio-ate"
                type="date"
                max={hoje}
                value={datas.ate}
                onChange={(e) => setDatas((d) => ({ ...d, ate: e.target.value }))}
              />
            </div>
          </div>
        )}
        {valido ? (
          <p className="dica">
            De {dataPorExtenso(intervalo.de)} até {dataPorExtenso(intervalo.ate)}.
          </p>
        ) : (
          <p className="erro">A data inicial precisa ser antes da final.</p>
        )}
        <p className="dica">
          Conta cada toque em cada botão e cada vez que uma tela é aberta. Não guarda nada sobre quem tocou.
        </p>
      </section>

      {contagens === null && valido && <p className="dica">Carregando o relatório…</p>}

      {contagens && (
        <>
          <section aria-labelledby="titulo-resumo">
            <h2 id="titulo-resumo">Resumo</h2>
            <ul className="resumo-relatorio">
              {grupos.map((g) => (
                <li key={g.categoria} className="cartao">
                  <span className="resumo-nome">{g.nome}</span>
                  <span className="resumo-total">{numero.format(g.total)}</span>
                </li>
              ))}
            </ul>
            <div className="acoes">
              <a className="botao botao-linha" href={csv} download={`cliques-${intervalo.de}-a-${intervalo.ate}.csv`}>
                Baixar planilha
              </a>
            </div>
          </section>

          {grupos.map((g) => (
            <section key={g.categoria} aria-labelledby={`titulo-${g.categoria}`}>
              <h2 id={`titulo-${g.categoria}`}>
                {g.nome}: {numero.format(g.total)}
              </h2>
              {g.linhas.length === 0 ? (
                <p className="vazio">Nenhum clique nesse período.</p>
              ) : (
                <div className="tabela-rolavel">
                  <table className="tabela-relatorio">
                    <caption className="sr-only">Cliques em {g.nome}, do mais tocado para o menos</caption>
                    <thead>
                      <tr>
                        <th scope="col">Botão ou tela</th>
                        <th scope="col">Cliques</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.linhas.map((l) => (
                        <tr key={l.evento}>
                          <th scope="row">
                            {l.rotulo}
                            <span className="barra" aria-hidden="true" style={{ width: `${(l.total / maior) * 100}%` }} />
                          </th>
                          <td>{numero.format(l.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </>
      )}
    </>
  )
}
