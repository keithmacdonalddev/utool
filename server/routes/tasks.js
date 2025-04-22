import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { ACCESS_LEVELS } from '../config/permissions.js';
import {
  getTasksForProject,
  createTask,
  getTask,
  updateTask,
  deleteTask,
  bulkUpdateTasks,
  validateProjectAccess,
  migrateOrphanedTasks,
} from '../controllers/taskController.js';
import noteRouter from './notes.js';

const router = express.Router({ mergeParams: true });

// All routes below this will use the 'protect' middleware
router.use(protect);

// Project access validation middleware for all task operations
router.use(validateProjectAccess);

// Mount the note router for task-specific notes
router.use(
  '/:taskId/notes',
  authorize('tasks', ACCESS_LEVELS.READ),
  noteRouter
);

// Admin-only route to migrate orphaned tasks
router
  .route('/migrate-orphaned')
  .post(authorize('admin', ACCESS_LEVELS.OWN), migrateOrphanedTasks);

// Define bulk update route for tasks within a project
router
  .route('/bulk-update')
  .put(authorize('tasks', ACCESS_LEVELS.OWN), bulkUpdateTasks);

// Define routes with authorization
router
  .route('/')
  // Get all tasks for a specific project
  .get(authorize('tasks', ACCESS_LEVELS.READ), getTasksForProject)
  // Create task within a project
  .post(authorize('tasks', ACCESS_LEVELS.OWN), createTask);

// Routes for specific task ID within a project
router
  .route('/:id')
  // Get a specific task within a project
  .get(authorize('tasks', ACCESS_LEVELS.READ), getTask)
  // Update a task within a project
  .put(authorize('tasks', ACCESS_LEVELS.OWN), updateTask)
  // Delete a task within a project
  .delete(authorize('tasks', ACCESS_LEVELS.OWN), deleteTask);

export default router;
