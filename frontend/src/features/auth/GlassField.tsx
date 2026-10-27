import type { UseFormRegisterReturn } from 'react-hook-form';

// Local y no en components/ui: inputClass asume fondo claro, y Login y Registro son las unicas
// pantallas sobre una foto oscura.
const glassInputClass =
  'w-full rounded-t-md border-0 border-b border-white/35 bg-white/10 px-3 py-2.5 text-white placeholder:text-white/40 focus:border-red-500 focus:bg-white/15 focus:outline-none';

export function GlassField({
  label,
  type,
  autoComplete,
  registration,
  error,
}: {
  label: string;
  type: 'text' | 'email' | 'password';
  autoComplete: string;
  registration: UseFormRegisterReturn;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-white/70">{label}</span>
      <input
        type={type}
        autoComplete={autoComplete}
        className={glassInputClass}
        {...registration}
      />
      {error && <span className="mt-1.5 block text-sm text-red-400">{error}</span>}
    </label>
  );
}
