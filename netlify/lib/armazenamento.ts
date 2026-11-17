import { getStore } from '@netlify/blobs'
import { timingSafeEqual, createHash } from 'node:crypto'
import { estaVencido, type Chamado } from '../../app/lib/chamados'

/** O registro guardado inclui o segredo que permite ao cliente cancelar. */
export type Registro = Chamado & { segredo: string }

// Um store por contexto de deploy: prévias nunca mexem nos chamados de produção.
export function abrirStore(nome: string) {
  const contexto = process.env.CONTEXT ?? 'dev'
  return getStore({ name: `${nome}-${contexto}`, consistency: 'strong' })
}

function store() {
  return abrirStore('chamados')
}

export async function lerRegistro(id: string): Promise<Registro | null> {
  const registro = (await store().get(id, { type: 'json' })) as Registro | null
  if (!registro) return null
  if (estaVencido(registro, Date.now())) {
    await store().delete(id)
    return null
  }
  return registro
}

export async function gravarRegistro(registro: Registro) {
  await store().setJSON(registro.id, registro)
}

export async function listarRegistros(prefixo: string): Promise<Registro[]> {
  const s = store()
  const { blobs } = await s.list({ prefix: prefixo })
  const agora = Date.now()
  const registros = await Promise.all(
    blobs.map(async ({ key }) => {
      const registro = (await s.get(key, { type: 'json' })) as Registro | null
      if (registro && estaVencido(registro, agora)) {
        await s.delete(key)
        return null
      }
      return registro
    }),
  )
  return registros.filter((r): r is Registro => r !== null)
}

export function publico({ segredo: _segredo, ...chamado }: Registro): Chamado {
  return chamado
}

export function json(corpo: unknown, status = 200) {
  return Response.json(corpo, {
    status,
    headers: { 'cache-control': 'no-store' },
  })
}

export function erro(mensagem: string, status: number) {
  return json({ erro: mensagem }, status)
}

export function iguais(a: string, b: string) {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

/** Devolve a resposta de recusa, ou null quando o código da equipe confere. */
export function recusaDaEquipe(req: Request): Response | null {
  const pin = process.env.EQUIPE_PIN
  if (!pin) {
    return erro(
      'O painel ainda não foi configurado. Defina a variável EQUIPE_PIN no Netlify.',
      503,
    )
  }
  if (!iguais(req.headers.get('x-equipe-pin') ?? '', pin)) {
    return erro('Código da equipe incorreto.', 401)
  }
  return null
}
