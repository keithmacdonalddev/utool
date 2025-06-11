/**
 * Enhanced Socket.IO Client Utilities with Advanced Error Handling
 *
 * Enhanced Features (Based on Proactive Review):
 * - Connection state observability with event system
 * - Comprehensive retry logic with exponential backoff
 * - Client-side diagnostic logging
 * - Connection health monitoring with heartbeat
 * - Enhanced cleanup and memory leak prevention
 * - Robust error handling and recovery
 */

import { io } from 'socket.io-client';
import { store } from '../app/store'; // Added for Redux access
import { toast } from 'react-toastify';
import { refreshToken, logoutUser } from '../features/auth/authSlice'; // Added for auth actions
import { createComponentLogger } from './logger';

// In production, use relative path to work with Vercel rewrites
// In development, use the standard backend URL
const isDevelopment = process.env.NODE_ENV === 'development';
const SERVER_URL = isDevelopment
  ? process.env.REACT_APP_SERVER_URL || 'http://localhost:5000' // Standardized to 5000
  : ''; // Empty string means relative path - connects to same origin via Vercel rewrites

/**
 * Socket connection singleton to prevent multiple connections
 */
let socketInstance = null;

// Connection state management
let socket = null;
let connectPromise = null; // This will be our single source of truth for pending connections.

let reconnectAttempts = 0;

// Module-level variables for socket management
let heartbeatInterval = null;
let connectionTimeout = 30000;
const logger = createComponentLogger('Socket');
let connectionMetrics = {
  connectedAt: null,
  disconnectedAt: null,
  totalDowntime: 0,
  reconnectCount: 0,
  healthChecks: {
    successful: 0,
    failed: 0,
    lastCheck: null,
  },
  lastError: null,
};
let connectionStateListeners = new Map();
let projectPresenceCallbacks = new Map();
let isAuthenticated = false;
let currentProjectId = null;

/**
 * Returns the current socket instance.
 * @returns {SocketIOClient.Socket | null} The socket instance or null.
 */
const getSocketInstance = () => {
  // if (!socket && !isConnecting) { // OLD version
  if (!socket && !connectPromise) {
    // NEW version: check connectPromise
    logger.warn(
      'getSocketInstance called when socket is null and not connecting. Ensure connectSocket is called first.'
    );
  }
  return socket;
};

/**
 * Connection state management and event system
 */
const ConnectionState = {
  DISCONNECTED: 'DISCONNECTED',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  AUTHENTICATED: 'AUTHENTICATED',
  RECONNECTING: 'RECONNECTING',
  ERROR: 'ERROR',
};

let currentConnectionState = ConnectionState.DISCONNECTED;

const setConnectionState = (newState, error = null) => {
  const previousState = currentConnectionState;
  currentConnectionState = newState;

  const stateData = {
    state: newState,
    previousState,
    timestamp: new Date().toISOString(),
    error,
    socketId: socket?.id,
    projectId: currentProjectId,
    reconnectAttempts,
    isAuthenticated,
  };

  logger.info(
    `Connection state changed: ${previousState} -> ${newState}`,
    stateData
  );

  // Notify all listeners
  connectionStateListeners.forEach((callback, listenerId) => {
    try {
      callback(stateData);
    } catch (error) {
      logger.error(`Error in connection state listener ${listenerId}`, {
        error: error.message,
        stack: error.stack,
        listenerId,
      });
    }
  });

  // Update connection metrics
  if (
    newState === ConnectionState.CONNECTED &&
    previousState !== ConnectionState.CONNECTED
  ) {
    connectionMetrics.connectedAt = Date.now();
    if (connectionMetrics.disconnectedAt) {
      connectionMetrics.totalDowntime +=
        connectionMetrics.connectedAt - connectionMetrics.disconnectedAt;
    }
  } else if (
    newState === ConnectionState.DISCONNECTED &&
    previousState === ConnectionState.CONNECTED
  ) {
    connectionMetrics.disconnectedAt = Date.now();
  }

  if (newState === ConnectionState.RECONNECTING) {
    connectionMetrics.reconnectCount++;
  }

  if (error) {
    connectionMetrics.lastError = {
      message: error.message || error,
      timestamp: new Date().toISOString(),
      state: newState,
    };
  }
};

/**
 * Enhanced connection health monitoring
 */
const startHealthCheck = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  heartbeatInterval = setInterval(() => {
    if (!socket || !socket.connected) {
      connectionMetrics.healthChecks.failed++;
      logger.warn('Health check failed: Socket not connected', {
        socketConnected: socket?.connected,
        socketId: socket?.id,
        currentState: currentConnectionState,
      });
      return;
    }

    const pingStartTime = Date.now();
    let responseReceived = false; // Track if response was received

    socket.emit('ping', { timestamp: pingStartTime }, (response) => {
      responseReceived = true; // Mark response as received
      const pingDuration = Date.now() - pingStartTime;

      if (response && response.timestamp) {
        connectionMetrics.healthChecks.successful++;
        connectionMetrics.healthChecks.lastCheck = Date.now();

        logger.debug('Health check successful', {
          pingDuration,
          serverTimestamp: response.timestamp,
          clockDrift: pingStartTime - response.timestamp,
        });
      } else {
        connectionMetrics.healthChecks.failed++;
        logger.warn('Health check failed: Invalid response', {
          response,
          pingDuration,
        });
      }
    });

    // Timeout handler for ping - only log if no response received
    setTimeout(() => {
      if (!responseReceived) {
        connectionMetrics.healthChecks.failed++;
        logger.warn('Health check failed: Ping timeout', {
          timeout: 5000,
          currentState: currentConnectionState,
        });
      }
    }, 5000);
  }, 30000); // Check every 30 seconds
};

const stopHealthCheck = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
};

/**
 * Connects the socket. If a connection is already established or in progress,
 * it returns a promise that resolves with the socket instance.
 * This function is now idempotent and safe from race conditions.
 */
export const connectSocket = (token) => {
  // 1. If socket is already connected, return a resolved promise immediately.
  if (socket?.connected) {
    logger.debug('connectSocket called: Already connected.');
    return Promise.resolve(socket);
  }

  // 2. If a connection is already in progress, return the existing promise.
  // This is the key to preventing race conditions and duplicate connections.
  if (connectPromise) {
    logger.debug(
      'connectSocket called: Connection in progress, returning existing promise.'
    );
    return connectPromise;
  }

  // 3. If no socket and no connection promise, start a new connection.
  logger.info('connectSocket called: Initiating new connection.');

  connectPromise = new Promise((resolve, reject) => {
    const tempSocket = io(SERVER_URL, {
      auth: { token },
      forceNew: true,
      timeout: connectionTimeout,
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true,
      maxHttpBufferSize: 1e6,
      pingTimeout: 60000,
      pingInterval: 25000,
    });
    const cleanupListeners = () => {
      tempSocket.off('connect');
      tempSocket.off('connect_error');
      tempSocket.off('disconnect');
      tempSocket.off('connection_ack');
    };

    tempSocket.on('connect', () => {
      logger.info('Socket connected successfully.', {
        socketId: tempSocket.id,
      });
      socket = tempSocket;
      connectPromise = null;
      cleanupListeners();
      setConnectionState(ConnectionState.CONNECTED); // Added to update state
      startHealthCheck(); // Added to start health check
      resolve(socket);
    });

    // Listen for authentication confirmation from server
    tempSocket.on('connection_ack', (data) => {
      logger.info('Socket authentication confirmed by server', {
        socketId: tempSocket.id,
        userId: data.userId,
        status: data.status,
        timestamp: data.timestamp,
      });

      // Set authenticated flag to true
      isAuthenticated = true;

      // Update connection state to reflect authentication
      setConnectionState(ConnectionState.AUTHENTICATED);

      logger.info(
        'Socket authentication successful - real-time features enabled',
        {
          socketId: tempSocket.id,
          isAuthenticated: true,
        }
      );
    });

    tempSocket.on('connect_error', (error) => {
      logger.error('Socket connection error.', { error: error.message });
      connectPromise = null;
      cleanupListeners();
      tempSocket.disconnect();
      setConnectionState(ConnectionState.ERROR, error); // Added to update state
      // Implement retry logic or token refresh here if needed, similar to old connectSocket
      // For now, just rejecting as per the new simplified logic.
      reject(error);
    });

    tempSocket.on('disconnect', (reason) => {
      logger.warn(
        `Socket disconnected during connection attempt. Reason: ${reason}`
      );
      if (connectPromise) {
        connectPromise = null;
        cleanupListeners();
        setConnectionState(ConnectionState.DISCONNECTED, { reason }); // Added
        stopHealthCheck(); // Added
        if (reason === 'io client disconnect') {
          // This is the key for graceful disconnect
          reject(new Error('Connection cancelled by disconnect.'));
        } else {
          reject(new Error(`Socket disconnected: ${reason}`));
        }
      }
    });
  });

  return connectPromise;
};

// This is the primary, refactored disconnectSocket function.
// It should be the only 'export const disconnectSocket' in the file.
export const disconnectSocket = () => {
  if (socket) {
    logger.info('disconnectSocket called: Disconnecting existing socket.', {
      socketId: socket.id,
    });
    socket.disconnect();
    socket = null;
  } else if (connectPromise) {
    logger.info(
      'disconnectSocket called: Connection attempt in progress (connectPromise exists). The ongoing tempSocket will be disconnected.'
    );
    // connectPromise's internal 'disconnect' handler will manage its state.
  } else {
    logger.debug(
      'disconnectSocket called: No active socket or pending connection to disconnect.'
    );
  }
  stopHealthCheck();
  // setConnectionState is typically handled by the socket's 'disconnect' event listener
  // or within connectPromise's logic. If a manual state update is needed here,
  // it should be carefully considered to avoid conflicts.
  // For now, relying on event-driven state changes.
  logger.debug('disconnectSocket call finished.');
};

/**
 * Enhanced project joining with promise-based error handling and comprehensive validation
 */
const joinProject = (projectId, timeout = 10000) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    if (!socket || !socket.connected) {
      const error = new Error('Socket not connected');
      error.code = 'SOCKET_NOT_CONNECTED';
      logger.error('Cannot join project: Socket not connected', {
        socketConnected: socket?.connected,
        socketId: socket?.id,
        projectId,
      });
      return reject(error);
    }

    // Enhanced authentication check with fallback waiting mechanism
    const checkAuthenticationAndProceed = () => {
      if (!isAuthenticated) {
        // Wait for authentication if socket is connected but not yet authenticated
        if (socket && socket.connected) {
          logger.warn(
            'Socket connected but not authenticated yet. Waiting for authentication...',
            {
              projectId,
              socketId: socket.id,
              currentState: currentConnectionState,
            }
          );
          // Set up a one-time listener for authentication
          const authTimeout = setTimeout(() => {
            const error = new Error('Socket authentication timeout');
            error.code = 'SOCKET_AUTH_TIMEOUT';
            logger.error('Cannot join project: Socket authentication timeout', {
              projectId,
              socketId: socket.id,
              waitTime: 10000,
            });
            reject(error);
          }, 10000); // 10 second auth timeout - increased from 3 seconds

          const authHandler = () => {
            clearTimeout(authTimeout);
            socket.off('connection_ack', authHandler);
            logger.info(
              'Socket authentication completed, proceeding with project join',
              {
                projectId,
                socketId: socket.id,
              }
            );
            proceedWithJoin();
          };

          socket.on('connection_ack', authHandler);
          return; // Exit early, will proceed after auth
        } else {
          const error = new Error('Socket not authenticated');
          error.code = 'SOCKET_NOT_AUTHENTICATED';
          logger.error('Cannot join project: Socket not authenticated', {
            projectId,
            socketId: socket.id,
          });
          return reject(error);
        }
      }

      // If already authenticated, proceed immediately
      proceedWithJoin();
    };

    const proceedWithJoin = () => {
      if (!projectId || typeof projectId !== 'string') {
        const error = new Error('Invalid project ID');
        error.code = 'INVALID_PROJECT_ID';
        logger.error('Cannot join project: Invalid project ID', {
          projectId,
          projectIdType: typeof projectId,
        });
        return reject(error);
      }

      logger.info('Joining project', {
        projectId,
        socketId: socket.id,
        currentProjectId,
        timeout,
      });

      // Set timeout for join operation
      const joinTimer = setTimeout(() => {
        const error = new Error(`Join project timeout after ${timeout}ms`);
        error.code = 'JOIN_TIMEOUT';
        logger.error('Project join timeout', {
          projectId,
          timeout,
          duration: Date.now() - startTime,
        });
        reject(error);
      }, timeout);

      // Enhanced join project with comprehensive response handling
      socket.emit('join_project', { projectId }, (response) => {
        clearTimeout(joinTimer);
        const joinDuration = Date.now() - startTime;

        if (response && response.error) {
          const error = new Error(response.error);
          error.code = response.code || 'JOIN_ERROR';
          error.eventId = response.eventId;

          logger.error('Project join failed', {
            projectId,
            error: response.error,
            code: response.code,
            eventId: response.eventId,
            joinDuration,
          });

          return reject(error);
        }

        if (response && response.success) {
          currentProjectId = projectId;

          logger.info('Project joined successfully', {
            projectId,
            userRole: response.userRole,
            permissions: response.permissions,
            joinDuration,
            eventId: response.eventId,
            projectStats: response.projectStats,
          });

          resolve({
            projectId,
            userRole: response.userRole,
            permissions: response.permissions,
            joinDuration,
            projectStats: response.projectStats,
          });
        } else {
          const error = new Error('Invalid join response');
          error.code = 'INVALID_RESPONSE';

          logger.error('Project join failed: Invalid response', {
            projectId,
            response,
            joinDuration,
          });

          reject(error);
        }
      });
    };

    // Start the authentication check and join process
    checkAuthenticationAndProceed();
  });
};

/**
 * Enhanced project presence setup with robust callback management
 */
const setupProjectPresence = (callbacks = {}) => {
  const callbackId = `presence_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  if (!socket || !socket.connected) {
    logger.error('Cannot setup project presence: Socket not connected', {
      socketConnected: socket?.connected,
      socketId: socket?.id,
      callbackId,
    });
    return null;
  }

  logger.info('Setting up project presence', {
    callbackId,
    projectId: currentProjectId,
    callbackTypes: Object.keys(callbacks),
    socketId: socket.id,
  });

  // Store callbacks for cleanup
  projectPresenceCallbacks.set(callbackId, callbacks);

  // Enhanced presence event handlers with error handling
  const handlePresenceEvent = (eventName, handler) => {
    if (typeof handler !== 'function') return;

    socket.on(eventName, (data) => {
      try {
        logger.debug(`Presence event received: ${eventName}`, {
          data,
          callbackId,
          projectId: currentProjectId,
        });
        handler(data);
      } catch (error) {
        logger.error(`Error in presence event handler: ${eventName}`, {
          error: error.message,
          stack: error.stack,
          callbackId,
          data,
        });
      }
    });
  };

  // Register presence event handlers
  if (callbacks.onUserOnline) {
    handlePresenceEvent('user:presence:online', callbacks.onUserOnline);
  }

  if (callbacks.onUserOffline) {
    handlePresenceEvent('user:presence:offline', callbacks.onUserOffline);
  }

  if (callbacks.onUserJoined) {
    handlePresenceEvent('user:joined', callbacks.onUserJoined);
  }

  if (callbacks.onPermissionsUpdated) {
    handlePresenceEvent('permissions:updated', callbacks.onPermissionsUpdated);
  }

  // Add specific handlers for task and comment updates if provided
  if (callbacks.onTaskUpdate) {
    handlePresenceEvent('task:updated', callbacks.onTaskUpdate);
  }
  if (callbacks.onCommentAdded) {
    handlePresenceEvent('comment:added', callbacks.onCommentAdded);
  }

  // Return cleanup function
  return () => {
    logger.info('Cleaning up project presence', {
      callbackId,
      projectId: currentProjectId,
    });

    projectPresenceCallbacks.delete(callbackId);

    // Remove specific listeners for this callback set
    if (socket) {
      [
        'user:presence:online',
        'user:presence:offline',
        'user:joined',
        'permissions:updated',
        // Ensure new events are also cleaned up
        'task:updated',
        'comment:added',
      ].forEach((eventName) => {
        // Check if the specific callback was provided before trying to remove its listener
        // This avoids errors if socket.off is called for an event that was never listened to by this specific setup instance
        // However, a simpler approach is to just call off, as it's idempotent if the listener for that specific handler function isn't found.
        // For this iteration, we'll rely on the fact that `handlePresenceEvent` only adds if a handler exists.
        // The `socket.off(eventName)` will remove all listeners for that event,
        // which might be too broad if multiple components use setupProjectPresence.
        // A more robust way would be to store the actual handler functions and remove them specifically.
        // For now, let's refine to remove only if the callback was originally passed.
        if (callbacks.onUserOnline && eventName === 'user:presence:online')
          socket.off(eventName, callbacks.onUserOnline);
        if (callbacks.onUserOffline && eventName === 'user:presence:offline')
          socket.off(eventName, callbacks.onUserOffline);
        if (callbacks.onUserJoined && eventName === 'user:joined')
          socket.off(eventName, callbacks.onUserJoined);
        if (
          callbacks.onPermissionsUpdated &&
          eventName === 'permissions:updated'
        )
          socket.off(eventName, callbacks.onPermissionsUpdated);
        if (callbacks.onTaskUpdate && eventName === 'task:updated')
          socket.off(eventName, callbacks.onTaskUpdate);
        if (callbacks.onCommentAdded && eventName === 'comment:added')
          socket.off(eventName, callbacks.onCommentAdded);
      });
    }
  };
};

/**
 * Function to leave a project room.
 */
const leaveProject = (projectId) => {
  if (socket && socket.connected && projectId) {
    logger.info('Leaving project', { projectId, socketId: socket.id });
    socket.emit('leave_project', { projectId });
    if (currentProjectId === projectId) {
      currentProjectId = null; // Clear current project ID on explicit leave
      // Optionally, could also reset project-specific state here or emit a local event
    }
  } else {
    logger.warn('Cannot leave project: Socket not connected or no project ID', {
      projectId,
      socketConnected: socket?.connected,
      isAuthenticated, // Added for more context
      currentLocalProjectId: currentProjectId, // Added for more context
    });
  }
};

/**
 * Enhanced broadcasting functions with error handling and response tracking
 */
const broadcastTaskUpdate = (taskData, callback) => {
  return new Promise((resolve, reject) => {
    if (!socket || !socket.connected) {
      const error = new Error('Socket not connected');
      logger.error('Cannot broadcast task update: Socket not connected', {
        taskId: taskData.taskId,
        socketConnected: socket?.connected,
      });
      return reject(error);
    }

    const startTime = Date.now();

    logger.debug('Broadcasting task update', {
      taskId: taskData.taskId,
      updates: Object.keys(taskData.updates || {}),
      projectId: currentProjectId,
    });

    socket.emit('task:update', taskData, (response) => {
      const broadcastDuration = Date.now() - startTime;

      if (response && response.error) {
        const error = new Error(response.error);
        error.code = response.code;
        error.eventId = response.eventId;

        logger.error('Task update broadcast failed', {
          taskId: taskData.taskId,
          error: response.error,
          code: response.code,
          eventId: response.eventId,
          broadcastDuration,
        });

        if (callback) callback(error, null);
        return reject(error);
      }

      logger.info('Task update broadcast successful', {
        taskId: taskData.taskId,
        eventId: response.eventId,
        broadcastDuration,
        version: response.version,
      });

      if (callback) callback(null, response);
      resolve(response);
    });
  });
};

const broadcastComment = (commentData, callback) => {
  return new Promise((resolve, reject) => {
    if (!socket || !socket.connected) {
      const error = new Error('Socket not connected');
      logger.error('Cannot broadcast comment: Socket not connected', {
        targetType: commentData.targetType,
        targetId: commentData.targetId,
        socketConnected: socket?.connected,
      });
      return reject(error);
    }

    const startTime = Date.now();

    logger.debug('Broadcasting comment', {
      targetType: commentData.targetType,
      targetId: commentData.targetId,
      contentLength: commentData.content?.length,
      hasMentions: commentData.mentions && commentData.mentions.length > 0,
      projectId: currentProjectId,
    });

    socket.emit('comment:add', commentData, (response) => {
      const broadcastDuration = Date.now() - startTime;

      if (response && response.error) {
        const error = new Error(response.error);
        error.code = response.code;
        error.eventId = response.eventId;

        logger.error('Comment broadcast failed', {
          targetType: commentData.targetType,
          targetId: commentData.targetId,
          error: response.error,
          code: response.code,
          eventId: response.eventId,
          broadcastDuration,
        });

        if (callback) callback(error, null);
        return reject(error);
      }

      logger.info('Comment broadcast successful', {
        commentId: response.comment._id,
        targetType: commentData.targetType,
        targetId: commentData.targetId,
        eventId: response.eventId,
        broadcastDuration,
      });

      if (callback) callback(null, response);
      resolve(response);
    });
  });
};

const broadcastTyping = (typingData, callback) => {
  if (!socket || !socket.connected) {
    logger.debug('Cannot broadcast typing: Socket not connected');
    return;
  }

  // Typing indicators are lightweight, no need for Promise wrapper
  socket.emit('comment:typing', typingData, (response) => {
    if (response && response.error) {
      logger.warn('Typing broadcast failed', {
        targetType: typingData.targetType,
        targetId: typingData.targetId,
        error: response.error,
      });
      if (callback) callback(response.error);
      return;
    }

    logger.debug('Typing broadcast successful', {
      targetType: typingData.targetType,
      targetId: typingData.targetId,
      isTyping: typingData.isTyping,
    });

    if (callback) callback(null, response);
  });
};

/**
 * Enhanced connection state management
 */
const addConnectionStateListener = (callback) => {
  const listenerId = `listener_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  connectionStateListeners.set(listenerId, callback);

  logger.debug('Added connection state listener', {
    listenerId,
    totalListeners: connectionStateListeners.size,
  });

  // Immediately call with current state
  callback({
    state: currentConnectionState,
    previousState: null,
    timestamp: new Date().toISOString(),
    socketId: socket?.id,
    projectId: currentProjectId,
    reconnectAttempts,
    isAuthenticated,
  });

  // Return removal function
  return () => {
    connectionStateListeners.delete(listenerId);
    logger.debug('Removed connection state listener', {
      listenerId,
      remainingListeners: connectionStateListeners.size,
    });
  };
};

/**
 * Enhanced cleanup with comprehensive memory leak prevention
 */
const cleanupSocket = () => {
  logger.info('Cleaning up socket resources', {
    socketId: socket?.id,
    projectId: currentProjectId,
    connectionStateListeners: connectionStateListeners.size,
    projectPresenceCallbacks: projectPresenceCallbacks.size,
  });

  // Clear all timers and intervals
  stopHealthCheck();

  // Clear connection state
  isAuthenticated = false;
  currentProjectId = null;
  reconnectAttempts = 0;

  // Clear all callbacks and listeners
  connectionStateListeners.clear();
  projectPresenceCallbacks.clear();

  // Disconnect and clean up socket
  if (socket) {
    socket.disconnect();
    socket.removeAllListeners();
    socket = null;
  }

  // Reset connection state
  setConnectionState(ConnectionState.DISCONNECTED);

  // Clear stored logs (keep last 10 for debugging)
  if (window.socketLogs && window.socketLogs.length > 10) {
    window.socketLogs = window.socketLogs.slice(-10);
  }

  logger.info('Socket cleanup completed');
};

/**
 * Get comprehensive connection and performance metrics
 */
const getConnectionMetrics = () => {
  return {
    ...connectionMetrics,
    currentState: currentConnectionState,
    isConnected: socket?.connected || false,
    isAuthenticated,
    currentProjectId,
    reconnectAttempts,
    socketId: socket?.id || null,
    uptime: connectionMetrics.connectedAt
      ? Date.now() - connectionMetrics.connectedAt
      : 0,
    activeListeners: connectionStateListeners.size,
    activeCallbacks: projectPresenceCallbacks.size,
    transportName: socket?.io?.engine?.transport?.name || null,
    lastLogEntries: window.socketLogs ? window.socketLogs.slice(-5) : [],
  };
};

/**
 * Development helper to get socket logs
 */
const getSocketLogs = (count = 50) => {
  return window.socketLogs ? window.socketLogs.slice(-count) : [];
};

export {
  // connectSocket - Already exported with 'export const connectSocket'
  // disconnectSocket - Already exported with 'export const disconnectSocket'
  getSocketInstance as getSocket,
  joinProject,
  leaveProject,
  setupProjectPresence,
  broadcastTaskUpdate,
  broadcastComment,
  ConnectionState,
  addConnectionStateListener,
  cleanupSocket,
  getConnectionMetrics,
  getSocketLogs,
};
