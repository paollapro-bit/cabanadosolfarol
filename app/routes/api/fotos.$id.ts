import { createFileRoute } from '@tanstack/react-router'
import { lerFoto } from '~/server/reservas'

// Serve as fotos dos salões. O id nunca é reaproveitado, então o cache é longo.
export const Route = createFileRoute('/api/fotos/$id')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const foto = await lerFoto(params.id)
        if (!foto) return new Response('Foto não encontrada.', { status: 404 })
        return new Response(foto.bytes, {
          headers: {
            'content-type': foto.tipo,
            'cache-control': 'public, max-age=31536000, immutable',
            'x-content-type-options': 'nosniff',
          },
        })
      },
    },
  },
})
