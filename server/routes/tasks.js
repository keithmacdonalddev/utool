const express = require('express');
// Merge params allows accessing :projectId if this router is mounted under projects/:projectId/tasks
const router = express.Router({ mergeParams: true });

// Import middleware
const { protect, authorize } = require('../middleware/authMiddleware');
const { ACCESS_LEVELS } = require('../config/permissions'); // Import ACCESS_LEVELS

// Import controller functions
const {
    getTasks, // This likely needs modification to handle projectId from mergeParams
    createTask,
    // getTask, // For getting a single task later
    // updateTask, // For updating later
    // deleteTask // For deleting later
} = require('../controllers/taskController');

// Re-route into other resource routers
const noteRouter = require('./notes'); // Import the note router

// All routes below this will use the 'protect' middleware
router.use(protect);

// Mount the note router for task-specific notes
// Ensure user has at least read access to the task before accessing its notes
router.use('/:taskId/notes', authorize('tasks', ACCESS_LEVELS.READ), noteRouter);

// Define routes with authorization
router.route('/')
    // Reading tasks requires 'read' access
    .get(authorize('tasks', ACCESS_LEVELS.READ), getTasks)
    // Creating tasks requires 'own' access
    .post(authorize('tasks', ACCESS_LEVELS.OWN), createTask);

// Routes for specific task ID (add later with controllers)
router.route('/:id')
    // Reading a specific task requires 'read' access
    .get(authorize('tasks', ACCESS_LEVELS.READ), (req, res) => res.status(501).json({ message: 'Get single task not implemented' })) // Placeholder
    // Updating requires 'own' access
    .put(authorize('tasks', ACCESS_LEVELS.OWN), (req, res) => res.status(501).json({ message: 'Update task not implemented' })) // Placeholder
    // Deleting requires 'own' access
    .delete(authorize('tasks', ACCESS_LEVELS.OWN), (req, res) => res.status(501).json({ message: 'Delete task not implemented' })); // Placeholder

module.exports = router;
