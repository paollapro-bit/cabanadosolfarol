// Regras dos salões e das reservas, compartilhadas entre o navegador e as
// funções Netlify. Tudo puro (sem rede, sem DOM) para ser testado direto.
import { ehUnidade, nomeUnidade, type UnidadeId } from './chamados'

export const PERIODOS = [
  { id: 'almoco', nome: 'Almoço' },
  { id: 'jantar', nome: 'Jantar' },
] as const
export type PeriodoId = (typeof PERIODOS)[number]['id']

export interface Foto {
  id: string
  /** Texto alternativo: o que a foto mostra, para quem não enxerga. */
  descricao: string
}

export interface Salao {
  id: string
  unidade: UnidadeId
  nome: string
  capacidade: number
  descricao: string
  fotos: Foto[]
  ativo: boolean
  criadoEm: number
}

export type StatusReserva = 'pendente' | 'confirmada' | 'recusada' | 'cancelada'

export interface Reserva {
  id: string
  salaoId: string
  salaoNome: string
  unidade: UnidadeId
  /** AAAA-MM-DD */
  data: string
  periodo: PeriodoId
  pessoas: number
  nome: string
  /** Somente dígitos, com DDD. */
  telefone: string
  observacao?: string
  status: StatusReserva
  criadoEm: number
  atualizadoEm: number
}

export const CAPACIDADE_MAXIMA = 2000
export const FOTOS_POR_SALAO = 8
export const FOTO_TAMANHO_MAXIMO = 4 * 1024 * 1024
export const FOTO_TIPOS = ['image/jpeg', 'image/png', 'image/webp']
export const ANTECEDENCIA_MAXIMA_DIAS = 365
/** Reservas de datas passadas ficam no painel por este tempo. */
export const DIAS_DE_HISTORICO = 30

export const ROTULO_RESERVA: Record<StatusReserva, string> = {
  pendente: 'Aguardando confirmação',
  confirmada: 'Confirmada',
  recusada: 'Não confirmada',
  cancelada: 'Cancelada',
}

export function ehPeriodo(valor: unknown): valor is PeriodoId {
  return PERIODOS.some((p) => p.id === valor)
}

export function nomePeriodo(id: PeriodoId) {
  return PERIODOS.find((p) => p.id === id)?.nome ?? id
}

function texto(valor: unknown): string | null {
  return typeof valor === 'string' ? valor.replace(/\s+/g, ' ').trim() : null
}

function inteiro(valor: unknown): number | null {
  const bruto = typeof valor === 'number' ? String(valor) : valor
  if (typeof bruto !== 'string' || !/^\s*\d{1,5}\s*$/.test(bruto)) return null
  return Number(bruto)
}

/** O restaurante fica no Maranhão: "hoje" é sempre o dia de lá. */
export function hojeNoMaranhao(agora = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza' }).format(agora)
}

export function ehData(valor: unknown): valor is string {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false
  const data = new Date(`${valor}T00:00:00Z`)
  return !Number.isNaN(data.getTime()) && data.toISOString().startsWith(valor)
}

export function somarDias(data: string, dias: number): string {
  const d = new Date(`${data}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

/** "sábado, 21 de novembro de 2026" — para a tela e para a voz. */
export function dataPorExtenso(data: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${data}T00:00:00Z`))
}

export function pessoasPorExtenso(n: number) {
  return n === 1 ? '1 pessoa' : `${n} pessoas`
}

export type Resultado<T> = { ok: true; dados: T } | { ok: false; erro: string; campo?: string }

export type DadosDoSalao = Pick<Salao, 'unidade' | 'nome' | 'capacidade' | 'descricao' | 'ativo'>

export function validarSalao(corpo: unknown): Resultado<DadosDoSalao> {
  if (typeof corpo !== 'object' || corpo === null) return { ok: false, erro: 'Dados inválidos.' }
  const c = corpo as Record<string, unknown>
  if (!ehUnidade(c.unidade)) return { ok: false, erro: 'Escolha a unidade do salão.', campo: 'unidade' }
  const nome = texto(c.nome)
  if (!nome || nome.length < 2 || nome.length > 60) {
    return { ok: false, erro: 'Informe o nome do salão, com 2 a 60 caracteres.', campo: 'nome' }
  }
  const capacidade = inteiro(c.capacidade)
  if (capacidade === null || capacidade < 1 || capacidade > CAPACIDADE_MAXIMA) {
    return { ok: false, erro: 'Informe quantas pessoas cabem no salão.', campo: 'capacidade' }
  }
  const descricao = texto(c.descricao) ?? ''
  if (descricao.length > 400) {
    return { ok: false, erro: 'A descrição pode ter até 400 caracteres.', campo: 'descricao' }
  }
  return {
    ok: true,
    dados: { unidade: c.unidade, nome, capacidade, descricao, ativo: c.ativo !== false },
  }
}

export function validarDescricaoDaFoto(valor: unknown): Resultado<string> {
  const descricao = texto(valor)
  if (!descricao || descricao.length < 5 || descricao.length > 200) {
    return {
      ok: false,
      erro: 'Descreva o que a foto mostra, com 5 a 200 caracteres. Quem não enxerga ouve essa descrição.',
    }
  }
  return { ok: true, dados: descricao }
}

export type NovaReserva = Pick<
  Reserva,
  'salaoId' | 'data' | 'periodo' | 'pessoas' | 'nome' | 'telefone' | 'observacao'
>

export function validarReserva(
  corpo: unknown,
  salao: Pick<Salao, 'capacidade' | 'nome'>,
  hoje: string,
): Resultado<NovaReserva> {
  if (typeof corpo !== 'object' || corpo === null) return { ok: false, erro: 'Pedido inválido.' }
  const c = corpo as Record<string, unknown>
  if (typeof c.salaoId !== 'string') return { ok: false, erro: 'Escolha o salão.' }
  if (!ehData(c.data)) return { ok: false, erro: 'Informe a data da reserva.', campo: 'data' }
  if (c.data < hoje) return { ok: false, erro: 'A data da reserva já passou.', campo: 'data' }
  if (c.data > somarDias(hoje, ANTECEDENCIA_MAXIMA_DIAS)) {
    return { ok: false, erro: 'Só é possível reservar com até um ano de antecedência.', campo: 'data' }
  }
  if (!ehPeriodo(c.periodo)) return { ok: false, erro: 'Escolha almoço ou jantar.', campo: 'periodo' }
  const pessoas = inteiro(c.pessoas)
  if (pessoas === null || pessoas < 1) {
    return { ok: false, erro: 'Informe quantas pessoas vão.', campo: 'pessoas' }
  }
  if (pessoas > salao.capacidade) {
    return {
      ok: false,
      erro: `O ${comSalao(salao.nome)} recebe até ${pessoasPorExtenso(salao.capacidade)}.`,
      campo: 'pessoas',
    }
  }
  const nome = texto(c.nome)
  if (!nome || nome.length < 2 || nome.length > 80) {
    return { ok: false, erro: 'Informe o seu nome.', campo: 'nome' }
  }
  const telefone = typeof c.telefone === 'string' ? c.telefone.replace(/\D/g, '') : ''
  if (telefone.length < 10 || telefone.length > 11) {
    return { ok: false, erro: 'Informe um telefone com DDD, com 10 ou 11 números.', campo: 'telefone' }
  }
  const observacao = texto(c.observacao ?? '') ?? ''
  if (observacao.length > 300) {
    return { ok: false, erro: 'A observação pode ter até 300 caracteres.', campo: 'observacao' }
  }
  return {
    ok: true,
    dados: {
      salaoId: c.salaoId,
      data: c.data,
      periodo: c.periodo,
      pessoas,
      nome,
      telefone,
      observacao: observacao || undefined,
    },
  }
}

/** Transições que a equipe pode fazer. */
export function podeMudarReserva(atual: StatusReserva, novo: unknown) {
  if (novo === 'confirmada' || novo === 'recusada') return atual === 'pendente'
  if (novo === 'cancelada') return atual === 'confirmada'
  return false
}

export function reservaEmAberto(reserva: Pick<Reserva, 'status'>) {
  return reserva.status === 'pendente' || reserva.status === 'confirmada'
}

export function formatarTelefone(digitos: string) {
  const [, ddd, inicio, fim] = digitos.match(/^(\d{2})(\d{4,5})(\d{4})$/) ?? []
  return ddd ? `(${ddd}) ${inicio}-${fim}` : digitos
}

/** "salão Varanda", mas sem repetir a palavra quando o nome já é "Salão Azul". */
export function comSalao(nome: string) {
  return /^sal[aã]o\b/i.test(nome) ? nome : `salão ${nome}`
}

export type Ocupacao = Partial<Record<PeriodoId, boolean>>

/** Tudo que o cliente ouve sobre um salão, fotos incluídas. */
export function fraseDoSalao(salao: Salao, ocupado?: boolean): string {
  const partes = [`${comSalao(salao.nome).replace(/^s/, 'S')}. Recebe até ${pessoasPorExtenso(salao.capacidade)}.`]
  if (salao.descricao) partes.push(salao.descricao.replace(/([^.!?])$/, '$1.'))
  if (salao.fotos.length) {
    partes.push(
      salao.fotos.length === 1 ? 'Uma foto:' : `${salao.fotos.length} fotos:`,
      salao.fotos.map((f, i) => `Foto ${i + 1}: ${f.descricao.replace(/[.!?]$/, '')}.`).join(' '),
    )
  }
  if (ocupado !== undefined) {
    partes.push(ocupado ? 'Já reservado nesta data e período.' : 'Disponível nesta data e período.')
  }
  return partes.join(' ')
}

export function fraseDaReserva(reserva: Reserva): string {
  const base = `Reserva do ${comSalao(reserva.salaoNome)}, unidade ${nomeUnidade(reserva.unidade)}, ${dataPorExtenso(reserva.data)}, no ${nomePeriodo(reserva.periodo).toLowerCase()}, para ${pessoasPorExtenso(reserva.pessoas)}.`
  switch (reserva.status) {
    case 'pendente':
      return `${base} Pedido enviado. A reserva só vale depois que a equipe confirmar.`
    case 'confirmada':
      return `${base} Reserva confirmada pela equipe.`
    case 'recusada':
      return `${base} A equipe não pôde confirmar esta reserva.`
    case 'cancelada':
      return `${base} Reserva cancelada.`
  }
}

export function fraseDaReservaParaEquipe(reserva: Reserva): string {
  return `${reserva.nome} pede o ${comSalao(reserva.salaoNome)}, ${dataPorExtenso(reserva.data)}, ${nomePeriodo(reserva.periodo).toLowerCase()}, ${pessoasPorExtenso(reserva.pessoas)}.`
}
