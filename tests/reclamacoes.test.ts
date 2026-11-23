import { describe, expect, it } from 'vitest'
import {
  fraseDaReclamacao,
  lerContato,
  protocolo,
  validarNota,
  validarReclamacao,
  type Reclamacao,
} from '../app/lib/reclamacoes'

const base = { unidade: 'litoranea', assunto: 'demora', mensagem: '  Esperamos   40 minutos pelo prato. ' }

describe('lerContato', () => {
  it('aceita telefone com DDD e e-mail', () => {
    expect(lerContato('(98) 99999-1234')).toBe('98999991234')
    expect(lerContato('98 3227-7761')).toBe('9832277761')
    expect(lerContato(' Maria@Exemplo.com ')).toBe('maria@exemplo.com')
  })
  it('recusa o resto', () => {
    for (const v of ['9999-1234', 'maria@', 'abc', '', null, '98a99991234']) expect(lerContato(v)).toBeNull()
  })
})

describe('validarReclamacao', () => {
  it('aceita reclamação anônima, sem pedir resposta', () => {
    expect(validarReclamacao(base)).toEqual({
      ok: true,
      dados: {
        unidade: 'litoranea',
        assunto: 'demora',
        mensagem: 'Esperamos 40 minutos pelo prato.',
        nome: undefined,
        contato: undefined,
      },
    })
  })
  it('só guarda contato quando o cliente quer resposta', () => {
    expect(validarReclamacao({ ...base, contato: '98999991234' })).toMatchObject({ dados: { contato: undefined } })
    expect(validarReclamacao({ ...base, querResposta: true, contato: '98999991234', nome: 'Ana' })).toMatchObject({
      dados: { contato: '98999991234', nome: 'Ana' },
    })
    expect(validarReclamacao({ ...base, querResposta: true, contato: '' })).toMatchObject({ campo: 'contato' })
  })
  it('aponta o campo com problema', () => {
    expect(validarReclamacao({ ...base, unidade: 'x' })).toMatchObject({ campo: 'unidade' })
    expect(validarReclamacao({ ...base, assunto: 'x' })).toMatchObject({ campo: 'assunto' })
    expect(validarReclamacao({ ...base, mensagem: 'ruim' })).toMatchObject({ campo: 'mensagem' })
    expect(validarReclamacao({ ...base, mensagem: 'x'.repeat(1001) })).toMatchObject({ campo: 'mensagem' })
  })
})

describe('nota da equipe', () => {
  it('aceita até 500 caracteres', () => {
    expect(validarNota('  Liguei   e pedi desculpas ')).toBe('Liguei e pedi desculpas')
    expect(validarNota('x'.repeat(501))).toBeNull()
  })
})

describe('protocolo e frase', () => {
  const r: Reclamacao = {
    id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    unidade: 'ponta-do-farol',
    assunto: 'atendimento',
    mensagem: 'x',
    status: 'recebida',
    criadoEm: 1,
    atualizadoEm: 1,
  }
  it('usa 6 caracteres do id', () => expect(protocolo(r.id)).toBe('3FA85F'))
  it('fala o protocolo letra por letra', () => {
    expect(fraseDaReclamacao(r)).toBe(
      'Reclamação sobre atendimento, unidade Ponta do Farol. Protocolo 3 F A 8 5 F. Recebida. A gerência vai ler a sua mensagem.',
    )
    expect(fraseDaReclamacao({ ...r, contato: '98999991234' })).toContain('Entraremos em contato.')
  })
})
