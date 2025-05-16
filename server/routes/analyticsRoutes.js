import express from 'express';
import {
  getGuestAnalyticsSummary,
  endGuestSession,
} from '../controllers/analyticsController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { ACCESS_LEVELS } from '../config/permissions.js';

const router = express.Router();

// Admin routes for analytics
router.get(
  '/guest-summary',
  protect,
  authorize('analytics', ACCESS_LEVELS.READ),
  getGuestAnalyticsSummary
);

// Public route to end a session
router.put('/guest-session/:sessionId/end', endGuestSession);

export default router;
