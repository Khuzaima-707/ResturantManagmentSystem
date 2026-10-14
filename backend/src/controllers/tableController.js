import mongoose from 'mongoose';
import { Table } from '../models/Table.js';
import { isDbConnected } from '../config/db.js';

/**
 * GET /api/tables
 * List all tables with zone/status filters and live occupancy stats
 */
export async function getAllTables(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(200).json({
        success: true,
        count: 0,
        stats: {
          total: 0,
          available: 0,
          occupied: 0,
          reserved: 0,
          cleaning: 0,
        },
        data: [],
        offline: true,
      });
    }

    const { zone, status } = req.query;
    const filter = {};

    if (zone && zone !== 'All') {
      filter.zone = zone;
    }

    if (status && status !== 'All') {
      filter.status = status;
    }

    const tables = await Table.find(filter).sort({ number: 1 });

    const allTables = await Table.find({});
    const totalCount = allTables.length;
    const availableCount = allTables.filter((t) => t.status === 'available').length;
    const occupiedCount = allTables.filter((t) => t.status === 'occupied').length;
    const reservedCount = allTables.filter((t) => t.status === 'reserved').length;
    const cleaningCount = allTables.filter((t) => t.status === 'cleaning').length;

    return res.status(200).json({
      success: true,
      count: tables.length,
      stats: {
        total: totalCount,
        available: availableCount,
        occupied: occupiedCount,
        reserved: reservedCount,
        cleaning: cleaningCount,
      },
      data: tables,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/tables/:id
 * Retrieve a single table
 */
export async function getTableById(req, res, next) {
  try {
    const { id } = req.params;

    let table = await Table.findOne({ id });
    if (!table && !isNaN(Number(id))) {
      table = await Table.findOne({ number: Number(id) });
    }
    if (!table && mongoose.Types.ObjectId.isValid(id)) {
      table = await Table.findById(id);
    }

    if (!table) {
      return res.status(404).json({
        success: false,
        error: { message: `Table '${id}' not found` },
      });
    }

    return res.status(200).json({
      success: true,
      data: table,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/tables
 * Create a new dining table
 */
export async function createTable(req, res, next) {
  try {
    const payload = { ...req.body };

    if (!payload.id) {
      payload.id = `tbl-${payload.number}`;
    }

    const existingNumber = await Table.findOne({ number: payload.number });
    if (existingNumber) {
      return res.status(409).json({
        success: false,
        error: { message: `Table #${payload.number} already exists` },
      });
    }

    const table = await Table.create(payload);

    return res.status(201).json({
      success: true,
      message: `Table #${table.number} (${table.name}) created successfully`,
      data: table,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/tables/:id
 * Update table details or status
 */
export async function updateTable(req, res, next) {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    let table = await Table.findOneAndUpdate(
      { id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!table && mongoose.Types.ObjectId.isValid(id)) {
      table = await Table.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      );
    }

    if (!table) {
      return res.status(404).json({
        success: false,
        error: { message: `Table '${id}' not found` },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Table updated successfully',
      data: table,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/tables/:id/occupy
 * Assign active order to table and mark occupied
 */
export async function occupyTable(req, res, next) {
  try {
    const { id } = req.params;
    const { orderId, invoiceNumber, waiterName } = req.body;

    const table = await Table.findOneAndUpdate(
      { id },
      {
        $set: {
          status: 'occupied',
          currentOrderId: orderId || null,
          currentInvoiceNumber: invoiceNumber || null,
          waiterName: waiterName || '',
          occupiedSince: new Date(),
        },
      },
      { new: true }
    );

    if (!table) {
      return res.status(404).json({
        success: false,
        error: { message: `Table '${id}' not found` },
      });
    }

    return res.status(200).json({
      success: true,
      message: `Table #${table.number} is now occupied with Invoice #${invoiceNumber || 'Active'}`,
      data: table,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/tables/:id/release
 * Release table back to available
 */
export async function releaseTable(req, res, next) {
  try {
    const { id } = req.params;

    const table = await Table.findOneAndUpdate(
      { id },
      {
        $set: {
          status: 'available',
          currentOrderId: null,
          currentInvoiceNumber: null,
          occupiedSince: null,
          waiterName: '',
        },
      },
      { new: true }
    );

    if (!table) {
      return res.status(404).json({
        success: false,
        error: { message: `Table '${id}' not found` },
      });
    }

    return res.status(200).json({
      success: true,
      message: `Table #${table.number} has been released and is now Available`,
      data: table,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/tables/:id
 * Delete a table
 */
export async function deleteTable(req, res, next) {
  try {
    const { id } = req.params;

    let table = await Table.findOneAndDelete({ id });
    if (!table && mongoose.Types.ObjectId.isValid(id)) {
      table = await Table.findByIdAndDelete(id);
    }

    if (!table) {
      return res.status(404).json({
        success: false,
        error: { message: `Table '${id}' not found` },
      });
    }

    return res.status(200).json({
      success: true,
      message: `Table #${table.number} deleted successfully`,
      data: { id: table.id, number: table.number },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/tables/seed
 * Seed realistic starter restaurant tables across zones
 */
export async function seedTables(req, res, next) {
  try {
    const { force = false } = req.query;

    if (force === 'true' || force === true) {
      await Table.deleteMany({});
    }

    const count = await Table.countDocuments();
    if (count > 0 && !force) {
      return res.status(200).json({
        success: true,
        message: `Tables already seeded. Total tables: ${count}`,
        count,
      });
    }

    const defaultTables = [
      // Main Dining Hall
      { id: 'tbl-1', number: 1, name: 'Table 1', capacity: 2, zone: 'Main Dining Hall', status: 'available' },
      { id: 'tbl-2', number: 2, name: 'Table 2', capacity: 4, zone: 'Main Dining Hall', status: 'available' },
      { id: 'tbl-3', number: 3, name: 'Table 3', capacity: 4, zone: 'Main Dining Hall', status: 'available' },
      { id: 'tbl-4', number: 4, name: 'Table 4', capacity: 6, zone: 'Main Dining Hall', status: 'available' },
      { id: 'tbl-5', number: 5, name: 'Table 5', capacity: 6, zone: 'Main Dining Hall', status: 'available' },

      // Family Section
      { id: 'tbl-6', number: 6, name: 'Family Booth 1', capacity: 6, zone: 'Family Section', status: 'available' },
      { id: 'tbl-7', number: 7, name: 'Family Booth 2', capacity: 8, zone: 'Family Section', status: 'available' },
      { id: 'tbl-8', number: 8, name: 'Family Booth 3', capacity: 8, zone: 'Family Section', status: 'available' },

      // Outdoor Terrace
      { id: 'tbl-9', number: 9, name: 'Terrace Garden 1', capacity: 4, zone: 'Outdoor Terrace', status: 'available' },
      { id: 'tbl-10', number: 10, name: 'Terrace Garden 2', capacity: 4, zone: 'Outdoor Terrace', status: 'available' },

      // VIP Lounge
      { id: 'tbl-11', number: 11, name: 'VIP Executive Room 1', capacity: 10, zone: 'VIP Lounge', status: 'available' },
      { id: 'tbl-12', number: 12, name: 'VIP Executive Room 2', capacity: 12, zone: 'VIP Lounge', status: 'available' },
    ];

    await Table.insertMany(defaultTables);

    return res.status(200).json({
      success: true,
      message: '12 default restaurant tables seeded successfully in MongoDB Atlas',
      count: defaultTables.length,
      data: defaultTables,
    });
  } catch (error) {
    next(error);
  }
}
