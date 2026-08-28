import type { ReactNode } from 'react';

interface FieldProps {
  label: string;
  error?: string | null;
  children: ReactNode;
}

// Field: label + slot para el <input> que le pasa el padre + error. Envuelve en vez de renderizar
// el input, asi funciona con `register()` de react-hook-form sin acoplarse a la libreria.
export function Field({ label, error, children }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {error && <span className="mt-1 block text-sm text-red-600">{error}</span>}
    </label>
  );
}

// Clases compartidas para los <input> nativos, asi las paginas no las repiten.
export const inputClass = 'w-full rounded-md border border-slate-300 px-3 py-2';
