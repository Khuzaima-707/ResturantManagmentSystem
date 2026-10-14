import mongoose from 'mongoose';
import { Expense } from '../models/Expense.js';
import { Order } from '../models/Order.js';
import { Reversal } from '../models/Reversal.js';
import { isDbConnected } from '../config/db.js';

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
    return { $gte: getStartOfWeek(now), $lte: getEndOfWeek(now) };
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
 * POST /api/expenses
 * Create a new expense entry
 */
export async function createExpense(req, res, next) {
  try {
    const payload = { ...req.body };

    if (!payload.id) {
      const randomSuffix = Math.random().toString(36).substring(2, 6);
      payload.id = `exp-${Date.now()}-${randomSuffix}`;
    }

    if (payload.expenseDate) {
      payload.expenseDate = new Date(payload.expenseDate);
    } else {
      payload.expenseDate = new Date();
    }

    const expense = await Expense.create(payload);

    return res.status(201).json({
      success: true,
      message: 'Expense recorded successfully',
      data: expense,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/expenses
 * List all expenses with filtering, search, pagination, and category aggregates
 */
export async function getAllExpenses(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(200).json({
        success: true,
        count: 0,
        total: 0,
        page: 1,
        totalPages: 1,
        data: [],
        metrics: {
          totalExpenses: 0,
          cashExpenses: 0,
          bankExpenses: 0,
          netOperatingProfit: 0,
        },
        offline: true,
      });
    }

    const {
      category,
      paymentMethod,
      datePreset,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 50,
      sort = '-expenseDate',
    } = req.query;

    const filter = {};

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (paymentMethod && paymentMethod !== 'All') {
      filter.paymentMethod = paymentMethod;
    }

    const dateRange = resolveDateRange(datePreset, startDate, endDate);
    if (dateRange) {
      filter.expenseDate = dateRange;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { title: searchRegex },
        { paidTo: searchRegex },
        { receiptNumber: searchRegex },
        { note: searchRegex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [expenses, totalMatching] = await Promise.all([
      Expense.find(filter).sort({ expenseDate: -1 }).skip(skip).limit(limitNum),
      Expense.countDocuments(filter),
    ]);

    // Calculate aggregated metrics for the filtered view
    const allMatching = await Expense.find(filter);
    const totalAmount = allMatching.reduce((s, e) => s + (e.amount || 0), 0);
    const cashExpenses = allMatching
      .filter((e) => e.paymentMethod === 'Cash')
      .reduce((s, e) => s + (e.amount || 0), 0);
    const bankExpenses = allMatching
      .filter((e) => e.paymentMethod !== 'Cash')
      .reduce((s, e) => s + (e.amount || 0), 0);

    // Group by category
    const categoryBreakdown = {};
    allMatching.forEach((e) => {
      const cat = e.category || 'Other';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + (e.amount || 0);
    });

    return res.status(200).json({
      success: true,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalMatching,
        pages: Math.ceil(totalMatching / limitNum) || 1,
      },
      summary: {
        totalExpenseCount: allMatching.length,
        totalAmount,
        cashExpenses,
        bankExpenses,
        categoryBreakdown,
      },
      data: expenses,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/expenses/:id
 * Retrieve a single expense by custom id or _id
 */
export async function getExpenseById(req, res, next) {
  try {
    const { id } = req.params;

    let expense = await Expense.findOne({ id });
    if (!expense && mongoose.Types.ObjectId.isValid(id)) {
      expense = await Expense.findById(id);
    }

    if (!expense) {
      return res.status(404).json({
        success: false,
        error: { message: `Expense '${id}' not found` },
      });
    }

    return res.status(200).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/expenses/:id
 * Update an existing expense
 */
export async function updateExpense(req, res, next) {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    let expense = await Expense.findOneAndUpdate(
      { id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!expense && mongoose.Types.ObjectId.isValid(id)) {
      expense = await Expense.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      );
    }

    if (!expense) {
      return res.status(404).json({
        success: false,
        error: { message: `Expense '${id}' not found` },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Expense updated successfully',
      data: expense,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/expenses/:id
 * Delete an expense
 */
export async function deleteExpense(req, res, next) {
  try {
    const { id } = req.params;

    let expense = await Expense.findOneAndDelete({ id });
    if (!expense && mongoose.Types.ObjectId.isValid(id)) {
      expense = await Expense.findByIdAndDelete(id);
    }

    if (!expense) {
      return res.status(404).json({
        success: false,
        error: { message: `Expense '${id}' not found` },
      });
    }

    return res.status(200).json({
      success: true,
      message: `Expense '${expense.title}' deleted successfully`,
      data: { id: expense.id, title: expense.title },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/expenses/profit-and-loss
 * Complete Restaurant Accounting & P&L Statement (Revenue - Expenses = Net Profit)
 */
export async function getProfitAndLossSummary(req, res, next) {
  try {
    const { datePreset = 'This Month', startDate, endDate } = req.query;

    const dateRange = resolveDateRange(datePreset, startDate, endDate);
    const orderFilter = {};
    const reversalFilter = {};
    const expenseFilter = {};

    if (dateRange) {
      orderFilter.completedAt = dateRange;
      reversalFilter.reversedAt = dateRange;
      expenseFilter.expenseDate = dateRange;
    }

    const [orders, reversals, expenses] = await Promise.all([
      Order.find(orderFilter),
      Reversal.find(reversalFilter),
      Expense.find(expenseFilter),
    ]);

    const validOrders = orders.filter((o) => o.status !== 'reversed');
    const grossBilledSales = orders.reduce((s, o) => s + (o.grandTotal || 0), 0);
    const totalReversals = reversals.reduce(
      (s, r) => s + (r.totalReversedIncludingTax || 0),
      0
    );
    const discountsGiven = validOrders.reduce((s, o) => s + (o.discountAmount || 0), 0);
    const taxCollected = validOrders.reduce((s, o) => s + (o.taxAmount || 0), 0);

    // Accounting Net Revenue (Excluding Tax, After Discounts & Reversals)
    const netRevenue = validOrders.reduce(
      (s, o) => s + (o.grandTotal - (o.taxAmount || 0)),
      0
    );

    // Total Operating Expenses
    const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);

    // Net Operating Profit (P&L)
    const netOperatingProfit = netRevenue - totalExpenses;
    const profitMarginPercent =
      netRevenue > 0 ? Number(((netOperatingProfit / netRevenue) * 100).toFixed(1)) : 0;

    return res.status(200).json({
      success: true,
      period: {
        datePreset,
        startDate: startDate || null,
        endDate: endDate || null,
      },
      pnl: {
        grossBilledSales,
        totalReversals,
        discountsGiven,
        taxCollected,
        netRevenue,
        totalExpenses,
        netOperatingProfit,
        profitMarginPercent,
        isProfitable: netOperatingProfit >= 0,
      },
      expenseCount: expenses.length,
      ordersCount: validOrders.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/expenses/seed
 * Seed realistic starter restaurant expenses
 */
export async function seedExpenses(req, res, next) {
  try {
    const { force = false } = req.query;

    if (force === 'true' || force === true) {
      await Expense.deleteMany({});
    }

    const count = await Expense.countDocuments();
    if (count > 0 && !force) {
      return res.status(200).json({
        success: true,
        message: `Expenses already seeded. Total: ${count}`,
        count,
      });
    }

    const sampleExpenses = [
      {
        id: 'exp-seed-01',
        title: 'Fresh Chicken & Meat Supply (30 Kg)',
        category: 'Raw Materials / Meat & Groceries',
        amount: 16500,
        paymentMethod: 'Cash',
        paidTo: 'Punjab Poultry Traders',
        receiptNumber: 'RCP-8812',
        note: 'Fresh broiler chicken for Biryani and Karahi',
        recordedBy: 'Kitchen Manager',
        expenseDate: new Date(Date.now() - 3600000 * 24), // Yesterday
      },
      {
        id: 'exp-seed-02',
        title: 'Commercial LPG Cylinder Refill (45kg)',
        category: 'Utilities (Gas, Electricity, Water)',
        amount: 8500,
        paymentMethod: 'Cash',
        paidTo: 'Al-Madina Gas Agency',
        receiptNumber: 'RCP-4419',
        note: 'Kitchen main burner commercial cylinder',
        recordedBy: 'Admin',
        expenseDate: new Date(Date.now() - 3600000 * 12),
      },
      {
        id: 'exp-seed-03',
        title: 'Food Packaging Boxes & Plastic Bags',
        category: 'Kitchen Supplies & Packaging',
        amount: 4200,
        paymentMethod: 'Cash',
        paidTo: 'Prime Packaging Co.',
        receiptNumber: 'RCP-9901',
        note: 'Burger packaging boxes, foil wrap, carry bags',
        recordedBy: 'Admin',
        expenseDate: new Date(Date.now() - 3600000 * 6),
      },
      {
        id: 'exp-seed-04',
        title: 'Cooking Oil, Basmati Rice & Masala Spices',
        category: 'Raw Materials / Meat & Groceries',
        amount: 12000,
        paymentMethod: 'Bank Transfer',
        paidTo: 'Metro Wholesale Cash & Carry',
        receiptNumber: 'INV-MT-1029',
        note: '2 tins cooking oil, 50kg rice, whole spices',
        recordedBy: 'Admin',
        expenseDate: new Date(Date.now() - 3600000 * 4),
      },
    ];

    await Expense.insertMany(sampleExpenses);

    return res.status(200).json({
      success: true,
      message: 'Sample expenses seeded successfully in MongoDB Atlas',
      count: sampleExpenses.length,
      data: sampleExpenses,
    });
  } catch (error) {
    next(error);
  }
}
