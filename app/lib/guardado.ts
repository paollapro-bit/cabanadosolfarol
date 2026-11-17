// Leitura e escrita tolerantes no armazenamento do navegador (que pode estar
// bloqueado em modo privado).

export function lerGuardado<T>(chave: string, padrao: T, area?: Storage): T {
  try {
    const bruto = (area ?? window.localStorage).getItem(chave)
    return bruto === null ? padrao : (JSON.parse(bruto) as T)
  } catch {
    return padrao
  }
}

export function guardar(chave: string, valor: unknown, area?: Storage) {
  try {
    ;(area ?? window.localStorage).setItem(chave, JSON.stringify(valor))
  } catch {
    // Sem armazenamento: a página continua funcionando só com o estado em memória.
  }
}
