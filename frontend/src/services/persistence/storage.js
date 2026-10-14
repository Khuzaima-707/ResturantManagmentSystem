/**
 * Frontend Persistence Helpers
 * Safe localStorage wrapper with memory fallback for SSR / Node / Vitest
 */

const STORAGE_PREFIX = 'rms_pos_v1_';
const memoryStore = new Map();

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
      if (isLocalStorageAvailable()) {
        const item = window.localStorage.getItem(STORAGE_PREFIX + key);
        return item ? JSON.parse(item) : defaultValue;
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
      if (isLocalStorageAvailable()) {
        window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
        return true;
      }
      memoryStore.set(STORAGE_PREFIX + key, JSON.parse(JSON.stringify(value)));
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

export default storage;
