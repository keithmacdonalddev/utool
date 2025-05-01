import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { ACCESS_LEVELS } from '../config/permissions.js';
import {
  getAuditLogs,
  searchAuditLogs,
  deleteAuditLogsByDateRange,
  getAuditLogFilters,
  getUserActivitySummary,
  getResourceAuditLogs,
} from '../controllers/auditLogController.js';

const router = express.Router();

// Protect all routes
router.use(protect);

// Only keep essential server-side routes
router
  .route('/')
  .get(authorize('auditLogs', ACCESS_LEVELS.READ), getAuditLogs)
  .delete(
    authorize('auditLogs', ACCESS_LEVELS.FULL),
    deleteAuditLogsByDateRange
  );

router
  .route('/search')
  .get(authorize('auditLogs', ACCESS_LEVELS.READ), searchAuditLogs);

// New routes for enhanced audit log capabilities
router
  .route('/filters')
  .get(authorize('auditLogs', ACCESS_LEVELS.READ), getAuditLogFilters);

router
  .route('/users/:userId/summary')
  .get(authorize('auditLogs', ACCESS_LEVELS.READ), getUserActivitySummary);

router
  .route('/resources/:resourceType/:resourceId')
  .get(authorize('auditLogs', ACCESS_LEVELS.READ), getResourceAuditLogs);

/**
 * TODO: Future Enhancements for Audit Logging System
 *
 * 1. Create a unified logging dashboard for both system and business events
 *    - Develop a React component that provides a comprehensive view of all log types
 *    - Implement real-time log streaming using Socket.IO
 *    - Add visualization components (charts, graphs) for log analysis
 *    - Create customizable dashboards based on user preferences
 *    - Priority: High
 *
 * 2. Add correlation between access logs and audit logs for end-to-end tracing
 *    - Implement correlation IDs that span across different log types
 *    - Create API endpoints to query related logs by correlation ID
 *    - Build a timeline view showing the complete request flow from access to business logic
 *    - Add metadata to logs to support detailed tracing
 *    - Priority: Medium
 *
 * 3. Implement developer tools to replay user sessions from logs
 *    - Create a session reconstruction tool from audit trails
 *    - Build a UI to visualize and replay user journeys
 *    - Implement filters to focus on specific user actions or workflows
 *    - Add export functionality for session replays
 *    - Priority: Low
 *
 * 4. ELK Stack Integration
 *    - Configure Filebeat for automated log collection
 *    - Set up Elasticsearch for advanced log search and analysis
 *    - Create Kibana dashboards for visualization
 *    - Implement log alerts based on patterns or thresholds
 *    - Priority: Medium
 */

export default router;
