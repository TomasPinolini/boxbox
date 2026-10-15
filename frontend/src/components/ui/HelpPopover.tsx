import { useEffect, useRef, useState, type ReactNode } from 'react';

// HelpPopover: el "¿qué es esto?" que el usuario tira cuando quiere, colgado de un título.
//
// Nació como AboutBoxBox en login/register —el único cartel de ayuda que había— y se generalizó
// acá para poder colgarlo de cualquier pantalla. AboutBoxBox ahora es una llamada a este.
//
// Dos formas, no una que se adapta: en mobile es un diálogo de verdad (cartel que sube con un
// scrim atrás y tapa el resto); en desktop es un panel que crece anclado al gatillo, sin
// bloquear nada — la metáfora que pidió el usuario fue "una ampliación de texto", no un modal.
// Los dos existen siempre en el DOM y se turnan por CSS (md:hidden / hidden md:block), mismo
// patrón que las dos fotos de fondo del login.

// Hacia dónde crece el panel de desktop, con su flechita. Las clases van COMPLETAS en cada
// rama y no armadas por concatenación: Tailwind escanea el código fuente buscando literales,
// así que una clase construida con `${}` no existe en el CSS final.
const PANEL_SEGUN_PLACEMENT = {
  top: 'bottom-full mb-3 after:top-full after:border-t-white dark:after:border-t-ink-surface',
  bottom: 'top-full mt-3 after:bottom-full after:border-b-white dark:after:border-b-ink-surface',
} as const;

// El círculo del "?" es de 22px, pero el <button> que lo contiene mide 44 (h-11) para llegar al
// área táctil que piden las guías de Apple y Google. El -my-[11px] le devuelve a la fila el alto
// que el botón le agregaba: el blanco de alrededor es clickeable sin empujar nada.
const GATILLO_ICONO = 'inline-flex h-11 w-11 -my-[11px] shrink-0 items-center justify-center';
const CIRCULO_BASE =
  'flex h-[22px] w-[22px] items-center justify-center rounded-full text-[13px] font-bold leading-none';
const CIRCULO_CERRADO = 'bg-slate-100 text-slate-500 dark:bg-ink-surface dark:text-ink-muted';
const CIRCULO_ABIERTO = 'bg-slate-200 text-slate-700 dark:bg-ink-border dark:text-ink-text';

export function HelpPopover({
  title,
  children,
  triggerText,
  placement = 'bottom',
}: {
  title: string;
  children: ReactNode;
  // Sin triggerText el gatillo es el circulito con el "?" (el caso de toda la app). Con texto es
  // un link blanco, que es como lo necesita el hero del login sobre la foto.
  triggerText?: string;
  // 'top' para un gatillo que vive al pie de la pantalla, como el del login.
  placement?: 'top' | 'bottom';
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;

    // El cartel mobile es modal de verdad (tapa todo), así que el foco entra ahí. El panel de
    // desktop no bloquea nada — no hace falta moverle el foco encima al usuario.
    closeButtonRef.current?.focus();

    // El scroll se bloquea SOLO en la forma mobile. En desktop el panel está anclado al
    // gatillo y viaja con él, así que scrollear no lo despega de nada; bloquear ahí dejaba la
    // página muerta con un simple tooltip abierto.
    // ponytail: se mide una vez al abrir. Si alguien cruza el breakpoint con el cartel abierto
    // queda con el valor viejo — un matchMedia con listener lo arregla si alguna vez molesta.
    const esMobile = window.innerWidth < 768;
    const previousOverflow = document.body.style.overflow;
    if (esMobile) document.body.style.overflow = 'hidden';

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    // mousedown y no click: si fuera click, el mismo click que ABRE el cartel (el del gatillo) se
    // procesaría también como "de afuera" y lo cerraría en el mismo gesto.
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) close();
    }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onClickOutside);
    return () => {
      if (esMobile) document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        // Con texto, el texto ES el nombre accesible. Con el icono, el nombre lo tiene que dar
        // el aria-label, y el título de la ayuda ya es una pregunta bien formada.
        aria-label={triggerText ? undefined : title}
        onClick={() => setOpen((v) => !v)}
        className={triggerText ? 'text-sm font-semibold text-white hover:underline' : GATILLO_ICONO}
      >
        {triggerText ?? (
          <span
            aria-hidden="true"
            className={`${CIRCULO_BASE} ${open ? CIRCULO_ABIERTO : CIRCULO_CERRADO}`}
          >
            ?
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Mobile: cartel que sube desde abajo, con scrim atrás. */}
          <div
            aria-hidden="true"
            onClick={close}
            className="enter-fade fixed inset-0 z-50 bg-black/60 md:hidden"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="enter-sheet fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white p-5 md:hidden dark:bg-ink-surface"
          >
            <h2 className="mb-2 text-lg font-bold text-slate-900 dark:text-ink-text">{title}</h2>
            <p className="mb-5 text-sm leading-relaxed text-slate-600 dark:text-ink-muted">
              {children}
            </p>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={close}
              className="w-full rounded-lg bg-red-600 py-3 text-sm font-bold text-white hover:bg-red-700"
            >
              OK
            </button>
          </div>

          {/* Desktop: panel anclado al gatillo, no un modal — no bloquea el resto de la
              pantalla, por eso no lleva scrim ni aria-modal. */}
          <div
            role="dialog"
            aria-label={title}
            className={`enter-scale absolute left-0 z-50 hidden w-80 rounded-lg bg-white p-4 text-left shadow-2xl after:absolute after:left-6 after:border-8 after:border-transparent md:block dark:bg-ink-surface ${PANEL_SEGUN_PLACEMENT[placement]}`}
          >
            <h2 className="mb-2 text-base font-bold text-slate-900 dark:text-ink-text">{title}</h2>
            <p className="mb-4 text-sm leading-relaxed text-slate-600 dark:text-ink-muted">
              {children}
            </p>
            <button
              type="button"
              onClick={close}
              className="w-full rounded-md bg-red-600 py-2 text-sm font-bold text-white hover:bg-red-700"
            >
              OK
            </button>
          </div>
        </>
      )}
    </div>
  );
}
