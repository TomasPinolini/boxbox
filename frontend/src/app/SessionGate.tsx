import { useEffect, type ReactNode } from 'react';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../store/auth.store';

// Mismo logo claro/oscuro que AppLayout (ver el comentario de Logo() ahi), pero sin el
// Link envolvente: todavia no existe el router en este punto.
function Logo() {
  return (
    <>
      <img src="/logo.svg" alt="boxbox" className="h-7 w-auto dark:hidden" />
      <img src="/logo-dark.svg" alt="boxbox" className="hidden h-7 w-auto dark:block" />
    </>
  );
}

// SessionGate: antes de renderizar el router, intenta restaurar la sesion con la cookie de
// refresh (una sola vez). Asi un F5 no desloguea y los guards ven el estado real.
export function SessionGate({ children }: { children: ReactNode }) {
  const ready = useAuthStore((s) => s.sessionReady);

  useEffect(() => {
    if (!ready) void authService.restoreSession();
  }, [ready]);

  // Centrado y con el logo, no un <p> pegado al borde: todavia no existe el router (no
  // sabemos si hay sesion ni en que pantalla esta), asi que no hay barra real que mostrar —
  // pero el primer fotograma de cada F5 puede seguir pareciendo parte de la app.
  if (!ready) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3">
        <Logo />
        <p className="text-sm text-slate-500 dark:text-ink-muted">Cargando sesión…</p>
      </div>
    );
  }
  return <>{children}</>;
}
