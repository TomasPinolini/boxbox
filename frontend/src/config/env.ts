// Unico lugar que lee import.meta.env. Vite solo expone variables con prefijo VITE_.
// Falla al arrancar si falta alguna: mejor un error claro que un fetch a "undefined/leagues".
function required(name: 'VITE_API_URL' | 'VITE_SOCKET_URL'): string {
  const value = import.meta.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name} (ver frontend/.env.example)`);
  return value;
}

export const env = {
  apiUrl: required('VITE_API_URL'),
  socketUrl: required('VITE_SOCKET_URL'),
} as const;
