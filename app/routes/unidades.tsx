import { Link, createFileRoute } from '@tanstack/react-router'
import { BotaoOuvir } from '~/components/Acessibilidade'
import { ListaDeCanais } from '~/components/Canais'
import { canaisDoGrupo, fraseDosCanais, unidades, type Unidade } from '~/data/atendimento'
import { formatarTelefone } from '~/lib/reservas'

export const Route = createFileRoute('/unidades')({
  head: () => ({ meta: [{ title: 'Unidades e contatos · Cabana do Sol' }] }),
  component: Unidades,
})

// Em grupos, como se fala um telefone: "9 8, 3 3 0 4, 4 2 3 5".
function telefoneFalado(digitos: string) {
  return formatarTelefone(digitos)
    .replace(/[()]/g, '')
    .split(/[\s-]+/)
    .map((parte) => parte.split('').join(' '))
    .join(', ')
}

function fraseDaUnidade(u: Unidade) {
  const partes = [`Unidade ${u.nome}.`]
  if (u.descricao) partes.push(u.descricao)
  if (u.endereco) partes.push(`Endereço: ${u.endereco}.`)
  if (u.horario) partes.push(`Horário: ${u.horario}.`)
  if (u.telefone) partes.push(`Telefone: ${telefoneFalado(u.telefone)}.`)
  if (u.outrosTelefones.length) {
    partes.push(`Outros telefones: ${u.outrosTelefones.map(telefoneFalado).join('; ')}.`)
  }
  return partes.join(' ')
}

const contato = [...canaisDoGrupo('reservas'), ...canaisDoGrupo('site')]

function Unidades() {
  return (
    <div className="tela">
      <section aria-labelledby="titulo-pagina">
        <p className="sobrancelha">São Luís</p>
        <h1 id="titulo-pagina">Unidades e contatos</h1>
        <p className="intro">O Cabana do Sol recebe você em {unidades.length} endereços em São Luís.</p>
      </section>
      <ul className="lista">
        {unidades.map((u) => (
          <li key={u.id}>
            <article className="cartao">
              <h2>{u.nome}</h2>
              {u.descricao && <p>{u.descricao}</p>}
              <dl className="lista">
                {u.endereco && (
                  <div>
                    <dt className="legenda">Endereço</dt>
                    <dd>{u.endereco}</dd>
                  </div>
                )}
                {u.horario && (
                  <div>
                    <dt className="legenda">Horário</dt>
                    <dd>{u.horario}</dd>
                  </div>
                )}
                {u.telefone && (
                  <div>
                    <dt className="legenda">Telefone</dt>
                    <dd>{formatarTelefone(u.telefone)}</dd>
                  </div>
                )}
                {u.outrosTelefones.length > 0 && (
                  <div>
                    <dt className="legenda">Outros telefones</dt>
                    <dd>
                      {u.outrosTelefones.map((t, i) => (
                        <span key={t}>
                          {i > 0 && ' · '}
                          <a href={`tel:+55${t}`}>{formatarTelefone(t)}</a>
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
              <div className="acoes">
                {u.telefone && (
                  <a className="botao botao-principal" href={`tel:+55${u.telefone}`}>
                    Ligar para a {u.nome}
                  </a>
                )}
                {u.mapa && (
                  <a className="botao botao-linha" href={u.mapa} target="_blank" rel="noreferrer">
                    Ver no mapa<span className="sr-only">: {u.nome} (abre fora da central)</span>
                  </a>
                )}
                <BotaoOuvir texto={fraseDaUnidade(u)} rotulo={`Ouvir ${u.nome}`} />
                <Link to="/" search={{ unidade: u.id }} className="botao botao-linha">
                  Estou na {u.nome}
                </Link>
              </div>
            </article>
          </li>
        ))}
      </ul>
      <section aria-labelledby="titulo-canais">
        <h2 id="titulo-canais">Reservas, eventos e site</h2>
        <ListaDeCanais canais={contato} />
        <div className="acoes">
          <BotaoOuvir texto={fraseDosCanais(contato)} rotulo="Ouvir os canais" />
        </div>
      </section>
    </div>
  )
}
