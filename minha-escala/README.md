# Minha Escala

Aplicação (PWA) para a Lorena consultar e editar a escala de turnos da cafetaria.
Abre diretamente no turno de hoje e funciona **sem internet** depois de instalada.

## Funcionalidades

- **Ecrã inicial**: “Olá, Lorena”, data de hoje (fuso Europe/Lisbon) e um cartão enorme com
  o turno do dia (horas de entrada e saída em destaque, tipo, função e código), folga
  (“Aproveita o teu descanso!”) ou “Sem turno registado”. O cartão **desliza para os lados**
  para ver os outros dias com escala (até 7 dias para trás), com setas e botão “Hoje”.
  Tocar no cartão abre o dia para editar.
- **Atualização mensal**: cada mês é um ficheiro em `src/data/escalas/`; ao publicar uma
  versão nova da app, o iPhone aplica o mês sozinho sem tocar nos dias alterados à mão.
  Ver [ESCALAS.md](ESCALAS.md).
- **Ver outros dias**: calendário mensal (ou lista) com cores por tipo — abertura (âmbar),
  fecho (índigo), intermédio (rosa), folga (verde) e sem escala (tracejado).
  Navegação mês a mês e seletor de mês/ano.
- **Edição rápida**: botões A1 A2 A3 B1 B2 B3 C D, “Sem escala”, observações e a opção
  “Avançar para o dia seguinte” para preencher um mês inteiro em poucos toques.
- **Editar vários dias** de uma vez (inclui “Selecionar dias vazios”).
- Cada alteração é **guardada automaticamente** em IndexedDB (Dexie).
- **Escala de novembro de 2026** (`src/data/escalas/2026-11.json`) importada na primeira
  abertura, marcada com um ponto azul “por conferir” até ser confirmada.
- Semana atual, próxima folga, próximo turno e resumo do mês (dias de trabalho, folgas,
  dias sem escala, horas líquidas com intervalo configurável).
- Partilha por **WhatsApp** (semana ou mês) e folha de partilha do iPhone.
- **Cópia de segurança** (JSON) e restauro; exportação para o Calendário (.ics) e CSV.
- Edição de horários e funções de cada código; modo claro/escuro/automático.
- Indicador discreto “Offline”.
- **Fotografias de escalas**: é possível guardar a fotografia de cada mês para conferir.
  *Não existe reconhecimento automático*; a arquitetura está preparada em
  `src/lib/importers/` (interface `ScheduleImporter`, `photoImporter.available = false`).

## Comandos

```bash
npm install
npm run dev        # desenvolvimento em http://localhost:5173
npm test           # testes (datas, horas, base de dados, cópias, exportação)
npm run build      # gera dist/ com service worker e manifest
npm run preview    # serve dist/ para testar o modo offline
npm run icons      # regenera os PNG a partir de public/favicon.svg (requer Playwright)
```

## Publicar e instalar no iPhone

1. Publica a pasta `dist/` num alojamento estático com **HTTPS** (Netlify, Vercel,
   GitHub Pages…). Na Netlify, usa *Base directory* `minha-escala` — o `netlify.toml` já
   está configurado. O `base: './'` permite publicar também numa subpasta.
2. No iPhone, abre o endereço no **Safari** → botão Partilhar → **Adicionar ao ecrã principal**.
3. Abre a aplicação uma vez com internet; a partir daí funciona offline.

> Os dados ficam só no iPhone. Apagar os dados do Safari ou remover a aplicação do ecrã
> principal apaga a escala — faz uma cópia em **Definições → Cópia de segurança**.

## Estrutura

```
src/
  App.tsx              arranque, base de dados, rotas (#/, #/calendario, #/definicoes)
  db/db.ts             esquema Dexie: days, shifts, settings, attachments
  db/seed.ts           turnos predefinidos + aplicação dos meses publicados (cada arranque)
  data/escalas/        um ficheiro JSON por mês (ver ESCALAS.md)
  db/repo.ts           gravação de dias, observações, turnos e definições
  lib/dates.ts         datas AAAA-MM-DD, "hoje" em Lisboa, grelha do mês (segunda→domingo)
  lib/shifts.ts        códigos, tipos e cálculo de horas
  lib/summary.ts       resumo mensal, próxima folga/turno, estado do turno
  lib/backup.ts        cópia de segurança JSON (validação + restauro)
  lib/export.ts        CSV, ICS e gravação/partilha de ficheiros
  lib/share.ts         texto e ligação para WhatsApp
  lib/importers/       ponto de extensão para importar fotografias (ainda sem OCR)
  screens/             Início, Calendário, Definições
  components/          cartão de hoje, semana, folhas, teclado de códigos…
tests/                 Vitest + fake-indexeddb
```

## O que foi testado

- `npm test`: 31 testes — atualização mensal (mês novo, correções que respeitam edições
  manuais, validação dos ficheiros), dias do cartão deslizante, — fuso de Lisboa (incl. mudança de hora), grelha do mês, horas
  líquidas, resumo de novembro (17 dias de trabalho, 8 folgas, 5 sem escala, 136 h com
  45 min de intervalo), importação inicial que não sobrescreve edições, edição múltipla,
  observações, cópia/restauro e exportações.
- Emulação de iPhone 13 (Chromium/Playwright): ecrã de hoje (trabalho, folga, sem turno),
  calendário, edição de um e de vários dias, lista, definições em modo escuro,
  persistência após recarregar e **abertura sem rede** através do service worker.

Ainda por testar num iPhone real: instalação a partir do Safari, folha de partilha de
ficheiros (cópia/ICS) e partilha para o WhatsApp.
