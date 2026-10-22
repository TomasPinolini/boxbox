import { RouterProvider } from 'react-router-dom';
import { Providers } from './providers';
import { router } from './router';
import { SessionGate } from './SessionGate';

export function App() {
  return (
    <Providers>
      {/* div y no <main>: envuelve tambien la barra; el <main> real esta en PageShell. */}
      <div className="min-h-dvh bg-slate-50 text-slate-900 dark:bg-ink dark:text-ink-text">
        <SessionGate>
          <RouterProvider router={router} />
        </SessionGate>
      </div>
    </Providers>
  );
}
