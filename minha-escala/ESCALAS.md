# Atualizar a escala todos os meses

A Lorena (ou quem a ajuda) envia a escala do mês — fotografia, PDF ou captura de
ecrã — numa conversa com o Claude. O Claude transcreve-a para um ficheiro de
dados, testa e publica uma nova versão da aplicação. Quando a Lorena volta a
abrir a app no iPhone (com internet), a escala nova aparece sozinha.

## Formato

Um ficheiro por mês em `src/data/escalas/AAAA-MM.json`:

```json
{
  "mes": "2026-12",
  "versao": 1,
  "origem": "Fotografia enviada a 28/11/2026",
  "dias": {
    "01": "A3",
    "02": "D",
    "03": "B1"
  },
  "observacoes": {
    "24": "Fecha às 16h"
  }
}
```

- `dias`: dia do mês → código (`A1 A2 A3 B1 B2 B3 C D`). Dias que não aparecem
  ficam “sem escala”. Nunca inventar dias que não estão no documento.
- `versao`: começa em 1. **Para corrigir um mês já publicado, editar o ficheiro e
  aumentar a versão** (2, 3…); sem isso o iPhone não volta a aplicar o mês.
- `observacoes`: opcional.

## O que acontece no iPhone

- Mês novo: os dias são adicionados e marcados a azul (“por conferir”), e o ecrã
  inicial mostra o aviso “Chegou a escala de …”.
- Correção (versão nova): os dias importados ou já conferidos passam a ter o valor
  corrigido. **Os dias que a Lorena alterou à mão nunca são substituídos** — o aviso
  indica quais ficaram como ela os deixou.
- As observações escritas pela Lorena mantêm-se sempre.

## Passos para publicar (Claude)

1. Transcrever o documento para `src/data/escalas/AAAA-MM.json` e mostrar a
   transcrição à Lorena para confirmar, assinalando o que estiver ilegível.
2. `npm test` (valida todos os ficheiros: mês, dias existentes, códigos) e `npm run build`.
3. Commit e push no ramo `minha-escala`.
4. Publicar na Netlify, projeto `minha-escala-lorena` (deploy a partir desta pasta).
