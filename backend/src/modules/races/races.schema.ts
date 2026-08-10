import { z } from 'zod';

export const createRaceSchema = z.object({
  name: z.string().min(1),
  round: z.number().int().min(1),
  date: z.coerce.date(),
  qualifyingDate: z.coerce.date().optional(),
  sprintDate: z.coerce.date().optional(),
  lockDate: z.coerce.date(),
  seasonId: z.number().int(),
  circuitId: z.number().int(),
});

export const updateRaceSchema = createRaceSchema.partial();

// Slice 7 — POST /races/:id/results (admin)
// Un item por driver. Position es nullable (DNF/DSQ/DNS pueden no tener posicion final).
// No hacemos cross-field validation status↔position en el schema: en F1 real, un DNF puede
// estar "classified" con posicion si completo >=90% de la carrera. La regla la decide el
// caller admin, no el schema.
const raceResultItemSchema = z.object({
  driverId: z.number().int().positive(),
  position: z.number().int().positive().optional(),
  points: z.number().int().nonnegative(),
  gridPosition: z.number().int().positive().optional(),
  // laps completadas por el piloto. Nullable en DB (DNS no tiene laps). Ambas APIs
  // publicas (Jolpica y OpenF1) lo retornan — futureproof para Slice 12 sin extra migration.
  laps: z.number().int().nonnegative().optional(),
  fastestLap: z.boolean().optional(),
  status: z.enum(['CLASSIFIED', 'DNF', 'DSQ', 'DNS']),
});

export const loadRaceResultsSchema = z.object({
  // min(1): al menos un result. max(30): F1 moderno tiene 20 pilotos; buffer para
  // datos historicos con parrillas mas grandes. Evita payloads absurdos por accidente.
  results: z.array(raceResultItemSchema).min(1).max(30),
});

export type CreateRaceInput = z.infer<typeof createRaceSchema>;
export type UpdateRaceInput = z.infer<typeof updateRaceSchema>;
export type LoadRaceResultsInput = z.infer<typeof loadRaceResultsSchema>;
