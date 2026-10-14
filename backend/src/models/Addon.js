import mongoose from 'mongoose';

const AddonSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: [true, 'Add-on ID is required'],
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Add-on name is required'],
      trim: true,
      maxlength: [100, 'Add-on name cannot exceed 100 characters'],
    },
    type: {
      type: String,
      enum: [
        'Extra Protein',
        'Side',
        'Sauce / Dip',
        'Topping',
        'Drink',
        'Dessert Extra',
      ],
      default: 'Side',
      index: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price must be a non-negative number'],
    },
    costPrice: {
      type: Number,
      min: [0, 'Cost price must be a non-negative number'],
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
    categoryIds: {
      type: [String],
      default: [],
      index: true,
    },
    itemIds: {
      type: [String],
      default: [],
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
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

// Search and filter indexes
AddonSchema.index({ name: 'text' });
AddonSchema.index({ type: 1, status: 1 });
AddonSchema.index({ price: 1 });

export const Addon = mongoose.models.Addon || mongoose.model('Addon', AddonSchema);
export default Addon;
