import express from 'express';
import { login, getMe, logout, changePassword, updateProfile } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/logout', logout);
router.put('/change-password', changePassword);
router.put('/profile', updateProfile);

export default router;
