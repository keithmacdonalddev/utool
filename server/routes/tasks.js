const express = require('express');
// Merge params allows accessing :projectId if this router is mounted under projects/:projectId/tasks
const router = express.Router({ mergeParams: true });

// Import middleware
const { protect, authorize } = require('../middleware/authMiddleware');
const { ACCESS_LEVELS } = require('../config/permissions'); // Import ACCESS_LEVELS

// Import controller functions
const {
  getTasks,
  createTask,
  getTask,
  updateTask,
  deleteTask,
  bulkUpdateTasks,
} = require('../controllers/taskController');

// Re-route into other resource routers
const noteRouter = require('./notes'); // Import the note router

// All routes below this will use the 'protect' middleware
router.use(protect);

// Mount the note router for task-specific notes
// Ensure user has at least read access to the task before accessing its notes
router.use(
  '/:taskId/notes',
  authorize('tasks', ACCESS_LEVELS.READ),
  noteRouter
);

// Define bulk update route for tasks
router
  .route('/bulk-update')
  .put(authorize('tasks', ACCESS_LEVELS.OWN), bulkUpdateTasks);

// Define routes with authorization
router
  .route('/')
  // Reading tasks requires 'read' access
  .get(authorize('tasks', ACCESS_LEVELS.READ), getTasks)
  // Creating tasks requires 'own' access
  .post(authorize('tasks', ACCESS_LEVELS.OWN), createTask);

// Routes for specific task ID
router
  .route('/:id')
  // Reading a specific task requires 'read' access
  .get(authorize('tasks', ACCESS_LEVELS.READ), getTask)
  // Updating requires 'own' access
  .put(authorize('tasks', ACCESS_LEVELS.OWN), updateTask)
  // Deleting requires 'own' access
  .delete(authorize('tasks', ACCESS_LEVELS.OWN), deleteTask);

module.exports = router;
