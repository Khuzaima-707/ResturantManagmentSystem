import mongoose from 'mongoose';

const IncludedItemSchema = new mongoose.Schema(
  {
    itemId: {
      type: String,
      required: [true, 'Included item ID is required'],
      trim: true,
    },
    itemType: {
      type: String,
      enum: ['item', 'addon'],
      default: 'item',
    },
    name: {
      type: String,
      required: [true, 'Included item name is required'],
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Included item quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      default: 1,
    },
    unit: {
      type: String,
      trim: true,
      default: 'Piece',
    },
    portion: {
      type: String,
      trim: true,
      default: '',
    },
    weightGrams: {
      type: Number,
      min: 0,
      default: null,
    },
    sellingPrice: {
      type: Number,
      required: true,
      min: [0, 'Selling price cannot be negative'],
      default: 0,
    },
    costPrice: {
      type: Number,
      min: 0,
      default: null,
    },
  },
  { _id: false }
);

const DealSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: [true, 'Deal ID is required'],
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Deal name is required'],
      trim: true,
      maxlength: [150, 'Deal name cannot exceed 150 characters'],
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
    dealPrice: {
      type: Number,
      required: [true, 'Deal price is required'],
      min: [0, 'Deal price must be a non-negative number'],
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
    includedItems: {
      type: [IncludedItemSchema],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'A deal must contain at least one included item',
      },
    },
    sortOrder: {
      type: Number,
      min: 1,
      default: null,
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

DealSchema.index({ name: 'text', description: 'text' });
DealSchema.index({ status: 1, dealPrice: 1 });

export const Deal = mongoose.models.Deal || mongoose.model('Deal', DealSchema);
export default Deal;
