import { z } from 'zod';

const includedItemSchema = z.object({
  itemId: z.string().trim().min(1, 'Included item ID is required'),
  itemType: z.enum(['item', 'addon']).default('item').optional(),
  name: z.string().trim().min(1, 'Included item name is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1').default(1),
  unit: z.string().trim().default('Piece').optional(),
  portion: z.string().trim().optional().default(''),
  weightGrams: z.number().min(0).nullable().optional(),
  sellingPrice: z.number().min(0, 'Selling price must be non-negative'),
  costPrice: z.number().min(0).nullable().optional(),
});

export const createDealSchema = z
  .object({
    id: z.string().trim().optional(),
    name: z.string().trim().min(1, 'Deal name is required').max(150, 'Name must be 150 characters or less'),
    description: z.string().trim().max(500, 'Description cannot exceed 500 characters').optional().default(''),
    imageRef: z.string().trim().optional().default(''),
    dealPrice: z.number().min(0, 'Deal price must be a non-negative number'),
    status: z.enum(['active', 'inactive']).default('active').optional(),
    includedItems: z.array(includedItemSchema).min(1, 'Deal must contain at least one included item'),
    sortOrder: z.number().int().positive().nullable().optional(),
  })
  .passthrough();

export const updateDealSchema = z
  .object({
    name: z.string().trim().min(1).max(150).optional(),
    description: z.string().trim().max(500).optional(),
    imageRef: z.string().trim().optional(),
    dealPrice: z.number().min(0).optional(),
    status: z.enum(['active', 'inactive']).optional(),
    includedItems: z.array(includedItemSchema).min(1).optional(),
    sortOrder: z.number().int().positive().nullable().optional(),
  })
  .passthrough();

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
