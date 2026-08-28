import type { ReactNode } from 'react';

interface PageShellProps {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function PageShell({ title, actions, children }: PageShellProps) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6 lg:py-10">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{title}</h1>
        {actions}
      </header>
      {children}
    </div>
  );
}
