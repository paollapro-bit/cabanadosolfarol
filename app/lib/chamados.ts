// Regras dos chamados de atendimento, compartilhadas entre o navegador e as
// rotas de API do servidor. Tudo aqui é puro (sem rede, sem DOM) para ser testado direto.

export const UNIDADES = [
  { id: 'litoranea', nome: 'Litorânea' },
  { id: 'ponta-do-farol', nome: 'Ponta do Farol' },
] as const

export type UnidadeId = (typeof UNIDADES)[number]['id']

export const TIPOS = [
  {
    id: 'garcom',
    rotulo: 'Chamar garçom',
    descricao: 'Alguém da equipe vem até a sua mesa.',
    resumo: 'Chamar garçom',
  },
  {
    id: 'conta',
    rotulo: 'Pedir a conta',
    descricao: 'A equipe traz a conta até a sua mesa.',
    resumo: 'Pedido de conta',
  },
  {
    id: 'acessibilidade',
    rotulo: 'Ajuda com acessibilidade',
    descricao:
      'Apoio para ler o cardápio, se locomover ou qualquer outra necessidade.',
    resumo: 'Ajuda com acessibilidade',
  },
  {
    id: 'outro',
    rotulo: 'Outro pedido',
    descricao: 'Escreva em poucas palavras o que você precisa.',
    resumo: 'Outro pedido',
  },
] as const

export type TipoChamado = (typeof TIPOS)[number]['id']
export type StatusChamado = 'aguardando' | 'a_caminho' | 'concluido' | 'cancelado'

export interface Chamado {
  id: string
  unidade: UnidadeId
  mesa: number
  tipo: TipoChamado
  mensagem?: string
  status: StatusChamado
  criadoEm: number
  atualizadoEm: number
}

export const MESA_MAXIMA = 999
export const MENSAGEM_MAXIMA = 200
/** Chamado aberto sem resposta por mais que isso é descartado. */
export const VALIDADE_ABERTO_MS = 3 * 60 * 60 * 1000
/** Chamado encerrado fica visível por este tempo para o cliente ver o desfecho. */
export const VALIDADE_ENCERRADO_MS = 10 * 60 * 1000

export function nomeUnidade(id: UnidadeId): string {
  return UNIDADES.find((u) => u.id === id)?.nome ?? id
}

export function dadosTipo(id: TipoChamado) {
  return TIPOS.find((t) => t.id === id) ?? TIPOS[0]
}

export function ehUnidade(valor: unknown): valor is UnidadeId {
  return UNIDADES.some((u) => u.id === valor)
}

export function ehTipo(valor: unknown): valor is TipoChamado {
  return TIPOS.some((t) => t.id === valor)
}

/** Converte "12", " 12 " ou 12 em número de mesa válido; senão, null. */
export function lerMesa(valor: unknown): number | null {
  const texto = typeof valor === 'number' ? String(valor) : valor
  if (typeof texto !== 'string' || !/^\s*\d{1,3}\s*$/.test(texto)) return null
  const mesa = Number(texto)
  return mesa >= 1 && mesa <= MESA_MAXIMA ? mesa : null
}

/** Um chamado por mesa e por tipo: tocar duas vezes não duplica o pedido. */
export function idDoChamado(unidade: UnidadeId, mesa: number, tipo: TipoChamado) {
  return `${unidade}.${mesa}.${tipo}`
}

export function lerId(id: unknown) {
  if (typeof id !== 'string') return null
  const [unidade, mesaTexto, tipo, ...resto] = id.split('.')
  const mesa = lerMesa(mesaTexto)
  if (resto.length || !ehUnidade(unidade) || !ehTipo(tipo) || mesa === null) {
    return null
  }
  return { unidade, mesa, tipo }
}

export type NovoChamado = {
  unidade: UnidadeId
  mesa: number
  tipo: TipoChamado
  mensagem?: string
}

export type Validacao =
  | { ok: true; dados: NovoChamado }
  | { ok: false; erro: string }

export function validarNovoChamado(corpo: unknown): Validacao {
  if (typeof corpo !== 'object' || corpo === null) {
    return { ok: false, erro: 'Pedido inválido.' }
  }
  const { unidade, mesa, tipo, mensagem } = corpo as Record<string, unknown>
  if (!ehUnidade(unidade)) {
    return { ok: false, erro: 'Escolha a unidade: Litorânea ou Ponta do Farol.' }
  }
  const numeroMesa = lerMesa(mesa)
  if (numeroMesa === null) {
    return {
      ok: false,
      erro: `Informe o número da mesa, de 1 a ${MESA_MAXIMA}.`,
    }
  }
  if (!ehTipo(tipo)) {
    return { ok: false, erro: 'Escolha o tipo de atendimento.' }
  }
  let texto: string | undefined
  if (mensagem !== undefined && mensagem !== null) {
    if (typeof mensagem !== 'string') {
      return { ok: false, erro: 'A mensagem precisa ser um texto.' }
    }
    texto = mensagem.replace(/\s+/g, ' ').trim()
    if (texto.length > MENSAGEM_MAXIMA) {
      return {
        ok: false,
        erro: `A mensagem pode ter até ${MENSAGEM_MAXIMA} caracteres.`,
      }
    }
  }
  if (tipo === 'outro' && !texto) {
    return { ok: false, erro: 'Escreva o que você precisa.' }
  }
  return {
    ok: true,
    dados: { unidade, mesa: numeroMesa, tipo, mensagem: texto || undefined },
  }
}

export function estaAberto(chamado: Pick<Chamado, 'status'>) {
  return chamado.status === 'aguardando' || chamado.status === 'a_caminho'
}

export function estaVencido(chamado: Chamado, agora: number) {
  const idade = agora - chamado.atualizadoEm
  return estaAberto(chamado)
    ? agora - chamado.criadoEm > VALIDADE_ABERTO_MS
    : idade > VALIDADE_ENCERRADO_MS
}

/** A equipe só avança o chamado: aguardando → a caminho → concluído. */
export function podeMudarStatus(atual: StatusChamado, novo: unknown) {
  if (novo === 'a_caminho') return atual === 'aguardando'
  if (novo === 'concluido') return atual === 'aguardando' || atual === 'a_caminho'
  return false
}

export const ROTULO_STATUS: Record<StatusChamado, string> = {
  aguardando: 'Aguardando a equipe',
  a_caminho: 'Equipe a caminho',
  concluido: 'Atendido',
  cancelado: 'Cancelado',
}

/** "há 3 minutos", pensado para ser lido em voz alta. */
export function tempoDecorrido(desde: number, agora: number): string {
  const minutos = Math.floor(Math.max(0, agora - desde) / 60000)
  if (minutos < 1) return 'agora mesmo'
  if (minutos === 1) return 'há 1 minuto'
  if (minutos < 60) return `há ${minutos} minutos`
  const horas = Math.floor(minutos / 60)
  return horas === 1 ? 'há 1 hora' : `há ${horas} horas`
}

/** Frase completa que o cliente ouve sobre a situação do chamado. */
export function fraseParaCliente(chamado: Chamado): string {
  const assunto = `${dadosTipo(chamado.tipo).resumo}, mesa ${chamado.mesa}, unidade ${nomeUnidade(chamado.unidade)}.`
  switch (chamado.status) {
    case 'aguardando':
      return `${assunto} A equipe foi avisada. Aguarde na sua mesa.`
    case 'a_caminho':
      return `${assunto} Alguém da equipe está a caminho da sua mesa.`
    case 'concluido':
      return `${assunto} Atendimento concluído.`
    case 'cancelado':
      return `${assunto} Chamado cancelado.`
  }
}

/** Frase que a equipe ouve quando um chamado novo entra no painel. */
export function fraseParaEquipe(chamado: Chamado): string {
  const base = `Mesa ${chamado.mesa}, ${nomeUnidade(chamado.unidade)}: ${dadosTipo(chamado.tipo).resumo}.`
  return chamado.mensagem ? `${base} Mensagem: ${chamado.mensagem}` : base
}
