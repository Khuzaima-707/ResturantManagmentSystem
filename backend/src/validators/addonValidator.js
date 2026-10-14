import { z } from 'zod';

export const createAddonSchema = z.object({
  id: z.string().trim().optional(),
  name: z.string().trim().min(1, 'Add-on name is required').max(100, 'Name must be 100 characters or less'),
  type: z
    .enum(['Extra Protein', 'Side', 'Sauce / Dip', 'Topping', 'Drink', 'Dessert Extra'])
    .default('Side')
    .optional(),
  price: z.number().min(0, 'Price must be a non-negative number'),
  costPrice: z.number().min(0, 'Cost price must be a non-negative number').nullable().optional(),
  status: z.enum(['active', 'inactive']).default('active').optional(),
  categoryIds: z.array(z.string().trim()).default([]).optional(),
  itemIds: z.array(z.string().trim()).default([]).optional(),
  description: z.string().trim().max(300).default('').optional(),
});

export const updateAddonSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  type: z
    .enum(['Extra Protein', 'Side', 'Sauce / Dip', 'Topping', 'Drink', 'Dessert Extra'])
    .optional(),
  price: z.number().min(0).optional(),
  costPrice: z.number().min(0).nullable().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  categoryIds: z.array(z.string().trim()).optional(),
  itemIds: z.array(z.string().trim()).optional(),
  description: z.string().trim().max(300).optional(),
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
