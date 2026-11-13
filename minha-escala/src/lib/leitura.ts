/**
 * Leitura automática de fotografias de escalas — partes sem dependências,
 * partilhadas entre a app (browser) e a função Netlify `ler-escala`.
 * Nada aqui fala com a IA diretamente: isso só acontece no servidor.
 */

export const LEITURA_PATH = '/api/ler-escala';
/** Tamanho máximo da imagem em base64 aceite pelo servidor (~4 MB de JPEG). */
export const MAX_IMAGEM_BASE64 = 5_500_000;
export const TIPOS_IMAGEM = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type TipoImagem = (typeof TIPOS_IMAGEM)[number];

export interface TurnoDescrito {
  codigo: string;
  descricao: string;
}

export interface PedidoLeitura {
  imagem: string; // base64, sem prefixo data:
  tipo: TipoImagem;
  nome: string;
  ano: number;
  mes: number;
  turnos: TurnoDescrito[];
}

/** Valor especial: o que estava escrito não corresponde a nenhum código conhecido. */
export const CODIGO_OUTRO = 'OUTRO';

export interface DiaLido {
  dia: number;
  /** Código conhecido, "" (sem escala / célula vazia ou riscada) ou "OUTRO". */
  codigo: string;
  /** Texto tal como aparece na célula. */
  texto_lido: string;
  certeza: 'alta' | 'baixa';
}

export interface ResultadoLeitura {
  pessoa_encontrada: boolean;
  nome_na_folha: string;
  nomes_na_folha: string[];
  /** "AAAA-MM" se a folha indicar o mês; "" se não indicar. */
  mes_na_folha: string;
  dias: DiaLido[];
  observacoes: string;
}

export class PedidoInvalido extends Error {}

const CODIGO_RE = /^[A-Za-z0-9]{1,4}$/;

export function validarPedido(body: unknown): PedidoLeitura {
  const b = body as Partial<PedidoLeitura> | null;
  if (!b || typeof b !== 'object') throw new PedidoInvalido('Pedido vazio.');
  if (typeof b.imagem !== 'string' || b.imagem.length < 100) throw new PedidoInvalido('Falta a fotografia.');
  if (b.imagem.length > MAX_IMAGEM_BASE64) throw new PedidoInvalido('A fotografia é demasiado grande.');
  if (!/^[A-Za-z0-9+/=]+$/.test(b.imagem.slice(0, 2000))) throw new PedidoInvalido('Fotografia em formato inválido.');
  if (!TIPOS_IMAGEM.includes(b.tipo as TipoImagem)) throw new PedidoInvalido('Tipo de imagem não suportado.');
  const nome = typeof b.nome === 'string' ? b.nome.trim() : '';
  if (nome.length < 2 || nome.length > 80) throw new PedidoInvalido('Indica o nome como aparece na escala.');
  if (!Number.isInteger(b.ano) || b.ano! < 2000 || b.ano! > 2100) throw new PedidoInvalido('Ano inválido.');
  if (!Number.isInteger(b.mes) || b.mes! < 1 || b.mes! > 12) throw new PedidoInvalido('Mês inválido.');
  if (!Array.isArray(b.turnos) || b.turnos.length === 0 || b.turnos.length > 30) throw new PedidoInvalido('Lista de turnos inválida.');
  const turnos = b.turnos.map((t) => {
    if (!t || typeof t.codigo !== 'string' || !CODIGO_RE.test(t.codigo) || t.codigo === CODIGO_OUTRO)
      throw new PedidoInvalido('Código de turno inválido.');
    return { codigo: t.codigo, descricao: String(t.descricao ?? '').slice(0, 120) };
  });
  return { imagem: b.imagem, tipo: b.tipo as TipoImagem, nome, ano: b.ano!, mes: b.mes!, turnos };
}

export function diasNoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

/** Esquema JSON da resposta (structured outputs), com os códigos desta pessoa. */
export function esquemaResposta(codigos: string[]) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['pessoa_encontrada', 'nome_na_folha', 'nomes_na_folha', 'mes_na_folha', 'dias', 'observacoes'],
    properties: {
      pessoa_encontrada: { type: 'boolean' },
      nome_na_folha: { type: 'string' },
      nomes_na_folha: { type: 'array', items: { type: 'string' } },
      mes_na_folha: { type: 'string' },
      dias: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['dia', 'codigo', 'texto_lido', 'certeza'],
          properties: {
            dia: { type: 'integer' },
            codigo: { type: 'string', enum: [...codigos, '', CODIGO_OUTRO] },
            texto_lido: { type: 'string' },
            certeza: { type: 'string', enum: ['alta', 'baixa'] },
          },
        },
      },
      observacoes: { type: 'string' },
    },
  } as const;
}

export const SISTEMA_LEITURA = `Transcreves escalas de turnos de trabalho a partir de fotografias (folhas impressas ou manuscritas, muitas vezes tiradas na diagonal, com sombras ou reflexos).

Uma escala é normalmente uma tabela: cada linha é uma pessoa, cada coluna é um dia do mês, e cada célula tem um código de turno. Pode haver cabeçalhos com os dias da semana (D, 2a, 3a, 4a, 5a, 6a, S) e/ou os números dos dias, colunas de totais no fim e células pintadas a preto ou riscadas para dias sem escala.

Como trabalhar:
- Encontra a linha da pessoa pedida (o nome pode estar abreviado, sem acentos ou com apelido diferente). Se não encontrares com segurança, diz que não encontraste e lista os nomes que consegues ler.
- Alinha cada célula dessa linha com a coluna do dia correspondente, contando as colunas a partir do dia 1. Confirma o alinhamento com o cabeçalho dos dias da semana e com os totais da linha, se existirem (por exemplo, o número de folgas).
- Devolve exatamente uma entrada por cada dia do mês, por ordem.
- Usa só os códigos da lista indicada. Célula vazia, pintada ou riscada → código "". Algo escrito que não corresponde a nenhum código da lista → "OUTRO", com o texto em texto_lido.
- Marca certeza "baixa" sempre que a célula estiver desfocada, tapada, ambígua ou se o alinhamento da coluna for incerto. Nunca inventes: na dúvida, certeza baixa.
- Escreve as observações em português de Portugal, curtas, só se houver algo que a pessoa deva conferir.`;

export function instrucoesLeitura(p: Pick<PedidoLeitura, 'nome' | 'ano' | 'mes' | 'turnos'>): string {
  const n = diasNoMes(p.ano, p.mes);
  const lista = p.turnos.map((t) => `- ${t.codigo}: ${t.descricao}`).join('\n');
  return `Pessoa: ${p.nome}
Mês esperado: ${String(p.mes).padStart(2, '0')}/${p.ano} (${n} dias). Se a folha indicar outro mês, indica-o em mes_na_folha no formato AAAA-MM e transcreve na mesma.

Códigos de turno usados por esta pessoa:
${lista}

Transcreve a linha desta pessoa para os dias 1 a ${n}.`;
}

/** Garante uma entrada por dia (1..N), descartando lixo vindo do modelo. */
export function normalizarResultado(r: ResultadoLeitura, ano: number, mes: number, codigos: string[]): ResultadoLeitura {
  const n = diasNoMes(ano, mes);
  const porDia = new Map<number, DiaLido>();
  for (const d of r.dias ?? []) {
    if (!Number.isInteger(d.dia) || d.dia < 1 || d.dia > n || porDia.has(d.dia)) continue;
    const codigo = d.codigo === '' || d.codigo === CODIGO_OUTRO || codigos.includes(d.codigo) ? d.codigo : CODIGO_OUTRO;
    porDia.set(d.dia, { dia: d.dia, codigo, texto_lido: String(d.texto_lido ?? '').slice(0, 20), certeza: d.certeza === 'alta' ? 'alta' : 'baixa' });
  }
  const dias: DiaLido[] = [];
  for (let dia = 1; dia <= n; dia++) dias.push(porDia.get(dia) ?? { dia, codigo: '', texto_lido: '', certeza: 'baixa' });
  return {
    pessoa_encontrada: !!r.pessoa_encontrada,
    nome_na_folha: String(r.nome_na_folha ?? '').slice(0, 80),
    nomes_na_folha: (r.nomes_na_folha ?? []).map((s) => String(s).slice(0, 80)).slice(0, 40),
    mes_na_folha: /^\d{4}-\d{2}$/.test(r.mes_na_folha ?? '') ? r.mes_na_folha : '',
    dias,
    observacoes: String(r.observacoes ?? '').slice(0, 600),
  };
}
