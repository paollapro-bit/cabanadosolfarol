import type { Config } from '@netlify/functions'
import { randomUUID } from 'node:crypto'
import { hojeNoMaranhao, reservaEmAberto, validarReserva } from '../../app/lib/reservas'
import { erro, iguais, json } from '../lib/armazenamento'
import {
  gravarReserva,
  lerOcupacao,
  lerReserva,
  lerSalao,
  liberarVaga,
  reservaPublica,
  type RegistroDeReserva,
} from '../lib/reservas'

// Reservas do lado do cliente: pedir, acompanhar e cancelar. A reserva tem
// nome e telefone, então só quem tem o segredo devolvido na criação a lê.
export default async (req: Request) => {
  if (req.method === 'POST') {
    const corpo = (await req.json().catch(() => null)) as { salaoId?: unknown } | null
    const salao = typeof corpo?.salaoId === 'string' ? await lerSalao(corpo.salaoId) : null
    if (!salao || !salao.ativo) return erro('Este salão não está disponível para reserva.', 404)
    const validacao = validarReserva(corpo, salao, hojeNoMaranhao())
    if (!validacao.ok) return json({ erro: validacao.erro, campo: validacao.campo }, 400)
    const dados = validacao.dados
    const ocupacao = await lerOcupacao(salao.id, dados.data)
    if (ocupacao[dados.periodo]) {
      return erro('Este salão já está reservado nesta data e período. Escolha outra data, período ou salão.', 409)
    }
    const agora = Date.now()
    const registro: RegistroDeReserva = {
      ...dados,
      id: randomUUID(),
      salaoNome: salao.nome,
      unidade: salao.unidade,
      status: 'pendente',
      criadoEm: agora,
      atualizadoEm: agora,
      segredo: randomUUID(),
    }
    await gravarReserva(registro)
    return json({ reserva: reservaPublica(registro), segredo: registro.segredo }, 201)
  }

  const id = new URL(req.url).searchParams.get('id') ?? ''
  const registro = await lerReserva(id)
  // Segredo errado e reserva inexistente respondem igual, para não revelar ids.
  if (!registro || !iguais(req.headers.get('x-reserva-segredo') ?? '', registro.segredo)) {
    return erro('Reserva não encontrada.', 404)
  }

  if (req.method === 'GET') return json({ reserva: reservaPublica(registro) })

  if (req.method === 'DELETE') {
    if (reservaEmAberto(registro)) {
      if (registro.status === 'confirmada') await liberarVaga(registro)
      registro.status = 'cancelada'
      registro.atualizadoEm = Date.now()
      await gravarReserva(registro)
    }
    return json({ reserva: reservaPublica(registro) })
  }

  return erro('Método não permitido.', 405)
}

export const config: Config = { path: '/api/reservas' }
