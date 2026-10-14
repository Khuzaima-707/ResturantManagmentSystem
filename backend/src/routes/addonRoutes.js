import { Router } from 'express';
import {
  getAllAddons,
  getAddonById,
  createAddon,
  updateAddon,
  deleteAddon,
  seedAddons,
} from '../controllers/addonController.js';
import {
  createAddonSchema,
  updateAddonSchema,
  validate,
} from '../validators/addonValidator.js';

const router = Router();

// Collection endpoints
router.get('/', getAllAddons);
router.post('/', validate(createAddonSchema), createAddon);

// Seed master add-ons
router.post('/seed', seedAddons);

// Single add-on endpoints
router.get('/:id', getAddonById);
router.put('/:id', validate(updateAddonSchema), updateAddon);
router.delete('/:id', deleteAddon);

export default router;
