import { z } from 'zod';

export const createSeasonSchema = z.object({
  year: z.number().int().min(2020).max(2030),
  isActive: z.boolean().optional(),
  driverCount: z.number().int().min(1).max(30).optional(),
});

export const updateSeasonSchema = createSeasonSchema.partial();

export type CreateSeasonInput = z.infer<typeof createSeasonSchema>;
export type UpdateSeasonInput = z.infer<typeof updateSeasonSchema>;
