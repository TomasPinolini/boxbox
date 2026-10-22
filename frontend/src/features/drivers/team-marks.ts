// Emblemas monocromos para ConstructorStrip, separados de Constructor.logoUrl: son ilegibles
// sobre blanco y solo se leen sobre el color del propio equipo.
// Keyeado por nombre: el id es autonumerico y cambia entre entornos.
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

export function teamMarkUrl(name: string): string | null {
  return TEAM_MARKS[name] ?? null;
}
