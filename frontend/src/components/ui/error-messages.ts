// Mapa codigo del backend -> mensaje para el usuario (docs/error-codes.md). Un codigo que no
// esta aca muestra el `message` del backend. Vive en su propio archivo (no en Alert.tsx) porque
// Fast Refresh de Vite exige que un archivo .tsx exporte solo componentes.
const MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Email o contraseña incorrectos',
  EMAIL_ALREADY_EXISTS: 'Ya hay una cuenta con ese email',
  TOKEN_INVALID: 'Tu sesión venció, volvé a entrar',
  TOKEN_MISSING: 'Tenés que iniciar sesión',
  REFRESH_TOKEN_INVALID: 'Tu sesión venció, volvé a entrar',
  VALIDATION_ERROR: 'Revisá los datos del formulario',
  RATE_LIMIT_EXCEEDED: 'Demasiados intentos seguidos, esperá un minuto',
  INVITE_CODE_NOT_FOUND: 'Ese código no existe',
  INVITE_CODE_TAKEN: 'Ese código ya está en uso, probá otro',
  LEAGUE_FULL: 'La liga está llena',
  ALREADY_MEMBER: 'Ya sos miembro de esta liga',
  NOT_LEAGUE_OWNER: 'Solo el owner de la liga puede hacer eso',
  ROSTER_LOCKED: 'El draft ya empezó: no se puede cambiar el roster',
  MAX_MEMBERS_EXCEEDS_SEASON: 'Esa cantidad de miembros supera lo que permite la temporada',
  OWNER_CANNOT_LEAVE: 'El owner no puede salir de su liga',
  DRAFT_ALREADY_STARTED: 'El draft ya había arrancado',
  TOO_MANY_MEMBERS_FOR_DRAFT: 'Hay más miembros que pilotos disponibles para el draft',
  NETWORK_ERROR: 'No se pudo conectar con el servidor',
  INTERNAL_ERROR: 'Algo salió mal, probá de nuevo',
};

export function errorMessageFor(code: string, fallback: string): string {
  return MESSAGES[code] ?? fallback;
}
