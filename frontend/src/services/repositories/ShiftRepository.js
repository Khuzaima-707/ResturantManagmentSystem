/**
 * Shift Repository
 * Connects cash drawer sessions & end-of-day Z-Reports to Express REST API & Atlas.
 * Provides resilient offline fallback to local storage.
 */
import { api } from '../adapters/apiClient';
import { storage } from '../persistence/storage';

const STORAGE_KEY = 'shifts';
const CURRENT_SHIFT_KEY = 'current_shift';

export const ShiftRepository = {
  getAll: async () => {
    try {
      const res = await api.get('/shifts');
      if (res && res.success && Array.isArray(res.data)) {
        storage.set(STORAGE_KEY, res.data);
        return res.data;
      }
    } catch {
      // Backend offline fallback
    }

    const saved = storage.get(STORAGE_KEY, []);
    return Array.isArray(saved) ? saved : [];
  },

  getCurrent: async () => {
    try {
      const res = await api.get('/shifts/current');
      if (res && res.success) {
        storage.set(CURRENT_SHIFT_KEY, res.data);
        return res.data;
      }
    } catch {
      // Fallback
    }

    return storage.get(CURRENT_SHIFT_KEY, null);
  },

  open: async ({ cashierName = 'Cashier 1', openingFloat = 0, notes = '' }) => {
    try {
      const res = await api.post('/shifts/open', { cashierName, openingFloat, notes });
      if (res && res.success && res.data) {
        storage.set(CURRENT_SHIFT_KEY, res.data);
        return res.data;
      }
    } catch (err) {
      console.warn('[ShiftRepository] Live open failed, falling back:', err.message);
    }

    const all = storage.get(STORAGE_KEY, []) || [];
    const seq = all.length + 1;
    const fallbackShift = {
      id: `shift-${Date.now()}`,
      shiftNumber: seq,
      cashierName,
      status: 'open',
      openingFloat: Number(openingFloat) || 0,
      openedAt: new Date().toISOString(),
      cashSales: 0,
      cardSales: 0,
      onlineSales: 0,
      totalSales: 0,
      expensesPaidOut: 0,
      expectedCashInDrawer: Number(openingFloat) || 0,
      notes,
    };

    storage.set(CURRENT_SHIFT_KEY, fallbackShift);
    return fallbackShift;
  },

  close: async ({ actualCashCounted = 0, notes = '' }) => {
    try {
      const res = await api.post('/shifts/close', { actualCashCounted, notes });
      if (res && res.success && res.data) {
        storage.set(CURRENT_SHIFT_KEY, null);
        const all = storage.get(STORAGE_KEY, []) || [];
        storage.set(STORAGE_KEY, [res.data, ...all]);
        return res.data;
      }
    } catch (err) {
      console.warn('[ShiftRepository] Live close failed, falling back:', err.message);
    }

    const current = storage.get(CURRENT_SHIFT_KEY, null);
    if (!current) {
      throw new Error('No active shift found to close');
    }

    const counted = Number(actualCashCounted) || 0;
    const discrepancy = counted - (current.expectedCashInDrawer || 0);

    const closedShift = {
      ...current,
      status: 'closed',
      closedAt: new Date().toISOString(),
      actualCashCounted: counted,
      discrepancy,
      closingNotes: notes,
    };

    storage.set(CURRENT_SHIFT_KEY, null);
    const all = storage.get(STORAGE_KEY, []) || [];
    storage.set(STORAGE_KEY, [closedShift, ...all]);
    return closedShift;
  },
};

export default ShiftRepository;
