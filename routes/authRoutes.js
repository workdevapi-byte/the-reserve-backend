import express from 'express';
import { registerUser, verifyOTP, loginUser, googleLogin, forgotPassword, validateResetToken, resetPassword, verifyPassword, getMe } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/verify-otp', verifyOTP);
router.post('/login', loginUser);
router.post('/google', googleLogin);
router.post('/forgot-password', forgotPassword);
router.get('/validate-reset-token', validateResetToken);
router.post('/reset-password', resetPassword);
router.post('/verify-password', protect, verifyPassword);
router.get('/me', protect, getMe);


export default router;
