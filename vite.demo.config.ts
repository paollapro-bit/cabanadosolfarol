import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Demonstração estática: o app inteiro num único JS, para uma página sem servidor.
export default defineConfig({
  root: fileURLToPath(new URL('./demo', import.meta.url)),
  resolve: {
    tsconfigPaths: true,
    alias: {
      '~': fileURLToPath(new URL('./app', import.meta.url)),
      'cloudflare:workers': fileURLToPath(new URL('./demo/cloudflare-workers.ts', import.meta.url)),
    },
  },
  plugins: [
    tanstackRouter({
      target: 'react',
      routesDirectory: fileURLToPath(new URL('./app/routes', import.meta.url)),
      generatedRouteTree: fileURLToPath(new URL('./demo/routeTree.demo.gen.ts', import.meta.url)),
      autoCodeSplitting: false,
    }),
    tailwindcss(),
    viteReact(),
  ],
  build: {
    outDir: fileURLToPath(new URL(process.env.VITE_EDICAO === 'sem-mesa' ? './dist-demo-sem-mesa' : './dist-demo', import.meta.url)),
    emptyOutDir: true,
    assetsInlineLimit: 1024 * 1024,
    cssCodeSplit: false,
    modulePreload: false,
  },
})
