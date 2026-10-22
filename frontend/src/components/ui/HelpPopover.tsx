import { useEffect, useRef, useState, type ReactNode } from 'react';

// Dos formas que se turnan por CSS: en mobile un diálogo modal con scrim; en desktop un panel
// anclado al gatillo que no bloquea nada.

// Clases completas, no armadas con `${}`: Tailwind solo genera las que encuentra como literales.
const PANEL_SEGUN_PLACEMENT = {
  top: 'bottom-full mb-3 after:top-full after:border-t-white dark:after:border-t-ink-surface',
  bottom: 'top-full mt-3 after:bottom-full after:border-b-white dark:after:border-b-ink-surface',
} as const;

// Botón de 44px (área táctil mínima) alrededor de un círculo de 22: el -my-[11px] evita que
// empuje la fila.
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
  // Sin triggerText el gatillo es el "?"; con texto es un link blanco (hero del login).
  triggerText?: string;
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

    // El foco solo entra al cartel mobile, que es modal; el panel de desktop no bloquea nada.
    closeButtonRef.current?.focus();

    // Scroll bloqueado solo en mobile. Límite: se mide al abrir, cruzar el breakpoint con el
    // cartel abierto deja el valor viejo (un matchMedia con listener lo arregla).
    const esMobile = window.innerWidth < 768;
    const previousOverflow = document.body.style.overflow;
    if (esMobile) document.body.style.overflow = 'hidden';

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    // mousedown y no click: el mismo click que abre el cartel lo cerraría como "de afuera".
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

          {/* Desktop: no es modal, por eso no lleva scrim ni aria-modal. */}
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
