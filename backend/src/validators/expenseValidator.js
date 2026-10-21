import { z } from 'zod';

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Rent',
  'Electricity',
  'Gas',
  'Staff Salary',
  'Internet',
  'Maintenance',
  'Cleaning',
  'Delivery / Fuel',
  'Marketing',
  'Kitchen Supplies',
  'Office Supplies',
  'Repair',
  'Other',
];

export const createExpenseSchema = z.object({
  id: z.string().trim().optional(),
  expenseDate: z.string().or(z.date()).optional(),
  categoryId: z.string().trim().optional(),
  category: z.string().trim().min(1, 'Category is required'),
  categoryNameSnapshot: z.string().trim().optional(),
  amount: z.number().positive('Expense amount must be strictly greater than zero'),
  paymentMethod: z.enum(['Cash', 'Online', 'CASH', 'ONLINE']),
  onlineMethodSnapshot: z.string().trim().optional(),
  description: z.string().trim().max(500).optional().default(''),
  referenceNumber: z.string().trim().max(100).optional().default(''),
  attachment: z
    .object({
      url: z.string().optional(),
      publicId: z.string().optional(),
      format: z.string().optional(),
      bytes: z.number().optional(),
    })
    .or(z.string())
    .optional(),
  // Attribution fields
  createdByUserId: z.string().trim().optional(),
  createdByName: z.string().trim().optional(),
  createdByRole: z.string().trim().optional(),
  // Legacy alias fields
  title: z.string().trim().optional(),
  paidTo: z.string().trim().optional(),
  receiptNumber: z.string().trim().optional(),
  note: z.string().trim().optional(),
}).refine(
  (data) => {
    const isOnline = String(data.paymentMethod).toUpperCase() === 'ONLINE';
    if (isOnline) {
      return Boolean(data.onlineMethodSnapshot && data.onlineMethodSnapshot.trim().length > 0);
    }
    return true;
  },
  {
    message: 'Online Method / Account is required when payment method is Online',
    path: ['onlineMethodSnapshot'],
  }
);

export const updateExpenseSchema = z.object({
  expenseDate: z.string().or(z.date()).optional(),
  categoryId: z.string().trim().optional(),
  category: z.string().trim().min(1).optional(),
  categoryNameSnapshot: z.string().trim().optional(),
  amount: z.number().positive('Expense amount must be strictly greater than zero').optional(),
  paymentMethod: z.enum(['Cash', 'Online', 'CASH', 'ONLINE']).optional(),
  onlineMethodSnapshot: z.string().trim().optional(),
  description: z.string().trim().max(500).optional(),
  referenceNumber: z.string().trim().max(100).optional(),
  attachment: z
    .object({
      url: z.string().optional(),
      publicId: z.string().optional(),
      format: z.string().optional(),
      bytes: z.number().optional(),
    })
    .or(z.string())
    .optional(),
  createdByUserId: z.string().trim().optional(),
  createdByName: z.string().trim().optional(),
  createdByRole: z.string().trim().optional(),
  title: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

export const voidExpenseSchema = z.object({
  voidReason: z
    .string({ required_error: 'Void reason is required' })
    .trim()
    .min(2, 'Void reason must be at least 2 characters')
    .max(500, 'Void reason cannot exceed 500 characters'),
});

export const expenseCategorySchema = z.object({
  name: z
    .string({ required_error: 'Category name is required' })
    .trim()
    .min(2, 'Category name must be at least 2 characters')
    .max(100, 'Category name cannot exceed 100 characters'),
  description: z.string().trim().max(250).optional().default(''),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

export function validate(schema) {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req.body);
      if (!result.success) {
        const errorMessages = result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return res.status(400).json({
          success: false,
          message: errorMessages[0]?.message || 'Validation failed',
          errors: errorMessages,
        });
      }
      req.body = result.data;
      next();
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request payload',
        error: err.message,
      });
    }
  };
}
