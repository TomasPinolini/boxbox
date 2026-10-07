import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger';

// Button: un <button> con las 3 variantes visuales del proyecto. No sabe de dominio.
// Las props son las "propiedades de entrada" (rubrica); onClick es la "salida".
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-red-600 text-white hover:bg-red-700',
  secondary: 'bg-white text-slate-900 ring-1 ring-slate-300 hover:bg-slate-50',
  danger: 'bg-slate-900 text-white hover:bg-black',
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
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${className}`}
      {...rest}
    />
  );
}
