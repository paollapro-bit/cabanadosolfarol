import type { Reclamacao } from '~/lib/reclamacoes'
import { colecao } from './armazenamento'

export type RegistroDeReclamacao = Reclamacao & { segredo: string }

const reclamacoes = () => colecao('reclamacoes')
const idValido = (id: string) => /^[\w-]{1,64}$/.test(id)

export async function lerReclamacao(id: string) {
  return idValido(id) ? reclamacoes().get<RegistroDeReclamacao>(id) : null
}

export async function gravarReclamacao(r: RegistroDeReclamacao) {
  await reclamacoes().set(r.id, r)
}

export async function apagarReclamacao(id: string) {
  await reclamacoes().delete(id)
}

export async function listarReclamacoes() {
  return reclamacoes().list<RegistroDeReclamacao>()
}

export function reclamacaoParaEquipe({ segredo: _s, ...r }: RegistroDeReclamacao): Reclamacao {
  return r
}

/** O cliente vê o andamento, mas não a anotação interna da equipe. */
export function reclamacaoParaCliente(registro: RegistroDeReclamacao): Reclamacao {
  const { nota: _nota, ...r } = reclamacaoParaEquipe(registro)
  return r
}
