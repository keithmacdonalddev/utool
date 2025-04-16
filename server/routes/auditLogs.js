const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const { ACCESS_LEVELS } = require('../config/permissions');
const {
  getAuditLogs,
  searchAuditLogs,
} = require('../controllers/auditLogController');

const router = express.Router();

// Protect all routes
router.use(protect);

// Only keep essential server-side routes
router.route('/').get(authorize('auditLogs', ACCESS_LEVELS.READ), getAuditLogs);

router
  .route('/search')
  .get(authorize('auditLogs', ACCESS_LEVELS.READ), searchAuditLogs);

module.exports = router;
