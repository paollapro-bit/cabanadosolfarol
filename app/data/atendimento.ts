import type { UnidadeId } from '~/lib/chamados'
import { SEM_MESA } from '~/edicao'

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
  outrosTelefones: string[]
  mapa: string | null
  descricao: string | null
}

// Fonte: site oficial, cabanadosol.com.br (páginas Restaurantes e Contato),
// consultado em novembro de 2026. No site, a Ponta do Farol aparece como
// "Farol de São Marcos". Telefones celulares antigos de 8 dígitos ficaram de fora.
export const unidades: Unidade[] = [
  {
    id: 'litoranea',
    nome: 'Litorânea',
    endereco: 'Avenida Litorânea, nº 10, Calhau',
    horario: 'Segunda a domingo, das 11h à meia-noite',
    telefone: '98991164736',
    outrosTelefones: ['9832277761', '9832273794'],
    mapa: 'https://goo.gl/maps/q5o6iboLitR2',
    descricao:
      'De frente para a praia de São Marcos. Quatro salões para eventos: Salão Crioulas, para até 300 pessoas; Salão VIP, de 100 a 120; Mezanino, de 30 a 40; e a Adega do Fialho, de 10 a 12. Tem também o bar, climatizado e ao ar livre.',
  },
  {
    id: 'ponta-do-farol',
    nome: 'Ponta do Farol',
    endereco: 'Rua João Damasceno, 24 A, Farol de São Marcos',
    horario: 'Segunda a domingo, das 11h à meia-noite',
    telefone: '9833044235',
    outrosTelefones: ['9832352586', '9832276270'],
    mapa: 'https://goo.gl/maps/ice4v8NkV5T2',
    descricao:
      'O primeiro restaurante Cabana do Sol, perto das principais praias e hotéis da cidade. Ambiente rústico e acolhedor, com madeira, palha, plantas e arte maranhense, e três salões: dos Guarás, das Artes e dos Lençóis. Tem o Happy Café, com chás, cafés, sanduíches e drinks; padaria própria, com pães e bolos feitos na casa; e brinquedoteca para as crianças.',
  },
]

/**
 * Salões já cadastrados quando o app vai ao ar pela primeira vez. Fonte: os
 * destaques "Eventos" do Instagram @cabanadosol (maio de 2024), enviados pela
 * dona. Depois disso, a equipe muda tudo pelo painel (/equipe/saloes).
 */
export const saloesIniciais: {
  id: string
  unidade: UnidadeId
  nome: string
  capacidade: number | null
  descricao: string
}[] = [
  {
    id: 'litoranea-crioulas',
    unidade: 'litoranea' as UnidadeId,
    nome: 'Salão Crioulas',
    capacidade: 300,
    descricao:
      'Para até 300 pessoas. Ambiente amplo e acolhedor para eventos de grande porte, como casamentos, conferências ou festas corporativas.',
  },
  {
    id: 'litoranea-vip',
    unidade: 'litoranea' as UnidadeId,
    nome: 'Salão VIP',
    capacidade: 120,
    descricao: 'De 100 a 120 pessoas, com flexibilidade para diferentes tipos de eventos e de arrumação.',
  },
  {
    id: 'litoranea-mezanino',
    unidade: 'litoranea' as UnidadeId,
    nome: 'Mezanino',
    capacidade: 40,
    descricao: 'De 30 a 40 pessoas. Ambiente exclusivo e versátil para eventos privados ou reuniões intimistas.',
  },
  {
    id: 'litoranea-adega-do-fialho',
    unidade: 'litoranea' as UnidadeId,
    nome: 'Adega do Fialho',
    capacidade: 12,
    descricao: 'De 10 a 12 pessoas, numa mesa redonda entre os vinhos. Ambiente íntimo e aconchegante para degustações.',
  },
  // Ponta do Farol: descrições enviadas pela dona; capacidades ainda não informadas.
  {
    id: 'ponta-do-farol-guaras',
    unidade: 'ponta-do-farol',
    nome: 'Salão dos Guarás',
    capacidade: null,
    descricao:
      'Salão amplo, com mesas de toalha branca, uma parede de plantas e um quadro oval com um guará vermelho, a ave símbolo do Maranhão.',
  },
  {
    id: 'ponta-do-farol-artes',
    unidade: 'ponta-do-farol',
    nome: 'Salão das Artes',
    capacidade: null,
    descricao:
      'Teto com luminárias de palha, prateleiras com garrafas e bolos, e mesas de tampo de vidro com pinturas de cenas maranhenses por baixo, assinadas por F. Motta.',
  },
  {
    id: 'ponta-do-farol-lencois',
    unidade: 'ponta-do-farol',
    nome: 'Salão dos Lençóis',
    capacidade: null,
    descricao:
      'Parede amarela coberta de pratos decorativos pintados com paisagens dos Lençóis Maranhenses, veleiros e casarões.',
  },
]

export type GrupoDeCanal = 'pedidos' | 'reservas' | 'opiniao' | 'site'

export interface Canal {
  id: string
  titulo: string
  descricao: string
  /** Endereço exatamente como o restaurante forneceu (bio.site/cabanadosol). */
  url: string
  grupo: GrupoDeCanal
  /** Sem unidade: vale para as duas unidades. */
  unidade?: UnidadeId
  /** Idioma do destino, quando não é português (para o leitor de tela pronunciar certo). */
  idioma?: string
}

export const canais: Canal[] = [
  {
    id: 'reservas',
    titulo: 'Reservas e orçamentos',
    descricao: 'Fale pelo WhatsApp com a equipe de reservas e eventos.',
    url: 'https://wa.me/5598984043566?text=Ol%C3%A1%2C%20Cabana%20do%20Sol%2C%20gostaria%20de%20informa%C3%A7%C3%B5es%20%E2%98%80%EF%B8%8F',
    grupo: 'reservas',
  },
  {
    id: 'delivery',
    titulo: 'Aplicativo de delivery',
    descricao: 'Veja o cardápio de entrega e peça para receber em casa.',
    url: 'https://deliveryapp.neemo.com.br/delivery/15693/menu',
    grupo: 'pedidos',
  },
  {
    id: 'delivery-whatsapp',
    titulo: 'Delivery pelo WhatsApp',
    descricao: 'Faça o seu pedido de entrega conversando com a equipe.',
    url: 'https://wa.me/5598991165457',
    grupo: 'pedidos',
  },
  {
    id: 'padaria',
    titulo: 'Pedidos da padaria',
    descricao: 'Faça o seu pedido da padaria pelo WhatsApp.',
    // O link original vinha sem o 55; sem ele o WhatsApp lê 98 como código de país.
    url: 'https://wa.me/559884041002',
    grupo: 'pedidos',
  },
  {
    id: 'retirada',
    titulo: 'Retirada do delivery',
    descricao: 'Os pedidos para retirar ficam na Ponta do Farol. Veja no mapa.',
    url: 'https://goo.gl/maps/BR29eHgxnJixVMsB7',
    grupo: 'pedidos',
    unidade: 'ponta-do-farol',
  },
  {
    id: 'feedback',
    titulo: 'Avalie o seu atendimento',
    descricao: 'Conte como foi a sua visita. São poucas perguntas.',
    url: 'https://forms.gle/khQa4odZbxcXTpkh6',
    grupo: 'opiniao',
  },
  {
    id: 'estacionamento',
    titulo: 'Avalie o estacionamento',
    descricao: 'Diga o que achou do estacionamento.',
    url: 'https://forms.gle/XXFxiyxKpytCgZQ47',
    grupo: 'opiniao',
  },
  {
    id: 'instagram',
    titulo: 'Instagram @cabanadosol',
    descricao: 'Novidades, pratos, eventos e os bastidores do Cabana.',
    url: 'https://www.instagram.com/cabanadosol/',
    grupo: 'site',
  },
  {
    id: 'site',
    titulo: 'Site do Cabana do Sol',
    descricao: 'História, restaurantes, eventos e área de entrega.',
    url: 'https://www.cabanadosol.com.br/',
    grupo: 'site',
  },
]

export const canaisDoGrupo = (grupo: GrupoDeCanal) => canais.filter((c) => c.grupo === grupo)

/**
 * Cardápios feitos no Canva, nos links publicados em bio.site/cabanadosol.
 * Os links de visualização do Canva mostram sempre a versão mais recente do
 * design: quando a equipe edita o cardápio no Canva, o link já abre atualizado.
 */
export const cardapios: Canal[] = [
  {
    id: 'cardapio-litoranea',
    titulo: 'Cardápio da Litorânea',
    descricao: 'Para consumo no restaurante.',
    url: 'https://canva.link/scwjie6z0wcw9ou',
    grupo: 'pedidos',
    unidade: 'litoranea',
  },
  {
    id: 'cardapio-litoranea-en',
    titulo: 'Litorânea menu in English',
    descricao: 'Dine-in menu.',
    url: 'https://canva.link/jifqzfqmwhv5z31',
    grupo: 'pedidos',
    unidade: 'litoranea',
    idioma: 'en',
  },
  {
    id: 'cardapio-ponta-do-farol',
    titulo: 'Cardápio da Ponta do Farol',
    descricao: 'Para consumo no restaurante.',
    url: 'https://canva.link/8xt6vq6ldpcx9mt',
    grupo: 'pedidos',
    unidade: 'ponta-do-farol',
  },
  {
    id: 'cardapio-ponta-do-farol-en',
    titulo: 'Ponta do Farol menu in English',
    descricao: 'Dine-in menu.',
    url: 'https://canva.link/rvmpyez24bjjeqs',
    grupo: 'pedidos',
    unidade: 'ponta-do-farol',
    idioma: 'en',
  },
  {
    id: 'cardapio-delivery',
    titulo: 'Cardápio do delivery',
    descricao: 'Pratos e preços para entrega.',
    url: 'https://canva.link/o8ejty0t18o2jv7',
    grupo: 'pedidos',
  },
  {
    id: 'cardapio-happy-hour',
    titulo: 'Cardápio do happy hour',
    descricao: 'Petiscos e bebidas do happy hour.',
    url: 'https://canva.link/egue1lwygoqzpmb',
    grupo: 'pedidos',
  },
]

/** Frase para a voz: lista os canais sem ler os endereços. */
export function fraseDosCanais(lista: Canal[]) {
  return lista.map((c) => `${c.titulo}: ${c.descricao}`).join(' ')
}

/**
 * Central de delivery de São Luís, conforme o post do Instagram @cabanadosol.
 * O celular 99116-5457 é também o WhatsApp do delivery (bio.site/cabanadosol).
 * O post traz os números sem DDD; 98 é o DDD de São Luís.
 */
export const delivery = {
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

/**
 * Arquivo de dados do site do cardápio (cardapio-cabana, no Cloudflare Pages).
 * A central lê este arquivo a cada poucos minutos: quando o cardápio é
 * atualizado lá, a central mostra a mudança sem precisar de deploy.
 * Ao publicar o site do cardápio no endereço definitivo, troque aqui.
 */
export const FONTE_DO_CARDAPIO = 'https://dev.cardapio-cabana.pages.dev/dados/cardapio.js'
export const SITE_DO_CARDAPIO = 'https://dev.cardapio-cabana.pages.dev/'

export interface Duvida {
  id: string
  pergunta: string
  resposta: string
  /** Resposta na edição sem mesa; null tira a pergunta dessa edição. */
  semMesa?: string | null
}

const todasAsDuvidas: Duvida[] = [
  {
    id: 'garcom',
    semMesa: null,
    pergunta: 'Como chamo um garçom?',
    resposta:
      'Na tela Atendimento, escolha a unidade, informe o número da sua mesa e toque em Chamar garçom. A equipe recebe o aviso na hora e você acompanha a situação na mesma tela.',
  },
  {
    id: 'conta',
    semMesa: null,
    pergunta: 'Como peço a conta?',
    resposta:
      'Na tela Atendimento, toque em Pedir a conta. O pedido aparece no painel da equipe com o número da sua mesa.',
  },
  {
    id: 'criancas',
    pergunta: 'Tem lugar para as crianças brincarem?',
    resposta:
      'Sim, na unidade Ponta do Farol. A brinquedoteca tem piscina de bolinhas com cesta de basquete, bichos de pelúcia, brinquedos e desenho passando na TV.',
  },
  {
    id: 'reclamacao',
    semMesa:
      'Na tela Início, em Sua opinião, toque em Fazer uma reclamação, ou use o link Reclamações no rodapé. Escolha a unidade e o assunto e conte o que aconteceu. O nome é opcional. Você recebe um protocolo e acompanha a resposta pela mesma tela.',
    pergunta: 'Como faço uma reclamação?',
    resposta:
      'Na tela Mesa, em Sua opinião, toque em Fazer uma reclamação, ou use o link Reclamações no rodapé. Escolha a unidade e o assunto e conte o que aconteceu. O nome é opcional. Você recebe um protocolo e acompanha a resposta pela mesma tela.',
  },
  {
    id: 'mesa',
    semMesa: null,
    pergunta: 'Não sei o número da minha mesa. O que faço?',
    resposta:
      'Se você abriu esta página pelo código QR da mesa, o número já vem preenchido. Se não, pergunte a quem está com você ou a alguém da equipe.',
  },
  {
    id: 'acompanhar',
    semMesa: null,
    pergunta: 'Como sei se o meu chamado foi visto?',
    resposta:
      'Depois de enviar, a tela mostra a situação do chamado: aguardando a equipe, equipe a caminho e atendido. Cada mudança também é anunciada para o leitor de tela.',
  },
  {
    id: 'engano',
    semMesa: null,
    pergunta: 'Enviei um chamado por engano. Posso cancelar?',
    resposta:
      'Sim. Na tela Atendimento, o chamado aberto tem o botão Cancelar chamado. A equipe deixa de ver o pedido.',
  },
  {
    id: 'ouvir',
    semMesa:
      'Sim. Os botões Ouvir leem o conteúdo em português. No cardápio, cada prato tem um botão com alto-falante, que lê o nome, a descrição e o preço por extenso.',
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

/** As dúvidas da edição em uso, com o texto certo para cada edição. */
export const duvidas: Duvida[] = todasAsDuvidas.flatMap((d) =>
  !SEM_MESA || d.semMesa === undefined ? [d] : d.semMesa === null ? [] : [{ ...d, resposta: d.semMesa }],
)
