// Gera os ícones PNG (iPhone não aceita SVG como ícone) a partir de public/favicon.svg.
// Uso: npm run icons   (requer Playwright/Chromium instalado)
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const root = fileURLToPath(new URL('..', import.meta.url));
const svg = readFileSync(`${root}public/favicon.svg`, 'utf8');
const browser = await chromium.launch();
const page = await browser.newPage();

async function render(file, size, { maskable = false, fullBleed = false } = {}) {
  await page.setViewportSize({ width: size, height: size });
  // Ícones do iPhone e "maskable": fundo inteiro, sem cantos arredondados (o sistema arredonda).
  const inner = fullBleed || maskable ? svg.replace('rx="112"', 'rx="0"') : svg;
  const scale = maskable ? 0.8 : 1;
  await page.setContent(
    `<html><body style="margin:0;background:${maskable ? '#5b38dc' : 'transparent'};display:grid;place-items:center;height:100vh">
      <div style="width:${size * scale}px;height:${size * scale}px">${inner.replace('<svg ', '<svg width="100%" height="100%" ')}</div>
    </body></html>`,
  );
  await page.screenshot({ path: `${root}public/${file}`, omitBackground: !maskable && !fullBleed });
}

await render('icon-192.png', 192);
await render('icon-512.png', 512);
await render('icon-maskable-512.png', 512, { maskable: true });
await render('apple-touch-icon.png', 180, { fullBleed: true });
await browser.close();
console.log('Ícones gerados em public/');
