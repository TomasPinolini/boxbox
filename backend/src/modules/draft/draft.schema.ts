import { z } from 'zod';

// Que campo corresponde a la ronda lo valida el service (409 WRONG_PICK_CATEGORY): depende
// del estado del draft, no del body.
export const draftPickSchema = z
  .object({
    driverId: z.number().int().positive().optional(),
    constructorId: z.number().int().positive().optional(),
  })
  .refine((data) => (data.driverId !== undefined) !== (data.constructorId !== undefined), {
    message: 'Exactly one of driverId or constructorId must be provided',
  });

export type DraftPickInput = z.infer<typeof draftPickSchema>;
