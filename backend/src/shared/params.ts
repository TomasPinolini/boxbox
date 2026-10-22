import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// z.coerce: todo query param llega como string.
export const seasonQuerySchema = z.object({
  seasonId: z.coerce.number().int().positive().optional(),
});
