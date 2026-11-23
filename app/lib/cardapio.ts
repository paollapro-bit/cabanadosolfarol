// Cardápio visual publicado pelo Canva ("Compartilhar → Mais → Incorporar").
// O Canva mantém a incorporação sempre na versão mais recente do design, então
// basta guardar o link uma vez. Tudo puro, para ser testado direto.

export interface CardapioCanva {
  designId: string
  chave: string
  /** Altura da página em % da largura, lida do código do Canva (A4 em pé ≈ 141,4). */
  proporcao: number
  atualizadoEm: number
}

const PROPORCAO_PADRAO = 141.4286

export type LeituraDoLink =
  | { ok: true; dados: Omit<CardapioCanva, 'atualizadoEm'> }
  | { ok: false; erro: string }

/**
 * Aceita o código HTML de incorporação ou o link de incorporação do Canva.
 * Links curtos (canva.com/d/…) e de edição não servem: não ficam públicos.
 */
export function lerLinkDoCanva(entrada: unknown): LeituraDoLink {
  if (typeof entrada !== 'string' || !entrada.trim()) {
    return { ok: false, erro: 'Cole o código ou o link de incorporação do Canva.' }
  }
  const texto = entrada.trim()
  if (texto.length > 4000) return { ok: false, erro: 'O texto colado é longo demais.' }
  const achado = texto.match(
    /https:\/\/(?:www\.)?canva\.com\/design\/(D[A-Za-z0-9_-]{10})\/([A-Za-z0-9_-]{4,64})\/(view|edit)\b/,
  )
  if (!achado) {
    return {
      ok: false,
      erro: 'Este não é um link de incorporação do Canva. No Canva, abra o cardápio e use Compartilhar, Mais, Incorporar.',
    }
  }
  if (achado[3] === 'edit') {
    return {
      ok: false,
      erro: 'Este é o link de edição, que não pode ficar público. Use Compartilhar, Mais, Incorporar.',
    }
  }
  const padding = texto.match(/padding-top:\s*([\d.]+)%/)
  const proporcao = padding ? Number(padding[1]) : PROPORCAO_PADRAO
  return {
    ok: true,
    dados: {
      designId: achado[1],
      chave: achado[2],
      proporcao: proporcao >= 20 && proporcao <= 500 ? proporcao : PROPORCAO_PADRAO,
    },
  }
}

export function urlDeIncorporacao(c: Pick<CardapioCanva, 'designId' | 'chave'>) {
  return `https://www.canva.com/design/${c.designId}/${c.chave}/view?embed`
}

export function urlDeVisualizacao(c: Pick<CardapioCanva, 'designId' | 'chave'>) {
  return `https://www.canva.com/design/${c.designId}/${c.chave}/view`
}
