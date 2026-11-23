import { useEffect, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ListaDeCanais } from '~/components/Canais'
import { cardapios, unidades } from '~/data/atendimento'
import { lerCardapio } from '~/lib/api'
import { urlDeIncorporacao, urlDeVisualizacao, type CardapioCanva } from '~/lib/cardapio'

export const Route = createFileRoute('/cardapio')({
  head: () => ({ meta: [{ title: 'Cardápio · Cabana do Sol' }] }),
  component: Cardapio,
})

function Cardapio() {
  const [estado, setEstado] = useState<
    { tipo: 'carregando' } | { tipo: 'erro'; texto: string } | { tipo: 'pronto'; cardapio: CardapioCanva | null }
  >({ tipo: 'carregando' })

  useEffect(() => {
    lerCardapio()
      .then(({ cardapio }) => setEstado({ tipo: 'pronto', cardapio }))
      .catch((e) =>
        setEstado({ tipo: 'erro', texto: e instanceof Error ? e.message : 'Não foi possível carregar o cardápio.' }),
      )
  }, [])

  const cardapio = estado.tipo === 'pronto' ? estado.cardapio : null

  return (
    <div className="tela">
      <section aria-labelledby="titulo-pagina">
        <p className="sobrancelha">Cabana do Sol</p>
        <h1 id="titulo-pagina">Cardápio</h1>
        <p className="intro">
          Os cardápios abrem no Canva, sempre na versão mais recente: quando a equipe atualiza um
          prato ou preço, o link já mostra a mudança.
        </p>
        {/* Os cardápios do Canva são imagens: dizemos isso antes, e oferecemos alternativas. */}
        <div className="cartao aviso-acessivel">
          <p>
            <strong>Usa leitor de tela?</strong> Estes cardápios são imagens feitas no Canva e não podem
            ser lidos em voz alta. A equipe lê para você na mesa, ou você pode pedir pelo telefone.
          </p>
          <div className="acoes">
            <Link to="/" className="botao botao-principal">
              Pedir ajuda na mesa
            </Link>
            <Link to="/delivery" className="botao botao-linha">
              Telefones do delivery
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="titulo-casa">
        <h2 id="titulo-casa">Para comer no restaurante</h2>
        {unidades.map((u) => (
          <div key={u.id} className="grupo-cardapio">
            <h3>{u.nome}</h3>
            <ListaDeCanais canais={cardapios.filter((c) => c.unidade === u.id)} />
          </div>
        ))}
      </section>

      <section aria-labelledby="titulo-outros">
        <h2 id="titulo-outros">Delivery e happy hour</h2>
        <ListaDeCanais canais={cardapios.filter((c) => !c.unidade)} />
      </section>

      {estado.tipo === 'erro' && <p className="erro">{estado.texto}</p>}
      {cardapio && (
        <section aria-labelledby="titulo-visual">
          <h2 id="titulo-visual" className="sr-only">
            Cardápio em imagem
          </h2>
          <div className="canva" style={{ paddingTop: `${cardapio.proporcao}%` }}>
            <iframe
              src={urlDeIncorporacao(cardapio)}
              title="Cardápio do Cabana do Sol, em imagem do Canva"
              loading="lazy"
              allow="fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
          <div className="acoes">
            <a className="botao botao-linha" href={urlDeVisualizacao(cardapio)} target="_blank" rel="noreferrer">
              Abrir o cardápio em tela cheia<span className="sr-only"> (abre no Canva)</span>
            </a>
          </div>
        </section>
      )}
    </div>
  )
}
