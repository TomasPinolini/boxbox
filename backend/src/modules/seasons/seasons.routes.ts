import { Router } from 'express';
import * as seasonsController from './seasons.controller';
import { validate } from '../../middleware/validate';
import { createSeasonSchema, updateSeasonSchema } from './seasons.schema';

const router = Router();

router.get('/', seasonsController.getAll);
router.get('/active', seasonsController.getActive);
router.post('/', validate(createSeasonSchema), seasonsController.create);
router.patch('/:id', validate(updateSeasonSchema), seasonsController.update);
router.patch('/:id/activate', seasonsController.activate);
router.delete('/:id', seasonsController.remove);

export default router;
