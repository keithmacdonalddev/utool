/**
 * ActivityFeed Component
 *
 * Displays real-time project activity and notifications.
 *
 * Features:
 * - Real-time activity stream
 * - Task updates, comments, and collaboration events
 * - Filtering and categorization
 * - Infinite scroll for historical activities
 * - Integration with project socket infrastructure
 * - Activity grouping and smart notifications
 *
 * Part of Milestone 3: Team Collaboration Features
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { formatDistanceToNow, parseISO } from 'date-fns';
import {
  setupProjectPresence,
  joinProject,
  leaveProject,
} from '../../../utils/socket';
import { selectCurrentProject } from '../../../features/projects/projectsSlice';
import { selectCurrentUser } from '../../../features/auth/authSlice';
import { createComponentLogger } from '../../../utils/logger';

const logger = createComponentLogger('ActivityFeed');

const ActivityFeed = ({
  projectId,
  className = '',
  maxItems = 50,
  showFilters = true,
  autoScroll = true,
  compact = false,
}) => {
  // Redux state
  const currentProject = useSelector(selectCurrentProject);
  const currentUser = useSelector(selectCurrentUser);
  const dispatch = useDispatch();

  // Local state
  const [activities, setActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [selectedFilters, setSelectedFilters] = useState(new Set(['all']));
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);

  // Refs
  const scrollContainerRef = useRef(null);
  const activityIdCounter = useRef(0);

  // Determine the project ID to use
  const activeProjectId = projectId || currentProject?.id;

  /**
   * Activity types for filtering and categorization
   */
  const activityTypes = {
    TASK_CREATED: {
      icon: '➕',
      color: 'bg-green-100 text-green-800',
      label: 'Task Created',
    },
    TASK_UPDATED: {
      icon: '✏️',
      color: 'bg-blue-100 text-blue-800',
      label: 'Task Updated',
    },
    TASK_COMPLETED: {
      icon: '✅',
      color: 'bg-green-100 text-green-800',
      label: 'Task Completed',
    },
    TASK_ASSIGNED: {
      icon: '👤',
      color: 'bg-purple-100 text-purple-800',
      label: 'Task Assigned',
    },
    COMMENT_ADDED: {
      icon: '💬',
      color: 'bg-yellow-100 text-yellow-800',
      label: 'Comment Added',
    },
    USER_JOINED: {
      icon: '👋',
      color: 'bg-indigo-100 text-indigo-800',
      label: 'User Joined',
    },
    USER_LEFT: {
      icon: '👋',
      color: 'bg-gray-100 text-gray-800',
      label: 'User Left',
    },
    FILE_UPLOADED: {
      icon: '📎',
      color: 'bg-orange-100 text-orange-800',
      label: 'File Uploaded',
    },
    PROJECT_UPDATED: {
      icon: '🔧',
      color: 'bg-blue-100 text-blue-800',
      label: 'Project Updated',
    },
  };

  /**
   * Create a new activity entry
   */
  const createActivity = useCallback(
    (type, data) => {
      const activity = {
        id: `activity_${Date.now()}_${++activityIdCounter.current}`,
        type,
        timestamp: new Date().toISOString(),
        projectId: activeProjectId,
        user: data.user || {
          id: currentUser?.id,
          username: currentUser?.username,
        },
        data: data.data || {},
        message: data.message || '',
        ...data,
      };

      return activity;
    },
    [activeProjectId, currentUser]
  );

  /**
   * Add new activity to the feed
   */
  const addActivity = useCallback(
    (activity) => {
      setActivities((prev) => [activity, ...prev].slice(0, maxItems));
    },
    [maxItems]
  );

  /**
   * Handle real-time task updates
   */
  const handleTaskUpdate = useCallback(
    (data) => {
      const { taskId, updates, updatedBy, timestamp } = data;

      // Determine the type of update
      let activityType = 'TASK_UPDATED';
      let message = `updated task`;

      if (updates.status === 'completed') {
        activityType = 'TASK_COMPLETED';
        message = `completed task`;
      } else if (updates.assignedTo) {
        activityType = 'TASK_ASSIGNED';
        message = `assigned task to ${
          updates.assignedTo.username || 'someone'
        }`;
      } else if (updates.title) {
        message = `updated task title`;
      } else if (updates.description) {
        message = `updated task description`;
      } else if (updates.priority) {
        message = `changed task priority to ${updates.priority}`;
      }

      const activity = createActivity(activityType, {
        user: updatedBy,
        message,
        data: {
          taskId,
          updates,
          taskTitle: updates.title || `Task ${taskId}`,
        },
        timestamp,
      });

      addActivity(activity);
    },
    [createActivity, addActivity]
  );

  /**
   * Handle real-time comments
   */
  const handleCommentAdded = useCallback(
    (data) => {
      const { taskId, comment } = data;

      const activity = createActivity('COMMENT_ADDED', {
        user: comment.author,
        message: `commented on task`,
        data: {
          taskId,
          comment: comment.content,
          parentCommentId: comment.parentCommentId,
        },
        timestamp: comment.timestamp,
      });

      addActivity(activity);
    },
    [createActivity, addActivity]
  );

  /**
   * Handle user presence changes
   */
  const handleUserOnline = useCallback(
    (data) => {
      const { userId, username, userRole, timestamp } = data;

      // Don't show activity for current user joining
      if (userId === currentUser?.id) return;

      const activity = createActivity('USER_JOINED', {
        user: { id: userId, username },
        message: `joined the project`,
        data: { userRole },
        timestamp,
      });

      addActivity(activity);
    },
    [createActivity, addActivity, currentUser]
  );

  const handleUserOffline = useCallback(
    (data) => {
      const { userId, username, timestamp } = data;

      // Don't show activity for current user leaving
      if (userId === currentUser?.id) return;

      const activity = createActivity('USER_LEFT', {
        user: { id: userId, username },
        message: `left the project`,
        data: {},
        timestamp,
      });

      addActivity(activity);
    },
    [createActivity, addActivity, currentUser]
  );

  /**
   * Set up socket connection and activity listeners
   */
  useEffect(() => {
    if (!activeProjectId) {
      setConnectionError('No project ID available');
      return;
    }

    let cleanupPresence = null;

    const initializeActivityFeed = async () => {
      try {
        setConnectionError(null);

        // Join the project for collaboration
        const joinResult = await joinProject(activeProjectId);
        // logger.debug(\'Successfully joined project for activity feed:\', joinResult); // Replaced console.log
        setIsConnected(true);

        // Set up activity listeners
        cleanupPresence = setupProjectPresence({
          onUserOnline: handleUserOnline,
          onUserOffline: handleUserOffline,
          onTaskUpdate: handleTaskUpdate,
          onCommentAdded: handleCommentAdded,
        });

        // Add initial "joined project" activity for current user
        if (currentUser) {
          const welcomeActivity = createActivity('USER_JOINED', {
            user: currentUser, // Ensure currentUser is correctly passed
            message: `joined the project`,
            data: { userRole: joinResult.userRole },
          });
          addActivity(welcomeActivity);
        }
      } catch (error) {
        // logger.error(\'Failed to initialize activity feed:\', error); // Replaced console.log
        setConnectionError(error.message);
        setIsConnected(false);
      }
    };

    initializeActivityFeed();

    // Cleanup function
    return () => {
      if (cleanupPresence) {
        cleanupPresence();
      }
      if (activeProjectId) {
        leaveProject(activeProjectId);
      }
      setActivities([]);
      setIsConnected(false);
    };
  }, [
    activeProjectId,
    currentUser,
    createActivity,
    addActivity,
    handleUserOnline,
    handleUserOffline,
    handleTaskUpdate,
    handleCommentAdded,
  ]);

  /**
   * Filter activities based on selected filters
   */
  useEffect(() => {
    if (selectedFilters.has('all')) {
      setFilteredActivities(activities);
    } else {
      const filtered = activities.filter((activity) =>
        selectedFilters.has(activity.type)
      );
      setFilteredActivities(filtered);
    }
  }, [activities, selectedFilters]);

  /**
   * Handle filter toggle
   */
  const toggleFilter = useCallback((filterType) => {
    setSelectedFilters((prev) => {
      const newFilters = new Set(prev);

      if (filterType === 'all') {
        return new Set(['all']);
      }

      newFilters.delete('all');

      if (newFilters.has(filterType)) {
        newFilters.delete(filterType);
      } else {
        newFilters.add(filterType);
      }

      // If no specific filters selected, default to 'all'
      if (newFilters.size === 0) {
        newFilters.add('all');
      }

      return newFilters;
    });
  }, []);

  /**
   * Auto-scroll to bottom when new activities arrive
   */
  useEffect(() => {
    if (autoScroll && isScrolledToBottom && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight;
    }
  }, [filteredActivities, autoScroll, isScrolledToBottom]);

  /**
   * Handle scroll events to detect if user is at bottom
   */
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } =
      scrollContainerRef.current;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px threshold
    setIsScrolledToBottom(isAtBottom);
  }, []);

  /**
   * Get relative time string
   */
  const getRelativeTime = useCallback((timestamp) => {
    try {
      const date =
        typeof timestamp === 'string' ? parseISO(timestamp) : timestamp;
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return 'Unknown time';
    }
  }, []);

  /**
   * Render activity item
   */
  const renderActivity = useCallback(
    (activity) => {
      const typeConfig =
        activityTypes[activity.type] || activityTypes.TASK_UPDATED;

      return (
        <div
          key={activity.id}
          className={`
          flex items-start space-x-3 p-3 rounded-lg transition-colors duration-200
          ${compact ? 'py-2' : 'py-3'}
          hover:bg-gray-50
        `}
        >
          {/* Activity icon */}
          <div
            className={`
          flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm
          ${typeConfig.color}
        `}
          >
            {typeConfig.icon}
          </div>

          {/* Activity content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-900">
                {activity.user?.username || 'Unknown User'}
              </span>
              <span className="text-gray-600">{activity.message}</span>
              {activity.data?.taskTitle && (
                <span className="font-medium text-indigo-600">
                  "{activity.data.taskTitle}"
                </span>
              )}
            </div>

            {/* Additional activity details */}
            {activity.data?.comment && (
              <div className="mt-1 text-sm text-gray-600 bg-gray-100 rounded p-2">
                {activity.data.comment.length > 100
                  ? `${activity.data.comment.substring(0, 100)}...`
                  : activity.data.comment}
              </div>
            )}

            {/* Timestamp */}
            <div className="mt-1 text-xs text-gray-500">
              {getRelativeTime(activity.timestamp)}
            </div>
          </div>
        </div>
      );
    },
    [compact, getRelativeTime]
  );

  /**
   * Get available filter options based on current activities
   */
  const availableFilters = useMemo(() => {
    const typesInUse = new Set(activities.map((a) => a.type));
    return Object.entries(activityTypes)
      .filter(([type]) => typesInUse.has(type))
      .map(([type, config]) => ({ type, ...config }));
  }, [activities]);

  // Don't render if no project
  if (!activeProjectId) {
    return null;
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-medium text-gray-900">Activity Feed</h3>
            {isConnected && (
              <div className="flex items-center text-green-600">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="ml-1 text-xs">Live</span>
              </div>
            )}
          </div>

          {/* Activity count */}
          <span className="text-sm text-gray-500">
            {filteredActivities.length} activities
          </span>
        </div>

        {/* Error state */}
        {connectionError && (
          <div className="mt-2 text-sm text-red-600">
            Connection error: {connectionError}
          </div>
        )}
      </div>

      {/* Filters */}
      {showFilters && availableFilters.length > 0 && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => toggleFilter('all')}
              className={`
                px-3 py-1 rounded-full text-xs font-medium transition-colors
                ${
                  selectedFilters.has('all')
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              All
            </button>
            {availableFilters.map(({ type, label, color }) => (
              <button
                key={type}
                onClick={() => toggleFilter(type)}
                className={`
                  px-3 py-1 rounded-full text-xs font-medium transition-colors
                  ${
                    selectedFilters.has(type)
                      ? color
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Activity list */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className={`
          overflow-y-auto
          ${compact ? 'max-h-64' : 'max-h-96'}
        `}
      >
        {filteredActivities.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <div className="text-4xl mb-2">📋</div>
            <p>No activity yet</p>
            <p className="text-sm">
              {isConnected
                ? 'Waiting for project activity...'
                : 'Connecting...'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredActivities.map(renderActivity)}
          </div>
        )}
      </div>

      {/* Scroll to bottom button */}
      {!isScrolledToBottom && (
        <div className="absolute bottom-4 right-4">
          <button
            onClick={() => {
              if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTop =
                  scrollContainerRef.current.scrollHeight;
              }
            }}
            className="
              bg-indigo-600 
              text-white 
              rounded-full 
              p-2 
              shadow-lg 
              hover:bg-indigo-700 
              transition-colors
            "
            title="Scroll to bottom"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;
