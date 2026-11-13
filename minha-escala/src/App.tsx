import { useEffect, useState } from 'react';
import { db } from './db/db';
import { initDatabase } from './db/seed';
import { useLisbonNow } from './hooks/useNow';
import { useRoute } from './hooks/useRoute';
import { AnnouncerProvider } from './components/Announcer';
import { Home } from './screens/Home';
import { Calendar } from './screens/Calendar';
import { Settings } from './screens/Settings';
import { applyTheme, getThemePref } from './lib/theme';
import { useNome } from './lib/perfil';
import { Boasvindas } from './screens/Boasvindas';

export default function App() {
  const [ready, setReady] = useState<'a-carregar' | 'pronto' | 'erro'>('a-carregar');
  const now = useLisbonNow();
  const { route, go, back } = useRoute();
  const nome = useNome();

  useEffect(() => {
    initDatabase(db)
      .then(() => setReady('pronto'))
      .catch((e) => {
        console.error(e);
        setReady('erro');
      });
    // Pede ao sistema para não apagar os dados locais automaticamente.
    navigator.storage?.persist?.().catch(() => {});
    // Acompanha o tema do sistema quando está em "Automático".
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => getThemePref() === 'sistema' && applyTheme('sistema');
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  if (ready === 'erro')
    return (
      <div className="mx-auto grid min-h-dvh max-w-sm place-items-center p-8 text-center">
        <div>
          <h1 className="text-2xl font-bold">Não foi possível abrir a escala</h1>
          <p className="mt-3 text-[var(--muted)]">
            O armazenamento do navegador não está disponível (por exemplo, em navegação privada). Abre a aplicação no Safari normal ou a
            partir do ecrã principal.
          </p>
        </div>
      </div>
    );
  if (ready === 'a-carregar' || nome === undefined) return null;
  if (!nome) return <Boasvindas />;

  return (
    <AnnouncerProvider>
      {route.name === 'inicio' && <Home today={now.date} nowMinutes={now.minutes} go={go} />}
      {route.name === 'calendario' && <Calendar today={now.date} initialMonth={route.month} back={back} />}
      {route.name === 'definicoes' && <Settings back={back} />}
    </AnnouncerProvider>
  );
}
