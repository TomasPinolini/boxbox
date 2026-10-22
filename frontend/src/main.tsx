// Primera linea a proposito: Sentry tiene que inicializar antes que cualquier otro codigo.
import './instrument';
import { reactErrorHandler } from '@sentry/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './app/App';

// En React 19 estos callbacks de createRoot reemplazan al <Sentry.ErrorBoundary>. Sin
// onCaughtError no nos enterariamos de los errores que un boundary ya atajo.
createRoot(document.getElementById('root')!, {
  onUncaughtError: reactErrorHandler(),
  onCaughtError: reactErrorHandler(),
  onRecoverableError: reactErrorHandler(),
}).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
