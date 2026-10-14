import express from 'express';
import { login, getMe, logout, changePassword } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/logout', logout);
router.put('/change-password', changePassword);

export default router;
