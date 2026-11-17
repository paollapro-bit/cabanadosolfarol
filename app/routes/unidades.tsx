import { Link, createFileRoute } from '@tanstack/react-router'
import { BotaoOuvir } from '~/components/Acessibilidade'
import { unidades, type Unidade } from '~/data/atendimento'

export const Route = createFileRoute('/unidades')({
  head: () => ({ meta: [{ title: 'Unidades e contatos · Cabana do Sol' }] }),
  component: Unidades,
})

function formatarTelefone(digitos: string) {
  const [, ddd, inicio, fim] = digitos.match(/^(\d{2})(\d{4,5})(\d{4})$/) ?? []
  return ddd ? `(${ddd}) ${inicio}-${fim}` : digitos
}

// Dígito por dígito, para a voz não ler o telefone como um número inteiro.
function telefoneFalado(digitos: string) {
  return digitos.split('').join(' ')
}

function fraseDaUnidade(u: Unidade) {
  const partes = [`Unidade ${u.nome}.`]
  if (u.endereco) partes.push(`Endereço: ${u.endereco}.`)
  if (u.horario) partes.push(`Horário: ${u.horario}.`)
  if (u.telefone) partes.push(`Telefone: ${telefoneFalado(u.telefone)}.`)
  if (u.whatsapp) partes.push('Também atende por WhatsApp.')
  if (partes.length === 1) {
    partes.push(
      'Endereço, horário e telefone ainda não foram cadastrados. Se você está no restaurante, use a tela Atendimento para chamar a equipe.',
    )
  }
  return partes.join(' ')
}

function Unidades() {
  return (
    <div className="tela">
      <section aria-labelledby="titulo-pagina">
        <p className="sobrancelha">Desde 1994</p>
        <h1 id="titulo-pagina">Unidades e contatos</h1>
        <p className="intro">O Cabana do Sol recebe você em {unidades.length} cidades do Maranhão.</p>
      </section>
      <ul className="lista">
        {unidades.map((u) => {
          const semDados = !u.endereco && !u.horario && !u.telefone && !u.whatsapp
          return (
            <li key={u.id}>
              <article className="cartao">
                <h2>{u.nome}</h2>
                {semDados ? (
                  <p className="vazio">
                    Endereço, horário e telefone desta unidade ainda não foram cadastrados.
                  </p>
                ) : (
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
                  </dl>
                )}
                <div className="acoes">
                  {u.telefone && (
                    <a className="botao botao-principal" href={`tel:+55${u.telefone}`}>
                      Ligar para {u.nome}
                    </a>
                  )}
                  {u.whatsapp && (
                    <a
                      className="botao botao-linha"
                      href={`https://wa.me/${u.whatsapp}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      WhatsApp de {u.nome}
                      <span className="sr-only"> (abre em outra aba)</span>
                    </a>
                  )}
                  <BotaoOuvir texto={fraseDaUnidade(u)} rotulo={`Ouvir ${u.nome}`} />
                  <Link to="/" search={{ unidade: u.id }} className="botao botao-linha">
                    Estou em {u.nome}
                  </Link>
                </div>
              </article>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
