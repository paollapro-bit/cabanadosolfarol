import { createFileRoute } from '@tanstack/react-router'
import { ehUnidade } from '~/lib/chamados'
import { DIAS_APOS_RESOLVIDA, ehStatusReclamacao, validarNota } from '~/lib/reclamacoes'
import { erro, json, recusaDaEquipe } from '~/server/armazenamento'
import {
  apagarReclamacao,
  gravarReclamacao,
  lerReclamacao,
  listarReclamacoes,
  reclamacaoParaEquipe,
} from '~/server/reclamacoes'

const LIMITE_MS = DIAS_APOS_RESOLVIDA * 24 * 60 * 60 * 1000

// Painel da equipe: ler as reclamações, anotar o que foi feito e mudar o status.
export const Route = createFileRoute('/api/equipe/reclamacoes')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const recusa = await recusaDaEquipe(request)
        if (recusa) return recusa
        const unidade = new URL(request.url).searchParams.get('unidade')
        if (!ehUnidade(unidade)) return erro('Unidade inválida.', 400)
        const agora = Date.now()
        const todas = await listarReclamacoes()
        // Resolvidas há muito tempo são apagadas: guardam nome e contato de clientes.
        const antigas = todas.filter((r) => r.status === 'resolvida' && agora - r.atualizadoEm > LIMITE_MS)
        await Promise.all(antigas.map((r) => apagarReclamacao(r.id)))
        const reclamacoes = todas
          .filter((r) => r.unidade === unidade && !antigas.includes(r))
          .map(reclamacaoParaEquipe)
          .sort((a, b) => b.criadoEm - a.criadoEm)
        return json({ reclamacoes })
      },

      PATCH: async ({ request }) => {
        const recusa = await recusaDaEquipe(request)
        if (recusa) return recusa
        const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null
        const registro = typeof corpo?.id === 'string' ? await lerReclamacao(corpo.id) : null
        if (!registro) return erro('Reclamação não encontrada.', 404)
        if (corpo!.status !== undefined) {
          if (!ehStatusReclamacao(corpo!.status)) return erro('Situação inválida.', 400)
          registro.status = corpo!.status
        }
        if (corpo!.nota !== undefined) {
          const nota = validarNota(corpo!.nota)
          if (nota === null) return erro('A anotação pode ter até 500 caracteres.', 400)
          registro.nota = nota || undefined
        }
        registro.atualizadoEm = Date.now()
        await gravarReclamacao(registro)
        return json({ reclamacao: reclamacaoParaEquipe(registro) })
      },
    },
  },
})
