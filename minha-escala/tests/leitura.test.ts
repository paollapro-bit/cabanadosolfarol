import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CODIGO_OUTRO,
  esquemaResposta,
  instrucoesLeitura,
  normalizarResultado,
  PedidoInvalido,
  validarPedido,
  type ResultadoLeitura,
} from '../src/lib/leitura';

const turnos = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C', 'D'].map((codigo) => ({ codigo, descricao: codigo }));
const pedido = { imagem: 'A'.repeat(200), tipo: 'image/jpeg', nome: 'Lorena Mineiro', ano: 2026, mes: 11, turnos };

describe('validação do pedido', () => {
  it('aceita um pedido correto', () => {
    expect(validarPedido(pedido).nome).toBe('Lorena Mineiro');
  });
  it('rejeita pedidos inválidos com mensagens em português', () => {
    expect(() => validarPedido({ ...pedido, imagem: '' })).toThrow('Falta a fotografia');
    expect(() => validarPedido({ ...pedido, tipo: 'image/heic' })).toThrow(PedidoInvalido);
    expect(() => validarPedido({ ...pedido, nome: 'L' })).toThrow('nome');
    expect(() => validarPedido({ ...pedido, mes: 13 })).toThrow('Mês');
    expect(() => validarPedido({ ...pedido, turnos: [{ codigo: 'A1; DROP', descricao: '' }] })).toThrow('Código');
    expect(() => validarPedido({ ...pedido, imagem: 'A'.repeat(6_000_000) })).toThrow('grande');
  });
});

describe('esquema e instruções', () => {
  it('limita os códigos aos turnos da pessoa', () => {
    const e = esquemaResposta(['A1', 'D']);
    expect(e.properties.dias.items.properties.codigo.enum).toEqual(['A1', 'D', '', CODIGO_OUTRO]);
  });
  it('indica o número de dias do mês', () => {
    expect(instrucoesLeitura({ ...pedido, mes: 2, ano: 2027 })).toContain('dias 1 a 28');
  });
});

describe('normalização da resposta', () => {
  const bruto: ResultadoLeitura = {
    pessoa_encontrada: true,
    nome_na_folha: 'Lorena Mineiro',
    nomes_na_folha: ['Lorena Mineiro'],
    mes_na_folha: '2026-11',
    dias: [
      { dia: 6, codigo: 'A3', texto_lido: 'A3', certeza: 'alta' },
      { dia: 6, codigo: 'B3', texto_lido: 'B3', certeza: 'alta' }, // repetido
      { dia: 31, codigo: 'A1', texto_lido: 'A1', certeza: 'alta' }, // não existe em novembro
      { dia: 7, codigo: 'ZZ', texto_lido: 'FE', certeza: 'alta' }, // código desconhecido
    ],
    observacoes: '',
  };
  it('devolve uma entrada por dia e descarta lixo', () => {
    const r = normalizarResultado(bruto, 2026, 11, ['A1', 'A3', 'B3']);
    expect(r.dias).toHaveLength(30);
    expect(r.dias[5]).toMatchObject({ dia: 6, codigo: 'A3' });
    expect(r.dias[6]).toMatchObject({ dia: 7, codigo: CODIGO_OUTRO, texto_lido: 'FE' });
    expect(r.dias[0]).toMatchObject({ dia: 1, codigo: '', certeza: 'baixa' });
  });
});

describe('função ler-escala', () => {
  const create = vi.fn();
  const setEnv = (vars: Record<string, string>) => {
    (globalThis as unknown as { Netlify: unknown }).Netlify = { env: { get: (k: string) => vars[k] } };
  };

  beforeEach(() => {
    vi.resetModules();
    create.mockReset();
    vi.doMock('@anthropic-ai/sdk', async () => {
      const real = await vi.importActual<typeof import('@anthropic-ai/sdk')>('@anthropic-ai/sdk');
      class Fake {
        static RateLimitError = real.default.RateLimitError;
        static BadRequestError = real.default.BadRequestError;
        static AuthenticationError = real.default.AuthenticationError;
        static APIError = real.default.APIError;
        messages = { create };
      }
      return { default: Fake };
    });
    setEnv({ ANTHROPIC_API_KEY: 'x' });
  });
  afterEach(() => {
    vi.doUnmock('@anthropic-ai/sdk');
  });

  const call = async (body: unknown, headers: Record<string, string> = {}) => {
    const { default: handler } = await import('../netlify/functions/ler-escala.mts');
    return handler(new Request('https://x/api/ler-escala', { method: 'POST', body: JSON.stringify(body), headers }));
  };
  const resposta = (extra: Partial<ResultadoLeitura>) => ({
    stop_reason: 'end_turn',
    content: [
      {
        type: 'text',
        text: JSON.stringify({ pessoa_encontrada: true, nome_na_folha: 'Lorena Mineiro', nomes_na_folha: [], mes_na_folha: '', dias: [], observacoes: '', ...extra }),
      },
    ],
  });

  it('envia a imagem ao Claude e devolve a leitura normalizada', async () => {
    create.mockResolvedValue(resposta({ dias: [{ dia: 6, codigo: 'A3', texto_lido: 'A3', certeza: 'alta' }] }));
    const res = await call(pedido);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.dias).toHaveLength(30);
    expect(json.dias[5].codigo).toBe('A3');
    const args = create.mock.calls[0][0];
    expect(args.model).toBe('claude-opus-5-5');
    expect(args.output_config.format.type).toBe('json_schema');
    expect(args.messages[0].content[0]).toMatchObject({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg' } });
  });

  it('responde 400 a pedidos inválidos sem chamar a IA', async () => {
    const res = await call({ ...pedido, nome: '' });
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it('trata recusas como erro amigável', async () => {
    create.mockResolvedValue({ stop_reason: 'refusal', content: [] });
    expect((await call(pedido)).status).toBe(422);
  });

  it('avisa quando a IA não está ativa no site', async () => {
    setEnv({});
    expect((await call(pedido)).status).toBe(503);
  });

  it('exige o código de acesso quando está configurado', async () => {
    setEnv({ ANTHROPIC_API_KEY: 'x', ESCALA_CODIGO_ACESSO: 'cafe' });
    expect((await call(pedido)).status).toBe(401);
    create.mockResolvedValue(resposta({ pessoa_encontrada: false, nomes_na_folha: ['Ana'] }));
    expect((await call(pedido, { 'x-codigo-acesso': 'cafe' })).status).toBe(200);
  });
});
