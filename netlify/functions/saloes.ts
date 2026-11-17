import type { Config } from '@netlify/functions'
import { ehUnidade } from '../../app/lib/chamados'
import { ehData } from '../../app/lib/reservas'
import { erro, json } from '../lib/armazenamento'
import { lerOcupacao, listarSaloes } from '../lib/reservas'

// Lista pública dos salões de uma unidade, com a ocupação da data pedida.
export default async (req: Request) => {
  if (req.method !== 'GET') return erro('Método não permitido.', 405)
  const url = new URL(req.url)
  const unidade = url.searchParams.get('unidade')
  const data = url.searchParams.get('data')
  if (!ehUnidade(unidade)) return erro('Unidade inválida.', 400)
  const ativos = (await listarSaloes(unidade)).filter((s) => s.ativo)
  const saloes = await Promise.all(
    ativos.map(async (salao) => ({
      ...salao,
      ocupacao: ehData(data) ? await lerOcupacao(salao.id, data) : undefined,
    })),
  )
  return json({ saloes })
}

export const config: Config = { path: '/api/saloes' }
