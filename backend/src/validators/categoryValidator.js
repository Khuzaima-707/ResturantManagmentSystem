import { z } from 'zod';

const portionSchema = z.object({
  label: z.string().min(1, 'Portion label cannot be empty').max(50),
  quantityInBaseUnit: z.number().positive('Quantity in base unit must be greater than 0'),
});

export const createCategorySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, 'Category name is required').max(100, 'Name must be 100 characters or less'),
  slug: z.string().trim().min(1).max(120).optional(),
  status: z.enum(['active', 'inactive']).default('active').optional(),
  defaultUnitType: z.enum(['weight', 'piece', 'plate', 'volume', 'custom']).default('piece').optional(),
  baseUnit: z.string().trim().max(30).default('piece').optional(),
  keywords: z.array(z.string().trim()).default([]).optional(),
  defaultPortions: z.array(portionSchema).default([]).optional(),
  defaultAddonIds: z.array(z.string().trim()).default([]).optional(),
  sortOrder: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().int('Sort order must be an integer').positive('Sort order must be a positive integer').nullable().optional()
  ),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  slug: z.string().trim().min(1).max(120).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  defaultUnitType: z.enum(['weight', 'piece', 'plate', 'volume', 'custom']).optional(),
  baseUnit: z.string().trim().max(30).optional(),
  keywords: z.array(z.string().trim()).optional(),
  defaultPortions: z.array(portionSchema).optional(),
  defaultAddonIds: z.array(z.string().trim()).optional(),
  sortOrder: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().int('Sort order must be an integer').positive('Sort order must be a positive integer').nullable().optional()
  ),
});

/**
 * Express middleware to validate request bodies against a Zod schema
 */
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
