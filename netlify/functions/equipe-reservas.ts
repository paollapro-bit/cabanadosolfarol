import type { Config } from '@netlify/functions'
import { ehUnidade } from '../../app/lib/chamados'
import {
  DIAS_DE_HISTORICO,
  hojeNoMaranhao,
  podeMudarReserva,
  somarDias,
  type StatusReserva,
} from '../../app/lib/reservas'
import { erro, json, recusaDaEquipe } from '../lib/armazenamento'
import {
  apagarReserva,
  gravarReserva,
  lerReserva,
  liberarVaga,
  listarReservas,
  ocuparVaga,
  reservaPublica,
} from '../lib/reservas'

// Painel da equipe: ver os pedidos de reserva e confirmar, recusar ou cancelar.
export default async (req: Request) => {
  const recusa = recusaDaEquipe(req)
  if (recusa) return recusa

  if (req.method === 'GET') {
    const unidade = new URL(req.url).searchParams.get('unidade')
    if (!ehUnidade(unidade)) return erro('Unidade inválida.', 400)
    const hoje = hojeNoMaranhao()
    const limite = somarDias(hoje, -DIAS_DE_HISTORICO)
    const todas = await listarReservas()
    // Reservas de datas antigas saem do armazenamento: não guardamos nome e
    // telefone de clientes além do necessário.
    await Promise.all(
      todas.filter((r) => r.data < limite).map(async (r) => {
        if (r.status === 'confirmada') await liberarVaga(r)
        await apagarReserva(r.id)
      }),
    )
    const reservas = todas
      .filter((r) => r.unidade === unidade && r.data >= hoje)
      .map(reservaPublica)
      .sort((a, b) => a.data.localeCompare(b.data) || a.periodo.localeCompare(b.periodo) || a.criadoEm - b.criadoEm)
    return json({ reservas })
  }

  if (req.method === 'PATCH') {
    const corpo = (await req.json().catch(() => null)) as { id?: unknown; status?: unknown } | null
    const registro = typeof corpo?.id === 'string' ? await lerReserva(corpo.id) : null
    if (!registro) return erro('Reserva não encontrada.', 404)
    if (!podeMudarReserva(registro.status, corpo!.status)) {
      return erro('Esta reserva já foi atualizada. Confira a lista.', 409)
    }
    const novo = corpo!.status as StatusReserva
    if (novo === 'confirmada' && !(await ocuparVaga(registro))) {
      return erro('Já existe uma reserva confirmada para este salão nesta data e período.', 409)
    }
    if (novo === 'cancelada') await liberarVaga(registro)
    registro.status = novo
    registro.atualizadoEm = Date.now()
    await gravarReserva(registro)
    return json({ reserva: reservaPublica(registro) })
  }

  return erro('Método não permitido.', 405)
}

export const config: Config = { path: '/api/equipe/reservas' }
