// Cardápio em texto, lido do arquivo de dados do site do cardápio
// (dados/cardapio.js). Tudo puro, para ser testado direto.
import type { UnidadeId } from './chamados'
import { falarPrecosNoTexto, lerPrecoEmCentavos, precoPorExtenso } from './speech'

export interface ItemDoCardapio {
  unidade: UnidadeId
  grupo: string
  secao: string
  codigo: string
  nome: string
  descricao: string
  precoCentavos: number | null
  pessoas: number | null
}

export interface CardapioEmTexto {
  /** AAAA-MM-DD, como vem do site do cardápio. */
  atualizadoEm: string | null
  itens: ItemDoCardapio[]
}

/** O site chama as unidades de "Ponta do Farol" e "Litorânea (VIP)". */
function unidadeDoSite(nome: string): UnidadeId | null {
  const n = nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  if (n.startsWith('litoranea')) return 'litoranea'
  if (n.startsWith('ponta do farol')) return 'ponta-do-farol'
  return null
}

const campo = (valor: unknown, maximo = 400) =>
  typeof valor === 'string' ? valor.replace(/\s+/g, ' ').trim().slice(0, maximo) : ''

/**
 * Lê o conteúdo de dados/cardapio.js ("window.CARDAPIO = [...]"). Lança erro
 * se o formato mudar, para a falha aparecer em vez de um cardápio vazio.
 */
export function lerArquivoDoCardapio(js: string): CardapioEmTexto {
  const lista = js.match(/window\.CARDAPIO\s*=\s*(\[[\s\S]*\])\s*;?\s*$/)
  if (!lista) throw new Error('Formato do arquivo do cardápio não reconhecido.')
  const brutos = JSON.parse(lista[1]) as unknown[]
  if (!Array.isArray(brutos)) throw new Error('O cardápio não é uma lista.')
  const data = js.match(/window\.CARDAPIO_ATUALIZADO\s*=\s*"(\d{4}-\d{2}-\d{2})"/)
  const itens: ItemDoCardapio[] = []
  for (const bruto of brutos) {
    if (typeof bruto !== 'object' || bruto === null) continue
    const b = bruto as Record<string, unknown>
    const unidade = unidadeDoSite(campo(b.unidade))
    const nome = campo(b.nome, 160)
    if (!unidade || !nome) continue
    const pessoas = Number(campo(b.pessoas))
    itens.push({
      unidade,
      grupo: campo(b.grupo, 80) || 'Outros',
      secao: campo(b.secao, 120) || campo(b.grupo, 80) || 'Outros',
      codigo: campo(b.codigo, 20),
      nome,
      descricao: campo(b.descricao),
      precoCentavos: lerPrecoEmCentavos(campo(b.preco, 20)),
      pessoas: Number.isInteger(pessoas) && pessoas > 0 ? pessoas : null,
    })
  }
  return { atualizadoEm: data ? data[1] : null, itens }
}

const PRECO = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const precoNaTela = (centavos: number) => PRECO.format(centavos / 100)

export function dataDoCardapio(aaaammdd: string) {
  const [a, m, d] = aaaammdd.split('-')
  return `${d}/${m}/${a}`
}

/** Sem acentos e em minúsculas, para a busca achar "cuxa" em "Cuxá". */
export function semAcento(texto: string) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function filtrarItens(itens: ItemDoCardapio[], unidade: UnidadeId, busca: string) {
  const termos = semAcento(busca).split(/\s+/).filter(Boolean)
  return itens.filter((i) => {
    if (i.unidade !== unidade) return false
    if (!termos.length) return true
    const texto = semAcento(`${i.nome} ${i.descricao} ${i.secao} ${i.grupo}`)
    return termos.every((t) => texto.includes(t))
  })
}

export interface Secao {
  nome: string
  itens: ItemDoCardapio[]
}
export interface Grupo {
  nome: string
  secoes: Secao[]
}

/** Agrupa mantendo a ordem do site: grupo → seção → itens. */
export function agrupar(itens: ItemDoCardapio[]): Grupo[] {
  const grupos: Grupo[] = []
  for (const item of itens) {
    let grupo = grupos.find((g) => g.nome === item.grupo)
    if (!grupo) grupos.push((grupo = { nome: item.grupo, secoes: [] }))
    let secao = grupo.secoes.find((s) => s.nome === item.secao)
    if (!secao) grupo.secoes.push((secao = { nome: item.secao, itens: [] }))
    secao.itens.push(item)
  }
  return grupos
}

/** Nome → descrição → serve quantos → preço, como a voz deve ler um prato. */
export function fraseDoItem(item: ItemDoCardapio, comSecao = true) {
  const partes = [comSecao ? `${item.secao}: ${item.nome}.` : `${item.nome}.`]
  if (item.descricao) partes.push(`${falarPrecosNoTexto(item.descricao)}.`)
  if (item.pessoas) partes.push(item.pessoas === 1 ? 'Serve 1 pessoa.' : `Serve ${item.pessoas} pessoas.`)
  if (item.precoCentavos !== null) partes.push(`${precoPorExtenso(item.precoCentavos)}.`)
  return partes.join(' ').replace(/\.\./g, '.')
}

export function fraseDaSecao(secao: Secao) {
  const n = secao.itens.length
  return [`${secao.nome}, ${n === 1 ? '1 item' : `${n} itens`}.`, ...secao.itens.map((i) => fraseDoItem(i, false))].join(
    ' ',
  )
}
