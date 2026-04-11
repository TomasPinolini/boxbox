import { Router } from 'express';
import * as driversController from './drivers.controller';
import { validate } from '../../middleware/validate';
import { createDriverSchema, updateDriverSchema } from './drivers.schema';

const router = Router();

router.get('/', driversController.getAll);
router.get('/:id', driversController.getById);
router.post('/', validate(createDriverSchema), driversController.create);
router.patch('/:id', validate(updateDriverSchema), driversController.update);
router.delete('/:id', driversController.remove);

export default router;
