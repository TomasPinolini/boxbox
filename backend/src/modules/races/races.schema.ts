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

export type CreateRaceInput = z.infer<typeof createRaceSchema>;
export type UpdateRaceInput = z.infer<typeof updateRaceSchema>;
