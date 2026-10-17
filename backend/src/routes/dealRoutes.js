import { Router } from 'express';
import {
  getAllDeals,
  getDealById,
  createDeal,
  updateDeal,
  deleteDeal,
} from '../controllers/dealController.js';
import {
  createDealSchema,
  updateDealSchema,
  validate,
} from '../validators/dealValidator.js';

const router = Router();

router.get('/', getAllDeals);
router.post('/', validate(createDealSchema), createDeal);
router.get('/:id', getDealById);
router.put('/:id', validate(updateDealSchema), updateDeal);
router.delete('/:id', deleteDeal);

export default router;
