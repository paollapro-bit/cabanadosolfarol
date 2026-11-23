import { useEffect, useRef, type ReactNode } from 'react'
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
  useRouterState,
} from '@tanstack/react-router'
import {
  AcessibilidadeProvider,
  BarraDeAcessibilidade,
  SCRIPT_PREFERENCIAS,
  useAcessibilidade,
} from '~/components/Acessibilidade'
import appCss from '~/styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Central de atendimento · Cabana do Sol' },
      {
        name: 'description',
        content:
          'Central de atendimento acessível do restaurante Cabana do Sol: chame um garçom, peça a conta e tire dúvidas com autonomia.',
      },
      { name: 'theme-color', content: '#a8320b' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: Documento,
  component: Estrutura,
  notFoundComponent: NaoEncontrada,
})

function Documento({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_PREFERENCIAS }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

const NAVEGACAO = [
  { to: '/', rotulo: 'Mesa', icone: '🛎️' },
  { to: '/cardapio', rotulo: 'Cardápio', icone: '📖' },
  { to: '/delivery', rotulo: 'Delivery', icone: '🛵' },
  { to: '/reservas', rotulo: 'Reservas', icone: '📅' },
  { to: '/unidades', rotulo: 'Unidades', icone: '📍' },
] as const

function Estrutura() {
  return (
    <AcessibilidadeProvider>
      <a className="pular" href="#conteudo">
        Pular para o conteúdo
      </a>
      <header className="cabecalho">
        <Link to="/" className="marca">
          <span className="marca-sol" aria-hidden="true" />
          <span>
            <span className="marca-nome">Cabana do Sol</span>
            <span className="marca-sub">Central de atendimento</span>
          </span>
        </Link>
      </header>
      <BarraDeAcessibilidade />
      <Conteudo />
      <nav className="navegacao" aria-label="Navegação principal">
        {NAVEGACAO.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="navegacao-item"
            activeProps={{ 'aria-current': 'page' }}
            activeOptions={{ exact: true }}
          >
            <span aria-hidden="true">{item.icone}</span>
            {item.rotulo}
          </Link>
        ))}
      </nav>
    </AcessibilidadeProvider>
  )
}

// Ao trocar de tela, o foco vai para o conteúdo e o título é anunciado —
// sem isso o leitor de tela continua parado na navegação.
function Conteudo() {
  // resolvedLocation só muda depois que a nova tela foi renderizada.
  const pathname = useRouterState({ select: (s) => s.resolvedLocation?.pathname })
  const { anunciar, parar } = useAcessibilidade()
  const principal = useRef<HTMLElement>(null)
  const primeira = useRef(true)

  useEffect(() => {
    if (primeira.current) {
      primeira.current = false
      return
    }
    parar()
    principal.current?.focus()
    const titulo = principal.current?.querySelector('h1')?.textContent
    if (titulo) anunciar(titulo)
  }, [pathname, anunciar, parar])

  return (
    <main id="conteudo" ref={principal} tabIndex={-1} className="conteudo">
      <Outlet />
      <footer className="rodape">
        <p>Cabana do Sol · Desde 1994 · Litorânea e Ponta do Farol, São Luís</p>
        <Link to="/duvidas">Dúvidas frequentes</Link>
        <Link to="/reclamacoes">Reclamações</Link>
        <a href="https://www.instagram.com/cabanadosol/" target="_blank" rel="noreferrer">
          Instagram @cabanadosol<span className="sr-only"> (abre fora da central)</span>
        </a>
        <Link to="/equipe">Área da equipe</Link>
      </footer>
    </main>
  )
}

function NaoEncontrada() {
  return (
    <section>
      <h1>Página não encontrada</h1>
      <p>O endereço que você abriu não existe nesta central.</p>
      <Link to="/" className="botao botao-principal">
        Ir para o atendimento
      </Link>
    </section>
  )
}
