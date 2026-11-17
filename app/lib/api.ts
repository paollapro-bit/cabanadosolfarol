import type { Chamado, NovoChamado, UnidadeId } from './chamados'

export class ErroDeApi extends Error {
  constructor(
    mensagem: string,
    public status: number,
  ) {
    super(mensagem)
  }
}

const SEM_CONEXAO =
  'Não foi possível falar com a central. Verifique a internet e tente de novo, ou chame alguém da equipe.'

async function pedir<T>(url: string, init?: RequestInit): Promise<T> {
  let resposta: Response
  try {
    resposta = await fetch(url, init)
  } catch {
    throw new ErroDeApi(SEM_CONEXAO, 0)
  }
  const corpo = await resposta.json().catch(() => null)
  if (!resposta.ok) {
    throw new ErroDeApi(corpo?.erro ?? SEM_CONEXAO, resposta.status)
  }
  return corpo as T
}

const JSON_HEADERS = { 'content-type': 'application/json' }

export function abrirChamado(dados: NovoChamado) {
  return pedir<{ chamado: Chamado; segredo?: string; repetido?: boolean }>(
    '/api/chamados',
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(dados) },
  )
}

export function consultarChamado(id: string) {
  return pedir<{ chamado: Chamado }>(
    `/api/chamados?id=${encodeURIComponent(id)}`,
  )
}

export function cancelarChamado(id: string, segredo: string) {
  return pedir<{ chamado: Chamado }>(
    `/api/chamados?id=${encodeURIComponent(id)}`,
    { method: 'DELETE', headers: { 'x-chamado-segredo': segredo } },
  )
}

export function listarChamadosDaEquipe(unidade: UnidadeId, pin: string) {
  return pedir<{ chamados: Chamado[] }>(
    `/api/equipe/chamados?unidade=${unidade}`,
    { headers: { 'x-equipe-pin': pin } },
  )
}

export function atualizarChamado(
  id: string,
  status: 'a_caminho' | 'concluido',
  pin: string,
) {
  return pedir<{ chamado: Chamado }>('/api/equipe/chamados', {
    method: 'PATCH',
    headers: { ...JSON_HEADERS, 'x-equipe-pin': pin },
    body: JSON.stringify({ id, status }),
  })
}
