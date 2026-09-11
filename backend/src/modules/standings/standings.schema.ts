// SCHEMA — el contrato de datos del módulo

import { z } from 'zod';

// ?raceId= opcional en GET /leagues/:id/standings. z.coerce porque todo query param llega
// como string; sin esto, ?raceId=abc seria NaN y escalaria a 500.
export const standingsQuerySchema = z.object({
  raceId: z.coerce.number().int().positive().optional(),
});

export type StandingsQuery = z.infer<typeof standingsQuerySchema>;
