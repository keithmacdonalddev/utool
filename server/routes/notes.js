const express = require('express');
// We need to merge params to access :taskId from the parent router (tasks)
const router = express.Router({ mergeParams: true });

// Import middleware
const { protect, authorize } = require('../middleware/authMiddleware'); // Added authorize
const { ACCESS_LEVELS } = require('../config/permissions'); // Import ACCESS_LEVELS

// Import controller functions
const {
    getNotesForTask,
    createNoteForTask
    // getNote, // For getting a single note later
    // updateNote, // For updating later
    // deleteNote // For deleting later
} = require('../controllers/noteController');

// Protect is applied first
router.use(protect);
// Note: Authorization for accessing the parent task is handled where this router is mounted in tasks.js

// Define routes relative to the parent task route (e.g., /api/v1/tasks/:taskId/notes)
router.route('/')
    // Reading notes requires 'read' access for notes feature
    .get(authorize('notes', ACCESS_LEVELS.READ), getNotesForTask)
    // Creating notes requires 'own' access for notes feature
    .post(authorize('notes', ACCESS_LEVELS.OWN), createNoteForTask);

// Routes for specific note ID (add later with controllers)
router.route('/:noteId') // Changed param to :noteId for clarity
    // Reading a specific note requires 'read' access
    .get(authorize('notes', ACCESS_LEVELS.READ), (req, res) => res.status(501).json({ message: 'Get single note not implemented' })) // Placeholder
    // Updating requires 'own' access
    .put(authorize('notes', ACCESS_LEVELS.OWN), (req, res) => res.status(501).json({ message: 'Update note not implemented' })) // Placeholder
    // Deleting requires 'own' access
    .delete(authorize('notes', ACCESS_LEVELS.OWN), (req, res) => res.status(501).json({ message: 'Delete note not implemented' })); // Placeholder

module.exports = router;
