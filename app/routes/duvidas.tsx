import { Link, createFileRoute } from '@tanstack/react-router'
import { BotaoOuvir } from '~/components/Acessibilidade'
import { duvidas } from '~/data/atendimento'

export const Route = createFileRoute('/duvidas')({
  head: () => ({ meta: [{ title: 'Dúvidas frequentes · Cabana do Sol' }] }),
  component: Duvidas,
})

function Duvidas() {
  const tudo = duvidas
    .map((d, i) => `Pergunta ${i + 1}: ${d.pergunta} ${d.resposta}`)
    .join(' ')
  return (
    <div className="tela">
      <section aria-labelledby="titulo-pagina">
        <p className="sobrancelha">Ajuda</p>
        <h1 id="titulo-pagina">Dúvidas frequentes</h1>
        <p className="intro">
          {duvidas.length} perguntas sobre como usar a central. Para qualquer outro assunto, fale com a equipe.
        </p>
        <div className="acoes">
          <BotaoOuvir texto={tudo} rotulo="Ouvir todas" />
          <Link to="/" className="botao botao-principal">
            Chamar a equipe
          </Link>
        </div>
      </section>
      <ul className="lista">
        {duvidas.map((duvida) => (
          <li key={duvida.id}>
            <article className="cartao">
              <h2>{duvida.pergunta}</h2>
              <p>{duvida.resposta}</p>
              <div className="acoes">
                <BotaoOuvir
                  texto={`${duvida.pergunta} ${duvida.resposta}`}
                  rotulo="Ouvir resposta"
                />
              </div>
            </article>
          </li>
        ))}
      </ul>
    </div>
  )
}
