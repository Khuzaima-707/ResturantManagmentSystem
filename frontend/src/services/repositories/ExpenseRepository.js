/**
 * Expense & Accounting Repository
 * Connects POS expenses & categories to Express REST API & MongoDB Atlas.
 * Falls back safely to persistent browser storage when offline.
 */
import { api } from '../adapters/apiClient';
import { storage } from '../persistence/storage';
import { DEFAULT_EXPENSE_CATEGORIES } from '../../domain/rules/expenseRules';

const EXPENSES_STORAGE_KEY = 'expenses';
const CATEGORIES_STORAGE_KEY = 'expense_categories';

export const ExpenseRepository = {
  /**
   * Fetch all expenses with optional filters
   */
  getAll: async (params = {}) => {
    try {
      const query = new URLSearchParams(params).toString();
      const endpoint = query ? `/expenses?${query}` : '/expenses';
      const res = await api.get(endpoint);
      if (res && res.success && Array.isArray(res.data)) {
        const local = storage.get(EXPENSES_STORAGE_KEY, []) || [];
        if (res.data.length > 0) {
          const backendIds = new Set(res.data.map((e) => e.id || e._id));
          const unsynced = local.filter((loc) => {
            const k = loc?.id || loc?._id;
            return k && !backendIds.has(k);
          });
          const merged = [...res.data, ...unsynced];
          storage.set(EXPENSES_STORAGE_KEY, merged);
          return merged;
        } else if (local.length > 0) {
          // Never wipe out local expenses with an empty backend response!
          // Background sync local unsynced expenses to live backend
          local.forEach((item) => {
            api.post('/expenses', item).catch(() => {});
          });
          return local;
        } else {
          storage.set(EXPENSES_STORAGE_KEY, []);
          return [];
        }
      }
    } catch {
      // Backend offline fallback
    }

    const saved = storage.get(EXPENSES_STORAGE_KEY, []);
    return Array.isArray(saved) ? saved : [];
  },

  /**
   * Fetch a single expense by ID
   */
  getById: async (id) => {
    try {
      const res = await api.get(`/expenses/${id}`);
      if (res && res.success && res.data) {
        return res.data;
      }
    } catch {
      // Fallback
    }
    const all = storage.get(EXPENSES_STORAGE_KEY, []) || [];
    return all.find((e) => e.id === id || e._id === id) || null;
  },

  /**
   * Create a new expense record
   */
  create: async (expensePayload) => {
    try {
      const res = await api.post('/expenses', expensePayload);
      if (res && res.success && res.data) {
        const all = storage.get(EXPENSES_STORAGE_KEY, []) || [];
        const updated = [res.data, ...all.filter((e) => e.id !== res.data.id)];
        storage.set(EXPENSES_STORAGE_KEY, updated);
        return res.data;
      }
    } catch (err) {
      console.warn('[ExpenseRepository] Live API create failed, falling back to local storage:', err.message);
    }

    const all = storage.get(EXPENSES_STORAGE_KEY, []) || [];
    const fallbackExpense = {
      ...expensePayload,
      id: expensePayload.id || `exp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      status: 'ACTIVE',
      expenseDate: expensePayload.expenseDate || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    storage.set(EXPENSES_STORAGE_KEY, [fallbackExpense, ...all]);
    return fallbackExpense;
  },

  /**
   * Update an existing expense record
   */
  update: async (id, updates) => {
    try {
      const res = await api.put(`/expenses/${id}`, updates);
      if (res && res.success && res.data) {
        const all = storage.get(EXPENSES_STORAGE_KEY, []) || [];
        const updated = all.map((e) => (e.id === id || e._id === id ? res.data : e));
        storage.set(EXPENSES_STORAGE_KEY, updated);
        return res.data;
      }
    } catch (err) {
      console.warn('[ExpenseRepository] Live API update failed, falling back to local storage:', err.message);
    }

    const all = storage.get(EXPENSES_STORAGE_KEY, []) || [];
    let updatedItem = null;
    const updated = all.map((e) => {
      if (e.id === id || e._id === id) {
        updatedItem = { ...e, ...updates, updatedAt: new Date().toISOString() };
        return updatedItem;
      }
      return e;
    });
    storage.set(EXPENSES_STORAGE_KEY, updated);
    return updatedItem;
  },

  /**
   * Void a posted expense (Audit preservation — NO hard deletion)
   */
  void: async (id, voidReason, actor = { id: '', name: 'Admin' }) => {
    try {
      const res = await api.post(`/expenses/${id}/void`, { voidReason });
      if (res && res.success && res.data) {
        const all = storage.get(EXPENSES_STORAGE_KEY, []) || [];
        const updated = all.map((e) => (e.id === id || e._id === id ? res.data : e));
        storage.set(EXPENSES_STORAGE_KEY, updated);
        return res.data;
      }
    } catch (err) {
      console.warn('[ExpenseRepository] Live API void failed, falling back to local storage:', err.message);
    }

    const all = storage.get(EXPENSES_STORAGE_KEY, []) || [];
    let voidedItem = null;
    const updated = all.map((e) => {
      if (e.id === id || e._id === id) {
        voidedItem = {
          ...e,
          status: 'VOIDED',
          voidReason,
          voidedAt: new Date().toISOString(),
          voidedByUserId: actor.id || '',
          voidedByName: actor.name || 'Admin',
          updatedAt: new Date().toISOString(),
        };
        return voidedItem;
      }
      return e;
    });
    storage.set(EXPENSES_STORAGE_KEY, updated);
    return voidedItem;
  },

  /**
   * Fetch all expense categories
   */
  getCategories: async () => {
    try {
      const res = await api.get('/expenses/categories');
      if (res && res.success && Array.isArray(res.data)) {
        const local = storage.get(CATEGORIES_STORAGE_KEY, []) || [];
        if (res.data.length > 0) {
          const backendIds = new Set(res.data.map((c) => c.id || c._id));
          const unsynced = local.filter((loc) => {
            const k = loc?.id || loc?._id;
            return k && !backendIds.has(k);
          });
          const merged = [...res.data, ...unsynced];
          storage.set(CATEGORIES_STORAGE_KEY, merged);
          return merged;
        } else if (local.length > 0) {
          return local;
        } else {
          storage.set(CATEGORIES_STORAGE_KEY, []);
          return [];
        }
      }
    } catch {
      // Fallback
    }

    const saved = storage.get(CATEGORIES_STORAGE_KEY, null);
    if (Array.isArray(saved)) {
      return saved;
    }
    return [];
  },

  /**
   * Create an expense category
   */
  createCategory: async (categoryPayload) => {
    try {
      const res = await api.post('/expenses/categories', categoryPayload);
      if (res && res.success && res.data) {
        const all = storage.get(CATEGORIES_STORAGE_KEY, []) || [];
        storage.set(CATEGORIES_STORAGE_KEY, [...all, res.data]);
        return res.data;
      }
    } catch (err) {
      console.warn('[ExpenseRepository] Live API createCategory failed:', err.message);
    }

    const all = storage.get(CATEGORIES_STORAGE_KEY, []) || [];
    const newCategory = {
      ...categoryPayload,
      id: categoryPayload.id || `exp-cat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      status: categoryPayload.status || 'active',
      isDefault: false,
      createdAt: new Date().toISOString(),
    };
    storage.set(CATEGORIES_STORAGE_KEY, [...all, newCategory]);
    return newCategory;
  },

  /**
   * Update an expense category
   */
  updateCategory: async (id, updates) => {
    try {
      const res = await api.put(`/expenses/categories/${id}`, updates);
      if (res && res.success && res.data) {
        const all = storage.get(CATEGORIES_STORAGE_KEY, []) || [];
        const updated = all.map((c) => (c.id === id || c._id === id ? res.data : c));
        storage.set(CATEGORIES_STORAGE_KEY, updated);
        return res.data;
      }
    } catch (err) {
      console.warn('[ExpenseRepository] Live API updateCategory failed:', err.message);
    }

    const all = storage.get(CATEGORIES_STORAGE_KEY, []) || [];
    let updatedCat = null;
    const updated = all.map((c) => {
      if (c.id === id || c._id === id) {
        updatedCat = { ...c, ...updates, updatedAt: new Date().toISOString() };
        return updatedCat;
      }
      return c;
    });
    storage.set(CATEGORIES_STORAGE_KEY, updated);
    return updatedCat;
  },

  /**
   * Delete an expense category (prevented if historical records exist)
   */
  deleteCategory: async (id) => {
    // Check local expenses dependency first
    const expenses = storage.get(EXPENSES_STORAGE_KEY, []) || [];
    const categories = storage.get(CATEGORIES_STORAGE_KEY, []) || [];
    const target = categories.find((c) => c.id === id || c._id === id);

    if (target) {
      const dependentCount = expenses.filter(
        (e) => e.categoryId === target.id || e.category === target.name
      ).length;
      if (dependentCount > 0) {
        throw new Error(
          `Cannot delete category "${target.name}" because ${dependentCount} historical expense record(s) depend on it. Please deactivate the category instead.`
        );
      }
    }

    try {
      const res = await api.delete(`/expenses/categories/${id}`);
      if (res && res.success) {
        const updated = categories.filter((c) => c.id !== id && c._id !== id);
        storage.set(CATEGORIES_STORAGE_KEY, updated);
        return true;
      }
    } catch (err) {
      if (err.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
    }

    const updated = categories.filter((c) => c.id !== id && c._id !== id);
    storage.set(CATEGORIES_STORAGE_KEY, updated);
    return true;
  },
};

export default ExpenseRepository;
