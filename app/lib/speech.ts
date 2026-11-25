// Tudo que toca a Web Speech API fica aqui, fora dos componentes.

export const AVISO_SEM_VOZ =
  'Este navegador não consegue ler em voz alta. O texto está na tela e pode ser lido pelo seu leitor de tela.'

export const VELOCIDADES = [
  { valor: 0.8, rotulo: 'Devagar' },
  { valor: 1, rotulo: 'Normal' },
  { valor: 1.25, rotulo: 'Rápida' },
] as const

export function falaDisponivel(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance === 'function'
  )
}

function vozBrasileira(): SpeechSynthesisVoice | undefined {
  const vozes = window.speechSynthesis.getVoices()
  return (
    vozes.find((v) => v.lang.replace('_', '-').toLowerCase() === 'pt-br') ??
    vozes.find((v) => v.lang.toLowerCase().startsWith('pt'))
  )
}

export function montarFala(texto: string, velocidade = 1) {
  const fala = new SpeechSynthesisUtterance(texto)
  fala.lang = 'pt-BR'
  fala.rate = velocidade
  const voz = vozBrasileira()
  if (voz) fala.voice = voz
  return fala
}

/**
 * Lê o texto em voz alta, interrompendo o que estiver sendo lido.
 * Devolve false quando o navegador não tem síntese de voz — quem chama
 * precisa mostrar e anunciar a alternativa (AVISO_SEM_VOZ).
 */
export function falar(texto: string, velocidade = 1): boolean {
  if (!falaDisponivel()) return false
  try {
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(montarFala(texto, velocidade))
    return true
  } catch {
    return false
  }
}

export function pararFala() {
  if (falaDisponivel()) window.speechSynthesis.cancel()
}

// ---------------------------------------------------------------------------
// Números e preços por extenso (puro, sem Web Speech: testado direto).

const UNIDADES_EXTENSO = [
  'zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
  'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove',
]
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
const CENTENAS = [
  '', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos',
  'seiscentos', 'setecentos', 'oitocentos', 'novecentos',
]

function ate999(n: number): string {
  if (n < 20) return UNIDADES_EXTENSO[n]
  if (n < 100) {
    const resto = n % 10
    return resto ? `${DEZENAS[Math.floor(n / 10)]} e ${UNIDADES_EXTENSO[resto]}` : DEZENAS[n / 10]
  }
  if (n === 100) return 'cem'
  const resto = n % 100
  const centena = CENTENAS[Math.floor(n / 100)]
  return resto ? `${centena} e ${ate999(resto)}` : centena
}

/** 0 a 999.999, por extenso: 1250 → "mil duzentos e cinquenta". */
export function numeroPorExtenso(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 999_999) return String(n)
  if (n < 1000) return ate999(n)
  const milhares = Math.floor(n / 1000)
  const resto = n % 1000
  const mil = milhares === 1 ? 'mil' : `${ate999(milhares)} mil`
  if (!resto) return mil
  // "mil e cem", "mil e cinquenta", mas "mil duzentos e cinquenta".
  const junta = resto < 100 || resto % 100 === 0 ? ' e ' : ' '
  return `${mil}${junta}${ate999(resto)}`
}

/** Preço em centavos por extenso: 12750 → "cento e vinte e sete reais e cinquenta centavos". */
export function precoPorExtenso(centavos: number): string {
  const reais = Math.floor(centavos / 100)
  const cents = centavos % 100
  const parteReais = reais === 1 ? 'um real' : `${numeroPorExtenso(reais)} reais`
  const parteCentavos = cents === 1 ? 'um centavo' : `${numeroPorExtenso(cents)} centavos`
  if (!cents) return parteReais
  if (!reais) return parteCentavos
  return `${parteReais} e ${parteCentavos}`
}

/** "1.234,50" ou "71,00" → centavos. Texto sem preço → null. */
export function lerPrecoEmCentavos(texto: string): number | null {
  const achado = texto.trim().match(/^(\d{1,3}(?:\.\d{3})*|\d+),(\d{2})$/)
  if (!achado) return null
  return Number(achado[1].replace(/\./g, '')) * 100 + Number(achado[2])
}

/** Troca "R$ 151,00" dentro de um texto pelo valor por extenso, para a voz. */
export function falarPrecosNoTexto(texto: string): string {
  return texto
    .replace(/R\$\s?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/g, (_, valor: string) => {
      const centavos = lerPrecoEmCentavos(valor)
      return centavos === null ? valor : precoPorExtenso(centavos)
    })
    .replace(/\s*·\s*/g, '; ')
}
