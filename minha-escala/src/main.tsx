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
registerSW({ immediate: true });
