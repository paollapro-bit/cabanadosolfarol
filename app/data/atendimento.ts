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
  /** Somente dígitos, com DDI e DDD. Ex.: "5598999998888". */
  whatsapp: string | null
}

export const unidades: Unidade[] = [
  {
    id: 'sao-luis',
    nome: 'São Luís',
    endereco: null,
    horario: null,
    telefone: null,
    whatsapp: null,
  },
  {
    id: 'imperatriz',
    nome: 'Imperatriz',
    endereco: null,
    horario: null,
    telefone: null,
    whatsapp: null,
  },
]

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
