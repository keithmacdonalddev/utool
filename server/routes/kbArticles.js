const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { ACCESS_LEVELS } = require('../config/permissions'); // Import ACCESS_LEVELS

const {
    getKbArticles,
    createKbArticle,
    getKbArticle,
    updateKbArticle,
    deleteKbArticle,
    getKbArticleVersions,
    getKbArticleVersion,
    restoreKbArticleVersion,
    searchKbArticles,
} = require('../controllers/kbController'); // Import controller functions (to be created next)

// Protect all routes first
router.use(protect);

// Apply authorization middleware per route/method
router.route('/')
    .get(authorize('knowledgeBase', ACCESS_LEVELS.READ), getKbArticles)
    .post(authorize('knowledgeBase', ACCESS_LEVELS.CREATE_EDIT), createKbArticle); // Pro users need create_edit

router.route('/:id')
    .get(authorize('knowledgeBase', ACCESS_LEVELS.READ), getKbArticle)
    .put(authorize('knowledgeBase', ACCESS_LEVELS.CREATE_EDIT), updateKbArticle) // Pro users need create_edit to update any
    .delete(authorize('knowledgeBase', ACCESS_LEVELS.CREATE_EDIT), deleteKbArticle); // Pro users need create_edit to delete any

router.route('/:id/versions')
    .get(authorize('knowledgeBase', ACCESS_LEVELS.READ), getKbArticleVersions);

router.route('/:id/versions/:versionId')
    .get(authorize('knowledgeBase', ACCESS_LEVELS.READ), getKbArticleVersion);

router.route('/:id/versions/:versionId/restore')
    .post(authorize('knowledgeBase', ACCESS_LEVELS.CREATE_EDIT), restoreKbArticleVersion); // Restoring requires higher privilege

// Search requires read access
router.route('/search')
    .post(authorize('knowledgeBase', ACCESS_LEVELS.READ), searchKbArticles);

// --- Mount Comment Router ---
// Import the specific router for comments nested under articles
const { articleCommentsRouter } = require('./comments');
// Mount it on the specific article route, using the same param name ':id'
// This ensures that requests like GET /api/v1/kb/someArticleId/comments are handled by articleCommentsRouter
// and the :id param will be available via req.params in that router due to mergeParams: true
router.use('/:id/comments', articleCommentsRouter); // Changed :articleId to :id
// --- End Mount Comment Router ---


module.exports = router;
