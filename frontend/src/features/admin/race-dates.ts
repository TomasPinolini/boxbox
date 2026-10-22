// El backend exige ISO con zona y <input type="datetime-local"> no la tiene. Pegarle una "Z"
// declararia que las 14:00 de Rosario son 14:00 UTC: la carrera quedaria tres horas corrida.

/** "2026-07-05T14:00" (hora local del admin) -> "2026-07-05T17:00:00.000Z" */
export function toIsoUtc(local: string): string {
  // new Date de un ISO sin zona lo interpreta como hora local, que es lo que carga el admin.
  return new Date(local).toISOString();
}

/** "2026-07-05T17:00:00.000Z" -> "2026-07-05T14:00", el unico formato que el input acepta. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  // toISOString() imprime UTC: sin correr el offset antes de cortar, editar una carrera sin
  // tocar la fecha la movería.
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
