# Cardápio Falado Acessível

A spoken, screen-reader-first digital menu for the Cabana do Sol restaurant
(São Luís, Maranhão — serving since 1994; this app serves the two São Luís units,
Avenida Litorânea and Ponta do Farol). The goal is that a
blind or low-vision guest can browse the full menu, hear every dish read aloud
in Brazilian Portuguese with its price spoken in words, and choose on their own,
without asking a waiter to read the menu to them.

## Current state

This repository holds the product definition and roadmap. The reference
implementation at `https://cardapio-ace-khnevlcx.manus.space/` was analysed in
detail and the full menu (25 categories, 242 items with codes, descriptions,
service types, options and prices in cents) is available from its public
endpoint:

```
curl 'https://cardapio-ace-khnevlcx.manus.space/api/trpc/menu.catalog?input=%7B%22json%22%3Anull%2C%22meta%22%3A%7B%22values%22%3A%5B%22undefined%22%5D%7D%7D'
```

That response is the source for the menu fixture in Milestone 1. See `PLAN.md`
for the numbered build order.

## Central de atendimento (built)

The first thing built in this repository is the guest service hub, not the menu:

- `/` — the guest picks the unit and table number (or arrives with
  `?unidade=litoranea&mesa=12` or `?unidade=ponta-do-farol&mesa=12` from a table QR code) and calls a waiter, asks for
  the bill, asks for accessibility help or sends a short request. The call's
  status (aguardando → a caminho → atendido) is polled, shown and announced.
- External channels (reservations WhatsApp for São Luís, bakery orders, delivery
  app) are listed in `canais` in `app/data/atendimento.ts` and shown on the home,
  units and reservations screens.
- `/delivery` — São Luís delivery line: the 8 numbers from the @cabanadosol
  Instagram post (DDD 98 assumed; the post shows none), plus the bakery and
  delivery-app links.
- `/cardapio` — the visual menu, embedded live from Canva. Staff paste the
  Canva embed code once at `/equipe/cardapio`. Only the design's owner or an
  editor can generate that code (a plain view link does not embed), so a menu in
  a designer's account needs the designer to send it; Canva keeps the embed on the
  latest version, so edits in Canva show up with no redeploy. The page warns
  screen-reader users up front that this menu is an image and offers help at
  the table or by phone instead — the spoken text menu is still Milestone 1.
- `/duvidas` — frequently asked questions, each with an "Ouvir" button.
- `/unidades` — units and contacts. **Address, hours, phone and WhatsApp are
  `null` in `app/data/atendimento.ts` until the restaurant confirms them**; the
  page says so instead of showing unverified data.
- `/equipe` — staff panel listing open calls per unit, protected by a shared
  code. Set it with `npx wrangler secret put EQUIPE_PIN`; without it the panel
  answers "not configured".

- `/reservas` — the guest picks unit, date and period (almoço / jantar), sees
  each salão with its capacity, description and photos, and sends a reservation
  request (people, name, phone). The request is **pending until staff confirm
  it**; a confirmed reservation blocks that salão for that date and period.
- `/equipe/reservas` — staff confirm, refuse or cancel requests, with call and
  WhatsApp links to the guest.
- `/equipe/saloes` — staff register each salão (name, capacity, description) and
  upload up to 8 photos. Every photo needs a description; it is the `alt` text
  and what blind guests hear. No salão ships in the code — the list starts empty.

Calls, salões, reservations and the menu link are JSON documents in Cloudflare
**D1**; salão photos are in Cloudflare **KV**. The API is TanStack Start server
routes under `app/routes/api/`, backed by `app/server/`. Reservations hold a name and phone, so
they are readable only with the per-reservation secret or the staff code, and
are deleted 30 days after their date.

## Technologies

- **TanStack Start** on **Cloudflare Workers** (`@cloudflare/vite-plugin`), with
  D1 and KV bindings declared in `wrangler.jsonc`
- **Tailwind CSS**, Atkinson Hyperlegible typeface, dark / high-contrast / large-text modes
- **Web Speech API** — `SpeechSynthesis` for reading, `SpeechRecognition` for voice search
- Planned: a relational catalog in D1 and a real staff login (Milestones 3–4)

## Running locally

```bash
npm install
echo EQUIPE_PIN=1234 > .dev.vars
npm run dev    # http://localhost:8889, runs inside workerd with local D1 and KV
npm test       # unit tests for the pure rules in app/lib
```

## Demo without a server

`npm run build:demo` builds the whole app into one JS file (`dist-demo/`) that runs
with no server: `demo/cloudflare-workers.ts` stands in for `cloudflare:workers`,
imitating D1 and KV in `localStorage`, and `demo/main.tsx` routes `/api/*` fetches
to the real route handlers. Data stays on the viewer's device. It is published as
a private Claude page for the owner to try the app before the Cloudflare deploy.

## Deploying to Cloudflare

Once, create the resources and put their ids in `wrangler.jsonc` (the committed
ids are local placeholders):

```bash
npx wrangler d1 create cabana-do-sol
npx wrangler kv namespace create FOTOS
npx wrangler secret put EQUIPE_PIN
```

Then `npm run deploy`. The `documentos` table is created on first use, so there
is no migration step.

## Roadmap

`PLAN.md` breaks the product into five milestones: the spoken menu surface,
voice search, the managed catalog in a database, the staff admin area, and the
in-venue rollout (QR codes, offline support, accessibility audit).
