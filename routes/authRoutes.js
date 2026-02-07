import express from 'express';
import { registerUser, verifyOTP, loginUser, googleLogin, getMe } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/verify-otp', verifyOTP);
router.post('/login', loginUser);
router.post('/google', googleLogin);
router.get('/me', protect, getMe);

export default router;
