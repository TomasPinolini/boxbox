import type { CSSProperties, ReactNode } from 'react';

// `style` existe para colores que vienen de datos (`Constructor.color`): Tailwind no puede
// generar una clase para un hex que recien se conoce en runtime.
export function Card({
  children,
  className = '',
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <section
      className={`rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200 md:p-6 dark:bg-ink-surface dark:ring-ink-border ${className}`}
      style={style}
    >
      {children}
    </section>
  );
}
