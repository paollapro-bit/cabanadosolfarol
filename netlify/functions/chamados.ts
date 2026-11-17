import type { Config } from '@netlify/functions'
import { randomUUID } from 'node:crypto'
import {
  estaAberto,
  idDoChamado,
  lerId,
  validarNovoChamado,
} from '../../app/lib/chamados'
import {
  erro,
  gravarRegistro,
  iguais,
  json,
  lerRegistro,
  publico,
  type Registro,
} from '../lib/armazenamento'

// Chamados do lado do cliente: abrir, acompanhar e cancelar.
export default async (req: Request) => {
  const url = new URL(req.url)

  if (req.method === 'POST') {
    const corpo = await req.json().catch(() => null)
    const validacao = validarNovoChamado(corpo)
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
      segredo: randomUUID(),
    }
    await gravarRegistro(registro)
    return json({ chamado: publico(registro), segredo: registro.segredo }, 201)
  }

  const id = url.searchParams.get('id')
  if (!lerId(id)) return erro('Chamado não encontrado.', 404)
  const registro = await lerRegistro(id!)
  if (!registro) return erro('Chamado não encontrado.', 404)

  if (req.method === 'GET') return json({ chamado: publico(registro) })

  if (req.method === 'DELETE') {
    const segredo = req.headers.get('x-chamado-segredo') ?? ''
    if (!iguais(segredo, registro.segredo)) {
      return erro('Este chamado só pode ser cancelado por quem o abriu.', 403)
    }
    if (estaAberto(registro)) {
      registro.status = 'cancelado'
      registro.atualizadoEm = Date.now()
      await gravarRegistro(registro)
    }
    return json({ chamado: publico(registro) })
  }

  return erro('Método não permitido.', 405)
}

export const config: Config = { path: '/api/chamados' }
