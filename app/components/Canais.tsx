import type { Canal } from '~/data/atendimento'

/** Links para os canais externos do restaurante (WhatsApp, delivery). */
export function ListaDeCanais({ canais }: { canais: Canal[] }) {
  return (
    <ul className="grade-acoes">
      {canais.map((canal) => (
        <li key={canal.id}>
          <a className="acao acao-secundaria" href={canal.url} target="_blank" rel="noreferrer">
            <span className="acao-titulo">
              {canal.titulo}
              <span aria-hidden="true"> ↗</span>
            </span>
            <span className="acao-descricao">{canal.descricao}</span>
            <span className="sr-only"> (abre fora da central)</span>
          </a>
        </li>
      ))}
    </ul>
  )
}
