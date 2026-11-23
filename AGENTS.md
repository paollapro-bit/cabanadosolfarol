# Notes for future sessions

## What this is

An accessible spoken menu for the Cabana do Sol restaurant. Read `PLAN.md`
first and continue from the lowest unfinished milestone. The central de
atendimento (Milestone 0: guest calls + staff panel) is built; Milestone 1 (the
guest-facing spoken menu screens) has not been built yet, so the index route
currently renders the central.

## Intended architecture

- TanStack Start app on **Cloudflare Workers** (moved from Netlify at the
  owner's request; it is the platform their other apps use). `wrangler.jsonc`
  declares the D1 (`DB`) and KV (`FOTOS`) bindings and `EQUIPE_PIN` secret.
- `app/data/catalog.ts` — the menu fixture: `categories` and `items`, typed, in
  one module so Milestone 3 can swap it for a database read behind the same
  shape. Do not scatter menu content through components.
- `app/lib/speech.ts` — everything touching the Web Speech API: utterance
  construction, the sequential reading queue, and the price-to-words formatter.
  Keep it out of components so it can be tested directly.
- `app/lib/chamados.ts` — pure rules for service calls (validation, ids, status
  transitions, spoken phrases), shared by the browser and the functions and
  covered by `tests/chamados.test.ts`.
- `app/components/Acessibilidade.tsx` — preferences, the single `aria-live`
  region (`anunciar`) and on-demand speech (`ouvir`). Announce through it; do
  not add other live regions.
- `app/lib/reservas.ts` — pure rules for salões and reservations (validation,
  dates in the Maranhão time zone, status transitions, spoken phrases), covered
  by `tests/reservas.test.ts`. Storage helpers are in `app/server/reservas.ts`.
- `app/components/Equipe.tsx` — frame for every `/equipe/*` screen (staff code,
  unit, section tabs). Report API errors through its `falha`.
- `app/routes/api/*` — the API, as TanStack Start server routes
  (`server.handlers`). Server-only code lives in `app/server/` and reads
  bindings via `import { env } from 'cloudflare:workers'`; never import it from
  a component.
- `app/server/armazenamento.ts` — `colecao(nome)`: JSON documents in one D1
  table (`documentos`, created on first use), with an atomic `soSeNovo` write.
  Photos go to KV.

## Conventions and non-obvious decisions

- **All UI copy is Brazilian Portuguese.** No English strings reach the screen
  or the speech synthesiser.
- **Prices are integer cents** (`priceCents`). They are displayed with
  `Intl.NumberFormat('pt-BR', {currency: 'BRL'})` and separately spoken as words;
  floats would corrupt the spoken form.
- **Spoken text is composed, with an override.** A dish is normally read as
  category → name → service type → description → options → price. If the record
  has `spokenText`, that wins verbatim — it exists so staff can fix awkward
  pronunciations.
- **Accessibility is the product, not a layer.** Every action must be reachable
  by keyboard and announced; state changes go through a single `aria-live`
  region; the Atkinson Hyperlegible typeface, high-contrast mode and large-text
  mode are requirements, not preferences.
- **Speech APIs are optional in the browser.** Every call site needs a spoken
  and visible fallback; never leave a blind user with silence and no explanation.
- The reference implementation's menu data can be re-fetched from the public
  endpoint documented in `README.md`.
- **Never invent restaurant facts.** Unit addresses, hours, phones and salões
  come from the official site (cabanadosol.com.br); links and Canva menus come
  from bio.site/cabanadosol. Anything not found there stays `null` or out until
  the owner supplies it. Note: the bio says "42 anos" while the site footer says
  1994; the app says "Desde 1994" until the owner confirms.
- **Automatic speech is opt-in** ("Respostas faladas"), so screen-reader users
  are not spoken to twice; "Ouvir" buttons always speak.
- **Load-then-save effects use a `carregado` state, not a ref.** Dev StrictMode
  re-runs effects, and a ref lets the defaults overwrite `localStorage`.
- **Photos are uploaded as base64 inside JSON**, not multipart or raw bodies
  (the old Netlify emulation truncated binary bodies; kept for simplicity).
- **Every salão photo requires a description** (server-enforced); it is the
  `alt` text and part of the spoken description.
- **A confirmed reservation takes an `ocupacao` key `<salão>/<data>/<período>`
  written with `soSeNovo`** (`INSERT … ON CONFLICT DO NOTHING`) — that atomic
  write is what prevents double booking. Keep it if the storage changes.
- **Staff requests can answer late.** `falha` ignores errors from a previous
  staff code so a stale 401 cannot log out a valid session.
- **The Canva menu is an embed, not data.** `app/lib/cardapio.ts` only parses
  the embed code staff paste; nothing reads the design's text at runtime. Keep
  the screen-reader warning on `/cardapio` until the spoken menu exists.
- **Bottom nav has five tabs** and its labels are capped with
  `min(0.75rem, 3.3vw)` so they fit at 320 px with large text. Check that width
  before adding or renaming a tab.
- **Tests use `vitest.config.ts`, not `vite.config.ts`:** the Cloudflare plugin
  cannot start under vitest, and the tests only cover pure `app/lib` code.
- **The demo (`vite.demo.config.ts`, `demo/`) runs the real API handlers in the
  browser.** Its fake D1 understands only the SQL in `app/server/armazenamento.ts`;
  change both together. `urlDaFoto` checks `globalThis.__demoFotoUrl` for this.
- **The app is only for the two São Luís units**: `litoranea` (Avenida
  Litorânea) and `ponta-do-farol` (Ponta do Farol), defined in `UNIDADES` in
  `app/lib/chamados.ts`. Imperatriz is deliberately out (owner's decision).
