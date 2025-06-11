/**
 * Real-Time Project Presence Hook
 *
 * Provides comprehensive real-time presence management for project collaboration.
 * Integrates with existing socket infrastructure and Redux state management.
 *
 * Features:
 * - Real-time user presence tracking (online/offline/idle/away)
 * - Activity detection with automatic status updates
 * - Heartbeat system for presence validation
 * - Integration with existing socket connection
 * - Redux state synchronization
 * - Performance optimizations for team awareness
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { createSelector } from 'reselect'; // Added import
import { getSocket, joinProject, setupProjectPresence } from '../utils/socket';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('useProjectPresence');

// Constants for presence system
const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const AWAY_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const HEARTBEAT_INTERVAL = 30 * 1000; // 30 seconds

/**
 * Main project presence hook
 * Manages real-time presence for a specific project
 */
export const useProjectPresence = (projectId) => {
  const dispatch = useDispatch();

  // Memoized selectors using reselect to prevent unnecessary rerenders
  // Input selector for auth state
  const selectAuthState = (state) => state.auth;
  // Memoized selector for the current user
  const selectCurrentUser = createSelector(
    [selectAuthState],
    (authState) => authState.user
  );

  // Input selector for projects state
  const selectProjectsState = (state) => state.projects;
  // Memoized selector for project presence data
  // Ensures that if the presence data for the projectId is undefined,
  // it consistently returns the same empty object reference.
  const selectProjectPresence = useMemo(() => {
    const emptyPresence = {}; // Stable reference for empty object
    return createSelector(
      [selectProjectsState, (_state, projectId) => projectId],
      (projectsState, pId) => projectsState?.presence?.[pId] || emptyPresence
    );
  }, []);

  const currentUser = useSelector(selectCurrentUser);
  // Pass projectId to the selector instance if it depends on props
  const projectPresenceSelectorInstance = useMemo(
    () => selectProjectPresence,
    [selectProjectPresence]
  );
  const projectPresence = useSelector((state) =>
    projectPresenceSelectorInstance(state, projectId)
  );

  // Local state management
  const [isConnected, setIsConnected] = useState(false);
  const [userStatus, setUserStatus] = useState('active');
  const [presenceError, setPresenceError] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  // Refs for cleanup and timers
  const activityTimer = useRef(null);
  const heartbeatTimer = useRef(null);
  const presenceCleanup = useRef(null);
  const lastActivity = useRef(Date.now());

  /**
   * Activity detection system
   * Monitors user activity and automatically updates status
   */
  const resetActivityTimer = useCallback(() => {
    lastActivity.current = Date.now();

    if (userStatus !== 'active') {
      setUserStatus('active');
      updatePresenceStatus('active');
    }

    // Clear existing timer
    if (activityTimer.current) {
      clearTimeout(activityTimer.current);
    }

    // Set idle timer
    activityTimer.current = setTimeout(() => {
      setUserStatus('idle');
      updatePresenceStatus('idle');

      // Set away timer
      activityTimer.current = setTimeout(() => {
        setUserStatus('away');
        updatePresenceStatus('away');
      }, AWAY_TIMEOUT - IDLE_TIMEOUT);
    }, IDLE_TIMEOUT);
  }, [userStatus]);
  /**
   * Update presence status on server
   */
  const updatePresenceStatus = useCallback(
    (status) => {
      const socket = getSocket();
      if (!socket || !socket.connected || !projectId) return;

      socket.emit('project:presence:status:update', {
        projectId,
        status,
        timestamp: new Date().toISOString(),
      });

      logger.debug('Presence status updated', {
        projectId,
        status,
        userId: currentUser?._id,
      });
    },
    [projectId, currentUser]
  );
  /**
   * Initialize presence system when component mounts or projectId changes
   */
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !projectId || !currentUser) return;

    logger.info('Initializing project presence', {
      projectId,
      userId: currentUser._id,
      socketConnected: socket.connected,
    });

    // Join project presence room
    const initializePresence = async () => {
      try {
        // First join the project if not already joined
        await joinProject(projectId);

        // Set up presence listeners
        presenceCleanup.current = setupProjectPresence({
          onUserOnline: (data) => {
            logger.debug('User came online', data);
            setOnlineUsers((prev) => {
              const existing = prev.find((u) => u.userId === data.userId);
              if (existing) {
                return prev.map((u) =>
                  u.userId === data.userId
                    ? { ...u, ...data, isOnline: true }
                    : u
                );
              }
              return [...prev, { ...data, isOnline: true }];
            });
          },

          onUserOffline: (data) => {
            logger.debug('User went offline', data);
            setOnlineUsers((prev) =>
              prev.map((u) =>
                u.userId === data.userId
                  ? { ...u, isOnline: false, lastSeen: data.timestamp }
                  : u
              )
            );
          },

          onUserJoined: (data) => {
            logger.debug('User joined project', data);
            setOnlineUsers((prev) => {
              const existing = prev.find((u) => u.userId === data.userId);
              if (!existing) {
                return [
                  ...prev,
                  {
                    userId: data.userId,
                    username: data.username,
                    userRole: data.userRole,
                    isOnline: true,
                    status: 'active',
                    joinedAt: data.timestamp,
                  },
                ];
              }
              return prev;
            });
          },

          onPermissionsUpdated: (data) => {
            logger.debug('User permissions updated', data);
            setOnlineUsers((prev) =>
              prev.map((u) =>
                u.userId === data.userId
                  ? {
                      ...u,
                      userRole: data.userRole,
                      permissions: data.permissions,
                    }
                  : u
              )
            );
          },
        });

        // Emit initial presence join
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

        logger.info('Project presence initialized successfully', {
          projectId,
          userId: currentUser._id,
        });
      } catch (error) {
        logger.error('Failed to initialize project presence', {
          error: error.message,
          projectId,
          userId: currentUser._id,
        });
        setPresenceError(error.message);
        setIsConnected(false);
      }
    };

    initializePresence();

    // Set up activity monitoring
    const handleActivity = () => resetActivityTimer();

    // Listen for user activity events
    document.addEventListener('mousedown', handleActivity);
    document.addEventListener('mousemove', handleActivity);
    document.addEventListener('keypress', handleActivity);
    document.addEventListener('scroll', handleActivity);
    document.addEventListener('touchstart', handleActivity);

    // Initial activity timer
    resetActivityTimer(); // Set up heartbeat
    heartbeatTimer.current = setInterval(() => {
      const currentSocket = getSocket();
      if (currentSocket && currentSocket.connected) {
        currentSocket.emit('project:presence:heartbeat', {
          projectId,
          timestamp: new Date().toISOString(),
        });
      }
    }, HEARTBEAT_INTERVAL);

    // Cleanup function
    return () => {
      logger.info('Cleaning up project presence', {
        projectId,
        userId: currentUser._id,
      });

      // Remove activity listeners
      document.removeEventListener('mousedown', handleActivity);
      document.removeEventListener('mousemove', handleActivity);
      document.removeEventListener('keypress', handleActivity);
      document.removeEventListener('scroll', handleActivity);
      document.removeEventListener('touchstart', handleActivity);

      // Clear timers
      if (activityTimer.current) {
        clearTimeout(activityTimer.current);
      }
      if (heartbeatTimer.current) {
        clearInterval(heartbeatTimer.current);
      } // Leave presence room
      const currentSocket = getSocket();
      if (currentSocket && currentSocket.connected) {
        currentSocket.emit('project:presence:leave', { projectId });
      }

      // Cleanup presence listeners
      if (presenceCleanup.current) {
        presenceCleanup.current();
      }

      setIsConnected(false);
      setOnlineUsers([]);
    };
  }, [projectId, currentUser, resetActivityTimer]);

  /**
   * Manual status update function
   */
  const setStatus = useCallback(
    (status) => {
      setUserStatus(status);
      updatePresenceStatus(status);
      resetActivityTimer(); // Reset activity timer when status is manually changed
    },
    // updatePresenceStatus depends on currentUser, which is now memoized.
    // resetActivityTimer depends on userStatus (local state) and updatePresenceStatus.
    [updatePresenceStatus, resetActivityTimer]
  );

  /**
   * Get presence statistics
   */
  const presenceStats = useMemo(() => {
    const online = onlineUsers.filter((u) => u.isOnline).length;
    const active = onlineUsers.filter(
      (u) => u.isOnline && u.status === 'active'
    ).length;
    const idle = onlineUsers.filter(
      (u) => u.isOnline && u.status === 'idle'
    ).length;
    const away = onlineUsers.filter(
      (u) => u.isOnline && u.status === 'away'
    ).length;
    return {
      total: onlineUsers.length,
      online,
      active,
      idle,
      away,
    };
  }, [onlineUsers]);

  return {
    // Connection state
    isConnected,
    presenceError,

    // User lists
    onlineUsers: onlineUsers.filter((u) => u.isOnline),
    allUsers: onlineUsers,

    // Current user status
    userStatus,
    setStatus,

    // Statistics
    presenceStats,

    // Utility functions
    isUserOnline: (userId) =>
      onlineUsers.some((u) => u.userId === userId && u.isOnline),
    getUserStatus: (userId) =>
      onlineUsers.find((u) => u.userId === userId)?.status || 'offline',
  };
};

/**
 * Utility hook for presence display helpers
 */
export const useProjectPresenceDisplay = () => {
  /**
   * Get status color for UI display
   */
  const getStatusColor = useCallback((status) => {
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
  }, []);

  /**
   * Get status icon for UI display
   */
  const getStatusIcon = useCallback((status) => {
    switch (status) {
      case 'active':
        return '●';
      case 'idle':
        return '◐';
      case 'away':
        return '○';
      default:
        return '◯';
    }
  }, []);

  /**
   * Format presence text for display
   */
  const formatPresenceText = useCallback((presenceStats) => {
    const { online, active, idle, away } = presenceStats;

    if (online === 0) return 'No one online';
    if (online === 1) return '1 person online';

    const parts = [];
    if (active > 0) parts.push(`${active} active`);
    if (idle > 0) parts.push(`${idle} idle`);
    if (away > 0) parts.push(`${away} away`);

    return `${online} online (${parts.join(', ')})`;
  }, []);

  /**
   * Get relative time since last activity
   */
  const getLastSeenText = useCallback((lastSeen) => {
    if (!lastSeen) return '';

    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffMs = now - lastSeenDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return lastSeenDate.toLocaleDateString();
  }, []);

  return {
    getStatusColor,
    getStatusIcon,
    formatPresenceText,
    getLastSeenText,
  };
};

export default useProjectPresence;
