import { Link, createFileRoute } from '@tanstack/react-router'
import { BotaoOuvir } from '~/components/Acessibilidade'
import { ListaDeCanais } from '~/components/Canais'
import { canais, delivery } from '~/data/atendimento'

export const Route = createFileRoute('/delivery')({
  head: () => ({ meta: [{ title: 'Central de delivery · Cabana do Sol' }] }),
  component: Delivery,
})

function formatar(numero: string) {
  return numero.length === 9
    ? `${numero.slice(0, 5)}-${numero.slice(5)}`
    : `${numero.slice(0, 4)}-${numero.slice(4)}`
}

// Agrupado como se fala um telefone: "3 2 3 5, 2 5 8 6".
function falado(numero: string) {
  const f = formatar(numero)
  return f
    .split('-')
    .map((parte) => parte.split('').join(' '))
    .join(', ')
}

const pedidos = canais.filter((c) => c.id === 'delivery' || c.id === 'padaria')
const fixos = delivery.telefones.filter((t) => t.length === 8)
const celulares = delivery.telefones.filter((t) => t.length === 9)

const FRASE = [
  `Central de delivery do Cabana do Sol em São Luís, DDD ${delivery.ddd.split('').join(' ')}.`,
  `${delivery.telefones.length} telefones.`,
  ...delivery.telefones.map((t, i) => `Telefone ${i + 1}: ${falado(t)}.`),
  'Você também pode pedir pelo aplicativo de delivery.',
].join(' ')

function ListaDeTelefones({ titulo, numeros }: { titulo: string; numeros: string[] }) {
  return (
    <section aria-labelledby={`titulo-${titulo}`}>
      <h2 id={`titulo-${titulo}`}>{titulo}</h2>
      <ul className="grade-telefones">
        {numeros.map((numero) => (
          <li key={numero}>
            <a className="botao botao-principal telefone" href={`tel:+55${delivery.ddd}${numero}`}>
              <span aria-hidden="true">📞 </span>
              <span className="sr-only">Ligar para </span>({delivery.ddd}) {formatar(numero)}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Delivery() {
  return (
    <div className="tela">
      <section aria-labelledby="titulo-pagina">
        <p className="sobrancelha">São Luís · Peça de casa</p>
        <h1 id="titulo-pagina">Central de delivery</h1>
        <p className="intro">
          Ligue para qualquer um dos {delivery.telefones.length} números e faça o seu pedido. Toque no
          número para ligar.
        </p>
        <div className="acoes">
          <BotaoOuvir texto={FRASE} rotulo="Ouvir os telefones" />
          <Link to="/cardapio" className="botao botao-linha">
            Ver o cardápio
          </Link>
        </div>
      </section>
      <ListaDeTelefones titulo="Telefones fixos" numeros={fixos} />
      <ListaDeTelefones titulo="Celulares" numeros={celulares} />
      <section aria-labelledby="titulo-app">
        <h2 id="titulo-app">Pedir pela internet</h2>
        <ListaDeCanais canais={pedidos} />
      </section>
    </div>
  )
}
