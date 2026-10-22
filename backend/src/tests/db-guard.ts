// setup.ts trunca todas las tablas antes de cada test: si DATABASE_URL apunta a una base
// remota, la vaciaria.

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
    // Los brackets de IPv6 quedan en .hostname, y new URL() no pasa a minusculas el host
    // de esquemas no especiales como postgresql:.
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
