import type { ReactNode } from 'react';

interface PageShellProps {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function PageShell({ title, actions, children }: PageShellProps) {
  // id + tabIndex={-1}: el id es el destino del skip link de AppLayout, y el tabIndex negativo
  // deja que el contenedor RECIBA foco programaticamente sin entrar en el orden de tabulacion.
  // Sin el, varios navegadores mueven el scroll pero dejan el foco donde estaba, y el Tab
  // siguiente vuelve a la barra de navegacion.
  return (
    <main
      id="contenido"
      tabIndex={-1}
      className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6 lg:py-10"
    >
      {/* flex-wrap: sin esto el <h1> y los links del header se ponen en una sola fila que no
          entra en pantallas angostas, y como los items de flex no se encogen por debajo de su
          contenido, desbordan y aparece scroll horizontal en toda la pagina. */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{title}</h1>
        {actions}
      </header>
      {children}
    </main>
  );
}
