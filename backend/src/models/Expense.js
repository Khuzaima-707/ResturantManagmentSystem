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
    title: {
      type: String,
      required: [true, 'Expense title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    category: {
      type: String,
      enum: [
        'Raw Materials / Meat & Groceries',
        'Kitchen Supplies & Packaging',
        'Utilities (Gas, Electricity, Water)',
        'Staff Salaries & Wages',
        'Rent & Property',
        'Repairs & Maintenance',
        'Marketing & Ads',
        'Petty Cash / Misc',
      ],
      default: 'Raw Materials / Meat & Groceries',
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Expense amount is required'],
      min: [1, 'Expense amount must be greater than zero'],
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Bank Transfer', 'Online / Cheque'],
      default: 'Cash',
      index: true,
    },
    paidTo: {
      type: String,
      default: '',
      trim: true,
    },
    receiptNumber: {
      type: String,
      default: '',
      trim: true,
    },
    note: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Note cannot exceed 500 characters'],
    },
    recordedBy: {
      type: String,
      default: 'Admin',
      trim: true,
    },
    expenseDate: {
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

ExpenseSchema.index({ category: 1, expenseDate: -1 });
ExpenseSchema.index({ paymentMethod: 1, expenseDate: -1 });

export const Expense = mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema);
export default Expense;
