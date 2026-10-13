// Unico lugar que lee import.meta.env. Vite solo expone variables con prefijo VITE_.
//
// Antes esto lanzaba durante el import si faltaba una variable, y como corre antes de que React
// monte nada, el resultado era una pantalla en blanco con el error solo en la consola: quien
// clona el repo y corre `npm run dev` sin copiar .env.example cree que la app esta rota.
//
// Ahora cae a los puertos de desarrollo por defecto y avisa. Si el default esta mal, el error
// que se ve es un fetch fallido contra localhost:3000, que dice mucho mas que una pantalla vacia.
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

export const env = {
  apiUrl: read('VITE_API_URL'),
  socketUrl: read('VITE_SOCKET_URL'),
} as const;
