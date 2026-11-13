import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';

/** "lorena": versão pessoal com escalas publicadas; "geral": para qualquer pessoa. */
export const PERFIL = __PERFIL__;
export const PERFIL_LORENA = PERFIL === 'lorena';

export const NOME_KEY = 'nome';
export const CODIGO_ACESSO_KEY = 'codigoAcesso';
const NOME_PADRAO = PERFIL_LORENA ? 'Lorena' : '';

/** Nome da pessoa: `undefined` enquanto carrega, "" se ainda não foi indicado. */
export function useNome(): string | undefined {
  const row = useLiveQuery(async () => (await db.settings.get(NOME_KEY)) ?? null, []);
  if (row === undefined) return undefined;
  return typeof row?.value === 'string' && row.value.trim() ? row.value.trim() : NOME_PADRAO;
}

export async function getNome(): Promise<string> {
  const row = await db.settings.get(NOME_KEY);
  return typeof row?.value === 'string' && row.value.trim() ? row.value.trim() : NOME_PADRAO;
}

export async function setNome(nome: string) {
  await db.settings.put({ key: NOME_KEY, value: nome.trim() });
}
