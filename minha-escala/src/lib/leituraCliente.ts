import { CODIGO_ACESSO_KEY } from './perfil';
import { db } from '../db/db';
import { LEITURA_PATH, type PedidoLeitura, type ResultadoLeitura } from './leitura';

export class ErroLeitura extends Error {}

/** Envia a fotografia para a função do servidor e devolve a leitura. */
export async function lerEscala(pedido: PedidoLeitura, signal?: AbortSignal): Promise<ResultadoLeitura> {
  if (!navigator.onLine) throw new ErroLeitura('Sem internet. A leitura da fotografia precisa de ligação; o resto da app funciona offline.');
  const codigo = (await db.settings.get(CODIGO_ACESSO_KEY))?.value;
  let res: Response;
  try {
    res = await fetch(new URL(LEITURA_PATH.replace(/^\//, ''), document.baseURI), {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(typeof codigo === 'string' && codigo ? { 'x-codigo-acesso': codigo } : {}) },
      body: JSON.stringify(pedido),
      signal,
    });
  } catch (e) {
    if ((e as DOMException)?.name === 'AbortError') throw e;
    throw new ErroLeitura('Não foi possível contactar o servidor. Verifica a internet e tenta outra vez.');
  }
  if (res.status === 429) throw new ErroLeitura('Muitas leituras seguidas. Espera um minuto e tenta outra vez.');
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ErroLeitura(body?.erro ?? `O servidor respondeu com erro (${res.status}).`);
  return body as ResultadoLeitura;
}
