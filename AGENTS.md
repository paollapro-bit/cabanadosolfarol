# Notes for future sessions

## What this is

An accessible spoken menu for the Cabana do Sol restaurant. Read `PLAN.md`
first and continue from the lowest unfinished milestone — Milestone 1 (the
guest-facing spoken menu screens) has not been built yet.

## Intended architecture

- TanStack Start app on Netlify, scaffolded from the Netlify `marketing`
  template. The index route must render the menu itself, never template copy.
- `app/data/catalog.ts` — the menu fixture: `categories` and `items`, typed, in
  one module so Milestone 3 can swap it for a database read behind the same
  shape. Do not scatter menu content through components.
- `app/lib/speech.ts` — everything touching the Web Speech API: utterance
  construction, the sequential reading queue, and the price-to-words formatter.
  Keep it out of components so it can be tested directly.
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
