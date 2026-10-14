import mongoose from 'mongoose';
import { Shift } from '../models/Shift.js';
import { Order } from '../models/Order.js';
import { Expense } from '../models/Expense.js';
import { isDbConnected } from '../config/db.js';

/**
 * GET /api/shifts/current
 * Retrieve current active cashier shift with live sales and cash drawer progress
 */
export async function getCurrentShift(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(200).json({
        success: true,
        hasActiveShift: false,
        data: null,
        offline: true,
      });
    }

    const shift = await Shift.findOne({ status: 'open' });

    if (!shift) {
      return res.status(200).json({
        success: true,
        hasActiveShift: false,
        data: null,
      });
    }

    // Compute live sales and expenses since shift was opened
    const [orders, expenses] = await Promise.all([
      Order.find({
        status: { $ne: 'reversed' },
        completedAt: { $gte: shift.openedAt },
      }),
      Expense.find({
        expenseDate: { $gte: shift.openedAt },
      }),
    ]);

    const cashSales = orders
      .filter((o) => o.paymentMethod === 'Cash')
      .reduce((sum, o) => sum + (o.grandTotal || 0), 0);

    const cardSales = orders
      .filter((o) => o.paymentMethod === 'Card')
      .reduce((sum, o) => sum + (o.grandTotal || 0), 0);

    const onlineSales = orders
      .filter((o) => o.paymentMethod === 'Online')
      .reduce((sum, o) => sum + (o.grandTotal || 0), 0);

    const cashExpenses = expenses
      .filter((e) => e.paymentMethod === 'Cash')
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const expectedCash = shift.openingFloat + cashSales - cashExpenses;

    const liveShiftData = {
      ...shift.toObject(),
      cashSales,
      cardSales,
      onlineSales,
      cashExpenses,
      expectedCash,
      totalOrdersCount: orders.length,
    };

    return res.status(200).json({
      success: true,
      hasActiveShift: true,
      data: liveShiftData,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/shifts/open
 * Open a new cashier shift with an opening float
 */
export async function openShift(req, res, next) {
  try {
    const { cashierName = 'Cashier 1', openingFloat = 0, notes = '' } = req.body;

    const activeShift = await Shift.findOne({ status: 'open' });
    if (activeShift) {
      return res.status(409).json({
        success: false,
        error: {
          message: `Shift #${activeShift.shiftNumber} is already open by ${activeShift.cashierName}. Please close current shift before opening a new one.`,
          shiftId: activeShift.id,
        },
      });
    }

    const lastShift = await Shift.findOne().sort({ shiftNumber: -1 });
    const shiftNumber = lastShift && lastShift.shiftNumber ? lastShift.shiftNumber + 1 : 1;
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const id = `shift-${Date.now()}-${randomSuffix}`;

    const newShift = await Shift.create({
      id,
      shiftNumber,
      cashierName: cashierName.trim(),
      openingFloat: Number(openingFloat) || 0,
      expectedCash: Number(openingFloat) || 0,
      notes: notes.trim(),
      status: 'open',
      openedAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: `Shift #${newShift.shiftNumber} opened successfully with float of Rs ${newShift.openingFloat}`,
      data: newShift,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/shifts/close
 * Close active shift, reconcile drawer cash, and generate Z-Report
 */
export async function closeShift(req, res, next) {
  try {
    const { actualCashCounted = 0, notes = '' } = req.body;

    const shift = await Shift.findOne({ status: 'open' });
    if (!shift) {
      return res.status(404).json({
        success: false,
        error: { message: 'No active open shift found to close' },
      });
    }

    const now = new Date();

    // Reconcile all transactions in this shift
    const [orders, expenses] = await Promise.all([
      Order.find({
        status: { $ne: 'reversed' },
        completedAt: { $gte: shift.openedAt, $lte: now },
      }),
      Expense.find({
        expenseDate: { $gte: shift.openedAt, $lte: now },
      }),
    ]);

    const cashSales = orders
      .filter((o) => o.paymentMethod === 'Cash')
      .reduce((sum, o) => sum + (o.grandTotal || 0), 0);

    const cardSales = orders
      .filter((o) => o.paymentMethod === 'Card')
      .reduce((sum, o) => sum + (o.grandTotal || 0), 0);

    const onlineSales = orders
      .filter((o) => o.paymentMethod === 'Online')
      .reduce((sum, o) => sum + (o.grandTotal || 0), 0);

    const cashExpenses = expenses
      .filter((e) => e.paymentMethod === 'Cash')
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const expectedCash = shift.openingFloat + cashSales - cashExpenses;
    const discrepancy = Number(actualCashCounted) - expectedCash;

    shift.cashSales = cashSales;
    shift.cardSales = cardSales;
    shift.onlineSales = onlineSales;
    shift.cashExpenses = cashExpenses;
    shift.expectedCash = expectedCash;
    shift.actualCashCounted = Number(actualCashCounted);
    shift.discrepancy = discrepancy;
    shift.totalOrdersCount = orders.length;
    shift.status = 'closed';
    shift.closedAt = now;
    if (notes) shift.notes = `${shift.notes ? `${shift.notes} | ` : ''}${notes.trim()}`;

    await shift.save();

    return res.status(200).json({
      success: true,
      message: `Shift #${shift.shiftNumber} closed successfully. Discrepancy: Rs ${discrepancy >= 0 ? `+${discrepancy}` : discrepancy}`,
      data: shift,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/shifts
 * List all historical shifts / Z-Reports
 */
export async function getAllShifts(req, res, next) {
  try {
    const shifts = await Shift.find({}).sort({ openedAt: -1 }).limit(100);

    return res.status(200).json({
      success: true,
      count: shifts.length,
      data: shifts,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/shifts/:id
 * Retrieve a single shift Z-Report
 */
export async function getShiftById(req, res, next) {
  try {
    const { id } = req.params;

    let shift = await Shift.findOne({ id });
    if (!shift && mongoose.Types.ObjectId.isValid(id)) {
      shift = await Shift.findById(id);
    }

    if (!shift) {
      return res.status(404).json({
        success: false,
        error: { message: `Shift '${id}' not found` },
      });
    }

    return res.status(200).json({
      success: true,
      data: shift,
    });
  } catch (error) {
    next(error);
  }
}
