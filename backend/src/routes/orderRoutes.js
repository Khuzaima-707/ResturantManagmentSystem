import { Router } from 'express';
import {
  createOrder,
  getAllOrders,
  getOrderById,
  seedOrders,
  updateKitchenStatus,
} from '../controllers/orderController.js';
import {
  createOrderSchema,
  validate,
} from '../validators/orderValidator.js';

const router = Router();

// Collection routes
router.get('/', getAllOrders);
router.post('/', validate(createOrderSchema), createOrder);

// Seed sample orders
router.post('/seed', seedOrders);

// Single order routes
router.get('/:id', getOrderById);
router.patch('/:id/kitchen-status', updateKitchenStatus);

export default router;
