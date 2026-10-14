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
    price: {
      type: Number,
      min: [0, 'Portion price cannot be negative'],
      default: undefined,
    },
  },
  { _id: false }
);

const MenuItemSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: [true, 'Item ID is required'],
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
      maxlength: [150, 'Item name cannot exceed 150 characters'],
    },
    categoryId: {
      type: String,
      required: [true, 'Category ID is required'],
      index: true,
      trim: true,
    },
    categoryName: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    imageRef: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      min: [0, 'Base price must be a non-negative number'],
    },
    costPrice: {
      type: Number,
      min: [0, 'Cost price must be a non-negative number'],
      default: null,
    },
    unitType: {
      type: String,
      enum: ['weight', 'piece', 'plate', 'volume', 'custom'],
      default: 'piece',
    },
    baseUnit: {
      type: String,
      default: 'piece',
      trim: true,
    },
    unit: {
      type: String,
      trim: true,
      default: 'Piece',
    },
    portionOptions: {
      type: [PortionOptionSchema],
      default: [],
    },
    addonIds: {
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

// Indexes for fast searching and filtering
MenuItemSchema.index({ name: 'text', description: 'text' });
MenuItemSchema.index({ categoryId: 1, status: 1 });
MenuItemSchema.index({ basePrice: 1 });

export const MenuItem = mongoose.models.MenuItem || mongoose.model('MenuItem', MenuItemSchema);
export default MenuItem;
