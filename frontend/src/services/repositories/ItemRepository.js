/**
 * Menu Item Repository
 * Decouples menu item persistence from React UI components.
 * Connects to Express REST API & MongoDB Atlas with local fallback.
 */
import { api } from '../adapters/apiClient';
import { storage } from '../persistence/storage';

const STORAGE_KEY = 'menu_items';

export const ItemRepository = {
  getAll: async () => {
    try {
      const res = await api.get('/items');
      if (res && res.success && Array.isArray(res.data)) {
        storage.set(STORAGE_KEY, res.data);
        return res.data;
      }
    } catch {
      // Backend offline fallback
    }

    const saved = storage.get(STORAGE_KEY, null);
    if (saved && Array.isArray(saved)) {
      return saved;
    }
    return [];
  },

  getById: async (id) => {
    const local = storage.get(STORAGE_KEY, []) || [];
    const foundLocal = Array.isArray(local) ? local.find((item) => item.id === id) : null;
    if (foundLocal) return foundLocal;

    try {
      const res = await api.get(`/items/${id}`);
      if (res && res.success && res.data) {
        return res.data;
      }
    } catch {
      // Fallback
    }
    const all = await ItemRepository.getAll();
    return all.find((item) => item.id === id) || null;
  },

  create: async (item) => {
    try {
      const res = await api.post('/items', item);
      if (res && res.success && res.data) {
        const all = storage.get(STORAGE_KEY, []) || [];
        storage.set(STORAGE_KEY, [res.data, ...all.filter((i) => i.id !== res.data.id)]);
        return res.data;
      }
    } catch (err) {
      console.warn('[ItemRepository] API create failed, using local storage:', err.message);
    }

    const all = await ItemRepository.getAll();
    const newRecord = {
      ...item,
      id: item.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [newRecord, ...all];
    storage.set(STORAGE_KEY, updated);
    return newRecord;
  },

  update: async (id, data) => {
    try {
      const res = await api.put(`/items/${id}`, data);
      if (res && res.success && res.data) {
        const all = storage.get(STORAGE_KEY, []) || [];
        const updated = all.map((item) => (item.id === id ? res.data : item));
        storage.set(STORAGE_KEY, updated);
        return res.data;
      }
    } catch (err) {
      console.warn('[ItemRepository] API update failed, using local storage:', err.message);
    }

    const all = await ItemRepository.getAll();
    const updated = all.map((item) =>
      item.id === id ? { ...item, ...data, updatedAt: new Date().toISOString() } : item
    );
    storage.set(STORAGE_KEY, updated);
    return updated.find((item) => item.id === id) || null;
  },

  delete: async (id) => {
    try {
      await api.delete(`/items/${id}`);
    } catch (err) {
      console.warn('[ItemRepository] API delete failed, using local storage:', err.message);
    }

    const all = await ItemRepository.getAll();
    const filtered = all.filter((item) => item.id !== id);
    storage.set(STORAGE_KEY, filtered);
    return true;
  },
};

export default ItemRepository;
