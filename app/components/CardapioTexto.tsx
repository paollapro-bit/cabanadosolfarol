import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAcessibilidade } from './Acessibilidade'
import { lerCardapioEmTexto } from '~/lib/api'
import { nomeUnidade, UNIDADES, type UnidadeId } from '~/lib/chamados'
import {
  agrupar,
  dataDoCardapio,
  filtrarItens,
  fraseDaSecao,
  fraseDoItem,
  precoNaTela,
  semAcento,
  type CardapioEmTexto,
} from '~/lib/cardapioTexto'

const idDe = (prefixo: string, texto: string) => `${prefixo}-${semAcento(texto).replace(/[^a-z0-9]+/g, '-')}`

/** O cardápio em texto: escolher unidade, buscar, pular para um grupo e ouvir cada prato. */
export function CardapioTexto({
  unidade,
  aoEscolherUnidade,
}: {
  unidade: UnidadeId
  aoEscolherUnidade: (u: UnidadeId) => void
}) {
  const { anunciar, ouvir } = useAcessibilidade()
  const [cardapio, setCardapio] = useState<CardapioEmTexto | null>(null)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const espera = useRef<number | undefined>(undefined)

  const carregar = useCallback(async () => {
    setErro('')
    try {
      setCardapio(await lerCardapioEmTexto())
    } catch (e) {
      const texto = e instanceof Error ? e.message : 'Não foi possível carregar o cardápio.'
      setErro(texto)
      anunciar(texto)
    }
  }, [anunciar])

  useEffect(() => {
    carregar()
  }, [carregar])

  const itens = useMemo(() => (cardapio ? filtrarItens(cardapio.itens, unidade, busca) : []), [cardapio, unidade, busca])
  const grupos = useMemo(() => agrupar(itens), [itens])

  // Anuncia o resultado da busca quando a pessoa para de digitar.
  useEffect(() => {
    if (!cardapio || !busca.trim()) return
    window.clearTimeout(espera.current)
    espera.current = window.setTimeout(() => {
      anunciar(
        itens.length === 0
          ? 'Nenhum item encontrado. Tente outra palavra.'
          : itens.length === 1
            ? '1 item encontrado.'
            : `${itens.length} itens encontrados.`,
      )
    }, 700)
    return () => window.clearTimeout(espera.current)
  }, [busca, itens.length, cardapio, anunciar])

  function irPara(id: string) {
    const alvo = document.getElementById(id)
    alvo?.scrollIntoView({ block: 'start' })
    alvo?.focus()
  }

  return (
    <section aria-labelledby="titulo-cardapio-texto" className="tela">
      <div className="cartao">
        <h2 id="titulo-cardapio-texto">Cardápio para comer no restaurante</h2>
        <fieldset className="campo">
          <legend className="legenda">Unidade</legend>
          <div className="opcoes">
            {UNIDADES.map((u) => (
              <label key={u.id} className="opcao">
                <input
                  type="radio"
                  name="cardapio-unidade"
                  checked={unidade === u.id}
                  onChange={() => {
                    aoEscolherUnidade(u.id)
                    anunciar(`Cardápio da ${u.nome}.`)
                  }}
                />
                <span>{u.nome}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="campo">
          <label htmlFor="cardapio-busca">Procurar prato ou bebida</label>
          <input
            id="cardapio-busca"
            type="search"
            autoComplete="off"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            aria-describedby="cardapio-busca-dica"
          />
          <p id="cardapio-busca-dica" className="dica">
            Exemplos: camarão, cuxá, sobremesa, suco.
          </p>
        </div>
        {cardapio?.atualizadoEm && (
          <p className="dica">
            Cardápio atualizado em {dataDoCardapio(cardapio.atualizadoEm)}. Ele vem direto do site do cardápio do
            Cabana: quando o site muda, esta página muda junto.
          </p>
        )}
      </div>

      {!cardapio && !erro && <p className="dica">Carregando o cardápio…</p>}
      {erro && (
        <div className="cartao">
          <p className="erro">{erro}</p>
          <div className="acoes">
            <button type="button" className="botao botao-principal" onClick={carregar}>
              Tentar de novo
            </button>
          </div>
        </div>
      )}

      {cardapio && grupos.length > 0 && (
        <nav aria-label="Partes do cardápio" className="abas">
          {grupos.map((g) => (
            <button key={g.nome} type="button" className="chip" onClick={() => irPara(idDe('grupo', g.nome))}>
              {g.nome}
            </button>
          ))}
        </nav>
      )}

      {cardapio && itens.length === 0 && (
        <p className="vazio">
          Nenhum item encontrado{busca ? ` para "${busca}"` : ''} na {nomeUnidade(unidade)}.
        </p>
      )}

      {grupos.map((g) => (
        <section key={g.nome} aria-labelledby={idDe('grupo', g.nome)} className="grupo-do-cardapio">
          <h2 id={idDe('grupo', g.nome)} tabIndex={-1}>
            {g.nome}
          </h2>
          {g.secoes.map((s) => {
            const idSecao = idDe(`secao-${g.nome}`, s.nome)
            return (
              <section key={s.nome} aria-labelledby={idSecao} className="secao-do-cardapio">
                <div className="linha-topo">
                  <h3 id={idSecao}>{s.nome}</h3>
                  <button type="button" className="botao botao-linha botao-pequeno" onClick={() => ouvir(fraseDaSecao(s))}>
                    <span aria-hidden="true">🔊 </span>Ouvir<span className="sr-only"> a seção {s.nome}</span>
                  </button>
                </div>
                <ul className="itens-do-cardapio">
                  {s.itens.map((item, i) => (
                    <li key={`${item.codigo}-${item.nome}-${i}`}>
                      <div className="item-topo">
                        <span className="item-nome">{item.nome}</span>
                        {item.precoCentavos !== null && (
                          <span className="item-preco">{precoNaTela(item.precoCentavos)}</span>
                        )}
                      </div>
                      {item.descricao && <p className="item-descricao">{item.descricao}</p>}
                      {item.pessoas && (
                        <p className="item-descricao">
                          Serve {item.pessoas} {item.pessoas === 1 ? 'pessoa' : 'pessoas'}
                        </p>
                      )}
                      <button type="button" className="botao-ouvir-item" onClick={() => ouvir(fraseDoItem(item))}>
                        <span aria-hidden="true">🔊</span>
                        <span className="sr-only">Ouvir {item.nome}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </section>
      ))}
    </section>
  )
}
