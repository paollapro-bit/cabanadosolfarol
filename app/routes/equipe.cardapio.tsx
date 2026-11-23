import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useAcessibilidade } from '~/components/Acessibilidade'
import { PainelDaEquipe, useEquipe } from '~/components/Equipe'
import { lerCardapio, removerCardapio, salvarCardapio } from '~/lib/api'
import { lerLinkDoCanva, urlDeVisualizacao, type CardapioCanva } from '~/lib/cardapio'

export const Route = createFileRoute('/equipe/cardapio')({
  head: () => ({
    meta: [{ title: 'Cardápio · Painel da equipe' }, { name: 'robots', content: 'noindex' }],
  }),
  component: () => (
    <PainelDaEquipe titulo="Cardápio do Canva">
      <CardapioDaEquipe />
    </PainelDaEquipe>
  ),
})

function CardapioDaEquipe() {
  const { anunciar } = useAcessibilidade()
  const { pin, falha, limparErro } = useEquipe()
  const [atual, setAtual] = useState<CardapioCanva | null | undefined>(undefined)
  const [link, setLink] = useState('')
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    try {
      setAtual((await lerCardapio()).cardapio)
      limparErro()
    } catch (e) {
      falha(e)
    }
  }, [falha, limparErro])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function salvar(e: FormEvent) {
    e.preventDefault()
    const leitura = lerLinkDoCanva(link)
    if (!leitura.ok) {
      setErro(leitura.erro)
      anunciar(leitura.erro)
      document.getElementById('link-canva')?.focus()
      return
    }
    setErro('')
    try {
      const { cardapio } = await salvarCardapio(link, pin)
      setAtual(cardapio)
      setLink('')
      anunciar('Cardápio publicado. Os clientes já veem a versão atual do Canva.')
    } catch (e) {
      falha(e)
    }
  }

  async function remover() {
    if (!window.confirm('Tirar o cardápio do ar? Os clientes deixam de vê-lo até um novo link ser colado.')) return
    try {
      await removerCardapio(pin)
      setAtual(null)
      anunciar('Cardápio retirado do ar.')
    } catch (e) {
      falha(e)
    }
  }

  return (
    <>
      <section aria-labelledby="titulo-estado">
        <h2 id="titulo-estado">
          {atual === undefined ? 'Carregando…' : atual ? 'Cardápio publicado' : 'Nenhum cardápio publicado'}
        </h2>
        {atual && (
          <div className="cartao">
            <p>
              Design <strong>{atual.designId}</strong>, publicado em{' '}
              {new Date(atual.atualizadoEm).toLocaleString('pt-BR', { timeZone: 'America/Fortaleza' })}.
            </p>
            <p className="dica">
              Não precisa colar de novo a cada mudança: o que vocês editarem nesse design no Canva aparece
              sozinho para os clientes. Só cole um novo link se trocarem de design.
            </p>
            <div className="acoes">
              <Link to="/cardapio" className="botao botao-linha">
                Ver como o cliente vê
              </Link>
              <a className="botao botao-linha" href={urlDeVisualizacao(atual)} target="_blank" rel="noreferrer">
                Abrir no Canva<span className="sr-only"> (abre em outra aba)</span>
              </a>
              <button type="button" className="botao botao-linha" onClick={remover}>
                Tirar do ar
              </button>
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="titulo-colar">
        <h2 id="titulo-colar">{atual ? 'Trocar o design' : 'Publicar o cardápio'}</h2>
        <p>
          O código precisa ser gerado por <strong>quem é dono do design</strong> no Canva, ou por alguém
          com acesso de edição. Se o cardápio foi feito por um designer ou agência, envie estes passos
          para essa pessoa e peça que ela mande o código para você:
        </p>
        <ol className="passos-texto">
          <li>No Canva, abra o design do cardápio.</li>
          <li>
            Toque em <strong>Compartilhar</strong>, depois <strong>Mais</strong>, depois{' '}
            <strong>Incorporar</strong>.
          </li>
          <li>Confirme que o design pode ficar público e toque em Incorporar.</li>
          <li>Copie o código HTML (ou o link de incorporação) e cole abaixo.</li>
        </ol>
        <p className="dica">
          O link comum de compartilhar (&quot;qualquer pessoa com o link pode ver&quot;) não funciona aqui:
          o Canva só mostra o design dentro de outro site pelo código de incorporação.
        </p>
        <form className="cartao" onSubmit={salvar}>
          <div className="campo">
            <label htmlFor="link-canva">Código ou link de incorporação do Canva</label>
            <textarea
              id="link-canva"
              rows={4}
              value={link}
              onChange={(e) => setLink(e.target.value)}
              aria-invalid={Boolean(erro)}
              aria-describedby={erro ? 'erro-canva dica-canva' : 'dica-canva'}
            />
            <p id="dica-canva" className="dica">
              Atenção: depois de incorporado, qualquer pessoa com o link consegue ver esse design.
            </p>
            {erro && (
              <p id="erro-canva" className="erro">
                {erro}
              </p>
            )}
          </div>
          <button type="submit" className="botao botao-principal">
            Publicar cardápio
          </button>
        </form>
      </section>
    </>
  )
}
