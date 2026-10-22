// POST /races/:id/recalculate se monta desde races.routes.ts: es race-scoped y admin-only.

import { Router } from 'express';
import * as standingsController from './standings.controller';
import { validateQuery } from '../../middleware/validate';
import { standingsQuerySchema } from './standings.schema';

const router = Router();

router.get('/', validateQuery(standingsQuerySchema), standingsController.getByLeague);

export default router;
