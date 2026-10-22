import { z } from 'zod';

export const standingsQuerySchema = z.object({
  raceId: z.coerce.number().int().positive().optional(),
});

export type StandingsQuery = z.infer<typeof standingsQuerySchema>;
