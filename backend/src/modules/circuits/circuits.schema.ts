import { z } from 'zod';

export const createCircuitSchema = z.object({
  name: z.string().min(1),
  country: z.string().min(1),
  city: z.string().min(1),
  circuitLength: z.number().positive().optional(),
  externalId: z.string().min(1),
});

export const updateCircuitSchema = createCircuitSchema.partial();

export type CreateCircuitInput = z.infer<typeof createCircuitSchema>;
export type UpdateCircuitInput = z.infer<typeof updateCircuitSchema>;
