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

commentActionsRouter
  .route('/:commentId')
  .put(updateComment) // Update a specific comment
  .delete(deleteComment); // Delete a specific comment

// Export both routers
export { router as articleCommentsRouter, commentActionsRouter };
