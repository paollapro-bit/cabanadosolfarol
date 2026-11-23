import type { UnidadeId } from '~/lib/chamados'

// Conteúdo da central de atendimento. Todo o texto fica neste módulo para que,
// no Marco 3, possa vir do banco de dados com o mesmo formato.

export interface Unidade {
  id: UnidadeId
  nome: string
  /** Campos nulos ainda não foram confirmados pelo restaurante e não aparecem como dado. */
  endereco: string | null
  horario: string | null
  /** Somente dígitos, com DDD. Ex.: "9833334444". */
  telefone: string | null
}

export const unidades: Unidade[] = [
  {
    id: 'sao-luis',
    nome: 'São Luís',
    endereco: null,
    horario: null,
    telefone: null,
  },
  {
    id: 'imperatriz',
    nome: 'Imperatriz',
    endereco: null,
    horario: null,
    telefone: null,
  },
]

export interface Canal {
  id: string
  titulo: string
  descricao: string
  /** Endereço exatamente como o restaurante forneceu. */
  url: string
  /** Sem unidade: vale para o restaurante como um todo. */
  unidade?: UnidadeId
  /** Aparece também na tela de reserva de salões. */
  reservas?: boolean
}

export const canais: Canal[] = [
  {
    id: 'reservas-sao-luis',
    titulo: 'Reservas pelo WhatsApp',
    descricao: 'Fale com a equipe de reservas do Cabana do Sol em São Luís.',
    url: 'https://wa.me/5598984043566?text=Ol%C3%A1%2C%20Cabana%20do%20Sol%2C%20gostaria%20de%20informa%C3%A7%C3%B5es%20%E2%98%80%EF%B8%8F',
    unidade: 'sao-luis',
    reservas: true,
  },
  {
    id: 'padaria',
    titulo: 'Pedidos da padaria',
    descricao: 'Faça o seu pedido da padaria pelo WhatsApp.',
    // O link original vinha sem o 55; sem ele o WhatsApp lê 98 como código de país.
    url: 'https://wa.me/559884041002',
  },
  {
    id: 'delivery',
    titulo: 'Aplicativo de delivery',
    descricao: 'Veja o cardápio de entrega e peça para receber em casa.',
    url: 'https://deliveryapp.neemo.com.br/delivery/15693/menu',
  },
]

/** Frase para a voz: lista os canais sem ler os endereços. */
export function fraseDosCanais(lista: Canal[]) {
  return lista.map((c) => `${c.titulo}: ${c.descricao}`).join(' ')
}

/**
 * Central de delivery de São Luís, conforme o post do Instagram @cabanadosol.
 * O post traz os números sem DDD; 98 é o DDD de São Luís.
 */
export const delivery = {
  unidade: 'sao-luis' as UnidadeId,
  ddd: '98',
  telefones: [
    '32352586',
    '32276270',
    '32277597',
    '33044235',
    '38777761',
    '33037761',
    '991165457',
    '991164736',
  ],
}

export interface Duvida {
  id: string
  pergunta: string
  resposta: string
}

export const duvidas: Duvida[] = [
  {
    id: 'garcom',
    pergunta: 'Como chamo um garçom?',
    resposta:
      'Na tela Atendimento, escolha a unidade, informe o número da sua mesa e toque em Chamar garçom. A equipe recebe o aviso na hora e você acompanha a situação na mesma tela.',
  },
  {
    id: 'conta',
    pergunta: 'Como peço a conta?',
    resposta:
      'Na tela Atendimento, toque em Pedir a conta. O pedido aparece no painel da equipe com o número da sua mesa.',
  },
  {
    id: 'mesa',
    pergunta: 'Não sei o número da minha mesa. O que faço?',
    resposta:
      'Se você abriu esta página pelo código QR da mesa, o número já vem preenchido. Se não, pergunte a quem está com você ou a alguém da equipe.',
  },
  {
    id: 'acompanhar',
    pergunta: 'Como sei se o meu chamado foi visto?',
    resposta:
      'Depois de enviar, a tela mostra a situação do chamado: aguardando a equipe, equipe a caminho e atendido. Cada mudança também é anunciada para o leitor de tela.',
  },
  {
    id: 'engano',
    pergunta: 'Enviei um chamado por engano. Posso cancelar?',
    resposta:
      'Sim. Na tela Atendimento, o chamado aberto tem o botão Cancelar chamado. A equipe deixa de ver o pedido.',
  },
  {
    id: 'ouvir',
    pergunta: 'Posso ouvir esta página em voz alta?',
    resposta:
      'Sim. Os botões Ouvir leem o conteúdo em português. Se quiser que todos os avisos sejam falados automaticamente, ative Respostas faladas nas opções de acessibilidade, no topo da página.',
  },
  {
    id: 'letra',
    pergunta: 'Como aumento a letra ou o contraste?',
    resposta:
      'No topo de todas as telas ficam as opções de acessibilidade: Letra grande, Alto contraste e Modo escuro. A escolha fica guardada neste aparelho.',
  },
  {
    id: 'instalar',
    pergunta: 'Preciso instalar algum aplicativo?',
    resposta:
      'Não. A central funciona direto no navegador do seu celular, sem cadastro e sem instalar nada.',
  },
]
