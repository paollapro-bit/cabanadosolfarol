// Contagens de cliques por dia, numa tabela própria do D1. A soma é feita pelo
// próprio banco (total = total + 1), então cliques simultâneos não se perdem.
import { ambiente } from './armazenamento'

let tabelaPronta: Promise<unknown> | null = null

function prepararTabela() {
  tabelaPronta ??= ambiente.DB.prepare(
    `CREATE TABLE IF NOT EXISTS contagens (
       dia TEXT NOT NULL,
       evento TEXT NOT NULL,
       total INTEGER NOT NULL DEFAULT 0,
       PRIMARY KEY (dia, evento)
     )`,
  ).run()
  return tabelaPronta
}

export async function contar(evento: string, dia: string) {
  await prepararTabela()
  await ambiente.DB.prepare(
    'INSERT INTO contagens (dia, evento, total) VALUES (?, ?, 1) ON CONFLICT (dia, evento) DO UPDATE SET total = total + 1',
  )
    .bind(dia, evento)
    .run()
}

export async function somarContagens(de: string, ate: string) {
  await prepararTabela()
  const { results } = await ambiente.DB.prepare(
    'SELECT evento, SUM(total) AS total FROM contagens WHERE dia >= ? AND dia <= ? GROUP BY evento',
  )
    .bind(de, ate)
    .all<{ evento: string; total: number }>()
  return results.map((r) => ({ evento: r.evento, total: Number(r.total) }))
}
