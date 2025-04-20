const express = require('express');
const router = express.Router();

const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getBatchUsers,
} = require('../controllers/userController');
const { getUserTasks } = require('../controllers/taskController');
const { getUserNotes } = require('../controllers/noteController');

const { protect, authorize } = require('../middleware/authMiddleware');
const { ACCESS_LEVELS } = require('../config/permissions');

// Apply protect middleware to all routes
router.use(protect);

// Add the batch users route - needs only authentication, not admin privileges
router.route('/batch').post(getBatchUsers);

// Apply admin authorization to the remaining routes
router.use(authorize('userManagement', ACCESS_LEVELS.FULL));

// Define admin routes
router.route('/').get(getUsers).post(createUser);

router.route('/:id').get(getUser).put(updateUser).delete(deleteUser);

// Route for admins to get tasks for a specific user
router.route('/:userId/tasks').get(getUserTasks);

// Route for admins to get notes for a specific user
router.route('/:userId/notes').get(getUserNotes);

module.exports = router;
