/**
 * Settings Domain Rules & Validation Utilities
 * Centralizes settings schema, default values, and validation logic.
 */

export const DEFAULT_PAYMENT_ACCOUNTS = [
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
];

export const DEFAULT_SETTINGS = {
  business: {
    name: 'SpiceHub Restaurant & Grill',
    tagline: 'Restaurant & Grill • Point of Sale',
    logoRef: null,
    address: '123 Food Street, Gulshan, Karachi',
    phone: '021-1234567',
    email: 'info@spicehub.pk',
    currency: 'PKR',
    registrationNumber: '',
    website: '',
  },
  tax: {
    enabled: true,
    rate: 5,
    label: 'GST / Sales Tax',
  },
  pos: {
    defaultOrderType: 'Dine-In',
    defaultPaymentMethod: 'Cash',
    showItemImages: true,
    confirmClearCart: true,
    autoOpenInvoice: true,
  },
  invoice: {
    footer: 'Thank you for dining with us! • Good Food • Good Mood',
    showLogo: true,
    showAddress: true,
    showPhone: true,
    showEmail: true,
    showTaxBreakdown: true,
    showPaymentDetails: true,
  },
  paymentAccounts: DEFAULT_PAYMENT_ACCOUNTS,
  // Top-level aliases for seamless backward compatibility with existing code & tests
  restaurantName: 'SpiceHub Restaurant & Grill',
  tagline: 'Restaurant & Grill • Point of Sale',
  storeName: 'SpiceHub Restaurant & Grill',
  address: '123 Food Street, Gulshan, Karachi',
  phone: '021-1234567',
  email: 'info@spicehub.pk',
  taxRate: 5,
  taxEnabled: true,
  invoicePrefix: 'INV-',
  defaultOrderType: 'Dine-In',
  invoiceFooter: 'Thank you for dining with us! • Good Food • Good Mood',
};

/**
 * Returns a fresh copy of default settings
 */
export function getDefaultSettings() {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
}

/**
 * Validates tax rate input
 * Rules:
 * - Rate must be numeric
 * - Rate cannot be negative
 * - Rate must not exceed 50%
 */
export function validateTaxRate(rate) {
  if (rate === null || rate === undefined || rate === '') {
    return { valid: false, isValid: false, error: 'Tax rate is required' };
  }

  const num = Number(rate);
  if (isNaN(num)) {
    return { valid: false, isValid: false, error: 'Tax rate must be a valid number' };
  }

  if (num < 0) {
    return { valid: false, isValid: false, error: 'Tax rate cannot be negative' };
  }

  if (num > 50) {
    return { valid: false, isValid: false, error: 'Tax rate cannot exceed 50%' };
  }

  return { valid: true, isValid: true, error: null };
}

/**
 * Normalizes any settings object, guaranteeing both nested structure and top-level backward-compatible aliases
 */
export function normalizeSettings(raw = {}) {
  const defaults = getDefaultSettings();
  if (!raw || typeof raw !== 'object') {
    return defaults;
  }

  const business = {
    ...defaults.business,
    ...(raw.business || {}),
  };
  // Fallback from top-level ONLY if raw.business did not explicitly specify it
  if (raw.restaurantName && (!raw.business || !('name' in raw.business))) business.name = raw.restaurantName;
  if (raw.tagline && (!raw.business || !('tagline' in raw.business))) business.tagline = raw.tagline;
  if (raw.address && (!raw.business || !('address' in raw.business))) business.address = raw.address;
  if (raw.phone && (!raw.business || !('phone' in raw.business))) business.phone = raw.phone;
  if (raw.email && (!raw.business || !('email' in raw.business))) business.email = raw.email;
  if (raw.logoRef !== undefined && (!raw.business || !('logoRef' in raw.business))) business.logoRef = raw.logoRef;

  const tax = {
    ...defaults.tax,
    ...(raw.tax || {}),
  };
  if (raw.taxRate !== undefined && (!raw.tax || !('rate' in raw.tax))) tax.rate = Number(raw.taxRate);
  if (raw.taxEnabled !== undefined && (!raw.tax || !('enabled' in raw.tax))) tax.enabled = Boolean(raw.taxEnabled);

  const pos = {
    ...defaults.pos,
    ...(raw.pos || {}),
  };
  if (raw.defaultOrderType && (!raw.pos || !('defaultOrderType' in raw.pos))) pos.defaultOrderType = raw.defaultOrderType;

  const invoice = {
    ...defaults.invoice,
    ...(raw.invoice || {}),
  };
  if (raw.invoiceFooter && (!raw.invoice || !('footer' in raw.invoice))) invoice.footer = raw.invoiceFooter;
  if (!invoice.footer || !invoice.footer.trim()) {
    invoice.footer = defaults.invoice.footer;
  }

  const paymentAccounts = Array.isArray(raw.paymentAccounts)
    ? raw.paymentAccounts
    : (Array.isArray(raw.pos?.paymentAccounts) ? raw.pos.paymentAccounts : defaults.paymentAccounts);

  return {
    business,
    tax,
    pos,
    invoice,
    paymentAccounts,
    // Synchronize top-level backward-compatible aliases
    restaurantName: business.name,
    tagline: business.tagline || defaults.business.tagline,
    storeName: business.name,
    address: business.address,
    phone: business.phone,
    email: business.email,
    logoRef: business.logoRef,
    taxRate: tax.rate,
    taxEnabled: tax.enabled,
    invoicePrefix: raw.invoicePrefix || defaults.invoicePrefix,
    defaultOrderType: pos.defaultOrderType,
    invoiceFooter: invoice.footer,
  };
}

/**
 * Safely merges partial settings updates into an existing settings object
 */
export function mergeSettings(currentSettings, updates) {
  const base = normalizeSettings(currentSettings);
  const updatedBusiness = {
    ...base.business,
    ...(updates.business || {}),
  };
  if (updates.restaurantName && (!updates.business || !('name' in updates.business))) {
    updatedBusiness.name = updates.restaurantName;
  }
  if (updates.tagline && (!updates.business || !('tagline' in updates.business))) {
    updatedBusiness.tagline = updates.tagline;
  }
  if (updates.address && (!updates.business || !('address' in updates.business))) {
    updatedBusiness.address = updates.address;
  }
  if (updates.phone && (!updates.business || !('phone' in updates.business))) {
    updatedBusiness.phone = updates.phone;
  }
  if (updates.email && (!updates.business || !('email' in updates.business))) {
    updatedBusiness.email = updates.email;
  }
  if (updates.logoRef !== undefined && (!updates.business || !('logoRef' in updates.business))) {
    updatedBusiness.logoRef = updates.logoRef;
  }

  const updatedTax = {
    ...base.tax,
    ...(updates.tax || {}),
  };
  if (updates.taxRate !== undefined && (!updates.tax || !('rate' in updates.tax))) {
    updatedTax.rate = Number(updates.taxRate);
  }
  if (updates.taxEnabled !== undefined && (!updates.tax || !('enabled' in updates.tax))) {
    updatedTax.enabled = Boolean(updates.taxEnabled);
  }

  const updatedPos = {
    ...base.pos,
    ...(updates.pos || {}),
  };
  if (updates.defaultOrderType && (!updates.pos || !('defaultOrderType' in updates.pos))) {
    updatedPos.defaultOrderType = updates.defaultOrderType;
  }

  const updatedInvoice = {
    ...base.invoice,
    ...(updates.invoice || {}),
  };
  if (updates.invoiceFooter && (!updates.invoice || !('footer' in updates.invoice))) {
    updatedInvoice.footer = updates.invoiceFooter;
  }

  const updatedPaymentAccounts = updates.paymentAccounts !== undefined
    ? updates.paymentAccounts
    : (updates.pos?.paymentAccounts !== undefined ? updates.pos.paymentAccounts : base.paymentAccounts);

  const merged = {
    business: updatedBusiness,
    tax: updatedTax,
    pos: updatedPos,
    invoice: updatedInvoice,
    paymentAccounts: updatedPaymentAccounts,
    invoicePrefix: updates.invoicePrefix || base.invoicePrefix,
  };

  return normalizeSettings(merged);
}
