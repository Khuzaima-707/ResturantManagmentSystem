import mongoose from 'mongoose';

const ReversalSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: [true, 'Reversal ID is required'],
      unique: true,
      trim: true,
      index: true,
    },
    originalOrderId: {
      type: String,
      required: [true, 'Original Order ID is required'],
      trim: true,
      index: true,
    },
    originalInvoiceNumber: {
      type: String,
      required: [true, 'Original Invoice Number is required'],
      trim: true,
      index: true,
    },
    reason: {
      type: String,
      required: [true, 'Reversal reason is required'],
      trim: true,
      minlength: [3, 'Reason must be at least 3 characters'],
      maxlength: [500, 'Reason cannot exceed 500 characters'],
    },
    cashierName: {
      type: String,
      default: 'Cashier 1',
      trim: true,
    },
    subtotalReversed: {
      type: Number,
      required: true,
      min: 0,
    },
    discountReversed: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxReversed: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalReversedIncludingTax: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethodSnapshot: {
      type: String,
      default: 'Cash',
    },
    reversedAt: {
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

ReversalSchema.index({ reversedAt: -1 });

export const Reversal = mongoose.models.Reversal || mongoose.model('Reversal', ReversalSchema);
export default Reversal;
