import { Router } from 'express';
import {
  createReversal,
  getAllReversals,
  getReversalById,
} from '../controllers/reversalController.js';
import {
  createReversalSchema,
  validate,
} from '../validators/reversalValidator.js';

const router = Router();

// Collection routes
router.get('/', getAllReversals);
router.post('/', validate(createReversalSchema), createReversal);

// Single reversal detail
router.get('/:id', getReversalById);

export default router;
