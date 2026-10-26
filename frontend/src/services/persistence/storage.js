/**
 * Frontend Persistence Helpers
 * Safe localStorage wrapper with memory fallback for SSR / Node / Vitest
 *
 * NOTE: All business operational data (Orders, Menu Items, Categories, Add-ons, Deals,
 * Expenses, Shifts, Tables, Reversals, Settings) are 100% saved in MongoDB Atlas.
 * LocalStorage is STRICTLY restricted to user authentication session (auth_token, active_user).
 */

const STORAGE_PREFIX = 'rms_pos_v2_';
const memoryStore = new Map();

// Operational database collections and transactional states must NEVER be stored in localStorage.
// MongoDB Atlas is the single source of truth; frontend cache remains in-memory only.
export const ALLOWED_LOCAL_STORAGE_KEYS = new Set([
  'auth_token',
  'active_user',
  'rms_users_list',
  'rms_custom_users',
  'active_cashier_users',
  'active_cashier_user',
  'active_cashier_id',
  'user_profiles',
  'auth_credentials',
  'settings',
]);

export const DB_COLLECTION_KEYS = new Set([
  'orders',
  'menu_items',
  'categories',
  'addons',
  'deals',
  'expenses',
  'expense_categories',
  'reversals',
  'shifts',
  'current_shift',
  'tables',
  'notifications',
  'deletion_history',
]);

// Backward compatible export
export const BUSINESS_DATA_KEYS = DB_COLLECTION_KEYS;

export function cleanLegacyDataFromLocalStorage() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const keys = Object.keys(window.localStorage);
    for (const k of keys) {
      if (k.startsWith('rms_pos_v1_')) {
        window.localStorage.removeItem(k);
        continue;
      }
      if (k.startsWith(STORAGE_PREFIX)) {
        const rawKey = k.slice(STORAGE_PREFIX.length);
        if (!ALLOWED_LOCAL_STORAGE_KEYS.has(rawKey)) {
          window.localStorage.removeItem(k);
        }
      }
    }
  } catch {}
}

function isLocalStorageAvailable() {
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' && window.localStorage !== null) {
      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export const storage = {
  get: (key, defaultValue = null) => {
    try {
      if (!ALLOWED_LOCAL_STORAGE_KEYS.has(key)) {
        if (isLocalStorageAvailable()) {
          // Clean up if residual legacy data exists in browser localStorage
          window.localStorage.removeItem(STORAGE_PREFIX + key);
        }
        return memoryStore.has(STORAGE_PREFIX + key)
          ? memoryStore.get(STORAGE_PREFIX + key)
          : defaultValue;
      }

      if (isLocalStorageAvailable()) {
        const item = window.localStorage.getItem(STORAGE_PREFIX + key);
        if (item !== null && item !== undefined) {
          return JSON.parse(item);
        }
      }
      return memoryStore.has(STORAGE_PREFIX + key)
        ? memoryStore.get(STORAGE_PREFIX + key)
        : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  set: (key, value) => {
    try {
      memoryStore.set(STORAGE_PREFIX + key, value);

      if (isLocalStorageAvailable()) {
        if (!ALLOWED_LOCAL_STORAGE_KEYS.has(key)) {
          // Never dump database collections or runtime operational states into browser localStorage
          window.localStorage.removeItem(STORAGE_PREFIX + key);
          return true;
        }
        window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
        return true;
      }
      return true;
    } catch {
      return false;
    }
  },

  remove: (key) => {
    try {
      if (isLocalStorageAvailable()) {
        window.localStorage.removeItem(STORAGE_PREFIX + key);
      }
      memoryStore.delete(STORAGE_PREFIX + key);
      return true;
    } catch {
      return false;
    }
  },

  clearAll: () => {
    try {
      if (isLocalStorageAvailable()) {
        const keys = Object.keys(window.localStorage);
        keys.forEach((k) => {
          if (k.startsWith(STORAGE_PREFIX)) {
            window.localStorage.removeItem(k);
          }
        });
      }
      memoryStore.clear();
      return true;
    } catch {
      return false;
    }
  },

  clear: () => {
    return storage.clearAll();
  },
};

// Clean legacy and database collection dumps from localStorage on initialize
cleanLegacyDataFromLocalStorage();

export default storage;
