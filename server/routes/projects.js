import express from 'express';
const router = express.Router();
import { protect, authorize } from '../middleware/authMiddleware.js';
import { ACCESS_LEVELS } from '../config/permissions.js';
import {
  getProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember,
  getProjectStats,
  getProjectActivities,
} from '../controllers/projectController.js';

// Import task router to re-route all task operations
import taskRouter from './tasks.js';
// Import project notes router
import projectNotesRouter from './projectNotes.js';

// Protect all routes
router.use(protect);

// Re-route task operations within project context
// This ensures all task operations are performed in the context of a project
router.use('/:projectId/tasks', taskRouter);

// Re-route project notes operations
router.use('/:projectId/notes', projectNotesRouter);

// Define routes with authorization
router
  .route('/')
  // Reading list of projects requires at least 'read' access (implicitly covered by 'own')
  .get(authorize('projects', ACCESS_LEVELS.READ), getProjects)
  // Creating requires at least 'own' access
  .post(authorize('projects', ACCESS_LEVELS.OWN), createProject);

// Routes for specific project ID
router
  .route('/:id')
  // Reading a specific project requires 'read' access
  .get(authorize('projects', ACCESS_LEVELS.READ), getProject)
  // Updating requires 'own' access (middleware handles ownership check)
  .put(authorize('projects', ACCESS_LEVELS.OWN), updateProject)
  // Deleting requires 'own' access (middleware handles ownership check)
  .delete(authorize('projects', ACCESS_LEVELS.OWN), deleteProject);

// Routes for managing members
router
  .route('/:id/members')
  .post(authorize('projects', ACCESS_LEVELS.OWN), addProjectMember);

router
  .route('/:id/members/:userId')
  .delete(authorize('projects', ACCESS_LEVELS.OWN), removeProjectMember);

// Routes for project analytics and statistics
router
  .route('/:id/stats')
  .get(authorize('projects', ACCESS_LEVELS.READ), getProjectStats);

// Routes for project activity feed
router
  .route('/:id/activities')
  .get(authorize('projects', ACCESS_LEVELS.READ), getProjectActivities);

export default router;
