import type { ScheduleImporter } from './types';

/**
 * Reconhecimento automático de fotografias de escalas: AINDA NÃO IMPLEMENTADO.
 *
 * A aplicação já permite guardar a fotografia de cada mês (tabela `attachments`)
 * para a Lorena conferir enquanto preenche. Quando existir um motor de OCR
 * (por exemplo Tesseract.js a correr no dispositivo, para continuar offline),
 * basta implementar `parse` e mudar `available` para true: o ecrã de revisão
 * recebe `ProposedDay[]` e só grava depois de confirmado.
 */
export const photoImporter: ScheduleImporter = {
  id: 'fotografia',
  label: 'Fotografia da escala',
  available: false,
  accept: 'image/*',
  async parse() {
    throw new Error('O reconhecimento automático de fotografias ainda não está disponível.');
  },
};
