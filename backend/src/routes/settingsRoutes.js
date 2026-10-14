import { Router } from 'express';
import {
  getSettings,
  updateSettings,
  deleteAllData,
} from '../controllers/settingsController.js';
import {
  updateSettingsSchema,
  dangerZoneResetSchema,
  validate,
} from '../validators/settingsValidator.js';

const router = Router();

// Settings endpoints
router.get('/', getSettings);
router.put('/', validate(updateSettingsSchema), updateSettings);

// Danger Zone: Delete All Data
router.post(
  '/danger-zone/reset',
  validate(dangerZoneResetSchema),
  deleteAllData
);

export default router;
