import { abrirStore } from './armazenamento'
import type { Ocupacao, PeriodoId, Reserva, Salao } from '../../app/lib/reservas'
import { PERIODOS } from '../../app/lib/reservas'

export type RegistroDeReserva = Reserva & { segredo: string }

const saloes = () => abrirStore('saloes')
const reservas = () => abrirStore('reservas')
export const fotos = () => abrirStore('fotos')

export async function lerSalao(id: string): Promise<Salao | null> {
  if (!/^[\w-]{1,64}$/.test(id)) return null
  return (await saloes().get(id, { type: 'json' })) as Salao | null
}

export async function gravarSalao(salao: Salao) {
  await saloes().setJSON(salao.id, salao)
}

export async function apagarSalao(salao: Salao) {
  await Promise.all(salao.fotos.map((f) => fotos().delete(f.id)))
  await saloes().delete(salao.id)
}

export async function listarSaloes(unidade: string): Promise<Salao[]> {
  const s = saloes()
  const { blobs } = await s.list()
  const todos = await Promise.all(
    blobs.map(({ key }) => s.get(key, { type: 'json' }) as Promise<Salao | null>),
  )
  return todos
    .filter((x): x is Salao => x !== null && x.unidade === unidade)
    .sort((a, b) => a.criadoEm - b.criadoEm)
}

export async function lerReserva(id: string): Promise<RegistroDeReserva | null> {
  if (!/^[\w-]{1,64}$/.test(id)) return null
  return (await reservas().get(`reserva/${id}`, { type: 'json' })) as RegistroDeReserva | null
}

export async function gravarReserva(reserva: RegistroDeReserva) {
  await reservas().setJSON(`reserva/${reserva.id}`, reserva)
}

export async function apagarReserva(id: string) {
  await reservas().delete(`reserva/${id}`)
}

export async function listarReservas(): Promise<RegistroDeReserva[]> {
  const s = reservas()
  const { blobs } = await s.list({ prefix: 'reserva/' })
  const todas = await Promise.all(
    blobs.map(({ key }) => s.get(key, { type: 'json' }) as Promise<RegistroDeReserva | null>),
  )
  return todas.filter((x): x is RegistroDeReserva => x !== null)
}

// A confirmação ocupa o salão naquele dia e período. A chave é criada com
// onlyIfNew, que é atômico: duas confirmações simultâneas nunca passam juntas.
const chaveDaVaga = (salaoId: string, data: string, periodo: string) =>
  `ocupacao/${salaoId}/${data}/${periodo}`

export async function ocuparVaga(r: Reserva): Promise<boolean> {
  const { modified } = await reservas().set(chaveDaVaga(r.salaoId, r.data, r.periodo), r.id, {
    onlyIfNew: true,
  })
  return modified
}

export async function liberarVaga(r: Reserva) {
  const chave = chaveDaVaga(r.salaoId, r.data, r.periodo)
  if ((await reservas().get(chave, { type: 'text' })) === r.id) await reservas().delete(chave)
}

export async function lerOcupacao(salaoId: string, data: string): Promise<Ocupacao> {
  const pares = await Promise.all(
    PERIODOS.map(async (p) => {
      const dono = await reservas().get(chaveDaVaga(salaoId, data, p.id), { type: 'text' })
      return [p.id, dono !== null] as [PeriodoId, boolean]
    }),
  )
  return Object.fromEntries(pares)
}

export function reservaPublica({ segredo: _s, ...reserva }: RegistroDeReserva): Reserva {
  return reserva
}
