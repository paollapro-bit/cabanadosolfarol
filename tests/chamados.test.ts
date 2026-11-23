import { describe, expect, it } from 'vitest'
import {
  estaVencido,
  fraseParaCliente,
  fraseParaEquipe,
  idDoChamado,
  lerId,
  lerMesa,
  podeMudarStatus,
  tempoDecorrido,
  validarNovoChamado,
  VALIDADE_ABERTO_MS,
  VALIDADE_ENCERRADO_MS,
  type Chamado,
} from '../app/lib/chamados'

const base: Chamado = {
  id: 'litoranea.12.garcom',
  unidade: 'litoranea',
  mesa: 12,
  tipo: 'garcom',
  status: 'aguardando',
  criadoEm: 1_000_000,
  atualizadoEm: 1_000_000,
}

describe('lerMesa', () => {
  it('aceita números de 1 a 999 como texto ou número', () => {
    expect(lerMesa('12')).toBe(12)
    expect(lerMesa(' 7 ')).toBe(7)
    expect(lerMesa(999)).toBe(999)
  })
  it('recusa zero, negativos, decimais e texto', () => {
    for (const v of ['0', '-3', '1.5', '1000', 'doze', '', null, undefined]) {
      expect(lerMesa(v)).toBeNull()
    }
  })
})

describe('validarNovoChamado', () => {
  it('aceita um chamado completo e limpa a mensagem', () => {
    expect(
      validarNovoChamado({ unidade: 'ponta-do-farol', mesa: '4', tipo: 'outro', mensagem: '  mais   guardanapos ' }),
    ).toEqual({
      ok: true,
      dados: { unidade: 'ponta-do-farol', mesa: 4, tipo: 'outro', mensagem: 'mais guardanapos' },
    })
  })
  it('explica em português o que falta', () => {
    expect(validarNovoChamado(null).ok).toBe(false)
    expect(validarNovoChamado({ unidade: 'recife', mesa: 1, tipo: 'garcom' })).toMatchObject({
      erro: expect.stringContaining('unidade'),
    })
    expect(validarNovoChamado({ unidade: 'litoranea', mesa: '', tipo: 'garcom' })).toMatchObject({
      erro: expect.stringContaining('mesa'),
    })
    expect(validarNovoChamado({ unidade: 'litoranea', mesa: 1, tipo: 'pizza' }).ok).toBe(false)
    expect(validarNovoChamado({ unidade: 'litoranea', mesa: 1, tipo: 'outro', mensagem: '   ' }).ok).toBe(false)
    expect(validarNovoChamado({ unidade: 'litoranea', mesa: 1, tipo: 'garcom', mensagem: 'x'.repeat(201) }).ok).toBe(false)
  })
})

describe('identificador', () => {
  it('vai e volta', () => {
    const id = idDoChamado('litoranea', 12, 'conta')
    expect(id).toBe('litoranea.12.conta')
    expect(lerId(id)).toEqual({ unidade: 'litoranea', mesa: 12, tipo: 'conta' })
  })
  it('recusa identificadores malformados', () => {
    for (const id of ['', 'litoranea.12', 'x.12.conta', 'litoranea.0.conta', 'litoranea.12.conta.extra', 42]) {
      expect(lerId(id)).toBeNull()
    }
  })
})

describe('ciclo de vida', () => {
  it('a equipe só avança o status', () => {
    expect(podeMudarStatus('aguardando', 'a_caminho')).toBe(true)
    expect(podeMudarStatus('aguardando', 'concluido')).toBe(true)
    expect(podeMudarStatus('a_caminho', 'concluido')).toBe(true)
    expect(podeMudarStatus('a_caminho', 'a_caminho')).toBe(false)
    expect(podeMudarStatus('concluido', 'a_caminho')).toBe(false)
    expect(podeMudarStatus('cancelado', 'concluido')).toBe(false)
    expect(podeMudarStatus('aguardando', 'cancelado')).toBe(false)
  })
  it('vence chamados abertos antigos e encerrados depois de alguns minutos', () => {
    expect(estaVencido(base, base.criadoEm + VALIDADE_ABERTO_MS - 1)).toBe(false)
    expect(estaVencido(base, base.criadoEm + VALIDADE_ABERTO_MS + 1)).toBe(true)
    const encerrado = { ...base, status: 'concluido' as const, atualizadoEm: 2_000_000 }
    expect(estaVencido(encerrado, 2_000_000 + VALIDADE_ENCERRADO_MS - 1)).toBe(false)
    expect(estaVencido(encerrado, 2_000_000 + VALIDADE_ENCERRADO_MS + 1)).toBe(true)
  })
})

describe('frases faladas', () => {
  it('descreve a situação para o cliente', () => {
    expect(fraseParaCliente(base)).toBe(
      'Chamar garçom, mesa 12, unidade Litorânea. A equipe foi avisada. Aguarde na sua mesa.',
    )
    expect(fraseParaCliente({ ...base, status: 'a_caminho' })).toContain('está a caminho')
    expect(fraseParaCliente({ ...base, status: 'concluido' })).toContain('concluído')
    expect(fraseParaCliente({ ...base, status: 'cancelado' })).toContain('cancelado')
  })
  it('descreve o chamado para a equipe, com a mensagem quando houver', () => {
    expect(fraseParaEquipe(base)).toBe('Mesa 12, Litorânea: Chamar garçom.')
    expect(fraseParaEquipe({ ...base, tipo: 'outro', mensagem: 'cadeira de criança' })).toBe(
      'Mesa 12, Litorânea: Outro pedido. Mensagem: cadeira de criança',
    )
  })
  it('conta o tempo em palavras', () => {
    expect(tempoDecorrido(0, 30_000)).toBe('agora mesmo')
    expect(tempoDecorrido(0, 60_000)).toBe('há 1 minuto')
    expect(tempoDecorrido(0, 5 * 60_000)).toBe('há 5 minutos')
    expect(tempoDecorrido(0, 60 * 60_000)).toBe('há 1 hora')
    expect(tempoDecorrido(0, 125 * 60_000)).toBe('há 2 horas')
  })
})
