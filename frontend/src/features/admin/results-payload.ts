import type { RaceResultStatus } from '../../models/driver';
import type { RaceResultInput } from '../../services/races.service';

// `imported` viaja tal cual al payload: datos de Jolpica que la grilla no muestra ni edita.
export interface Entry {
  position: string; // crudo del <input>; '' = sin posicion
  status: RaceResultStatus;
  imported?: Pick<RaceResultInput, 'gridPosition' | 'laps' | 'fastestLap'>;
}

export interface ResultRow extends Entry {
  driverId: number;
  label: string; // para los mensajes de error
}

export function entriesFromPreview(results: RaceResultInput[]): Record<number, Entry> {
  const entries: Record<number, Entry> = {};
  for (const { driverId, position, status, ...imported } of results) {
    entries[driverId] = { position: position?.toString() ?? '', status, imported };
  }
  return entries;
}

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
      ...row.imported,
      status: row.status,
    };
  });
  return errors.length > 0 ? { ok: false, errors } : { ok: true, results };
}
