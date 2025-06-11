import express from 'express';
const router = express.Router({ mergeParams: true });
import { protect, authorize } from '../middleware/authMiddleware.js';
import { ACCESS_LEVELS } from '../config/permissions.js';
import {
  getCommentsForArticle,
  createComment,
  updateComment,
  deleteComment,
} from '../controllers/commentController.js';
import {
  getCommentsForEntity,
  createCommentForEntity,
  updateComment as updateProjectComment,
  deleteComment as deleteProjectComment,
} from '../controllers/projectCommentController.js';

// Apply protect middleware to all comment routes
router.use(protect);

// Routes mounted under /api/v1/kb/:id/comments
// User needs at least READ access to the parent KB article to view/add comments
router
  .route('/')
  .get(authorize('knowledgeBase', ACCESS_LEVELS.READ), getCommentsForArticle)
  .post(authorize('knowledgeBase', ACCESS_LEVELS.READ), createComment);

// Routes mounted under /api/v1/comments/:commentId (for specific comment actions)
// We need a separate router instance for this or handle it differently in server.js
// Let's create a separate router for standalone comment actions first.

const commentActionsRouter = express.Router();
commentActionsRouter.use(protect); // Protect these routes too

// Routes for entity-specific comments (projects/tasks)
// Format: /api/v1/comments/:entityType/:entityId
commentActionsRouter
  .route('/:entityType/:entityId')
  .get(authorize('projects', ACCESS_LEVELS.READ), getCommentsForEntity)
  .post(authorize('projects', ACCESS_LEVELS.READ), createCommentForEntity);

// Routes for specific comment operations
// Format: /api/v1/comments/:commentId
// Handles both KB comments and project/task comments
commentActionsRouter
  .route('/:commentId')
  .put(async (req, res, next) => {
    try {
      // Determine comment type by checking the comment
      const Comment = await import('../models/Comment.js');
      const comment = await Comment.default.findById(req.params.commentId);

      if (!comment) {
        return res
          .status(404)
          .json({ success: false, message: 'Comment not found' });
      }

      // Route to appropriate controller based on comment type
      if (
        comment.targetType &&
        ['Project', 'Task'].includes(comment.targetType)
      ) {
        return updateProjectComment(req, res, next);
      } else {
        return updateComment(req, res, next);
      }
    } catch (error) {
      next(error);
    }
  })
  .delete(async (req, res, next) => {
    try {
      // Determine comment type by checking the comment
      const Comment = await import('../models/Comment.js');
      const comment = await Comment.default.findById(req.params.commentId);

      if (!comment) {
        return res
          .status(404)
          .json({ success: false, message: 'Comment not found' });
      }

      // Route to appropriate controller based on comment type
      if (
        comment.targetType &&
        ['Project', 'Task'].includes(comment.targetType)
      ) {
        return deleteProjectComment(req, res, next);
      } else {
        return deleteComment(req, res, next);
      }
    } catch (error) {
      next(error);
    }
  });

// Export both routers
export { router as articleCommentsRouter, commentActionsRouter };
