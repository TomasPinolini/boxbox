// SCHEMA — el contrato de datos del módulo

import { z } from 'zod';

// ?year= de POST /admin/sync/races. z.coerce porque todo query param llega como string.
// 1950 = primera temporada de F1; el tope evita pedirle a Jolpica un año absurdo.
export const syncRacesQuerySchema = z.object({
  year: z.coerce.number().int().min(1950).max(2100),
});

// ?dryRun=true de POST /admin/sync/races/:id/results: mapea y devuelve, sin escribir resultados.
// Enum de strings y no z.coerce.boolean(): Boolean('false') es true.
export const syncResultsQuerySchema = z.object({
  dryRun: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

export type SyncRacesQuery = z.infer<typeof syncRacesQuerySchema>;
export type SyncResultsQuery = z.infer<typeof syncResultsQuerySchema>;
