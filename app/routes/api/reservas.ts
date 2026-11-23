import { createFileRoute } from '@tanstack/react-router'
import { hojeNoMaranhao, reservaEmAberto, validarReserva } from '~/lib/reservas'
import { erro, iguais, json } from '~/server/armazenamento'
import {
  gravarReserva,
  lerOcupacao,
  lerReserva,
  lerSalao,
  liberarVaga,
  reservaPublica,
  type RegistroDeReserva,
} from '~/server/reservas'

// A reserva tem nome e telefone, então só quem tem o segredo devolvido na
// criação a lê. Segredo errado e reserva inexistente respondem igual.
async function reservaAutorizada(request: Request) {
  const id = new URL(request.url).searchParams.get('id') ?? ''
  const registro = await lerReserva(id)
  if (!registro) return null
  return (await iguais(request.headers.get('x-reserva-segredo') ?? '', registro.segredo)) ? registro : null
}

export const Route = createFileRoute('/api/reservas')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const corpo = (await request.json().catch(() => null)) as { salaoId?: unknown } | null
        const salao = typeof corpo?.salaoId === 'string' ? await lerSalao(corpo.salaoId) : null
        if (!salao || !salao.ativo) return erro('Este salão não está disponível para reserva.', 404)
        const validacao = validarReserva(corpo, salao, hojeNoMaranhao())
        if (!validacao.ok) return json({ erro: validacao.erro, campo: validacao.campo }, 400)
        const dados = validacao.dados
        if ((await lerOcupacao(salao.id, dados.data))[dados.periodo]) {
          return erro(
            'Este salão já está reservado nesta data e período. Escolha outra data, período ou salão.',
            409,
          )
        }
        const agora = Date.now()
        const registro: RegistroDeReserva = {
          ...dados,
          id: crypto.randomUUID(),
          salaoNome: salao.nome,
          unidade: salao.unidade,
          status: 'pendente',
          criadoEm: agora,
          atualizadoEm: agora,
          segredo: crypto.randomUUID(),
        }
        await gravarReserva(registro)
        return json({ reserva: reservaPublica(registro), segredo: registro.segredo }, 201)
      },

      GET: async ({ request }) => {
        const registro = await reservaAutorizada(request)
        return registro ? json({ reserva: reservaPublica(registro) }) : erro('Reserva não encontrada.', 404)
      },

      DELETE: async ({ request }) => {
        const registro = await reservaAutorizada(request)
        if (!registro) return erro('Reserva não encontrada.', 404)
        if (reservaEmAberto(registro)) {
          if (registro.status === 'confirmada') await liberarVaga(registro)
          registro.status = 'cancelada'
          registro.atualizadoEm = Date.now()
          await gravarReserva(registro)
        }
        return json({ reserva: reservaPublica(registro) })
      },
    },
  },
})
