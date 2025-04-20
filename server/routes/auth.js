import express from 'express';
const router = express.Router();
import {
  register,
  login,
  verifyEmail,
  resendVerificationLink,
  getMe,
  updateMe,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

router.post('/register', register);
router.post('/login', login);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', resendVerificationLink);

// Routes for logged-in user's own profile
router.get('/me', protect, getMe); // Get current user details
router.put('/updateme', protect, updateMe); // Update current user details (name, email)
// TODO: Add route for password update later: router.put('/updatepassword', protect, updateMyPassword);

export default router;
