import { Link } from '@tanstack/react-router'
import { BotaoOuvir } from './Acessibilidade'
import { ListaDeCanais } from './Canais'
import { canaisDoGrupo } from '~/data/atendimento'
import { registrar } from '~/lib/registrar'

const INTRO =
  'Central do Cabana do Sol, unidades Litorânea e Ponta do Farol, em São Luís. Quatro botões: Reservas, para reservar um salão para o seu evento; Delivery, com telefones, WhatsApp e aplicativo; Cardápio, com pratos e preços que você pode ouvir; e Unidades, com endereços, horários e mapa. Mais abaixo, Sua opinião, para reclamações e avaliações.'

// Em ordem de prioridade. Um botão para cada lugar: sem repetir atalhos.
const ATALHOS = [
  { to: '/reservas', chave: 'reservas', icone: '📅', titulo: 'Reservas', descricao: 'Salões para o seu evento: veja quantas pessoas cabem e peça a sua data.' },
  { to: '/delivery', chave: 'delivery', icone: '🛵', titulo: 'Delivery', descricao: 'Peça em casa por telefone, WhatsApp ou aplicativo.' },
  { to: '/cardapio', chave: 'cardapio', icone: '📖', titulo: 'Cardápio', descricao: 'Pratos e bebidas de cada unidade, com preços. Dá para ouvir.' },
  { to: '/unidades', chave: 'unidades', icone: '📍', titulo: 'Unidades', descricao: 'Endereços, horários, telefones e mapa.' },
] as const

/** Tela inicial da edição sem mesa. */
export function Inicio() {
  return (
    <div className="tela">
      <section aria-labelledby="titulo-pagina">
        <p className="sobrancelha">Desde 1994 · São Luís</p>
        <h1 id="titulo-pagina">Central do Cabana do Sol</h1>
        <p className="intro">Litorânea e Ponta do Farol. Escolha o que você precisa.</p>
        <div className="acoes">
          <BotaoOuvir texto={INTRO} rotulo="Ouvir o que tem aqui" />
        </div>
      </section>

      <nav aria-label="O que você procura">
        <ul className="grade-acoes">
          {ATALHOS.map((a) => (
            <li key={a.to}>
              <Link to={a.to} className="acao acao-com-icone" onClick={() => registrar(`inicio.${a.chave}`)}>
                <span className="atalho-icone" aria-hidden="true">
                  {a.icone}
                </span>
                <span className="acao-titulo">{a.titulo}</span>
                <span className="acao-descricao">{a.descricao}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section aria-labelledby="titulo-opiniao">
        <h2 id="titulo-opiniao">Sua opinião</h2>
        <Link to="/reclamacoes" className="acao acao-secundaria" onClick={() => registrar('opiniao.abrir-reclamacao')}>
          <span className="acao-titulo">Fazer uma reclamação</span>
          <span className="acao-descricao">Algo não saiu como deveria? Conte para a gerência e acompanhe a resposta.</span>
        </Link>
        <ListaDeCanais canais={canaisDoGrupo('opiniao')} />
      </section>
    </div>
  )
}
