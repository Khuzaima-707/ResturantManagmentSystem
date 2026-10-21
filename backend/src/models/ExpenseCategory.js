import mongoose from 'mongoose';

const ExpenseCategorySchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: [true, 'Expense Category ID is required'],
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: [100, 'Category name cannot exceed 100 characters'],
      index: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [250, 'Description cannot exceed 250 characters'],
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
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

export const ExpenseCategory =
  mongoose.models.ExpenseCategory || mongoose.model('ExpenseCategory', ExpenseCategorySchema);
export default ExpenseCategory;
