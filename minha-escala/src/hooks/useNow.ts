import { useEffect, useState } from 'react';
import { lisbonNow } from '../lib/dates';

/** Data e hora de Lisboa, atualizadas a cada 30 s e ao voltar à aplicação. */
export function useLisbonNow() {
  const [now, setNow] = useState(() => lisbonNow());
  useEffect(() => {
    const tick = () =>
      setNow((prev) => {
        const next = lisbonNow();
        return next.date === prev.date && next.minutes === prev.minutes ? prev : next;
      });
    const id = setInterval(tick, 30_000);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
    };
  }, []);
  return now;
}

export function useOnline() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}
