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
