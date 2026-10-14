import { Settings } from '../models/Settings.js';
import { Order } from '../models/Order.js';
import { Reversal } from '../models/Reversal.js';
import { Category } from '../models/Category.js';
import { MenuItem as Item } from '../models/Item.js';
import { Addon } from '../models/Addon.js';

/**
 * GET /api/settings
 * Retrieves active system settings or creates default record
 */
export async function getSettings(req, res, next) {
  try {
    let settings = await Settings.findOne({ id: 'system-settings' });
    if (!settings) {
      settings = await Settings.create({ id: 'system-settings' });
    }

    return res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/settings
 * Updates business profile, tax configurations, and invoice options
 */
export async function updateSettings(req, res, next) {
  try {
    const updates = { ...req.body };

    const settings = await Settings.findOneAndUpdate(
      { id: 'system-settings' },
      { $set: updates },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/settings/danger-zone/reset
 * Danger Zone reset action: Clears operational data across collections
 * Protected by strict required confirmation phrase 'DELETE ALL DATA'
 */
export async function deleteAllData(req, res, next) {
  try {
    const { confirmationPhrase, resetType = 'all' } = req.body;

    if (confirmationPhrase !== 'DELETE ALL DATA') {
      return res.status(400).json({
        success: false,
        error: { message: "Confirmation phrase must exactly equal 'DELETE ALL DATA'" },
      });
    }

    // Always clear operational transactions
    const [ordersResult, reversalsResult] = await Promise.all([
      Order.deleteMany({}),
      Reversal.deleteMany({}),
    ]);

    let categoriesDeleted = 0;
    let itemsDeleted = 0;
    let addonsDeleted = 0;

    if (resetType === 'all') {
      const [cRes, iRes, aRes] = await Promise.all([
        Category.deleteMany({}),
        Item.deleteMany({}),
        Addon.deleteMany({}),
      ]);
      categoriesDeleted = cRes.deletedCount;
      itemsDeleted = iRes.deletedCount;
      addonsDeleted = aRes.deletedCount;
    }

    return res.status(200).json({
      success: true,
      message: 'All system data has been safely deleted. System returned to clean empty state.',
      deletedSummary: {
        ordersDeleted: ordersResult.deletedCount,
        reversalsDeleted: reversalsResult.deletedCount,
        categoriesDeleted,
        itemsDeleted,
        addonsDeleted,
      },
    });
  } catch (error) {
    next(error);
  }
}
