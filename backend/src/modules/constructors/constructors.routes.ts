import { Router } from 'express';
import * as constructorsController from './constructors.controller';
import { validate } from '../../middleware/validate';
import { createConstructorSchema, updateConstructorSchema } from './constructors.schema';

const router = Router();

router.get('/', constructorsController.getAll);
router.get('/:id', constructorsController.getById);
router.post('/', validate(createConstructorSchema), constructorsController.create);
router.patch('/:id', validate(updateConstructorSchema), constructorsController.update);
router.delete('/:id', constructorsController.remove);

export default router;
