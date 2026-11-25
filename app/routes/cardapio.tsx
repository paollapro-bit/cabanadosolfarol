import { useEffect, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ListaDeCanais } from '~/components/Canais'
import { CardapioTexto } from '~/components/CardapioTexto'
import { cardapios, SITE_DO_CARDAPIO, unidades } from '~/data/atendimento'
import { SEM_MESA } from '~/edicao'
import { ehUnidade, type UnidadeId } from '~/lib/chamados'
import { guardar, lerGuardado } from '~/lib/guardado'
import { lerCardapio } from '~/lib/api'
import { urlDeIncorporacao, urlDeVisualizacao, type CardapioCanva } from '~/lib/cardapio'

export const Route = createFileRoute('/cardapio')({
  head: () => ({ meta: [{ title: 'Cardápio · Cabana do Sol' }] }),
  validateSearch: (busca: Record<string, unknown>): { unidade?: UnidadeId } => ({
    unidade: ehUnidade(busca.unidade) ? busca.unidade : undefined,
  }),
  component: SEM_MESA ? CardapioSemMesa : Cardapio,
})

const CHAVE_LOCAL = 'cds-local'

// Edição sem mesa: o cardápio em texto, lido do site do cardápio, e os
// cardápios em imagem do Canva como complemento.
function CardapioSemMesa() {
  const busca = Route.useSearch()
  const [unidade, setUnidade] = useState<UnidadeId>(busca.unidade ?? 'litoranea')

  useEffect(() => {
    if (busca.unidade) return
    const local = lerGuardado<{ unidade?: string }>(CHAVE_LOCAL, {})
    if (ehUnidade(local.unidade)) setUnidade(local.unidade)
  }, [busca.unidade])

  function escolher(u: UnidadeId) {
    setUnidade(u)
    guardar(CHAVE_LOCAL, { ...lerGuardado<object>(CHAVE_LOCAL, {}), unidade: u })
  }

  return (
    <div className="tela">
      <section aria-labelledby="titulo-pagina">
        <p className="sobrancelha">Cabana do Sol</p>
        <h1 id="titulo-pagina">Cardápio</h1>
        <p className="intro">
          Pratos e bebidas de cada unidade, com preços. Toque no alto-falante ao lado de um prato para ouvir.
        </p>
      </section>

      <CardapioTexto unidade={unidade} aoEscolherUnidade={escolher} />

      <section aria-labelledby="titulo-imagens">
        <h2 id="titulo-imagens">Outros cardápios</h2>
        <p className="dica">
          Estes abrem no Canva, em imagem, e não podem ser lidos por leitor de tela. O cardápio acima tem os mesmos
          pratos do salão em texto.
        </p>
        <ListaDeCanais
          canais={[
            ...cardapios.filter((c) => c.idioma === 'en' || !c.unidade),
            {
              id: 'site-do-cardapio',
              titulo: 'Site do cardápio',
              descricao: 'O mesmo cardápio do salão, no site próprio.',
              url: SITE_DO_CARDAPIO,
              grupo: 'site',
            },
          ]}
        />
      </section>
    </div>
  )
}

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
