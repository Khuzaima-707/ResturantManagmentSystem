import { z } from 'zod';

export const createTableSchema = z.object({
  id: z.string().trim().optional(),
  number: z.number().int().min(1, 'Table number must be at least 1'),
  name: z.string().trim().min(1, 'Table name is required'),
  capacity: z.number().int().min(1).default(4),
  zone: z.enum(['Main Dining Hall', 'Family Section', 'Outdoor Terrace', 'VIP Lounge']).default('Main Dining Hall'),
  status: z.enum(['available', 'occupied', 'reserved', 'cleaning']).default('available'),
  waiterName: z.string().trim().max(100).optional().default(''),
  notes: z.string().trim().max(200).optional().default(''),
});

export const updateTableSchema = z.object({
  name: z.string().trim().min(1).optional(),
  capacity: z.number().int().min(1).optional(),
  zone: z.enum(['Main Dining Hall', 'Family Section', 'Outdoor Terrace', 'VIP Lounge']).optional(),
  status: z.enum(['available', 'occupied', 'reserved', 'cleaning']).optional(),
  currentOrderId: z.string().trim().nullable().optional(),
  currentInvoiceNumber: z.string().trim().nullable().optional(),
  occupiedSince: z.string().or(z.date()).nullable().optional(),
  waiterName: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(200).optional(),
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
