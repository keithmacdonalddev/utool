const express = require('express');
const {
  getAuditLogs,
  searchAuditLogs,
  getAdminLogs,
  getSystemHealth,
} = require('../controllers/auditLogController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { ACCESS_LEVELS } = require('../config/permissions');

const router = express.Router();

// Protect all routes
router.use(protect);

// Admin-only routes
router.get('/', authorize('auditLogs', ACCESS_LEVELS.FULL), getAuditLogs);
router.get(
  '/search',
  authorize('auditLogs', ACCESS_LEVELS.FULL),
  searchAuditLogs
);

// New admin-only routes for enhanced logging
router.get('/admin', authorize('auditLogs', ACCESS_LEVELS.FULL), getAdminLogs);
router.get(
  '/admin/system-health',
  authorize('auditLogs', ACCESS_LEVELS.FULL),
  getSystemHealth
);

module.exports = router;
