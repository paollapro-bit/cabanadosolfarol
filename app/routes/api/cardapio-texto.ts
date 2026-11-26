import { createFileRoute } from '@tanstack/react-router'
import { CARDAPIOS_EM_TEXTO } from '~/data/atendimento'
import { lerArquivoDoCardapio } from '~/lib/cardapioTexto'
import { erro } from '~/server/armazenamento'

// Busca o cardápio no site do cardápio e devolve em JSON. A Cloudflare guarda
// a resposta do site por 5 minutos: uma atualização lá aparece aqui em até
// ~5 minutos, sem deploy.
export const Route = createFileRoute('/api/cardapio-texto')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const id = new URL(request.url).searchParams.get('fonte')
        const escolhido = CARDAPIOS_EM_TEXTO.find((c) => c.id === id) ?? CARDAPIOS_EM_TEXTO[0]
        let resposta: Response
        try {
          resposta = await fetch(escolhido.fonte, {
            cf: { cacheTtl: 300, cacheEverything: true },
          } as RequestInit)
        } catch {
          return erro('O site do cardápio não respondeu. Tente de novo em instantes.', 502)
        }
        if (!resposta.ok) return erro('O site do cardápio não respondeu. Tente de novo em instantes.', 502)
        try {
          const cardapio = lerArquivoDoCardapio(await resposta.text())
          return Response.json(cardapio, { headers: { 'cache-control': 'public, max-age=120' } })
        } catch {
          return erro('O arquivo do cardápio mudou de formato e não pôde ser lido.', 502)
        }
      },
    },
  },
})
