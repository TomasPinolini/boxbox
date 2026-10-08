import { RouterProvider } from 'react-router-dom';
import { Providers } from './providers';
import { router } from './router';
import { SessionGate } from './SessionGate';

export function App() {
  return (
    <Providers>
      {/* div y no <main>: esto envuelve tambien la barra de navegacion, y el landmark
          <main> tiene que ser SOLO el contenido principal. El <main> real esta en PageShell,
          que es el destino del skip link. */}
      <div className="min-h-dvh bg-slate-50 text-slate-900">
        <SessionGate>
          <RouterProvider router={router} />
        </SessionGate>
      </div>
    </Providers>
  );
}
