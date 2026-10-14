import { z } from 'zod';

export const createReversalSchema = z.object({
  orderId: z.string().trim().optional(),
  invoiceNumber: z.string().trim().optional(),
  reason: z
    .string()
    .trim()
    .min(3, 'Reversal reason must be at least 3 characters long')
    .max(500, 'Reason cannot exceed 500 characters'),
  cashierName: z.string().trim().max(100).default('Cashier 1').optional(),
}).refine((data) => data.orderId || data.invoiceNumber, {
  message: 'Either orderId or invoiceNumber must be provided to reverse an order',
  path: ['orderId'],
});

export const getReversalsQuerySchema = z.object({
  datePreset: z.enum(['Today', 'This Week', 'This Month', 'Custom', 'All Time']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(50),
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
