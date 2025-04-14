const express = require('express');
const router = express.Router();

const {
    getUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser
} = require('../controllers/userController');
const { getUserTasks } = require('../controllers/taskController');
const { getUserNotes } = require('../controllers/noteController');

const { protect, authorize } = require('../middleware/authMiddleware');
const { ACCESS_LEVELS } = require('../config/permissions');

// Apply protect and admin authorization to all routes in this file
router.use(protect);
router.use(authorize('userManagement', ACCESS_LEVELS.FULL));

// Define routes
router.route('/')
    .get(getUsers)
    .post(createUser);

router.route('/:id')
    .get(getUser)
    .put(updateUser)
    .delete(deleteUser);

// Route for admins to get tasks for a specific user
router.route('/:userId/tasks').get(getUserTasks);

// Route for admins to get notes for a specific user
router.route('/:userId/notes').get(getUserNotes);

module.exports = router;
