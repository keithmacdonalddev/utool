import jwt from 'jsonwebtoken';
import { logger } from './logger.js';

// Socket.io middleware for authentication
const authenticateSocket = (socket, next) => {
  // Get token from handshake query
  const token = socket.handshake.auth.token || socket.handshake.query.token;

  if (!token) {
    logger.warn(`Socket authentication failed: No token provided`, {
      socketId: socket.id,
    });
    return next(new Error('Authentication error: Token not provided'));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Store user info in socket object
    socket.user = decoded;

    logger.verbose(`Socket authenticated successfully: ${socket.id}`, {
      socketId: socket.id,
      userId: decoded.id,
      name: decoded.name,
      role: decoded.role,
    });

    next();
  } catch (err) {
    logger.error(`Socket authentication failed: ${err.message}`, {
      socketId: socket.id,
      error: err.message,
    });
    next(new Error('Authentication error: Invalid token'));
  }
};

// Socket.io handler for connection
const handleConnection = (io, socket) => {
  logger.info(`Socket connected: ${socket.id}`, {
    socketId: socket.id,
    userId: socket.user?.id,
    userName: socket.user?.name,
    timeConnected: new Date().toISOString(),
  });

  // Add user to their personal notification room
  if (socket.user && socket.user.id) {
    const userRoom = `user:${socket.user.id}`;
    socket.join(userRoom);
    logger.info(
      `User ${socket.user.id} joined their private notification room`,
      {
        room: userRoom,
        socketId: socket.id,
      }
    );
  }

  // Handle document collaboration
  socket.on('join_document', (documentId) => {
    socket.join(documentId);
    logger.verbose(`User joined document: ${documentId}`, {
      socketId: socket.id,
      userId: socket.user?.id,
      documentId,
    });
  });

  socket.on('send_changes', (data) => {
    if (data && data.documentId) {
      logger.verbose(`Received document changes`, {
        socketId: socket.id,
        userId: socket.user?.id,
        documentId: data.documentId,
        editorStateSize: JSON.stringify(data.editorState).length,
      });

      socket.to(data.documentId).emit('receive_changes', data.editorState);
    } else {
      logger.warn(`Invalid send_changes event received`, {
        socketId: socket.id,
        userId: socket.user?.id,
        data,
      });
    }
  });

  // Log event emissions
  const originalEmit = socket.emit;
  socket.emit = function (event, ...args) {
    logger.verbose(`Socket emitting event: ${event}`, {
      socketId: socket.id,
      userId: socket.user?.id,
      event,
      argsLength: args.length,
    });
    return originalEmit.apply(this, [event, ...args]);
  };

  // Clean up on disconnect
  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`, {
      socketId: socket.id,
      userId: socket.user?.id,
      timeDisconnected: new Date().toISOString(),
    });
  });
};

// Function to send notifications through socket.io
const sendNotification = (io, userId, notification) => {
  try {
    logger.verbose(`Attempting to send notification to user: ${userId}`, {
      userId,
      notification: {
        id: notification._id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
      },
    });

    const userRoom = `user:${userId}`;
    io.to(userRoom).emit('notification', notification);

    logger.info(`Notification sent to room: ${userRoom}`, {
      userId,
      notificationId: notification._id,
      roomSent: userRoom,
    });

    return true;
  } catch (error) {
    logger.error(`Error sending notification to user ${userId}`, {
      userId,
      error: error.message,
      stack: error.stack,
    });
    return false;
  }
};

// Function to broadcast system messages
const broadcastSystemMessage = (io, message, metadata = {}) => {
  try {
    logger.verbose(`Broadcasting system message: ${message}`, { metadata });

    // Send to all authenticated clients
    io.emit('system_message', {
      message,
      timestamp: new Date(),
      ...metadata,
    });

    return true;
  } catch (error) {
    logger.error(`Error broadcasting system message`, {
      message,
      error: error.message,
    });
    return false;
  }
};

// Empty function to maintain compatibility with existing code
const broadcastLogEntry = () => {
  // This function intentionally left empty as client-side logging is removed
};

export {
  authenticateSocket,
  handleConnection,
  broadcastLogEntry,
  sendNotification,
  broadcastSystemMessage,
};
