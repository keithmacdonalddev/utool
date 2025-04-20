import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { logger } from '../utils/logger.js';
import { sendNotification } from '../utils/socketManager.js';

// @desc    Create a new notification
// @route   POST /api/v1/notifications
// @access  Private
export const createNotification = async (req, res, next) => {
  try {
    const { type, title, message, relatedItem, itemModel, url } = req.body;

    logger.verbose(`Creating notification for user ${req.user.id}`, {
      type,
      title,
      relatedItem,
      itemModel,
    });

    // Create the notification
    const notification = await Notification.create({
      user: req.user.id,
      type,
      title,
      message,
      relatedItem,
      itemModel,
      url,
    });

    logger.info(`Notification created: ${notification._id}`, {
      notificationId: notification._id,
      userId: req.user.id,
      type,
    });

    // If there's an active socket connection for this user, send it immediately
    const io = req.app.get('io');
    if (io) {
      const userRoom = `user:${req.user.id}`;
      const userSockets = io.sockets.adapter.rooms.get(userRoom);

      if (userSockets && userSockets.size > 0) {
        logger.verbose(
          `User ${req.user.id} is connected with ${userSockets.size} socket(s), sending notification immediately`,
          {
            userRoom,
            socketCount: userSockets.size,
            notificationId: notification._id,
          }
        );

        notification.isSent = true;
        await notification.save();

        // Emit to all of user's connected devices
        const notificationData = {
          _id: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          url: notification.url,
          createdAt: notification.createdAt,
        };

        io.to(userRoom).emit('notification', notificationData);

        logger.info(
          `Notification ${notification._id} sent to user ${req.user.id} via socket`,
          {
            notificationId: notification._id,
            userRoom,
            notificationType: notification.type,
          }
        );
      } else {
        logger.verbose(
          `User ${req.user.id} is not connected, notification ${notification._id} queued for later delivery`
        );
      }
    } else {
      logger.warn(
        `Socket.io instance not available, notification ${notification._id} queued for later delivery`
      );
    }

    res.status(201).json({
      success: true,
      data: notification,
    });
  } catch (err) {
    logger.error('Create notification error:', {
      error: err.message,
      stack: err.stack,
      userId: req.user?.id,
    });

    res.status(500).json({
      success: false,
      message: 'Server error creating notification',
    });
  }
};

// @desc    Create a reminder notification (internal use)
// @access  Private (internal)
export const createReminderNotification = async (
  user,
  title,
  message,
  relatedItem,
  itemModel,
  url
) => {
  try {
    logger.verbose(`Creating reminder notification for user ${user._id}`, {
      userId: user._id,
      title,
      relatedItem,
      itemModel,
    });

    // Check if a similar unread notification already exists for this item
    if (relatedItem) {
      const existingNotification = await Notification.findOne({
        user: user._id,
        relatedItem,
        isRead: false,
      });

      // If there's already an unread notification for this item, don't create a duplicate
      if (existingNotification) {
        logger.info(
          `Skipping duplicate notification for user ${user._id} and item ${relatedItem}`,
          {
            userId: user._id,
            relatedItem,
            existingNotification: existingNotification._id,
          }
        );
        return existingNotification;
      }
    }

    // Create the notification
    const notification = await Notification.create({
      user: user._id,
      type: itemModel === 'Note' ? 'note_reminder' : 'task_reminder',
      title,
      message,
      relatedItem,
      itemModel,
      url,
    });

    logger.info(
      `Reminder notification created: ${notification._id} for user ${user._id}`,
      {
        notificationId: notification._id,
        userId: user._id,
        type: notification.type,
        relatedItem,
      }
    );
    return notification;
  } catch (err) {
    logger.error('Create reminder notification error:', {
      error: err.message,
      stack: err.stack,
      userId: user?._id,
      relatedItem,
      itemModel,
    });
    throw err;
  }
};

// @desc    Get all notifications for logged-in user
// @route   GET /api/v1/notifications
// @access  Private
export const getUserNotifications = async (req, res, next) => {
  try {
    // Get all notifications for the user, sorted by newest first
    const notifications = await Notification.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50); // Limit to recent 50

    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (err) {
    logger.error('Get notifications error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving notifications',
    });
  }
};

// @desc    Mark notifications as read
// @route   PUT /api/v1/notifications/read
// @access  Private
export const markAsRead = async (req, res, next) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of notification IDs',
      });
    }

    // Update all provided notification IDs that belong to the user
    const result = await Notification.updateMany(
      {
        _id: { $in: ids },
        user: req.user.id,
      },
      { isRead: true }
    );

    res.status(200).json({
      success: true,
      count: result.nModified,
      message: `${result.nModified} notifications marked as read`,
    });
  } catch (err) {
    logger.error('Mark notifications as read error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error updating notifications',
    });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/v1/notifications/read-all
// @access  Private
export const markAllAsRead = async (req, res, next) => {
  try {
    // Mark all unread notifications for the user as read
    const result = await Notification.updateMany(
      { user: req.user.id, isRead: false },
      { isRead: true }
    );

    res.status(200).json({
      success: true,
      count: result.nModified,
      message: `${result.nModified} notifications marked as read`,
    });
  } catch (err) {
    logger.error('Mark all notifications as read error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error updating notifications',
    });
  }
};

// @desc    Get unread notification count
// @route   GET /api/v1/notifications/unread-count
// @access  Private
export const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({
      user: req.user.id,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      count,
    });
  } catch (err) {
    logger.error('Get unread count error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error counting notifications',
    });
  }
};

// @desc    Delete a notification
// @route   DELETE /api/v1/notifications/:id
// @access  Private
export const deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    // Check if user owns this notification
    if (notification.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this notification',
      });
    }

    await notification.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    logger.error('Delete notification error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error deleting notification',
    });
  }
};

// @desc    Clear all notifications
// @route   DELETE /api/v1/notifications
// @access  Private
export const clearAllNotifications = async (req, res, next) => {
  try {
    const result = await Notification.deleteMany({ user: req.user.id });

    res.status(200).json({
      success: true,
      count: result.deletedCount,
      message: `${result.deletedCount} notifications cleared`,
    });
  } catch (err) {
    logger.error('Clear all notifications error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error clearing notifications',
    });
  }
};

// @desc    Process unsent notifications (internal)
// @access  Private (internal)
export const processUnsentNotifications = async (io) => {
  try {
    const startTime = Date.now();
    logger.verbose('Starting notification processor job');

    // Find all unsent notifications that should be sent now
    const now = new Date();
    const notifications = await Notification.find({
      isSent: false,
      $or: [{ scheduledFor: null }, { scheduledFor: { $lte: now } }],
    }).populate('user', 'name email');

    if (notifications.length === 0) {
      logger.verbose('No unsent notifications found to process');
      return;
    }

    logger.info(`Processing ${notifications.length} unsent notifications`, {
      count: notifications.length,
      notificationsIds: notifications.map((n) => n._id),
    });

    let sentCount = 0;
    let socketMissCount = 0;

    for (const notification of notifications) {
      // Mark as sent regardless of socket success
      notification.isSent = true;
      await notification.save();

      // Log debug info for troubleshooting
      logger.verbose(`Processing notification ${notification._id}`, {
        notificationId: notification._id,
        userId: notification.user._id,
        type: notification.type,
        title: notification.title,
      });

      // Try to send via socket if user is connected
      if (io) {
        const userRoom = `user:${notification.user._id}`;
        const userSockets = io.sockets.adapter.rooms.get(userRoom);

        if (userSockets && userSockets.size > 0) {
          // Create notification data packet for socket
          const notificationData = {
            _id: notification._id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            url: notification.url,
            createdAt: notification.createdAt,
          };

          // Use enhanced sendNotification helper
          const sent = sendNotification(
            io,
            notification.user._id,
            notificationData
          );

          if (sent) {
            sentCount++;
            logger.info(
              `Notification ${notification._id} sent to user ${notification.user._id} via socket`,
              {
                notificationId: notification._id,
                userId: notification.user._id,
                socketCount: userSockets.size,
                userRoom,
              }
            );
          }
        } else {
          socketMissCount++;
          logger.verbose(
            `User ${notification.user._id} not connected, marking notification ${notification._id} as sent without delivery`,
            {
              userId: notification.user._id,
              notificationId: notification._id,
            }
          );
        }
      } else {
        logger.warn(
          `Socket.io instance not available, marking notification ${notification._id} as sent without delivery`
        );
      }
    }

    const processingTime = Date.now() - startTime;
    logger.info(`Notification processor completed`, {
      processingTimeMs: processingTime,
      totalCount: notifications.length,
      sentCount,
      socketMissCount,
    });
  } catch (err) {
    logger.error('Process unsent notifications error:', {
      error: err.message,
      stack: err.stack,
    });
  }
};
