import mongoose from 'mongoose';
import { Category } from '../models/Category.js';
import { defaultCategories } from '../data/defaultCategories.js';
import { isDbConnected } from '../config/db.js';

/**
 * Generate URL-friendly slug from string
 */
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * GET /api/categories
 * Retrieve all categories with optional search and status filtering
 */
export async function getAllCategories(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(200).json({
        success: true,
        count: defaultCategories.length,
        data: defaultCategories,
        offline: true,
      });
    }

    const { status, search, sort = 'createdAt' } = req.query;
    const filter = {};

    if (status && ['active', 'inactive'].includes(status)) {
      filter.status = status;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: searchRegex },
        { slug: searchRegex },
        { keywords: { $in: [searchRegex] } },
      ];
    }

    const sortOption = {};
    if (sort === 'name') sortOption.name = 1;
    else if (sort === '-name') sortOption.name = -1;
    else if (sort === '-createdAt') sortOption.createdAt = -1;
    else sortOption.createdAt = 1;

    const categories = await Category.find(filter).sort(sortOption);

    return res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/categories/:id
 * Retrieve a single category by custom id (e.g. cat-biryani) or MongoDB _id
 */
export async function getCategoryById(req, res, next) {
  try {
    const { id } = req.params;

    let category = await Category.findOne({ id });

    // Fallback lookup if id was passed as MongoDB ObjectId
    if (!category && mongoose.Types.ObjectId.isValid(id)) {
      category = await Category.findById(id);
    }

    if (!category) {
      return res.status(404).json({
        success: false,
        error: { message: `Category with ID '${id}' not found` },
      });
    }

    return res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/categories
 * Create a new category
 */
export async function createCategory(req, res, next) {
  try {
    const payload = { ...req.body };

    // Auto-generate slug if not provided
    if (!payload.slug && payload.name) {
      payload.slug = slugify(payload.name);
    }

    // Auto-generate unique custom ID if not provided
    if (!payload.id) {
      const randomSuffix = Math.random().toString(36).substring(2, 6);
      payload.id = `cat-${payload.slug || Date.now()}-${randomSuffix}`;
    }

    // Check for existing slug or id conflict
    const existing = await Category.findOne({
      $or: [{ id: payload.id }, { slug: payload.slug }],
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: {
          message: existing.id === payload.id
            ? `Category with ID '${payload.id}' already exists`
            : `Category slug '${payload.slug}' already exists. Please choose a distinct name or slug.`,
        },
      });
    }

    const category = await Category.create(payload);

    return res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/categories/:id
 * Update an existing category by custom id or _id
 */
export async function updateCategory(req, res, next) {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    // If slug is updated or name changed without slug, ensure slug format
    if (updates.name && !updates.slug) {
      updates.slug = slugify(updates.name);
    }

    // Check slug conflict if slug is being updated
    if (updates.slug) {
      const conflict = await Category.findOne({
        slug: updates.slug,
        id: { $ne: id },
      });
      if (conflict) {
        return res.status(409).json({
          success: false,
          error: { message: `Category slug '${updates.slug}' is already taken.` },
        });
      }
    }

    // Find and update
    let category = await Category.findOneAndUpdate(
      { id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!category && mongoose.Types.ObjectId.isValid(id)) {
      category = await Category.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      );
    }

    if (!category) {
      return res.status(404).json({
        success: false,
        error: { message: `Category with ID '${id}' not found` },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: category,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/categories/:id
 * Delete a category by id or _id
 */
export async function deleteCategory(req, res, next) {
  try {
    const { id } = req.params;

    let category = await Category.findOneAndDelete({ id });

    if (!category && mongoose.Types.ObjectId.isValid(id)) {
      category = await Category.findByIdAndDelete(id);
    }

    if (!category) {
      return res.status(404).json({
        success: false,
        error: { message: `Category with ID '${id}' not found` },
      });
    }

    return res.status(200).json({
      success: true,
      message: `Category '${category.name}' (${category.id}) deleted successfully`,
      data: { id: category.id, name: category.name },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/categories/seed
 * Upsert or bootstrap default categories in MongoDB Atlas
 */
export async function seedCategories(req, res, next) {
  try {
    const { force = false } = req.query;

    if (force === 'true' || force === true) {
      await Category.deleteMany({});
    }

    const results = [];
    for (const item of defaultCategories) {
      const upserted = await Category.findOneAndUpdate(
        { id: item.id },
        { $set: item },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      results.push(upserted);
    }

    const totalCount = await Category.countDocuments();

    return res.status(200).json({
      success: true,
      message: `Default categories seeded successfully in MongoDB Atlas. Total categories: ${totalCount}`,
      count: results.length,
      data: results,
    });
  } catch (error) {
    next(error);
  }
}
