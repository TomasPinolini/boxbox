import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger';

// Button: un <button> con las 3 variantes visuales del proyecto. No sabe de dominio.
// Las props son las "propiedades de entrada" (rubrica); onClick es la "salida".
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

// primary no necesita variante oscura: rojo sobre blanco u oscuro da buen contraste en los
// dos. secondary y danger si — son fondos/bordes pensados para una pagina clara, y se
// perderian contra el fondo oscuro (ver --color-ink* en index.css).
const variantClasses: Record<Variant, string> = {
  primary: 'bg-red-600 text-white hover:bg-red-700',
  secondary:
    'bg-white text-slate-900 ring-1 ring-slate-300 hover:bg-slate-50 dark:bg-ink-surface dark:text-ink-text dark:ring-ink-border dark:hover:bg-ink-border',
  danger:
    'bg-slate-900 text-white hover:bg-black dark:bg-ink-surface dark:ring-1 dark:ring-ink-border dark:hover:bg-ink-border',
};

export function Button({
  variant = 'primary',
  type = 'button',
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      // min-h-11 (44px): minimo tactil en telefono (auditoria UX). px-4 py-2 por si solo da
      // 36px de alto — min-h fuerza el piso sin tocar el padding, que sigue centrando el
      // texto igual que antes.
      className={`inline-flex min-h-11 items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${className}`}
      {...rest}
    />
  );
}
