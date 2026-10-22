import type { ReactNode } from 'react';

interface PageShellProps {
  title: ReactNode;
  // Al lado del <h1> y no adentro: HelpPopover tiene un <div> en la raiz, invalido dentro de un <h1>.
  titleHelp?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

export function PageShell({ title, titleHelp, actions, children }: PageShellProps) {
  // id = destino del skip link de AppLayout. Sin tabIndex={-1} varios navegadores scrollean pero
  // dejan el foco donde estaba, y el Tab siguiente vuelve a la barra.
  return (
    <main
      id="contenido"
      tabIndex={-1}
      className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6 lg:py-10"
    >
      {/* flex-wrap: sin esto el header desborda en pantallas angostas y aparece scroll horizontal. */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl dark:text-ink-text">
            {title}
          </h1>
          {titleHelp}
        </div>
        {actions}
      </header>
      {children}
    </main>
  );
}
