import { z } from 'zod';

// idParamSchema: valida y coerciona el `:id` de las rutas de catalogo (A3 / BOX-13). Se usa
// con validateParams(). Antes los controllers hacian Number(req.params.id) a mano: con
// GET /drivers/abc eso es NaN, llegaba a Prisma y explotaba en 500. Ahora es 400
// VALIDATION_ERROR antes de tocar la DB — mismo criterio que leagueIdParamSchema en leagues.
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
