import mongoose from 'mongoose';

const SettingsSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: 'system-settings',
      unique: true,
      index: true,
    },
    // Business Profile
    businessName: {
      type: String,
      default: 'Royal Spice Restaurant & POS',
      trim: true,
    },
    tagline: {
      type: String,
      default: 'Authentic Traditional & Fast Food',
      trim: true,
    },
    phone: {
      type: String,
      default: '+92 300 1234567',
      trim: true,
    },
    email: {
      type: String,
      default: 'info@royalspice.com',
      trim: true,
    },
    address: {
      type: String,
      default: 'Main Boulevard, Gulberg, Lahore, Pakistan',
      trim: true,
    },
    ntn: {
      type: String,
      default: 'NTN-7894561-2',
      trim: true,
    },
    logo: {
      type: String,
      default: '',
      trim: true,
    },

    // Tax Configuration
    defaultTaxRate: {
      type: Number,
      default: 16,
      min: 0,
      max: 100,
    },
    isTaxEnabled: {
      type: Boolean,
      default: true,
    },

    // POS & Invoice Preferences
    invoicePrefix: {
      type: String,
      default: 'INV-',
      trim: true,
    },
    footerNote: {
      type: String,
      default: 'Thank you for your visit! Please visit again.',
      trim: true,
    },
    currencySymbol: {
      type: String,
      default: 'Rs',
      trim: true,
    },
    // Payment Accounts (EasyPaisa, JazzCash, Banks, Wallets)
    paymentAccounts: {
      type: Array,
      default: [
        {
          id: 'acc_jazzcash_default',
          channel: 'JazzCash',
          title: 'Restaurant JazzCash',
          accountNumber: '0300-1234567',
          bankName: 'JazzCash',
          isActive: true,
          isDefault: true,
        },
        {
          id: 'acc_easypaisa_default',
          channel: 'EasyPaisa',
          title: 'Restaurant EasyPaisa',
          accountNumber: '0345-1234567',
          bankName: 'EasyPaisa',
          isActive: true,
          isDefault: false,
        },
        {
          id: 'acc_bank_default',
          channel: 'Bank',
          title: 'SpiceHub Official',
          accountNumber: '01020304050607',
          bankName: 'Meezan Bank',
          isActive: true,
          isDefault: false,
        },
      ],
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

export const Settings = mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);
export default Settings;
