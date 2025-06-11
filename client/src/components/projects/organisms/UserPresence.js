/**
 * UserPresence Component
 *
 * Displays online team members for project collaboration.
 *
 * Features:
 * - Real-time user presence indicators
 * - User avatars and roles
 * - Online/offline status management
 * - Responsive design for different screen sizes
 * - Integration with project socket infrastructure
 *
 * Part of Milestone 3: Team Collaboration Features
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  setupProjectPresence,
  joinProject,
  leaveProject,
} from '../../../utils/socket';
import { selectCurrentProject } from '../../../features/projects/projectsSlice';
import { selectCurrentUser } from '../../../features/auth/authSlice';
import { createComponentLogger } from '../../../utils/logger';

const logger = createComponentLogger('UserPresence');

const UserPresence = ({
  projectId,
  className = '',
  showUsernames = true,
  maxVisibleUsers = 5,
  size = 'medium',
}) => {
  // Redux state
  const currentProject = useSelector(selectCurrentProject);
  const currentUser = useSelector(selectCurrentUser);

  // Local state for online users
  const [onlineUsers, setOnlineUsers] = useState(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  // Determine the project ID to use
  const activeProjectId = projectId || currentProject?.id;

  /**
   * Handle user coming online
   * Adds or updates user presence information
   */
  const handleUserOnline = useCallback(
    (data) => {
      logger.debug('User came online:', data);
      const { userId, username, userRole, timestamp, socketId } = data;

      setOnlineUsers((prev) => {
        const newMap = new Map(prev);
        newMap.set(userId, {
          id: userId,
          username,
          role: userRole,
          status: 'online',
          lastSeen: timestamp,
          socketId,
          joinedAt: prev.get(userId)?.joinedAt || timestamp,
        });
        return newMap;
      });

      logger.info(
        `User ${username} came online in project ${activeProjectId}`,
        {
          userId,
          username,
          userRole,
          activeProjectId,
          socketId,
        }
      );
    },
    [activeProjectId]
  );

  /**
   * Handle user going offline
   * Updates user status or removes them from the list
   */
  const handleUserOffline = useCallback(
    (data) => {
      logger.debug('User went offline:', data);
      const { userId, username, timestamp } = data;

      setOnlineUsers((prev) => {
        const newMap = new Map(prev);
        const user = newMap.get(userId);

        if (user) {
          // Keep user in list but mark as offline for a brief period
          newMap.set(userId, {
            ...user,
            status: 'offline',
            lastSeen: timestamp,
          });

          // Remove from list after a delay to show they were recently online
          setTimeout(() => {
            setOnlineUsers((current) => {
              const updated = new Map(current);
              updated.delete(userId);
              return updated;
            });
          }, 30000); // Keep offline users visible for 30 seconds
        }

        return newMap;
      });

      logger.info(
        `User ${username} went offline in project ${activeProjectId}`,
        {
          userId,
          username,
          activeProjectId,
          timestamp,
        }
      );
    },
    [activeProjectId]
  );

  /**
   * Set up socket connection and presence listeners
   */
  useEffect(() => {
    if (!activeProjectId) {
      setConnectionError('No project ID available');
      return;
    }

    let cleanupPresence = null;
    let joinPromise = null;

    const initializePresence = async () => {
      try {
        setConnectionError(null);
        // Join the project for presence
        const joinResult = await joinProject(activeProjectId);
        logger.debug('Successfully joined project for presence:', joinResult);
        setIsConnected(true);

        // Add current user to online users list immediately
        if (currentUser) {
          setOnlineUsers((prev) => {
            const newMap = new Map(prev);
            newMap.set(currentUser.id, {
              id: currentUser.id,
              username: currentUser.username,
              role: joinResult.userRole || 'member',
              status: 'online',
              lastSeen: new Date().toISOString(),
              joinedAt: new Date().toISOString(),
              isCurrentUser: true,
            });
            return newMap;
          });
        }

        // Set up presence listeners
        cleanupPresence = setupProjectPresence({
          onUserOnline: handleUserOnline,
          onUserOffline: handleUserOffline,
          onUserJoined: (data) => {
            logger.debug('User joined event in UserPresence:', data);
            // This specific onUserJoined is more for activity feed; UserPresence primarily uses onUserOnline
            // However, it can be used to ensure the list is up-to-date if onUserOnline was missed.
            if (data.userId !== currentUser?.id) {
              handleUserOnline(data); // Treat as an online event for presence list
            }
          },
        });
      } catch (error) {
        logger.error('Failed to initialize presence:', {
          error: error.message,
          activeProjectId,
        });
        setConnectionError(error.message);
        setIsConnected(false);
      }
    };

    initializePresence();

    // Cleanup function
    return () => {
      if (cleanupPresence) {
        cleanupPresence();
      }
      if (activeProjectId) {
        leaveProject(activeProjectId);
      }
      setOnlineUsers(new Map());
      setIsConnected(false);
    };
  }, [activeProjectId, currentUser, handleUserOnline, handleUserOffline]);

  /**
   * Get size classes for different component sizes
   */
  const getSizeClasses = useMemo(() => {
    const sizeMap = {
      small: {
        avatar: 'w-6 h-6',
        text: 'text-xs',
        container: 'gap-1',
      },
      medium: {
        avatar: 'w-8 h-8',
        text: 'text-sm',
        container: 'gap-2',
      },
      large: {
        avatar: 'w-10 h-10',
        text: 'text-base',
        container: 'gap-3',
      },
    };
    return sizeMap[size] || sizeMap.medium;
  }, [size]);

  /**
   * Get role color for user role badges
   */
  const getRoleColor = useCallback((role) => {
    const colors = {
      owner: 'bg-purple-100 text-purple-800',
      admin: 'bg-blue-100 text-blue-800',
      member: 'bg-green-100 text-green-800',
      viewer: 'bg-gray-100 text-gray-800',
    };
    return colors[role] || colors.member;
  }, []);

  /**
   * Get user avatar initials or placeholder
   */
  const getUserInitials = useCallback((username) => {
    if (!username) return '?';
    const names = username.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return username.slice(0, 2).toUpperCase();
  }, []);

  // Convert Map to Array and sort by join time
  const sortedOnlineUsers = useMemo(() => {
    const users = Array.from(onlineUsers.values())
      .filter((user) => user.status === 'online')
      .sort((a, b) => {
        // Current user first
        if (a.isCurrentUser) return -1;
        if (b.isCurrentUser) return 1;
        // Then by role priority
        const rolePriority = { owner: 0, admin: 1, member: 2, viewer: 3 };
        const roleA = rolePriority[a.role] ?? 4;
        const roleB = rolePriority[b.role] ?? 4;
        if (roleA !== roleB) return roleA - roleB;
        // Then by join time
        return new Date(a.joinedAt) - new Date(b.joinedAt);
      });

    return users;
  }, [onlineUsers]);

  // Determine which users to show and which are hidden
  const visibleUsers = sortedOnlineUsers.slice(0, maxVisibleUsers);
  const hiddenCount = Math.max(0, sortedOnlineUsers.length - maxVisibleUsers);

  // Don't render if no project or no users online
  if (!activeProjectId || sortedOnlineUsers.length === 0) {
    return null;
  }

  return (
    <div
      className={`flex items-center ${getSizeClasses.container} ${className}`}
    >
      {/* Connection status indicator */}
      {connectionError && (
        <div className="text-red-500 text-xs">
          <span className="sr-only">Connection error: {connectionError}</span>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}

      {/* Online users avatars */}
      <div className="flex -space-x-2">
        {visibleUsers.map((user) => (
          <div
            key={user.id}
            className="relative group"
            title={`${user.username} (${user.role}) - ${
              user.isCurrentUser ? 'You' : 'Online'
            }`}
          >
            {/* User avatar */}
            <div
              className={`
              ${getSizeClasses.avatar} 
              rounded-full 
              border-2 
              border-white 
              bg-gradient-to-br 
              from-indigo-400 
              to-indigo-600 
              flex 
              items-center 
              justify-center 
              text-white 
              font-medium 
              ${getSizeClasses.text}
              ${user.isCurrentUser ? 'ring-2 ring-indigo-300' : ''}
              hover:scale-110 
              transition-transform 
              duration-200
            `}
            >
              {getUserInitials(user.username)}
            </div>

            {/* Online status indicator */}
            <div
              className={`
              absolute 
              -bottom-0.5 
              -right-0.5 
              w-3 
              h-3 
              rounded-full 
              border-2 
              border-white
              ${user.status === 'online' ? 'bg-green-400' : 'bg-gray-400'}
            `}
            />

            {/* Tooltip on hover */}
            <div
              className="
              absolute 
              bottom-full 
              left-1/2 
              transform 
              -translate-x-1/2 
              mb-2 
              px-2 
              py-1 
              bg-gray-900 
              text-white 
              text-xs 
              rounded 
              whitespace-nowrap 
              opacity-0 
              group-hover:opacity-100 
              transition-opacity 
              duration-200 
              pointer-events-none
              z-10
            "
            >
              <div className="flex flex-col items-center">
                <span className="font-medium">{user.username}</span>
                <span
                  className={`px-1 py-0.5 rounded text-xs ${getRoleColor(
                    user.role
                  )}`}
                >
                  {user.role}
                </span>
                {user.isCurrentUser && (
                  <span className="text-xs opacity-75">(You)</span>
                )}
              </div>
              {/* Tooltip arrow */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
            </div>
          </div>
        ))}

        {/* Show hidden count if there are more users */}
        {hiddenCount > 0 && (
          <div
            className={`
              ${getSizeClasses.avatar} 
              rounded-full 
              border-2 
              border-white 
              bg-gray-100 
              flex 
              items-center 
              justify-center 
              text-gray-600 
              font-medium 
              ${getSizeClasses.text}
            `}
            title={`${hiddenCount} more ${
              hiddenCount === 1 ? 'person' : 'people'
            } online`}
          >
            +{hiddenCount}
          </div>
        )}
      </div>

      {/* Optional usernames list for larger displays */}
      {showUsernames && visibleUsers.length > 0 && (
        <div className="hidden sm:flex flex-col">
          <span className={`text-gray-600 ${getSizeClasses.text}`}>
            {sortedOnlineUsers.length} online
          </span>
          {sortedOnlineUsers.length <= 3 && (
            <span className={`text-gray-500 text-xs`}>
              {visibleUsers.map((u) => u.username).join(', ')}
            </span>
          )}
        </div>
      )}

      {/* Connection status indicator */}
      {isConnected && (
        <div className="flex items-center text-green-600">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="ml-1 text-xs hidden lg:inline">Live</span>
        </div>
      )}
    </div>
  );
};

export default UserPresence;
