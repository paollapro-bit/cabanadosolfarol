# Cardápio Falado Acessível

A spoken, screen-reader-first digital menu for the Cabana do Sol restaurant
(São Luís and Imperatriz, Maranhão — serving since 1994). The goal is that a
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
  `?unidade=sao-luis&mesa=12` from a table QR code) and calls a waiter, asks for
  the bill, asks for accessibility help or sends a short request. The call's
  status (aguardando → a caminho → atendido) is polled, shown and announced.
- `/duvidas` — frequently asked questions, each with an "Ouvir" button.
- `/unidades` — units and contacts. **Address, hours, phone and WhatsApp are
  `null` in `app/data/atendimento.ts` until the restaurant confirms them**; the
  page says so instead of showing unverified data.
- `/equipe` — staff panel listing open calls per unit, protected by a shared
  code. Set the `EQUIPE_PIN` environment variable on the Netlify site (Functions
  scope) and redeploy; without it the panel answers "not configured".

Calls are stored in Netlify Blobs (one store per deploy context) through
`netlify/functions/chamados.ts` and `netlify/functions/equipe-chamados.ts`.

## Planned technologies

- **TanStack Start** on Netlify (scaffolded from the Netlify `marketing` template)
- **Tailwind CSS**, Atkinson Hyperlegible typeface, dark / high-contrast / large-text modes
- **Web Speech API** — `SpeechSynthesis` for reading, `SpeechRecognition` for voice search
- **Netlify DB (Postgres) + Drizzle ORM** for the editable catalog
- **Netlify Identity** for the restaurant's admin area

## Running locally

```bash
npm install
EQUIPE_PIN=1234 npm run dev   # http://localhost:8889, Netlify emulation included
npm test                      # unit tests for the call rules
```

## Roadmap

`PLAN.md` breaks the product into five milestones: the spoken menu surface,
voice search, the managed catalog in Netlify DB, the staff admin area, and the
in-venue rollout (QR codes, offline support, accessibility audit).
