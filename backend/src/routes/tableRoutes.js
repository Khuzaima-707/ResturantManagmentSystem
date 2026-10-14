import { Router } from 'express';
import {
  getAllTables,
  getTableById,
  createTable,
  updateTable,
  deleteTable,
  occupyTable,
  releaseTable,
  seedTables,
} from '../controllers/tableController.js';
import {
  createTableSchema,
  updateTableSchema,
  validate,
} from '../validators/tableValidator.js';

const router = Router();

// Collection routes
router.get('/', getAllTables);
router.post('/', validate(createTableSchema), createTable);

// Seed tables
router.post('/seed', seedTables);

// Occupancy actions
router.post('/:id/occupy', occupyTable);
router.post('/:id/release', releaseTable);

// Single table routes
router.get('/:id', getTableById);
router.put('/:id', validate(updateTableSchema), updateTable);
router.delete('/:id', deleteTable);

export default router;
