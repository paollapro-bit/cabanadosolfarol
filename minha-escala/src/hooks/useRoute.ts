import { useCallback, useEffect, useState } from 'react';

export type Route = { name: 'inicio' } | { name: 'calendario'; month?: string } | { name: 'definicoes' };

function parse(hash: string): Route {
  const h = hash.replace(/^#\/?/, '');
  if (h.startsWith('calendario')) {
    const m = h.split('/')[1];
    return { name: 'calendario', month: m && /^\d{4}-\d{2}$/.test(m) ? m : undefined };
  }
  if (h.startsWith('definicoes')) return { name: 'definicoes' };
  return { name: 'inicio' };
}

let internalDepth = 0;

/** Navegação simples por hash: funciona offline e respeita o gesto "voltar". */
export function useRoute() {
  const [route, setRoute] = useState<Route>(() => parse(location.hash));
  useEffect(() => {
    const on = () => {
      setRoute(parse(location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = useCallback((path: string) => {
    internalDepth++;
    location.hash = path;
  }, []);
  const back = useCallback(() => {
    // Só usa history.back() quando a página anterior é desta aplicação.
    if (internalDepth > 0) {
      internalDepth--;
      history.back();
    } else location.replace('#/');
  }, []);
  return { route, go, back };
}
