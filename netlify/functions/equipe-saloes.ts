import type { Config } from '@netlify/functions'
import { randomUUID } from 'node:crypto'
import { ehUnidade } from '../../app/lib/chamados'
import {
  FOTO_TAMANHO_MAXIMO,
  FOTO_TIPOS,
  FOTOS_POR_SALAO,
  validarDescricaoDaFoto,
  validarSalao,
  type Salao,
} from '../../app/lib/reservas'
import { erro, json, recusaDaEquipe } from '../lib/armazenamento'
import { apagarSalao, fotos, gravarSalao, lerSalao, listarSaloes } from '../lib/reservas'

// Cadastro dos salões pela equipe: dados, e fotos com descrição obrigatória.
export default async (req: Request) => {
  const recusa = recusaDaEquipe(req)
  if (recusa) return recusa
  const url = new URL(req.url)

  if (req.method === 'GET') {
    const unidade = url.searchParams.get('unidade')
    if (!ehUnidade(unidade)) return erro('Unidade inválida.', 400)
    return json({ saloes: await listarSaloes(unidade) })
  }

  // Envio de foto: JSON com a imagem em base64 ({ foto: { salaoId, descricao, tipo, dados } }).
  const corpoJson =
    req.method === 'POST' || req.method === 'PUT'
      ? ((await req.json().catch(() => null)) as Record<string, unknown> | null)
      : null
  const foto = corpoJson?.foto as Record<string, unknown> | undefined
  if (req.method === 'POST' && foto && typeof foto === 'object') {
    const salao = await lerSalao(String(foto.salaoId ?? ''))
    if (!salao) return erro('Salão não encontrado.', 404)
    if (salao.fotos.length >= FOTOS_POR_SALAO) {
      return erro(`Cada salão pode ter até ${FOTOS_POR_SALAO} fotos. Remova uma antes de enviar outra.`, 400)
    }
    const descricao = validarDescricaoDaFoto(foto.descricao)
    if (!descricao.ok) return erro(descricao.erro, 400)
    const tipoDaFoto = String(foto.tipo ?? '')
    if (!FOTO_TIPOS.includes(tipoDaFoto) || typeof foto.dados !== 'string') {
      return erro('Envie uma foto em JPEG, PNG ou WebP.', 400)
    }
    const bytes = Buffer.from(foto.dados, 'base64')
    if (bytes.byteLength === 0) return erro('A foto chegou vazia. Tente de novo.', 400)
    if (bytes.byteLength > FOTO_TAMANHO_MAXIMO) return erro('A foto pode ter até 4 MB.', 400)
    const id = randomUUID()
    await fotos().set(id, new Blob([bytes]), { metadata: { tipo: tipoDaFoto } })
    salao.fotos.push({ id, descricao: descricao.dados })
    await gravarSalao(salao)
    return json({ salao }, 201)
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    const corpo = corpoJson as { id?: unknown } | null
    const validacao = validarSalao(corpo)
    if (!validacao.ok) return json({ erro: validacao.erro, campo: validacao.campo }, 400)
    let salao: Salao
    if (req.method === 'PUT') {
      const existente = typeof corpo?.id === 'string' ? await lerSalao(corpo.id) : null
      if (!existente) return erro('Salão não encontrado.', 404)
      salao = { ...existente, ...validacao.dados }
    } else {
      salao = { ...validacao.dados, id: randomUUID(), fotos: [], criadoEm: Date.now() }
    }
    await gravarSalao(salao)
    return json({ salao }, req.method === 'POST' ? 201 : 200)
  }

  if (req.method === 'DELETE') {
    const salao = await lerSalao(url.searchParams.get('id') ?? '')
    if (!salao) return erro('Salão não encontrado.', 404)
    const fotoId = url.searchParams.get('foto')
    if (fotoId) {
      if (!salao.fotos.some((f) => f.id === fotoId)) return erro('Foto não encontrada.', 404)
      salao.fotos = salao.fotos.filter((f) => f.id !== fotoId)
      await gravarSalao(salao)
      await fotos().delete(fotoId)
      return json({ salao })
    }
    await apagarSalao(salao)
    return json({ ok: true })
  }

  return erro('Método não permitido.', 405)
}

export const config: Config = { path: '/api/equipe/saloes' }
