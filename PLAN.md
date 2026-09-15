# Product roadmap — Cardápio Falado Acessível

A spoken menu for Cabana do Sol. Each milestone is self-contained and leaves the
product usable.

## Milestone 1 — The spoken menu surface

Scaffold the app and build the guest-facing screens with the menu as a typed
fixture module (`app/data/catalog.ts`), so the reading experience can be
finished before any database exists.

- Mobile-first shell: brand header, bottom navigation (Início / Categorias /
  Buscar / Ouvir tudo), skip link, `aria-live` announcement region.
- **Home** — eyebrow "Desde 1994 · São Luís e Imperatriz", the invitation
  "Um cardápio falado, simples e acessível para você escolher com autonomia.",
  and large primary actions: hear the house presentation, hear the category
  list, hear the complete menu, open the menu, search.
- **Categories** — all 25 categories, each announcing how many items it holds.
- **Category** — the dishes in order, with continuous sequential reading
  ("1º item…", "2º item…") that can be paused, repeated and skipped.
- **Item detail** — name, optional code, service type, description, options,
  price, plus previous / next navigation within the category.
- Speech engine: `pt-BR` utterances, selectable rate, and a price-to-words
  formatter so `12750` is read "cento e vinte e sete reais e cinquenta centavos".
- Accessibility controls: large text, high contrast, dark mode, all toggles
  exposed with `aria-pressed`.
- Persistent "reading now" dock with pause / repeat / previous / next / stop.

## Milestone 2 — Voice search

- Text search across dish name, description, options and category.
- Microphone search via `SpeechRecognition` with spoken results ("Encontrei 3
  resultados: …") and clear, spoken recovery messages when the microphone is
  blocked or the browser has no support.
- Graceful degradation to text search wherever recognition is unavailable.

## Milestone 3 — The managed catalog

- Netlify DB schema in `db/schema.ts`: `categories` (name, note, sort order) and
  `items` (category, code, name, description, price in cents, service type, unit
  count, options text, optional pre-written spoken text, active flag).
- Seed from the Milestone 1 fixture, then read the catalog through a Netlify
  function so menu changes no longer require a deploy.
- Keep prices as integer cents end to end — the spoken formatter depends on it.

## Milestone 4 — Staff admin area

- Netlify Identity login gating `/admin`, restricted to the admin role.
- Create and edit categories and dishes, reorder them, and toggle a dish
  inactive when it is off the menu for the day.
- Per-dish override of the spoken text, so staff can fix a pronunciation
  without a developer.

## Milestone 5 — In-venue rollout

- Printable QR table cards that open the menu directly.
- Offline caching of the last-loaded catalog for weak restaurant Wi-Fi.
- Screen-reader pass on VoiceOver and TalkBack, plus a contrast and
  focus-order audit against WCAG 2.2 AA.
