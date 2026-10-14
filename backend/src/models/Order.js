import mongoose from 'mongoose';

const OrderLineSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    itemId: {
      type: String,
      required: [true, 'Item ID is required'],
      trim: true,
    },
    itemNameSnapshot: {
      type: String,
      required: [true, 'Item name snapshot is required'],
      trim: true,
    },
    itemImageSnapshot: {
      type: String,
      default: '',
    },
    categoryIdSnapshot: {
      type: String,
      default: '',
      trim: true,
    },
    pricingMode: {
      type: String,
      enum: ['piece', 'portion', 'custom_weight'],
      default: 'piece',
    },
    selectedPortionLabel: {
      type: String,
      default: '',
      trim: true,
    },
    selectedWeightGrams: {
      type: Number,
      default: 0,
      min: 0,
    },
    baseUnitSnapshot: {
      type: String,
      default: 'piece',
      trim: true,
    },
    basePriceSnapshot: {
      type: Number,
      required: true,
      min: 0,
    },
    addonSnapshots: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true, min: 0 },
        costPrice: { type: Number, default: null },
      },
    ],
    addonsTotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
      default: 1,
    },
    lineSubtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    // Historical Cost, Revenue & Profit Snapshots
    sellingPriceSnapshot: {
      type: Number,
      min: 0,
    },
    costPriceSnapshot: {
      type: Number,
      min: 0,
      default: null,
    },
    portionPrice: {
      type: Number,
      min: 0,
    },
    quantitySnapshot: {
      type: Number,
      min: 1,
    },
    weightGramsSnapshot: {
      type: Number,
      min: 0,
      default: null,
    },
    itemGrossSale: {
      type: Number,
      min: 0,
    },
    addonGrossSale: {
      type: Number,
      min: 0,
      default: 0,
    },
    grossLineSale: {
      type: Number,
      min: 0,
    },
    allocatedDiscount: {
      type: Number,
      min: 0,
      default: 0,
    },
    netRevenue: {
      type: Number,
    },
    itemCOGS: {
      type: Number,
      min: 0,
      default: null,
    },
    addonCOGS: {
      type: Number,
      min: 0,
      default: null,
    },
    totalCOGS: {
      type: Number,
      min: 0,
      default: null,
    },
    grossProfit: {
      type: Number,
      default: null,
    },
    grossProfitMargin: {
      type: Number,
      default: null,
    },
    hasCost: {
      type: Boolean,
      default: false,
    },
    note: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: [true, 'Order ID is required'],
      unique: true,
      trim: true,
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    sequenceNumber: {
      type: Number,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['completed', 'reversed'],
      default: 'completed',
      index: true,
    },
    kitchenStatus: {
      type: String,
      enum: ['received', 'preparing', 'ready', 'served'],
      default: 'received',
      index: true,
    },
    orderType: {
      type: String,
      enum: ['Dine-In', 'Takeaway'],
      default: 'Dine-In',
      index: true,
    },
    guestCount: {
      type: Number,
      default: 1,
      min: 1,
    },
    cashierName: {
      type: String,
      default: 'Cashier 1',
      trim: true,
    },
    customerName: {
      type: String,
      default: '',
      trim: true,
    },
    customerPhone: {
      type: String,
      default: '',
      trim: true,
    },
    tableNumber: {
      type: String,
      default: '',
      trim: true,
    },
    lines: {
      type: [OrderLineSchema],
      required: [true, 'Order must contain at least one line item'],
      validate: {
        validator: (lines) => Array.isArray(lines) && lines.length > 0,
        message: 'Order must contain at least one line item',
      },
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discountType: {
      type: String,
      enum: ['none', 'percentage', 'fixed'],
      default: 'none',
    },
    discountValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxableAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    taxRateSnapshot: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Card', 'Online'],
      default: 'Cash',
      index: true,
    },
    amountReceived: {
      type: Number,
      required: true,
      min: 0,
    },
    changeAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    reversalId: {
      type: String,
      default: null,
      index: true,
    },
    reversalReason: {
      type: String,
      default: null,
    },
    reversedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// High performance compound indexes for reporting & POS history
OrderSchema.index({ status: 1, completedAt: -1 });
OrderSchema.index({ orderType: 1, completedAt: -1 });
OrderSchema.index({ paymentMethod: 1, completedAt: -1 });

export const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);
export default Order;
