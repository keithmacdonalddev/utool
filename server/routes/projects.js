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
} from '../controllers/projectController.js';

// Import task router to re-route all task operations
import taskRouter from './tasks.js';

// Protect all routes
router.use(protect);

// Re-route task operations within project context
// This ensures all task operations are performed in the context of a project
router.use('/:projectId/tasks', taskRouter);

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

// Routes for managing members (add later)
// router.route('/:id/members')
//     .post(addProjectMember)
//     .delete(removeProjectMember);

export default router;
