const express = require('express');
const router = express.Router();
const {
  getNotes,
  createNote,
  getNote,
  updateNote,
  softDeleteNote,
  restoreNote,
  hardDeleteNote,
  adminGetAllNotes,
} = require('../controllers/personalNoteController');
const { protect } = require('../middleware/authMiddleware');

console.log('[NOTES ROUTER] personalNotes.js loaded. Registering personal notes routes.');

// User notes routes (require authentication)
router
  .route('/')
  .get(protect, getNotes)
  .post(protect, createNote);

router
  .route('/:id')
  .get(protect, getNote)
  .put(protect, updateNote)
  .delete(protect, softDeleteNote);

router
  .route('/:id/restore')
  .patch(protect, restoreNote);

router
  .route('/:id/permanent')
  .delete(protect, hardDeleteNote);

// Catch-all for unmatched /api/v1/notes routes
router.use((req, res) => {
  console.warn(`[NOTES ROUTER] 404: No route for ${req.method} ${req.originalUrl}`);
  res.status(404).json({ success: false, message: `No such notes route: ${req.method} ${req.originalUrl}` });
});

module.exports = router;
