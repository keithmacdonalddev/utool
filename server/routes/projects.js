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
import { getTasksForProject } from '../controllers/taskController.js';

// Protect all routes
router.use(protect);

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

// Route to get tasks for a specific project
// Requires 'read' access to the project itself
router
  .route('/:id/tasks') // Changed param name to :id to match ownership check logic
  .get(authorize('projects', ACCESS_LEVELS.READ), getTasksForProject);

// Routes for managing members (add later)
// router.route('/:id/members')
//     .post(addProjectMember)
//     .delete(removeProjectMember);

export default router;
