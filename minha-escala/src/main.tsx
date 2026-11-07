import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Service worker: guarda a aplicação em cache para abrir sem internet.
// As novas versões instalam-se sozinhas; os dados (IndexedDB) nunca são tocados.
// Procura uma versão nova (por exemplo, com a escala do mês seguinte) ao abrir,
// sempre que a aplicação volta ao ecrã, e de hora a hora.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    const check = () => {
      if (navigator.onLine) registration.update().catch(() => {});
    };
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check());
    setInterval(check, 60 * 60 * 1000);
  },
});
