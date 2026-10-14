import { z } from 'zod';

export const openShiftSchema = z.object({
  cashierName: z.string().trim().min(1, 'Cashier name is required').max(100),
  openingFloat: z.number().min(0, 'Opening cash float must be 0 or greater'),
  notes: z.string().trim().max(300).optional().default(''),
});

export const closeShiftSchema = z.object({
  actualCashCounted: z.number().min(0, 'Actual cash counted must be non-negative'),
  notes: z.string().trim().max(300).optional().default(''),
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
