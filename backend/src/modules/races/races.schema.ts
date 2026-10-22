import { z } from 'zod';

// No usar z.coerce.date(): new Date(null), new Date(true) y new Date(0) no fallan, devuelven
// 1970-01-01, y un lockDate en 1970 deja la carrera cerrada desde siempre.
const isoDate = z.iso.datetime({ offset: true }).transform((s) => new Date(s));

export const createRaceSchema = z.object({
  name: z.string().min(1),
  round: z.number().int().min(1),
  date: isoDate,
  qualifyingDate: isoDate.optional(),
  sprintDate: isoDate.optional(),
  lockDate: isoDate,
  seasonId: z.number().int(),
  circuitId: z.number().int(),
});

export const updateRaceSchema = createRaceSchema.partial();

// Sin validacion cruzada status/position: en F1 un DNF puede quedar clasificado con posicion
// si completo el 90% de la carrera.
const raceResultItemSchema = z.object({
  driverId: z.number().int().positive(),
  position: z.number().int().positive().optional(),
  points: z.number().int().nonnegative(),
  gridPosition: z.number().int().positive().optional(),
  laps: z.number().int().nonnegative().optional(),
  fastestLap: z.boolean().optional(),
  status: z.enum(['CLASSIFIED', 'DNF', 'DSQ', 'DNS']),
});

export const loadRaceResultsSchema = z.object({
  // max(30): margen sobre los ~20 pilotos actuales para parrillas historicas mas grandes.
  results: z.array(raceResultItemSchema).min(1).max(30),
});

export type CreateRaceInput = z.infer<typeof createRaceSchema>;
export type UpdateRaceInput = z.infer<typeof updateRaceSchema>;
export type LoadRaceResultsInput = z.infer<typeof loadRaceResultsSchema>;
