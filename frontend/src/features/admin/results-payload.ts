import type { RaceResultStatus } from '../../models/driver';
import type { RaceResultInput } from '../../services/races.service';

// Puntos de F1 por posicion final (top 10). Desde 2025 no hay punto por vuelta rapida.
const POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

export interface ResultRow {
  driverId: number;
  label: string; // para los mensajes de error
  position: string; // crudo del <input>; '' = sin posicion
  status: RaceResultStatus;
}

export function pointsFor(position: number | undefined, status: RaceResultStatus): number {
  if (status !== 'CLASSIFIED' || position === undefined) return 0;
  return POINTS[position - 1] ?? 0;
}

// Pura a proposito: es toda la logica de la pantalla y se testea sin render.
export function buildResultsPayload(
  rows: ResultRow[],
): { ok: true; results: RaceResultInput[] } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const seen = new Map<number, string>();
  const results = rows.map((row) => {
    const position = row.position === '' ? undefined : Number(row.position);
    if (position !== undefined && (!Number.isInteger(position) || position < 1)) {
      errors.push(`${row.label}: la posición tiene que ser un entero desde 1`);
    } else if (position === undefined && row.status === 'CLASSIFIED') {
      errors.push(`${row.label}: clasificó pero no tiene posición`);
    } else if (position !== undefined) {
      const other = seen.get(position);
      if (other) errors.push(`Posición ${position} repetida: ${other} y ${row.label}`);
      seen.set(position, row.label);
    }
    return {
      driverId: row.driverId,
      ...(position !== undefined ? { position } : {}),
      points: pointsFor(position, row.status),
      status: row.status,
    };
  });
  return errors.length > 0 ? { ok: false, errors } : { ok: true, results };
}
