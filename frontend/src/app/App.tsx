import { RouterProvider } from 'react-router-dom';
import { Providers } from './providers';
import { router } from './router';
import { SessionGate } from './SessionGate';

export function App() {
  return (
    <Providers>
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <SessionGate>
          <RouterProvider router={router} />
        </SessionGate>
      </main>
    </Providers>
  );
}
