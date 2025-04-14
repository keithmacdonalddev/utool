const express = require('express');
const {
  getAuditLogs,
  searchAuditLogs,
} = require('../controllers/auditLogController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { ACCESS_LEVELS } = require('../config/permissions');

const router = express.Router();

router
  .route('/')
  .get(protect, authorize('auditLogs', ACCESS_LEVELS.FULL), getAuditLogs);

router
  .route('/search')
  .get(protect, authorize('auditLogs', ACCESS_LEVELS.FULL), searchAuditLogs);

module.exports = router;
