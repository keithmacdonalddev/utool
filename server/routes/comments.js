const express = require('express');
// mergeParams allows accessing :articleId when this router is mounted under /kb/:articleId/comments
// and :commentId when mounted under /comments/:commentId
const router = express.Router({ mergeParams: true });

const { protect } = require('../middleware/authMiddleware'); // Use protect middleware
// Note: Authorization for specific actions (update/delete) is handled within the controller

const {
    getCommentsForArticle,
    createComment,
    updateComment,
    deleteComment
} = require('../controllers/commentController');

// Apply protect middleware to all comment routes
router.use(protect);
// Import authorize and ACCESS_LEVELS
const { authorize } = require('../middleware/authMiddleware');
const { ACCESS_LEVELS } = require('../config/permissions');

// Routes mounted under /api/v1/kb/:id/comments
// User needs at least READ access to the parent KB article to view/add comments
router.route('/')
    .get(authorize('knowledgeBase', ACCESS_LEVELS.READ), getCommentsForArticle)
    .post(authorize('knowledgeBase', ACCESS_LEVELS.READ), createComment);

// Routes mounted under /api/v1/comments/:commentId (for specific comment actions)
// We need a separate router instance for this or handle it differently in server.js
// Let's create a separate router for standalone comment actions first.

const commentActionsRouter = express.Router();
commentActionsRouter.use(protect); // Protect these routes too

commentActionsRouter.route('/:commentId')
    .put(updateComment)    // Update a specific comment
    .delete(deleteComment); // Delete a specific comment

// Export both routers
module.exports = {
    articleCommentsRouter: router, // Router for actions nested under articles
    commentActionsRouter: commentActionsRouter // Router for direct comment actions
};
