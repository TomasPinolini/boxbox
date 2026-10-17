// PRIMERA LINEA A PROPOSITO: Sentry tiene que inicializar antes que cualquier otro codigo.
// Si lo moves abajo, se pierde todo lo que falle durante el arranque.
import './instrument';
import { reactErrorHandler } from '@sentry/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './app/App';

// React 19 reemplaza al <Sentry.ErrorBoundary> que usaban las versiones anteriores: estos tres
// callbacks de createRoot son el punto de enganche oficial.
//   onUncaughtError   -> error que ningun error boundary atajo; rompe la pantalla.
//   onCaughtError     -> error que un boundary si atajo; el usuario ve el fallback y sigue,
//                        y sin esto nunca nos enterariamos de que paso.
//   onRecoverableError-> React se recupero solo (tipico de hidratacion).
createRoot(document.getElementById('root')!, {
  onUncaughtError: reactErrorHandler(),
  onCaughtError: reactErrorHandler(),
  onRecoverableError: reactErrorHandler(),
}).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
