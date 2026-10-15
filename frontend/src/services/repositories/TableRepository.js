/**
 * Table Repository
 * Connects dining floorplan & table status to Express REST API & MongoDB Atlas.
 * Provides resilient offline fallback to local storage.
 */
import { api } from '../adapters/apiClient';
import { storage } from '../persistence/storage';

const STORAGE_KEY = 'tables';

const DEFAULT_TABLES = [
  { id: 'tbl-1', tableNumber: '1', zone: 'Main Dining Hall', capacity: 2, status: 'available' },
  { id: 'tbl-2', tableNumber: '2', zone: 'Main Dining Hall', capacity: 4, status: 'available' },
  { id: 'tbl-3', tableNumber: '3', zone: 'Main Dining Hall', capacity: 4, status: 'available' },
  { id: 'tbl-4', tableNumber: '4', zone: 'Main Dining Hall', capacity: 6, status: 'available' },
  { id: 'tbl-5', tableNumber: '5', zone: 'Main Dining Hall', capacity: 8, status: 'available' },
  { id: 'tbl-6', tableNumber: '6', zone: 'Family Section', capacity: 4, status: 'available' },
  { id: 'tbl-7', tableNumber: '7', zone: 'Family Section', capacity: 6, status: 'available' },
  { id: 'tbl-8', tableNumber: '8', zone: 'Family Section', capacity: 6, status: 'available' },
  { id: 'tbl-9', tableNumber: '9', zone: 'Outdoor Terrace', capacity: 2, status: 'available' },
  { id: 'tbl-10', tableNumber: '10', zone: 'Outdoor Terrace', capacity: 4, status: 'available' },
  { id: 'tbl-11', tableNumber: '11', zone: 'Outdoor Terrace', capacity: 4, status: 'available' },
  { id: 'tbl-12', tableNumber: 'VIP-1', zone: 'Executive Lounge', capacity: 10, status: 'available' },
];

export const TableRepository = {
  getAll: async (params = {}) => {
    try {
      const query = new URLSearchParams(params).toString();
      const endpoint = query ? `/tables?${query}` : '/tables';
      const res = await api.get(endpoint);
      if (res && res.success && Array.isArray(res.data)) {
        storage.set(STORAGE_KEY, res.data);
        return res.data;
      }
    } catch {
      // Backend offline fallback
    }

    const saved = storage.get(STORAGE_KEY, null);
    if (saved && Array.isArray(saved)) return saved;
    return [];
  },

  getStats: async () => {
    try {
      const res = await api.get('/tables/stats');
      if (res && res.success && res.data) {
        return res.data;
      }
    } catch {
      // Fallback
    }

    const tables = await TableRepository.getAll();
    return {
      total: tables.length,
      available: tables.filter((t) => t.status === 'available').length,
      occupied: tables.filter((t) => t.status === 'occupied').length,
      reserved: tables.filter((t) => t.status === 'reserved').length,
      occupancyRate: tables.length > 0
        ? Math.round((tables.filter((t) => t.status === 'occupied').length / tables.length) * 100)
        : 0,
    };
  },

  updateStatus: async (id, status, details = {}) => {
    try {
      const res = await api.patch(`/tables/${id}/status`, { status, ...details });
      if (res && res.success && res.data) {
        const all = storage.get(STORAGE_KEY, []) || [];
        storage.set(STORAGE_KEY, all.map((t) => (t.id === id ? res.data : t)));
        return res.data;
      }
    } catch {
      // Fallback
    }

    const all = storage.get(STORAGE_KEY, []) || [];
    const updated = all.map((t) => {
      if (t.id === id) {
        return { ...t, status, ...details };
      }
      return t;
    });
    storage.set(STORAGE_KEY, updated);
    return updated.find((t) => t.id === id);
  },

  occupy: async (id, details = {}) => {
    try {
      const res = await api.post(`/tables/${id}/occupy`, details);
      if (res && res.success && res.data) {
        const all = storage.get(STORAGE_KEY, []) || [];
        storage.set(STORAGE_KEY, all.map((t) => (t.id === id ? res.data : t)));
        return res.data;
      }
    } catch {
      // Fallback
    }

    return TableRepository.updateStatus(id, 'occupied', details);
  },

  release: async (id) => {
    try {
      const res = await api.post(`/tables/${id}/release`);
      if (res && res.success && res.data) {
        const all = storage.get(STORAGE_KEY, []) || [];
        storage.set(STORAGE_KEY, all.map((t) => (t.id === id ? res.data : t)));
        return res.data;
      }
    } catch {
      // Fallback
    }

    return TableRepository.updateStatus(id, 'available', {
      currentOrderId: null,
      currentInvoiceNumber: null,
      guestsCount: 0,
      occupiedAt: null,
    });
  },
};

export default TableRepository;
