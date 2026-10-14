/**
 * Domain Report Selectors & Aggregations
 * Pure, testable reporting logic for:
 * - Sales Report (KPIs, Daily Trends, Category Breakdown, Order Rows)
 * - Revenue Report (Gross vs Net, Tax Separation, Payment Breakdown, Discounts)
 * - Reversal Report (Reversal KPIs, Reversal Trends, Detailed Audit Rows)
 *
 * Reconciles 100% with canonical accounting rules in dashboardSelectors.js.
 */
import {
  isWithinInterval,
  parseISO,
  format,
  eachDayOfInterval,
  isSameDay,
  startOfDay,
} from 'date-fns';
import {
  getDateIntervalForPreset,
  getValidNonReversedOrders,
} from './dashboardSelectors';

function toSafeDate(val) {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'string') {
    try {
      const parsed = parseISO(val);
      if (!isNaN(parsed.getTime())) return parsed;
    } catch {}
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
    const num = Number(val);
    if (!isNaN(num) && num > 0) {
      const dNum = new Date(num);
      if (!isNaN(dNum.getTime())) return dNum;
    }
  }
  return null;
}

/**
 * 1. Filter Orders by comprehensive report filters:
 * - datePreset ('Today' | 'This Week' | 'This Month' | 'All Time' | 'Custom')
 * - customRange ({ startDate, endDate })
 * - categoryId / categoryName
 * - paymentMethod ('All' | 'Cash' | 'Card' | 'Online')
 * - orderType ('All' | 'Dine-In' | 'Takeaway')
 * - status ('All' | 'completed' | 'reversed')
 * - searchQuery (matches invoiceNumber or item name)
 */
export function filterReportOrders(orders = [], filters = {}) {
  if (!Array.isArray(orders) || orders.length === 0) return [];

  const {
    datePreset = 'All Time',
    customRange = null,
    category = 'All',
    paymentMethod = 'All',
    orderType = 'All',
    status = 'All',
    searchQuery = '',
    referenceDate = new Date(),
  } = filters;

  const interval = datePreset !== 'All Time'
    ? getDateIntervalForPreset(datePreset, customRange, referenceDate)
    : null;

  const query = (searchQuery || '').trim().toLowerCase();

  return orders.filter((order) => {
    // Date filter
    if (interval) {
      const dateVal = order.completedAt || order.createdAt;
      const d = toSafeDate(dateVal);
      if (!d) return false;
      try {
        if (!isWithinInterval(d, { start: interval.start, end: interval.end })) {
          return false;
        }
      } catch {
        return false;
      }
    }

    // Status filter
    if (status && status !== 'All') {
      const orderStatus = (order.status || 'completed').toLowerCase();
      if (orderStatus !== status.toLowerCase()) return false;
    }

    // Payment method filter
    if (paymentMethod && paymentMethod !== 'All') {
      if (String(order.paymentMethod || '').toLowerCase() !== paymentMethod.toLowerCase()) {
        return false;
      }
    }

    // Order type filter
    if (orderType && orderType !== 'All') {
      if (String(order.orderType || '').toLowerCase() !== orderType.toLowerCase()) {
        return false;
      }
    }

    // Category filter
    if (category && category !== 'All') {
      const catLower = category.toLowerCase();
      const isAddonFilter = catLower === 'add-ons' || catLower === 'addon' || catLower === 'add-on';
      const hasCategoryMatch = (order.lines || []).some((l) => {
        const lineCat = String(l.categoryNameSnapshot || l.categoryName || '').toLowerCase();
        const hasAddonMatch =
          isAddonFilter &&
          ((Array.isArray(l.addonSnapshots) && l.addonSnapshots.length > 0) ||
            (Array.isArray(l.addons) && l.addons.length > 0) ||
            (Array.isArray(l.selectedAddons) && l.selectedAddons.length > 0));
        return lineCat === catLower || lineCat.includes(catLower) || hasAddonMatch;
      });
      if (!hasCategoryMatch) return false;
    }

    // Search query filter (matches invoiceNumber, item names, or addon names)
    if (query) {
      const matchInv = String(order.invoiceNumber || '').toLowerCase().includes(query);
      const matchItem = (order.lines || []).some((l) => {
        const matchLineItem = String(l.itemNameSnapshot || l.name || '').toLowerCase().includes(query);
        const rawAddons = Array.isArray(l.addonSnapshots)
          ? l.addonSnapshots
          : Array.isArray(l.addons)
          ? l.addons
          : Array.isArray(l.selectedAddons)
          ? l.selectedAddons
          : [];
        const matchAddon = rawAddons.some((a) => String(a.name || '').toLowerCase().includes(query));
        return matchLineItem || matchAddon;
      });
      if (!matchInv && !matchItem) return false;
    }

    return true;
  });
}

/**
 * 2. Filter Reversals by report filters:
 * - datePreset, customRange
 * - reason ('All' | specific reason string)
 * - searchQuery (matches originalInvoiceNumber, reversal ID, or reason)
 */
export function filterReportReversals(reversals = [], filters = {}) {
  if (!Array.isArray(reversals) || reversals.length === 0) return [];

  // Deduplicate by original order/invoice key to prevent duplicate count and inflated totals
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

  const {
    datePreset = 'All Time',
    customRange = null,
    reason = 'All',
    searchQuery = '',
    referenceDate = new Date(),
  } = filters;

  const interval = datePreset !== 'All Time'
    ? getDateIntervalForPreset(datePreset, customRange, referenceDate)
    : null;

  const query = (searchQuery || '').trim().toLowerCase();

  return deduped.filter((rev) => {
    // Date filter
    if (interval) {
      const dateVal = rev.reversedAt || rev.createdAt;
      const d = toSafeDate(dateVal);
      if (!d) return false;
      try {
        if (!isWithinInterval(d, { start: interval.start, end: interval.end })) {
          return false;
        }
      } catch {
        return false;
      }
    }

    // Reason filter
    if (reason && reason !== 'All') {
      const revReason = String(rev.reason || '').toLowerCase();
      if (!revReason.includes(reason.toLowerCase())) return false;
    }

    // Search query filter
    if (query) {
      const matchInv = String(rev.originalInvoiceNumber || '').toLowerCase().includes(query);
      const matchId = String(rev.id || '').toLowerCase().includes(query);
      const matchReason = String(rev.reason || '').toLowerCase().includes(query);
      if (!matchInv && !matchId && !matchReason) return false;
    }

    return true;
  });
}

/**
 * 3. Derive Sales Report KPIs
 * Reconciles with Dashboard calculations:
 * - Gross Sales: Sum of all completed invoice grand totals
 * - Valid Net Sales: Sum of valid non-reversed invoice subtotals (or grand totals without tax)
 * - Completed Orders: Total historical completed orders
 * - Valid Orders Count: Non-reversed orders count
 * - Average Order Value: Valid gross sales / valid orders count
 * - Items Sold: Sum of quantities in valid orders
 * - Discounts Given: Total discounts given across filtered orders
 */
export function deriveSalesReport(filteredOrders = [], filteredReversals = []) {
  const validOrders = getValidNonReversedOrders(filteredOrders, filteredReversals);

  const grossSales = filteredOrders.reduce((sum, o) => sum + (Number(o.grandTotal) || 0), 0);
  const completedOrders = filteredOrders.length;
  const validOrderCount = validOrders.length;

  const validBilledSales = validOrders.reduce((sum, o) => sum + (Number(o.grandTotal) || 0), 0);
  const validNetSales = validOrders.reduce((sum, o) => {
    const grand = Number(o.grandTotal) || 0;
    const tax = Number(o.taxAmount) || 0;
    return sum + (grand - tax);
  }, 0);

  const averageOrderValue = validOrderCount > 0
    ? Math.round(validBilledSales / validOrderCount)
    : 0;

  const itemsSold = validOrders.reduce((sum, o) => {
    const lineQty = (o.lines || []).reduce((q, l) => q + (Number(l.quantity) || 1), 0);
    return sum + lineQty;
  }, 0);

  const discountsGiven = filteredOrders.reduce((sum, o) => sum + (Number(o.discountAmount) || 0), 0);

  return {
    grossSales,
    validNetSales,
    completedOrders,
    validOrderCount,
    averageOrderValue,
    itemsSold,
    discountsGiven,
  };
}

/**
 * 4. Derive Revenue Report KPIs
 * - Gross Billed: All completed sales
 * - Discounts: Discounts given
 * - Tax Collected: Stored tax amounts in valid non-reversed sales
 * - Reversals Including Tax: Total customer-billed reversals
 * - Net Revenue: Valid sales excluding tax and reversals (grandTotal - taxAmount)
 * - Average Net Revenue per Valid Order: Net Revenue / validOrderCount
 */
export function deriveRevenueReport(filteredOrders = [], filteredReversals = []) {
  const validOrders = getValidNonReversedOrders(filteredOrders, filteredReversals);

  const grossBilled = filteredOrders.reduce((sum, o) => sum + (Number(o.grandTotal) || 0), 0);
  const totalDiscounts = filteredOrders.reduce((sum, o) => sum + (Number(o.discountAmount) || 0), 0);

  // Tax Collected derives strictly from stored snapshots in valid non-reversed orders
  const taxCollected = validOrders.reduce((sum, o) => sum + (Number(o.taxAmount) || 0), 0);

  // Reversals
  const reversalsIncludingTax = filteredReversals.reduce(
    (sum, r) => sum + (Number(r.totalReversedIncludingTax) || 0),
    0
  );
  const reversedTax = filteredReversals.reduce((sum, r) => sum + (Number(r.taxReversed) || 0), 0);

  // Net Revenue = valid gross sales - valid tax
  const netRevenue = validOrders.reduce((sum, o) => {
    const grand = Number(o.grandTotal) || 0;
    const tax = Number(o.taxAmount) || 0;
    return sum + (grand - tax);
  }, 0);

  const validOrderCount = validOrders.length;
  const avgNetRevenuePerOrder = validOrderCount > 0
    ? Math.round(netRevenue / validOrderCount)
    : 0;

  return {
    grossBilled,
    totalDiscounts,
    taxCollected,
    reversalsIncludingTax,
    reversedTax,
    netRevenue,
    avgNetRevenuePerOrder,
    validOrderCount,
  };
}

/**
 * 5. Derive Reversal Report KPIs
 * - Reversal Count
 * - Reversed Subtotal
 * - Reversed Discount Impact
 * - Reversed Tax
 * - Reversal Total Including Tax
 */
export function deriveReversalReport(filteredReversals = []) {
  const reversalCount = filteredReversals.length;

  const reversedSubtotal = filteredReversals.reduce(
    (sum, r) => sum + (Number(r.subtotalReversed) || 0),
    0
  );

  const reversedDiscountImpact = filteredReversals.reduce(
    (sum, r) => sum + (Number(r.discountReversed) || 0),
    0
  );

  const reversedTax = filteredReversals.reduce(
    (sum, r) => sum + (Number(r.taxReversed) || 0),
    0
  );

  const reversalTotalIncludingTax = filteredReversals.reduce(
    (sum, r) => sum + (Number(r.totalReversedIncludingTax) || 0),
    0
  );

  return {
    reversalCount,
    reversedSubtotal,
    reversedDiscountImpact,
    reversedTax,
    reversalTotalIncludingTax,
  };
}

/**
 * 6. Payment Method Breakdown (Cash, Card, Online)
 * Returns breakdown of amounts, counts, and percentages for valid orders.
 */
export function getPaymentMethodBreakdown(filteredOrders = [], filteredReversals = []) {
  const validOrders = getValidNonReversedOrders(filteredOrders, filteredReversals);
  const totalBilled = validOrders.reduce((sum, o) => sum + (Number(o.grandTotal) || 0), 0);

  const methods = ['Cash', 'Card', 'Online'];
  const breakdown = methods.map((method) => {
    const matching = validOrders.filter(
      (o) => String(o.paymentMethod || '').toLowerCase() === method.toLowerCase()
    );
    const amount = matching.reduce((sum, o) => sum + (Number(o.grandTotal) || 0), 0);
    const count = matching.length;
    const percentage = totalBilled > 0 ? Math.round((amount / totalBilled) * 100) : 0;

    return {
      method,
      amount,
      count,
      percentage,
    };
  });

  return breakdown;
}

/**
 * 7. Tax Summary Breakdown
 * Returns Tax Collected, Reversed Tax, and Net Valid Tax from stored snapshots
 */
export function getTaxBreakdown(filteredOrders = [], filteredReversals = []) {
  const validOrders = getValidNonReversedOrders(filteredOrders, filteredReversals);
  const taxCollected = validOrders.reduce((sum, o) => sum + (Number(o.taxAmount) || 0), 0);

  const reversedTax = filteredReversals.reduce(
    (sum, r) => sum + (Number(r.taxReversed) || 0),
    0
  );

  const grossTaxHistorical = filteredOrders.reduce(
    (sum, o) => sum + (Number(o.taxAmount) || 0),
    0
  );

  return {
    taxCollected, // Active valid tax
    reversedTax,
    grossTaxHistorical,
    netValidTax: taxCollected,
  };
}

/**
 * 8. Discount Summary Breakdown
 * Returns total discounts, percentage discounts contribution, and fixed discount contribution
 */
export function getDiscountBreakdown(filteredOrders = []) {
  let totalDiscounts = 0;
  let percentageDiscountsAmount = 0;
  let fixedDiscountsAmount = 0;
  let discountedOrdersCount = 0;

  filteredOrders.forEach((o) => {
    const disc = Number(o.discountAmount) || 0;
    if (disc > 0) {
      totalDiscounts += disc;
      discountedOrdersCount += 1;
      if (o.discountType === 'percentage') {
        percentageDiscountsAmount += disc;
      } else {
        fixedDiscountsAmount += disc;
      }
    }
  });

  return {
    totalDiscounts,
    percentageDiscountsAmount,
    fixedDiscountsAmount,
    discountedOrdersCount,
  };
}

/**
 * 9. Daily Revenue Trend Breakdown (Gross Billed vs Net Revenue vs Tax)
 */
export function groupRevenueByDate(filteredOrders = [], filteredReversals = [], datePreset = 'This Week', customRange = null, referenceDate = new Date()) {
  const interval = getDateIntervalForPreset(datePreset, customRange, referenceDate);
  const reversedIds = new Set(filteredReversals.map((r) => r.originalOrderId));

  let days = [];
  const isAstronomical = !interval || datePreset === 'All Time' || interval.start.getFullYear() < 2000 || interval.end.getFullYear() > 2100;

  if (isAstronomical) {
    const allDates = [
      ...filteredOrders.map((o) => o.completedAt || o.createdAt),
      ...filteredReversals.map((r) => r.reversedAt || r.createdAt),
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
        days = eachDayOfInterval({ start: minDate, end: maxDate });
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
  const slicedDays = days.slice(-31);

  return slicedDays.map((d) => {
    const dayLabel = format(d, 'dd MMM');

    const ordersOnDay = filteredOrders.filter((o) => {
      const dateVal = o.completedAt || o.createdAt;
      if (!dateVal) return false;
      try {
        const orderDate = typeof dateVal === 'string' ? parseISO(dateVal) : new Date(dateVal);
        return isSameDay(d, orderDate);
      } catch {
        return false;
      }
    });

    const grossBilled = ordersOnDay.reduce((sum, o) => sum + (Number(o.grandTotal) || 0), 0);

    const validOrdersOnDay = ordersOnDay.filter(
      (o) => o.status !== 'reversed' && !reversedIds.has(o.id)
    );

    const netRevenue = validOrdersOnDay.reduce((sum, o) => {
      const g = Number(o.grandTotal) || 0;
      const t = Number(o.taxAmount) || 0;
      return sum + (g - t);
    }, 0);

    const tax = validOrdersOnDay.reduce((sum, o) => sum + (Number(o.taxAmount) || 0), 0);

    return {
      date: dayLabel,
      grossBilled,
      netRevenue,
      tax,
      orderCount: validOrdersOnDay.length,
    };
  });
}

/**
 * 10. Reversal Trend Grouped by Date
 */
export function groupReversalsByDate(filteredReversals = [], datePreset = 'This Week', customRange = null, referenceDate = new Date()) {
  const interval = getDateIntervalForPreset(datePreset, customRange, referenceDate);

  let days = [];
  const isAstronomical = !interval || datePreset === 'All Time' || interval.start.getFullYear() < 2000 || interval.end.getFullYear() > 2100;

  if (isAstronomical) {
    const allDates = filteredReversals
      .map((r) => r.reversedAt || r.createdAt)
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
        days = eachDayOfInterval({ start: minDate, end: maxDate });
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

  const slicedDays = days.slice(-31);

  return slicedDays.map((d) => {
    const dayLabel = format(d, 'dd MMM');

    const revsOnDay = filteredReversals.filter((r) => {
      const dateVal = r.reversedAt || r.createdAt;
      if (!dateVal) return false;
      try {
        const revDate = typeof dateVal === 'string' ? parseISO(dateVal) : new Date(dateVal);
        return isSameDay(d, revDate);
      } catch {
        return false;
      }
    });

    const reversalTotal = revsOnDay.reduce(
      (sum, r) => sum + (Number(r.totalReversedIncludingTax) || 0),
      0
    );

    return {
      date: dayLabel,
      reversalTotal,
      reversalCount: revsOnDay.length,
    };
  });
}

/**
 * 8. Profit & Cost Report Data Selector
 * Calculates:
 * - Net Sales (excluding tax, after discounts & reversals)
 * - COGS (historical cost snapshots, never recalculated from today's Item Master)
 * - Gross Profit & Margin
 * - Item-wise breakdown with Qty/Weight sold, Valid invoices, Net Sales, COGS, Profit, Margin
 * - Handles missing costs safely without assuming zero cost
 */
export function getProfitAndCostReportData(orders = [], reversals = [], filters = {}, itemsMaster = [], addonsMaster = []) {
  const filteredOrders = filterReportOrders(orders, filters);
  const validOrders = getValidNonReversedOrders(filteredOrders, reversals);

  const itemFilter = (filters.item || '').trim().toLowerCase();
  const categoryFilter = (filters.category || '').trim().toLowerCase();
  const viewType = (filters.viewType || 'all').trim().toLowerCase(); // 'all' | 'items' | 'addons'

  const masterItems = Array.isArray(itemsMaster) && itemsMaster.length > 0
    ? itemsMaster
    : Array.isArray(filters.itemsMaster)
    ? filters.itemsMaster
    : [];

  const masterAddons = Array.isArray(addonsMaster) && addonsMaster.length > 0
    ? addonsMaster
    : Array.isArray(filters.addonsMaster)
    ? filters.addonsMaster
    : [];

  const itemMap = new Map();
  let missingCostLinesCount = 0;
  let validOrderCount = validOrders.length;
  let totalItemsSold = 0;

  validOrders.forEach((order) => {
    const lines = Array.isArray(order.lines) ? order.lines : [];

    lines.forEach((line) => {
      const lineItemId = String(line.itemId || line.id || 'unknown');
      const lineItemName = String(line.itemNameSnapshot || line.name || 'Item');
      const lineCategory = String(line.categoryNameSnapshot || line.categoryName || 'General');

      const qty = Math.max(1, Number(line.quantity || line.quantitySnapshot || 1));
      totalItemsSold += qty;

      const grossLineSale = Number(line.grossLineSale ?? line.lineSubtotal ?? (Number(line.unitPrice || 0) * qty));

      let allocatedDiscount = 0;
      if (line.allocatedDiscount !== undefined && line.allocatedDiscount !== null) {
        allocatedDiscount = Number(line.allocatedDiscount);
      } else if (order.discountAmount > 0 && order.subtotal > 0) {
        allocatedDiscount = Math.round((grossLineSale / order.subtotal) * order.discountAmount);
      }

      const netRevenue = line.netRevenue !== undefined && line.netRevenue !== null
        ? Number(line.netRevenue)
        : Math.max(0, grossLineSale - allocatedDiscount);

      // Extract raw addons attached to this line
      const rawAddons = Array.isArray(line.addonSnapshots) && line.addonSnapshots.length > 0
        ? line.addonSnapshots
        : Array.isArray(line.addons) && line.addons.length > 0
        ? line.addons
        : Array.isArray(line.selectedAddons) && line.selectedAddons.length > 0
        ? line.selectedAddons
        : [];

      // Check item cost presence
      let lineItemCostPrice = null;
      if (line.costPriceSnapshot !== undefined && line.costPriceSnapshot !== null) {
        lineItemCostPrice = Number(line.costPriceSnapshot);
      } else if (line.costPrice !== undefined && line.costPrice !== null) {
        lineItemCostPrice = Number(line.costPrice);
      } else if (masterItems.length > 0) {
        const catItem = masterItems.find(
          (mi) => mi && (mi.id === line.itemId || String(mi.id).toLowerCase() === String(line.itemId).toLowerCase())
        );
        if (catItem?.costPrice !== undefined && catItem?.costPrice !== null) {
          lineItemCostPrice = Number(catItem.costPrice);
        }
      }

      const isWeight = Boolean(
        line.pricingMode === 'portion' ||
        line.pricingMode === 'custom_weight' ||
        (line.selectedWeightGrams && Number(line.selectedWeightGrams) > 0)
      );

      // Process attached add-ons
      let lineAddonsGrossSale = 0;
      let lineAddonsTotalCOGS = 0;
      const processedAddons = rawAddons.map((a, aIdx) => {
        const aName = String(a.name || 'Add-on').trim();
        const aId = String(a.id || `addon_${aName.toLowerCase()}`);
        const aQty = a.quantity !== undefined ? Math.max(1, Number(a.quantity)) : 1;
        const aPrice = Number(a.price ?? a.sellingPrice) || 0;
        const aGross = aPrice * aQty * qty;
        lineAddonsGrossSale += aGross;

        // Lookup add-on cost
        let aCost = null;
        if (a.costPrice !== undefined && a.costPrice !== null && a.costPrice !== '') {
          aCost = Number(a.costPrice);
        } else if (masterAddons.length > 0) {
          const found = masterAddons.find(
            (ma) =>
              ma &&
              (ma.id === a.id ||
                String(ma.id).toLowerCase() === String(a.id).toLowerCase() ||
                (ma.name && ma.name.trim().toLowerCase() === aName.toLowerCase()))
          );
          if (found?.costPrice !== undefined && found?.costPrice !== null && found?.costPrice !== '') {
            aCost = Number(found.costPrice);
          }
        }

        const aHasCost = aCost !== null && !isNaN(aCost) && aCost >= 0;
        const aTotalCOGS = aHasCost ? Math.round(aCost * aQty * qty) : null;
        if (aHasCost) {
          lineAddonsTotalCOGS += aTotalCOGS;
        }

        return {
          id: aId,
          name: aName,
          price: aPrice,
          singleQty: aQty,
          qty: aQty * qty,
          gross: aGross,
          cost: aCost,
          hasCost: aHasCost,
          totalCOGS: aTotalCOGS,
        };
      });

      let itemCOGSVal = null;
      if (processedAddons.length === 0) {
        if (line.totalCOGS !== undefined && line.totalCOGS !== null) {
          itemCOGSVal = Number(line.totalCOGS);
        } else if (line.itemCOGS !== undefined && line.itemCOGS !== null) {
          itemCOGSVal = Number(line.itemCOGS) + (Number(line.addonCOGS) || 0);
        } else if (lineItemCostPrice !== null && !isNaN(lineItemCostPrice) && lineItemCostPrice >= 0) {
          itemCOGSVal = isWeight
            ? Math.round(((Number(line.selectedWeightGrams) || 0) / 1000) * lineItemCostPrice * qty)
            : Math.round(lineItemCostPrice * qty);
        }
      } else {
        if (line.itemCOGS !== undefined && line.itemCOGS !== null) {
          itemCOGSVal = Number(line.itemCOGS);
        } else if (lineItemCostPrice !== null && !isNaN(lineItemCostPrice) && lineItemCostPrice >= 0) {
          itemCOGSVal = isWeight
            ? Math.round(((Number(line.selectedWeightGrams) || 0) / 1000) * lineItemCostPrice * qty)
            : Math.round(lineItemCostPrice * qty);
        } else if (line.totalCOGS !== undefined && line.totalCOGS !== null) {
          itemCOGSVal = Math.max(0, Number(line.totalCOGS) - lineAddonsTotalCOGS);
        }
      }

      // Calculate net revenue and COGS for Item and each Add-on
      let itemNetRevenue = netRevenue;
      if (processedAddons.length > 0 && grossLineSale > 0) {
        let sumAddonsNet = 0;
        processedAddons.forEach((pa) => {
          const aDiscount = Math.round((pa.gross / grossLineSale) * allocatedDiscount);
          pa.netRevenue = Math.max(0, pa.gross - aDiscount);
          sumAddonsNet += pa.netRevenue;
        });
        itemNetRevenue = Math.max(0, netRevenue - sumAddonsNet);
      }

      // If line had totalCOGS stored without breakdown, fallback appropriately
      if (itemCOGSVal === null && line.totalCOGS !== undefined && line.totalCOGS !== null) {
        if (processedAddons.length > 0) {
          itemCOGSVal = Math.max(0, Number(line.totalCOGS) - lineAddonsTotalCOGS);
        } else {
          itemCOGSVal = Number(line.totalCOGS);
        }
      }

      const itemHasCost = itemCOGSVal !== null;
      if (!itemHasCost && viewType !== 'addons') {
        missingCostLinesCount += 1;
      }

      // Check if Item matches filters
      const matchesCategoryItem =
        !categoryFilter ||
        categoryFilter === 'all' ||
        lineCategory.toLowerCase() === categoryFilter ||
        lineCategory.toLowerCase().includes(categoryFilter);

      const matchesNameItem =
        !itemFilter ||
        itemFilter === 'all' ||
        lineItemName.toLowerCase().includes(itemFilter) ||
        lineItemId.toLowerCase() === itemFilter;

      const shouldIncludeItem =
        viewType !== 'addons' &&
        categoryFilter !== 'add-ons' &&
        categoryFilter !== 'addon' &&
        matchesCategoryItem &&
        matchesNameItem;

      if (shouldIncludeItem) {
        const itemKey = `${lineItemId}_${lineItemName.toLowerCase()}`;
        if (!itemMap.has(itemKey)) {
          itemMap.set(itemKey, {
            id: lineItemId,
            name: lineItemName,
            category: lineCategory,
            isAddon: false,
            invoicesSet: new Set(),
            qtySold: 0,
            weightGramsSold: 0,
            isWeight,
            netSales: 0,
            cogs: 0,
            hasCost: true,
            missingCostCount: 0,
          });
        }
        const entry = itemMap.get(itemKey);
        entry.invoicesSet.add(order.invoiceNumber);
        entry.qtySold += qty;
        if (line.selectedWeightGrams) {
          entry.weightGramsSold += Number(line.selectedWeightGrams) * qty;
        }
        entry.netSales += itemNetRevenue;

        if (itemHasCost) {
          entry.cogs += itemCOGSVal;
        } else {
          entry.hasCost = false;
          entry.missingCostCount += 1;
        }
      }

      // Add processed Addons to itemMap
      if (viewType !== 'items') {
        processedAddons.forEach((pa) => {
          if (!pa.hasCost) {
            missingCostLinesCount += 1;
          }

          const matchesCategoryAddon =
            !categoryFilter ||
            categoryFilter === 'all' ||
            categoryFilter === 'add-ons' ||
            categoryFilter === 'addon' ||
            categoryFilter === 'add-on';

          const matchesNameAddon =
            !itemFilter ||
            itemFilter === 'all' ||
            pa.name.toLowerCase().includes(itemFilter) ||
            pa.id.toLowerCase() === itemFilter;

          if (matchesCategoryAddon && matchesNameAddon) {
            const addonKey = `addon_${pa.id}_${pa.name.toLowerCase()}`;
            if (!itemMap.has(addonKey)) {
              itemMap.set(addonKey, {
                id: pa.id,
                name: pa.name,
                category: 'Add-ons',
                isAddon: true,
                invoicesSet: new Set(),
                qtySold: 0,
                weightGramsSold: 0,
                isWeight: false,
                netSales: 0,
                cogs: 0,
                hasCost: true,
                missingCostCount: 0,
              });
            }
            const aEntry = itemMap.get(addonKey);
            aEntry.invoicesSet.add(order.invoiceNumber);
            aEntry.qtySold += (pa.qty ?? qty);
            aEntry.netSales += (pa.netRevenue ?? pa.gross);

            if (pa.hasCost && pa.totalCOGS !== null) {
              aEntry.cogs += pa.totalCOGS;
            } else {
              aEntry.hasCost = false;
              aEntry.missingCostCount += 1;
            }
          }
        });
      }
    });
  });

  const itemRows = Array.from(itemMap.values()).map((entry) => {
    let qtyWeightDisplay = `${entry.qtySold} pcs`;
    if (entry.isWeight && entry.weightGramsSold > 0) {
      const kgVal = (entry.weightGramsSold / 1000).toFixed(2).replace(/\.00$/, '');
      qtyWeightDisplay = `${kgVal} kg`;
    }

    const netSales = Math.round(entry.netSales);
    const cogs = entry.hasCost ? Math.round(entry.cogs) : null;
    const grossProfit = entry.hasCost && cogs !== null ? (netSales - cogs) : null;

    const margin = entry.hasCost && grossProfit !== null && netSales > 0
      ? Number(((grossProfit / netSales) * 100).toFixed(2))
      : null;

    return {
      id: entry.id,
      name: entry.name,
      category: entry.category,
      isAddon: Boolean(entry.isAddon),
      validInvoices: entry.invoicesSet.size,
      qtySold: entry.qtySold,
      weightGramsSold: entry.weightGramsSold,
      qtyWeightDisplay,
      netSales,
      cogs,
      grossProfit,
      margin,
      hasCost: entry.hasCost,
      missingCostCount: entry.missingCostCount,
    };
  });

  // Sort item rows descending by Net Sales
  itemRows.sort((a, b) => b.netSales - a.netSales);

  // Exact mathematical totals derived from rows:
  // Sum(item Net Sales) = report Net Sales
  // Sum(item COGS) = report COGS
  // Sum(item Gross Profit) = report Gross Profit
  const totalNetSales = itemRows.reduce((sum, r) => sum + r.netSales, 0);
  const totalCOGS = itemRows.reduce((sum, r) => sum + (r.cogs || 0), 0);
  const totalGrossProfit = itemRows.reduce((sum, r) => sum + (r.grossProfit || 0), 0);

  const overallMargin = totalNetSales > 0
    ? Number(((totalGrossProfit / totalNetSales) * 100).toFixed(2))
    : 0;

  return {
    kpis: {
      netSales: totalNetSales,
      cogs: totalCOGS,
      grossProfit: totalGrossProfit,
      grossProfitMargin: overallMargin,
      missingCostCount: missingCostLinesCount,
      hasMissingCosts: missingCostLinesCount > 0,
      validOrdersCount: validOrderCount,
      totalItemsCount: totalItemsSold,
    },
    itemRows,
  };
}
