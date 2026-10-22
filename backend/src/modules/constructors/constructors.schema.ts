import { z } from 'zod';
import { seasonQuerySchema } from '../../shared/params';

export const createConstructorSchema = z.object({
  name: z.string().min(1),
  color: z.string().min(1),
  logoUrl: z.string().url().optional(),
  externalId: z.string().min(1),
});

export const updateConstructorSchema = createConstructorSchema.partial();

export const standingsQuerySchema = seasonQuerySchema;

export type CreateConstructorInput = z.infer<typeof createConstructorSchema>;
export type UpdateConstructorInput = z.infer<typeof updateConstructorSchema>;
export type StandingsQuery = z.infer<typeof standingsQuerySchema>;
