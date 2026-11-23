import { createFileRoute } from '@tanstack/react-router'
import { estaAberto, idDoChamado, lerId, validarNovoChamado } from '~/lib/chamados'
import { erro, iguais, json } from '~/server/armazenamento'
import { gravarRegistro, lerRegistro, publico, type Registro } from '~/server/chamados'

async function registroDaUrl(request: Request) {
  const id = new URL(request.url).searchParams.get('id')
  return lerId(id) ? lerRegistro(id!) : null
}

// Chamados do lado do cliente: abrir, acompanhar e cancelar.
export const Route = createFileRoute('/api/chamados')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const validacao = validarNovoChamado(await request.json().catch(() => null))
        if (!validacao.ok) return erro(validacao.erro, 400)
        const { unidade, mesa, tipo, mensagem } = validacao.dados
        const id = idDoChamado(unidade, mesa, tipo)
        const existente = await lerRegistro(id)
        if (existente && estaAberto(existente)) {
          // Já há um chamado igual em aberto para esta mesa: não duplica.
          return json({ chamado: publico(existente), repetido: true })
        }
        const agora = Date.now()
        const registro: Registro = {
          id,
          unidade,
          mesa,
          tipo,
          mensagem,
          status: 'aguardando',
          criadoEm: agora,
          atualizadoEm: agora,
          segredo: crypto.randomUUID(),
        }
        await gravarRegistro(registro)
        return json({ chamado: publico(registro), segredo: registro.segredo }, 201)
      },

      GET: async ({ request }) => {
        const registro = await registroDaUrl(request)
        return registro ? json({ chamado: publico(registro) }) : erro('Chamado não encontrado.', 404)
      },

      DELETE: async ({ request }) => {
        const registro = await registroDaUrl(request)
        if (!registro) return erro('Chamado não encontrado.', 404)
        if (!(await iguais(request.headers.get('x-chamado-segredo') ?? '', registro.segredo))) {
          return erro('Este chamado só pode ser cancelado por quem o abriu.', 403)
        }
        if (estaAberto(registro)) {
          registro.status = 'cancelado'
          registro.atualizadoEm = Date.now()
          await gravarRegistro(registro)
        }
        return json({ chamado: publico(registro) })
      },
    },
  },
})
