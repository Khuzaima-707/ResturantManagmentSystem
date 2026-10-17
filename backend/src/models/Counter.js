import mongoose from 'mongoose';

/**
 * Counter Model
 * Atomic sequence generator for invoice numbers and sequential identifiers.
 * Prevents race conditions and duplicate numbers across multiple tabs/users.
 */
const CounterSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
      trim: true,
    },
    seq: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

export const Counter = mongoose.models.Counter || mongoose.model('Counter', CounterSchema);
export default Counter;
