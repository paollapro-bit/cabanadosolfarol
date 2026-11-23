import { createFileRoute } from '@tanstack/react-router'
import { validarReclamacao } from '~/lib/reclamacoes'
import { erro, iguais, json } from '~/server/armazenamento'
import {
  gravarReclamacao,
  lerReclamacao,
  reclamacaoParaCliente,
  type RegistroDeReclamacao,
} from '~/server/reclamacoes'

// Reclamações do lado do cliente: enviar e acompanhar. Só quem tem o segredo
// devolvido no envio consegue ler a sua reclamação.
export const Route = createFileRoute('/api/reclamacoes')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const validacao = validarReclamacao(await request.json().catch(() => null))
        if (!validacao.ok) return json({ erro: validacao.erro, campo: validacao.campo }, 400)
        const agora = Date.now()
        const registro: RegistroDeReclamacao = {
          ...validacao.dados,
          id: crypto.randomUUID(),
          status: 'recebida',
          criadoEm: agora,
          atualizadoEm: agora,
          segredo: crypto.randomUUID(),
        }
        await gravarReclamacao(registro)
        return json({ reclamacao: reclamacaoParaCliente(registro), segredo: registro.segredo }, 201)
      },

      GET: async ({ request }) => {
        const registro = await lerReclamacao(new URL(request.url).searchParams.get('id') ?? '')
        const autorizado =
          registro && (await iguais(request.headers.get('x-reclamacao-segredo') ?? '', registro.segredo))
        return autorizado
          ? json({ reclamacao: reclamacaoParaCliente(registro) })
          : erro('Reclamação não encontrada.', 404)
      },
    },
  },
})
