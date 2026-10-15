/**
 * Add-on Repository
 * Decouples add-on persistence from React UI components.
 * Connects to Express REST API & MongoDB Atlas with local fallback.
 */
import { api } from '../adapters/apiClient';
import { storage } from '../persistence/storage';

const STORAGE_KEY = 'addons';

export const AddonRepository = {
  getAll: async () => {
    try {
      const res = await api.get('/addons');
      if (res && res.success && Array.isArray(res.data)) {
        const sanitized = res.data.map((a) => ({
          ...a,
          categoryIds: Array.isArray(a.categoryIds)
            ? a.categoryIds.filter((cid) => cid !== 'cat-biryani' && !String(cid).toLowerCase().includes('rice'))
            : [],
        }));
        storage.set(STORAGE_KEY, sanitized);
        return sanitized;
      }
    } catch {
      // Backend offline fallback
    }

    const saved = storage.get(STORAGE_KEY, null);
    if (saved && Array.isArray(saved)) {
      const sanitized = saved.map((a) => ({
        ...a,
        categoryIds: Array.isArray(a.categoryIds)
          ? a.categoryIds.filter((cid) => cid !== 'cat-biryani' && !String(cid).toLowerCase().includes('rice'))
          : [],
      }));
      storage.set(STORAGE_KEY, sanitized);
      return sanitized;
    }
    return [];
  },

  getById: async (id) => {
    const local = storage.get(STORAGE_KEY, []) || [];
    const foundLocal = Array.isArray(local) ? local.find((addon) => addon.id === id) : null;
    if (foundLocal) return foundLocal;

    try {
      const res = await api.get(`/addons/${id}`);
      if (res && res.success && res.data) {
        return res.data;
      }
    } catch {
      // Fallback
    }
    const all = await AddonRepository.getAll();
    return all.find((addon) => addon.id === id) || null;
  },

  create: async (addon) => {
    try {
      const res = await api.post('/addons', addon);
      if (res && res.success && res.data) {
        const all = storage.get(STORAGE_KEY, []) || [];
        storage.set(STORAGE_KEY, [res.data, ...all.filter((a) => a.id !== res.data.id)]);
        return res.data;
      }
    } catch (err) {
      console.warn('[AddonRepository] API create failed, using local storage:', err.message);
    }

    const all = await AddonRepository.getAll();
    const newRecord = {
      ...addon,
      id: addon.id || `addon-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: addon.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [newRecord, ...all];
    storage.set(STORAGE_KEY, updated);
    return newRecord;
  },

  update: async (id, data) => {
    try {
      const res = await api.put(`/addons/${id}`, data);
      if (res && res.success && res.data) {
        const all = storage.get(STORAGE_KEY, []) || [];
        const updated = all.map((addon) => (addon.id === id ? res.data : addon));
        storage.set(STORAGE_KEY, updated);
        return res.data;
      }
    } catch (err) {
      console.warn('[AddonRepository] API update failed, using local storage:', err.message);
    }

    const all = await AddonRepository.getAll();
    const updated = all.map((addon) =>
      addon.id === id ? { ...addon, ...data, updatedAt: new Date().toISOString() } : addon
    );
    storage.set(STORAGE_KEY, updated);
    return updated.find((addon) => addon.id === id) || null;
  },

  delete: async (id) => {
    try {
      await api.delete(`/addons/${id}`);
    } catch (err) {
      console.warn('[AddonRepository] API delete failed, using local storage:', err.message);
    }

    const all = await AddonRepository.getAll();
    const filtered = all.filter((addon) => addon.id !== id);
    storage.set(STORAGE_KEY, filtered);
    return true;
  },
};

export default AddonRepository;
