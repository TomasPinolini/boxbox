import { z } from 'zod';

export const createDriverSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  number: z.number().int().min(0).max(99),
  code: z.string().length(3).toUpperCase(),
  headshotUrl: z.string().url().optional(),
  externalId: z.string().min(1),
});

export const updateDriverSchema = createDriverSchema.partial();

export type CreateDriverInput = z.infer<typeof createDriverSchema>;
export type UpdateDriverInput = z.infer<typeof updateDriverSchema>;
