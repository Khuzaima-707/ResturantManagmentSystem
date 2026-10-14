import { Router } from 'express';
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  seedCategories,
} from '../controllers/categoryController.js';
import {
  createCategorySchema,
  updateCategorySchema,
  validate,
} from '../validators/categoryValidator.js';

const router = Router();

// Category Collection endpoints
router.get('/', getAllCategories);
router.post('/', validate(createCategorySchema), createCategory);

// Seed default categories
router.post('/seed', seedCategories);

// Single Category endpoints
router.get('/:id', getCategoryById);
router.put('/:id', validate(updateCategorySchema), updateCategory);
router.delete('/:id', deleteCategory);

export default router;
