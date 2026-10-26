import { z } from 'zod';

const orderLineSchema = z
  .object({
    id: z.string().trim().optional(),
    itemId: z.string().trim().min(1, 'Item ID is required'),
    itemNameSnapshot: z.string().trim().min(1, 'Item name snapshot is required'),
    itemImageSnapshot: z.string().trim().nullable().optional().transform((v) => v || ''),
    categoryIdSnapshot: z.string().trim().nullable().optional().transform((v) => v || ''),
    categoryNameSnapshot: z.string().trim().nullable().optional().transform((v) => v || ''),
    pricingMode: z.enum(['piece', 'portion', 'custom_weight', 'weight', 'amount', 'deal']).default('piece'),
    isDeal: z.boolean().optional().default(false),
    dealId: z.string().trim().nullable().optional(),
    includedItems: z.array(z.any()).optional().default([]),
    selectedPortionLabel: z.string().trim().nullable().optional().transform((v) => v || ''),
    selectedWeightGrams: z.coerce.number().min(0).nullable().optional().transform((v) => v || 0),
    baseUnitSnapshot: z.string().trim().nullable().optional().transform((v) => v || 'piece'),
    basePriceSnapshot: z.coerce.number().min(0, 'Base price snapshot must be non-negative').default(0),
    addonSnapshots: z
      .array(
        z
          .object({
            id: z.string().trim().nullable().optional().transform((v) => v || ''),
            name: z.string().trim().nullable().optional().transform((v) => v || ''),
            price: z.coerce.number().min(0).default(0),
            costPrice: z.coerce.number().min(0).nullable().optional(),
            quantity: z.coerce.number().optional().default(1),
          })
          .passthrough()
      )
      .optional()
      .default([]),
    addonsTotal: z.coerce.number().min(0).optional().default(0),
    unitPrice: z.coerce.number().min(0, 'Unit price must be non-negative'),
    quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
    lineSubtotal: z.coerce.number().min(0, 'Line subtotal must be non-negative'),
    // Historical Cost, Revenue & Profit Snapshots
    sellingPriceSnapshot: z.coerce.number().min(0).optional(),
    costPriceSnapshot: z.coerce.number().min(0).nullable().optional(),
    portionPrice: z.coerce.number().min(0).optional(),
    quantitySnapshot: z.coerce.number().min(1).optional(),
    weightGramsSnapshot: z.coerce.number().min(0).nullable().optional(),
    itemGrossSale: z.coerce.number().min(0).optional(),
    addonGrossSale: z.coerce.number().min(0).optional(),
    grossLineSale: z.coerce.number().min(0).optional(),
    allocatedDiscount: z.coerce.number().min(0).optional(),
    netRevenue: z.coerce.number().optional(),
    itemCOGS: z.coerce.number().min(0).nullable().optional(),
    addonCOGS: z.coerce.number().min(0).nullable().optional(),
    totalCOGS: z.coerce.number().min(0).nullable().optional(),
    grossProfit: z.coerce.number().nullable().optional(),
    grossProfitMargin: z.coerce.number().nullable().optional(),
    hasCost: z.boolean().optional(),
    note: z.string().trim().max(500).nullable().optional().transform((v) => v || ''),
  })
  .passthrough();

export const createOrderSchema = z
  .object({
    id: z.string().trim().optional(),
    invoicePrefix: z.string().trim().nullable().optional(),
    invoiceNumber: z.string().trim().nullable().optional(),
    sequenceNumber: z.coerce.number().int().min(1).nullable().optional(),
    completedAt: z.string().trim().nullable().optional(),
    createdAt: z.string().trim().nullable().optional(),
    createdByUserId: z.string().trim().nullable().optional(),
    createdByName: z.string().trim().nullable().optional(),
    createdByRole: z.string().trim().nullable().optional(),
    orderType: z.enum(['Dine-In', 'Takeaway', 'Delivery']).default('Dine-In'),
    guestCount: z.coerce.number().int().min(1).default(1).optional(),
    cashierName: z.string().trim().max(100).nullable().optional().transform((v) => v || 'Cashier 1'),
    customerName: z.string().trim().max(100).nullable().optional().transform((v) => v || ''),
    customerPhone: z.string().trim().max(30).nullable().optional().transform((v) => v || ''),
    tableNumber: z.string().trim().max(30).nullable().optional().transform((v) => v || ''),
    lines: z.array(orderLineSchema).min(1, 'Order must contain at least one line item'),
    discountType: z.enum(['none', 'percentage', 'fixed']).default('none'),
    discountValue: z.coerce.number().min(0).default(0),
    taxRateSnapshot: z.coerce.number().min(0).max(100).default(0),
    paymentMethod: z.enum(['Cash', 'Card', 'Online', 'Split']).default('Cash'),
    cardNetwork: z.string().trim().nullable().optional(),
    posSlipNumber: z.string().trim().nullable().optional(),
    onlineChannel: z.string().trim().nullable().optional(),
    onlineAccountId: z.string().trim().nullable().optional(),
    onlineAccountNumber: z.string().trim().nullable().optional(),
    onlineAccountTitle: z.string().trim().nullable().optional(),
    onlineBankName: z.string().trim().nullable().optional(),
    transactionId: z.string().trim().nullable().optional(),
    splitDetails: z.any().nullable().optional(),
    amountReceived: z.coerce.number().min(0, 'Amount received must be non-negative'),
    allowPartialPayment: z.boolean().optional().default(false),
    balanceDue: z.coerce.number().min(0).optional().default(0),
    paymentStatus: z.enum(['paid', 'partial', 'unpaid']).optional().default('paid'),
  })
  .passthrough()
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
        return (data.amountReceived || 0) >= (grandTotal - 1); // Allow minor 1 rupee rounding margin
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
  paymentMethod: z.enum(['Cash', 'Card', 'Online', 'Split', 'all']).optional(),
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
