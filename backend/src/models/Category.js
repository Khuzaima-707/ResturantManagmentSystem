import mongoose from 'mongoose';

const PortionOptionSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: [true, 'Portion label is required'],
      trim: true,
    },
    quantityInBaseUnit: {
      type: Number,
      required: [true, 'Quantity in base unit is required'],
      min: [0.001, 'Quantity must be greater than 0'],
    },
  },
  { _id: false }
);

const CategorySchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: [true, 'Category ID is required'],
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: [100, 'Category name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Category slug is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
    defaultUnitType: {
      type: String,
      enum: ['weight', 'piece', 'plate', 'volume', 'custom'],
      default: 'piece',
    },
    baseUnit: {
      type: String,
      default: 'piece',
      trim: true,
    },
    keywords: {
      type: [String],
      default: [],
    },
    defaultPortions: {
      type: [PortionOptionSchema],
      default: [],
    },
    defaultAddonIds: {
      type: [String],
      default: [],
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

// Text index for fast search queries
CategorySchema.index({ name: 'text', keywords: 'text' });

export const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);
export default Category;
