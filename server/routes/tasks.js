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
  createSubtask,
  getSubtasks,
  addTaskDependency,
  removeTaskDependency,
  startTimeTracking,
  stopTimeTracking,
  getTimeEntries,
  updateTaskProgress,
  reorderTasks,
  getTaskAnalytics,
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

// Analytics route for project-level task analytics
router
  .route('/analytics')
  .get(authorize('tasks', ACCESS_LEVELS.READ), getTaskAnalytics);

// Bulk operations routes
router
  .route('/bulk-update')
  .put(authorize('tasks', ACCESS_LEVELS.OWN), bulkUpdateTasks);

router
  .route('/reorder')
  .put(authorize('tasks', ACCESS_LEVELS.OWN), reorderTasks);

// Main task CRUD routes
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

// ===== ADVANCED TASK MANAGEMENT ROUTES =====

// Subtask management routes
router
  .route('/:taskId/subtasks')
  .get(authorize('tasks', ACCESS_LEVELS.READ), getSubtasks)
  .post(authorize('tasks', ACCESS_LEVELS.OWN), createSubtask);

// Task dependency management routes
router
  .route('/:taskId/dependencies')
  .post(authorize('tasks', ACCESS_LEVELS.OWN), addTaskDependency);

router
  .route('/:taskId/dependencies/:dependencyId')
  .delete(authorize('tasks', ACCESS_LEVELS.OWN), removeTaskDependency);

// Time tracking routes
router
  .route('/:taskId/time')
  .get(authorize('tasks', ACCESS_LEVELS.READ), getTimeEntries);

router
  .route('/:taskId/time/start')
  .post(authorize('tasks', ACCESS_LEVELS.OWN), startTimeTracking);

router
  .route('/:taskId/time/stop')
  .put(authorize('tasks', ACCESS_LEVELS.OWN), stopTimeTracking);

// Progress tracking routes
router
  .route('/:taskId/progress')
  .put(authorize('tasks', ACCESS_LEVELS.OWN), updateTaskProgress);

export default router;
