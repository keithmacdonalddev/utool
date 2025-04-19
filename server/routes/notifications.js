const express = require('express');
const router = express.Router();

// Import middleware
const { protect } = require('../middleware/authMiddleware');

// Import controller functions
const {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
  clearAllNotifications,
} = require('../controllers/notificationController');

// All routes below this will use the 'protect' middleware
router.use(protect);

// Define routes
router
  .route('/')
  .get(getUserNotifications)
  .post(createNotification)
  .delete(clearAllNotifications);

router.route('/unread-count').get(getUnreadCount);

router.route('/read').put(markAsRead);

router.route('/read-all').put(markAllAsRead);

router.route('/:id').delete(deleteNotification);

module.exports = router;
