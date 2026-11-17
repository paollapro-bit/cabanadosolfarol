# Notes for future sessions

## What this is

An accessible spoken menu for the Cabana do Sol restaurant. Read `PLAN.md`
first and continue from the lowest unfinished milestone. The central de
atendimento (Milestone 0: guest calls + staff panel) is built; Milestone 1 (the
guest-facing spoken menu screens) has not been built yet, so the index route
currently renders the central.

## Intended architecture

- TanStack Start app on Netlify, scaffolded from the Netlify `marketing`
  template. The index route must render the menu itself, never template copy.
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
  by `tests/reservas.test.ts`. Storage helpers are in `netlify/lib/reservas.ts`.
- `app/components/Equipe.tsx` — frame for every `/equipe/*` screen (staff code,
  unit, section tabs). Report API errors through its `falha`.
- `netlify/functions/chamados.ts`, `equipe-chamados.ts` — the calls API, stored
  in Netlify Blobs via `netlify/lib/armazenamento.ts`.
- `db/schema.ts` — Drizzle schema, from Milestone 3 onward.
- `netlify/functions/` — catalog read and admin mutations, from Milestone 3.

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
- **Never invent restaurant facts.** Phones, addresses and hours stay `null` in
  `app/data/atendimento.ts` until the owner supplies them; the UI handles `null`.
- **Automatic speech is opt-in** ("Respostas faladas"), so screen-reader users
  are not spoken to twice; "Ouvir" buttons always speak.
- **Load-then-save effects use a `carregado` state, not a ref.** Dev StrictMode
  re-runs effects, and a ref lets the defaults overwrite `localStorage`.
- **Photos are uploaded as base64 inside JSON**, not multipart or raw bodies:
  the local Netlify emulation truncates binary request bodies.
- **Every salão photo requires a description** (server-enforced); it is the
  `alt` text and part of the spoken description.
- **A confirmed reservation takes an `ocupacao/<salão>/<data>/<período>` key
  written with `onlyIfNew`** — that atomic write is what prevents double
  booking. Keep it if the storage changes.
- **Staff requests can answer late.** `falha` ignores errors from a previous
  staff code so a stale 401 cannot log out a valid session.
