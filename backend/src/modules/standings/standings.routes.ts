// ROUTES — solo la parte scopeada a una liga.
// El otro endpoint del modulo, POST /races/:id/recalculate, se monta desde races.routes.ts
// porque es race-scoped y admin-only. La logica de los dos vive en standings.service.ts.

import { Router } from 'express';
import * as standingsController from './standings.controller';
import { validateQuery } from '../../middleware/validate';
import { standingsQuerySchema } from './standings.schema';

const router = Router();

router.get('/', validateQuery(standingsQuerySchema), standingsController.getByLeague);

export default router;
