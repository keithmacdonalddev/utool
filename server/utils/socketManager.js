import jwt from 'jsonwebtoken';
import { logger } from './logger.js';
import {
  authenticateProjectSocket,
  joinProjectRooms,
  handleProjectDisconnection,
  validateActionPermission,
  getProjectRoomStats,
} from '../middleware/projectSocketAuth.js';
import { socketConfig } from '../config/socketConfig.js';

// Track active connections for monitoring and debugging
const activeConnections = new Map();

/**
 * Socket.io middleware for authentication
 * Validates the JWT token before allowing socket connections
 *
 * @param {object} socket - Socket.io socket instance
 * @param {function} next - Middleware callback function
 */
const authenticateSocket = (socket, next) => {
  try {
    // Get token from handshake query or auth object (supporting multiple methods)
    const token =
      socket.handshake.auth.token ||
      socket.handshake.query.token ||
      socket.handshake.headers.authorization?.split(' ')[1];

    if (!token) {
      logger.warn(`Socket authentication failed: No token provided`, {
        socketId: socket.id,
        ip: socket.handshake.address,
        userAgent: socket.handshake.headers['user-agent'],
      });
      return next(new Error('Authentication error: Token not provided'));
    }

    try {
      // Verify token with explicit algorithm specification for security
      const decoded = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ['HS256'], // Explicitly specify the algorithm
      });

      // Validate token has required fields
      if (!decoded.id) {
        logger.warn(`Socket authentication failed: Invalid token payload`, {
          socketId: socket.id,
          decodedToken: {
            ...decoded,
            id: decoded.id ? '[REDACTED]' : 'missing',
          },
        });
        return next(new Error('Authentication error: Invalid token payload'));
      }

      // Store user info in socket object
      socket.user = decoded;
      socket.token = token; // Store token for potential refresh needs

      logger.verbose(`Socket authenticated successfully: ${socket.id}`, {
        socketId: socket.id,
        userId: decoded.id,
        username: decoded.username, // UPDATED from decoded.name
        firstName: decoded.firstName, // ADDED
        role: decoded.role,
      });

      next();
    } catch (err) {
      // Handle specific JWT errors with appropriate messages
      let errorMessage = 'Authentication error: Invalid token';

      if (err.name === 'TokenExpiredError') {
        errorMessage = 'Authentication error: Token expired';
      } else if (err.name === 'JsonWebTokenError') {
        errorMessage = `Authentication error: ${err.message}`;
      }

      logger.error(`Socket authentication failed: ${err.message}`, {
        socketId: socket.id,
        error: err.message,
        errorType: err.name,
        ip: socket.handshake.address,
      });

      next(new Error(errorMessage));
    }
  } catch (err) {
    // Catch any unexpected errors in the authentication process itself
    logger.error(`Unexpected error in socket authentication: ${err.message}`, {
      socketId: socket.id,
      error: err.message,
      stack: err.stack,
    });
    next(new Error('Internal server error during authentication'));
  }
};

/**
 * Socket.io handler for connection
 * Sets up event handlers for the socket and tracks active connections
 *
 * @param {object} io - Socket.io server instance
 * @param {object} socket - Socket.io socket instance
 */
const handleConnection = (io, socket) => {
  try {
    // Track this connection in our activeConnections map
    activeConnections.set(socket.id, {
      userId: socket.user?.id,
      username: socket.user?.username, // UPDATED from userName: socket.user?.name
      firstName: socket.user?.firstName, // ADDED
      connectedAt: new Date(),
      rooms: new Set(),
      ip: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent'],
    });

    // Safe logger call without passing the socket object directly
    logger.info(`Socket connected: ${socket.id}`, {
      socketId: socket.id,
      userId: socket.user?.id,
      username: socket.user?.username, // UPDATED from userName: socket.user?.name
      firstName: socket.user?.firstName, // ADDED
      timeConnected: new Date().toISOString(),
      connectionCount: activeConnections.size,
    });

    // Send connection acknowledgment to client
    socket.emit('connection_ack', {
      status: 'connected',
      socketId: socket.id,
      userId: socket.user?.id,
      timestamp: new Date().toISOString(),
    });

    // Add user to their personal notification room
    if (socket.user && socket.user.id) {
      const userRoom = `user:${socket.user.id}`;
      socket.join(userRoom);

      // Update our tracking
      const connectionInfo = activeConnections.get(socket.id);
      if (connectionInfo) {
        connectionInfo.rooms.add(userRoom);
      }

      logger.info(
        `User ${socket.user.id} joined their private notification room`,
        {
          room: userRoom,
          socketId: socket.id,
        }
      );

      // Notify user of successful subscription to notifications
      socket.emit('notification_status', {
        status: 'subscribed',
        room: userRoom,
        timestamp: new Date().toISOString(),
      });
    }

    // Handle document collaboration
    socket.on('join_document', (documentId) => {
      try {
        if (!documentId) {
          logger.warn('Attempted to join document with invalid ID', {
            socketId: socket.id,
            userId: socket.user?.id,
            documentId,
          });
          socket.emit('error', { message: 'Invalid document ID' });
          return;
        }

        socket.join(documentId);

        // Update our tracking
        const connectionInfo = activeConnections.get(socket.id);
        if (connectionInfo) {
          connectionInfo.rooms.add(documentId);
        }

        logger.verbose(`User joined document: ${documentId}`, {
          socketId: socket.id,
          userId: socket.user?.id,
          documentId,
        });

        // Acknowledge successful join
        socket.emit('document_joined', { documentId });
      } catch (error) {
        logger.error(`Error joining document ${documentId}`, {
          error: error.message,
          stack: error.stack,
        });
        socket.emit('error', { message: 'Failed to join document room' });
      }
    });

    socket.on('send_changes', (data) => {
      try {
        if (data && data.documentId) {
          logger.verbose(`Received document changes`, {
            socketId: socket.id,
            userId: socket.user?.id,
            documentId: data.documentId,
            editorStateSize: data.editorState
              ? JSON.stringify(data.editorState).length
              : 'N/A',
          });

          socket.to(data.documentId).emit('receive_changes', data.editorState);
        } else {
          logger.warn(`Invalid send_changes event received`, {
            socketId: socket.id,
            userId: socket.user?.id,
            dataValid: !!data,
            hasDocumentId: data ? !!data.documentId : false,
          });
          socket.emit('error', { message: 'Invalid document changes' });
        }
      } catch (error) {
        logger.error(`Error processing document changes`, {
          error: error.message,
          stack: error.stack,
          socketId: socket.id,
        });
        socket.emit('error', { message: 'Failed to process document changes' });
      }
    }); // Handle ping/heartbeat to keep connection alive
    socket.on('ping', (data, callback) => {
      try {
        const pongResponse = {
          status: 'pong',
          timestamp: new Date().toISOString(),
          receivedAt: Date.now(),
        };

        if (typeof callback === 'function') {
          // Client sent ping with callback - respond via callback
          callback(pongResponse);
        } else if (typeof data === 'function') {
          // Legacy support: data is actually the callback
          data(pongResponse);
        } else {
          // Fallback: respond via pong event
          socket.emit('pong', pongResponse);
        }

        logger.verbose('Ping received and pong sent', {
          socketId: socket.id,
          userId: socket.user?.id,
          clientTimestamp: data?.timestamp,
          responseMethod:
            typeof callback === 'function'
              ? 'callback'
              : typeof data === 'function'
              ? 'legacy-callback'
              : 'event',
        });
      } catch (error) {
        logger.error(`Error handling ping`, {
          error: error.message,
          socketId: socket.id,
        });
      }
    });

    // Project collaboration handlers
    socket.on('join_project', async (data) => {
      try {
        const { projectId } = data;
        if (!projectId) {
          socket.emit('error', { message: 'Project ID required' });
          return;
        }

        // Set project ID for authentication
        socket.handshake.query.projectId = projectId;

        // Authenticate for project-specific features
        await new Promise((resolve, reject) => {
          authenticateProjectSocket(socket, (error) => {
            if (error) reject(error);
            else resolve();
          });
        });

        // Join project rooms based on permissions
        await joinProjectRooms(socket);

        socket.emit('project_joined', {
          projectId,
          userRole: socket.userRole,
          permissions: socket.permissions,
          timestamp: new Date().toISOString(),
        });

        logger.info(`User joined project collaboration`, {
          userId: socket.userId,
          projectId,
          userRole: socket.userRole,
          socketId: socket.id,
        });
      } catch (error) {
        logger.error('Error joining project collaboration', {
          error: error.message,
          socketId: socket.id,
          projectId: data?.projectId,
        });
        socket.emit('error', {
          message: error.message || 'Failed to join project collaboration',
        });
      }
    });

    // Real-time task updates
    socket.on('task:update', async (data) => {
      try {
        // Validate user has permission to edit tasks
        if (!socket.permissions?.canEditTasks) {
          socket.emit('error', {
            message: 'Permission denied: Cannot edit tasks',
          });
          return;
        }

        const { taskId, updates, optimisticUpdate } = data;

        // Broadcast to other project members
        socket.to(`project:${socket.projectId}`).emit('task:updated', {
          taskId,
          updates,
          updatedBy: {
            id: socket.userId,
            username: socket.user.username,
          },
          timestamp: new Date().toISOString(),
        });

        // If this is an optimistic update, acknowledge immediately
        if (optimisticUpdate) {
          socket.emit('task:update:ack', {
            taskId,
            timestamp: new Date().toISOString(),
          });
        }

        logger.verbose('Task update broadcasted', {
          taskId,
          projectId: socket.projectId,
          updatedBy: socket.userId,
          updateKeys: Object.keys(updates),
        });
      } catch (error) {
        logger.error('Error handling task update', {
          error: error.message,
          socketId: socket.id,
          taskId: data?.taskId,
        });
        socket.emit('error', { message: 'Failed to update task' });
      }
    });

    // Real-time comments
    socket.on('comment:add', async (data) => {
      try {
        if (!socket.permissions?.canComment) {
          socket.emit('error', {
            message: 'Permission denied: Cannot comment',
          });
          return;
        }

        const { taskId, content, parentCommentId } = data;

        // Broadcast new comment to project members
        socket.to(`project:${socket.projectId}`).emit('comment:added', {
          taskId,
          comment: {
            content,
            parentCommentId,
            author: {
              id: socket.userId,
              username: socket.user.username,
            },
            timestamp: new Date().toISOString(),
          },
        });

        socket.emit('comment:add:ack', {
          taskId,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error('Error handling comment add', {
          error: error.message,
          socketId: socket.id,
          taskId: data?.taskId,
        });
        socket.emit('error', { message: 'Failed to add comment' });
      }
    });

    // Typing indicators for comments
    socket.on('comment:typing', (data) => {
      try {
        if (!socket.permissions?.canComment) return;

        const { taskId, isTyping } = data;

        socket.to(`project:${socket.projectId}`).emit('comment:typing', {
          taskId,
          user: {
            id: socket.userId,
            username: socket.user.username,
          },
          isTyping,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error('Error handling typing indicator', {
          error: error.message,
          socketId: socket.id,
        });
      }
    });

    // Clean up on disconnect
    socket.on('disconnect', async (reason) => {
      try {
        // Handle project-specific disconnection
        if (socket.projectId) {
          await handleProjectDisconnection(socket);
        }

        // Remove from our tracking
        activeConnections.delete(socket.id);

        logger.info(`Socket disconnected: ${socket.id}`, {
          socketId: socket.id,
          userId: socket.user?.id,
          projectId: socket.projectId,
          timeDisconnected: new Date().toISOString(),
          reason,
          remainingConnections: activeConnections.size,
        });
      } catch (error) {
        // Use console.error as a last resort if logger itself is failing
        console.error(`Error logging socket disconnect: ${error.message}`);
      }
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.id}`, {
        socketId: socket.id,
        userId: socket.user?.id,
        error: error?.message || 'Unknown error',
      });
    });
  } catch (error) {
    // If we have an error in the main handler, log it directly
    console.error(`Error in socket connection handler: ${error.message}`);
    logger.error(`Error in socket connection handler`, {
      error: error.message,
      stack: error.stack,
      socketId: socket?.id || 'unknown',
    });

    // Try to notify the client
    try {
      if (socket && socket.connected) {
        socket.emit('error', { message: 'Internal server error' });
      }
    } catch (e) {
      // Last resort - just log the failure
      console.error('Failed to send error to client:', e.message);
    }
  }
};

/**
 * Function to send notifications through socket.io with delivery tracking
 *
 * @param {object} io - Socket.io server instance
 * @param {string} userId - User ID to send the notification to
 * @param {object} notification - Notification data
 * @param {object} options - Additional options for notification delivery
 * @returns {Promise<object>} Result of the send operation with delivery status
 */
const sendNotification = async (io, userId, notification, options = {}) => {
  const result = {
    success: false,
    delivered: false,
    error: null,
    socketCount: 0,
    notificationId: notification?._id || null,
  };

  try {
    // Parameter validation with detailed error messages
    if (!io) {
      const error = new Error('Socket.IO instance not provided');
      logger.warn(error.message);
      result.error = error.message;
      return result;
    }

    if (!userId) {
      const error = new Error('User ID not provided');
      logger.warn(error.message);
      result.error = error.message;
      return result;
    }

    if (!notification || typeof notification !== 'object') {
      const error = new Error('Invalid notification object');
      logger.warn(error.message);
      result.error = error.message;
      return result;
    }

    // Ensure notification has required fields
    if (!notification._id) {
      notification._id = new Date().getTime().toString();
    }

    if (!notification.createdAt) {
      notification.createdAt = new Date().toISOString();
    }

    // Extract only what we need to log (avoid sensitive data)
    const notificationSummary = {
      id: notification._id,
      title: notification.title,
      message: notification.message?.substring(0, 100), // Limit message length for logging
      type: notification.type,
    };

    // Get delivery options with defaults
    const {
      retryCount = 0,
      timeout = 5000,
      priority = 'normal',
      saveToDatabase = true,
    } = options;

    logger.verbose(`Attempting to send notification to user: ${userId}`, {
      userId,
      notification: notificationSummary,
      priority,
      retryAttempt:
        retryCount > 0
          ? `${options.currentRetry || 0}/${retryCount}`
          : 'no-retry',
    });

    // Check if user has any active connections
    const userRoom = `user:${userId}`;
    const sockets = await io.in(userRoom).fetchSockets();
    result.socketCount = sockets.length;

    if (sockets.length === 0 && retryCount === 0) {
      logger.info(
        `No active connections for user ${userId}, notification queued for database only`,
        {
          userId,
          notificationId: notification._id,
        }
      );

      // Still mark as success if we're saving to database
      result.success = saveToDatabase;
      return result;
    }

    // Send the notification to all sockets in the user's room
    io.to(userRoom).emit('notification', {
      ...notification,
      _deliveryAttempt: options.currentRetry || 0,
      _deliveryTimestamp: new Date().toISOString(),
    });

    logger.info(`Notification sent to room: ${userRoom}`, {
      userId,
      notificationId: notification._id,
      roomSent: userRoom,
      recipientCount: sockets.length,
    });

    // Mark as successfully delivered
    result.success = true;
    result.delivered = sockets.length > 0;
    return result;
  } catch (error) {
    logger.error(`Error sending notification to user ${userId}`, {
      userId,
      notificationId: notification?._id,
      error: error.message,
      stack: error.stack,
    });

    result.error = error.message;

    // Handle retry logic if configured
    if (
      options.retryCount > 0 &&
      (!options.currentRetry || options.currentRetry < options.retryCount)
    ) {
      const nextRetry = (options.currentRetry || 0) + 1;
      logger.info(
        `Scheduling retry ${nextRetry}/${options.retryCount} for notification ${notification?._id}`
      );

      // Schedule retry with exponential backoff
      const backoffMs = Math.min(1000 * Math.pow(2, nextRetry - 1), 30000);

      setTimeout(() => {
        sendNotification(io, userId, notification, {
          ...options,
          currentRetry: nextRetry,
        }).catch((err) => {
          logger.error(
            `Retry ${nextRetry} failed for notification ${notification?._id}`,
            {
              error: err.message,
            }
          );
        });
      }, backoffMs);

      logger.info(`Retry scheduled in ${backoffMs}ms`);
    }

    return result;
  }
};

/**
 * Function to broadcast system messages to all connected clients
 *
 * @param {object} io - Socket.io server instance
 * @param {string} message - Message to broadcast
 * @param {object} metadata - Additional data to include with the message
 * @returns {boolean} Success or failure of the broadcast operation
 */
const broadcastSystemMessage = (io, message, metadata = {}) => {
  try {
    if (!io) {
      logger.warn('Socket.IO instance not available for broadcasting');
      return false;
    }

    // Create a clean copy of metadata to avoid direct reference
    const metadataCopy = { ...metadata };

    // Ensure we don't have any circular references in the metadata
    const safeMetadata = {};
    Object.keys(metadataCopy).forEach((key) => {
      // Skip problematic keys and complex objects that might have circular refs
      if (
        ![
          'socket',
          'req',
          'res',
          '_events',
          '_eventsCount',
          'connection',
          'client',
          'parser',
          '_httpMessage',
        ].includes(key)
      ) {
        // For simple scalar values, include directly
        if (
          metadataCopy[key] === null ||
          metadataCopy[key] === undefined ||
          typeof metadataCopy[key] !== 'object' ||
          metadataCopy[key] instanceof Date
        ) {
          safeMetadata[key] = metadataCopy[key];
        } else {
          // For objects, process them with sanitizeForLogging first, then stringify
          try {
            // First sanitize to handle any nested circular references
            const sanitized = logger.sanitizeForLogging(metadataCopy[key]);
            // Then use safeStringify for additional safety
            safeMetadata[key] =
              typeof sanitized === 'string'
                ? sanitized
                : logger.safeStringify(sanitized);
          } catch (err) {
            // Provide a safer fallback message
            safeMetadata[key] = `[Complex object removed for safety]`;
            logger.debug(
              `Failed to stringify metadata[${key}]: ${err.message}`
            );
          }
        }
      }
    });

    // Safe logging that won't cause circular reference errors
    logger.verbose(`Broadcasting system message: ${message}`, {
      messageType: typeof message,
      metadataKeys: Object.keys(safeMetadata),
      timestamp: new Date().toISOString(),
    });

    // Send to all authenticated clients
    io.emit('system_message', {
      message,
      timestamp: new Date(),
      ...safeMetadata,
    });

    return true;
  } catch (error) {
    // Enhanced error logging with sanitized error object
    logger.error(`Error broadcasting system message`, {
      message: typeof message === 'string' ? message : '[Non-string message]',
      error: logger.sanitizeForLogging(error),
    });
    return false;
  }
};

// Empty function to maintain compatibility with existing code
const broadcastLogEntry = () => {
  // This function intentionally left empty as client-side logging is removed
};

/**
 * Get active connections for a specific user
 * Useful for monitoring and debugging
 *
 * @param {string} userId - User ID to get connections for
 * @returns {Array} Array of socket connections for the user
 */
const getUserConnections = (userId) => {
  if (!userId) return [];

  const userConnections = [];

  for (const [socketId, connectionInfo] of activeConnections.entries()) {
    if (connectionInfo.userId === userId) {
      userConnections.push({
        socketId,
        connectedAt: connectionInfo.connectedAt,
        rooms: Array.from(connectionInfo.rooms || []),
        userAgent: connectionInfo.userAgent,
      });
    }
  }

  return userConnections;
};

/**
 * Get statistics about active socket connections
 * Useful for monitoring and health checks
 *
 * @returns {Object} Statistics about active connections
 */
const getConnectionStats = () => {
  const stats = {
    totalConnections: activeConnections.size,
    uniqueUsers: new Set(),
    connectionsByUserAgent: {},
    roomStats: {},
  };

  // Process each connection
  for (const connectionInfo of activeConnections.values()) {
    // Count unique users
    if (connectionInfo.userId) {
      stats.uniqueUsers.add(connectionInfo.userId);
    }

    // Count user agents
    const userAgent = connectionInfo.userAgent || 'unknown';
    const userAgentType = getUserAgentType(userAgent);
    stats.connectionsByUserAgent[userAgentType] =
      (stats.connectionsByUserAgent[userAgentType] || 0) + 1;

    // Count rooms
    if (connectionInfo.rooms) {
      for (const room of connectionInfo.rooms) {
        stats.roomStats[room] = (stats.roomStats[room] || 0) + 1;
      }
    }
  }

  // Convert Set to count
  stats.uniqueUsers = stats.uniqueUsers.size;

  return stats;
};

/**
 * Determine the type of user agent (browser, mobile, etc)
 *
 * @param {string} userAgent - User agent string
 * @returns {string} Type of user agent
 */
const getUserAgentType = (userAgent = '') => {
  const ua = userAgent.toLowerCase();

  if (!ua) return 'unknown';

  if (
    ua.includes('mozilla') ||
    ua.includes('firefox') ||
    ua.includes('chrome') ||
    ua.includes('safari') ||
    ua.includes('edge') ||
    ua.includes('opera')
  ) {
    if (ua.includes('mobile')) {
      return 'mobile-browser';
    }
    return 'desktop-browser';
  }

  if (ua.includes('android') || ua.includes('iphone') || ua.includes('ipad')) {
    return 'mobile-app';
  }

  if (
    ua.includes('postman') ||
    ua.includes('insomnia') ||
    ua.includes('curl')
  ) {
    return 'api-client';
  }

  return 'other';
};

/**
 * Get project collaboration statistics
 * Useful for monitoring team collaboration features
 *
 * @param {object} io - Socket.io server instance
 * @param {string} projectId - Project ID to get stats for
 * @returns {Promise<Object>} Project collaboration statistics
 */
const getProjectCollaborationStats = async (io, projectId) => {
  try {
    if (!io || !projectId) {
      return {
        error: 'Invalid parameters',
        totalMembers: 0,
        onlineMembers: 0,
        roomStats: {},
      };
    }

    const roomStats = await getProjectRoomStats(io, projectId);

    return {
      projectId,
      totalMembers: roomStats[`project:${projectId}`]?.connectedUsers || 0,
      onlineMembers: roomStats[`project:${projectId}`]?.connectedUsers || 0,
      editorsOnline:
        roomStats[`project:${projectId}:editors`]?.connectedUsers || 0,
      managersOnline:
        roomStats[`project:${projectId}:managers`]?.connectedUsers || 0,
      analyticsViewersOnline:
        roomStats[`project:${projectId}:analytics`]?.connectedUsers || 0,
      roomStats,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Error getting project collaboration stats', {
      error: error.message,
      projectId,
    });
    return {
      error: error.message,
      projectId,
      totalMembers: 0,
      onlineMembers: 0,
      roomStats: {},
    };
  }
};

/**
 * Enhanced input validation for socket events
 * Prevents injection attacks and malformed data
 */
const validateSocketInput = (eventType, data) => {
  const validationStartTime = Date.now();

  try {
    // Common validation rules
    const commonValidation = {
      maxStringLength: 10000,
      maxArrayLength: 1000,
      allowedTypes: ['string', 'number', 'boolean', 'object'],
    };

    // Event-specific validation rules
    const validationRules = {
      'task:update': {
        required: ['taskId'],
        optional: ['title', 'description', 'status', 'priority', 'assignedTo'],
        maxTitleLength: 200,
        maxDescriptionLength: 5000,
        allowedStatuses: ['pending', 'in-progress', 'completed', 'cancelled'],
        allowedPriorities: ['low', 'medium', 'high', 'critical'],
      },
      'comment:add': {
        required: ['content', 'targetType', 'targetId'],
        optional: ['parentCommentId', 'mentions'],
        maxContentLength: 2000,
        allowedTargetTypes: ['task', 'project', 'file'],
        maxMentions: 10,
      },
      'comment:typing': {
        required: ['targetType', 'targetId'],
        optional: ['isTyping'],
        allowedTargetTypes: ['task', 'project', 'file'],
      },
      'file:upload': {
        required: ['fileName', 'fileSize', 'fileType'],
        optional: ['description', 'folderId'],
        maxFileNameLength: 255,
        maxFileSize: 50 * 1024 * 1024, // 50MB
        allowedFileTypes: [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/pdf',
          'text/plain',
          'text/markdown',
          'application/zip',
          'application/json',
        ],
      },
      'presence:update': {
        required: ['status'],
        optional: ['lastActivity', 'currentView'],
        allowedStatuses: ['online', 'away', 'busy', 'offline'],
        maxCurrentViewLength: 100,
      },
    };

    const rules = validationRules[eventType];
    if (!rules) {
      return {
        valid: false,
        error: `Unknown event type: ${eventType}`,
        validationDurationMs: Date.now() - validationStartTime,
      };
    }

    // Check required fields
    for (const field of rules.required) {
      if (
        !data.hasOwnProperty(field) ||
        data[field] === null ||
        data[field] === undefined
      ) {
        return {
          valid: false,
          error: `Required field missing: ${field}`,
          validationDurationMs: Date.now() - validationStartTime,
        };
      }
    }

    // Validate field types and constraints
    for (const [field, value] of Object.entries(data)) {
      // Skip validation for undefined optional fields
      if (value === undefined || value === null) continue;

      // Type validation
      if (!commonValidation.allowedTypes.includes(typeof value)) {
        return {
          valid: false,
          error: `Invalid type for field ${field}: ${typeof value}`,
          validationDurationMs: Date.now() - validationStartTime,
        };
      }

      // String length validation
      if (typeof value === 'string') {
        const maxLength =
          rules[`max${field.charAt(0).toUpperCase() + field.slice(1)}Length`] ||
          commonValidation.maxStringLength;
        if (value.length > maxLength) {
          return {
            valid: false,
            error: `Field ${field} exceeds maximum length of ${maxLength}`,
            validationDurationMs: Date.now() - validationStartTime,
          };
        }

        // XSS prevention - basic check
        if (value.includes('<script>') || value.includes('javascript:')) {
          return {
            valid: false,
            error: `Field ${field} contains potentially malicious content`,
            validationDurationMs: Date.now() - validationStartTime,
          };
        }
      }

      // Array validation
      if (Array.isArray(value)) {
        if (value.length > commonValidation.maxArrayLength) {
          return {
            valid: false,
            error: `Array field ${field} exceeds maximum length of ${commonValidation.maxArrayLength}`,
            validationDurationMs: Date.now() - validationStartTime,
          };
        }
      }

      // Event-specific validations
      if (
        field === 'status' &&
        rules.allowedStatuses &&
        !rules.allowedStatuses.includes(value)
      ) {
        return {
          valid: false,
          error: `Invalid status: ${value}. Allowed: ${rules.allowedStatuses.join(
            ', '
          )}`,
          validationDurationMs: Date.now() - validationStartTime,
        };
      }

      if (
        field === 'priority' &&
        rules.allowedPriorities &&
        !rules.allowedPriorities.includes(value)
      ) {
        return {
          valid: false,
          error: `Invalid priority: ${value}. Allowed: ${rules.allowedPriorities.join(
            ', '
          )}`,
          validationDurationMs: Date.now() - validationStartTime,
        };
      }

      if (
        field === 'targetType' &&
        rules.allowedTargetTypes &&
        !rules.allowedTargetTypes.includes(value)
      ) {
        return {
          valid: false,
          error: `Invalid target type: ${value}. Allowed: ${rules.allowedTargetTypes.join(
            ', '
          )}`,
          validationDurationMs: Date.now() - validationStartTime,
        };
      }

      if (
        field === 'fileSize' &&
        rules.maxFileSize &&
        value > rules.maxFileSize
      ) {
        return {
          valid: false,
          error: `File size ${value} exceeds maximum of ${rules.maxFileSize} bytes`,
          validationDurationMs: Date.now() - validationStartTime,
        };
      }

      if (
        field === 'fileType' &&
        rules.allowedFileTypes &&
        !rules.allowedFileTypes.includes(value)
      ) {
        return {
          valid: false,
          error: `File type ${value} not allowed`,
          validationDurationMs: Date.now() - validationStartTime,
        };
      }
    }

    return {
      valid: true,
      validationDurationMs: Date.now() - validationStartTime,
    };
  } catch (error) {
    return {
      valid: false,
      error: `Validation error: ${error.message}`,
      validationDurationMs: Date.now() - validationStartTime,
    };
  }
};

/**
 * Rate limiting for socket events per user/room
 * Prevents abuse and accidental overload
 */
const eventRateLimits = new Map(); // userId -> eventType -> { count, resetTime }

const checkEventRateLimit = (userId, eventType, limits = {}) => {
  const now = Date.now();

  // Default rate limits (per minute)
  const defaultLimits = {
    'task:update': { max: 30, window: 60000 },
    'comment:add': { max: 20, window: 60000 },
    'comment:typing': { max: 60, window: 60000 },
    'file:upload': { max: 10, window: 60000 },
    'presence:update': { max: 120, window: 60000 },
    default: { max: 100, window: 60000 },
  };

  const limit =
    limits[eventType] || defaultLimits[eventType] || defaultLimits.default;

  if (!eventRateLimits.has(userId)) {
    eventRateLimits.set(userId, new Map());
  }

  const userLimits = eventRateLimits.get(userId);

  if (!userLimits.has(eventType)) {
    userLimits.set(eventType, { count: 1, resetTime: now + limit.window });
    return {
      allowed: true,
      count: 1,
      remaining: limit.max - 1,
      resetTime: now + limit.window,
    };
  }

  const eventLimit = userLimits.get(eventType);

  // Reset window if expired
  if (now > eventLimit.resetTime) {
    eventLimit.count = 1;
    eventLimit.resetTime = now + limit.window;
    userLimits.set(eventType, eventLimit);
    return {
      allowed: true,
      count: 1,
      remaining: limit.max - 1,
      resetTime: eventLimit.resetTime,
    };
  }

  // Increment count
  eventLimit.count++;
  userLimits.set(eventType, eventLimit);

  return {
    allowed: eventLimit.count <= limit.max,
    count: eventLimit.count,
    remaining: Math.max(0, limit.max - eventLimit.count),
    resetTime: eventLimit.resetTime,
  };
};

/**
 * Broadcast protection to prevent broadcast storms
 */
const broadcastTracker = new Map(); // eventType -> { count, lastReset }
const BROADCAST_STORM_THRESHOLD = 1000; // Max broadcasts per minute
const BROADCAST_WINDOW = 60000; // 1 minute

const checkBroadcastProtection = (eventType) => {
  const now = Date.now();

  if (!broadcastTracker.has(eventType)) {
    broadcastTracker.set(eventType, { count: 1, lastReset: now });
    return { allowed: true, count: 1 };
  }

  const tracker = broadcastTracker.get(eventType);

  // Reset window if expired
  if (now - tracker.lastReset > BROADCAST_WINDOW) {
    tracker.count = 1;
    tracker.lastReset = now;
    broadcastTracker.set(eventType, tracker);
    return { allowed: true, count: 1 };
  }

  // Increment count
  tracker.count++;
  broadcastTracker.set(eventType, tracker);

  return {
    allowed: tracker.count <= BROADCAST_STORM_THRESHOLD,
    count: tracker.count,
    threshold: BROADCAST_STORM_THRESHOLD,
  };
};

/**
 * Enhanced error handling wrapper for event handlers
 */
const wrapEventHandler = (handlerName, handler) => {
  return async (socket, data, callback) => {
    const eventStartTime = Date.now();
    const eventId = `${handlerName}_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    try {
      // Log event start
      logger.debug(`Socket event started: ${handlerName}`, {
        eventId,
        socketId: socket.id,
        userId: socket.userId,
        projectId: socket.projectId,
        userRole: socket.userRole,
        dataKeys: data ? Object.keys(data) : [],
        timestamp: new Date().toISOString(),
      });

      // Input validation
      const validation = validateSocketInput(handlerName, data || {});
      if (!validation.valid) {
        const error = new Error(`Validation failed: ${validation.error}`);
        error.code = 'VALIDATION_ERROR';
        error.eventId = eventId;

        logger.warn(`Socket event validation failed: ${handlerName}`, {
          eventId,
          socketId: socket.id,
          userId: socket.userId,
          projectId: socket.projectId,
          validationError: validation.error,
          validationDurationMs: validation.validationDurationMs,
          eventDurationMs: Date.now() - eventStartTime,
        });

        if (callback) callback({ error: error.message, eventId });
        return;
      }

      // Rate limiting
      const rateLimit = checkEventRateLimit(socket.userId, handlerName);
      if (!rateLimit.allowed) {
        const error = new Error(`Rate limit exceeded for ${handlerName}`);
        error.code = 'RATE_LIMIT_EXCEEDED';
        error.eventId = eventId;

        logger.warn(`Socket event rate limited: ${handlerName}`, {
          eventId,
          socketId: socket.id,
          userId: socket.userId,
          projectId: socket.projectId,
          rateLimitCount: rateLimit.count,
          resetTime: rateLimit.resetTime,
          eventDurationMs: Date.now() - eventStartTime,
        });

        if (callback)
          callback({
            error: error.message,
            eventId,
            rateLimitInfo: {
              resetTime: rateLimit.resetTime,
              remaining: rateLimit.remaining,
            },
          });
        return;
      }

      // Execute handler
      const result = await handler(socket, data, callback, eventId);

      // Log successful completion
      const eventDuration = Date.now() - eventStartTime;
      logger.info(`Socket event completed: ${handlerName}`, {
        eventId,
        socketId: socket.id,
        userId: socket.userId,
        projectId: socket.projectId,
        eventDurationMs: eventDuration,
        validationDurationMs: validation.validationDurationMs,
        success: true,
        resultType: typeof result,
      });

      return result;
    } catch (error) {
      const eventDuration = Date.now() - eventStartTime;

      // Enhanced error logging
      logger.error(`Socket event error: ${handlerName}`, {
        eventId,
        socketId: socket.id,
        userId: socket.userId,
        projectId: socket.projectId,
        error: error.message,
        errorCode: error.code || 'UNKNOWN_ERROR',
        stack: error.stack,
        eventDurationMs: eventDuration,
        success: false,
        data: data ? JSON.stringify(data, null, 2).substring(0, 500) : 'none',
      });

      // Send error response to client
      if (callback) {
        callback({
          error: 'An error occurred while processing your request',
          eventId,
          code: error.code || 'INTERNAL_ERROR',
        });
      }

      // Broadcast error to room if it affects multiple users
      if (error.broadcastError && socket.projectId) {
        const broadcastProtection = checkBroadcastProtection('error');
        if (broadcastProtection.allowed) {
          socket.to(`project:${socket.projectId}`).emit('error:broadcast', {
            message: 'A project-wide error occurred',
            eventId,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }
  };
};

// Enhanced project collaboration handlers with comprehensive error handling and logging
const setupProjectCollaborationHandlers = (io) => {
  /**
   * Enhanced join project handler with detailed logging and error handling
   */
  const handleJoinProject = wrapEventHandler(
    'join_project',
    async (socket, data, callback, eventId) => {
      const { projectId } = data;

      if (!projectId || projectId !== socket.projectId) {
        const error = new Error('Invalid project ID or unauthorized access');
        error.code = 'INVALID_PROJECT';
        throw error;
      }

      // Join project-specific rooms based on permissions
      await joinProjectRooms(socket);

      // Get current project statistics
      const projectStats = await getProjectRoomStats(io, projectId);

      // Broadcast user joined to other project members
      const broadcastProtection = checkBroadcastProtection('user:joined');
      if (broadcastProtection.allowed) {
        socket.to(`project:${projectId}`).emit('user:joined', {
          userId: socket.userId,
          username: socket.user.username,
          userRole: socket.userRole,
          timestamp: new Date().toISOString(),
          projectStats: projectStats.stats
            ? projectStats.stats[`project:${projectId}`]
            : null,
        });

        logger.info('User joined project broadcast sent', {
          eventId,
          userId: socket.userId,
          projectId,
          broadcastRecipients: projectStats.stats
            ? projectStats.stats[`project:${projectId}`]?.connectedUsers - 1
            : 0,
        });
      } else {
        logger.warn('Join project broadcast blocked due to storm protection', {
          eventId,
          userId: socket.userId,
          projectId,
          broadcastCount: broadcastProtection.count,
        });
      }

      // Return success with project context
      if (callback) {
        callback({
          success: true,
          eventId,
          projectId,
          userRole: socket.userRole,
          permissions: Object.keys(socket.permissions).filter(
            (key) => socket.permissions[key]
          ),
          projectStats,
        });
      }
    }
  );

  /**
   * Enhanced task update handler with database optimization and conflict resolution
   */
  const handleTaskUpdate = wrapEventHandler(
    'task:update',
    async (socket, data, callback, eventId) => {
      const { taskId, updates, version } = data;

      if (!socket.permissions.canEditTasks) {
        const error = new Error('Permission denied: Cannot edit tasks');
        error.code = 'PERMISSION_DENIED';
        throw error;
      }

      // Database operation with optimistic concurrency control
      const dbStartTime = Date.now();
      try {
        // Simulate database update with version checking
        const updateResult = await updateTaskWithConcurrencyControl(
          taskId,
          updates,
          version,
          socket.userId
        );
        const dbDuration = Date.now() - dbStartTime;

        logger.debug('Task update database operation completed', {
          eventId,
          taskId,
          userId: socket.userId,
          projectId: socket.projectId,
          dbDurationMs: dbDuration,
          updatedFields: Object.keys(updates),
          version: updateResult.newVersion,
        });

        // Broadcast update to project members
        const broadcastData = {
          taskId,
          updates: updateResult.task,
          updatedBy: {
            userId: socket.userId,
            username: socket.user.username,
          },
          timestamp: new Date().toISOString(),
          version: updateResult.newVersion,
          eventId,
        };

        const broadcastProtection = checkBroadcastProtection('task:update');
        if (broadcastProtection.allowed) {
          // Broadcast to different rooms based on update sensitivity
          const isMinorUpdate = ['lastActivity', 'viewCount'].some((field) =>
            Object.keys(updates).includes(field)
          );
          const targetRoom = isMinorUpdate
            ? `project:${socket.projectId}:editors`
            : `project:${socket.projectId}`;

          socket.to(targetRoom).emit('task:updated', broadcastData);

          logger.info('Task update broadcast sent', {
            eventId,
            taskId,
            userId: socket.userId,
            projectId: socket.projectId,
            targetRoom,
            updatedFields: Object.keys(updates),
            broadcastCount: broadcastProtection.count,
          });
        } else {
          logger.warn('Task update broadcast blocked due to storm protection', {
            eventId,
            taskId,
            userId: socket.userId,
            projectId: socket.projectId,
            broadcastCount: broadcastProtection.count,
          });
        }

        // Success response
        if (callback) {
          callback({
            success: true,
            eventId,
            task: updateResult.task,
            version: updateResult.newVersion,
            dbDurationMs: dbDuration,
          });
        }
      } catch (dbError) {
        const dbDuration = Date.now() - dbStartTime;

        logger.error('Task update database error', {
          eventId,
          taskId,
          userId: socket.userId,
          projectId: socket.projectId,
          dbError: dbError.message,
          dbDurationMs: dbDuration,
          updates: JSON.stringify(updates),
        });

        if (dbError.code === 'VERSION_CONFLICT') {
          const error = new Error(
            'Task was modified by another user. Please refresh and try again.'
          );
          error.code = 'CONCURRENT_MODIFICATION';
          error.currentVersion = dbError.currentVersion;
          throw error;
        }

        const error = new Error('Failed to update task in database');
        error.code = 'DATABASE_ERROR';
        error.broadcastError = true; // This error affects other users
        throw error;
      }
    }
  );

  /**
   * Enhanced comment handler with mention notifications and threading
   */
  const handleCommentAdd = wrapEventHandler(
    'comment:add',
    async (socket, data, callback, eventId) => {
      const { content, targetType, targetId, parentCommentId, mentions } = data;

      if (!socket.permissions.canComment) {
        const error = new Error('Permission denied: Cannot add comments');
        error.code = 'PERMISSION_DENIED';
        throw error;
      }

      // Database operation
      const dbStartTime = Date.now();
      try {
        const comment = await createComment({
          content,
          targetType,
          targetId,
          authorId: socket.userId,
          projectId: socket.projectId,
          parentCommentId,
          mentions,
        });

        const dbDuration = Date.now() - dbStartTime;

        logger.debug('Comment creation database operation completed', {
          eventId,
          commentId: comment._id,
          targetType,
          targetId,
          userId: socket.userId,
          projectId: socket.projectId,
          dbDurationMs: dbDuration,
          hasMentions: mentions && mentions.length > 0,
          isReply: !!parentCommentId,
        });

        // Broadcast comment to project members
        const broadcastData = {
          comment: {
            _id: comment._id,
            content: comment.content,
            targetType,
            targetId,
            author: {
              _id: socket.userId,
              username: socket.user.username,
            },
            parentCommentId,
            mentions,
            createdAt: comment.createdAt,
          },
          timestamp: new Date().toISOString(),
          eventId,
        };

        const broadcastProtection = checkBroadcastProtection('comment:add');
        if (broadcastProtection.allowed) {
          socket
            .to(`project:${socket.projectId}`)
            .emit('comment:added', broadcastData);

          // Send direct notifications to mentioned users
          if (mentions && mentions.length > 0) {
            for (const mentionedUserId of mentions) {
              socket
                .to(`project:${socket.projectId}:user:${mentionedUserId}`)
                .emit('comment:mention', {
                  ...broadcastData,
                  mentionType: 'direct',
                });
            }
          }

          logger.info('Comment broadcast sent', {
            eventId,
            commentId: comment._id,
            userId: socket.userId,
            projectId: socket.projectId,
            mentionCount: mentions ? mentions.length : 0,
            broadcastCount: broadcastProtection.count,
          });
        } else {
          logger.warn('Comment broadcast blocked due to storm protection', {
            eventId,
            commentId: comment._id,
            userId: socket.userId,
            projectId: socket.projectId,
            broadcastCount: broadcastProtection.count,
          });
        }

        // Success response
        if (callback) {
          callback({
            success: true,
            eventId,
            comment: broadcastData.comment,
            dbDurationMs: dbDuration,
          });
        }
      } catch (dbError) {
        const dbDuration = Date.now() - dbStartTime;

        logger.error('Comment creation database error', {
          eventId,
          targetType,
          targetId,
          userId: socket.userId,
          projectId: socket.projectId,
          dbError: dbError.message,
          dbDurationMs: dbDuration,
        });

        const error = new Error('Failed to create comment');
        error.code = 'DATABASE_ERROR';
        throw error;
      }
    }
  );

  /**
   * Enhanced typing indicator with intelligent debouncing
   */
  const handleCommentTyping = wrapEventHandler(
    'comment:typing',
    async (socket, data, callback, eventId) => {
      const { targetType, targetId, isTyping } = data;

      // Lightweight operation - no database needed
      const broadcastData = {
        userId: socket.userId,
        username: socket.user.username,
        targetType,
        targetId,
        isTyping,
        timestamp: new Date().toISOString(),
      };

      const broadcastProtection = checkBroadcastProtection('comment:typing');
      if (broadcastProtection.allowed) {
        socket
          .to(`project:${socket.projectId}`)
          .emit('comment:typing', broadcastData);
      } else {
        // For typing indicators, we can be more lenient with storm protection
        // and just log a debug message instead of blocking
        logger.debug(
          'Typing indicator broadcast skipped due to high frequency',
          {
            eventId,
            userId: socket.userId,
            projectId: socket.projectId,
            broadcastCount: broadcastProtection.count,
          }
        );
      }

      // Acknowledge receipt
      if (callback) {
        callback({
          success: true,
          eventId,
        });
      }
    }
  );

  /**
   * Enhanced leave project handler with comprehensive cleanup and notifications
   */
  const handleLeaveProject = wrapEventHandler(
    'leave_project',
    async (socket, data, callback, eventId) => {
      const { projectId } = data || {};
      const socketProjectId = socket.projectId;

      // Validate project context - allow leaving if socket has projectId or data specifies valid projectId
      const targetProjectId = projectId || socketProjectId;
      if (!targetProjectId) {
        const error = new Error('No project to leave');
        error.code = 'NO_PROJECT_CONTEXT';
        throw error;
      }

      // Validate authorization - user can only leave projects they're currently in
      if (socketProjectId && projectId && projectId !== socketProjectId) {
        const error = new Error(
          'Cannot leave project - not currently in specified project'
        );
        error.code = 'UNAUTHORIZED_LEAVE';
        throw error;
      }

      logger.info('Processing leave project request', {
        eventId,
        userId: socket.userId,
        username: socket.user?.username,
        targetProjectId,
        socketProjectId,
        currentRooms: Array.from(socket.rooms),
      });

      try {
        // Get project statistics before leaving
        const preLeaveStats = await getProjectRoomStats(io, targetProjectId);

        // Leave all project-specific rooms
        const projectRooms = [
          `project:${targetProjectId}`,
          `project:${targetProjectId}:editors`,
          `project:${targetProjectId}:viewers`,
          `project:${targetProjectId}:commenters`,
        ];

        let roomsLeft = 0;
        for (const room of projectRooms) {
          if (socket.rooms.has(room)) {
            socket.leave(room);
            roomsLeft++;
            logger.debug(`Socket left room: ${room}`, {
              eventId,
              userId: socket.userId,
              targetProjectId,
            });
          }
        }

        // Clear project-related socket properties
        if (socket.projectId === targetProjectId) {
          socket.projectId = null;
          socket.userRole = null;
          socket.permissions = {};
        }

        // Update connection tracking
        const connectionInfo = activeConnections.get(socket.id);
        if (connectionInfo && connectionInfo.rooms) {
          projectRooms.forEach((room) => connectionInfo.rooms.delete(room));
          connectionInfo.projectId = null;
          connectionInfo.lastActivity = new Date();
        }

        // Get updated project statistics
        const postLeaveStats = await getProjectRoomStats(io, targetProjectId);

        // Notify other project members about user leaving
        const broadcastProtection = checkBroadcastProtection('user:left');
        if (broadcastProtection.allowed) {
          const userLeftData = {
            userId: socket.userId,
            username: socket.user?.username,
            timestamp: new Date().toISOString(),
            projectStats: postLeaveStats.stats
              ? postLeaveStats.stats[`project:${targetProjectId}`]
              : null,
            eventId,
          };

          // Broadcast to remaining project members
          socket
            .to(`project:${targetProjectId}`)
            .emit('user:left', userLeftData);

          logger.info('User left project broadcast sent', {
            eventId,
            userId: socket.userId,
            username: socket.user?.username,
            targetProjectId,
            remainingUsers: postLeaveStats.stats
              ? postLeaveStats.stats[`project:${targetProjectId}`]
                  ?.connectedUsers
              : 0,
            broadcastCount: broadcastProtection.count,
          });
        } else {
          logger.warn(
            'Leave project broadcast blocked due to storm protection',
            {
              eventId,
              userId: socket.userId,
              targetProjectId,
              broadcastCount: broadcastProtection.count,
            }
          );
        }

        // Clean up any project-specific presence data
        socket.emit('presence:cleared', {
          projectId: targetProjectId,
          timestamp: new Date().toISOString(),
        });

        // Performance metrics
        const processingDuration =
          Date.now() - (socket.eventStartTime || Date.now());

        // Success response with comprehensive feedback
        if (callback) {
          callback({
            success: true,
            eventId,
            projectId: targetProjectId,
            roomsLeft,
            projectStats: {
              before: preLeaveStats.stats
                ? preLeaveStats.stats[`project:${targetProjectId}`]
                : null,
              after: postLeaveStats.stats
                ? postLeaveStats.stats[`project:${targetProjectId}`]
                : null,
            },
            processingDurationMs: processingDuration,
            timestamp: new Date().toISOString(),
          });
        }

        logger.info('Leave project completed successfully', {
          eventId,
          userId: socket.userId,
          username: socket.user?.username,
          targetProjectId,
          roomsLeft,
          processingDurationMs: processingDuration,
          remainingConnections: postLeaveStats.stats
            ? postLeaveStats.stats[`project:${targetProjectId}`]?.connectedUsers
            : 0,
        });
      } catch (operationError) {
        logger.error('Leave project operation failed', {
          eventId,
          userId: socket.userId,
          targetProjectId,
          operationError: operationError.message,
          stack: operationError.stack,
        });

        const error = new Error('Failed to leave project');
        error.code = 'LEAVE_OPERATION_FAILED';
        error.originalError = operationError.message;
        throw error;
      }
    }
  );

  // Register enhanced handlers with the socket manager
  io.on('connection', (socket) => {
    if (socket.projectId) {
      socket.on('join_project', (data, callback) =>
        handleJoinProject(socket, data, callback)
      );
      socket.on('task:update', (data, callback) =>
        handleTaskUpdate(socket, data, callback)
      );
      socket.on('comment:add', (data, callback) =>
        handleCommentAdd(socket, data, callback)
      );
      socket.on('comment:typing', (data, callback) =>
        handleCommentTyping(socket, data, callback)
      );
      socket.on('leave_project', (data, callback) =>
        handleLeaveProject(socket, data, callback)
      );
    }
  });
};

/**
 * Simulated database functions with error handling
 * In real implementation, these would connect to your actual database
 */
const updateTaskWithConcurrencyControl = async (
  taskId,
  updates,
  clientVersion,
  userId
) => {
  // Simulate database delay
  await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));

  // Simulate version conflict
  if (Math.random() < 0.05) {
    // 5% chance of conflict
    const error = new Error('Version conflict detected');
    error.code = 'VERSION_CONFLICT';
    error.currentVersion = clientVersion + 1;
    throw error;
  }

  // Simulate successful update
  return {
    task: {
      _id: taskId,
      ...updates,
      updatedBy: userId,
      updatedAt: new Date(),
    },
    newVersion: (clientVersion || 0) + 1,
  };
};

const createComment = async (commentData) => {
  // Simulate database delay
  await new Promise((resolve) => setTimeout(resolve, Math.random() * 150));

  // Simulate random database error
  if (Math.random() < 0.02) {
    // 2% chance of error
    const error = new Error('Database connection timeout');
    error.code = 'DATABASE_TIMEOUT';
    throw error;
  }

  // Simulate successful creation
  return {
    _id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ...commentData,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

/**
 * Enhanced monitoring and metrics collection
 */
const getSocketMetrics = () => {
  const metrics = {
    activeConnections: getActiveConnectionsStats(),
    rateLimiting: {
      totalUsers: eventRateLimits.size,
      activeWindows: 0,
    },
    broadcastProtection: {
      trackedEvents: broadcastTracker.size,
      recentActivity: {},
    },
    timestamp: new Date().toISOString(),
  };

  // Count active rate limit windows
  const now = Date.now();
  for (const [userId, userLimits] of eventRateLimits.entries()) {
    for (const [eventType, limit] of userLimits.entries()) {
      if (limit.resetTime > now) {
        metrics.rateLimiting.activeWindows++;
      }
    }
  }

  // Recent broadcast activity
  for (const [eventType, tracker] of broadcastTracker.entries()) {
    if (now - tracker.lastReset < BROADCAST_WINDOW) {
      metrics.broadcastProtection.recentActivity[eventType] = {
        count: tracker.count,
        timeRemaining: BROADCAST_WINDOW - (now - tracker.lastReset),
      };
    }
  }

  return metrics;
};

/**
 * Cleanup function for maintenance
 */
const performSocketCleanup = () => {
  const now = Date.now();
  let cleanedRateLimits = 0;
  let cleanedBroadcastTrackers = 0;

  // Clean expired rate limits
  for (const [userId, userLimits] of eventRateLimits.entries()) {
    for (const [eventType, limit] of userLimits.entries()) {
      if (limit.resetTime <= now) {
        userLimits.delete(eventType);
        cleanedRateLimits++;
      }
    }
    if (userLimits.size === 0) {
      eventRateLimits.delete(userId);
    }
  }

  // Clean old broadcast trackers
  for (const [eventType, tracker] of broadcastTracker.entries()) {
    if (now - tracker.lastReset > BROADCAST_WINDOW * 2) {
      broadcastTracker.delete(eventType);
      cleanedBroadcastTrackers++;
    }
  }

  logger.debug('Socket cleanup completed', {
    cleanedRateLimits,
    cleanedBroadcastTrackers,
    remainingRateLimitUsers: eventRateLimits.size,
    remainingBroadcastTrackers: broadcastTracker.size,
  });

  return {
    cleanedRateLimits,
    cleanedBroadcastTrackers,
    remainingRateLimitUsers: eventRateLimits.size,
    remainingBroadcastTrackers: broadcastTracker.size,
  };
};

// Schedule periodic cleanup (every 5 minutes)
setInterval(performSocketCleanup, 5 * 60 * 1000);

/**
 * Additional methods for push notification manager integration
 */

/**
 * Emit an event to all users in a specific project
 * @param {string} projectId - Project ID
 * @param {string} event - Event name
 * @param {Object} data - Data to send
 */
const emitToProject = (projectId, event, data) => {
  try {
    if (!projectId || !event) {
      logger.warn('emitToProject: Missing projectId or event', {
        projectId,
        event,
      });
      return false;
    }

    // Get the io instance (assuming it's available in the module scope)
    // This would need to be properly initialized with the socket.io instance
    if (typeof global !== 'undefined' && global.io) {
      global.io.to(`project:${projectId}`).emit(event, data);

      logger.debug('Event emitted to project', {
        projectId,
        event,
        dataKeys: Object.keys(data || {}),
      });

      return true;
    } else {
      logger.error('Socket.io instance not available in emitToProject');
      return false;
    }
  } catch (error) {
    logger.error('Error in emitToProject', {
      error: error.message,
      projectId,
      event,
    });
    return false;
  }
};

/**
 * Emit an event to a specific user
 * @param {string} userId - User ID
 * @param {string} event - Event name
 * @param {Object} data - Data to send
 */
const emitToUser = (userId, event, data) => {
  try {
    if (!userId || !event) {
      logger.warn('emitToUser: Missing userId or event', {
        userId,
        event,
      });
      return false;
    }

    if (typeof global !== 'undefined' && global.io) {
      const userRoom = `user:${userId}`;
      global.io.to(userRoom).emit(event, data);

      logger.debug('Event emitted to user', {
        userId,
        userRoom,
        event,
        dataKeys: Object.keys(data || {}),
      });

      return true;
    } else {
      logger.error('Socket.io instance not available in emitToUser');
      return false;
    }
  } catch (error) {
    logger.error('Error in emitToUser', {
      error: error.message,
      userId,
      event,
    });
    return false;
  }
};

/**
 * Emit an event to all users in a project except the sender
 * @param {string} projectId - Project ID
 * @param {string} senderId - Sender user ID to exclude
 * @param {string} event - Event name
 * @param {Object} data - Data to send
 */
const emitToProjectExcept = (projectId, senderId, event, data) => {
  try {
    if (!projectId || !senderId || !event) {
      logger.warn('emitToProjectExcept: Missing required parameters', {
        projectId,
        senderId,
        event,
      });
      return false;
    }

    if (typeof global !== 'undefined' && global.io) {
      // Get all sockets in the project room
      const projectRoom = `project:${projectId}`;
      const senderUserRoom = `user:${senderId}`;

      // Emit to project room but exclude sender's user room
      global.io.to(projectRoom).except(senderUserRoom).emit(event, data);

      logger.debug('Event emitted to project except sender', {
        projectId,
        senderId,
        event,
        dataKeys: Object.keys(data || {}),
      });

      return true;
    } else {
      logger.error('Socket.io instance not available in emitToProjectExcept');
      return false;
    }
  } catch (error) {
    logger.error('Error in emitToProjectExcept', {
      error: error.message,
      projectId,
      senderId,
      event,
    });
    return false;
  }
};

/**
 * Get set of currently online user IDs
 * @returns {Set<string>} Set of online user IDs
 */
const getOnlineUsers = () => {
  try {
    const onlineUsers = new Set();

    // Extract unique user IDs from active connections
    for (const connectionInfo of activeConnections.values()) {
      if (connectionInfo.userId) {
        onlineUsers.add(connectionInfo.userId);
      }
    }

    logger.debug('Retrieved online users', {
      count: onlineUsers.size,
    });

    return onlineUsers;
  } catch (error) {
    logger.error('Error getting online users', {
      error: error.message,
    });
    return new Set();
  }
};

/**
 * Initialize socket.io instance for use by helper methods
 * This should be called from the main server setup
 * @param {Object} ioInstance - Socket.io server instance
 */
const initializeSocketManager = (ioInstance) => {
  if (typeof global !== 'undefined') {
    global.io = ioInstance;
    logger.info('Socket manager initialized with io instance');
  } else {
    logger.warn(
      'Global object not available for socket manager initialization'
    );
  }
};

export {
  authenticateSocket,
  handleConnection,
  broadcastLogEntry,
  sendNotification,
  broadcastSystemMessage,
  getUserConnections,
  getConnectionStats,
  getProjectCollaborationStats,
  validateSocketInput,
  checkEventRateLimit,
  checkBroadcastProtection,
  wrapEventHandler,
  setupProjectCollaborationHandlers,
  getSocketMetrics,
  performSocketCleanup,
  // New methods for push notification manager
  emitToProject,
  emitToUser,
  emitToProjectExcept,
  getOnlineUsers,
  initializeSocketManager,
};
