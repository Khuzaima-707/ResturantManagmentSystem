import { Router } from 'express';
import {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  seedItems,
} from '../controllers/itemController.js';
import {
  createItemSchema,
  updateItemSchema,
  validate,
} from '../validators/itemValidator.js';

const router = Router();

// Collection endpoints
router.get('/', getAllItems);
router.post('/', validate(createItemSchema), createItem);

// Seed canonical default menu items
router.post('/seed', seedItems);

// Single item endpoints
router.get('/:id', getItemById);
router.put('/:id', validate(updateItemSchema), updateItem);
router.delete('/:id', deleteItem);

export default router;
