import { estaVencido, type Chamado } from '~/lib/chamados'
import { colecao } from './armazenamento'

/** O registro guardado inclui o segredo que permite ao cliente cancelar. */
export type Registro = Chamado & { segredo: string }

const chamados = () => colecao('chamados')

export async function lerRegistro(id: string): Promise<Registro | null> {
  const registro = await chamados().get<Registro>(id)
  if (!registro) return null
  if (estaVencido(registro, Date.now())) {
    await chamados().delete(id)
    return null
  }
  return registro
}

export async function gravarRegistro(registro: Registro) {
  await chamados().set(registro.id, registro)
}

export async function listarRegistros(prefixo: string): Promise<Registro[]> {
  const agora = Date.now()
  const todos = await chamados().list<Registro>(prefixo)
  const vencidos = todos.filter((r) => estaVencido(r, agora))
  await Promise.all(vencidos.map((r) => chamados().delete(r.id)))
  return todos.filter((r) => !estaVencido(r, agora))
}

export function publico({ segredo: _segredo, ...chamado }: Registro): Chamado {
  return chamado
}
