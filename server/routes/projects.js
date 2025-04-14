const express = require('express');
const router = express.Router();

// Import middleware
const { protect, authorize } = require('../middleware/authMiddleware');
const { ACCESS_LEVELS } = require('../config/permissions'); // Import ACCESS_LEVELS

// Import controller functions
const {
    getProjects,
    createProject,
    getProject, // For getting a single project later
    updateProject, // For updating later
    deleteProject, // For deleting later
    // addProjectMember, // Example for later
    // removeProjectMember // Example for later
} = require('../controllers/projectController');
const { getTasksForProject } = require('../controllers/taskController'); // Import task controller function

// Protect all routes
router.use(protect);

// Define routes with authorization
router.route('/')
    // Reading list of projects requires at least 'read' access (implicitly covered by 'own')
    .get(authorize('projects', ACCESS_LEVELS.READ), getProjects)
    // Creating requires at least 'own' access
    .post(authorize('projects', ACCESS_LEVELS.OWN), createProject);

// Routes for specific project ID
router.route('/:id')
    // Reading a specific project requires 'read' access
    .get(authorize('projects', ACCESS_LEVELS.READ), getProject)
    // Updating requires 'own' access (middleware handles ownership check)
    .put(authorize('projects', ACCESS_LEVELS.OWN), updateProject)
    // Deleting requires 'own' access (middleware handles ownership check)
    .delete(authorize('projects', ACCESS_LEVELS.OWN), deleteProject);

// Route to get tasks for a specific project
// Requires 'read' access to the project itself
router.route('/:id/tasks') // Changed param name to :id to match ownership check logic
    .get(authorize('projects', ACCESS_LEVELS.READ), getTasksForProject);

// Routes for managing members (add later)
// router.route('/:id/members')
//     .post(addProjectMember)
//     .delete(removeProjectMember);

module.exports = router;
