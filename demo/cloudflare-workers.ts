// Substitui `cloudflare:workers` na demonstração: imita o D1 e o KV no navegador,
// para que as rotas de API reais do app rodem sem servidor. Os dados ficam só
// neste aparelho (localStorage).

const CHAVE_DOCS = 'cds-demo-docs-v4'
const CHAVE_FOTOS = 'cds-demo-fotos-v4'

function ler<T>(chave: string, padrao: T): T {
  try {
    const bruto = localStorage.getItem(chave)
    return bruto ? (JSON.parse(bruto) as T) : padrao
  } catch {
    return padrao
  }
}

function gravar(chave: string, valor: unknown) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor))
  } catch {
    // Sem espaço ou sem armazenamento: a demonstração segue só na memória.
  }
}

// colecao -> chave -> valor (texto JSON)
const docs: Record<string, Record<string, string>> = ler(CHAVE_DOCS, {})
const salvarDocs = () => gravar(CHAVE_DOCS, docs)

type Parametros = unknown[]

// Contagens do relatório: dia -> evento -> total.
const CHAVE_CONTAGENS = 'cds-demo-contagens-v1'
const contagens: Record<string, Record<string, number>> = ler(CHAVE_CONTAGENS, {})

// Entende exatamente as instruções SQL de app/server/armazenamento.ts e
// app/server/metricas.ts.
function executar(sql: string, p: Parametros) {
  if (sql.startsWith('CREATE TABLE')) return { linhas: [], mudou: 0 }
  if (sql.startsWith('INSERT INTO contagens')) {
    const [dia, evento] = p as string[]
    const doDia = (contagens[dia] ??= {})
    doDia[evento] = (doDia[evento] ?? 0) + 1
    gravar(CHAVE_CONTAGENS, contagens)
    return { linhas: [], mudou: 1 }
  }
  if (sql.startsWith('SELECT evento, SUM(total)')) {
    const [de, ate] = p as string[]
    const soma: Record<string, number> = {}
    for (const [dia, eventos] of Object.entries(contagens)) {
      if (dia < de || dia > ate) continue
      for (const [evento, total] of Object.entries(eventos)) soma[evento] = (soma[evento] ?? 0) + total
    }
    return { linhas: Object.entries(soma).map(([evento, total]) => ({ evento, total })), mudou: 0 }
  }
  const [colecao, chave, valor] = p as string[]
  const tabela = (docs[colecao] ??= {})
  if (sql.startsWith('SELECT valor FROM documentos WHERE colecao = ? AND chave = ?')) {
    return { linhas: chave in tabela ? [{ valor: tabela[chave] }] : [], mudou: 0 }
  }
  if (sql.startsWith('SELECT valor FROM documentos WHERE colecao = ? AND substr')) {
    const prefixo = chave
    const linhas = Object.keys(tabela)
      .filter((k) => k.startsWith(prefixo))
      .sort()
      .map((k) => ({ valor: tabela[k] }))
    return { linhas, mudou: 0 }
  }
  if (sql.startsWith('INSERT') && sql.includes('DO NOTHING')) {
    if (chave in tabela) return { linhas: [], mudou: 0 }
    tabela[chave] = valor
    salvarDocs()
    return { linhas: [], mudou: 1 }
  }
  if (sql.startsWith('INSERT')) {
    tabela[chave] = valor
    salvarDocs()
    return { linhas: [], mudou: 1 }
  }
  if (sql.startsWith('DELETE')) {
    const existia = chave in tabela
    delete tabela[chave]
    salvarDocs()
    return { linhas: [], mudou: existia ? 1 : 0 }
  }
  throw new Error(`SQL não suportado na demonstração: ${sql}`)
}

const DB = {
  prepare(sql: string) {
    const instrucao = sql.replace(/\s+/g, ' ').trim()
    let params: Parametros = []
    const comando = {
      bind(...valores: Parametros) {
        params = valores
        return comando
      },
      async first() {
        return executar(instrucao, params).linhas[0] ?? null
      },
      async run() {
        return { meta: { changes: executar(instrucao, params).mudou } }
      },
      async all() {
        return { results: executar(instrucao, params).linhas }
      },
    }
    return comando
  },
}

// Fotos: data URLs, para poderem ir direto no <img>.
const fotos: Record<string, string> = ler(CHAVE_FOTOS, {})

function paraDataUrl(bytes: Uint8Array, tipo: string) {
  let binario = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return `data:${tipo};base64,${btoa(binario)}`
}

const FOTOS = {
  async put(id: string, bytes: Uint8Array, opcoes?: { metadata?: { tipo?: string } }) {
    fotos[id] = paraDataUrl(bytes, opcoes?.metadata?.tipo ?? 'image/jpeg')
    gravar(CHAVE_FOTOS, fotos)
  },
  async getWithMetadata() {
    return { value: null, metadata: null }
  },
  async delete(id: string) {
    delete fotos[id]
    gravar(CHAVE_FOTOS, fotos)
  },
}

;(globalThis as { __demoFotoUrl?: (id: string) => string | undefined }).__demoFotoUrl = (id) => fotos[id]

export const env = { DB, FOTOS, EQUIPE_PIN: '1234' }
