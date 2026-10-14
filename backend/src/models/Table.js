import mongoose from 'mongoose';

const TableSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: [true, 'Table ID is required'],
      unique: true,
      trim: true,
      index: true,
    },
    number: {
      type: Number,
      required: [true, 'Table number is required'],
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Table name is required'],
      trim: true,
    },
    capacity: {
      type: Number,
      required: [true, 'Seating capacity is required'],
      min: [1, 'Capacity must be at least 1 person'],
      default: 4,
    },
    zone: {
      type: String,
      enum: ['Main Dining Hall', 'Family Section', 'Outdoor Terrace', 'VIP Lounge'],
      default: 'Main Dining Hall',
      index: true,
    },
    status: {
      type: String,
      enum: ['available', 'occupied', 'reserved', 'cleaning'],
      default: 'available',
      index: true,
    },
    currentOrderId: {
      type: String,
      default: null,
    },
    currentInvoiceNumber: {
      type: String,
      default: null,
    },
    occupiedSince: {
      type: Date,
      default: null,
    },
    waiterName: {
      type: String,
      default: '',
      trim: true,
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

TableSchema.index({ zone: 1, status: 1 });

export const Table = mongoose.models.Table || mongoose.model('Table', TableSchema);
export default Table;
