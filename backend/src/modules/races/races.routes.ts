import { Router } from 'express';
import * as racesController from './races.controller';
import { validate } from '../../middleware/validate';
import { createRaceSchema, updateRaceSchema } from './races.schema';

const router = Router();

router.get('/', racesController.getAll);
router.get('/:id', racesController.getById);
router.post('/', validate(createRaceSchema), racesController.create);
router.patch('/:id', validate(updateRaceSchema), racesController.update);
router.delete('/:id', racesController.remove);

export default router;
