import type { Chamado, NovoChamado, UnidadeId } from './chamados'
import type { CardapioCanva } from './cardapio'
import type { DadosDoSalao, NovaReserva, Ocupacao, Reserva, Salao, StatusReserva } from './reservas'

export class ErroDeApi extends Error {
  constructor(
    mensagem: string,
    public status: number,
    public campo?: string,
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
    throw new ErroDeApi(corpo?.erro ?? SEM_CONEXAO, resposta.status, corpo?.campo)
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

export type SalaoComOcupacao = Salao & { ocupacao?: Ocupacao }

export function listarSaloes(unidade: UnidadeId, data?: string) {
  return pedir<{ saloes: SalaoComOcupacao[] }>(
    `/api/saloes?unidade=${unidade}${data ? `&data=${data}` : ''}`,
  )
}

export const urlDaFoto = (id: string) => `/api/fotos/${id}`

export function pedirReserva(dados: NovaReserva) {
  return pedir<{ reserva: Reserva; segredo: string }>('/api/reservas', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(dados),
  })
}

export function consultarReserva(id: string, segredo: string) {
  return pedir<{ reserva: Reserva }>(`/api/reservas?id=${id}`, {
    headers: { 'x-reserva-segredo': segredo },
  })
}

export function cancelarReserva(id: string, segredo: string) {
  return pedir<{ reserva: Reserva }>(`/api/reservas?id=${id}`, {
    method: 'DELETE',
    headers: { 'x-reserva-segredo': segredo },
  })
}

export function listarReservasDaEquipe(unidade: UnidadeId, pin: string) {
  return pedir<{ reservas: Reserva[] }>(`/api/equipe/reservas?unidade=${unidade}`, {
    headers: { 'x-equipe-pin': pin },
  })
}

export function atualizarReserva(id: string, status: StatusReserva, pin: string) {
  return pedir<{ reserva: Reserva }>('/api/equipe/reservas', {
    method: 'PATCH',
    headers: { ...JSON_HEADERS, 'x-equipe-pin': pin },
    body: JSON.stringify({ id, status }),
  })
}

export function listarSaloesDaEquipe(unidade: UnidadeId, pin: string) {
  return pedir<{ saloes: Salao[] }>(`/api/equipe/saloes?unidade=${unidade}`, {
    headers: { 'x-equipe-pin': pin },
  })
}

export function salvarSalao(dados: DadosDoSalao & { id?: string }, pin: string) {
  return pedir<{ salao: Salao }>('/api/equipe/saloes', {
    method: dados.id ? 'PUT' : 'POST',
    headers: { ...JSON_HEADERS, 'x-equipe-pin': pin },
    body: JSON.stringify(dados),
  })
}

export function removerSalao(id: string, pin: string) {
  return pedir<{ ok: true }>(`/api/equipe/saloes?id=${id}`, {
    method: 'DELETE',
    headers: { 'x-equipe-pin': pin },
  })
}

// A foto vai em base64 dentro do JSON: funciona igual em qualquer ambiente.
export async function enviarFoto(salaoId: string, arquivo: Blob, descricao: string, pin: string) {
  const dados = await new Promise<string>((ok, falhou) => {
    const leitor = new FileReader()
    leitor.onload = () => ok(String(leitor.result).split(',')[1] ?? '')
    leitor.onerror = () => falhou(new ErroDeApi('Não foi possível ler a foto.', 0))
    leitor.readAsDataURL(arquivo)
  })
  return pedir<{ salao: Salao }>('/api/equipe/saloes', {
    method: 'POST',
    headers: { ...JSON_HEADERS, 'x-equipe-pin': pin },
    body: JSON.stringify({ foto: { salaoId, descricao, tipo: arquivo.type, dados } }),
  })
}

export function removerFoto(salaoId: string, fotoId: string, pin: string) {
  return pedir<{ salao: Salao }>(`/api/equipe/saloes?id=${salaoId}&foto=${fotoId}`, {
    method: 'DELETE',
    headers: { 'x-equipe-pin': pin },
  })
}

export function lerCardapio() {
  return pedir<{ cardapio: CardapioCanva | null }>('/api/cardapio')
}

export function salvarCardapio(link: string, pin: string) {
  return pedir<{ cardapio: CardapioCanva }>('/api/cardapio', {
    method: 'PUT',
    headers: { ...JSON_HEADERS, 'x-equipe-pin': pin },
    body: JSON.stringify({ link }),
  })
}

export function removerCardapio(pin: string) {
  return pedir<{ cardapio: null }>('/api/cardapio', {
    method: 'DELETE',
    headers: { 'x-equipe-pin': pin },
  })
}
