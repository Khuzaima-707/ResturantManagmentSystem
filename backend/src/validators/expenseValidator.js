import { z } from 'zod';

export const EXPENSE_CATEGORIES = [
  'Raw Materials / Meat & Groceries',
  'Kitchen Supplies & Packaging',
  'Utilities (Gas, Electricity, Water)',
  'Staff Salaries & Wages',
  'Rent & Property',
  'Repairs & Maintenance',
  'Marketing & Ads',
  'Petty Cash / Misc',
];

export const createExpenseSchema = z.object({
  id: z.string().trim().optional(),
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(150),
  category: z.enum([
    'Raw Materials / Meat & Groceries',
    'Kitchen Supplies & Packaging',
    'Utilities (Gas, Electricity, Water)',
    'Staff Salaries & Wages',
    'Rent & Property',
    'Repairs & Maintenance',
    'Marketing & Ads',
    'Petty Cash / Misc',
  ]),
  amount: z.number().min(1, 'Amount must be at least 1'),
  paymentMethod: z.enum(['Cash', 'Bank Transfer', 'Online / Cheque']).default('Cash'),
  paidTo: z.string().trim().max(100).optional().default(''),
  receiptNumber: z.string().trim().max(50).optional().default(''),
  note: z.string().trim().max(500).optional().default(''),
  recordedBy: z.string().trim().max(100).optional().default('Admin'),
  expenseDate: z.string().or(z.date()).optional(),
});

export const updateExpenseSchema = z.object({
  title: z.string().trim().min(2).max(150).optional(),
  category: z
    .enum([
      'Raw Materials / Meat & Groceries',
      'Kitchen Supplies & Packaging',
      'Utilities (Gas, Electricity, Water)',
      'Staff Salaries & Wages',
      'Rent & Property',
      'Repairs & Maintenance',
      'Marketing & Ads',
      'Petty Cash / Misc',
    ])
    .optional(),
  amount: z.number().min(1).optional(),
  paymentMethod: z.enum(['Cash', 'Bank Transfer', 'Online / Cheque']).optional(),
  paidTo: z.string().trim().max(100).optional(),
  receiptNumber: z.string().trim().max(50).optional(),
  note: z.string().trim().max(500).optional(),
  expenseDate: z.string().or(z.date()).optional(),
});

export function validate(schema) {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req.body);
      req.body = parsed;
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            details: err.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
        });
      }
      next(err);
    }
  };
}
