import { Order } from '../models/Order.js';
import { Reversal } from '../models/Reversal.js';
import { Category } from '../models/Category.js';

function getStartOfDay(d = new Date()) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getEndOfDay(d = new Date()) {
  const date = new Date(d);
  date.setHours(23, 59, 59, 999);
  return date;
}

function getStartOfWeek(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getEndOfWeek(d = new Date()) {
  const start = getStartOfWeek(d);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function getStartOfMonth(d = new Date()) {
  const date = new Date(d);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getEndOfMonth(d = new Date()) {
  const date = new Date(d);
  date.setMonth(date.getMonth() + 1, 0);
  date.setHours(23, 59, 59, 999);
  return date;
}

function resolveDateRange(datePreset, startDate, endDate) {
  const now = new Date();
  if (datePreset === 'Today') {
    return { $gte: getStartOfDay(now), $lte: getEndOfDay(now) };
  }
  if (datePreset === 'This Week') {
    return {
      $gte: getStartOfWeek(now),
      $lte: getEndOfWeek(now),
    };
  }
  if (datePreset === 'This Month') {
    return { $gte: getStartOfMonth(now), $lte: getEndOfMonth(now) };
  }
  if (datePreset === 'Custom' && startDate && endDate) {
    try {
      const s = new Date(startDate);
      const e = new Date(endDate);
      return { $gte: getStartOfDay(s), $lte: getEndOfDay(e) };
    } catch {
      // Fallback
    }
  }
  return null;
}

/**
 * GET /api/reports/dashboard or /api/dashboard
 * Aggregates all 8 PRD KPI metrics, chart breakdowns, and top items from real Atlas data
 */
export async function getDashboardMetrics(req, res, next) {
  try {
    const { datePreset = 'This Week', startDate, endDate } = req.query;

    const orderFilter = {};
    const reversalFilter = {};

    const dateRange = resolveDateRange(datePreset, startDate, endDate);
    if (dateRange) {
      orderFilter.completedAt = dateRange;
      reversalFilter.reversedAt = dateRange;
    }

    const [orders, reversals, categories] = await Promise.all([
      Order.find(orderFilter).sort({ completedAt: -1 }),
      Reversal.find(reversalFilter).sort({ reversedAt: -1 }),
      Category.find({}),
    ]);

    // Category name map
    const categoryMap = new Map();
    categories.forEach((c) => {
      categoryMap.set(c.id, c.name);
    });

    const validOrders = orders.filter((o) => o.status !== 'reversed');
    const reversedOrders = orders.filter((o) => o.status === 'reversed');

    // 8 PRD KPI Cards
    const grossSales = orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
    const completedOrdersCount = orders.length;
    const validOrdersCount = validOrders.length;
    const netRevenue = validOrders.reduce(
      (sum, o) => sum + (o.grandTotal - (o.taxAmount || 0)),
      0
    );
    const reversalsTotal = reversals.reduce(
      (sum, r) => sum + (r.totalReversedIncludingTax || 0),
      0
    );
    const validSalesTotal = validOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
    const averageOrderValue =
      validOrdersCount > 0 ? Math.round(validSalesTotal / validOrdersCount) : 0;
    const taxCollected = validOrders.reduce((sum, o) => sum + (o.taxAmount || 0), 0);
    const discountsGiven = validOrders.reduce((sum, o) => sum + (o.discountAmount || 0), 0);
    const itemsSold = validOrders.reduce(
      (sum, o) => sum + o.lines.reduce((ls, l) => ls + (l.quantity || 1), 0),
      0
    );

    // 1. Payment Method Breakdown
    const paymentMap = { Cash: { count: 0, amount: 0 }, Card: { count: 0, amount: 0 }, Online: { count: 0, amount: 0 } };
    validOrders.forEach((o) => {
      const pm = o.paymentMethod || 'Cash';
      if (!paymentMap[pm]) paymentMap[pm] = { count: 0, amount: 0 };
      paymentMap[pm].count += 1;
      paymentMap[pm].amount += o.grandTotal || 0;
    });

    // 2. Sales by Category
    const categorySalesMap = {};
    validOrders.forEach((o) => {
      (o.lines || []).forEach((l) => {
        const catId = l.categoryIdSnapshot || 'uncategorized';
        const catName = categoryMap.get(catId) || catId;
        if (!categorySalesMap[catName]) {
          categorySalesMap[catName] = { name: catName, sales: 0, quantity: 0 };
        }
        categorySalesMap[catName].sales += l.lineSubtotal || 0;
        categorySalesMap[catName].quantity += l.quantity || 1;
      });
    });
    const salesByCategory = Object.values(categorySalesMap);

    // 3. Top Selling Items
    const itemSalesMap = {};
    validOrders.forEach((o) => {
      (o.lines || []).forEach((l) => {
        const key = l.itemId || l.itemNameSnapshot;
        if (!itemSalesMap[key]) {
          itemSalesMap[key] = {
            id: l.itemId,
            name: l.itemNameSnapshot,
            quantity: 0,
            revenue: 0,
          };
        }
        itemSalesMap[key].quantity += l.quantity || 1;
        itemSalesMap[key].revenue += l.lineSubtotal || 0;
      });
    });
    const topSellingItems = Object.values(itemSalesMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // 4. Daily Sales Trend (Grouped by date string)
    const dailySalesMap = {};
    validOrders.forEach((o) => {
      const dateKey = o.completedAt ? o.completedAt.toISOString().split('T')[0] : 'unknown';
      if (!dailySalesMap[dateKey]) {
        dailySalesMap[dateKey] = { date: dateKey, sales: 0, orders: 0 };
      }
      dailySalesMap[dateKey].sales += o.grandTotal || 0;
      dailySalesMap[dateKey].orders += 1;
    });
    const dailySales = Object.values(dailySalesMap).sort((a, b) => a.date.localeCompare(b.date));

    // 5. Recent Activity
    const recentActivity = orders.slice(0, 10).map((o) => ({
      id: o.id,
      invoiceNumber: o.invoiceNumber,
      orderType: o.orderType,
      status: o.status,
      customerName: o.customerName || 'Walk-in',
      grandTotal: o.grandTotal,
      paymentMethod: o.paymentMethod,
      timestamp: o.completedAt,
    }));

    return res.status(200).json({
      success: true,
      filter: {
        datePreset,
        startDate: startDate || null,
        endDate: endDate || null,
      },
      kpis: {
        grossSales,
        completedOrders: completedOrdersCount,
        validOrdersCount,
        reversedOrdersCount: reversedOrders.length,
        netRevenue,
        reversalsTotal,
        averageOrderValue,
        taxCollected,
        discountsGiven,
        itemsSold,
      },
      charts: {
        dailySales,
        salesByCategory,
        paymentBreakdown: paymentMap,
        topSellingItems,
      },
      recentActivity,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/reports/sales
 * Dedicated Sales Report data
 */
export async function getSalesReport(req, res, next) {
  try {
    const { datePreset = 'This Week', startDate, endDate, categoryId } = req.query;
    const dateRange = resolveDateRange(datePreset, startDate, endDate);
    const filter = { status: 'completed' };
    if (dateRange) filter.completedAt = dateRange;
    if (categoryId) filter['lines.categoryIdSnapshot'] = categoryId;

    const orders = await Order.find(filter).sort({ completedAt: -1 });
    const totalSales = orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
    const totalOrders = orders.length;
    const aov = totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0;
    const itemsSold = orders.reduce(
      (sum, o) => sum + o.lines.reduce((ls, l) => ls + (l.quantity || 1), 0),
      0
    );

    return res.status(200).json({
      success: true,
      summary: {
        totalSales,
        totalOrders,
        averageOrderValue: aov,
        itemsSold,
      },
      data: orders,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/reports/revenue
 * Dedicated Revenue Reconciliation Report
 */
export async function getRevenueReport(req, res, next) {
  try {
    const { datePreset = 'This Week', startDate, endDate } = req.query;
    const dateRange = resolveDateRange(datePreset, startDate, endDate);

    const orderFilter = {};
    const reversalFilter = {};
    if (dateRange) {
      orderFilter.completedAt = dateRange;
      reversalFilter.reversedAt = dateRange;
    }

    const [orders, reversals] = await Promise.all([
      Order.find(orderFilter),
      Reversal.find(reversalFilter),
    ]);

    const validOrders = orders.filter((o) => o.status !== 'reversed');
    const grossBilledAmount = orders.reduce((s, o) => s + (o.grandTotal || 0), 0);
    const discountsTotal = validOrders.reduce((s, o) => s + (o.discountAmount || 0), 0);
    const taxTotal = validOrders.reduce((s, o) => s + (o.taxAmount || 0), 0);
    const reversalsTotal = reversals.reduce(
      (s, r) => s + (r.totalReversedIncludingTax || 0),
      0
    );
    const netRevenue = validOrders.reduce(
      (s, o) => s + (o.grandTotal - (o.taxAmount || 0)),
      0
    );

    return res.status(200).json({
      success: true,
      summary: {
        grossBilledAmount,
        discountsTotal,
        taxTotal,
        reversalsTotal,
        netRevenue,
      },
    });
  } catch (error) {
    next(error);
  }
}
