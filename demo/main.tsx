// Ponto de entrada da demonstração: o app inteiro no navegador, sem servidor.
import { createRoot } from 'react-dom/client'
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.demo.gen'
import { Route as Raiz } from '~/routes/__root'
import { Route as ApiChamados } from '~/routes/api/chamados'
import { Route as ApiEquipeChamados } from '~/routes/api/equipe.chamados'
import { Route as ApiSaloes } from '~/routes/api/saloes'
import { Route as ApiReservas } from '~/routes/api/reservas'
import { Route as ApiEquipeReservas } from '~/routes/api/equipe.reservas'
import { Route as ApiEquipeSaloes } from '~/routes/api/equipe.saloes'
import { Route as ApiCardapio } from '~/routes/api/cardapio'
import { Route as ApiEventos } from '~/routes/api/eventos'
import { Route as ApiEquipeRelatorio } from '~/routes/api/equipe.relatorio'
import { Route as ApiReclamacoes } from '~/routes/api/reclamacoes'
import { Route as ApiEquipeReclamacoes } from '~/routes/api/equipe.reclamacoes'
import { SEM_MESA } from '~/edicao'
import { lerArquivoDoCardapio } from '~/lib/cardapioTexto'
import cardapioDoSite from './cardapio-snapshot.js?raw'
import '~/styles.css'
import './demo.css'

type Manipulador = (ctx: { request: Request; params: Record<string, string> }) => Promise<Response> | Response
type ComServidor = { options: { server?: { handlers?: Record<string, Manipulador> } } }

const rotas: Record<string, ComServidor> = {
  '/api/chamados': ApiChamados as unknown as ComServidor,
  '/api/equipe/chamados': ApiEquipeChamados as unknown as ComServidor,
  '/api/saloes': ApiSaloes as unknown as ComServidor,
  '/api/reservas': ApiReservas as unknown as ComServidor,
  '/api/equipe/reservas': ApiEquipeReservas as unknown as ComServidor,
  '/api/equipe/saloes': ApiEquipeSaloes as unknown as ComServidor,
  '/api/cardapio': ApiCardapio as unknown as ComServidor,
  '/api/eventos': ApiEventos as unknown as ComServidor,
  '/api/equipe/relatorio': ApiEquipeRelatorio as unknown as ComServidor,
  '/api/reclamacoes': ApiReclamacoes as unknown as ComServidor,
  '/api/equipe/reclamacoes': ApiEquipeReclamacoes as unknown as ComServidor,
}

// As chamadas /api/* vão para as mesmas rotas do app, rodando aqui mesmo.
const fetchOriginal = window.fetch.bind(window)
window.fetch = async (entrada, init) => {
  const texto = typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url
  if (!texto.startsWith('/api/')) return fetchOriginal(entrada, init)
  const url = new URL(texto, 'https://demo.cabanadosol')
  // A página de demonstração não pode buscar outros sites: o cardápio vem da
  // cópia baixada do site do cardápio na hora em que a demonstração foi gerada.
  if (url.pathname === '/api/cardapio-texto') return Response.json(lerArquivoDoCardapio(cardapioDoSite))
  const request = new Request(url, init)
  const manipulador = rotas[url.pathname]?.options.server?.handlers?.[request.method]
  if (!manipulador) return Response.json({ erro: 'Não disponível na demonstração.' }, { status: 404 })
  if (url.pathname !== '/api/eventos') await new Promise((r) => setTimeout(r, 120)) // espera, como na rede
  return manipulador({ request, params: {} })
}

// Na página não há documento próprio: a raiz desenha só o conteúdo, sem <html>.
delete (Raiz.options as { shellComponent?: unknown }).shellComponent

// A página da demonstração não confirma com window.confirm (ele sempre diz não).
window.confirm = () => true

const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ['/'] }) })

createRoot(document.getElementById('app')!).render(
  <>
    <div className="faixa-demo" role="note">
      <strong>Demonstração.</strong> Os dados ficam só neste aparelho. Código da equipe: <strong>1234</strong>
      {SEM_MESA && '. O cardápio é uma cópia do dia em que a demonstração foi gerada; no app publicado ele vem ao vivo do site do cardápio.'}
    </div>
    <RouterProvider router={router} />
  </>,
)
