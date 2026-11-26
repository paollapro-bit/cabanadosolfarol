// Envia "mais um clique" para o relatório. Nunca atrapalha o clique: não
// espera resposta e ignora qualquer erro. keepalive deixa o envio terminar
// mesmo quando o botão abre outro app (telefone, WhatsApp).
export function registrar(evento: string) {
  try {
    void fetch('/api/eventos', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ evento }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Sem rede ou sem fetch: o clique segue normalmente, só não é contado.
  }
}
