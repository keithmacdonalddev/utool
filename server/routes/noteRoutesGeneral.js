const express = require('express');
const router = express.Router();

// Import middleware
const { protect } = require('../middleware/authMiddleware');

// Import controller functions
const {
  getRecentNotes,
  deleteNote,
  permanentlyDeleteNote,
  restoreNote,
  getTrashedNotes,
  emptyTrash,
} = require('../controllers/noteController');

// All routes below this will use the 'protect' middleware
router.use(protect);

// Define routes
router.get('/recent', getRecentNotes); // Get recent notes for the logged-in user

// Trash-related routes
router.get('/trash', getTrashedNotes); // Get all trashed notes
router.delete('/trash/empty', emptyTrash); // Empty trash (permanently delete all trashed notes)

// Individual note operations
router.route('/:id').delete(deleteNote); // Soft delete (move to trash)

router.put('/:id/restore', restoreNote); // Restore from trash
router.delete('/:id/permanent', permanentlyDeleteNote); // Permanently delete a note

// Add other general note routes here later if needed (e.g., search all notes)

module.exports = router;
