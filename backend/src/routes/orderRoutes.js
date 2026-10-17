import { Router } from 'express';
import {
  createOrder,
  getAllOrders,
  getOrderById,
  seedOrders,
  updateKitchenStatus,
  getNextInvoiceNumberHandler,
} from '../controllers/orderController.js';
import {
  createOrderSchema,
  validate,
} from '../validators/orderValidator.js';

const router = Router();

// Collection routes
router.get('/', getAllOrders);
router.post('/', validate(createOrderSchema), createOrder);

// Next invoice sequence endpoint (must be before /:id)
router.get('/next-invoice-number', getNextInvoiceNumberHandler);

// Seed sample orders
router.post('/seed', seedOrders);

// Single order routes
router.get('/:id', getOrderById);
router.patch('/:id/kitchen-status', updateKitchenStatus);

export default router;
