import type { Config } from '@netlify/functions'
import { ehUnidade, lerId, podeMudarStatus } from '../../app/lib/chamados'
import {
  erro,
  gravarRegistro,
  iguais,
  json,
  lerRegistro,
  listarRegistros,
  publico,
} from '../lib/armazenamento'

// Painel da equipe: listar chamados e avançar o status. Protegido pelo código
// EQUIPE_PIN (variável de ambiente do site) até o login do Marco 4 existir.
export default async (req: Request) => {
  const pin = process.env.EQUIPE_PIN
  if (!pin) {
    return erro(
      'O painel ainda não foi configurado. Defina a variável EQUIPE_PIN no Netlify.',
      503,
    )
  }
  if (!iguais(req.headers.get('x-equipe-pin') ?? '', pin)) {
    return erro('Código da equipe incorreto.', 401)
  }

  if (req.method === 'GET') {
    const unidade = new URL(req.url).searchParams.get('unidade')
    if (!ehUnidade(unidade)) return erro('Unidade inválida.', 400)
    const registros = await listarRegistros(`${unidade}.`)
    const chamados = registros
      .map(publico)
      .sort((a, b) => a.criadoEm - b.criadoEm)
    return json({ chamados })
  }

  if (req.method === 'PATCH') {
    const corpo = (await req.json().catch(() => null)) as {
      id?: unknown
      status?: unknown
    } | null
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
  }

  return erro('Método não permitido.', 405)
}

export const config: Config = { path: '/api/equipe/chamados' }
