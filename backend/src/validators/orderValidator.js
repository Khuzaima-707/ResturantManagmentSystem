import { z } from 'zod';

const orderLineSchema = z.object({
  id: z.string().trim().optional(),
  itemId: z.string().trim().min(1, 'Item ID is required'),
  itemNameSnapshot: z.string().trim().min(1, 'Item name snapshot is required'),
  itemImageSnapshot: z.string().trim().optional().default(''),
  categoryIdSnapshot: z.string().trim().optional().default(''),
  pricingMode: z.enum(['piece', 'portion', 'custom_weight', 'deal']).default('piece'),
  isDeal: z.boolean().optional().default(false),
  dealId: z.string().trim().nullable().optional(),
  includedItems: z.array(z.any()).optional().default([]),
  selectedPortionLabel: z.string().trim().optional().default(''),
  selectedWeightGrams: z.number().min(0).optional().default(0),
  baseUnitSnapshot: z.string().trim().optional().default('piece'),
  basePriceSnapshot: z.number().min(0, 'Base price snapshot must be non-negative'),
  addonSnapshots: z
    .array(
      z.object({
        id: z.string().trim(),
        name: z.string().trim(),
        price: z.number().min(0),
        costPrice: z.number().min(0).nullable().optional(),
      })
    )
    .optional()
    .default([]),
  addonsTotal: z.number().min(0).optional().default(0),
  unitPrice: z.number().min(0, 'Unit price must be non-negative'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  lineSubtotal: z.number().min(0, 'Line subtotal must be non-negative'),
  // Historical Cost, Revenue & Profit Snapshots
  sellingPriceSnapshot: z.number().min(0).optional(),
  costPriceSnapshot: z.number().min(0).nullable().optional(),
  portionPrice: z.number().min(0).optional(),
  quantitySnapshot: z.number().min(1).optional(),
  weightGramsSnapshot: z.number().min(0).nullable().optional(),
  itemGrossSale: z.number().min(0).optional(),
  addonGrossSale: z.number().min(0).optional(),
  grossLineSale: z.number().min(0).optional(),
  allocatedDiscount: z.number().min(0).optional(),
  netRevenue: z.number().optional(),
  itemCOGS: z.number().min(0).nullable().optional(),
  addonCOGS: z.number().min(0).nullable().optional(),
  totalCOGS: z.number().min(0).nullable().optional(),
  grossProfit: z.number().nullable().optional(),
  grossProfitMargin: z.number().nullable().optional(),
  hasCost: z.boolean().optional(),
  note: z.string().trim().max(500).optional().default(''),
});

export const createOrderSchema = z
  .object({
    id: z.string().trim().optional(),
    invoicePrefix: z.string().trim().nullable().optional(),
    invoiceNumber: z.string().trim().nullable().optional(),
    sequenceNumber: z.number().int().min(1).nullable().optional(),
    completedAt: z.string().trim().optional(),
    createdAt: z.string().trim().optional(),
    createdByUserId: z.string().trim().nullable().optional(),
    createdByName: z.string().trim().nullable().optional(),
    createdByRole: z.string().trim().nullable().optional(),
    orderType: z.enum(['Dine-In', 'Takeaway']).default('Dine-In'),
    guestCount: z.number().int().min(1).default(1).optional(),
    cashierName: z.string().trim().max(100).default('Cashier 1').optional(),
    customerName: z.string().trim().max(100).default('').optional(),
    customerPhone: z.string().trim().max(30).default('').optional(),
    tableNumber: z.string().trim().max(30).default('').optional(),
    lines: z.array(orderLineSchema).min(1, 'Order must contain at least one line item'),
    discountType: z.enum(['none', 'percentage', 'fixed']).default('none'),
    discountValue: z.number().min(0).default(0),
    taxRateSnapshot: z.number().min(0).max(100).default(0),
    paymentMethod: z.enum(['Cash', 'Card', 'Online']).default('Cash'),
    amountReceived: z.number().min(0, 'Amount received must be non-negative'),
    allowPartialPayment: z.boolean().optional().default(false),
    balanceDue: z.number().min(0).optional().default(0),
    paymentStatus: z.enum(['paid', 'partial', 'unpaid']).optional().default('paid'),
  })
  .refine(
    (data) => {
      // Calculate server-side grand total to enforce Cash payment rule
      const subtotal = data.lines.reduce((sum, l) => sum + (Number(l.lineSubtotal) || 0), 0);
      let discountAmount = 0;
      if (data.discountType === 'percentage') {
        discountAmount = Math.round((subtotal * Math.min(100, data.discountValue)) / 100);
      } else if (data.discountType === 'fixed') {
        discountAmount = Math.min(subtotal, Math.round(data.discountValue));
      }
      const taxableAmount = Math.max(0, subtotal - discountAmount);
      const taxAmount = Math.round((taxableAmount * (data.taxRateSnapshot || 0)) / 100);
      const grandTotal = Math.max(0, taxableAmount + taxAmount);

      if (data.paymentMethod === 'Cash') {
        const isPartial = data.allowPartialPayment === true || data.paymentStatus === 'partial' || (data.balanceDue || 0) > 0;
        if (isPartial) return true;
        return (data.amountReceived || 0) >= grandTotal;
      }
      return true;
    },
    {
      message: 'Cash received cannot be less than grand total',
      path: ['amountReceived'],
    }
  );

export const getOrdersQuerySchema = z.object({
  status: z.enum(['completed', 'reversed', 'all']).optional(),
  orderType: z.enum(['Dine-In', 'Takeaway', 'all']).optional(),
  paymentMethod: z.enum(['Cash', 'Card', 'Online', 'all']).optional(),
  datePreset: z.enum(['Today', 'This Week', 'This Month', 'Custom', 'All Time']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  sort: z.string().optional(),
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
