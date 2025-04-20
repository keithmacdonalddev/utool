import express from 'express';
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getBatchUsers,
} from '../controllers/userController.js';
import { getUserTasks } from '../controllers/taskController.js';
import { getUserNotes } from '../controllers/noteController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { ACCESS_LEVELS } from '../config/permissions.js';

const router = express.Router();

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

export default router;
