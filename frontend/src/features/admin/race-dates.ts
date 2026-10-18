// Puente entre <input type="datetime-local"> y lo que exige el backend.
//
// El schema de carreras usa `z.iso.datetime({ offset: true })` (backend/src/modules/races/
// races.schema.ts), o sea ISO 8601 CON zona. El input nativo no la tiene: entrega
// "2026-07-05T14:00", sin segundos ni zona. Las dos funciones son simetricas a proposito —
// lo que el admin escribe como 14:00 en su reloj se vuelve a mostrar como 14:00.
//
// Por que no mandar el valor crudo del input: el backend lo rechazaria con VALIDATION_ERROR.
// Y por que no pegarle un "Z" al final: eso declararia que las 14:00 de Rosario son las 14:00
// UTC, y la carrera quedaria tres horas corrida.

/** "2026-07-05T14:00" (hora local del admin) -> "2026-07-05T17:00:00.000Z" */
export function toIsoUtc(local: string): string {
  // new Date de un ISO sin zona lo interpreta como hora LOCAL (ES2015+), que es exactamente
  // lo que queremos: el admin carga la hora de su reloj.
  return new Date(local).toISOString();
}

/** "2026-07-05T17:00:00.000Z" -> "2026-07-05T14:00", el unico formato que el input acepta. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  // toISOString() siempre imprime UTC, asi que hay que correr el instante por el offset del
  // navegador ANTES de cortar: sin esto el input muestra la hora UTC y editar una carrera sin
  // tocar la fecha la movería.
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
