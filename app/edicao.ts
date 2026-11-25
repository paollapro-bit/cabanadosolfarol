// Edição do app, escolhida na hora do build (VITE_EDICAO):
// - "completa": central com o atendimento na mesa (chamar garçom, conta...).
// - "sem-mesa": cópia sem o atendimento na mesa e sem "Respostas faladas",
//   com o cardápio em texto vindo do site do cardápio.
export const SEM_MESA = import.meta.env.VITE_EDICAO === 'sem-mesa'
