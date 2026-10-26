import { z } from 'zod';

export const createReversalSchema = z.object({
  id: z.string().trim().optional(),
  orderId: z.string().trim().optional(),
  originalOrderId: z.string().trim().optional(),
  invoiceNumber: z.string().trim().optional(),
  originalInvoiceNumber: z.string().trim().optional(),
  reason: z
    .string()
    .trim()
    .min(3, 'Reversal reason must be at least 3 characters long')
    .max(500, 'Reason cannot exceed 500 characters'),
  cashierName: z.string().trim().max(100).default('Cashier 1').optional(),
  reversedBy: z.string().trim().max(100).optional(),
  note: z.string().trim().optional().default(''),
  subtotalReversed: z.number().optional(),
  discountReversed: z.number().optional(),
  taxReversed: z.number().optional(),
  totalReversedIncludingTax: z.number().optional(),
}).refine((data) => data.orderId || data.originalOrderId || data.invoiceNumber || data.originalInvoiceNumber, {
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
