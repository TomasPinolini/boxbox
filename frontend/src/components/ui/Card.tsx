import type { ReactNode } from 'react';

export function Card({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200 md:p-6">
      {children}
    </section>
  );
}
