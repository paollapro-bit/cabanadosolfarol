import type { Canal } from '~/data/atendimento'

/** Links para os canais externos do restaurante (WhatsApp, delivery, cardápios, formulários). */
export function ListaDeCanais({ canais }: { canais: Canal[] }) {
  return (
    <ul className="grade-acoes">
      {canais.map((canal) => (
        <li key={canal.id}>
          <a
            className="acao acao-secundaria"
            href={canal.url}
            target="_blank"
            rel="noreferrer"
            hrefLang={canal.idioma}
          >
            <span className="acao-titulo" lang={canal.idioma}>
              {canal.titulo}
              <span aria-hidden="true"> ↗</span>
            </span>
            <span className="acao-descricao" lang={canal.idioma}>
              {canal.descricao}
            </span>
            <span className="sr-only"> (abre fora da central)</span>
          </a>
        </li>
      ))}
    </ul>
  )
}
