import type { CSSProperties, ReactNode } from 'react';

// `className` se agrega, no reemplaza: las clases base siempre ganan de arriba y lo que
// pasa el consumidor se concatena al final.
//
// `style` existe por una razon distinta y mas dura: el color de una escuderia vive en la
// base (`Constructor.color`) y Tailwind genera sus clases leyendo el codigo fuente en tiempo
// de build. Nunca va a existir una clase para un hex que recien se conoce en runtime, asi
// que un color que viene de datos SOLO puede llegar por `style`.
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
      className={`rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200 md:p-6 ${className}`}
      style={style}
    >
      {children}
    </section>
  );
}
