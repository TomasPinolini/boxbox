import type { ReactNode } from 'react';

interface PageShellProps {
  // ReactNode y no string: LeagueDetailPage necesita meter el lapiz de "editar nombre" al
  // lado del titulo, adentro del mismo <h1> — un string a secas no alcanza para eso.
  title: ReactNode;
  // Slot para un HelpPopover pegado al titulo, AL LADO del <h1> y no adentro. HelpPopover
  // tiene un <div> en la raiz (necesita envolver el panel posicionado) y un <div> adentro de
  // un <h1> es HTML invalido: el <h1> solo admite contenido de frase. Mismo motivo por el que
  // la linea de la ronda en DraftPage dejo de ser un <p> suelto.
  //
  // El nombre accesible del encabezado NO es el problema: medido con dom-accessibility-api, el
  // aria-label de un boton descendiente no se suma al nombre del <h1>. Se midio porque la
  // sospecha inicial era esa y resulto falsa.
  titleHelp?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

export function PageShell({ title, titleHelp, actions, children }: PageShellProps) {
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
