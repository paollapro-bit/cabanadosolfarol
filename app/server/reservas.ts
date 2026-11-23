import { PERIODOS, type Ocupacao, type PeriodoId, type Reserva, type Salao } from '~/lib/reservas'
import { saloesIniciais } from '~/data/atendimento'
import { ambiente, colecao } from './armazenamento'

export type RegistroDeReserva = Reserva & { segredo: string }

const saloes = () => colecao('saloes')
const reservas = () => colecao('reservas')
const ocupacao = () => colecao('ocupacao')
const idValido = (id: string) => /^[\w-]{1,64}$/.test(id)

export async function lerSalao(id: string): Promise<Salao | null> {
  return idValido(id) ? saloes().get<Salao>(id) : null
}

export async function gravarSalao(salao: Salao) {
  await saloes().set(salao.id, salao)
}

export async function apagarSalao(salao: Salao) {
  await Promise.all(salao.fotos.map((f) => ambiente.FOTOS.delete(f.id)))
  await saloes().delete(salao.id)
}

// Cadastra cada salão conhecido uma única vez: a marca de cada um é gravada
// com soSeNovo, então um salão que a equipe excluiu não volta, e um salão
// novo da lista entra mesmo depois do app já estar no ar.
async function garantirSaloesIniciais() {
  await Promise.all(
    saloesIniciais.map(async (s, i) => {
      if (!(await colecao('config').set(`salao-inicial/${s.id}`, true, { soSeNovo: true }))) return
      await saloes().set(s.id, { ...s, fotos: [], ativo: true, criadoEm: i + 1 } satisfies Salao, { soSeNovo: true })
    }),
  )
}

export async function listarSaloes(unidade: string): Promise<Salao[]> {
  await garantirSaloesIniciais()
  return (await saloes().list<Salao>())
    .filter((s) => s.unidade === unidade)
    .sort((a, b) => a.criadoEm - b.criadoEm)
}

export async function gravarFoto(id: string, bytes: Uint8Array, tipo: string) {
  await ambiente.FOTOS.put(id, bytes, { metadata: { tipo } })
}

export async function lerFoto(id: string) {
  if (!idValido(id)) return null
  const { value, metadata } = await ambiente.FOTOS.getWithMetadata<{ tipo?: string }>(id, 'arrayBuffer')
  return value ? { bytes: value, tipo: metadata?.tipo ?? 'image/jpeg' } : null
}

export async function apagarFoto(id: string) {
  await ambiente.FOTOS.delete(id)
}

export async function lerReserva(id: string): Promise<RegistroDeReserva | null> {
  return idValido(id) ? reservas().get<RegistroDeReserva>(id) : null
}

export async function gravarReserva(reserva: RegistroDeReserva) {
  await reservas().set(reserva.id, reserva)
}

export async function apagarReserva(id: string) {
  await reservas().delete(id)
}

export async function listarReservas(): Promise<RegistroDeReserva[]> {
  return reservas().list<RegistroDeReserva>()
}

// A confirmação ocupa o salão naquele dia e período. A chave é gravada só se
// ainda não existe, numa única instrução do D1: duas confirmações simultâneas
// nunca passam juntas.
const chaveDaVaga = (salaoId: string, data: string, periodo: string) => `${salaoId}/${data}/${periodo}`

export async function ocuparVaga(r: Reserva): Promise<boolean> {
  return ocupacao().set(chaveDaVaga(r.salaoId, r.data, r.periodo), r.id, { soSeNovo: true })
}

export async function liberarVaga(r: Reserva) {
  const chave = chaveDaVaga(r.salaoId, r.data, r.periodo)
  if ((await ocupacao().get<string>(chave)) === r.id) await ocupacao().delete(chave)
}

export async function lerOcupacao(salaoId: string, data: string): Promise<Ocupacao> {
  const pares = await Promise.all(
    PERIODOS.map(
      async (p) => [p.id, (await ocupacao().get(chaveDaVaga(salaoId, data, p.id))) !== null] as [PeriodoId, boolean],
    ),
  )
  return Object.fromEntries(pares)
}

export function reservaPublica({ segredo: _s, ...reserva }: RegistroDeReserva): Reserva {
  return reserva
}
