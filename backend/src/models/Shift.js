import mongoose from 'mongoose';

const ShiftSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: [true, 'Shift ID is required'],
      unique: true,
      trim: true,
      index: true,
    },
    shiftNumber: {
      type: Number,
      required: true,
      index: true,
    },
    cashierName: {
      type: String,
      default: 'Cashier 1',
      trim: true,
    },
    openedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open',
      index: true,
    },
    openingFloat: {
      type: Number,
      required: true,
      min: [0, 'Opening cash float must be non-negative'],
      default: 0,
    },
    cashSales: {
      type: Number,
      default: 0,
      min: 0,
    },
    cardSales: {
      type: Number,
      default: 0,
      min: 0,
    },
    onlineSales: {
      type: Number,
      default: 0,
      min: 0,
    },
    cashExpenses: {
      type: Number,
      default: 0,
      min: 0,
    },
    expectedCash: {
      type: Number,
      default: 0,
    },
    actualCashCounted: {
      type: Number,
      default: null,
    },
    discrepancy: {
      type: Number,
      default: 0,
    },
    totalOrdersCount: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
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

ShiftSchema.index({ status: 1, openedAt: -1 });

export const Shift = mongoose.models.Shift || mongoose.model('Shift', ShiftSchema);
export default Shift;
