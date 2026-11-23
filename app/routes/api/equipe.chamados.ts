import { createFileRoute } from '@tanstack/react-router'
import { ehUnidade, lerId, podeMudarStatus } from '~/lib/chamados'
import { erro, json, recusaDaEquipe } from '~/server/armazenamento'
import { gravarRegistro, lerRegistro, listarRegistros, publico } from '~/server/chamados'

// Painel da equipe: listar chamados e avançar o status.
export const Route = createFileRoute('/api/equipe/chamados')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const recusa = await recusaDaEquipe(request)
        if (recusa) return recusa
        const unidade = new URL(request.url).searchParams.get('unidade')
        if (!ehUnidade(unidade)) return erro('Unidade inválida.', 400)
        const chamados = (await listarRegistros(`${unidade}.`)).map(publico).sort((a, b) => a.criadoEm - b.criadoEm)
        return json({ chamados })
      },

      PATCH: async ({ request }) => {
        const recusa = await recusaDaEquipe(request)
        if (recusa) return recusa
        const corpo = (await request.json().catch(() => null)) as { id?: unknown; status?: unknown } | null
        if (!corpo || !lerId(corpo.id)) return erro('Chamado não encontrado.', 404)
        const registro = await lerRegistro(corpo.id as string)
        if (!registro) return erro('Chamado não encontrado.', 404)
        if (!podeMudarStatus(registro.status, corpo.status)) {
          return erro('Este chamado já foi atualizado por outra pessoa.', 409)
        }
        registro.status = corpo.status as 'a_caminho' | 'concluido'
        registro.atualizadoEm = Date.now()
        await gravarRegistro(registro)
        return json({ chamado: publico(registro) })
      },
    },
  },
})
