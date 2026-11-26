import { createFileRoute } from '@tanstack/react-router'
import { ehData, somarDias } from '~/lib/reservas'
import { erro, json, recusaDaEquipe } from '~/server/armazenamento'
import { somarContagens } from '~/server/metricas'

// Relatório de cliques de um período (datas inclusive, no máximo um ano).
export const Route = createFileRoute('/api/equipe/relatorio')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const recusa = await recusaDaEquipe(request)
        if (recusa) return recusa
        const url = new URL(request.url)
        const de = url.searchParams.get('de')
        const ate = url.searchParams.get('ate')
        if (!ehData(de) || !ehData(ate) || de > ate) return erro('Escolha um período válido.', 400)
        if (somarDias(de, 366) < ate) return erro('O período pode ter no máximo um ano.', 400)
        return json({ de, ate, contagens: await somarContagens(de, ate) })
      },
    },
  },
})
