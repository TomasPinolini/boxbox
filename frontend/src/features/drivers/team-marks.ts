// Mapa de nombre de escuderia -> archivo del "mark" (el emblema monocromo, blanco o
// blanco+negro) que usa ConstructorStrip para sangrar del borde sobre el color del equipo.
//
// A proposito SEPARADO de Constructor.logoUrl (ver frontend/public/logos/CREDITS.md): esos
// son a color, pensados para el chip circular blanco de ConstructorLogo. Estos son
// monocromos — Red Bull es blanco solido, Ferrari es blanco+negro — e ilegibles sobre blanco
// (los dos toros de Red Bull desaparecen); recien se leen sobre el color de la propia
// escuderia, que es exactamente donde los usa ConstructorStrip. Mezclar ambos destinos en un
// solo campo hubiera roto el chip blanco para las 11 escuderias.
//
// Keyeado por nombre y no por id: el id es un autonumerico de la DB, no estable entre
// entornos (los tests arman su propia liga con sus propios ids). El nombre es el dato fijo
// de la temporada 2026 — ver backend/prisma/seed.ts, teams2026.
const TEAM_MARKS: Record<string, string> = {
  McLaren: '/team-marks/mclaren.png',
  Ferrari: '/team-marks/ferrari.png',
  'Red Bull Racing': '/team-marks/red_bull.png',
  Mercedes: '/team-marks/mercedes.png',
  'Aston Martin': '/team-marks/aston_martin.png',
  Alpine: '/team-marks/alpine.png',
  Haas: '/team-marks/haas.png',
  'Racing Bulls': '/team-marks/rb.png',
  Williams: '/team-marks/williams.png',
  'Audi F1 Team': '/team-marks/audi.png',
  'Cadillac Racing': '/team-marks/cadillac.png',
};

// null si no hay mark para ese nombre — ConstructorStrip simplemente no dibuja el sangrado,
// se queda con la textura de lineas de circuito sola. Nunca un error, nunca un hueco roto.
export function teamMarkUrl(name: string): string | null {
  return TEAM_MARKS[name] ?? null;
}
