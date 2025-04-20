import express from 'express';
const router = express.Router();
import { protect } from '../middleware/authMiddleware.js';
import {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
  clearAllNotifications,
} from '../controllers/notificationController.js';

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

export default router;
