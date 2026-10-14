import { Router } from 'express';
import {
  getCurrentShift,
  openShift,
  closeShift,
  getAllShifts,
  getShiftById,
} from '../controllers/shiftController.js';
import {
  openShiftSchema,
  closeShiftSchema,
  validate,
} from '../validators/shiftValidator.js';

const router = Router();

// Active shift status
router.get('/current', getCurrentShift);

// Open shift
router.post('/open', validate(openShiftSchema), openShift);

// Close shift (Z-Report)
router.post('/close', validate(closeShiftSchema), closeShift);

// Shift history
router.get('/', getAllShifts);
router.get('/:id', getShiftById);

export default router;
