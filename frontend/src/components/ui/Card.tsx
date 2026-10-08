import type { ReactNode } from 'react';

// `className` se agrega, no reemplaza: las clases base siempre ganan de arriba y lo que
// pasa el consumidor se concatena al final. Existe para un solo caso real hoy —
// DriverCard necesita `relative` para poder estirar su boton sobre toda la tarjeta.
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200 md:p-6 ${className}`}
    >
      {children}
    </section>
  );
}
