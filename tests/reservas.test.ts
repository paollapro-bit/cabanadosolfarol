import { describe, expect, it } from 'vitest'
import {
  dataPorExtenso,
  ehData,
  fraseDaReserva,
  fraseDoSalao,
  hojeNoMaranhao,
  podeMudarReserva,
  somarDias,
  validarDescricaoDaFoto,
  validarReserva,
  validarSalao,
  type Reserva,
  type Salao,
} from '../app/lib/reservas'

const salao: Salao = {
  id: 's1',
  unidade: 'litoranea',
  nome: 'Varanda',
  capacidade: 40,
  descricao: 'Climatizado',
  fotos: [
    { id: 'f1', descricao: 'Mesas longas com toalhas brancas' },
    { id: 'f2', descricao: 'Vista para o mar.' },
  ],
  ativo: true,
  criadoEm: 1,
}
const hoje = '2026-11-17'
const pedido = {
  salaoId: 's1',
  data: '2026-11-21',
  periodo: 'jantar',
  pessoas: '30',
  nome: '  Maria   Silva ',
  telefone: '(98) 99999-1234',
  observacao: '',
}

describe('datas', () => {
  it('valida AAAA-MM-DD de verdade', () => {
    expect(ehData('2026-11-21')).toBe(true)
    for (const v of ['2026-02-30', '21/11/2026', '2026-1-1', '', null]) expect(ehData(v)).toBe(false)
  })
  it('soma dias atravessando meses', () => {
    expect(somarDias('2026-11-30', 1)).toBe('2026-12-01')
    expect(somarDias('2026-01-01', -1)).toBe('2025-12-31')
  })
  it('usa o dia do Maranhão, não o UTC', () => {
    expect(hojeNoMaranhao(new Date('2026-11-18T01:30:00Z'))).toBe('2026-11-17')
  })
  it('escreve a data por extenso', () => {
    expect(dataPorExtenso('2026-11-21')).toBe('sábado, 21 de novembro de 2026')
  })
})

describe('validarSalao', () => {
  it('aceita e normaliza', () => {
    expect(validarSalao({ unidade: 'ponta-do-farol', nome: ' Salão  Azul ', capacidade: '80' })).toEqual({
      ok: true,
      dados: { unidade: 'ponta-do-farol', nome: 'Salão Azul', capacidade: 80, descricao: '', ativo: true },
    })
  })
  it('recusa dados incompletos', () => {
    expect(validarSalao({ unidade: 'x', nome: 'A', capacidade: 1 })).toMatchObject({ campo: 'unidade' })
    expect(validarSalao({ unidade: 'litoranea', nome: 'A', capacidade: 1 })).toMatchObject({ campo: 'nome' })
    expect(validarSalao({ unidade: 'litoranea', nome: 'Azul', capacidade: 0 })).toMatchObject({ campo: 'capacidade' })
    expect(validarSalao({ unidade: 'litoranea', nome: 'Azul', capacidade: '' })).toMatchObject({ campo: 'capacidade' })
    expect(validarSalao({ unidade: 'litoranea', nome: 'Azul', capacidade: null })).toMatchObject({
      ok: true,
      dados: { capacidade: null },
    })
  })
  it('exige descrição da foto', () => {
    expect(validarDescricaoDaFoto('  ').ok).toBe(false)
    expect(validarDescricaoDaFoto('Salão com 10 mesas redondas')).toEqual({
      ok: true,
      dados: 'Salão com 10 mesas redondas',
    })
  })
})

describe('validarReserva', () => {
  it('aceita e normaliza nome e telefone', () => {
    expect(validarReserva(pedido, salao, hoje)).toEqual({
      ok: true,
      dados: {
        salaoId: 's1',
        data: '2026-11-21',
        periodo: 'jantar',
        pessoas: 30,
        nome: 'Maria Silva',
        telefone: '98999991234',
        observacao: undefined,
      },
    })
  })
  it('aponta o campo com problema', () => {
    const erro = (extra: object) => validarReserva({ ...pedido, ...extra }, salao, hoje)
    expect(erro({ data: '2026-11-16' })).toMatchObject({ campo: 'data' })
    expect(erro({ data: '2027-11-18' })).toMatchObject({ campo: 'data' })
    expect(erro({ periodo: 'madrugada' })).toMatchObject({ campo: 'periodo' })
    expect(erro({ pessoas: '0' })).toMatchObject({ campo: 'pessoas' })
    expect(erro({ pessoas: '41' })).toMatchObject({
      campo: 'pessoas',
      erro: 'O salão Varanda recebe até 40 pessoas.',
    })
    expect(erro({ nome: ' ' })).toMatchObject({ campo: 'nome' })
    expect(erro({ telefone: '9999-1234' })).toMatchObject({ campo: 'telefone' })
  })
  it('não limita o número de pessoas quando a capacidade ainda não foi informada', () => {
    expect(validarReserva({ ...pedido, pessoas: '200' }, { ...salao, capacidade: null }, hoje).ok).toBe(true)
    expect(fraseDoSalao({ ...salao, capacidade: null, fotos: [], descricao: '' })).toBe(
      'Salão Varanda. Capacidade a confirmar com a equipe.',
    )
  })
  it('aceita reserva para hoje e lotação exata', () => {
    expect(validarReserva({ ...pedido, data: hoje, pessoas: 40 }, salao, hoje).ok).toBe(true)
  })
})

describe('ciclo da reserva', () => {
  it('só permite as transições da equipe', () => {
    expect(podeMudarReserva('pendente', 'confirmada')).toBe(true)
    expect(podeMudarReserva('pendente', 'recusada')).toBe(true)
    expect(podeMudarReserva('confirmada', 'cancelada')).toBe(true)
    expect(podeMudarReserva('confirmada', 'confirmada')).toBe(false)
    expect(podeMudarReserva('recusada', 'confirmada')).toBe(false)
    expect(podeMudarReserva('pendente', 'cancelada')).toBe(false)
    expect(podeMudarReserva('cancelada', 'pendente')).toBe(false)
  })
})

describe('frases faladas', () => {
  it('descreve o salão com capacidade, fotos e disponibilidade', () => {
    expect(fraseDoSalao(salao, false)).toBe(
      'Salão Varanda. Recebe até 40 pessoas. Climatizado. 2 fotos: Foto 1: Mesas longas com toalhas brancas. Foto 2: Vista para o mar. Disponível nesta data e período.',
    )
    expect(fraseDoSalao({ ...salao, fotos: [], descricao: '' })).toBe('Salão Varanda. Recebe até 40 pessoas.')
  })
  it('não repete a palavra salão quando o nome já a traz', () => {
    expect(fraseDoSalao({ ...salao, nome: 'Salão Azul', fotos: [], descricao: '' })).toBe(
      'Salão Azul. Recebe até 40 pessoas.',
    )
  })
  it('deixa claro que a reserva pendente ainda não vale', () => {
    const reserva: Reserva = {
      id: 'r1',
      salaoId: 's1',
      salaoNome: 'Varanda',
      unidade: 'litoranea',
      data: '2026-11-21',
      periodo: 'jantar',
      pessoas: 30,
      nome: 'Maria',
      telefone: '98999991234',
      status: 'pendente',
      criadoEm: 1,
      atualizadoEm: 1,
    }
    expect(fraseDaReserva(reserva)).toBe(
      'Reserva do salão Varanda, unidade Litorânea, sábado, 21 de novembro de 2026, no jantar, para 30 pessoas. Pedido enviado. A reserva só vale depois que a equipe confirmar.',
    )
    expect(fraseDaReserva({ ...reserva, status: 'confirmada' })).toContain('confirmada pela equipe')
  })
})
