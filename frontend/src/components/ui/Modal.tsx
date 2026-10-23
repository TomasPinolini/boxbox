import { useEffectEvent, useLayoutEffect, useRef, type ReactNode } from 'react';

// <dialog> nativo abierto con showModal(): el navegador pone el foco adentro (en el elemento
// con data-autofocus, si hay), cierra con Escape y vuelve inerte lo de atras. El scroll del
// body lo traba index.css. Solo comportamiento: el aspecto lo trae cada modal en className,
// y el padding va en un hijo, porque un click sobre el <dialog> mismo se toma como del fondo.
export function Modal({
  label,
  onClose,
  className,
  id,
  children,
}: {
  label: string;
  onClose: () => void;
  className: string;
  id?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const pressedOnBackdrop = useRef(false);
  const notifyClose = useEffectEvent(onClose);

  // Layout y no useEffect: la limpieza corre con el <dialog> todavia en la pagina, que es lo
  // que necesita close() para devolverle el foco al boton que lo abrio.
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    // StrictMode monta, limpia y vuelve a montar: el 'close' de esa limpieza llega con el
    // dialogo ya reabierto y no tiene que cerrar nada.
    function onNativeClose() {
      if (!dialog?.open) notifyClose();
    }
    dialog.addEventListener('close', onNativeClose);
    dialog.showModal();
    dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    return () => {
      dialog.removeEventListener('close', onNativeClose);
      dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      id={id}
      aria-label={label}
      className={className}
      // Se mira tambien donde empezo el click: soltar afuera una seleccion de texto hecha
      // adentro no tiene que cerrarlo.
      onMouseDown={(e) => {
        pressedOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (pressedOnBackdrop.current && e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </dialog>
  );
}
