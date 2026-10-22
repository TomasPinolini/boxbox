// No lanza si falta una variable: corre antes de que React monte y el resultado seria una
// pantalla en blanco. Cae a los puertos de desarrollo y avisa por consola.
const DEFAULTS = {
  VITE_API_URL: 'http://localhost:3000/api/v1',
  VITE_SOCKET_URL: 'http://localhost:3000',
} as const;

function read(name: keyof typeof DEFAULTS): string {
  const value = import.meta.env[name];
  if (value) return value;

  console.warn(
    `Falta ${name}: uso ${DEFAULTS[name]}. Copiá frontend/.env.example a frontend/.env para configurarlo.`,
  );
  return DEFAULTS[name];
}

// Opcionales y sin aviso: sin DSN Sentry no arranca, que es lo deseado en desarrollo.
// El release va junto con los source maps: sin el, Sentry no sabe a que version es cada mapa.
const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const sentryRelease = import.meta.env.VITE_SENTRY_RELEASE as string | undefined;

export const env = {
  apiUrl: read('VITE_API_URL'),
  socketUrl: read('VITE_SOCKET_URL'),
  sentryDsn,
  sentryRelease,
} as const;
