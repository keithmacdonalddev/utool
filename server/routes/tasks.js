import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { ACCESS_LEVELS } from '../config/permissions.js';
import {
  getTasks,
  createTask,
  getTask,
  updateTask,
  deleteTask,
  bulkUpdateTasks,
} from '../controllers/taskController.js';
import noteRouter from './notes.js';

const router = express.Router({ mergeParams: true });

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

export default router;
