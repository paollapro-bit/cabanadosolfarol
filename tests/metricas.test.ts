import { describe, expect, it } from 'vitest'
import { EVENTOS, ehEvento, intervaloDoPeriodo, montarRelatorio, relatorioEmCsv } from '../app/lib/metricas'

describe('catálogo', () => {
  it('tem um evento para cada botão dos dados', () => {
    expect(ehEvento('canal.reservas')).toBe(true)
    expect(ehEvento('canal.delivery-whatsapp')).toBe(true)
    expect(ehEvento('delivery.ligar.32352586')).toBe(true)
    expect(ehEvento('unidade.litoranea.mapa')).toBe(true)
    expect(ehEvento('visita.reservas')).toBe(true)
    expect(ehEvento('qualquer.coisa')).toBe(false)
    expect(ehEvento(42)).toBe(false)
  })
  it('separa delivery de reservas', () => {
    expect(EVENTOS.get('canal.reservas')?.categoria).toBe('reservas')
    expect(EVENTOS.get('canal.delivery')?.categoria).toBe('delivery')
    expect(EVENTOS.get('canal.cardapio-delivery')?.categoria).toBe('delivery')
    expect(EVENTOS.get('canal.cardapio-litoranea')?.categoria).toBe('cardapio')
    expect(EVENTOS.get('delivery.ligar.991165457')?.rotulo).toBe('Ligou para (98) 99116-5457')
  })
})

describe('relatório', () => {
  const grupos = montarRelatorio([
    { evento: 'canal.reservas', total: 3 },
    { evento: 'reservas.pedido-enviado', total: 5 },
    { evento: 'delivery.ligar.32352586', total: 2 },
    { evento: 'desconhecido', total: 9 },
  ])
  it('soma por área, mais clicado primeiro', () => {
    const reservas = grupos.find((g) => g.categoria === 'reservas')!
    expect(reservas.total).toBe(8)
    expect(reservas.linhas.map((l) => l.evento)).toEqual(['reservas.pedido-enviado', 'canal.reservas'])
    expect(grupos.find((g) => g.categoria === 'delivery')!.total).toBe(2)
    expect(grupos.find((g) => g.categoria === 'cardapio')!.linhas).toEqual([])
  })
  it('gera planilha', () => {
    const csv = relatorioEmCsv(grupos, '2026-11-01', '2026-11-30')
    expect(csv).toContain('Reservas;"Pedido de reserva enviado";5')
    expect(csv).toContain('Delivery;"Ligou para (98) 3235-2586";2')
  })
})

describe('períodos', () => {
  const hoje = '2026-11-26' // quinta-feira
  it('semana começa na segunda', () => {
    expect(intervaloDoPeriodo('esta-semana', hoje)).toEqual({ de: '2026-11-23', ate: hoje })
    expect(intervaloDoPeriodo('semana-passada', hoje)).toEqual({ de: '2026-11-16', ate: '2026-11-22' })
  })
  it('mês e últimos dias', () => {
    expect(intervaloDoPeriodo('este-mes', hoje)).toEqual({ de: '2026-11-01', ate: hoje })
    expect(intervaloDoPeriodo('mes-passado', hoje)).toEqual({ de: '2026-10-01', ate: '2026-10-31' })
    expect(intervaloDoPeriodo('mes-passado', '2026-01-10')).toEqual({ de: '2025-12-01', ate: '2025-12-31' })
    expect(intervaloDoPeriodo('7-dias', hoje)).toEqual({ de: '2026-11-20', ate: hoje })
  })
})
