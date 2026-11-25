import { Link } from '@tanstack/react-router'
import { BotaoOuvir } from './Acessibilidade'
import { ListaDeCanais } from './Canais'
import { canaisDoGrupo } from '~/data/atendimento'

const INTRO =
  'Central do Cabana do Sol, unidades Litorânea e Ponta do Farol, em São Luís. Aqui você encontra o cardápio com preços, que pode ser ouvido; os telefones e o WhatsApp do delivery; a reserva de salões para eventos; os endereços e horários das unidades; e um espaço para reclamações.'

const ATALHOS = [
  { to: '/cardapio', titulo: 'Cardápio', descricao: 'Pratos e bebidas de cada unidade, com preços. Dá para ouvir.' },
  { to: '/delivery', titulo: 'Delivery', descricao: 'Telefones, WhatsApp e aplicativo para pedir em casa.' },
  { to: '/reservas', titulo: 'Reservar um salão', descricao: 'Veja os salões, quantas pessoas cabem e peça a sua data.' },
  { to: '/unidades', titulo: 'Unidades e contatos', descricao: 'Endereços, horários, telefones e mapa.' },
] as const

/** Tela inicial da edição sem mesa: um ponto de partida para tudo. */
export function Inicio() {
  return (
    <div className="tela">
      <section aria-labelledby="titulo-pagina">
        <p className="sobrancelha">Desde 1994 · São Luís</p>
        <h1 id="titulo-pagina">Central do Cabana do Sol</h1>
        <p className="intro">Cardápio, delivery, salões para eventos e contatos da Litorânea e da Ponta do Farol.</p>
        <div className="acoes">
          <BotaoOuvir texto={INTRO} rotulo="Ouvir o que tem aqui" />
        </div>
      </section>

      <nav aria-label="O que você procura">
        <ul className="grade-acoes">
          {ATALHOS.map((a) => (
            <li key={a.to}>
              <Link to={a.to} className="acao">
                <span className="acao-titulo">{a.titulo}</span>
                <span className="acao-descricao">{a.descricao}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section aria-labelledby="titulo-canais">
        <h2 id="titulo-canais">Fale com a gente</h2>
        <ListaDeCanais canais={[...canaisDoGrupo('reservas'), ...canaisDoGrupo('site')]} />
      </section>

      <section aria-labelledby="titulo-opiniao">
        <h2 id="titulo-opiniao">Sua opinião</h2>
        <Link to="/reclamacoes" className="acao acao-secundaria">
          <span className="acao-titulo">Fazer uma reclamação</span>
          <span className="acao-descricao">Algo não saiu como deveria? Conte para a gerência e acompanhe a resposta.</span>
        </Link>
        <ListaDeCanais canais={canaisDoGrupo('opiniao')} />
      </section>
    </div>
  )
}
