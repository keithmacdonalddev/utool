const User = require('../models/User');
const mongoose = require('mongoose');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const { auditLog } = require('../middleware/auditLogMiddleware');

// @desc    Search users by name or email
// @route   GET /api/v1/friends/search
// @access  Private
exports.searchUsers = asyncHandler(async (req, res, next) => {
  const searchTerm = req.query.term;
  if (!searchTerm) {
    return next(new ErrorResponse('Please provide a search term', 400));
  }

  // Find users matching name or email, case-insensitive
  // Exclude the current user, their existing friends, and users they've sent requests to or received requests from
  const currentUser = await User.findById(req.user.id).select(
    'friends friendRequestsSent friendRequestsReceived'
  );
  if (!currentUser) {
    return next(new ErrorResponse('User not found', 404)); // Should not happen with auth middleware
  }

  const excludedIds = [
    req.user.id, // Exclude self
    ...currentUser.friends,
    ...currentUser.friendRequestsSent,
    ...currentUser.friendRequestsReceived,
  ];

  const users = await User.find({
    _id: { $nin: excludedIds }, // Exclude specified IDs
    $or: [
      { name: { $regex: searchTerm, $options: 'i' } },
      { email: { $regex: searchTerm, $options: 'i' } },
    ],
  }).select('name email avatar'); // Select only necessary fields

  res.status(200).json({ success: true, data: users });
});

// @desc    Send a friend request
// @route   POST /api/v1/friends/request/:userId
// @access  Private
exports.sendFriendRequest = asyncHandler(async (req, res, next) => {
  const recipientId = req.params.userId;
  const senderId = req.user.id;

  if (senderId === recipientId) {
    return next(
      new ErrorResponse('You cannot send a friend request to yourself', 400)
    );
  }

  const recipient = await User.findById(recipientId);
  const sender = await User.findById(senderId);

  if (!recipient || !sender) {
    return next(new ErrorResponse('User not found', 404));
  }

  // Check if already friends
  if (sender.friends.includes(recipientId)) {
    return next(
      new ErrorResponse('You are already friends with this user', 400)
    );
  }

  // Check if request already sent or received
  if (
    sender.friendRequestsSent.includes(recipientId) ||
    sender.friendRequestsReceived.includes(recipientId)
  ) {
    return next(new ErrorResponse('Friend request already pending', 400));
  }

  // Add recipient to sender's sent requests
  sender.friendRequestsSent.push(recipientId);
  await sender.save();

  // Add sender to recipient's received requests
  recipient.friendRequestsReceived.push(senderId);
  await recipient.save();

  // Create notification for the recipient with improved logging
  try {
    const Notification = require('../models/Notification');
    const { logger } = require('../utils/logger');

    logger.info(
      `Creating friend request notification for user ${recipientId}`,
      {
        sender: senderId,
        senderName: sender.name,
        recipient: recipientId,
        recipientName: recipient.name,
      }
    );

    const notification = await Notification.create({
      user: recipientId,
      type: 'friend_request',
      title: 'New Friend Request',
      message: `${sender.name} sent you a friend request`,
      relatedItem: senderId,
      itemModel: 'User',
      url: '/friends',
    });

    logger.info(
      `Friend request notification created with ID: ${notification._id}`,
      {
        notificationId: notification._id,
        recipientId: recipientId,
      }
    );

    // If Socket.IO is available, send the notification immediately
    const io = req.app.get('io');
    if (io) {
      const userRoom = `user:${recipientId}`;
      const { sendNotification } = require('../utils/socketManager');

      logger.info(
        `Attempting real-time delivery of notification to room: ${userRoom}`,
        {
          socketInstance: !!io,
          recipientId,
        }
      );

      // Check if user is connected
      const userSockets = io.sockets.adapter.rooms.get(userRoom);
      const isUserConnected = !!(userSockets && userSockets.size > 0);

      logger.info(
        `Recipient socket status check: ${
          isUserConnected ? 'CONNECTED' : 'NOT CONNECTED'
        }`,
        {
          recipientId,
          roomExists: !!userSockets,
          socketCount: userSockets ? userSockets.size : 0,
        }
      );

      // Use the improved sendNotification utility with proper notification object
      const notificationData = {
        _id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        url: notification.url,
        createdAt: notification.createdAt,
      };

      const sent = sendNotification(io, recipientId, notificationData);

      logger.info(
        `Notification emit attempt result: ${sent ? 'SUCCESS' : 'FAILED'}`,
        {
          notificationId: notification._id,
          recipientId,
        }
      );

      // Mark notification as sent if delivered successfully
      if (sent) {
        notification.isSent = true;
        await notification.save();
        logger.info(`Notification marked as sent`, {
          notificationId: notification._id,
        });
      }
    } else {
      logger.warn(
        `Socket.IO instance not available, notification will be delivered on next connection`,
        {
          notificationId: notification._id,
          recipientId: recipientId,
        }
      );
    }
  } catch (err) {
    logger.error('Error creating friend request notification:', {
      error: err.message,
      stack: err.stack,
      sender: senderId,
      recipient: recipientId,
    });
    // Don't fail the request if notification creation fails
  }

  res.status(200).json({ success: true, message: 'Friend request sent' });
});

// @desc    Accept a friend request
// @route   PUT /api/v1/friends/accept/:userId
// @access  Private
exports.acceptFriendRequest = asyncHandler(async (req, res, next) => {
  const senderId = req.params.userId; // The user who sent the request
  const recipientId = req.user.id; // The user accepting the request

  const recipient = await User.findById(recipientId);
  const sender = await User.findById(senderId);

  if (!recipient || !sender) {
    return next(new ErrorResponse('User not found', 404));
  }

  // Check if the request exists
  if (
    !recipient.friendRequestsReceived.includes(senderId) ||
    !sender.friendRequestsSent.includes(recipientId)
  ) {
    return next(new ErrorResponse('Friend request not found', 404));
  }

  // Add each user to the other's friends list
  recipient.friends.push(senderId);
  sender.friends.push(recipientId);

  // Remove request from both users' lists
  recipient.friendRequestsReceived = recipient.friendRequestsReceived.filter(
    (id) => id.toString() !== senderId
  );
  sender.friendRequestsSent = sender.friendRequestsSent.filter(
    (id) => id.toString() !== recipientId
  );

  await recipient.save();
  await sender.save();

  // Create notification for the sender that their request was accepted
  try {
    const Notification = require('../models/Notification');
    const { logger } = require('../utils/logger');

    logger.info(
      `Creating friend request acceptance notification for user ${senderId}`,
      {
        sender: recipientId,
        senderName: recipient.name,
        recipient: senderId,
        recipientName: sender.name,
      }
    );

    const notification = await Notification.create({
      user: senderId,
      type: 'friend_request',
      title: 'Friend Request Accepted',
      message: `${recipient.name} accepted your friend request`,
      relatedItem: recipientId,
      itemModel: 'User',
      url: '/friends',
    });

    logger.info(
      `Friend request acceptance notification created with ID: ${notification._id}`,
      {
        notificationId: notification._id,
        recipientId: senderId,
      }
    );

    // If Socket.IO is available, send the notification immediately
    const io = req.app.get('io');
    if (io) {
      const userRoom = `user:${senderId}`;
      const { sendNotification } = require('../utils/socketManager');

      logger.info(
        `Attempting real-time delivery of acceptance notification to room: ${userRoom}`,
        {
          socketInstance: !!io,
          recipientId: senderId,
        }
      );

      // Check if user is connected
      const userSockets = io.sockets.adapter.rooms.get(userRoom);
      const isUserConnected = !!(userSockets && userSockets.size > 0);

      logger.info(
        `Recipient socket status check: ${
          isUserConnected ? 'CONNECTED' : 'NOT CONNECTED'
        }`,
        {
          recipientId: senderId,
          roomExists: !!userSockets,
          socketCount: userSockets ? userSockets.size : 0,
        }
      );

      // Use the improved sendNotification utility with proper notification object
      const notificationData = {
        _id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        url: notification.url,
        createdAt: notification.createdAt,
      };

      const sent = sendNotification(io, senderId, notificationData);

      logger.info(
        `Acceptance notification emit attempt result: ${
          sent ? 'SUCCESS' : 'FAILED'
        }`,
        {
          notificationId: notification._id,
          recipientId: senderId,
        }
      );

      // Mark notification as sent if delivered successfully
      if (sent) {
        notification.isSent = true;
        await notification.save();
        logger.info(`Acceptance notification marked as sent`, {
          notificationId: notification._id,
        });
      }
    } else {
      logger.warn(
        `Socket.IO instance not available, acceptance notification will be delivered on next connection`,
        {
          notificationId: notification._id,
          recipientId: senderId,
        }
      );
    }
  } catch (err) {
    logger.error('Error creating friend request acceptance notification:', {
      error: err.message,
      stack: err.stack,
      sender: recipientId,
      recipient: senderId,
    });
    // Don't fail the request if notification creation fails
  }

  res.status(200).json({ success: true, message: 'Friend request accepted' });
});

// @desc    Reject or cancel a friend request
// @route   DELETE /api/v1/friends/requests/:userId
// @access  Private
exports.rejectOrCancelFriendRequest = asyncHandler(async (req, res, next) => {
  const currentUserId = req.user.id;
  const otherUserId = req.params.userId;

  // Validate that the userId parameter is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
    return next(
      new ErrorResponse(`Invalid user ID format: ${otherUserId}`, 400)
    );
  }

  // Don't allow self-rejection
  if (currentUserId === otherUserId) {
    return next(
      new ErrorResponse('Cannot reject or cancel your own request', 400)
    );
  }

  // Find both users
  const [currentUser, otherUser] = await Promise.all([
    User.findById(currentUserId),
    User.findById(otherUserId),
  ]);

  // Check if both users exist
  if (!otherUser) {
    return next(
      new ErrorResponse(`User not found with id ${otherUserId}`, 404)
    );
  }

  if (!currentUser) {
    return next(new ErrorResponse('Current user not found', 404));
  }

  // Track if we found a request to handle
  let requestFound = false;

  // Case 1: Current user is rejecting a received request
  if (currentUser.friendRequestsReceived.includes(otherUserId)) {
    currentUser.friendRequestsReceived =
      currentUser.friendRequestsReceived.filter(
        (id) => id.toString() !== otherUserId
      );
    otherUser.friendRequestsSent = otherUser.friendRequestsSent.filter(
      (id) => id.toString() !== currentUserId
    );
    requestFound = true;
  }
  // Case 2: Current user is canceling a sent request
  else if (currentUser.friendRequestsSent.includes(otherUserId)) {
    currentUser.friendRequestsSent = currentUser.friendRequestsSent.filter(
      (id) => id.toString() !== otherUserId
    );
    otherUser.friendRequestsReceived = otherUser.friendRequestsReceived.filter(
      (id) => id.toString() !== currentUserId
    );
    requestFound = true;
  }

  if (!requestFound) {
    return next(new ErrorResponse('Friend request not found', 404));
  }

  try {
    await Promise.all([currentUser.save(), otherUser.save()]);

    // Log the action
    await auditLog(req, 'friend_request_cancel', 'success', {
      targetUserId: otherUserId,
      action: currentUser.friendRequestsReceived.includes(otherUserId)
        ? 'reject'
        : 'cancel',
    });
  } catch (err) {
    console.error('Error updating friend request status:', err);
    return next(
      new ErrorResponse('Failed to update friend request status', 500)
    );
  }

  res
    .status(200)
    .json({ success: true, message: 'Friend request rejected or canceled' });
});

// @desc    Remove a friend
// @route   DELETE /api/v1/friends/:userId
// @access  Private
exports.removeFriend = asyncHandler(async (req, res, next) => {
  const friendId = req.params.userId;
  const currentUserId = req.user.id;

  const currentUser = await User.findById(currentUserId);
  const friend = await User.findById(friendId);

  if (!currentUser || !friend) {
    return next(new ErrorResponse('User not found', 404));
  }

  // Check if they are actually friends
  if (!currentUser.friends.includes(friendId)) {
    return next(new ErrorResponse('You are not friends with this user', 400));
  }

  // Remove friend from both users' lists
  currentUser.friends = currentUser.friends.filter(
    (id) => id.toString() !== friendId
  );
  friend.friends = friend.friends.filter(
    (id) => id.toString() !== currentUserId
  );

  await currentUser.save();
  await friend.save();

  res.status(200).json({ success: true, message: 'Friend removed' });
});

// @desc    Get current user's friends list
// @route   GET /api/v1/friends
// @access  Private
exports.getFriends = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).populate(
    'friends',
    'name email avatar'
  );
  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }
  res.status(200).json({ success: true, data: user.friends });
});

// @desc    Get pending friend requests (sent and received)
// @route   GET /api/v1/friends/requests
// @access  Private
exports.getFriendRequests = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id)
    .populate('friendRequestsSent', 'name email avatar')
    .populate('friendRequestsReceived', 'name email avatar');

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  res.status(200).json({
    success: true,
    data: {
      sent: user.friendRequestsSent,
      received: user.friendRequestsReceived,
    },
  });
});
