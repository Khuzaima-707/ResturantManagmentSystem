import { Router } from 'express';
import {
  createExpense,
  getAllExpenses,
  getExpenseById,
  updateExpense,
  voidExpense,
  deleteExpense,
  getProfitAndLossSummary,
  seedExpenses,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/expenseController.js';
import {
  createExpenseSchema,
  updateExpenseSchema,
  voidExpenseSchema,
  expenseCategorySchema,
  validate,
} from '../validators/expenseValidator.js';

const router = Router();

// Category Lifecycle Routes (must precede /:id)
router.get('/categories', getAllCategories);
router.post('/categories', validate(expenseCategorySchema), createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// P&L Accounting endpoint
router.get('/profit-and-loss', getProfitAndLossSummary);

// Seed sample expenses / categories
router.post('/seed', seedExpenses);

// Collection routes
router.get('/', getAllExpenses);
router.post('/', validate(createExpenseSchema), createExpense);

// Void Expense endpoints
router.post('/:id/void', validate(voidExpenseSchema), voidExpense);
router.put('/:id/void', validate(voidExpenseSchema), voidExpense);

// Single expense routes
router.get('/:id', getExpenseById);
router.put('/:id', validate(updateExpenseSchema), updateExpense);
router.delete('/:id', deleteExpense);

export default router;
