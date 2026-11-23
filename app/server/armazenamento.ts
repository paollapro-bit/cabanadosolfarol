// Armazenamento no Cloudflare: documentos JSON no D1 (binding DB) e fotos no
// KV (binding FOTOS). Só roda no servidor (Worker).
import { env } from 'cloudflare:workers'

export interface Ambiente {
  DB: D1Database
  FOTOS: KVNamespace
  EQUIPE_PIN?: string
}

export const ambiente = env as unknown as Ambiente

let tabelaPronta: Promise<unknown> | null = null

// A tabela é criada na primeira consulta de cada instância: não há passo de
// migração para esquecer no deploy.
function prepararTabela() {
  tabelaPronta ??= ambiente.DB.prepare(
    `CREATE TABLE IF NOT EXISTS documentos (
       colecao TEXT NOT NULL,
       chave TEXT NOT NULL,
       valor TEXT NOT NULL,
       PRIMARY KEY (colecao, chave)
     )`,
  ).run()
  return tabelaPronta
}

/** Uma coleção de documentos JSON, com a mesma ideia de um armazenamento chave-valor. */
export function colecao(nome: string) {
  return {
    async get<T>(chave: string): Promise<T | null> {
      await prepararTabela()
      const linha = await ambiente.DB.prepare('SELECT valor FROM documentos WHERE colecao = ? AND chave = ?')
        .bind(nome, chave)
        .first<{ valor: string }>()
      return linha ? (JSON.parse(linha.valor) as T) : null
    },

    /**
     * Grava o documento. Com soSeNovo, só grava se a chave ainda não existe — de
     * forma atômica — e devolve se gravou.
     */
    async set(chave: string, valor: unknown, opcoes: { soSeNovo?: boolean } = {}): Promise<boolean> {
      await prepararTabela()
      const sql = opcoes.soSeNovo
        ? 'INSERT INTO documentos (colecao, chave, valor) VALUES (?, ?, ?) ON CONFLICT DO NOTHING'
        : 'INSERT INTO documentos (colecao, chave, valor) VALUES (?, ?, ?) ON CONFLICT (colecao, chave) DO UPDATE SET valor = excluded.valor'
      const resultado = await ambiente.DB.prepare(sql).bind(nome, chave, JSON.stringify(valor)).run()
      return resultado.meta.changes > 0
    },

    async delete(chave: string) {
      await prepararTabela()
      await ambiente.DB.prepare('DELETE FROM documentos WHERE colecao = ? AND chave = ?').bind(nome, chave).run()
    },

    async list<T>(prefixo = ''): Promise<T[]> {
      await prepararTabela()
      const { results } = await ambiente.DB.prepare(
        "SELECT valor FROM documentos WHERE colecao = ? AND substr(chave, 1, length(?)) = ? ORDER BY chave",
      )
        .bind(nome, prefixo, prefixo)
        .all<{ valor: string }>()
      return results.map((r) => JSON.parse(r.valor) as T)
    },
  }
}

export function json(corpo: unknown, status = 200) {
  return Response.json(corpo, { status, headers: { 'cache-control': 'no-store' } })
}

export function erro(mensagem: string, status: number) {
  return json({ erro: mensagem }, status)
}

/** Comparação em tempo constante (compara os hashes, não os textos). */
export async function iguais(a: string, b: string) {
  const codificar = (t: string) => crypto.subtle.digest('SHA-256', new TextEncoder().encode(t))
  const [ha, hb] = await Promise.all([codificar(a), codificar(b)])
  const va = new Uint8Array(ha)
  const vb = new Uint8Array(hb)
  let diferenca = 0
  for (let i = 0; i < va.length; i++) diferenca |= va[i] ^ vb[i]
  return diferenca === 0
}

/** Devolve a resposta de recusa, ou null quando o código da equipe confere. */
export async function recusaDaEquipe(req: Request): Promise<Response | null> {
  const pin = ambiente.EQUIPE_PIN
  if (!pin) {
    return erro('O painel ainda não foi configurado. Defina o segredo EQUIPE_PIN na Cloudflare.', 503)
  }
  if (!(await iguais(req.headers.get('x-equipe-pin') ?? '', pin))) {
    return erro('Código da equipe incorreto.', 401)
  }
  return null
}
