const express = require('express');
const {
  getAuditLogs,
  searchAuditLogs,
  getAdminLogs, // Add new controller function
  getSystemHealth, // Add new controller function
} = require('../controllers/auditLogController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { ACCESS_LEVELS } = require('../config/permissions');

const router = express.Router();

// Protect all routes
router.use(protect);

// Admin-only routes
router.get('/', authorize('admin'), getAuditLogs);
router.get('/search', authorize('admin'), searchAuditLogs);

// New admin-only routes for enhanced logging
router.get('/admin', authorize('admin'), getAdminLogs);
router.get('/admin/system-health', authorize('admin'), getSystemHealth);

module.exports = router;
