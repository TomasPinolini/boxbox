import { errorMessageFor } from './error-messages';

// Alert: muestra un error de la API en espanol. role="alert" para lectores de pantalla y tests.
export function Alert({ code, message = '' }: { code: string; message?: string }) {
  return (
    <p
      role="alert"
      className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200"
    >
      {errorMessageFor(code, message)}
    </p>
  );
}
