import type { ReactNode } from 'react';

// Separado de Alert por el rol ARIA: role="status" espera a que el lector termine, role="alert"
// lo interrumpe, y un exito no justifica interrumpir.
export function Success({ children }: { children: ReactNode }) {
  return (
    <p
      role="status"
      className="enter-top mb-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800 ring-1 ring-green-200 dark:bg-green-950 dark:text-green-200 dark:ring-green-900"
    >
      {children}
    </p>
  );
}
