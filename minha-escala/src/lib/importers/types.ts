import type { ISODate } from '../dates';

/** Uma linha proposta por um importador, sempre revista pela utilizadora antes de gravar. */
export interface ProposedDay {
  date: ISODate;
  code: string | null;
  /** 0–1: confiança do reconhecimento, quando existir. */
  confidence?: number;
}

/**
 * Ponto de extensão para importar escalas de outras fontes (fotografia, PDF…).
 * Um importador devolve propostas; nunca escreve diretamente na base de dados.
 */
export interface ScheduleImporter {
  id: string;
  label: string;
  /** false enquanto o importador não estiver realmente implementado. */
  available: boolean;
  accept: string;
  parse(file: File, context: { year: number; month: number }): Promise<ProposedDay[]>;
}
