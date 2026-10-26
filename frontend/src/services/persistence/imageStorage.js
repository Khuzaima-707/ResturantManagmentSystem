/**
 * Image Storage Service
 * Stores uploaded food item photos safely in browser IndexedDB (avoiding localStorage quota limits).
 * Includes memory fallback for headless/Node/Vitest environments.
 */

import { getApiBaseUrl } from '../adapters/apiClient';

const DB_NAME = 'rms_pos_images_v1';
const STORE_NAME = 'food_images';
const DB_VERSION = 1;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// In-memory fallback
const memoryStorage = new Map();
const objectUrlRegistry = new Map();

/**
 * Opens or initializes IndexedDB database
 */
function openDB() {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onerror = () => {
        resolve(null); // Fallback to memory
      };
    } catch {
      resolve(null);
    }
  });
}

/**
 * Validates image file type and file size
 */
export function validateImageFile(file) {
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file format. Please upload JPG, PNG, WebP, or GIF.',
    };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File is too large (${sizeMb} MB). Maximum allowed size is 5 MB.`,
    };
  }

  return { valid: true, error: null };
}

/**
 * Converts a file/blob to a Base64 data URL (for instant preview)
 */
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }

    if (typeof FileReader === 'undefined') {
      if (typeof Buffer !== 'undefined' && typeof file.text === 'function') {
        file.text().then((txt) => {
          const b64 = Buffer.from(txt).toString('base64');
          resolve(`data:${file.type || 'image/jpeg'};base64,${b64}`);
        }).catch(() => resolve(null));
        return;
      }
      resolve(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Normalizes uploaded image to an exact, standardized uniform square frame (1:1, 600x600 px).
 * Solves all camera aspect-ratio discrepancies by center-cropping and rendering to a standard canvas.
 */
export function normalizeAndCropImage(file, { targetSize = 500, quality = 0.88 } = {}) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }

    // In non-DOM / test environments, fallback to fileToDataUrl
    if (typeof window === 'undefined' || typeof document === 'undefined' || typeof Image === 'undefined') {
      fileToDataUrl(file).then(resolve).catch(reject);
      return;
    }

    const objectUrl = typeof URL !== 'undefined' && URL.createObjectURL ? URL.createObjectURL(file) : null;
    const cleanup = () => {
      if (objectUrl && typeof URL !== 'undefined' && URL.revokeObjectURL) {
        try { URL.revokeObjectURL(objectUrl); } catch {}
      }
    };

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          cleanup();
          fileToDataUrl(file).then(resolve).catch(reject);
          return;
        }

        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium';

        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, targetSize, targetSize);

        const standardizedUrl = canvas.toDataURL('image/jpeg', quality);
        cleanup();
        resolve(standardizedUrl);
      } catch {
        cleanup();
        fileToDataUrl(file).then(resolve).catch(reject);
      }
    };

    img.onerror = () => {
      cleanup();
      fileToDataUrl(file).then(resolve).catch(reject);
    };

    if (objectUrl) {
      img.src = objectUrl;
    } else {
      fileToDataUrl(file)
        .then((url) => {
          if (url) {
            img.src = url;
          } else {
            resolve(null);
          }
        })
        .catch(reject);
    }
  });
}

/**
 * Converts a Base64 data URL to a standard Blob object
 */
export function dataUrlToBlob(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    return null;
  }
  try {
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch {
    return null;
  }
}

/**
 * Saves image to IndexedDB and returns image metadata
 */
export async function saveImage(id, blobOrFile) {
  if (!id) throw new Error('Image ID is required');

  const record = {
    id,
    data: blobOrFile,
    mimeType: blobOrFile?.type || 'image/jpeg',
    updatedAt: new Date().toISOString(),
  };

  const db = await openDB();
  if (db) {
    await new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(record);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  } else {
    memoryStorage.set(id, record);
  }

  // Create an object URL if possible
  if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function' && blobOrFile instanceof Blob) {
    // Revoke old URL if registered
    if (objectUrlRegistry.has(id)) {
      try {
        URL.revokeObjectURL(objectUrlRegistry.get(id));
      } catch {}
    }
    const objectUrl = URL.createObjectURL(blobOrFile);
    objectUrlRegistry.set(id, objectUrl);
    return { id, url: objectUrl };
  }

  return { id, url: null };
}

/**
 * Retrieves image blob or URL from IndexedDB
 */
export async function getImage(id) {
  if (!id) return null;

  if (objectUrlRegistry.has(id)) {
    return objectUrlRegistry.get(id);
  }

  const db = await openDB();
  let record = null;

  if (db) {
    record = await new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  } else {
    record = memoryStorage.get(id) || null;
  }

  if (record && record.data instanceof Blob && typeof URL !== 'undefined' && URL.createObjectURL) {
    const objectUrl = URL.createObjectURL(record.data);
    objectUrlRegistry.set(id, objectUrl);
    return objectUrl;
  }

  return null;
}

/**
 * Deletes an image from storage
 */
export async function deleteImage(id) {
  if (!id) return;

  if (objectUrlRegistry.has(id)) {
    try {
      URL.revokeObjectURL(objectUrlRegistry.get(id));
    } catch {}
    objectUrlRegistry.delete(id);
  }

  const db = await openDB();
  if (db) {
    await new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  } else {
    memoryStorage.delete(id);
  }
  return true;
}

/**
 * Clears all images from IndexedDB, object URL registry, and memory cache.
 * Used during application data reset.
 */
export async function clearAllImages() {
  if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
    for (const url of objectUrlRegistry.values()) {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    }
  }
  objectUrlRegistry.clear();
  memoryStorage.clear();

  const db = await openDB();
  if (db) {
    await new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }
  return true;
}

/**
 * Uploads an image (base64 data URL or File/Blob) to Cloudinary via backend API.
 * Returns the permanent HTTPS CDN URL (or null on fallback/offline).
 */
export async function uploadImageToCloudinary(dataUrlOrFile, folder = 'rms_pos/menu') {
  if (!dataUrlOrFile) return null;

  try {
    let base64String = dataUrlOrFile;
    if (typeof dataUrlOrFile !== 'string') {
      base64String = await fileToDataUrl(dataUrlOrFile);
    }

    if (!base64String || typeof base64String !== 'string') return null;

    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: base64String,
        folder: folder || 'rms_pos/menu',
      }),
    });

    const json = await res.json();
    if (json.success && json.data?.url) {
      return json.data.url;
    }
  } catch (err) {
    console.warn('[Cloudinary Upload Offline Fallback]:', err.message);
  }

  return null;
}
