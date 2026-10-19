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

function getInvoiceSequenceNumber(record) {
  if (!record) return 0;
  if (record.sequenceNumber != null && !isNaN(Number(record.sequenceNumber)) && Number(record.sequenceNumber) > 0) {
    return Number(record.sequenceNumber);
  }
  const str = String(record.invoiceNumber || record.originalInvoiceNumber || record.id || '');
  const matches = str.match(/(\d+)/g);
  if (matches && matches.length > 0) {
    return parseInt(matches[matches.length - 1], 10) || 0;
  }
  return 0;
}

export function sortInvoicesDescending(a, b) {
  const seqA = getInvoiceSequenceNumber(a);
  const seqB = getInvoiceSequenceNumber(b);
  if (seqA !== 0 && seqB !== 0 && seqB !== seqA) {
    return seqB - seqA;
  }
  const dateA = new Date(a.completedAt || a.createdAt || a.reversedAt || 0).getTime();
  const dateB = new Date(b.completedAt || b.createdAt || b.reversedAt || 0).getTime();
  if (dateB !== dateA) {
    return dateB - dateA;
  }
  return String(b.invoiceNumber || b.originalInvoiceNumber || b.id || '').localeCompare(
    String(a.invoiceNumber || a.originalInvoiceNumber || a.id || ''),
    undefined,
    { numeric: true }
  );
}

/**
 * Returns invoice history sorted by sequence and completion/creation date descending
 */
export function getInvoiceHistory(orders = []) {
  if (!Array.isArray(orders)) return [];
  return [...orders].sort(sortInvoicesDescending);
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
  const hasDateFilter = datePreset && datePreset !== 'All Time' && datePreset !== 'All Dates';
  const interval = hasDateFilter
    ? getDateIntervalForPreset(datePreset, customRange, referenceDate)
    : null;

  const filtered = orders.filter((order) => {
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
      const isPartial =
        (Number(order.balanceDue) > 0 || (order.paymentStatus || '').toLowerCase() === 'partial') &&
        orderStatus !== 'reversed';
      const target = status.toLowerCase();

      if (target === 'partial' || target === 'outstanding') {
        if (!isPartial) return false;
      } else if (target === 'completed') {
        if (orderStatus !== 'completed' || isPartial) return false;
      } else if (orderStatus !== target) {
        return false;
      }
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

  return filtered.sort(sortInvoicesDescending);
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

/**
 * Evaluates whether a user entity represents a Cashier (not Admin)
 */
export function isCashierUser(user) {
  if (!user) return false;
  const userRole = String(user.role || '').toLowerCase();
  const userUsername = String(user.username || '').toLowerCase();
  const isAdmin = userRole.includes('admin') || userUsername === 'admin';
  return !isAdmin && (userRole.includes('cashier') || userUsername === 'cashier');
}

/**
 * Determines if an invoice is visible to the given user based on role-based ownership:
 * - Admin: can see all invoices created by all authorized users.
 * - Cashier: can see ONLY invoices created by that logged-in cashier.
 *   Must NOT see Admin-created invoices.
 *   Must NOT see another cashier's invoices.
 *   If creator attribution is genuinely missing, do not invent ownership (Admin only).
 */
export function isInvoiceVisibleToUser(order, user) {
  if (!order || !user) return false;

  // 1. Admin can see all invoices created by all authorized users
  const userRole = String(user.role || '').toLowerCase();
  const userUsername = String(user.username || '').toLowerCase();
  const isAdmin = userRole.includes('admin') || userUsername === 'admin';
  if (isAdmin) {
    return true;
  }

  // 2. Cashier visibility check
  const currentUserId = String(user.id || (user.username ? `user_${user.username}` : '')).trim();
  if (!currentUserId) return false;

  const orderUserId = String(order.createdByUserId || '').trim();
  const orderRole = String(order.createdByRole || '').toLowerCase();

  // If order was created by an admin, cashier must NEVER see it
  if (orderRole === 'admin') {
    return false;
  }

  // If order has creator attribution, match strictly against logged-in cashier's ID
  if (orderUserId) {
    return orderUserId === currentUserId;
  }

  // "Do not determine invoice ownership from current username text only.
  // If historical invoice creator data already exists, use it.
  // If creator attribution is genuinely missing, do not invent ownership."
  // Therefore, invoices with genuinely missing creator attribution are NOT visible to Cashier.
  return false;
}

/**
 * Generates user-scoped localStorage key for POS cart
 */
export function getUserCartStorageKey(userOrId) {
  if (!userOrId) return 'cart_guest';
  const id = typeof userOrId === 'string'
    ? userOrId
    : userOrId.id || (userOrId.username ? `user_${userOrId.username}` : '');
  const clean = String(id).trim();
  return clean ? `cart_${clean}` : 'cart_guest';
}

/**
 * Determines if a notification is visible to the given user based on role & ownership:
 * - Admin: sees all system notifications across the store.
 * - Cashier: sees ONLY notifications targeted to them:
 *   - Notifications created by this cashier (their own completed sales)
 *   - Notifications explicitly targeted to this cashier ID
 *   - Broadcast announcements targeting 'cashier' or 'all'
 *   - Must NEVER see Admin-only notifications (Admin sales, Admin-only reversals)
 */
export function isNotificationVisibleToUser(notification, user) {
  if (!notification || !user) return false;

  const userRole = String(user.role || '').toLowerCase();
  const userUsername = String(user.username || '').toLowerCase();
  const isAdmin = userRole.includes('admin') || userUsername === 'admin';

  // 1. Admin sees all notifications across the restaurant
  if (isAdmin) {
    return true;
  }

  // 2. Cashier visibility check
  const currentUserId = String(user.id || (user.username ? `user_${user.username}` : '')).trim();
  if (!currentUserId) return false;

  const notifCreatedByRole = String(notification.createdByRole || '').toLowerCase();
  const notifCreatedByUserId = String(notification.createdByUserId || '').trim();
  const notifTargetUserId = String(notification.targetUserId || '').trim();
  const targetRoles = Array.isArray(notification.targetRoles)
    ? notification.targetRoles.map((r) => String(r).toLowerCase())
    : [];

  // If explicitly targeted to this specific user ID
  if (notifTargetUserId) {
    return notifTargetUserId === currentUserId;
  }

  // If created by an admin and not explicitly broadcast to cashiers/all, hide from cashier
  if (notifCreatedByRole === 'admin') {
    const isBroadcastToCashier = targetRoles.includes('cashier') || targetRoles.includes('all');
    return isBroadcastToCashier;
  }

  // If created by another cashier, hide from this cashier (unless broadcast)
  if (notifCreatedByUserId) {
    if (notifCreatedByUserId === currentUserId) {
      return true;
    }
    const isBroadcast = targetRoles.includes('all') || targetRoles.includes('cashier');
    return isBroadcast && !notifCreatedByRole.includes('admin');
  }

  // If targetRoles has 'cashier' or 'all'
  if (targetRoles.length > 0) {
    return targetRoles.includes('cashier') || targetRoles.includes('all');
  }

  // Default: hide untargeted admin/legacy notifications from cashier
  return false;
}

/**
 * Filters notifications list based on user role and ownership
 */
export function filterNotificationsByTargetUser(notifications = [], user = null) {
  if (!Array.isArray(notifications)) return [];
  if (!user) return [];
  return notifications.filter((notif) => isNotificationVisibleToUser(notif, user));
}

/**
 * Filters orders list based on user role and ownership
 */
export function filterOrdersByOwnership(orders = [], user = null) {
  if (!Array.isArray(orders)) return [];
  if (!user) return [];
  return orders.filter((order) => isInvoiceVisibleToUser(order, user));
}

/**
 * Safely repairs existing orders that share duplicate invoice numbers (e.g. historical multiple INV-0001).
 * NEVER deletes any completed order. Preserves all items, lines, amounts, and dates.
 * Reassigns duplicate orders to unique consecutive sequential invoice numbers.
 */
export function repairDuplicateInvoiceNumbersLocally(orders = [], prefix = 'INV-') {
  if (!Array.isArray(orders) || orders.length === 0) return [];

  // Sort by completedAt or createdAt ascending (oldest first)
  const sorted = [...orders].sort((a, b) => {
    const tA = new Date(a.completedAt || a.createdAt || 0).getTime();
    const tB = new Date(b.completedAt || b.createdAt || 0).getTime();
    return tA - tB;
  });

  const invoiceMap = new Map();
  let maxSeq = 0;

  for (const o of sorted) {
    const inv = String(o.invoiceNumber || '').trim();
    if (inv) {
      const num = parseInt(inv.replace(/\D/g, ''), 10);
      if (!isNaN(num) && num > maxSeq) maxSeq = num;
    }
    if (o.sequenceNumber && Number(o.sequenceNumber) > maxSeq) {
      maxSeq = Number(o.sequenceNumber);
    }
  }

  const repaired = sorted.map((o) => {
    const inv = String(o.invoiceNumber || '').trim();
    if (!inv || !invoiceMap.has(inv)) {
      if (inv) invoiceMap.set(inv, o.id);
      return o;
    } else {
      // Duplicate detected! Assign next sequential number without deleting the order
      maxSeq += 1;
      const newSeq = maxSeq;
      const newInv = `${prefix}${String(newSeq).padStart(4, '0')}`;
      invoiceMap.set(newInv, o.id);
      return {
        ...o,
        sequenceNumber: newSeq,
        invoiceNumber: newInv,
      };
    }
  });

  return repaired;
}

/**
 * Generates next sequential unique invoice number by scanning all existing orders
 */
export function generateNextSequentialInvoiceNumber(allOrders = [], prefix = 'INV-') {
  let maxSeq = 0;
  for (const o of (allOrders || [])) {
    if (o?.sequenceNumber && Number(o.sequenceNumber) > maxSeq) {
      maxSeq = Number(o.sequenceNumber);
    }
    if (o?.invoiceNumber) {
      const num = parseInt(String(o.invoiceNumber).replace(/\D/g, ''), 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }
  const nextSeq = maxSeq + 1;
  return {
    sequenceNumber: nextSeq,
    invoiceNumber: `${prefix}${String(nextSeq).padStart(4, '0')}`,
  };
}
