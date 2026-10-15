import mongoose from 'mongoose';
import { MenuItem } from '../models/Item.js';
import { Category } from '../models/Category.js';
import { defaultItems } from '../data/defaultItems.js';
import cloudinary from '../config/cloudinary.js';
import { isDbConnected } from '../config/db.js';

/**
 * GET /api/items
 * Retrieve items with category, status, search, and sorting support
 */
export async function getAllItems(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
        offline: true,
      });
    }

    const { categoryId, status, search, sort = 'createdAt' } = req.query;
    const filter = {};

    if (categoryId && categoryId.trim()) {
      filter.categoryId = categoryId.trim();
    }

    if (status && ['active', 'inactive'].includes(status)) {
      filter.status = status;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: searchRegex },
        { description: searchRegex },
      ];
    }

    const sortOption = {};
    if (sort === 'name') sortOption.name = 1;
    else if (sort === '-name') sortOption.name = -1;
    else if (sort === 'price') sortOption.basePrice = 1;
    else if (sort === '-price') sortOption.basePrice = -1;
    else if (sort === '-createdAt') sortOption.createdAt = -1;
    else sortOption.createdAt = 1;

    const items = await MenuItem.find(filter).sort(sortOption);

    return res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/items/:id
 * Retrieve a single item by custom id (e.g. item-1) or MongoDB _id
 */
export async function getItemById(req, res, next) {
  try {
    const { id } = req.params;

    let item = await MenuItem.findOne({ id });

    if (!item && mongoose.Types.ObjectId.isValid(id)) {
      item = await MenuItem.findById(id);
    }

    if (!item) {
      return res.status(404).json({
        success: false,
        error: { message: `Menu item with ID '${id}' not found` },
      });
    }

    return res.status(200).json({
      success: true,
      data: item,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/items
 * Create a new menu item
 */
export async function createItem(req, res, next) {
  try {
    const payload = { ...req.body };

    // Validate that categoryId exists in database
    const category = await Category.findOne({ id: payload.categoryId });
    if (!category) {
      return res.status(400).json({
        success: false,
        error: { message: `Referenced Category ID '${payload.categoryId}' does not exist` },
      });
    }

    // Set categoryName snapshot if not passed
    if (!payload.categoryName) {
      payload.categoryName = category.name;
    }

    // Auto-generate unique ID if not provided
    if (!payload.id) {
      const randomSuffix = Math.random().toString(36).substring(2, 6);
      payload.id = `item-${Date.now()}-${randomSuffix}`;
    }

    // Auto-upload base64 images to Cloudinary so MongoDB stays lightweight
    if (payload.imageRef && payload.imageRef.startsWith('data:')) {
      try {
        const uploadRes = await cloudinary.uploader.upload(payload.imageRef, {
          folder: 'rms_pos/menu',
          resource_type: 'image',
        });
        payload.imageRef = uploadRes.secure_url;
      } catch (err) {
        console.warn('[itemController] Cloudinary auto-upload warning:', err.message);
      }
    }

    // Check duplicate ID
    const existing = await MenuItem.findOne({ id: payload.id });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: { message: `Menu item with ID '${payload.id}' already exists` },
      });
    }

    const item = await MenuItem.create(payload);

    return res.status(201).json({
      success: true,
      message: 'Menu item created successfully',
      data: item,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/items/:id
 * Update an existing menu item by custom id or _id
 */
export async function updateItem(req, res, next) {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    // If categoryId is changed, verify new category exists and update categoryName
    if (updates.categoryId) {
      const category = await Category.findOne({ id: updates.categoryId });
      if (!category) {
        return res.status(400).json({
          success: false,
          error: { message: `Referenced Category ID '${updates.categoryId}' does not exist` },
        });
      }
      if (!updates.categoryName) {
        updates.categoryName = category.name;
      }
    }

    // Auto-upload base64 images to Cloudinary so MongoDB stays lightweight
    if (updates.imageRef && updates.imageRef.startsWith('data:')) {
      try {
        const uploadRes = await cloudinary.uploader.upload(updates.imageRef, {
          folder: 'rms_pos/menu',
          resource_type: 'image',
        });
        updates.imageRef = uploadRes.secure_url;
      } catch (err) {
        console.warn('[itemController] Cloudinary auto-upload warning:', err.message);
      }
    }

    let item = await MenuItem.findOneAndUpdate(
      { id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!item && mongoose.Types.ObjectId.isValid(id)) {
      item = await MenuItem.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      );
    }

    if (!item) {
      return res.status(404).json({
        success: false,
        error: { message: `Menu item with ID '${id}' not found` },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Menu item updated successfully',
      data: item,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/items/:id
 * Delete a menu item by custom id or _id
 */
export async function deleteItem(req, res, next) {
  try {
    const { id } = req.params;

    let item = await MenuItem.findOneAndDelete({ id });

    if (!item && mongoose.Types.ObjectId.isValid(id)) {
      item = await MenuItem.findByIdAndDelete(id);
    }

    if (!item) {
      return res.status(404).json({
        success: false,
        error: { message: `Menu item with ID '${id}' not found` },
      });
    }

    return res.status(200).json({
      success: true,
      message: `Menu item '${item.name}' (${item.id}) deleted successfully`,
      data: { id: item.id, name: item.name },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/items/seed
 * Upsert canonical default items into MongoDB Atlas
 */
export async function seedItems(req, res, next) {
  try {
    const { force = false } = req.query;

    if (force === 'true' || force === true) {
      await MenuItem.deleteMany({});
    }

    const results = [];
    for (const item of defaultItems) {
      const upserted = await MenuItem.findOneAndUpdate(
        { id: item.id },
        { $set: item },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      results.push(upserted);
    }

    const totalCount = await MenuItem.countDocuments();

    return res.status(200).json({
      success: true,
      message: `Default menu items seeded successfully in MongoDB Atlas. Total items: ${totalCount}`,
      count: results.length,
      data: results,
    });
  } catch (error) {
    next(error);
  }
}
