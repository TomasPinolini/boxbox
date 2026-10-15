import type { ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning';

// neutral en dark:bg-ink-border, NO dark:bg-ink-surface: Badge vive casi siempre adentro de un
// Card, y Card usa --color-ink-surface de fondo (ver components/ui/Card.tsx). Con los dos
// iguales la pildora se volvia invisible en modo oscuro — quedaba el texto solo, sin caja
// (ej. "DRAFT PENDIENTE" en LeagueCard, reportado por el usuario 2026-10-15). ink-border es
// un escalon mas claro que ink-surface, por eso contrasta contra la tarjeta que lo envuelve.
const tones: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-700 dark:bg-ink-border dark:text-ink-text',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  success: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
};

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
