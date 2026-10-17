/**
 * Domain Dashboard Selectors
 * Pure, testable calculation functions for all 8 KPI metrics,
 * sales aggregations, charts, and activities.
 *
 * Implements strict accounting principles defined in PRD & TRD:
 * - Tax is NOT revenue.
 * - Tax Collected derives strictly from stored taxAmount snapshots, NOT a hardcoded 16%.
 * - Completed Orders KPI reflects historical completed invoice count (does NOT subtract reversals).
 * - Economically valid sales metrics (Net Revenue, Tax Collected, Items Sold, AOV)
 *   use getValidNonReversedOrders() to exclude reversed sales.
 * - Average Order Value = validBilledSales / validNonReversedOrderCount.
 */
import {
  isWithinInterval,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  parseISO,
  format,
  eachDayOfInterval,
  isSameDay,
} from 'date-fns';

/**
 * Resolves start & end dates for a named preset or custom date range
 */
export function getDateIntervalForPreset(datePreset, customRange = null, referenceDate = new Date()) {
  const ref = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);

  if (datePreset === 'All Dates' || datePreset === 'All Time') {
    return {
      start: new Date(0),
      end: new Date(8640000000000000),
      label: 'All Dates',
    };
  }

  if (datePreset === 'Today') {
    return {
      start: startOfDay(ref),
      end: endOfDay(ref),
      label: 'Today',
    };
  }

  if (datePreset === 'Yesterday') {
    const yest = new Date(ref);
    yest.setDate(yest.getDate() - 1);
    return {
      start: startOfDay(yest),
      end: endOfDay(yest),
      label: 'Yesterday',
    };
  }

  if (datePreset === 'This Week') {
    return {
      start: startOfWeek(ref, { weekStartsOn: 1 }), // Week starts Monday
      end: endOfWeek(ref, { weekStartsOn: 1 }),
      label: 'This Week',
    };
  }

  if (datePreset === 'This Month') {
    return {
      start: startOfMonth(ref),
      end: endOfMonth(ref),
      label: 'This Month',
    };
  }

  if (datePreset === 'Custom' && customRange?.startDate && customRange?.endDate) {
    try {
      const s = typeof customRange.startDate === 'string' ? parseISO(customRange.startDate) : customRange.startDate;
      const e = typeof customRange.endDate === 'string' ? parseISO(customRange.endDate) : customRange.endDate;
      return {
        start: startOfDay(s),
        end: endOfDay(e),
        label: `${format(s, 'dd MMM')} - ${format(e, 'dd MMM')}`,
      };
    } catch {
      // Fallback if parsing fails
    }
  }

  // Fallback to all-time
  return {
    start: new Date(0),
    end: new Date(8640000000000000),
    label: 'All Time',
  };
}

/**
 * Filters orders by active date range
 */
export function getFilteredOrders(orders = [], datePreset = 'This Week', customRange = null, referenceDate = new Date()) {
  if (!Array.isArray(orders) || orders.length === 0) return [];
  const interval = getDateIntervalForPreset(datePreset, customRange, referenceDate);

  return orders.filter((o) => {
    const dateVal = o.completedAt || o.createdAt;
    if (!dateVal) return false;
    const dateObj = typeof dateVal === 'string' ? parseISO(dateVal) : new Date(dateVal);
    return isWithinInterval(dateObj, { start: interval.start, end: interval.end });
  });
}

/**
 * Filters reversals by active date range
 */
export function getFilteredReversals(reversals = [], datePreset = 'This Week', customRange = null, referenceDate = new Date()) {
  if (!Array.isArray(reversals) || reversals.length === 0) return [];
  const interval = getDateIntervalForPreset(datePreset, customRange, referenceDate);

  const seen = new Set();
  const deduped = [];
  for (const r of reversals) {
    const key = r.originalOrderId || r.originalInvoiceNumber || r.id;
    if (key && !seen.has(key)) {
      seen.add(key);
      deduped.push(r);
    } else if (!key) {
      deduped.push(r);
    }
  }

  return deduped.filter((r) => {
    const dateVal = r.reversedAt || r.createdAt;
    if (!dateVal) return false;
    const dateObj = typeof dateVal === 'string' ? parseISO(dateVal) : new Date(dateVal);
    return isWithinInterval(dateObj, { start: interval.start, end: interval.end });
  });
}

/**
 * Resolves economically valid completed orders by excluding reversed orders.
 * Used internally for calculations that require active economic impact
 * (Net Revenue, valid tax, items sold, AOV).
 */
export function getValidNonReversedOrders(orders = [], reversals = []) {
  if (!Array.isArray(orders) || orders.length === 0) return [];

  const reversedOrderIds = new Set(
    Array.isArray(reversals) ? reversals.map((r) => r.originalOrderId || r.orderId) : []
  );

  return orders.filter(
    (o) => o.status !== 'reversed' && !reversedOrderIds.has(o.id)
  );
}

/**
 * 1. Gross Sales:
 * Sum of completed invoice grand totals before reversal adjustment.
 */
export function calculateGrossSales(orders = []) {
  if (!Array.isArray(orders) || orders.length === 0) return 0;
  return orders.reduce((sum, o) => sum + (Number(o.grandTotal) || 0), 0);
}

/**
 * 2. Completed Orders:
 * Count of completed invoices inside the selected date range.
 * Semantics: A completed invoice remains a completed historical invoice even if later reversed.
 * Does NOT subtract reversals (reversals are tracked separately).
 */
export function calculateCompletedOrders(orders = []) {
  if (!Array.isArray(orders) || orders.length === 0) return 0;
  return orders.length;
}

/**
 * 3. Net Revenue:
 * Valid net sales excluding tax after discounts and reversals.
 * IMPORTANT: Tax is NOT revenue.
 * Formula: sum(grandTotal - taxAmount) for valid non-reversed orders.
 * Uses the stored taxAmount snapshot of each order (does NOT recalculate with fixed rate).
 */
export function calculateNetRevenue(orders = [], reversals = []) {
  const validOrders = getValidNonReversedOrders(orders, reversals);
  return validOrders.reduce((sum, o) => {
    const grand = Number(o.grandTotal) || 0;
    const tax = Number(o.taxAmount) || 0;
    return sum + (grand - tax);
  }, 0);
}

/**
 * 4. Reversals Including Tax:
 * Total customer-billed amount reversed including reversed tax.
 */
export function calculateReversalTotal(reversals = []) {
  if (!Array.isArray(reversals) || reversals.length === 0) return 0;
  return reversals.reduce((sum, r) => sum + (Number(r.totalReversedIncludingTax) || 0), 0);
}

/**
 * 5. Average Order Value (AOV):
 * Formula: validBilledSales / validNonReversedOrderCount
 * Uses economically valid completed sales after reversal exclusion.
 * Handles zero orders safely.
 */
export function calculateAverageOrderValue(orders = [], reversals = []) {
  const validOrders = getValidNonReversedOrders(orders, reversals);
  const validOrderCount = validOrders.length;
  if (validOrderCount === 0) return 0;

  const validBilledSales = validOrders.reduce(
    (sum, o) => sum + (Number(o.grandTotal) || 0),
    0
  );
  return Math.round(validBilledSales / validOrderCount);
}

/**
 * 6. Tax Collected:
 * Valid remaining tax from non-reversed completed sales.
 * Derived strictly from the stored taxAmount snapshots on valid orders.
 * Does NOT assume a hardcoded 16% tax rate.
 */
export function calculateTaxCollected(orders = [], reversals = []) {
  const validOrders = getValidNonReversedOrders(orders, reversals);
  return validOrders.reduce((sum, o) => sum + (Number(o.taxAmount) || 0), 0);
}

/**
 * 7. Discounts Given:
 * Valid discount amount from completed non-reversed sales.
 */
export function calculateDiscountTotal(orders = [], reversals = []) {
  const validOrders = getValidNonReversedOrders(orders, reversals);
  return validOrders.reduce((sum, o) => sum + (Number(o.discountAmount) || 0), 0);
}

/**
 * 8. Items Sold:
 * Total sold quantity from valid completed sales (excluding reversed orders).
 */
export function calculateItemsSold(orders = [], reversals = []) {
  const validOrders = getValidNonReversedOrders(orders, reversals);
  return validOrders.reduce((sum, o) => {
    const lineQty = o.lines?.reduce((lSum, l) => lSum + (Number(l.quantity) || 0), 0) || 0;
    return sum + lineQty;
  }, 0);
}

/**
 * 9. Number of Customers:
 * Computes customer count strictly and ONLY from order.guestCount.
 *
 * Rules:
 * - Dine-In: use saved guestCount (order.guestCount)
 * - Takeaway: default guestCount = 1
 * - Old orders without guestCount: fallback = 1
 * - Reversed orders: exclude from customer count
 * - Never derive customers from items sold, quantity, add-ons, or demo constants.
 */
export function calculateTotalCustomers(orders = [], reversals = []) {
  if (!Array.isArray(orders) || orders.length === 0) return 0;

  const validOrders = getValidNonReversedOrders(orders, reversals);

  return validOrders.reduce((total, order) => {
    const isTakeaway = (order.orderType || '').trim().toLowerCase() === 'takeaway';
    const parsedGuest = Number(order.guestCount);
    const hasValidGuest = Number.isFinite(parsedGuest) && parsedGuest > 0;

    if (isTakeaway) {
      // Takeaway: default guestCount = 1
      return total + (hasValidGuest ? Math.round(parsedGuest) : 1);
    }

    // Dine-In / standard: use saved guestCount, with fallback = 1 for old orders without guestCount
    return total + (hasValidGuest ? Math.round(parsedGuest) : 1);
  }, 0);
}

export const calculateCustomers = calculateTotalCustomers;

/**
 * Computes all 8+ KPI metrics in a single clean selector
 */
export function deriveKPIMetrics(orders = [], reversals = []) {
  const seen = new Set();
  const dedupedReversals = [];
  if (Array.isArray(reversals)) {
    for (const r of reversals) {
      const key = r.originalOrderId || r.originalInvoiceNumber || r.id;
      if (key && !seen.has(key)) {
        seen.add(key);
        dedupedReversals.push(r);
      } else if (!key) {
        dedupedReversals.push(r);
      }
    }
  }

  const validOrders = getValidNonReversedOrders(orders, dedupedReversals);
  const validGrossSales = calculateGrossSales(validOrders);
  const totalCustomers = calculateTotalCustomers(orders, dedupedReversals);

  return {
    grossSales: calculateGrossSales(orders),
    netSales: validGrossSales,
    completedOrders: calculateCompletedOrders(orders),
    activeOrdersCount: validOrders.length,
    validNonReversedOrdersCount: validOrders.length,
    netRevenue: calculateNetRevenue(orders, dedupedReversals),
    reversalsIncludingTax: calculateReversalTotal(dedupedReversals),
    averageOrderValue: calculateAverageOrderValue(orders, dedupedReversals),
    taxCollected: calculateTaxCollected(orders, dedupedReversals),
    discountsGiven: calculateDiscountTotal(orders, dedupedReversals),
    itemsSold: calculateItemsSold(orders, dedupedReversals),
    reversalsCount: dedupedReversals.length,
    totalCustomers,
    customers: totalCustomers,
    numberOfCustomers: totalCustomers,
  };
}

/**
 * Groups sales and revenue by date for the main trend chart
 */
export function groupSalesByDate(
  orders = [],
  reversals = [],
  datePreset = 'This Week',
  customRange = null,
  referenceDate = new Date()
) {
  const interval = getDateIntervalForPreset(datePreset, customRange, referenceDate);

  let days = [];
  const isAstronomical =
    !interval ||
    datePreset === 'All Time' ||
    interval.start.getFullYear() < 2000 ||
    interval.end.getFullYear() > 2100;

  if (isAstronomical) {
    const allDates = [
      ...orders.map((o) => o.completedAt || o.createdAt),
      ...reversals.map((r) => r.reversedAt || r.createdAt),
    ]
      .filter(Boolean)
      .map((d) => (typeof d === 'string' ? parseISO(d) : new Date(d)))
      .filter((d) => !isNaN(d.getTime()));

    if (allDates.length === 0) {
      days = [startOfDay(referenceDate)];
    } else {
      const timestamps = allDates.map((d) => startOfDay(d).getTime());
      const minDate = new Date(Math.min(...timestamps));
      const maxDate = new Date(Math.max(...timestamps));
      const dayDiff = Math.round((maxDate - minDate) / (1000 * 60 * 60 * 24));

      if (dayDiff <= 31) {
        try {
          days = eachDayOfInterval({ start: minDate, end: maxDate });
        } catch {
          days = [startOfDay(referenceDate)];
        }
      } else {
        const uniqueDayTimes = Array.from(new Set(timestamps)).sort((a, b) => a - b);
        days = uniqueDayTimes.map((t) => new Date(t));
      }
    }
  } else {
    try {
      days = eachDayOfInterval({ start: interval.start, end: interval.end });
    } catch {
      days = [startOfDay(referenceDate)];
    }
  }

  // Cap day count to 31 for performance and readability
  const daysInInterval = days.slice(-31);

  return daysInInterval.map((dayDate) => {
    const dayOrders = orders.filter((o) => {
      const d = o.completedAt || o.createdAt;
      if (!d) return false;
      try {
        const parsed = typeof d === 'string' ? parseISO(d) : new Date(d);
        return isSameDay(parsed, dayDate);
      } catch {
        return false;
      }
    });

    const dayReversals = reversals.filter((r) => {
      const d = r.reversedAt || r.createdAt;
      if (!d) return false;
      try {
        const parsed = typeof d === 'string' ? parseISO(d) : new Date(d);
        return isSameDay(parsed, dayDate);
      } catch {
        return false;
      }
    });

    const grossSales = calculateGrossSales(dayOrders);
    const netRevenue = calculateNetRevenue(dayOrders, dayReversals);
    const ordersCount = calculateCompletedOrders(dayOrders);
    const tax = calculateTaxCollected(dayOrders, dayReversals);

    return {
      day: format(dayDate, 'EEE'), // 'Mon', 'Tue'
      date: format(dayDate, 'dd MMM'), // '08 Oct'
      fullDate: format(dayDate, 'yyyy-MM-dd'),
      grossSales,
      netRevenue,
      tax,
      orders: ordersCount,
      hasData: grossSales > 0 || netRevenue > 0,
    };
  });
}

/**
 * Categorizes sales by dish category for donut/pie chart
 */
const CATEGORY_COLORS = [
  '#FF5C28', // Brand Coral
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
];

export function groupSalesByCategory(orders = [], reversals = []) {
  const validOrders = getValidNonReversedOrders(orders, reversals);
  const categoryMap = new Map();

  validOrders.forEach((order) => {
    if (!Array.isArray(order.lines)) return;
    order.lines.forEach((line) => {
      const cat = line.categoryNameSnapshot || line.category || 'Other';
      const lineTotal = Number(line.lineSubtotal) || (Number(line.unitPrice) || 0) * (Number(line.quantity) || 1);
      const current = categoryMap.get(cat) || { name: cat, value: 0, itemsCount: 0 };
      current.value += lineTotal;
      current.itemsCount += Number(line.quantity) || 1;
      categoryMap.set(cat, current);
    });
  });

  const totalCategorySales = Array.from(categoryMap.values()).reduce((sum, c) => sum + c.value, 0);

  return Array.from(categoryMap.values())
    .map((item, index) => ({
      ...item,
      percentage: totalCategorySales > 0 ? Math.round((item.value / totalCategorySales) * 100) : 0,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Aggregates payment method breakdown (Cash, Card, Online)
 */
export function groupSalesByPaymentMethod(orders = [], reversals = []) {
  const validOrders = getValidNonReversedOrders(orders, reversals);
  const totalBilled = validOrders.reduce((sum, o) => sum + (Number(o.grandTotal) || 0), 0);

  const methods = ['Cash', 'Card', 'Online'];

  return methods.map((method) => {
    const methodOrders = validOrders.filter(
      (o) => (o.paymentMethod || '').toLowerCase() === method.toLowerCase()
    );

    const amount = methodOrders.reduce((sum, o) => sum + (Number(o.grandTotal) || 0), 0);
    const count = methodOrders.length;
    const percentage = totalBilled > 0 ? Math.round((amount / totalBilled) * 100) : 0;

    return {
      method,
      amount,
      count,
      percentage,
    };
  });
}

/**
 * Resolves top selling dishes sorted by sold volume & revenue
 */
export function getTopSellingItems(orders = [], reversals = [], limit = 5) {
  const validOrders = getValidNonReversedOrders(orders, reversals);
  const itemMap = new Map();

  validOrders.forEach((order) => {
    if (!Array.isArray(order.lines)) return;
    order.lines.forEach((line) => {
      const key = line.itemId || line.itemNameSnapshot || line.name;
      const name = line.itemNameSnapshot || line.name || 'Special Item';
      const category = line.categoryNameSnapshot || line.category || 'Specialty';
      const quantity = Number(line.quantity) || 1;
      const subtotal = Number(line.lineSubtotal) || (Number(line.unitPrice) || 0) * quantity;
      const image = line.itemImageSnapshot || line.imageRef || null;

      const existing = itemMap.get(key) || {
        id: key,
        name,
        category,
        quantitySold: 0,
        netSales: 0,
        image,
      };

      existing.quantitySold += quantity;
      existing.netSales += subtotal;
      if (!existing.image && image) {
        existing.image = image;
      }
      itemMap.set(key, existing);
    });
  });

  return Array.from(itemMap.values())
    .sort((a, b) => {
      if (b.quantitySold !== a.quantitySold) return b.quantitySold - a.quantitySold;
      return b.netSales - a.netSales;
    })
    .slice(0, limit);
}

/**
 * Aggregates unified chronological recent activities (completed sales & reversals)
 */
export function getRecentActivity(orders = [], reversals = [], limit = 6) {
  const activities = [];

  if (Array.isArray(orders)) {
    orders.forEach((o) => {
      const isRev = o.status === 'reversed';
      const firstLine = o.lines?.[0];
      const image = firstLine?.itemImageSnapshot || firstLine?.image || null;
      activities.push({
        id: `sale-${o.id}`,
        type: 'sale',
        title: isRev ? 'Sale (Reversed)' : 'Sale Completed',
        invoiceNumber: o.invoiceNumber || `#${o.id}`,
        amount: Number(o.grandTotal) || 0,
        date: o.completedAt || o.createdAt,
        status: isRev ? 'Reversed' : 'Completed',
        variant: isRev ? 'danger' : 'success',
        paymentMethod: o.paymentMethod || 'Cash',
        itemsCount: o.lines?.reduce((sum, l) => sum + (Number(l.quantity) || 1), 0) || 1,
        image,
        itemId: firstLine?.itemId,
        dishName: firstLine?.itemNameSnapshot || null,
      });
    });
  }

  if (Array.isArray(reversals)) {
    reversals.forEach((r) => {
      activities.push({
        id: `rev-${r.id}`,
        type: 'reversal',
        title: 'Invoice Reversed',
        invoiceNumber: r.originalInvoiceNumber || `INV-${r.originalOrderId}`,
        amount: Number(r.totalReversedIncludingTax) || 0,
        date: r.reversedAt || r.createdAt,
        status: 'Reversed',
        variant: 'danger',
        reason: r.reason || 'Full reversal requested',
      });
    });
  }

  return activities
    .sort((a, b) => {
      const dateA = a.date ? (typeof a.date === 'string' ? parseISO(a.date).getTime() : new Date(a.date).getTime()) : 0;
      const dateB = b.date ? (typeof b.date === 'string' ? parseISO(b.date).getTime() : new Date(b.date).getTime()) : 0;
      return dateB - dateA;
    })
    .slice(0, limit);
}

/**
 * Full master selector providing all filtered datasets for DashboardPage
 */
export function deriveDashboardData(
  allOrders = [],
  allReversals = [],
  datePreset = 'This Week',
  customRange = null,
  referenceDate = new Date()
) {
  const filteredOrders = getFilteredOrders(allOrders, datePreset, customRange, referenceDate);
  const filteredReversals = getFilteredReversals(allReversals, datePreset, customRange, referenceDate);

  const kpis = deriveKPIMetrics(filteredOrders, filteredReversals);

  const chartData = groupSalesByDate(
    filteredOrders,
    filteredReversals,
    datePreset,
    customRange,
    referenceDate
  );

  const categoryData = groupSalesByCategory(filteredOrders, filteredReversals);
  const paymentData = groupSalesByPaymentMethod(filteredOrders, filteredReversals);
  const topSellingItems = getTopSellingItems(filteredOrders, filteredReversals, 5);
  const recentActivities = getRecentActivity(filteredOrders, filteredReversals, 6);
  const interval = getDateIntervalForPreset(datePreset, customRange, referenceDate);

  return {
    kpis,
    chartData,
    categoryData,
    paymentData,
    topSellingItems,
    recentActivities,
    intervalLabel: interval.label,
    ordersCount: filteredOrders.length,
    reversalsCount: filteredReversals.length,
  };
}
