import { createFileRoute } from '@tanstack/react-router'
import { ehUnidade } from '~/lib/chamados'
import {
  FOTO_TAMANHO_MAXIMO,
  FOTO_TIPOS,
  FOTOS_POR_SALAO,
  validarDescricaoDaFoto,
  validarSalao,
  type Salao,
} from '~/lib/reservas'
import { erro, json, recusaDaEquipe } from '~/server/armazenamento'
import { apagarFoto, apagarSalao, gravarFoto, gravarSalao, lerSalao, listarSaloes } from '~/server/reservas'

function base64ParaBytes(texto: string) {
  try {
    return Uint8Array.from(atob(texto), (c) => c.charCodeAt(0))
  } catch {
    return new Uint8Array()
  }
}

// Envio de foto: JSON com a imagem em base64 ({ foto: { salaoId, descricao, tipo, dados } }).
async function enviarFoto(foto: Record<string, unknown>) {
  const salao = await lerSalao(String(foto.salaoId ?? ''))
  if (!salao) return erro('Salão não encontrado.', 404)
  if (salao.fotos.length >= FOTOS_POR_SALAO) {
    return erro(`Cada salão pode ter até ${FOTOS_POR_SALAO} fotos. Remova uma antes de enviar outra.`, 400)
  }
  const descricao = validarDescricaoDaFoto(foto.descricao)
  if (!descricao.ok) return erro(descricao.erro, 400)
  const tipo = String(foto.tipo ?? '')
  if (!FOTO_TIPOS.includes(tipo) || typeof foto.dados !== 'string') {
    return erro('Envie uma foto em JPEG, PNG ou WebP.', 400)
  }
  const bytes = base64ParaBytes(foto.dados)
  if (bytes.byteLength === 0) return erro('A foto chegou vazia. Tente de novo.', 400)
  if (bytes.byteLength > FOTO_TAMANHO_MAXIMO) return erro('A foto pode ter até 4 MB.', 400)
  const id = crypto.randomUUID()
  await gravarFoto(id, bytes, tipo)
  salao.fotos.push({ id, descricao: descricao.dados })
  await gravarSalao(salao)
  return json({ salao }, 201)
}

async function salvar(request: Request, metodo: 'POST' | 'PUT') {
  const recusa = await recusaDaEquipe(request)
  if (recusa) return recusa
  const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (metodo === 'POST' && corpo?.foto && typeof corpo.foto === 'object') {
    return enviarFoto(corpo.foto as Record<string, unknown>)
  }
  const validacao = validarSalao(corpo)
  if (!validacao.ok) return json({ erro: validacao.erro, campo: validacao.campo }, 400)
  let salao: Salao
  if (metodo === 'PUT') {
    const existente = typeof corpo?.id === 'string' ? await lerSalao(corpo.id) : null
    if (!existente) return erro('Salão não encontrado.', 404)
    salao = { ...existente, ...validacao.dados }
  } else {
    salao = { ...validacao.dados, id: crypto.randomUUID(), fotos: [], criadoEm: Date.now() }
  }
  await gravarSalao(salao)
  return json({ salao }, metodo === 'POST' ? 201 : 200)
}

// Cadastro dos salões pela equipe: dados, e fotos com descrição obrigatória.
export const Route = createFileRoute('/api/equipe/saloes')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const recusa = await recusaDaEquipe(request)
        if (recusa) return recusa
        const unidade = new URL(request.url).searchParams.get('unidade')
        if (!ehUnidade(unidade)) return erro('Unidade inválida.', 400)
        return json({ saloes: await listarSaloes(unidade) })
      },

      POST: ({ request }) => salvar(request, 'POST'),
      PUT: ({ request }) => salvar(request, 'PUT'),

      DELETE: async ({ request }) => {
        const recusa = await recusaDaEquipe(request)
        if (recusa) return recusa
        const url = new URL(request.url)
        const salao = await lerSalao(url.searchParams.get('id') ?? '')
        if (!salao) return erro('Salão não encontrado.', 404)
        const fotoId = url.searchParams.get('foto')
        if (fotoId) {
          if (!salao.fotos.some((f) => f.id === fotoId)) return erro('Foto não encontrada.', 404)
          salao.fotos = salao.fotos.filter((f) => f.id !== fotoId)
          await gravarSalao(salao)
          await apagarFoto(fotoId)
          return json({ salao })
        }
        await apagarSalao(salao)
        return json({ ok: true })
      },
    },
  },
})
