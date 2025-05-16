// server/routes/adminSettingsRoutes.js
import express from 'express';
import {
  getGuestAccessSettings,
  updateGuestAccessSettings,
} from '../controllers/adminSettingsController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { ACCESS_LEVELS } from '../config/permissions.js';

const router = express.Router();

// Admin route to update guest access settings
router.route('/guest-access').put(
  protect, // Ensures user is authenticated
  authorize('siteSettings', ACCESS_LEVELS.FULL), // Ensures user is Admin with full access to siteSettings
  updateGuestAccessSettings
);

// Note: The GET /api/v1/settings/guest-access for public consumption
// will be defined in a separate publicSettingsRoutes.js file or directly in server.js
// to avoid applying admin-level auth middleware to it.

export default router;
