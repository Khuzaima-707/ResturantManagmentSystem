/**
 * Repository Interface Contracts
 * Abstraction layer decoupling frontend UI from storage mechanism
 * In future phase, these interfaces will be swapped to REST API endpoints
 */

export const ICategoryRepository = {
  getAll: async () => {},
  getById: async (_id) => {},
  create: async (_category) => {},
  update: async (_id, _data) => {},
  delete: async (_id) => {},
};

export const IItemRepository = {
  getAll: async () => {},
  getById: async (_id) => {},
  create: async (_item) => {},
  update: async (_id, _data) => {},
  delete: async (_id) => {},
};

export const IAddonRepository = {
  getAll: async () => {},
  getById: async (_id) => {},
  create: async (_addon) => {},
  update: async (_id, _data) => {},
  delete: async (_id) => {},
};

export const IOrderRepository = {
  getAll: async () => {},
  getById: async (_id) => {},
  create: async (_order) => {},
  update: async (_id, _data) => {},
};

export const IReversalRepository = {
  getAll: async () => {},
  create: async (_reversal) => {},
};

export const ISettingsRepository = {
  getSettings: async () => {},
  updateSettings: async (_settings) => {},
  resetAllData: async () => {},
};
