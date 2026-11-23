import { describe, expect, it } from 'vitest'
import { lerLinkDoCanva, urlDeIncorporacao, urlDeVisualizacao } from '../app/lib/cardapio'

const codigo = `<div style="position: relative; width: 100%; height: 0; padding-top: 141.4286%;
 padding-bottom: 0; box-shadow: 0 2px 8px 0 rgba(63,69,81,0.16); margin-top: 1.6em; margin-bottom: 0.9em; overflow: hidden;
 border-radius: 8px; will-change: transform;">
  <iframe loading="lazy" style="position: absolute; width: 100%; height: 100%; top: 0; left: 0; border: none; padding: 0;margin: 0;"
    src="https://www.canva.com/design/DAHPddtYj2g/AbC123xyz_-/view?embed" allowfullscreen="allowfullscreen" allow="fullscreen">
  </iframe>
</div>`

describe('lerLinkDoCanva', () => {
  it('lê o código HTML de incorporação, com a proporção da página', () => {
    expect(lerLinkDoCanva(codigo)).toEqual({
      ok: true,
      dados: { designId: 'DAHPddtYj2g', chave: 'AbC123xyz_-', proporcao: 141.4286 },
    })
  })
  it('lê o link de incorporação inteligente', () => {
    const link =
      'https://www.canva.com/design/DAHPddtYj2g/AbC123xyz_-/view?utm_content=DAHPddtYj2g&utm_campaign=designshare&utm_medium=embeds&utm_source=link'
    expect(lerLinkDoCanva(link)).toMatchObject({ ok: true, dados: { designId: 'DAHPddtYj2g', proporcao: 141.4286 } })
  })
  it('recusa o link comum de visualização, que o Canva não exibe incorporado', () => {
    const link =
      'https://www.canva.com/design/DAHPddtYj2g/AbC123xyz_-/view?utm_content=DAHPddtYj2g&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks'
    expect(lerLinkDoCanva(link)).toMatchObject({ ok: false, erro: expect.stringContaining('visualização') })
  })
  it('recusa link de edição, link curto e texto qualquer', () => {
    expect(lerLinkDoCanva('https://www.canva.com/design/DAHPddtYj2g/AbC123xyz_-/edit')).toMatchObject({
      ok: false,
      erro: expect.stringContaining('edição'),
    })
    expect(lerLinkDoCanva('https://www.canva.com/d/ls2gKp22RH1lXQo').ok).toBe(false)
    expect(lerLinkDoCanva('https://evil.example/design/DAHPddtYj2g/AbC123xyz_-/view').ok).toBe(false)
    expect(lerLinkDoCanva('').ok).toBe(false)
    expect(lerLinkDoCanva(42).ok).toBe(false)
  })
  it('monta as URLs públicas', () => {
    const c = { designId: 'DAHPddtYj2g', chave: 'AbC123xyz_-' }
    expect(urlDeIncorporacao(c)).toBe('https://www.canva.com/design/DAHPddtYj2g/AbC123xyz_-/view?embed')
    expect(urlDeVisualizacao(c)).toBe('https://www.canva.com/design/DAHPddtYj2g/AbC123xyz_-/view')
  })
})
