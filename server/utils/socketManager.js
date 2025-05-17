import jwt from 'jsonwebtoken';
import { logger } from './logger.js';

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
          decodedToken: { ...decoded, id: decoded.id ? '[REDACTED]' : 'missing' },
        });
        return next(new Error('Authentication error: Invalid token payload'));
      }

      // Store user info in socket object
      socket.user = decoded;
      socket.token = token; // Store token for potential refresh needs

      logger.verbose(`Socket authenticated successfully: ${socket.id}`, {
        socketId: socket.id,
        userId: decoded.id,
        name: decoded.name,
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
      userName: socket.user?.name,
      connectedAt: new Date(),
      rooms: new Set(),
      ip: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent'],
    });

    // Safe logger call without passing the socket object directly
    logger.info(`Socket connected: ${socket.id}`, {
      socketId: socket.id,
      userId: socket.user?.id,
      userName: socket.user?.name,
      timeConnected: new Date().toISOString(),
      connectionCount: activeConnections.size,
    });

    // Send connection acknowledgment to client
    socket.emit('connection_ack', {
      status: 'connected',
      socketId: socket.id,
      userId: socket.user?.id,
      timestamp: new Date().toISOString()
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
        timestamp: new Date().toISOString()
      });
    }

    // Handle document collaboration
    socket.on('join_document', (documentId) => {
      try {
        if (!documentId) {
          logger.warn('Attempted to join document with invalid ID', {
            socketId: socket.id,
            userId: socket.user?.id,
            documentId
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
    });

    // Handle ping/heartbeat to keep connection alive
    socket.on('ping', (callback) => {
      try {
        if (typeof callback === 'function') {
          callback({ status: 'pong', timestamp: new Date().toISOString() });
        } else {
          socket.emit('pong', { timestamp: new Date().toISOString() });
        }
      } catch (error) {
        logger.error(`Error handling ping`, {
          error: error.message,
          socketId: socket.id
        });
      }
    });

    // Clean up on disconnect
    socket.on('disconnect', (reason) => {
      try {
        // Remove from our tracking
        activeConnections.delete(socket.id);
        
        logger.info(`Socket disconnected: ${socket.id}`, {
          socketId: socket.id,
          userId: socket.user?.id,
          timeDisconnected: new Date().toISOString(),
          reason,
          remainingConnections: activeConnections.size
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
      retryAttempt: retryCount > 0 ? `${options.currentRetry || 0}/${retryCount}` : 'no-retry',
    });

    // Check if user has any active connections
    const userRoom = `user:${userId}`;
    const sockets = await io.in(userRoom).fetchSockets();
    result.socketCount = sockets.length;
    
    if (sockets.length === 0 && retryCount === 0) {
      logger.info(`No active connections for user ${userId}, notification queued for database only`, {
        userId,
        notificationId: notification._id,
      });
      
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
    if (options.retryCount > 0 && (!options.currentRetry || options.currentRetry < options.retryCount)) {
      const nextRetry = (options.currentRetry || 0) + 1;
      logger.info(`Scheduling retry ${nextRetry}/${options.retryCount} for notification ${notification?._id}`);
      
      // Schedule retry with exponential backoff
      const backoffMs = Math.min(1000 * Math.pow(2, nextRetry - 1), 30000);
      
      setTimeout(() => {
        sendNotification(io, userId, notification, {
          ...options,
          currentRetry: nextRetry,
        }).catch(err => {
          logger.error(`Retry ${nextRetry} failed for notification ${notification?._id}`, {
            error: err.message,
          });
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
  
  if (ua.includes('mozilla') || ua.includes('firefox') || ua.includes('chrome') || 
      ua.includes('safari') || ua.includes('edge') || ua.includes('opera')) {
    if (ua.includes('mobile')) {
      return 'mobile-browser';
    }
    return 'desktop-browser';
  }
  
  if (ua.includes('android') || ua.includes('iphone') || ua.includes('ipad')) {
    return 'mobile-app';
  }
  
  if (ua.includes('postman') || ua.includes('insomnia') || ua.includes('curl')) {
    return 'api-client';
  }
  
  return 'other';
};

export {
  authenticateSocket,
  handleConnection,
  broadcastLogEntry,
  sendNotification,
  broadcastSystemMessage,
  getUserConnections,
  getConnectionStats,
};
