// SCHEMAS Zod para Draft — fuente unica de verdad sobre que shape acepta cada endpoint.
// start/state/available/reset no llevan body. Solo pick necesita schema.

import { z } from 'zod';

// POST /leagues/:id/draft/pick body. Exactamente uno de los dos campos — cual corresponde
// depende de la ronda actual (rondas 1-3 = driver, ronda 4 = constructor). Mandar ambos o
// ninguno es 400 VALIDATION_ERROR; mandar el que no corresponde a la ronda es 409
// WRONG_PICK_CATEGORY (eso lo valida el service, no Zod, porque depende del estado del draft).
export const draftPickSchema = z
  .object({
    driverId: z.number().int().positive().optional(),
    constructorId: z.number().int().positive().optional(),
  })
  .refine((data) => (data.driverId !== undefined) !== (data.constructorId !== undefined), {
    message: 'Exactly one of driverId or constructorId must be provided',
  });

export type DraftPickInput = z.infer<typeof draftPickSchema>;
