<!-- EXAMPLE ONLY - NO NOT USE OR EDIT -->

# Socket Implementation Review Request

## Project Overview

I'm working on a MERN stack application called uTool that has a notifications feature in the navbar. The notifications are supposed to be delivered in real-time using Socket.IO, but the socket connection has never worked properly. I need your help to review the current implementation and provide recommendations for fixing it.

## Current Implementation

### Server-Side Socket Implementation

#### Server Initialization (server.js)

```javascript
// Initialize Socket.IO with auth middleware
const io = new Server(server, {
  cors: {
    // Allow connections from these origins for security
    origin: [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'https://utool-xi.vercel.app',
    ],
    methods: ['GET', 'POST'], // Allowed HTTP methods
    credentials: true, // Allow cookies to be sent with requests
  },
});

// Socket authentication middleware with verbose logging
io.use((socket, next) => {
  logger.verbose(`Socket authentication attempt for socket ${socket.id}`);
  authenticateSocket(socket, next);
});

// Socket connection handler with verbose logging
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`, {
    socketId: socket.id,
    userId: socket.user?.id,
    userAgent: socket.handshake.headers['user-agent'],
  });
  // Set up event handlers for this socket connection
  handleConnection(io, socket);

  socket.on('disconnect', (reason) => {
    logger.verbose(`Socket disconnected: ${socket.id}, reason: ${reason}`);
  });
});
```

#### Socket Manager (socketManager.js)

```javascript
import jwt from 'jsonwebtoken';
import { logger } from './logger.js';

/**
 * Socket.io middleware for authentication
 * Validates the JWT token before allowing socket connections
 */
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

/**
 * Socket.io handler for connection
 * Sets up event handlers for the socket
 */
const handleConnection = (io, socket) => {
  try {
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
      try {
        socket.join(documentId);
        logger.verbose(`User joined document: ${documentId}`, {
          socketId: socket.id,
          userId: socket.user?.id,
          documentId,
        });
      } catch (error) {
        logger.error(`Error joining document ${documentId}`, {
          error: error.message,
          stack: error.stack,
        });
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
        }
      } catch (error) {
        logger.error(`Error processing document changes`, {
          error: error.message,
          stack: error.stack,
          socketId: socket.id,
        });
      }
    });

    // Clean up on disconnect
    socket.on('disconnect', () => {
      try {
        logger.info(`Socket disconnected: ${socket.id}`, {
          socketId: socket.id,
          userId: socket.user?.id,
          timeDisconnected: new Date().toISOString(),
        });
      } catch (error) {
        console.error(`Error logging socket disconnect: ${error.message}`);
      }
    });
  } catch (error) {
    console.error(`Error in socket connection handler: ${error.message}`);
    logger.error(`Error in socket connection handler`, {
      error: error.message,
      stack: error.stack,
      socketId: socket?.id || 'unknown',
    });
  }
};

/**
 * Function to send notifications through socket.io
 */
const sendNotification = (io, userId, notification) => {
  try {
    if (!io || !userId || !notification) {
      logger.warn('Missing parameters for sendNotification', {
        hasIo: !!io,
        hasUserId: !!userId,
        hasNotification: !!notification,
      });
      return false;
    }

    // Extract only what we need to log
    const notificationSummary = notification
      ? {
          id: notification._id,
          title: notification.title,
          message: notification.message?.substring(0, 100),
          type: notification.type,
        }
      : 'Invalid notification';

    logger.verbose(`Attempting to send notification to user: ${userId}`, {
      userId,
      notification: notificationSummary,
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
```

#### Notification Controller (notificationController.js)

```javascript
// Relevant parts from notificationController.js
import { sendNotification } from '../utils/socketManager.js';

// In createNotification function
// If there's an active socket connection for this user, send it immediately
try {
  const userRoom = `user:${req.user.id}`;
  const userSockets = io.sockets.adapter.rooms.get(userRoom);

  if (userSockets && userSockets.size > 0) {
    logger.info(
      `User ${req.user.id} is connected with ${userSockets.size} socket(s), sending notification immediately`,
      {
        userId: req.user.id,
        socketCount: userSockets.size,
        notificationId: notification._id,
      }
    );

    sendNotification(io, req.user.id, notification);

    // Mark as sent via socket
    notification.sentViaSocket = true;
    await notification.save();

    logger.info(
      `Notification ${notification._id} sent to user ${req.user.id} via socket`,
      {
        notificationId: notification._id,
        userId: req.user.id,
      }
    );
  }
} catch (error) {
  logger.error(
    `Socket.io instance not available, notification ${notification._id} queued for later delivery`,
    {
      error: error.message,
      notificationId: notification._id,
    }
  );
}
```

### Client-Side Socket Implementation

#### Socket Utility (socket.js)

```javascript
import io from 'socket.io-client';
import { store } from '../app/store';

// In production, use relative path to work with Vercel rewrites
// In development, use the standard backend URL
const isDevelopment = process.env.NODE_ENV === 'development';
const SERVER_URL = isDevelopment
  ? process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000'
  : process.env.REACT_APP_API_URL || ''; // Empty string means relative path - connects to same origin

/**
 * Socket connection singleton to prevent multiple connections
 */
let socketInstance = null;
let lastToken = null;

/**
 * Get the socket instance, creating it only if it doesn't already exist
 */
const getSocket = () => {
  if (!socketInstance) {
    // Create the socket instance with connection disabled by default
    socketInstance = io(SERVER_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ['websocket', 'polling'],
    });

    // Set up event handlers
    socketInstance.on('connect', () => {
      console.log('Socket connected:', socketInstance.id);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    socketInstance.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  // Get the current auth token
  const state = store.getState();
  const token = state.auth?.token;

  // If we have a token and it's changed since last connect, update the auth header
  if (token && token !== lastToken) {
    socketInstance.auth = { token };
    lastToken = token;

    // If socket is not connected and we have a token, connect
    if (!socketInstance.connected) {
      socketInstance.connect();
    }
  }

  return socketInstance;
};

/**
 * Connect the socket with the current auth token
 */
export const connectSocket = () => {
  const socket = getSocket();

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
};

/**
 * Connect the socket with authentication token from Redux store
 * This is the function imported in App.js
 */
export const connectWithAuth = () => {
  const socket = getSocket();

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
};

/**
 * Disconnect the socket
 */
export const disconnectSocket = () => {
  const socket = getSocket();

  if (socket && socket.connected) {
    socket.disconnect();
    lastToken = null;
  }
};

// Export the socket singleton
export default getSocket;
```

#### Notification Context (NotificationContext.js)

```javascript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import api from '../utils/api';
import socket from '../utils/socket';
import { toast } from 'react-toastify';

// Create context
const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { user, token } = useSelector((state) => state.auth);

  // Fetch initial notifications and set up socket listener
  useEffect(() => {
    // Ensure both user and token are present before fetching notifications
    // and setting up socket listeners.
    if (user && token) {
      fetchNotifications();
      fetchUnreadCount();

      // Make sure socket exists before attaching listeners
      if (socket && typeof socket.on === 'function') {
        // Set up socket listener for new notifications
        socket.on('notification', (notification) => {
          // Add the new notification to the state
          setNotifications((prevNotifications) => [
            notification,
            ...prevNotifications,
          ]);
          // Increment unread count
          setUnreadCount((prevCount) => prevCount + 1);

          // Show toast notification
          showSystemNotification(notification);
        });

        // Clean up the socket listener when the component unmounts
        return () => {
          if (socket && typeof socket.off === 'function') {
            socket.off('notification');
          }
        };
      }
    }
  }, [user, token]);

  // Fetch all notifications from the API
  const fetchNotifications = async () => {
    if (!user || !token) return;

    setIsLoading(true);
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch unread notification count
  const fetchUnreadCount = async () => {
    if (!user || !token) return;

    try {
      const response = await api.get('/notifications/unread/count');
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // Other notification-related functions...

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        fetchNotifications,
        fetchUnreadCount,
        // Other functions...
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

// Custom hook to use the notification context
export const useNotifications = () => useContext(NotificationContext);

export default NotificationContext;
```

#### NotificationBell Component (NotificationBell.js)

```javascript
import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { Bell, Check, Trash2, X } from 'lucide-react';

const NotificationBell = () => {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    handleNotificationClick,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  // Handle notification item click
  const onNotificationClick = (notification) => {
    handleNotificationClick(notification);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={toggleDropdown}
        className="p-2 rounded-full hover:bg-dark-700 focus:outline-none focus:ring-2 focus:ring-primary-400 relative"
        aria-label="Notifications"
      >
        <Bell
          size={20}
          className={unreadCount > 0 ? 'text-accent-purple' : 'text-gray-400'}
        />

        {/* Notification Counter Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full min-w-[1.2rem] h-[1.2rem]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu with notifications */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-card border border-dark-700 shadow-lg rounded-md max-h-[80vh] overflow-hidden flex flex-col z-50">
          {/* Notification content... */}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
```

### Vercel Configuration (vercel.json)

```json
{
  "rewrites": [
    {
      "source": "/socket.io/:path*",
      "destination": "https://utool.onrender.com/socket.io/:path*"
    }
  ]
}
```

## Issues and Questions

1. The socket connection never works properly for the notifications feature.
2. I'm not sure if the issue is on the client-side, server-side, or both.
3. The Vercel configuration includes a rewrite for socket.io, but I'm not sure if it's correct.
4. There's no visible feedback to users when the socket connection fails.
5. I'm wondering if there are any best practices or patterns I should implement to make the socket connection more reliable.

## Request

Please review the code and provide:

1. An analysis of potential issues in the current implementation
2. Recommendations for improving the socket connection reliability
3. Suggestions for better error handling and user feedback
4. Any best practices or patterns I should implement
5. Specific code changes that would help fix the issues

Thank you for your help!
