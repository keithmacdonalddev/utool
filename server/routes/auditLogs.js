import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { ACCESS_LEVELS } from '../config/permissions.js';
import {
  getAuditLogs,
  searchAuditLogs,
} from '../controllers/auditLogController.js';

const router = express.Router();

// Protect all routes
router.use(protect);

// Only keep essential server-side routes
router.route('/').get(authorize('auditLogs', ACCESS_LEVELS.READ), getAuditLogs);

router
  .route('/search')
  .get(authorize('auditLogs', ACCESS_LEVELS.READ), searchAuditLogs);

export default router;
