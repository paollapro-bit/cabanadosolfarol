// Regras das reclamações dos clientes, compartilhadas entre o navegador e as
// rotas de API. Tudo puro, para ser testado direto.
import { ehUnidade, nomeUnidade, type UnidadeId } from './chamados'

export const ASSUNTOS = [
  { id: 'atendimento', nome: 'Atendimento' },
  { id: 'comida', nome: 'Comida ou bebida' },
  { id: 'demora', nome: 'Demora' },
  { id: 'conta', nome: 'Conta ou preço' },
  { id: 'limpeza', nome: 'Limpeza' },
  { id: 'acessibilidade', nome: 'Acessibilidade' },
  { id: 'estacionamento', nome: 'Estacionamento' },
  { id: 'delivery', nome: 'Delivery' },
  { id: 'outro', nome: 'Outro assunto' },
] as const

export type AssuntoId = (typeof ASSUNTOS)[number]['id']
export type StatusReclamacao = 'recebida' | 'em_analise' | 'resolvida'

export interface Reclamacao {
  id: string
  unidade: UnidadeId
  assunto: AssuntoId
  mensagem: string
  nome?: string
  /** Telefone (só dígitos, com DDD) ou e-mail. Só existe se o cliente quis resposta. */
  contato?: string
  status: StatusReclamacao
  /** Anotação da equipe sobre o que foi feito. O cliente não vê. */
  nota?: string
  criadoEm: number
  atualizadoEm: number
}

export const MENSAGEM_MINIMA = 10
export const MENSAGEM_MAXIMA_RECLAMACAO = 1000
export const NOTA_MAXIMA = 500
/** Reclamações resolvidas são apagadas depois disso (guardam nome e contato). */
export const DIAS_APOS_RESOLVIDA = 90

export const ROTULO_RECLAMACAO: Record<StatusReclamacao, string> = {
  recebida: 'Recebida',
  em_analise: 'Em análise',
  resolvida: 'Resolvida',
}

export function ehAssunto(valor: unknown): valor is AssuntoId {
  return ASSUNTOS.some((a) => a.id === valor)
}

export function nomeAssunto(id: AssuntoId) {
  return ASSUNTOS.find((a) => a.id === id)?.nome ?? id
}

const texto = (valor: unknown) => (typeof valor === 'string' ? valor.replace(/\s+/g, ' ').trim() : '')

/** Aceita telefone com DDD (10 ou 11 dígitos) ou e-mail. Devolve normalizado, ou null. */
export function lerContato(valor: unknown): string | null {
  const bruto = typeof valor === 'string' ? valor.trim() : ''
  if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(bruto) && bruto.length <= 120) return bruto.toLowerCase()
  const digitos = bruto.replace(/\D/g, '')
  if (/^[\d\s()+-]+$/.test(bruto) && (digitos.length === 10 || digitos.length === 11)) return digitos
  return null
}

export const ehEmail = (contato: string) => contato.includes('@')

export type NovaReclamacao = Pick<Reclamacao, 'unidade' | 'assunto' | 'mensagem' | 'nome' | 'contato'>

export type ResultadoReclamacao = { ok: true; dados: NovaReclamacao } | { ok: false; erro: string; campo?: string }

export function validarReclamacao(corpo: unknown): ResultadoReclamacao {
  if (typeof corpo !== 'object' || corpo === null) return { ok: false, erro: 'Dados inválidos.' }
  const c = corpo as Record<string, unknown>
  if (!ehUnidade(c.unidade)) return { ok: false, erro: 'Escolha a unidade.', campo: 'unidade' }
  if (!ehAssunto(c.assunto)) return { ok: false, erro: 'Escolha o assunto.', campo: 'assunto' }
  const mensagem = texto(c.mensagem)
  if (mensagem.length < MENSAGEM_MINIMA) {
    return { ok: false, erro: 'Conte o que aconteceu, com pelo menos 10 caracteres.', campo: 'mensagem' }
  }
  if (mensagem.length > MENSAGEM_MAXIMA_RECLAMACAO) {
    return { ok: false, erro: `A mensagem pode ter até ${MENSAGEM_MAXIMA_RECLAMACAO} caracteres.`, campo: 'mensagem' }
  }
  const nome = texto(c.nome)
  if (nome.length > 80) return { ok: false, erro: 'O nome pode ter até 80 caracteres.', campo: 'nome' }
  let contato: string | undefined
  if (c.querResposta === true) {
    const lido = lerContato(c.contato)
    if (!lido) {
      return {
        ok: false,
        erro: 'Para receber resposta, informe um telefone com DDD ou um e-mail.',
        campo: 'contato',
      }
    }
    contato = lido
  }
  return {
    ok: true,
    dados: { unidade: c.unidade, assunto: c.assunto, mensagem, nome: nome || undefined, contato },
  }
}

/** A equipe pode mover para qualquer status, inclusive reabrir. */
export function ehStatusReclamacao(valor: unknown): valor is StatusReclamacao {
  return valor === 'recebida' || valor === 'em_analise' || valor === 'resolvida'
}

export function validarNota(valor: unknown): string | null {
  if (valor === undefined) return null
  const nota = texto(valor)
  return nota.length <= NOTA_MAXIMA ? nota : null
}

/** Protocolo curto, para o cliente citar se precisar falar com a equipe. */
export function protocolo(id: string) {
  return id.replace(/-/g, '').slice(0, 6).toUpperCase()
}

/** "A 3 F", letra por letra, para a voz não tentar ler como palavra. */
export function protocoloFalado(id: string) {
  return protocolo(id).split('').join(' ')
}

export function fraseDaReclamacao(r: Reclamacao) {
  const base = `Reclamação sobre ${nomeAssunto(r.assunto).toLowerCase()}, unidade ${nomeUnidade(r.unidade)}. Protocolo ${protocoloFalado(r.id)}.`
  switch (r.status) {
    case 'recebida':
      return `${base} Recebida. A gerência vai ler a sua mensagem.${r.contato ? ' Entraremos em contato.' : ''}`
    case 'em_analise':
      return `${base} Em análise pela equipe.`
    case 'resolvida':
      return `${base} Marcada como resolvida pela equipe. Obrigado por nos contar.`
  }
}

export function fraseDaReclamacaoParaEquipe(r: Reclamacao) {
  return `Nova reclamação, ${nomeAssunto(r.assunto).toLowerCase()}, unidade ${nomeUnidade(r.unidade)}.`
}
