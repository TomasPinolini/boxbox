import { z } from 'zod';

export const createDriverSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  number: z.number().int().min(0).max(99),
  code: z.string().length(3).toUpperCase(), // siempre 3 letras mayúsculas: "VER", "NOR"
  headshotUrl: z.string().url().optional(), // opcional — se puede agregar después
  externalId: z.string().min(1),
});

export const updateDriverSchema = createDriverSchema.partial();

// Sin validar, ?constructorId=abc llega a Prisma como NaN y escala a 500.
export const listDriversQuerySchema = z.object({
  constructorId: z.coerce.number().int().positive().optional(),
  seasonId: z.coerce.number().int().positive().optional(),
});

export const standingsQuerySchema = listDriversQuerySchema.pick({ seasonId: true });

export type CreateDriverInput = z.infer<typeof createDriverSchema>;
export type UpdateDriverInput = z.infer<typeof updateDriverSchema>;
export type ListDriversQuery = z.infer<typeof listDriversQuerySchema>;
export type StandingsQuery = z.infer<typeof standingsQuerySchema>;
