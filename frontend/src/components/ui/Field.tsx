import type { ReactNode } from 'react';

interface FieldProps {
  label: string;
  error?: string | null;
  children: ReactNode;
}

// Envuelve el <input> en vez de renderizarlo, asi funciona con `register()` de react-hook-form.
export function Field({ label, error, children }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-ink-muted">
        {label}
      </span>
      {children}
      {error && (
        <span className="mt-1 block text-sm text-red-600 dark:text-red-400">{error}</span>
      )}
    </label>
  );
}

// dark:[color-scheme:dark]: el popup nativo (calendario, desplegable) lo pinta el navegador, no
// Tailwind, y sin esto queda claro en modo oscuro.
export const inputClass =
  'w-full rounded-md border border-slate-300 px-3 py-2 dark:border-ink-border dark:bg-ink-surface dark:text-ink-text dark:[color-scheme:dark]';

// `bg-white` explicito porque Safari le pone un gris propio; `pr-8` para no tapar la flecha.
export const selectClass =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 pr-8 dark:border-ink-border dark:bg-ink-surface dark:text-ink-text dark:[color-scheme:dark]';
