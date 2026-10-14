import { Router } from 'express';
import {
  createExpense,
  getAllExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getProfitAndLossSummary,
  seedExpenses,
} from '../controllers/expenseController.js';
import {
  createExpenseSchema,
  updateExpenseSchema,
  validate,
} from '../validators/expenseValidator.js';

const router = Router();

// Collection routes
router.get('/', getAllExpenses);
router.post('/', validate(createExpenseSchema), createExpense);

// P&L Accounting endpoint
router.get('/profit-and-loss', getProfitAndLossSummary);

// Seed sample expenses
router.post('/seed', seedExpenses);

// Single expense routes
router.get('/:id', getExpenseById);
router.put('/:id', validate(updateExpenseSchema), updateExpense);
router.delete('/:id', deleteExpense);

export default router;
