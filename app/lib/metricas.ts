// Contagem de cliques e visitas, para o relatório da equipe. Só números: nada
// que identifique o cliente. O catálogo vem dos dados do app, então um botão
// novo em atendimento.ts já entra no relatório. Tudo puro, para ser testado.
import { canais, cardapios, delivery, unidades } from '~/data/atendimento'
import { somarDias } from './reservas'

export const CATEGORIAS = [
  { id: 'reservas', nome: 'Reservas' },
  { id: 'delivery', nome: 'Delivery' },
  { id: 'cardapio', nome: 'Cardápio' },
  { id: 'unidades', nome: 'Unidades' },
  { id: 'opiniao', nome: 'Sua opinião' },
  { id: 'redes', nome: 'Redes sociais e site' },
  { id: 'visitas', nome: 'Visitas às telas' },
] as const

export type CategoriaId = (typeof CATEGORIAS)[number]['id']

export interface Evento {
  categoria: CategoriaId
  rotulo: string
}

const formatarFone = (d: string) =>
  d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`

function montarCatalogo(): Map<string, Evento> {
  const c = new Map<string, Evento>()
  const add = (id: string, categoria: CategoriaId, rotulo: string) => c.set(id, { categoria, rotulo })

  for (const [tela, nome] of [
    ['inicio', 'Início'],
    ['reservas', 'Reservas'],
    ['delivery', 'Delivery'],
    ['cardapio', 'Cardápio'],
    ['unidades', 'Unidades'],
    ['reclamacoes', 'Reclamações'],
    ['duvidas', 'Dúvidas frequentes'],
  ]) {
    add(`visita.${tela}`, 'visitas', `Abriu a tela ${nome}`)
  }

  add('inicio.reservas', 'reservas', 'Início: botão Reservas')
  add('inicio.delivery', 'delivery', 'Início: botão Delivery')
  add('inicio.cardapio', 'cardapio', 'Início: botão Cardápio')
  add('inicio.unidades', 'unidades', 'Início: botão Unidades')

  const categoriaDoCanal: Record<string, CategoriaId> = {
    reservas: 'reservas',
    pedidos: 'delivery',
    opiniao: 'opiniao',
    site: 'redes',
  }
  for (const canal of canais) add(`canal.${canal.id}`, categoriaDoCanal[canal.grupo], canal.titulo)
  for (const cardapio of cardapios) {
    add(`canal.${cardapio.id}`, cardapio.id === 'cardapio-delivery' ? 'delivery' : 'cardapio', cardapio.titulo)
  }
  add('canal.site-do-cardapio', 'cardapio', 'Site do cardápio')

  for (const numero of delivery.telefones) {
    add(`delivery.ligar.${numero}`, 'delivery', `Ligou para ${formatarFone(delivery.ddd + numero)}`)
  }

  for (const u of unidades) {
    add(`unidade.${u.id}.ligar`, 'unidades', `${u.nome}: ligar`)
    add(`unidade.${u.id}.mapa`, 'unidades', `${u.nome}: ver no mapa`)
    add(`unidade.${u.id}.cardapio`, 'cardapio', `${u.nome}: botão do cardápio`)
    for (const t of u.outrosTelefones) add(`unidade.${u.id}.ligar.${t}`, 'unidades', `${u.nome}: ligou para ${formatarFone(t)}`)
  }

  add('reservas.abrir-formulario', 'reservas', 'Tocou em Reservar um salão')
  add('reservas.pedido-enviado', 'reservas', 'Pedido de reserva enviado')
  add('cardapio.ouvir-item', 'cardapio', 'Ouviu um prato')
  add('cardapio.ouvir-secao', 'cardapio', 'Ouviu uma seção inteira')
  add('cardapio.busca', 'cardapio', 'Procurou um prato ou bebida')
  add('opiniao.abrir-reclamacao', 'opiniao', 'Tocou em Fazer uma reclamação')
  add('opiniao.reclamacao-enviada', 'opiniao', 'Reclamação enviada')
  add('rodape.instagram', 'redes', 'Instagram (rodapé)')
  return c
}

export const EVENTOS = montarCatalogo()

export const ehEvento = (valor: unknown): valor is string => typeof valor === 'string' && EVENTOS.has(valor)

export interface LinhaDoRelatorio {
  evento: string
  rotulo: string
  total: number
}

export interface GrupoDoRelatorio {
  categoria: CategoriaId
  nome: string
  total: number
  linhas: LinhaDoRelatorio[]
}

/** Junta as contagens por categoria, mais clicado primeiro. Eventos sem clique ficam de fora. */
export function montarRelatorio(contagens: { evento: string; total: number }[]): GrupoDoRelatorio[] {
  const porCategoria = new Map<CategoriaId, LinhaDoRelatorio[]>()
  for (const { evento, total } of contagens) {
    const info = EVENTOS.get(evento)
    if (!info || total <= 0) continue
    const linhas = porCategoria.get(info.categoria) ?? []
    linhas.push({ evento, rotulo: info.rotulo, total })
    porCategoria.set(info.categoria, linhas)
  }
  return CATEGORIAS.map((c) => {
    const linhas = (porCategoria.get(c.id) ?? []).sort((a, b) => b.total - a.total || a.rotulo.localeCompare(b.rotulo))
    return { categoria: c.id, nome: c.nome, total: linhas.reduce((s, l) => s + l.total, 0), linhas }
  })
}

export type PeriodoId = '7-dias' | '30-dias' | 'esta-semana' | 'semana-passada' | 'este-mes' | 'mes-passado'

export const PERIODOS_DO_RELATORIO: { id: PeriodoId; nome: string }[] = [
  { id: 'esta-semana', nome: 'Esta semana' },
  { id: 'semana-passada', nome: 'Semana passada' },
  { id: 'este-mes', nome: 'Este mês' },
  { id: 'mes-passado', nome: 'Mês passado' },
  { id: '7-dias', nome: 'Últimos 7 dias' },
  { id: '30-dias', nome: 'Últimos 30 dias' },
]

/** Datas (AAAA-MM-DD, inclusive) de um período, a partir de hoje no Maranhão. Semana começa na segunda. */
export function intervaloDoPeriodo(periodo: PeriodoId, hoje: string): { de: string; ate: string } {
  const diaDaSemana = (new Date(`${hoje}T00:00:00Z`).getUTCDay() + 6) % 7 // segunda = 0
  const segunda = somarDias(hoje, -diaDaSemana)
  const [a, m] = hoje.split('-').map(Number)
  const primeiroDoMes = `${hoje.slice(0, 8)}01`
  const mesPassado = m === 1 ? `${a - 1}-12-01` : `${a}-${String(m - 1).padStart(2, '0')}-01`
  switch (periodo) {
    case '7-dias':
      return { de: somarDias(hoje, -6), ate: hoje }
    case '30-dias':
      return { de: somarDias(hoje, -29), ate: hoje }
    case 'esta-semana':
      return { de: segunda, ate: hoje }
    case 'semana-passada':
      return { de: somarDias(segunda, -7), ate: somarDias(segunda, -1) }
    case 'este-mes':
      return { de: primeiroDoMes, ate: hoje }
    case 'mes-passado':
      return { de: mesPassado, ate: somarDias(primeiroDoMes, -1) }
  }
}

/** Planilha (CSV com ponto e vírgula, como o Excel em português abre). */
export function relatorioEmCsv(grupos: GrupoDoRelatorio[], de: string, ate: string) {
  const linhas = [`Período;${de};${ate}`, 'Área;Botão ou tela;Cliques']
  for (const g of grupos) {
    for (const l of g.linhas) linhas.push(`${g.nome};"${l.rotulo.replace(/"/g, '""')}";${l.total}`)
  }
  return `﻿${linhas.join('\r\n')}\r\n`
}
