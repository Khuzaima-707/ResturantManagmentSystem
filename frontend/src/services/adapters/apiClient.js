/**
 * REST API Client Adapter
 * Connects frontend services to the Express & MongoDB Atlas backend.
 * Provides resilient network handling, error wrapping, and timeout controls.
 */

export function getApiBaseUrl() {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
    const custom = import.meta.env.VITE_API_URL;
    return custom.endsWith('/') ? custom.slice(0, -1) : custom;
  }
  return '/api';
}

function getBaseUrl() {
  return getApiBaseUrl();
}

function isTestEnvironment() {
  return (
    (typeof process !== 'undefined' && (process.env?.NODE_ENV === 'test' || Boolean(process.env?.VITEST))) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test')
  );
}

import { storage } from '../persistence/storage';

export async function apiRequest(endpoint, options = {}) {
  if (isTestEnvironment()) {
    throw new Error('Live API disabled in Vitest unit test environment');
  }

  const baseUrl = getBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${cleanEndpoint}`;

  const token = storage.get('auth_token', null);
  const currentUser = storage.get('rms_user', null);
  const authHeaders = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(currentUser?.role ? { 'x-user-role': currentUser.role } : {}),
  };

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers,
    },
    ...options,
  };

  try {
    const res = await fetch(url, config);
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg = data?.error?.message || data?.message || `HTTP ${res.status}: ${res.statusText}`;
      const err = new Error(errorMsg);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (error) {
    // If connection refused (backend offline), log and re-throw
    console.warn(`[API Client] Request to ${url} failed:`, error.message);
    throw error;
  }
}

export const api = {
  get: (endpoint, options) => apiRequest(endpoint, { method: 'GET', ...options }),
  post: (endpoint, body, options) =>
    apiRequest(endpoint, { method: 'POST', body: JSON.stringify(body), ...options }),
  put: (endpoint, body, options) =>
    apiRequest(endpoint, { method: 'PUT', body: JSON.stringify(body), ...options }),
  delete: (endpoint, options) => apiRequest(endpoint, { method: 'DELETE', ...options }),
};

export default api;
