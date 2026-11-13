/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// Perfil "lorena": inclui as escalas publicadas em src/data/escalas e o nome Lorena.
// Perfil "geral": app para qualquer pessoa (pergunta o nome, sem escalas incluídas).
// Na Netlify, o site minha-escala-lorena usa automaticamente o perfil "lorena".
const perfil =
  process.env.VITE_PERFIL ?? (process.env.SITE_NAME === 'minha-escala-lorena' || process.env.VITEST ? 'lorena' : 'geral');

export default defineConfig({
  base: './',
  define: { __PERFIL__: JSON.stringify(perfil) },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: './',
        name: 'Minha Escala',
        short_name: 'Escala',
        description: 'O teu turno de hoje, num relance — mesmo sem internet.',
        lang: 'pt-PT',
        dir: 'ltr',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f2f2f7',
        theme_color: '#f2f2f7',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
  },
});
