import type { Config } from '@netlify/functions'
import { lerLinkDoCanva, type CardapioCanva } from '../../app/lib/cardapio'
import { abrirStore, erro, json, recusaDaEquipe } from '../lib/armazenamento'

// GET é público (o cliente vê o cardápio); PUT e DELETE exigem o código da equipe.
const CHAVE = 'cardapio-canva'

export default async (req: Request) => {
  const store = abrirStore('config')

  if (req.method === 'GET') {
    const cardapio = (await store.get(CHAVE, { type: 'json' })) as CardapioCanva | null
    return json({ cardapio })
  }

  const recusa = recusaDaEquipe(req)
  if (recusa) return recusa

  if (req.method === 'PUT') {
    const corpo = (await req.json().catch(() => null)) as { link?: unknown } | null
    const leitura = lerLinkDoCanva(corpo?.link)
    if (!leitura.ok) return erro(leitura.erro, 400)
    const cardapio: CardapioCanva = { ...leitura.dados, atualizadoEm: Date.now() }
    await store.setJSON(CHAVE, cardapio)
    return json({ cardapio })
  }

  if (req.method === 'DELETE') {
    await store.delete(CHAVE)
    return json({ cardapio: null })
  }

  return erro('Método não permitido.', 405)
}

export const config: Config = { path: '/api/cardapio' }
