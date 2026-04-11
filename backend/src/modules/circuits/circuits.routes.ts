import { Router } from 'express';
import * as circuitsController from './circuits.controller';
import { validate } from '../../middleware/validate';
import { createCircuitSchema, updateCircuitSchema } from './circuits.schema';

const router = Router();

router.get('/', circuitsController.getAll);
router.get('/:id', circuitsController.getById);
router.post('/', validate(createCircuitSchema), circuitsController.create);
router.patch('/:id', validate(updateCircuitSchema), circuitsController.update);
router.delete('/:id', circuitsController.remove);

export default router;
