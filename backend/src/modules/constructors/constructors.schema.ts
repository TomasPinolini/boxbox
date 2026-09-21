import { z } from 'zod';

export const createConstructorSchema = z.object({
  name: z.string().min(1),
  color: z.string().min(1),
  logoUrl: z.string().url().optional(),
  externalId: z.string().min(1),
});

export const updateConstructorSchema = createConstructorSchema.partial();

// Query de GET /constructors/standings. z.coerce: todo query param llega como string.
export const standingsQuerySchema = z.object({
  seasonId: z.coerce.number().int().positive().optional(),
});

export type CreateConstructorInput = z.infer<typeof createConstructorSchema>;
export type UpdateConstructorInput = z.infer<typeof updateConstructorSchema>;
export type StandingsQuery = z.infer<typeof standingsQuerySchema>;
