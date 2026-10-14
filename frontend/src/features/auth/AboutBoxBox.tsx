import { useEffect, useRef, useState } from 'react';

const DESCRIPTION =
  'Una fantasy league de Fórmula 1: armás tu equipo (2 pilotos + 1 escudería) en un draft en vivo contra tus amigos, y sumás puntos con los resultados reales de cada carrera de la temporada.';

// AboutBoxBox: el "¿Qué es BoxBox?" de login y register — las dos únicas pantallas sin la
// barra de navegación, así que son las únicas que necesitan explicar qué es esto.
//
// Dos formas, no una que se adapta: en mobile es un dialogo de verdad (cartel que sube con un
// scrim atrás, bloquea el resto de la pantalla); en desktop es un panel que crece anclado al
// link, sin bloquear nada — la metáfora que pidió el usuario fue "una ampliación de texto", no
// un modal. Los dos existen siempre en el DOM y se turnan por CSS (md:hidden / hidden md:block),
// mismo patrón que las dos fotos de fondo de esta pantalla.
export function AboutBoxBox() {
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
    // El cartel mobile es modal de verdad (tapa todo), asi que el foco entra ahi. El panel de
    // desktop no bloquea nada — no hace falta moverle el foco encima al usuario.
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    // mousedown y no click: si fuera click, el mismo click que ABRE el popover (el del
    // trigger) se procesaria tambien como "de afuera" y lo cerraria en el mismo gesto.
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) close();
    }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onClickOutside);
    return () => {
      document.body.style.overflow = previousOverflow;
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
        onClick={() => setOpen((v) => !v)}
        className="text-sm font-semibold text-white hover:underline"
      >
        ¿Qué es BoxBox?
      </button>

      {open && (
        <>
          {/* Mobile: cartel que sube desde abajo, con scrim atras. */}
          <div
            aria-hidden="true"
            onClick={close}
            className="enter-fade fixed inset-0 z-50 bg-black/60 md:hidden"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="¿Qué es BoxBox?"
            className="enter-sheet fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white p-5 md:hidden"
          >
            <h2 className="mb-2 text-lg font-bold text-slate-900">¿Qué es BoxBox?</h2>
            <p className="mb-5 text-sm leading-relaxed text-slate-600">{DESCRIPTION}</p>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={close}
              className="w-full rounded-lg bg-red-600 py-3 text-sm font-bold text-white hover:bg-red-700"
            >
              OK
            </button>
          </div>

          {/* Desktop: panel anclado al link, no un modal — no bloquea el resto de la
              pantalla, por eso no lleva scrim. */}
          <div
            role="dialog"
            aria-label="¿Qué es BoxBox?"
            className="enter-scale absolute bottom-full left-0 z-50 mb-3 hidden w-80 rounded-lg bg-white p-4 text-left shadow-2xl after:absolute after:left-6 after:top-full after:border-8 after:border-transparent after:border-t-white md:block"
          >
            <h2 className="mb-2 text-base font-bold text-slate-900">¿Qué es BoxBox?</h2>
            <p className="mb-4 text-sm leading-relaxed text-slate-600">{DESCRIPTION}</p>
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
