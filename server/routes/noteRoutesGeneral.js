const express = require('express');
const router = express.Router();

// Import middleware
const { protect } = require('../middleware/authMiddleware');

// Import controller functions
const { getRecentNotes } = require('../controllers/noteController');

// All routes below this will use the 'protect' middleware
router.use(protect);

// Define routes
router.get('/recent', getRecentNotes); // Get recent notes for the logged-in user

// Add other general note routes here later if needed (e.g., search all notes)

module.exports = router;
