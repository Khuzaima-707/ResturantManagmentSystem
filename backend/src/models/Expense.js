import mongoose from 'mongoose';

const ExpenseSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: [true, 'Expense ID is required'],
      unique: true,
      trim: true,
      index: true,
    },
    expenseDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    categoryId: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Expense category is required'],
      trim: true,
      maxlength: [100, 'Category cannot exceed 100 characters'],
      index: true,
    },
    categoryNameSnapshot: {
      type: String,
      default: '',
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Expense amount is required'],
      min: [0.01, 'Expense amount must be greater than zero'],
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Online', 'CASH', 'ONLINE'],
      default: 'Cash',
      index: true,
    },
    onlineMethodSnapshot: {
      type: String,
      default: '',
      trim: true,
      maxlength: [100, 'Online method cannot exceed 100 characters'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    referenceNumber: {
      type: String,
      default: '',
      trim: true,
      maxlength: [100, 'Reference number cannot exceed 100 characters'],
    },
    attachment: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
      format: { type: String, default: '' },
      bytes: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'VOIDED', 'active', 'voided'],
      default: 'ACTIVE',
      index: true,
    },

    // Audit: Creation
    createdByUserId: {
      type: String,
      default: '',
      trim: true,
    },
    createdByName: {
      type: String,
      default: 'Admin',
      trim: true,
    },
    createdByRole: {
      type: String,
      default: 'admin',
      trim: true,
    },

    // Audit: Update
    updatedByUserId: {
      type: String,
      default: '',
      trim: true,
    },
    updatedByName: {
      type: String,
      default: '',
      trim: true,
    },

    // Audit: Void
    voidedByUserId: {
      type: String,
      default: '',
      trim: true,
    },
    voidedByName: {
      type: String,
      default: '',
      trim: true,
    },
    voidedAt: {
      type: Date,
      default: null,
    },
    voidReason: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Void reason cannot exceed 500 characters'],
    },

    // Backward compatibility aliases
    title: { type: String, default: '' },
    paidTo: { type: String, default: '' },
    receiptNumber: { type: String, default: '' },
    note: { type: String, default: '' },
    recordedBy: { type: String, default: '' },
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

ExpenseSchema.index({ category: 1, expenseDate: -1 });
ExpenseSchema.index({ paymentMethod: 1, expenseDate: -1 });
ExpenseSchema.index({ status: 1, expenseDate: -1 });
ExpenseSchema.index({ createdByUserId: 1 });

export const Expense = mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema);
export default Expense;
