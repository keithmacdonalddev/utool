import express from 'express';
import {
  register,
  login,
  logout,
  getMe,
  verifyEmail,
  resendVerificationLink,
  updateMe,
} from '../controllers/authController.js';

import { protect } from '../middleware/authMiddleware.js';
import User from '../models/User.js';

const router = express.Router();

// Add special logging middleware just for the logout route
router.post(
  '/logout',
  async (req, res, next) => {
    try {
      // Try to get user info from the token before it's checked by the protect middleware
      // This ensures we have user info even if the token is blacklisted
      let userEmail = 'unknown';
      let userId = req.logoutUserId || 'unknown';

      if (userId !== 'unknown') {
        // Look up user by ID
        const user = await User.findById(userId);
        if (user) {
          userEmail = user.email;
        }
      }

      // Direct console log before controller is called
      console.log(`Logout attempt for user: ${userEmail} (${userId})`);

      // Attach user info to request for the controller
      req.logoutUserInfo = { email: userEmail, id: userId };

      // Custom response monitoring
      const originalSend = res.send;
      res.send = function (data) {
        console.log(
          `Logout response being sent: ${data.toString().substring(0, 100)}...`
        );
        console.log(`Logout successful for user: ${userEmail} (${userId})`);
        return originalSend.call(this, data);
      };

      next();
    } catch (err) {
      console.error('Error in logout middleware:', err);
      next();
    }
  },
  protect,
  logout
);

// All other routes
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', resendVerificationLink);
router.put('/updateme', protect, updateMe);

export default router;
