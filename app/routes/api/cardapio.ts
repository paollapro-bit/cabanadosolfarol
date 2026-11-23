import { createFileRoute } from '@tanstack/react-router'
import { lerLinkDoCanva, type CardapioCanva } from '~/lib/cardapio'
import { colecao, erro, json, recusaDaEquipe } from '~/server/armazenamento'

// GET é público (o cliente vê o cardápio); PUT e DELETE exigem o código da equipe.
const CHAVE = 'cardapio-canva'
const config = () => colecao('config')

export const Route = createFileRoute('/api/cardapio')({
  server: {
    handlers: {
      GET: async () => json({ cardapio: await config().get<CardapioCanva>(CHAVE) }),

      PUT: async ({ request }) => {
        const recusa = await recusaDaEquipe(request)
        if (recusa) return recusa
        const corpo = (await request.json().catch(() => null)) as { link?: unknown } | null
        const leitura = lerLinkDoCanva(corpo?.link)
        if (!leitura.ok) return erro(leitura.erro, 400)
        const cardapio: CardapioCanva = { ...leitura.dados, atualizadoEm: Date.now() }
        await config().set(CHAVE, cardapio)
        return json({ cardapio })
      },

      DELETE: async ({ request }) => {
        const recusa = await recusaDaEquipe(request)
        if (recusa) return recusa
        await config().delete(CHAVE)
        return json({ cardapio: null })
      },
    },
  },
})
