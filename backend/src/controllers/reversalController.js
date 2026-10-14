import mongoose from 'mongoose';
import { Reversal } from '../models/Reversal.js';
import { Order } from '../models/Order.js';
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
 * POST /api/reversals
 * Reverses a completed order safely without deleting historical invoice records.
 * Marks order as 'reversed' and generates auditable Reversal record.
 */
export async function createReversal(req, res, next) {
  try {
    const { orderId, invoiceNumber, reason, cashierName = 'Cashier 1' } = req.body;

    // 1. Locate original order
    let order = null;
    if (orderId) {
      order = await Order.findOne({ id: orderId });
      if (!order && mongoose.Types.ObjectId.isValid(orderId)) {
        order = await Order.findById(orderId);
      }
    }

    if (!order && invoiceNumber) {
      order = await Order.findOne({ invoiceNumber: invoiceNumber.trim().toUpperCase() });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        error: { message: `Order not found with provided identifier (${orderId || invoiceNumber})` },
      });
    }

    // 2. Prevent double reversals
    if (order.status === 'reversed') {
      return res.status(409).json({
        success: false,
        error: {
          message: `Invoice #${order.invoiceNumber} has already been reversed on ${order.reversedAt?.toISOString() || 'a previous date'}`,
          reversalId: order.reversalId,
        },
      });
    }

    // 3. Create Reversal Record
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const reversalId = `rev-${Date.now()}-${randomSuffix}`;
    const now = new Date();

    const reversalData = {
      id: reversalId,
      originalOrderId: order.id,
      originalInvoiceNumber: order.invoiceNumber,
      reason: reason.trim(),
      cashierName: cashierName.trim(),
      subtotalReversed: order.subtotal,
      discountReversed: order.discountAmount || 0,
      taxReversed: order.taxAmount || 0,
      totalReversedIncludingTax: order.grandTotal,
      paymentMethodSnapshot: order.paymentMethod || 'Cash',
      reversedAt: now,
    };

    const reversal = await Reversal.create(reversalData);

    // 4. Update Original Order (Immutable financial snapshot preserved)
    order.status = 'reversed';
    order.reversalId = reversalId;
    order.reversalReason = reason.trim();
    order.reversedAt = now;
    await order.save();

    return res.status(201).json({
      success: true,
      message: `Invoice #${order.invoiceNumber} successfully reversed. Total reversed: Rs ${reversal.totalReversedIncludingTax}`,
      data: {
        reversal,
        order,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/reversals
 * Retrieves all reversals with filtering, pagination, and total reconciliation stats
 */
export async function getAllReversals(req, res, next) {
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
          totalReversedIncludingTax: 0,
          subtotalReversedTotal: 0,
          taxReversedTotal: 0,
        },
        offline: true,
      });
    }

    const {
      datePreset,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 50,
      sort = '-reversedAt',
    } = req.query;

    const filter = {};

    const dateRange = resolveDateRange(datePreset, startDate, endDate);
    if (dateRange) {
      filter.reversedAt = dateRange;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { originalInvoiceNumber: searchRegex },
        { reason: searchRegex },
        { id: searchRegex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [reversals, totalCount] = await Promise.all([
      Reversal.find(filter).sort({ reversedAt: -1 }).skip(skip).limit(limitNum),
      Reversal.countDocuments(filter),
    ]);

    // Financial reconciliation aggregates
    const allMatching = await Reversal.find(filter);
    const totalReversedIncludingTax = allMatching.reduce(
      (sum, r) => sum + (r.totalReversedIncludingTax || 0),
      0
    );
    const subtotalReversedTotal = allMatching.reduce(
      (sum, r) => sum + (r.subtotalReversed || 0),
      0
    );
    const taxReversedTotal = allMatching.reduce((sum, r) => sum + (r.taxReversed || 0), 0);

    return res.status(200).json({
      success: true,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        pages: Math.ceil(totalCount / limitNum) || 1,
      },
      summary: {
        reversalCount: allMatching.length,
        subtotalReversedTotal,
        taxReversedTotal,
        totalReversedIncludingTax,
      },
      data: reversals,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/reversals/:id
 * Retrieve single reversal details with original order
 */
export async function getReversalById(req, res, next) {
  try {
    const { id } = req.params;

    let reversal = await Reversal.findOne({ id });

    if (!reversal && mongoose.Types.ObjectId.isValid(id)) {
      reversal = await Reversal.findById(id);
    }

    if (!reversal) {
      reversal = await Reversal.findOne({ originalInvoiceNumber: id.toUpperCase() });
    }

    if (!reversal) {
      return res.status(404).json({
        success: false,
        error: { message: `Reversal '${id}' not found` },
      });
    }

    const order = await Order.findOne({ id: reversal.originalOrderId });

    return res.status(200).json({
      success: true,
      data: {
        reversal,
        originalOrder: order,
      },
    });
  } catch (error) {
    next(error);
  }
}
