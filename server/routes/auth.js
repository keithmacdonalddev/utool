const express = require('express');
const router = express.Router();
const {
  register,
  login,
  verifyEmail,
  resendVerificationLink,
  getMe,    // Import getMe
  updateMe, // Import updateMe
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware'); // Only need protect here

router.post('/register', register);
router.post('/login', login);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', resendVerificationLink);

// Routes for logged-in user's own profile
router.get('/me', protect, getMe);       // Get current user details
router.put('/updateme', protect, updateMe); // Update current user details (name, email)
// TODO: Add route for password update later: router.put('/updatepassword', protect, updateMyPassword);


module.exports = router;
