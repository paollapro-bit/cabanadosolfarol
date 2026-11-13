import Anthropic from '@anthropic-ai/sdk';
import type { Config } from '@netlify/functions';
import {
  esquemaResposta,
  instrucoesLeitura,
  normalizarResultado,
  PedidoInvalido,
  SISTEMA_LEITURA,
  validarPedido,
  type ResultadoLeitura,
} from '../../src/lib/leitura';

/**
 * Lê a fotografia de uma escala com o Claude e devolve a linha da pessoa pedida.
 * As credenciais vêm do Netlify AI Gateway (ANTHROPIC_API_KEY / ANTHROPIC_BASE_URL
 * injetados automaticamente); se definires a tua própria ANTHROPIC_API_KEY, é essa a usada.
 * Opcional: ESCALA_CODIGO_ACESSO obriga a app a enviar esse código (cabeçalho x-codigo-acesso).
 */
const erro = (status: number, mensagem: string) => Response.json({ erro: mensagem }, { status });

export default async (req: Request) => {
  const codigoAcesso = Netlify.env.get('ESCALA_CODIGO_ACESSO');
  if (codigoAcesso && req.headers.get('x-codigo-acesso') !== codigoAcesso) {
    return erro(401, 'Código de acesso em falta ou errado. Confirma-o nas Definições.');
  }
  if (!Netlify.env.get('ANTHROPIC_API_KEY')) {
    return erro(503, 'A leitura automática ainda não está ativa neste site.');
  }

  let pedido;
  try {
    pedido = validarPedido(await req.json());
  } catch (e) {
    return erro(400, e instanceof PedidoInvalido ? e.message : 'Pedido inválido.');
  }

  const codigos = pedido.turnos.map((t) => t.codigo);
  const client = new Anthropic();
  try {
    const response = await client.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: esquemaResposta(codigos) } },
      system: SISTEMA_LEITURA,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: pedido.tipo, data: pedido.imagem } },
            { type: 'text', text: instrucoesLeitura(pedido) },
          ],
        },
      ],
    });

    if (response.stop_reason === 'refusal') return erro(422, 'Não foi possível ler esta imagem. Experimenta outra fotografia.');
    if (response.stop_reason === 'max_tokens') return erro(502, 'A leitura ficou incompleta. Tenta outra vez.');
    const texto = response.content.find((b) => b.type === 'text');
    if (!texto || texto.type !== 'text') return erro(502, 'A leitura não devolveu resultado. Tenta outra vez.');

    const bruto = JSON.parse(texto.text) as ResultadoLeitura;
    return Response.json(normalizarResultado(bruto, pedido.ano, pedido.mes, codigos));
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return erro(429, 'Muitos pedidos neste momento. Tenta daqui a um minuto.');
    if (e instanceof Anthropic.BadRequestError) return erro(400, 'A imagem não foi aceite. Experimenta tirar outra fotografia.');
    if (e instanceof Anthropic.AuthenticationError) return erro(503, 'A leitura automática não está configurada corretamente.');
    if (e instanceof Anthropic.APIError) return erro(502, 'O serviço de leitura falhou. Tenta outra vez.');
    if (e instanceof SyntaxError) return erro(502, 'A leitura devolveu um resultado ilegível. Tenta outra vez.');
    console.error(e);
    return erro(500, 'Erro inesperado na leitura.');
  }
};

export const config: Config = {
  path: '/api/ler-escala',
  method: 'POST',
  // Protege contra abusos (cada leitura custa créditos de IA).
  rateLimit: { windowLimit: 6, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
