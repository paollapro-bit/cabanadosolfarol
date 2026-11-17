import type { Config, Context } from '@netlify/functions'
import { fotos } from '../lib/reservas'

// Serve as fotos dos salões. O id nunca é reaproveitado, então o cache é longo.
export default async (_req: Request, context: Context) => {
  const id = context.params.id ?? ''
  const foto = /^[\w-]{1,64}$/.test(id)
    ? await fotos().getWithMetadata(id, { type: 'arrayBuffer' })
    : null
  if (!foto) return new Response('Foto não encontrada.', { status: 404 })
  return new Response(foto.data, {
    headers: {
      'content-type': String(foto.metadata.tipo ?? 'image/jpeg'),
      'cache-control': 'public, max-age=31536000, immutable',
      'x-content-type-options': 'nosniff',
    },
  })
}

export const config: Config = { path: '/api/fotos/:id' }
