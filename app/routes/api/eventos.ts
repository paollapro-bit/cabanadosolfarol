import { createFileRoute } from '@tanstack/react-router'
import { ehEvento } from '~/lib/metricas'
import { hojeNoMaranhao } from '~/lib/reservas'
import { erro } from '~/server/armazenamento'
import { contar } from '~/server/metricas'

// Registra um clique ou visita. Só aceita os eventos do catálogo e não guarda
// nada sobre quem clicou: só "neste dia, este botão, mais um".
export const Route = createFileRoute('/api/eventos')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const corpo = (await request.json().catch(() => null)) as { evento?: unknown } | null
        if (!ehEvento(corpo?.evento)) return erro('Evento desconhecido.', 400)
        await contar(corpo!.evento as string, hojeNoMaranhao())
        return new Response(null, { status: 204 })
      },
    },
  },
})
