/**
 * Domain Invoice Selectors & Helpers
 * Pure, testable functions for:
 * - Invoice retrieval & history sorting
 * - Multi-criteria filtering (search, date, payment method, order type, status)
 * - Reversal safety checks & snapshot creation
 * - Accounting impact verification
 * - Print formatting
 */
import {
  isWithinInterval,
  parseISO,
} from 'date-fns';
import { getDateIntervalForPreset } from './dashboardSelectors';

/**
 * Retrieves an invoice by ID or invoiceNumber
 */
export function getInvoiceById(orders = [], idOrNumber = '') {
  if (!Array.isArray(orders) || !idOrNumber) return null;
  const query = String(idOrNumber).trim().toLowerCase();
  return (
    orders.find(
      (o) =>
        String(o.id).toLowerCase() === query ||
        String(o.invoiceNumber).toLowerCase() === query
    ) || null
  );
}

/**
 * Returns invoice history sorted by completion/creation date descending
 */
export function getInvoiceHistory(orders = []) {
  if (!Array.isArray(orders)) return [];
  return [...orders].sort((a, b) => {
    const dateA = new Date(a.completedAt || a.createdAt || 0).getTime();
    const dateB = new Date(b.completedAt || b.createdAt || 0).getTime();
    return dateB - dateA;
  });
}

/**
 * Filters invoice list by multiple optional criteria:
 * - searchQuery (invoiceNumber or itemNameSnapshot)
 * - datePreset ('Today', 'This Week', 'This Month', 'All Time', 'Custom')
 * - customRange ({ startDate, endDate })
 * - paymentMethod ('All' | 'Cash' | 'Card' | etc.)
 * - orderType ('All' | 'Dine-In' | 'Takeaway' | etc.)
 * - status ('All' | 'completed' | 'reversed')
 */
export function filterInvoices(orders = [], filters = {}) {
  if (!Array.isArray(orders) || orders.length === 0) return [];

  const {
    searchQuery = '',
    datePreset = 'All Time',
    customRange = null,
    paymentMethod = 'All',
    orderType = 'All',
    status = 'All',
    referenceDate = new Date(),
  } = filters;

  const query = (searchQuery || '').trim().toLowerCase();
  const hasDateFilter = datePreset && datePreset !== 'All Time';
  const interval = hasDateFilter
    ? getDateIntervalForPreset(datePreset, customRange, referenceDate)
    : null;

  return orders.filter((order) => {
    // 1. Search Query Filter (Matches invoice number or item names in lines)
    if (query) {
      const matchInvoice = String(order.invoiceNumber || '')
        .toLowerCase()
        .includes(query);
      const matchItem = (order.lines || []).some((l) =>
        String(l.itemNameSnapshot || '')
          .toLowerCase()
          .includes(query)
      );
      if (!matchInvoice && !matchItem) return false;
    }

    // 2. Status Filter
    if (status && status !== 'All') {
      const orderStatus = (order.status || 'completed').toLowerCase();
      if (orderStatus !== status.toLowerCase()) return false;
    }

    // 3. Payment Method Filter
    if (paymentMethod && paymentMethod !== 'All') {
      if (
        String(order.paymentMethod || '').toLowerCase() !==
        paymentMethod.toLowerCase()
      ) {
        return false;
      }
    }

    // 4. Order Type Filter
    if (orderType && orderType !== 'All') {
      if (
        String(order.orderType || '').toLowerCase() !==
        orderType.toLowerCase()
      ) {
        return false;
      }
    }

    // 5. Date Range Filter
    if (interval) {
      const dateVal = order.completedAt || order.createdAt;
      if (!dateVal) return false;
      try {
        const dateObj =
          typeof dateVal === 'string' ? parseISO(dateVal) : new Date(dateVal);
        if (!isWithinInterval(dateObj, { start: interval.start, end: interval.end })) {
          return false;
        }
      } catch {
        return false;
      }
    }

    return true;
  });
}

/**
 * Checks whether an invoice is eligible for full reversal.
 * Safety Rules:
 * - Must exist
 * - Must be 'completed'
 * - Must NOT be already 'reversed'
 * - Must NOT already have an active linked reversal record
 * - Grand total or lines must be valid
 */
export function isInvoiceReversible(order, reversals = []) {
  if (!order || typeof order !== 'object') return false;

  // Must have completed status
  if (order.status !== 'completed') return false;

  // Cannot reverse if already recorded in reversals
  if (Array.isArray(reversals)) {
    const alreadyReversed = reversals.some(
      (r) => r.originalOrderId === order.id || r.originalInvoiceNumber === order.invoiceNumber
    );
    if (alreadyReversed) return false;
  }

  // Must have valid identifier and financial value
  if (!order.id || !order.invoiceNumber) return false;

  return true;
}

/**
 * Finds the linked reversal record for an invoice
 */
export function getReversalByInvoice(reversals = [], orderIdOrNumber = '') {
  if (!Array.isArray(reversals) || !orderIdOrNumber) return null;
  const query = String(orderIdOrNumber).trim().toLowerCase();
  return (
    reversals.find(
      (r) =>
        String(r.originalOrderId).toLowerCase() === query ||
        String(r.originalInvoiceNumber).toLowerCase() === query
    ) || null
  );
}

/**
 * Creates a canonical full reversal record from the original completed invoice snapshot.
 * FINANCIAL SNAPSHOT RULE:
 * Preserves the exact original amounts (subtotal, discount, tax, grand total).
 * NEVER recalculates using today's menu prices or settings tax rate.
 */
export function createReversalSnapshot(order, { reason = '', note = '', reversedBy = 'Admin Cashier' } = {}) {
  if (!order || !order.id || !order.invoiceNumber) {
    throw new Error('Cannot reverse invalid order: missing identifier.');
  }

  const cleanReason = String(reason || '').trim();
  if (!cleanReason) {
    throw new Error('Reversal reason is mandatory.');
  }

  const subtotalReversed = Math.round(Number(order.subtotal) || 0);
  const discountReversed = Math.round(Number(order.discountAmount) || 0);
  const taxReversed = Math.round(Number(order.taxAmount) || 0);
  const totalReversedIncludingTax = Math.round(Number(order.grandTotal) || 0);

  const now = new Date().toISOString();

  return {
    id: `rev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    originalOrderId: order.id,
    originalInvoiceNumber: order.invoiceNumber,
    reason: cleanReason,
    note: String(note || '').trim(),
    reversedBy: reversedBy || 'Admin Cashier',
    subtotalReversed,
    discountReversed,
    taxReversed,
    totalReversedIncludingTax,
    status: 'reversed',
    reversedAt: now,
    createdAt: now,
  };
}

/**
 * Returns breakdown of financial impact for a reversal record
 */
export function calculateReversalImpact(reversal) {
  if (!reversal) {
    return {
      subtotalReversed: 0,
      discountReversed: 0,
      taxReversed: 0,
      totalReversedIncludingTax: 0,
    };
  }

  return {
    subtotalReversed: Number(reversal.subtotalReversed) || 0,
    discountReversed: Number(reversal.discountReversed) || 0,
    taxReversed: Number(reversal.taxReversed) || 0,
    totalReversedIncludingTax: Number(reversal.totalReversedIncludingTax) || 0,
  };
}

/**
 * Formats order data into clean, structured printable data model
 */
export function formatInvoiceForPrint(order, settings = {}, reversal = null) {
  if (!order) return null;

  const isReversed = order.status === 'reversed' || Boolean(reversal);

  return {
    business: {
      name: settings?.restaurantName || 'SpiceHub',
      store: order.storeName || settings?.storeName || 'Chengxi Store',
      address: settings?.address || 'Shop #4, Food Street, Main Boulevard',
      phone: settings?.phone || '+92 300 1234567',
      footer: settings?.invoiceFooter || 'Thank you for dining with SpiceHub! Please visit again.',
    },
    meta: {
      invoiceNumber: order.invoiceNumber,
      orderType: order.orderType || 'Dine-In',
      paymentMethod: order.paymentMethod || 'Cash',
      cashier: order.cashierName || 'Cashier',
      date: new Date(order.completedAt || order.createdAt || Date.now()).toLocaleDateString(),
      time: new Date(order.completedAt || order.createdAt || Date.now()).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }),
      isReversed,
      reversalReason: reversal?.reason || null,
      reversalDate: reversal?.reversedAt ? new Date(reversal.reversedAt).toLocaleDateString() : null,
      reversalTime: reversal?.reversedAt
        ? new Date(reversal.reversedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
        : null,
    },
    lines: (order.lines || []).map((l) => ({
      name: l.itemNameSnapshot,
      portion: l.selectedPortionLabel || l.baseUnitSnapshot || 'Regular',
      grams: l.selectedWeightGrams || null,
      isCustomAmount: l.pricingMode === 'amount',
      quantity: l.quantity || 1,
      unitPrice: l.unitPrice || 0,
      lineSubtotal: l.lineSubtotal || 0,
      addons: (l.addonSnapshots || []).map((a) => (a.quantity && a.quantity > 1 ? `${a.name} x${a.quantity}` : a.name)),
    })),
    totals: {
      subtotal: order.subtotal || 0,
      discountType: order.discountType || 'fixed',
      discountValue: order.discountValue || 0,
      discountAmount: order.discountAmount || 0,
      taxRate: order.taxRateSnapshot || 0,
      taxAmount: order.taxAmount || 0,
      grandTotal: order.grandTotal || 0,
      amountReceived: order.amountReceived || 0,
      changeAmount: order.changeAmount || 0,
    },
  };
}
