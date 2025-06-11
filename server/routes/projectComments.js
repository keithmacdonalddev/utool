/**
 * Project Comment Routes
 *
 * API routes for handling comments on projects and tasks.
 * Provides RESTful endpoints for comment CRUD operations with proper authorization.
 *
 * Routes:
 * - GET /api/v1/comments/:entityType/:entityId - Get all comments for entity
 * - POST /api/v1/comments/:entityType/:entityId - Create new comment
 * - PUT /api/v1/comments/:commentId - Update comment
 * - DELETE /api/v1/comments/:commentId - Delete comment
 */

import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { ACCESS_LEVELS } from '../config/permissions.js';
import {
  getCommentsForEntity,
  createCommentForEntity,
  updateComment,
  deleteComment,
} from '../controllers/projectCommentController.js';

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

/**
 * Routes for entity-specific comments (projects/tasks)
 * Format: /api/v1/comments/:entityType/:entityId
 * entityType: 'Project' or 'Task'
 * entityId: MongoDB ObjectId of the entity
 */
router
  .route('/:entityType/:entityId')
  .get(authorize('projects', ACCESS_LEVELS.READ), getCommentsForEntity)
  .post(
    authorize('projects', ACCESS_LEVELS.READ), // Users with read access can comment
    createCommentForEntity
  );

/**
 * Routes for specific comment operations
 * Format: /api/v1/comments/:commentId
 * Handles updates and deletions of individual comments
 */
router
  .route('/:commentId')
  .put(updateComment) // No additional authorization - handled in controller
  .delete(deleteComment); // No additional authorization - handled in controller

export default router;
