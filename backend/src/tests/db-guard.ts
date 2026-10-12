// Guarda contra correr la suite de tests sobre una base que no sea local.
//
// setup.ts trunca 16 tablas antes de CADA test. Si DATABASE_URL apunta a Supabase
// (o a cualquier host remoto), eso vacia esa base. Hasta ahora lo unico que lo
// evitaba era acordarse de cambiar el .env antes de correr `npm test`.
//
// Pura y sin DB a proposito: se testea sin tocar Postgres.

const ALLOWED_HOSTS = ['localhost', '127.0.0.1', '::1'];

export function assertLocalDatabase(url: string | undefined): void {
  if (!url) {
    throw new Error(
      'DATABASE_URL no esta definida. Los tests truncan la base entera: ' +
        'apuntala a tu Postgres local antes de correrlos.',
    );
  }

  let host: string;
  try {
    // Dos normalizaciones, las dos necesarias:
    //  - los brackets de IPv6 (postgresql://user@[::1]:5432/db) quedan en .hostname;
    //  - el host NO viene en minusculas, porque new URL() solo normaliza el host de los
    //    esquemas especiales (http, https, ws, file) y postgresql: no es uno de ellos.
    host = new URL(url).hostname.replace(/^\[|\]$/g, '').toLowerCase();
  } catch {
    throw new Error(
      `DATABASE_URL no es una URL valida, no se puede verificar que sea local: ${url}`,
    );
  }

  if (!ALLOWED_HOSTS.includes(host)) {
    throw new Error(
      `Los tests estan apuntando a la base remota "${host}" y la truncarian entera. ` +
        `Solo se permiten ${ALLOWED_HOSTS.join(', ')}. ` +
        'Cambia DATABASE_URL en backend/.env a tu Postgres local antes de correr los tests.',
    );
  }
}
