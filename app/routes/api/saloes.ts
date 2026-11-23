import { createFileRoute } from '@tanstack/react-router'
import { ehUnidade } from '~/lib/chamados'
import { ehData } from '~/lib/reservas'
import { erro, json } from '~/server/armazenamento'
import { lerOcupacao, listarSaloes } from '~/server/reservas'

// Lista pública dos salões de uma unidade, com a ocupação da data pedida.
export const Route = createFileRoute('/api/saloes')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
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
      },
    },
  },
})
