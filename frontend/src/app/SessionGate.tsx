import { useEffect, type ReactNode } from 'react';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../store/auth.store';

// SessionGate: antes de renderizar el router, intenta restaurar la sesion con la cookie de
// refresh (una sola vez). Asi un F5 no desloguea y los guards ven el estado real.
export function SessionGate({ children }: { children: ReactNode }) {
  const ready = useAuthStore((s) => s.sessionReady);

  useEffect(() => {
    if (!ready) void authService.restoreSession();
  }, [ready]);

  if (!ready) return <p className="p-6 text-slate-500">Cargando sesión…</p>;
  return <>{children}</>;
}
