# Cardápio Falado Acessível — Cabana do Sol

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

## Planned technologies

- **TanStack Start** on Netlify (scaffolded from the Netlify `marketing` template)
- **Tailwind CSS**, Atkinson Hyperlegible typeface, dark / high-contrast / large-text modes
- **Web Speech API** — `SpeechSynthesis` for reading, `SpeechRecognition` for voice search
- **Netlify DB (Postgres) + Drizzle ORM** for the editable catalog
- **Netlify Identity** for the restaurant's admin area

## Running locally

```bash
npm install
netlify dev --port 8889
```

## Roadmap

`PLAN.md` breaks the product into five milestones: the spoken menu surface,
voice search, the managed catalog in Netlify DB, the staff admin area, and the
in-venue rollout (QR codes, offline support, accessibility audit).
