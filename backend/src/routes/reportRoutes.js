import { Router } from 'express';
import {
  getDashboardMetrics,
  getSalesReport,
  getRevenueReport,
} from '../controllers/reportController.js';

const router = Router();

// Dashboard overview & KPIs
router.get('/dashboard', getDashboardMetrics);

// Detailed reports
router.get('/sales', getSalesReport);
router.get('/revenue', getRevenueReport);

export default router;
