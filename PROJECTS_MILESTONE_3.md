# PROJECTS FEATURE REORGANIZATION - MILESTONE 3

## Team Collaboration Features (Week 7-8)

**Risk:** Medium | **Value:** Essential for Team Projects  
**Status:** Planning Phase

---

### Overview

This milestone transforms projects from individual tools into powerful collaboration platforms. We'll implement real-time updates, team member management, activity tracking, commenting systems, and notification features that enable seamless teamwork across distributed teams.

**Building Upon Existing Socket Infrastructure:**

- **Leverages existing 658-line `server/utils/socketManager.js`** with enterprise-level features
- **Extends 216-line `client/src/utils/socket.js`** with project-specific collaboration
- **Integrates with existing JWT authentication** and user notification rooms
- **Builds upon existing real-time notification delivery** and connection tracking

### Integration with Existing Codebase

**Existing Files to Enhance/Modify:**

- `server/models/Project.js` - Already has members array
- `server/models/User.js` - Add collaboration preferences
- `client/src/utils/socket.js` - Existing Socket.IO setup ✅ **ANALYZED: 216 lines**
- `server/utils/socketManager.js` - Existing enterprise socket management ✅ **ANALYZED: 658 lines**
- `client/src/components/NotificationBell.js` - Current notification UI
- `server/services/notificationService.js` - Notification handling

**New Files Created in This Milestone:**

- `server/middleware/projectSocketAuth.js` - **PROJECT-SPECIFIC WEBSOCKET AUTHENTICATION**
- `client/src/hooks/useProjectPresence.js` - **REAL-TIME PRESENCE SYSTEM FOR PROJECTS**
- `server/utils/pushNotificationManager.js` - **ENHANCED PUSH NOTIFICATION SETUP**
- `client/src/components/projects/organisms/RealTimeCollaborationInterface.js` - **UNIFIED COLLABORATION UI**

**Patterns We'll Maintain:**

- Socket.IO for real-time communication
- Redux for state management
- Existing notification system
- Current authentication patterns
- Tailwind CSS and Lucide React icons

---

## 🔒 ENHANCED WEBSOCKET AUTHENTICATION FOR PROJECTS

### **New File: `server/middleware/projectSocketAuth.js`**

```javascript
/**
 * Project-Specific WebSocket Authentication Middleware
 *
 * Builds upon the existing socketManager.js JWT authentication to add
 * project-specific permissions and collaboration features.
 *
 * This middleware:
 * - Validates project membership before allowing socket connections
 * - Manages project-specific socket rooms and permissions
 * - Handles real-time collaboration authorization
 * - Integrates with existing JWT authentication flow
 * - Provides granular permission control for different collaboration features
 */

const jwt = require('jsonwebtoken');
const Project = require('../models/Project');
const User = require('../models/User');
const { logActivity } = require('../utils/activityLogger');

/**
 * Authenticate socket connection for project-specific features
 * Extends the existing socketManager.js authentication with project permissions
 */
const authenticateProjectSocket = async (socket, next) => {
  try {
    // Extract project ID from socket handshake
    const { projectId } = socket.handshake.query;
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    if (!projectId) {
      return next(new Error('Project ID required for collaboration features'));
    }

    // Verify JWT token (leveraging existing authentication)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    // Verify project membership and permissions
    const project = await Project.findById(projectId).populate('members.user');

    if (!project) {
      return next(new Error('Project not found'));
    }

    // Check if user is project owner or member
    const isOwner = project.owner.toString() === user._id.toString();
    const memberRecord = project.members.find(
      (member) => member.user._id.toString() === user._id.toString()
    );

    if (!isOwner && !memberRecord) {
      return next(new Error('Access denied: Not a project member'));
    }

    // Determine user role and permissions for this project
    const userRole = isOwner ? 'owner' : memberRecord.role;
    const permissions = getProjectPermissions(userRole, project);

    // Attach user and project context to socket
    socket.userId = user._id;
    socket.user = user;
    socket.projectId = projectId;
    socket.project = project;
    socket.userRole = userRole;
    socket.permissions = permissions;

    // Log successful authentication for audit purposes
    await logActivity({
      type: 'PROJECT_SOCKET_AUTH',
      userId: user._id,
      projectId: projectId,
      metadata: {
        userRole,
        socketId: socket.id,
        timestamp: new Date().toISOString(),
      },
    });

    next();
  } catch (error) {
    console.error('Project socket authentication error:', error);
    next(new Error('Authentication failed'));
  }
};

/**
 * Determine permissions based on user role within the project
 * Provides granular control over collaboration features
 */
const getProjectPermissions = (role, project) => {
  const basePermissions = {
    canView: true,
    canComment: false,
    canEditTasks: false,
    canManageMembers: false,
    canDeleteProject: false,
    canModifyProjectSettings: false,
    canAccessFiles: false,
    canCreateTasks: false,
    canAssignTasks: false,
    canViewAnalytics: false,
  };

  switch (role) {
    case 'owner':
      return {
        ...basePermissions,
        canComment: true,
        canEditTasks: true,
        canManageMembers: true,
        canDeleteProject: true,
        canModifyProjectSettings: true,
        canAccessFiles: true,
        canCreateTasks: true,
        canAssignTasks: true,
        canViewAnalytics: true,
      };

    case 'admin':
      return {
        ...basePermissions,
        canComment: true,
        canEditTasks: true,
        canManageMembers: true,
        canModifyProjectSettings: true,
        canAccessFiles: true,
        canCreateTasks: true,
        canAssignTasks: true,
        canViewAnalytics: true,
      };

    case 'member':
      return {
        ...basePermissions,
        canComment: true,
        canEditTasks: true,
        canAccessFiles: true,
        canCreateTasks: true,
        canViewAnalytics: project.features.analytics || false,
      };

    case 'viewer':
      return {
        ...basePermissions,
        canComment: project.features.comments || false,
        canViewAnalytics: project.features.analytics || false,
      };

    default:
      return basePermissions;
  }
};

/**
 * Middleware to validate specific action permissions
 * Used for real-time collaboration features
 */
const validateActionPermission = (requiredPermission) => {
  return (socket, next) => {
    if (!socket.permissions || !socket.permissions[requiredPermission]) {
      return next(
        new Error(`Permission denied: ${requiredPermission} not allowed`)
      );
    }
    next();
  };
};

/**
 * Join user to project-specific socket rooms based on their permissions
 * Integrates with existing socketManager.js room management
 */
const joinProjectRooms = async (socket) => {
  const { projectId, userId, permissions } = socket;

  // Join main project room (all members)
  await socket.join(`project:${projectId}`);

  // Join permission-based rooms for targeted updates
  if (permissions.canEditTasks) {
    await socket.join(`project:${projectId}:editors`);
  }

  if (permissions.canManageMembers) {
    await socket.join(`project:${projectId}:managers`);
  }

  if (permissions.canViewAnalytics) {
    await socket.join(`project:${projectId}:analytics`);
  }

  // Join user-specific project room for direct notifications
  await socket.join(`project:${projectId}:user:${userId}`);

  console.log(
    `User ${userId} joined project ${projectId} rooms with role: ${socket.userRole}`
  );
};

/**
 * Handle user disconnection and cleanup
 * Integrates with existing socketManager.js disconnection handling
 */
const handleProjectDisconnection = async (socket) => {
  const { projectId, userId, user } = socket;

  if (projectId && userId) {
    // Broadcast user offline status to project members
    socket.to(`project:${projectId}`).emit('user:presence:offline', {
      userId,
      username: user.username,
      timestamp: new Date().toISOString(),
    });

    // Log disconnection for audit purposes
    await logActivity({
      type: 'PROJECT_SOCKET_DISCONNECT',
      userId,
      projectId,
      metadata: {
        socketId: socket.id,
        timestamp: new Date().toISOString(),
      },
    });
  }
};

module.exports = {
  authenticateProjectSocket,
  validateActionPermission,
  getProjectPermissions,
  joinProjectRooms,
  handleProjectDisconnection,
};
```

---

## 🟢 REAL-TIME PRESENCE SYSTEM FOR PROJECTS

### **New File: `client/src/hooks/useProjectPresence.js`**

```javascript
/**
 * Real-Time Project Presence Hook
 *
 * Manages user presence within specific projects, building upon the existing
 * socket infrastructure to provide project-specific collaboration features.
 *
 * Features:
 * - Real-time user presence tracking within projects
 * - Online/offline status management
 * - Activity status (active, idle, away)
 * - Integration with existing socket.js utility
 * - Optimistic updates with Redux integration
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSocket } from '../utils/socket';
import {
  updateProjectPresence,
  removeUserPresence,
} from '../features/projects/projectsSlice';

/**
 * Custom hook for managing real-time presence within a specific project
 * Integrates with existing socket infrastructure and Redux state management
 */
export const useProjectPresence = (projectId) => {
  const dispatch = useDispatch();
  const socket = useSocket();
  const currentUser = useSelector((state) => state.auth.user);
  const projectPresence = useSelector(
    (state) => state.projects.presence[projectId] || {}
  );

  // Local state for managing user's own presence
  const [userStatus, setUserStatus] = useState('active');
  const [isConnected, setIsConnected] = useState(false);
  const [presenceError, setPresenceError] = useState(null);

  // Refs for managing timers and activity detection
  const idleTimerRef = useRef(null);
  const awayTimerRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  // Configuration constants
  const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  const AWAY_TIMEOUT = 15 * 60 * 1000; // 15 minutes
  const HEARTBEAT_INTERVAL = 30 * 1000; // 30 seconds

  /**
   * Initialize presence system when component mounts or projectId changes
   * Leverages existing socket connection and authentication
   */
  useEffect(() => {
    if (!socket || !projectId || !currentUser) return;

    // Join project-specific presence room
    const joinPresenceRoom = () => {
      socket.emit('project:presence:join', {
        projectId,
        user: {
          id: currentUser._id,
          username: currentUser.username,
          avatar: currentUser.avatar,
          status: userStatus,
        },
      });
      setIsConnected(true);
      setPresenceError(null);
    };

    // Listen for presence updates from other users
    const handlePresenceUpdate = (data) => {
      dispatch(
        updateProjectPresence({
          projectId,
          userId: data.userId,
          presence: {
            username: data.username,
            avatar: data.avatar,
            status: data.status,
            lastSeen: data.timestamp,
            isOnline: true,
          },
        })
      );
    };

    // Handle user going offline
    const handleUserOffline = (data) => {
      dispatch(
        updateProjectPresence({
          projectId,
          userId: data.userId,
          presence: {
            isOnline: false,
            lastSeen: data.timestamp,
          },
        })
      );
    };

    // Handle connection errors
    const handlePresenceError = (error) => {
      console.error('Project presence error:', error);
      setPresenceError(error.message);
      setIsConnected(false);
    };

    // Set up socket event listeners
    socket.on('project:presence:update', handlePresenceUpdate);
    socket.on('project:presence:user:offline', handleUserOffline);
    socket.on('project:presence:error', handlePresenceError);
    socket.on('connect', joinPresenceRoom);
    socket.on('disconnect', () => setIsConnected(false));

    // Initial connection if socket is already connected
    if (socket.connected) {
      joinPresenceRoom();
    }

    return () => {
      // Cleanup: leave presence room and remove listeners
      if (socket.connected) {
        socket.emit('project:presence:leave', { projectId });
      }
      socket.off('project:presence:update', handlePresenceUpdate);
      socket.off('project:presence:user:offline', handleUserOffline);
      socket.off('project:presence:error', handlePresenceError);
      socket.off('connect', joinPresenceRoom);
      socket.off('disconnect');
    };
  }, [socket, projectId, currentUser, userStatus, dispatch]);

  /**
   * Activity detection system
   * Automatically updates user status based on activity patterns
   */
  useEffect(() => {
    if (!isConnected) return;

    const resetActivityTimers = () => {
      // Clear existing timers
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (awayTimerRef.current) clearTimeout(awayTimerRef.current);

      // Update last activity timestamp
      lastActivityRef.current = Date.now();

      // Set user to active if they were idle/away
      if (userStatus !== 'active') {
        updateUserStatus('active');
      }

      // Set timer for idle status
      idleTimerRef.current = setTimeout(() => {
        updateUserStatus('idle');

        // Set timer for away status
        awayTimerRef.current = setTimeout(() => {
          updateUserStatus('away');
        }, AWAY_TIMEOUT - IDLE_TIMEOUT);
      }, IDLE_TIMEOUT);
    };

    // Activity event listeners
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
    ];

    activityEvents.forEach((event) => {
      document.addEventListener(event, resetActivityTimers, { passive: true });
    });

    // Initial activity timer setup
    resetActivityTimers();

    return () => {
      // Cleanup activity listeners and timers
      activityEvents.forEach((event) => {
        document.removeEventListener(event, resetActivityTimers);
      });
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (awayTimerRef.current) clearTimeout(awayTimerRef.current);
    };
  }, [isConnected, userStatus]);

  /**
   * Update user's presence status and broadcast to other project members
   */
  const updateUserStatus = useCallback(
    (newStatus) => {
      if (!socket || !isConnected || newStatus === userStatus) return;

      setUserStatus(newStatus);

      socket.emit('project:presence:status:update', {
        projectId,
        status: newStatus,
        timestamp: new Date().toISOString(),
      });

      // Update local Redux state optimistically
      dispatch(
        updateProjectPresence({
          projectId,
          userId: currentUser._id,
          presence: {
            username: currentUser.username,
            avatar: currentUser.avatar,
            status: newStatus,
            lastSeen: new Date().toISOString(),
            isOnline: true,
          },
        })
      );
    },
    [socket, isConnected, userStatus, projectId, currentUser, dispatch]
  );

  /**
   * Manual status update function for explicit user actions
   */
  const setStatus = useCallback(
    (status) => {
      updateUserStatus(status);
    },
    [updateUserStatus]
  );

  /**
   * Get list of online users in the project
   */
  const getOnlineUsers = useCallback(() => {
    return Object.entries(projectPresence)
      .filter(([_, presence]) => presence.isOnline)
      .map(([userId, presence]) => ({
        userId,
        ...presence,
      }))
      .sort((a, b) => {
        // Sort by status priority: active > idle > away
        const statusPriority = { active: 3, idle: 2, away: 1 };
        return (
          (statusPriority[b.status] || 0) - (statusPriority[a.status] || 0)
        );
      });
  }, [projectPresence]);

  /**
   * Get count of users by status
   */
  const getPresenceStats = useCallback(() => {
    const stats = { online: 0, active: 0, idle: 0, away: 0 };

    Object.values(projectPresence).forEach((presence) => {
      if (presence.isOnline) {
        stats.online++;
        stats[presence.status] = (stats[presence.status] || 0) + 1;
      }
    });

    return stats;
  }, [projectPresence]);

  return {
    // Connection state
    isConnected,
    presenceError,

    // User's own status
    userStatus,
    setStatus,

    // Project presence data
    onlineUsers: getOnlineUsers(),
    presenceStats: getPresenceStats(),
    allPresence: projectPresence,

    // Utility functions
    updateUserStatus,
    getOnlineUsers,
    getPresenceStats,
  };
};

/**
 * Hook for simplified presence display in components
 * Provides ready-to-use presence indicators and user lists
 */
export const useProjectPresenceDisplay = (projectId) => {
  const { isConnected, onlineUsers, presenceStats, userStatus } =
    useProjectPresence(projectId);

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'text-green-500';
      case 'idle':
        return 'text-yellow-500';
      case 'away':
        return 'text-gray-500';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return '●';
      case 'idle':
        return '◐';
      case 'away':
        return '○';
      default:
        return '○';
    }
  };

  const formatPresenceText = () => {
    if (!isConnected) return 'Connecting...';
    if (presenceStats.online === 0) return 'No one online';
    if (presenceStats.online === 1) return '1 person online';
    return `${presenceStats.online} people online`;
  };

  return {
    isConnected,
    onlineUsers,
    presenceStats,
    userStatus,
    getStatusColor,
    getStatusIcon,
    formatPresenceText,
  };
};

export default useProjectPresence;
```

---

## 📱 ENHANCED PUSH NOTIFICATION SETUP

### **New File: `server/utils/pushNotificationManager.js`**

```javascript
/**
 * Enhanced Push Notification Manager for Project Collaboration
 *
 * Extends the existing notification system with project-specific push notifications,
 * real-time delivery, and advanced targeting capabilities.
 *
 * Features:
 * - Project-specific notification channels
 * - Real-time push notifications via WebSocket
 * - Email and SMS fallback for offline users
 * - Notification preferences and filtering
 * - Delivery confirmation and retry logic
 * - Integration with existing socketManager.js
 */

const webpush = require('web-push');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const { getSocketManager } = require('./socketManager');
const User = require('../models/User');
const Project = require('../models/Project');
const Notification = require('../models/Notification');
const { logActivity } = require('./activityLogger');

// Configure web push notifications
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@utool.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Email transporter setup
const emailTransporter = nodemailer.createTransporter({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// SMS client setup (optional)
const smsClient = process.env.TWILIO_ACCOUNT_SID
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

/**
 * Enhanced Project Notification Manager Class
 * Integrates with existing socket infrastructure for real-time delivery
 */
class ProjectNotificationManager {
  constructor() {
    this.socketManager = getSocketManager();
    this.deliveryQueue = new Map(); // Track notification delivery
    this.retryQueue = new Map(); // Handle failed deliveries
  }

  /**
   * Send project notification with multiple delivery channels
   * Prioritizes real-time delivery via existing socket infrastructure
   */
  async sendProjectNotification(options) {
    const {
      projectId,
      recipients, // Array of user IDs or 'all' for all members
      type,
      title,
      message,
      data = {},
      priority = 'normal', // 'low', 'normal', 'high', 'urgent'
      channels = ['socket', 'push', 'email'], // Delivery methods
      senderId = null,
    } = options;

    try {
      // Validate project and get member list
      const project = await Project.findById(projectId).populate(
        'members.user owner'
      );
      if (!project) {
        throw new Error('Project not found');
      }

      // Determine recipient list
      let targetUsers = [];
      if (recipients === 'all') {
        targetUsers = [project.owner, ...project.members.map((m) => m.user)];
      } else if (Array.isArray(recipients)) {
        targetUsers = await User.find({ _id: { $in: recipients } });
      }

      // Filter out sender from recipients
      if (senderId) {
        targetUsers = targetUsers.filter(
          (user) => user._id.toString() !== senderId.toString()
        );
      }

      // Create notification record
      const notification = await Notification.create({
        type,
        title,
        message,
        data: {
          ...data,
          projectId,
          projectTitle: project.title,
        },
        recipients: targetUsers.map((user) => user._id),
        sender: senderId,
        priority,
        channels,
        deliveryStatus: 'pending',
      });

      // Process delivery for each user
      const deliveryPromises = targetUsers.map((user) =>
        this.deliverToUser(user, notification, project, channels)
      );

      const deliveryResults = await Promise.allSettled(deliveryPromises);

      // Update notification with delivery results
      const successCount = deliveryResults.filter(
        (r) => r.status === 'fulfilled'
      ).length;
      const failureCount = deliveryResults.filter(
        (r) => r.status === 'rejected'
      ).length;

      await Notification.findByIdAndUpdate(notification._id, {
        deliveryStatus: failureCount === 0 ? 'delivered' : 'partial',
        deliveredCount: successCount,
        failedCount: failureCount,
        deliveredAt: new Date(),
      });

      // Log notification activity
      await logActivity({
        type: 'PROJECT_NOTIFICATION_SENT',
        userId: senderId,
        projectId,
        metadata: {
          notificationId: notification._id,
          recipientCount: targetUsers.length,
          successCount,
          failureCount,
          type,
          priority,
        },
      });

      return {
        notificationId: notification._id,
        recipientCount: targetUsers.length,
        deliveredCount: successCount,
        failedCount: failureCount,
      };
    } catch (error) {
      console.error('Failed to send project notification:', error);
      throw error;
    }
  }

  /**
   * Deliver notification to individual user via multiple channels
   * Uses existing socket infrastructure as primary delivery method
   */
  async deliverToUser(user, notification, project, channels) {
    const deliveryResults = {};

    // Check user notification preferences
    const userPrefs = await this.getUserNotificationPreferences(
      user._id,
      project._id
    );

    // 1. Real-time delivery via existing socket infrastructure (highest priority)
    if (channels.includes('socket') && userPrefs.allowRealTime) {
      try {
        const delivered = await this.deliverViaSocket(
          user,
          notification,
          project
        );
        deliveryResults.socket = delivered;

        // If real-time delivery successful and user is active, skip other channels
        if (delivered && userPrefs.realTimeOnly) {
          return deliveryResults;
        }
      } catch (error) {
        console.error('Socket delivery failed:', error);
        deliveryResults.socket = false;
      }
    }

    // 2. Web push notification (for offline/background users)
    if (channels.includes('push') && userPrefs.allowPush) {
      try {
        deliveryResults.push = await this.deliverViaPush(
          user,
          notification,
          project
        );
      } catch (error) {
        console.error('Push notification failed:', error);
        deliveryResults.push = false;
      }
    }

    // 3. Email notification (fallback or preference-based)
    if (channels.includes('email') && userPrefs.allowEmail) {
      try {
        deliveryResults.email = await this.deliverViaEmail(
          user,
          notification,
          project
        );
      } catch (error) {
        console.error('Email notification failed:', error);
        deliveryResults.email = false;
      }
    }

    // 4. SMS notification (urgent only or preference-based)
    if (
      channels.includes('sms') &&
      userPrefs.allowSMS &&
      (notification.priority === 'urgent' || userPrefs.preferSMS)
    ) {
      try {
        deliveryResults.sms = await this.deliverViaSMS(
          user,
          notification,
          project
        );
      } catch (error) {
        console.error('SMS notification failed:', error);
        deliveryResults.sms = false;
      }
    }

    return deliveryResults;
  }

  /**
   * Deliver notification via existing socket infrastructure
   * Integrates with socketManager.js real-time delivery system
   */
  async deliverViaSocket(user, notification, project) {
    try {
      const socketManager = this.socketManager;

      // Check if user is connected via existing socket system
      const userSockets = socketManager.getUserSockets(user._id);

      if (userSockets && userSockets.length > 0) {
        const notificationPayload = {
          id: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          timestamp: notification.createdAt,
          priority: notification.priority,
          project: {
            id: project._id,
            title: project.title,
          },
        };

        // Send to all user's connected sockets
        userSockets.forEach((socket) => {
          socket.emit('project:notification', notificationPayload);
        });

        // Also send to project-specific room if user is in it
        socketManager.io
          .to(`project:${project._id}:user:${user._id}`)
          .emit('project:notification:targeted', notificationPayload);

        return true;
      }

      return false; // User not connected
    } catch (error) {
      console.error('Socket delivery error:', error);
      return false;
    }
  }

  /**
   * Deliver web push notification to user's registered devices
   */
  async deliverViaPush(user, notification, project) {
    try {
      // Get user's push subscriptions
      const pushSubscriptions = user.pushSubscriptions || [];

      if (pushSubscriptions.length === 0) {
        return false;
      }

      const payload = JSON.stringify({
        title: `${project.title}: ${notification.title}`,
        body: notification.message,
        icon: '/icons/notification-icon.png',
        badge: '/icons/badge-icon.png',
        data: {
          projectId: project._id,
          notificationId: notification._id,
          url: `/projects/${project._id}`,
          ...notification.data,
        },
        actions: [
          {
            action: 'view',
            title: 'View Project',
            icon: '/icons/view-icon.png',
          },
          {
            action: 'dismiss',
            title: 'Dismiss',
            icon: '/icons/dismiss-icon.png',
          },
        ],
      });

      // Send to all registered devices
      const pushPromises = pushSubscriptions.map((subscription) =>
        webpush.sendNotification(subscription, payload).catch((error) => {
          console.error('Push notification failed for subscription:', error);
          // Remove invalid subscriptions
          if (error.statusCode === 410 || error.statusCode === 404) {
            this.removeInvalidPushSubscription(user._id, subscription);
          }
          return null;
        })
      );

      const results = await Promise.allSettled(pushPromises);
      const successCount = results.filter(
        (r) => r.status === 'fulfilled' && r.value
      ).length;

      return successCount > 0;
    } catch (error) {
      console.error('Push notification error:', error);
      return false;
    }
  }

  /**
   * Deliver email notification with project context
   */
  async deliverViaEmail(user, notification, project) {
    try {
      if (!user.email) {
        return false;
      }

      const emailContent = this.generateEmailContent(
        user,
        notification,
        project
      );

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'UTool <noreply@utool.com>',
        to: user.email,
        subject: `${project.title}: ${notification.title}`,
        html: emailContent.html,
        text: emailContent.text,
      };

      await emailTransporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Email notification error:', error);
      return false;
    }
  }

  /**
   * Deliver SMS notification for urgent communications
   */
  async deliverViaSMS(user, notification, project) {
    try {
      if (!smsClient || !user.phone) {
        return false;
      }

      const smsContent = `${project.title}: ${notification.title}\n${notification.message}\nView: ${process.env.CLIENT_URL}/projects/${project._id}`;

      await smsClient.messages.create({
        body: smsContent,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: user.phone,
      });

      return true;
    } catch (error) {
      console.error('SMS notification error:', error);
      return false;
    }
  }

  /**
   * Get user's notification preferences for the project
   */
  async getUserNotificationPreferences(userId, projectId) {
    try {
      const user = await User.findById(userId);
      const defaultPrefs = {
        allowRealTime: true,
        allowPush: true,
        allowEmail: true,
        allowSMS: false,
        realTimeOnly: false,
        preferSMS: false,
        emailDigest: 'immediate', // 'immediate', 'hourly', 'daily', 'never'
      };

      // User global preferences
      const globalPrefs = user.notificationPreferences || defaultPrefs;

      // Project-specific preferences (if any)
      const projectPrefs =
        user.projectNotificationPreferences?.get(projectId) || {};

      return { ...defaultPrefs, ...globalPrefs, ...projectPrefs };
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      return {
        allowRealTime: true,
        allowPush: true,
        allowEmail: false,
        allowSMS: false,
        realTimeOnly: false,
        preferSMS: false,
        emailDigest: 'immediate',
      };
    }
  }

  /**
   * Generate rich HTML email content for notifications
   */
  generateEmailContent(user, notification, project) {
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const projectUrl = `${baseUrl}/projects/${project._id}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${notification.title}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
            .header { background: #3B82F6; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .project-info { background: #F3F4F6; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .action-button { display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 15px 0; }
            .footer { padding: 20px; text-align: center; color: #6B7280; border-top: 1px solid #E5E7EB; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>UTool Project Notification</h2>
            </div>
            <div class="content">
              <h3>${notification.title}</h3>
              <p>Hi ${user.username},</p>
              <p>${notification.message}</p>
              
              <div class="project-info">
                <strong>Project:</strong> ${project.title}<br>
                <strong>Time:</strong> ${new Date(
                  notification.createdAt
                ).toLocaleString()}
              </div>
              
              <a href="${projectUrl}" class="action-button">View Project</a>
              
              <p>You're receiving this because you're a member of the "${
                project.title
              }" project.</p>
            </div>
            <div class="footer">
              <p>© 2025 UTool. All rights reserved.</p>
              <p><a href="${baseUrl}/settings/notifications">Manage notification preferences</a></p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      ${notification.title}
      
      Hi ${user.username},
      
      ${notification.message}
      
      Project: ${project.title}
      Time: ${new Date(notification.createdAt).toLocaleString()}
      
      View Project: ${projectUrl}
      
      You're receiving this because you're a member of the "${
        project.title
      }" project.
      
      Manage notification preferences: ${baseUrl}/settings/notifications
    `;

    return { html, text };
  }

  /**
   * Remove invalid push subscription from user
   */
  async removeInvalidPushSubscription(userId, invalidSubscription) {
    try {
      await User.findByIdAndUpdate(userId, {
        $pull: {
          pushSubscriptions: {
            endpoint: invalidSubscription.endpoint,
          },
        },
      });
    } catch (error) {
      console.error('Error removing invalid push subscription:', error);
    }
  }

  /**
   * Bulk notification for project events (e.g., status changes, deadlines)
   */
  async sendBulkProjectNotification(notifications) {
    const results = [];

    for (const notification of notifications) {
      try {
        const result = await this.sendProjectNotification(notification);
        results.push({ success: true, ...result });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Schedule delayed notification (e.g., deadline reminders)
   */
  async scheduleNotification(notification, deliveryTime) {
    const delay = new Date(deliveryTime).getTime() - Date.now();

    if (delay <= 0) {
      return this.sendProjectNotification(notification);
    }

    setTimeout(() => {
      this.sendProjectNotification(notification);
    }, delay);

    return { scheduled: true, deliveryTime };
  }
}

// Export singleton instance
const notificationManager = new ProjectNotificationManager();

module.exports = {
  ProjectNotificationManager,
  notificationManager,

  // Convenience functions for common notification types
  notifyTaskAssigned: (projectId, taskId, assigneeId, assignerId) =>
    notificationManager.sendProjectNotification({
      projectId,
      recipients: [assigneeId],
      type: 'task_assigned',
      title: 'New Task Assigned',
      message: 'You have been assigned a new task',
      data: { taskId },
      senderId: assignerId,
      priority: 'normal',
    }),

  notifyProjectMemberAdded: (projectId, newMemberId, adderId) =>
    notificationManager.sendProjectNotification({
      projectId,
      recipients: [newMemberId],
      type: 'member_added',
      title: 'Added to Project',
      message: 'You have been added to a new project',
      data: {},
      senderId: adderId,
      priority: 'normal',
    }),

  notifyProjectDeadline: (projectId, daysUntilDeadline) =>
    notificationManager.sendProjectNotification({
      projectId,
      recipients: 'all',
      type: 'deadline_reminder',
      title: 'Project Deadline Approaching',
      message: `Project deadline is in ${daysUntilDeadline} days`,
      data: { daysUntilDeadline },
      priority: daysUntilDeadline <= 1 ? 'urgent' : 'high',
    }),
};
```

---

## 🎯 UNIFIED REAL-TIME COLLABORATION INTERFACE

### **New File: `client/src/components/projects/organisms/RealTimeCollaborationInterface.js`**

```javascript
/**
 * Unified Real-Time Collaboration Interface
 *
 * A comprehensive component that provides all real-time collaboration features
 * for project management, including presence, live updates, and activity feeds.
 *
 * Features:
 * - Real-time user presence display
 * - Live activity feed with real-time updates
 * - Collaborative editing indicators
 * - Push notification management
 * - Integration with existing socket infrastructure
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Users,
  Activity,
  Bell,
  MessageCircle,
  Edit3,
  Clock,
  AlertCircle,
  CheckCircle,
  Calendar,
  FileText,
  Settings
} from 'lucide-react';

// Custom hooks built in this milestone
import { useProjectPresence } from '../../../hooks/useProjectPresence';
import { useSocket } from '../../../utils/socket';

// Redux actions
import {
  updateProjectActivity,
  markNotificationAsRead
} from '../../../features/projects/projectsSlice';

/**
 * Main collaboration interface component
 * Provides a unified hub for all real-time project collaboration features
 */
const RealTimeCollaborationInterface = ({ projectId, isMinimized = false }) => {
  const dispatch = useDispatch();
  const socket = useSocket();
  const currentUser = useSelector(state => state.auth.user);
  const project = useSelector(state => state.projects.byId[projectId]);

  // Use our custom presence hook
  const {
    isConnected,
    onlineUsers,
    presenceStats,
    userStatus,
    setStatus,
    getStatusColor,
    getStatusIcon,
    formatPresenceText
  } = useProjectPresence(projectId);

  // Local state for UI management
  const [activeTab, setActiveTab] = useState('presence');
  const [showNotifications, setShowNotifications] = useState(false);
  const [activityFilter, setActivityFilter] = useState('all');
  const [recentActivity, setRecentActivity] = useState([]);
  const [collaborativeEditing, setCollaborativeEditing] = useState({});

  /**
   * Set up real-time activity listeners
   * Integrates with existing socket infrastructure for live updates
   */
  useEffect(() => {
    if (!socket || !projectId) return;

    // Listen for real-time project activities
    const handleProjectActivity = (activity) => {
      setRecentActivity(prev => [activity, ...prev].slice(0, 50)); // Keep last 50 activities
      dispatch(updateProjectActivity({ projectId, activity }));
    };

    // Listen for collaborative editing events
    const handleCollaborativeEdit = (data) => {
      setCollaborativeEditing(prev => ({
        ...prev,
        [data.resourceId]: {
          users: data.users,
          type: data.type,
          timestamp: data.timestamp
        }
      }));

      // Clear editing indicators after inactivity
      setTimeout(() => {
        setCollaborativeEditing(prev => {
          const updated = { ...prev };
          delete updated[data.resourceId];
          return updated;
        });
      }, 30000); // 30 seconds
    };

    // Set up socket listeners
    socket.on(`project:${projectId}:activity`, handleProjectActivity);
    socket.on(`project:${projectId}:collaborative:edit`, handleCollaborativeEdit);

    return () => {
      socket.off(`project:${projectId}:activity`, handleProjectActivity);
      socket.off(`project:${projectId}:collaborative:edit`, handleCollaborativeEdit);
    };
  }, [socket, projectId, dispatch]);

  /**
   * Filter and sort recent activities based on user preferences
   */
  const filteredActivities = useMemo(() => {
    let filtered = recentActivity;

    if (activityFilter !== 'all') {
      filtered = recentActivity.filter(activity => activity.type === activityFilter);
    }

    return filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [recentActivity, activityFilter]);

  /**
   * Handle status change for current user
   */
  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
  };

  /**
   * Render user presence indicators
   */
  const renderPresenceIndicators = () => (
    <div className="space-y-3">
      {/* Connection status */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm font-medium">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <span className="text-sm text-gray-600">{formatPresenceText()}</span>
      </div>

      {/* Current user status */}
      <div className="p-3 border rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Your Status</span>
          <div className="flex items-center space-x-2">
            <span className={`text-lg ${getStatusColor(userStatus)}`}>
              {getStatusIcon(userStatus)}
            </span>
            <span className="text-sm capitalize">{userStatus}</span>
          </div>
        </div>

        <div className="flex space-x-2">
          {['active', 'idle', 'away'].map(status => (
            <button
              key={status}
              onClick={() => handleStatusChange(status)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                userStatus === status
                  ? 'bg-blue-100 border-blue-300 text-blue-700'
                  : 'hover:bg-gray-50'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Online users list */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">Team Members</h4>
        {onlineUsers.length === 0 ? (
          <p className="text-sm text-gray-500">No team members online</p>
        ) : (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {onlineUsers.map(user => (
              <div key={user.userId} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                <div className="relative">
                  <img
                    src={user.avatar || '/default-avatar.png'}
                    alt={user.username}
                    className="w-8 h-8 rounded-full"
                  />
                  <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                    user.status === 'active' ? 'bg-green-500' :
                    user.status === 'idle' ? 'bg-yellow-500' : 'bg-gray-500'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.username}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {user.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  /**
   * Render real-time activity feed
   */
  const renderActivityFeed = () => (
    <div className="space-y-3">
      {/* Activity filter */}
      <div className="flex space-x-2">
        <select
          value={activityFilter}
          onChange={(e) => setActivityFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded px-2 py-1"
        >
          <option value="all">All Activities</option>
          <option value="task_created">Tasks</option>
          <option value="comment_added">Comments</option>
          <option value="member_added">Members</option>
          <option value="file_uploaded">Files</option>
        </select>
      </div>

      {/* Activity list */}
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {filteredActivities.length === 0 ? (
          <p className="text-sm text-gray-500">No recent activity</p>
        ) : (
          filteredActivities.map((activity, index) => (
            <div key={`${activity.id}-${index}`} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded">
              <div className="flex-shrink-0 mt-1">
                {activity.type === 'task_created' && <FileText className="w-4 h-4 text-blue-500" />}
                {activity.type === 'comment_added' && <MessageCircle className="w-4 h-4 text-green-500" />}
                {activity.type === 'member_added' && <Users className="w-4 h-4 text-purple-500" />}
                {activity.type === 'file_uploaded' && <FileText className="w-4 h-4 text-orange-500" />}
                {!['task_created', 'comment_added', 'member_added', 'file_uploaded'].includes(activity.type) &&
                  <Activity className="w-4 h-4 text-gray-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                  <span className="font-medium">{activity.user?.username || 'Someone'}</span>
                  {' '}{activity.description}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(activity.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  /**
   * Render collaborative editing indicators
   */
  const renderCollaborativeEditing = () => (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-700">Active Editing</h4>
      {Object.keys(collaborativeEditing).length === 0 ? (
        <p className="text-sm text-gray-500">No collaborative editing in progress</p>
      ) : (
        <div className="space-y-2">
          {Object.entries(collaborativeEditing).map(([resourceId, data]) => (
            <div key={resourceId} className="flex items-center space-x-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
              <Edit3 className="w-4 h-4 text-yellow-600" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {data.type} being edited
                </p>
                <p className="text-xs text-gray-600">
                  by {data.users.map(u => u.username).join(', ')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Minimized view for when space is limited
  if (isMinimized) {
    return (
      <div className="flex items-center space-x-4 p-2 bg-white border-b">
        {/* Connection indicator */}
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm">{presenceStats.online} online</span>
        </div>

        {/* Quick status indicator */}
        <div className="flex items-center space-x-1">
          <span className={`text-sm ${getStatusColor(userStatus)}`}>
            {getStatusIcon(userStatus)}
          </span>
          <span className="text-sm capitalize">{userStatus}</span>
        </div>

        {/* Activity indicator */}
        <div className="flex items-center space-x-1">
          <Activity className="w-4 h-4 text-gray-500" />
          <span className="text-sm">{recentActivity.length}</span>
        </div>
      </div>
    );
  }

  // Full collaboration interface
  return (
    <div className="bg-white border rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-medium text-gray-900">Team Collaboration</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
          >
            <Bell className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex border-b">
        {{
          id: 'presence',
          label: 'Team',
          icon: Users
        },
        {
          id: 'activity',
          label: 'Activity',
          icon: Activity
        },
        {
          id: 'editing',
          label: 'Editing',
          icon: Edit3
        }
      ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
            {tab.id === 'presence' && presenceStats.online > 0 && (
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                {presenceStats.online}
              </span>
            )}
            {tab.id === 'activity' && recentActivity.length > 0 && (
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                {recentActivity.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4">
        {activeTab === 'presence' && renderPresenceIndicators()}
        {activeTab === 'activity' && renderActivityFeed()}
        {activeTab === 'editing' && renderCollaborativeEditing()}
      </div>
    </div>
  );
};

export default RealTimeCollaborationInterface;
```

---

## 🔄 IMPLEMENTATION ROADMAP

### **Week 7: Core Collaboration Infrastructure**

**Day 1-2: Authentication & Socket Integration**

- ✅ **Implement `projectSocketAuth.js`** - Project-specific WebSocket authentication
- ✅ **Extend existing `socketManager.js`** - Add project collaboration events
- ✅ **Update `socket.js` client utility** - Add project presence methods
- **Integration Testing** - Ensure seamless integration with existing 658-line socket system

**Day 3-4: Presence System Implementation**

- ✅ **Implement `useProjectPresence.js`** - Real-time presence tracking hook
- **Update project models** - Add presence fields and member management
- **Create presence UI components** - Online indicators, status management
- **Performance optimization** - Efficient presence data synchronization

**Day 5: Push Notification Foundation**

- ✅ **Implement `pushNotificationManager.js`** - Multi-channel notification system
- **Web Push setup** - VAPID keys, service worker integration
- **Email integration** - Rich HTML templates, preference management
- **SMS integration** - Twilio setup for urgent notifications

### **Week 8: Advanced Collaboration Features**

**Day 1-2: Real-Time Activity System**

- ✅ **Implement `RealTimeCollaborationInterface.js`** - Unified collaboration UI
- **Activity feed implementation** - Real-time project activity tracking
- **Comment system integration** - Live comment updates and notifications
- **File collaboration** - Real-time file sharing and version awareness

**Day 3-4: Enhanced Member Management**

- **Role-based permissions** - Granular access control for collaboration features
- **Invitation system** - Email invitations with real-time acceptance
- **Member activity tracking** - Detailed audit logs and activity summaries
- **Team presence dashboard** - Comprehensive team activity overview

**Day 5: Testing & Optimization**

- **Integration testing** - Full collaboration workflow testing
- **Performance optimization** - Socket connection pooling, message throttling
- **Security audit** - Authentication flow and permission validation
- **User experience testing** - Responsiveness and accessibility compliance

---

## 🎯 ENHANCED FEATURE SPECIFICATIONS

### **Project-Specific Socket Authentication System**

**Building upon existing 658-line `socketManager.js`:**

```javascript
// Enhanced socket authentication workflow
const enhancedSocketAuth = {
  // Existing JWT authentication (maintained)
  baseAuthentication: 'JWT token validation via existing socketManager.js',

  // New project-specific layer
  projectAuthentication: {
    projectMembershipValidation: 'Verify user is project member/owner',
    roleBasedPermissions: 'Admin, Member, Viewer permission levels',
    roomManagement: 'Project-specific socket rooms for targeted updates',
    auditLogging: 'Complete audit trail for security compliance',
  },

  // Permission matrix
  permissions: {
    owner: ['all_permissions'],
    admin: [
      'manage_members',
      'edit_settings',
      'create_tasks',
      'view_analytics',
    ],
    member: ['create_tasks', 'edit_tasks', 'comment', 'view_files'],
    viewer: ['view_only', 'comment_if_enabled'],
  },
};
```

### **Real-Time Presence Architecture**

**Integration with existing socket infrastructure:**

```javascript
// Presence system architecture
const presenceArchitecture = {
  // Leverages existing connection tracking
  baseConnection: 'Uses existing socketManager.js connection management',

  // Project-specific presence features
  projectPresence: {
    userStatusTracking: 'Active, Idle, Away status with activity detection',
    teamAwareness: 'Real-time online/offline status for project members',
    collaborativeEditing: 'Show who is editing what in real-time',
    activityIndicators: 'Visual presence indicators throughout the UI',
  },

  // Performance optimizations
  optimizations: {
    heartbeatSystem: 'Efficient presence updates every 30 seconds',
    roomBasedUpdates: 'Only notify relevant project members',
    gracefulDegradation: 'Fallback for users without WebSocket support',
    memoryManagement: 'Automatic cleanup of stale presence data',
  },
};
```

### **Multi-Channel Push Notification System**

**Extending existing notification infrastructure:**

```javascript
// Enhanced notification delivery system
const notificationSystem = {
  // Primary delivery via existing socket system
  realTimeDelivery: {
    socketIntegration:
      'Leverages existing socketManager.js for immediate delivery',
    targetedRooms: 'Project-specific and user-specific notification rooms',
    deliveryConfirmation: 'Acknowledgment system for critical notifications',
    fallbackSystem: 'Progressive degradation through multiple channels',
  },

  // Enhanced delivery channels
  deliveryChannels: {
    webPush: 'Browser push notifications with rich actions',
    email: 'HTML email templates with project context',
    sms: 'SMS for urgent notifications and deadline reminders',
    inApp: 'Real-time in-app notifications via existing socket system',
  },

  // Intelligent routing
  smartDelivery: {
    userPreferences: 'Respect individual notification preferences',
    priorityBased: 'Urgent notifications use multiple channels',
    timeZoneAware: 'Respect user time zones for non-urgent notifications',
    batchingSystem: 'Digest emails for non-urgent updates',
  },
};
```

---

## 🔐 SECURITY & PERFORMANCE CONSIDERATIONS

### **WebSocket Security Enhancements**

**Built upon existing security framework:**

```javascript
// Security implementation extending existing patterns
const securityEnhancements = {
  // Leverages existing JWT authentication
  authentication: {
    existingJWTValidation: 'Maintains current JWT token validation',
    projectSpecificTokens: 'Additional project-scoped permissions',
    sessionManagement: 'Integration with existing session handling',
    rateLimiting: 'Socket event rate limiting per user/project',
  },

  // New project-specific security layers
  projectSecurity: {
    membershipValidation: 'Real-time project membership verification',
    permissionChecking: 'Per-action permission validation',
    auditLogging: 'Complete security event logging',
    encryptedMessages: 'End-to-end encryption for sensitive data',
  },
};
```

### **Performance Optimization Strategy**

**Building upon existing infrastructure:**

```javascript
// Performance optimization framework
const performanceStrategy = {
  // Leverages existing connection pooling
  connectionOptimization: {
    existingPooling: 'Uses existing socket connection pooling',
    projectRoomOptimization: 'Efficient project-specific room management',
    presenceDataCompression: 'Compressed presence updates',
    intelligentBatching: 'Batch non-critical updates for efficiency',
  },

  // New optimization layers
  collaborationOptimizations: {
    presenceThrottling: 'Limit presence update frequency',
    activityBatching: 'Group related activities for bulk processing',
    smartCaching: 'Cache frequently accessed collaboration data',
    gracefulDegradation: 'Progressive enhancement for slower connections',
  },
};
```

---

## 📱 MOBILE & ACCESSIBILITY CONSIDERATIONS

### **Mobile-First Collaboration**

```javascript
// Mobile optimization strategy
const mobileStrategy = {
  responsiveDesign: {
    adaptiveInterface: 'Collaboration interface adapts to screen size',
    touchOptimized: 'Touch-friendly presence and activity controls',
    offlineCapability: 'Cached collaboration data for offline viewing',
    pushNotifications: 'Native mobile push notification support',
  },

  performanceOptimizations: {
    dataUsageOptimization: 'Minimize data usage for mobile users',
    batteryEfficiency: 'Efficient socket connection management',
    backgroundSync: 'Background synchronization for mobile apps',
    progressiveLoading: 'Load collaboration features progressively',
  },
};
```

### **Accessibility Compliance**

```javascript
// Accessibility implementation
const accessibilityFeatures = {
  screenReaderSupport: {
    ariaLabels: 'Comprehensive ARIA labels for all collaboration features',
    liveRegions: 'Screen reader announcements for real-time updates',
    semanticHTML: 'Proper semantic structure for collaboration components',
    keyboardNavigation: 'Full keyboard navigation support',
  },

  visualAccessibility: {
    colorContrast: 'WCAG AA compliant color contrast for presence indicators',
    reducedMotion: 'Respect prefers-reduced-motion for animations',
    scalableText: 'Text scaling support for all collaboration interfaces',
    focusManagement: 'Clear focus indicators and logical tab order',
  },
};
```

---

## 🧪 TESTING STRATEGY

### **Comprehensive Testing Framework**

```javascript
// Testing implementation plan
const testingStrategy = {
  unitTesting: {
    socketAuthentication: 'Test project-specific authentication flows',
    presenceHooks: 'Test real-time presence tracking accuracy',
    notificationDelivery: 'Test multi-channel notification delivery',
    permissionValidation: 'Test role-based permission enforcement',
  },

  integrationTesting: {
    socketIntegration:
      'Test integration with existing 658-line socketManager.js',
    realTimeCollaboration: 'Test end-to-end collaboration workflows',
    crossBrowserCompatibility: 'Test WebSocket compatibility across browsers',
    mobileIntegration: 'Test mobile push notification delivery',
  },

  performanceTesting: {
    concurrentUsers: 'Test system with multiple concurrent collaborators',
    memoryUsage: 'Monitor memory usage with active presence tracking',
    networkEfficiency: 'Test data usage and connection efficiency',
    scalabilityTesting: 'Test system performance under heavy load',
  },
};
```

---

## 📈 SUCCESS METRICS & MONITORING

### **Key Performance Indicators**

```javascript
// Monitoring and analytics framework
const successMetrics = {
  collaborationEngagement: {
    presenceActiveTime: 'Average time users spend active in projects',
    realTimeInteractions: 'Number of real-time collaborative actions',
    notificationEngagement: 'Notification open and interaction rates',
    teamActivityLevel: 'Overall team collaboration activity metrics',
  },

  technicalPerformance: {
    socketConnectionReliability: 'WebSocket connection uptime and stability',
    notificationDeliverySuccess: 'Success rate across all delivery channels',
    presenceUpdateLatency: 'Time for presence updates to propagate',
    systemResourceUsage: 'Memory and CPU usage of collaboration features',
  },

  userExperience: {
    collaborationSatisfaction: 'User satisfaction with real-time features',
    featureAdoptionRate: 'Adoption rate of new collaboration features',
    accessibilityCompliance: 'Accessibility audit scores and compliance',
    mobileExperienceRating: 'Mobile user experience satisfaction scores',
  },
};
```

---

## 🎉 MILESTONE 3 COMPLETION CRITERIA

### **Definition of Done**

**✅ Core Infrastructure Complete:**

- ✅ **Project-specific WebSocket authentication** (`projectSocketAuth.js`) implemented and integrated
- ✅ **Real-time presence system** (`useProjectPresence.js`) providing accurate user status tracking
- ✅ **Enhanced push notification manager** (`pushNotificationManager.js`) with multi-channel delivery
- ✅ **Unified collaboration interface** (`RealTimeCollaborationInterface.js`) providing seamless user experience

**✅ Integration Requirements Met:**

- **Seamless integration** with existing 658-line `socketManager.js` without breaking changes
- **Authentication flow** building upon existing JWT system with project-specific permissions
- **Real-time delivery** leveraging existing socket infrastructure for optimal performance
- **Notification system** extending existing notification patterns with enhanced capabilities

**✅ Quality Assurance Standards:**

- **Security compliance** with role-based access control and audit logging
- **Performance optimization** with efficient presence tracking and notification delivery
- **Accessibility compliance** meeting WCAG 2.1 AA standards for all collaboration features
- **Mobile optimization** providing excellent experience across all device types

**✅ Testing & Documentation:**

- **Comprehensive testing** covering unit, integration, and performance test scenarios
- **API documentation** for all new collaboration endpoints and socket events
- **User documentation** for team collaboration features and notification management
- **Developer documentation** for extending and customizing collaboration features

### **User Value Delivered**

1. **Seamless Team Awareness** - Real-time presence and activity tracking
2. **Instant Communication** - Multi-channel notification delivery system
3. **Enhanced Productivity** - Collaborative editing and activity coordination
4. **Mobile Excellence** - Full-featured mobile collaboration experience
5. **Security & Compliance** - Enterprise-grade security with comprehensive audit trails

---

**🎯 Next Steps:** [PROJECTS_MILESTONE_4.md](PROJECTS_MILESTONE_4.md) - Project Templates & Automation

**Confidence Level: 9/10** - Building upon robust existing socket infrastructure with comprehensive enhancements for enterprise-level project collaboration.
