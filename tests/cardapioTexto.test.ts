import { describe, expect, it } from 'vitest'
import {
  agrupar,
  filtrarItens,
  fraseDaSecao,
  fraseDoItem,
  lerArquivoDoCardapio,
  precoNaTela,
} from '../app/lib/cardapioTexto'
import { falarPrecosNoTexto, lerPrecoEmCentavos, numeroPorExtenso, precoPorExtenso } from '../app/lib/speech'

describe('por extenso', () => {
  it('números', () => {
    expect(numeroPorExtenso(0)).toBe('zero')
    expect(numeroPorExtenso(16)).toBe('dezesseis')
    expect(numeroPorExtenso(71)).toBe('setenta e um')
    expect(numeroPorExtenso(100)).toBe('cem')
    expect(numeroPorExtenso(101)).toBe('cento e um')
    expect(numeroPorExtenso(1000)).toBe('mil')
    expect(numeroPorExtenso(1100)).toBe('mil e cem')
    expect(numeroPorExtenso(1050)).toBe('mil e cinquenta')
    expect(numeroPorExtenso(1250)).toBe('mil duzentos e cinquenta')
    expect(numeroPorExtenso(2000)).toBe('dois mil')
  })
  it('preços', () => {
    expect(precoPorExtenso(12750)).toBe('cento e vinte e sete reais e cinquenta centavos')
    expect(precoPorExtenso(100)).toBe('um real')
    expect(precoPorExtenso(50)).toBe('cinquenta centavos')
    expect(precoPorExtenso(7100)).toBe('setenta e um reais')
    expect(precoPorExtenso(101)).toBe('um real e um centavo')
  })
  it('lê o preço do site', () => {
    expect(lerPrecoEmCentavos('71,00')).toBe(7100)
    expect(lerPrecoEmCentavos('1.234,50')).toBe(123450)
    expect(lerPrecoEmCentavos('')).toBeNull()
    expect(lerPrecoEmCentavos('sob consulta')).toBeNull()
  })
  it('fala preços dentro de uma descrição', () => {
    expect(falarPrecosNoTexto('Leite Ninho R$ 151,00 · Nozes R$ 205,50')).toBe(
      'Leite Ninho cento e cinquenta e um reais; Nozes duzentos e cinco reais e cinquenta centavos',
    )
  })
})

const ARQUIVO = `// Gerado por gerar_dados.py
window.CARDAPIO_ATUALIZADO = "2026-11-23";
window.CARDAPIO = [
{"unidade": "Ponta do Farol", "grupo": "Pratos", "secao": "Mariscos", "codigo": "1", "nome": "Arroz de Cuxá", "descricao": "com camarão seco", "preco": "98,00", "pessoas": "2"},
{"unidade": "Litorânea (VIP)", "grupo": "Pratos", "secao": "Mariscos", "codigo": "2", "nome": "Arroz de Cuxá", "descricao": "", "preco": "1.010,00", "pessoas": ""},
{"unidade": "Imperatriz", "grupo": "Pratos", "secao": "Peixes", "codigo": "3", "nome": "Peixe", "descricao": "", "preco": "50,00", "pessoas": ""},
{"unidade": "Ponta do Farol", "grupo": "Sobremesas", "secao": "Tortas", "codigo": "", "nome": "Torta pequena", "descricao": "Nozes R$ 151,00", "preco": "", "pessoas": ""}
];`

describe('lerArquivoDoCardapio', () => {
  const lido = lerArquivoDoCardapio(ARQUIVO)
  it('lê data, unidades e preços, e ignora unidades fora do app', () => {
    expect(lido.atualizadoEm).toBe('2026-11-23')
    expect(lido.itens.map((i) => [i.unidade, i.precoCentavos, i.pessoas])).toEqual([
      ['ponta-do-farol', 9800, 2],
      ['litoranea', 101000, null],
      ['ponta-do-farol', null, null],
    ])
  })
  it('falha alto se o formato mudar', () => {
    expect(() => lerArquivoDoCardapio('export default []')).toThrow()
  })
  it('busca sem acento e agrupa na ordem do site', () => {
    expect(filtrarItens(lido.itens, 'ponta-do-farol', 'cuxa camarao').map((i) => i.codigo)).toEqual(['1'])
    expect(filtrarItens(lido.itens, 'ponta-do-farol', '').length).toBe(2)
    expect(agrupar(filtrarItens(lido.itens, 'ponta-do-farol', '')).map((g) => g.nome)).toEqual(['Pratos', 'Sobremesas'])
  })
  it('monta a frase falada', () => {
    expect(fraseDoItem(lido.itens[0])).toBe('Mariscos: Arroz de Cuxá. com camarão seco. Serve 2 pessoas. noventa e oito reais.')
    expect(fraseDaSecao({ nome: 'Tortas', itens: [lido.itens[2]] })).toBe(
      'Tortas, 1 item. Torta pequena. Nozes cento e cinquenta e um reais.',
    )
    expect(precoNaTela(9800)).toMatch(/R\$\s98,00/)
  })
})
