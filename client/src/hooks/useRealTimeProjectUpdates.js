import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { getSocket } from '../utils/socket';
import {
  updateProject,
  deleteProject,
  createProject,
  projectUpdated,
  projectDeleted,
  memberUpdated,
  fetchProjects,
} from '../features/projects/projectsSlice';

/**
 * useRealTimeProjectUpdates - Custom hook for real-time project updates via Socket.IO
 *
 * This hook manages the Socket.IO connection for real-time project updates.
 * It listens for project-related events and automatically updates the Redux store
 * to keep the dashboard synchronized with server-side changes.
 *
 * Features:
 * - Automatic connection/disconnection management
 * - Real-time project CRUD operations
 * - Connection status tracking
 * - Error handling and reconnection logic
 * - Performance optimizations to prevent unnecessary re-renders
 *
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Whether to enable real-time updates (default: true)
 * @param {string} options.userId - Current user ID for filtering relevant updates
 * @param {Array} options.projectIds - Specific project IDs to watch (optional)
 * @returns {Object} Connection status and control functions
 */
const useRealTimeProjectUpdates = ({
  enabled = true,
  userId = null,
  projectIds = null,
} = {}) => {
  const dispatch = useDispatch();
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [errorCount, setErrorCount] = useState(0);

  // Use refs to prevent unnecessary effect re-runs
  const isConnectedRef = useRef(false);
  const listenersClearedRef = useRef(false);

  // Get the actual socket instance
  const socket = getSocket();

  /**
   * Handle project creation events
   * Adds new project to Redux store if user has access
   */
  const handleProjectCreated = (data) => {
    try {
      console.log('Real-time: Project created', data);

      const projectData = data.project || data;

      // Only add if user is a member or no user filter specified
      if (
        !userId ||
        projectData.members?.some((member) => member.userId === userId)
      ) {
        // Use the fulfilled action to add the project
        dispatch(createProject.fulfilled(projectData));
        setLastUpdate({
          type: 'project:created',
          projectId: projectData._id,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error('Error handling project creation:', error);
      setErrorCount((prev) => prev + 1);
    }
  };

  /**
   * Handle project update events
   * Updates existing project in Redux store
   */
  const handleProjectUpdated = (data) => {
    try {
      console.log('Real-time: Project updated', data);

      const projectData = data.project || data;

      // Filter for user-specific projects if userId specified
      if (
        !userId ||
        projectData.members?.some((member) => member.userId === userId)
      ) {
        dispatch(projectUpdated(projectData));
        setLastUpdate({
          type: 'project:updated',
          projectId: projectData._id,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error('Error handling project update:', error);
      setErrorCount((prev) => prev + 1);
    }
  };

  /**
   * Handle project deletion events
   * Removes project from Redux store
   */
  const handleProjectDeleted = (data) => {
    try {
      console.log('Real-time: Project deleted', data);

      const projectId = data.projectId || data;

      dispatch(projectDeleted(projectId));
      setLastUpdate({
        type: 'project:deleted',
        projectId,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error handling project deletion:', error);
      setErrorCount((prev) => prev + 1);
    }
  };

  /**
   * Handle project status change events
   * Updates project status in Redux store
   */
  const handleProjectStatusChanged = (data) => {
    try {
      console.log('Real-time: Project status changed', data);

      const { projectId, newStatus, updatedBy } = data;

      // Avoid processing our own status changes
      if (updatedBy === userId) {
        return;
      }

      // Update the project with new status
      dispatch(
        projectUpdated({
          _id: projectId,
          status: newStatus,
        })
      );

      setLastUpdate({
        type: 'project:status-changed',
        projectId,
        status: newStatus,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error handling project status change:', error);
      setErrorCount((prev) => prev + 1);
    }
  };

  /**
   * Handle bulk project updates (for initial load or refresh)
   * Replaces all projects in the Redux store
   */
  const handleProjectsRefresh = () => {
    try {
      console.log('Real-time: Projects refresh');

      dispatch(fetchProjects());
      setLastUpdate({
        type: 'projects:refresh',
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error handling projects refresh event:', error);
      setErrorCount((prev) => prev + 1);
    }
  };

  /**
   * Handle Socket.IO connection events
   * Updates connection status and manages reconnection logic
   */
  const handleConnection = () => {
    setConnectionStatus('connected');
    setErrorCount(0);
    isConnectedRef.current = true;
    console.log('Real-time: Connected to Socket.IO server');
  };

  const handleDisconnection = (reason) => {
    setConnectionStatus('disconnected');
    isConnectedRef.current = false;
    console.log('Real-time: Disconnected from Socket.IO server:', reason);

    // Increment error count if disconnect was unexpected
    if (reason === 'io server disconnect' || reason === 'transport error') {
      setErrorCount((prev) => prev + 1);
    }
  };

  const handleReconnection = () => {
    setConnectionStatus('connected');
    setErrorCount(0);
    isConnectedRef.current = true;
    console.log('Real-time: Reconnected to Socket.IO server');
  };

  const handleReconnectionError = (error) => {
    setConnectionStatus('error');
    setErrorCount((prev) => prev + 1);
    console.error('Real-time: Reconnection error:', error);
  };

  /**
   * Set up Socket.IO event listeners
   * Registers all the event handlers for project-related events
   */
  const setupEventListeners = () => {
    if (listenersClearedRef.current) {
      // Clear existing listeners to prevent duplicates
      socket.off('project:created', handleProjectCreated);
      socket.off('project:updated', handleProjectUpdated);
      socket.off('project:deleted', handleProjectDeleted);
      socket.off('project:status-changed', handleProjectStatusChanged);
      socket.off('projects:refresh', handleProjectsRefresh);
      socket.off('connect', handleConnection);
      socket.off('disconnect', handleDisconnection);
      socket.off('reconnect', handleReconnection);
      socket.off('reconnect_error', handleReconnectionError);
    }

    // Register project event listeners
    socket.on('project:created', handleProjectCreated);
    socket.on('project:updated', handleProjectUpdated);
    socket.on('project:deleted', handleProjectDeleted);
    socket.on('project:status-changed', handleProjectStatusChanged);
    socket.on('projects:refresh', handleProjectsRefresh);

    // Register connection event listeners
    socket.on('connect', handleConnection);
    socket.on('disconnect', handleDisconnection);
    socket.on('reconnect', handleReconnection);
    socket.on('reconnect_error', handleReconnectionError);

    listenersClearedRef.current = false;
  };

  /**
   * Clean up Socket.IO event listeners
   * Removes all event handlers to prevent memory leaks
   */
  const cleanupEventListeners = () => {
    socket.off('project:created', handleProjectCreated);
    socket.off('project:updated', handleProjectUpdated);
    socket.off('project:deleted', handleProjectDeleted);
    socket.off('project:status-changed', handleProjectStatusChanged);
    socket.off('projects:refresh', handleProjectsRefresh);
    socket.off('connect', handleConnection);
    socket.off('disconnect', handleDisconnection);
    socket.off('reconnect', handleReconnection);
    socket.off('reconnect_error', handleReconnectionError);

    listenersClearedRef.current = true;
  };

  /**
   * Main effect hook for managing Socket.IO connection
   * Handles connection setup, cleanup, and dependency changes
   */
  useEffect(() => {
    if (!enabled) {
      cleanupEventListeners();
      if (socket.connected) {
        socket.disconnect();
      }
      setConnectionStatus('disabled');
      return;
    }

    // Set up event listeners
    setupEventListeners();

    // Connect if not already connected
    if (!socket.connected) {
      setConnectionStatus('connecting');
      socket.connect();
    } else {
      setConnectionStatus('connected');
      isConnectedRef.current = true;
    }

    // Join user-specific room if userId provided
    if (userId && socket.connected) {
      socket.emit('join:user-room', userId);
    }

    // Join project-specific rooms if projectIds provided
    if (projectIds && socket.connected) {
      projectIds.forEach((projectId) => {
        socket.emit('join:project-room', projectId);
      });
    }

    // Cleanup function
    return () => {
      cleanupEventListeners();

      // Leave rooms on cleanup
      if (userId && socket.connected) {
        socket.emit('leave:user-room', userId);
      }

      if (projectIds && socket.connected) {
        projectIds.forEach((projectId) => {
          socket.emit('leave:project-room', projectId);
        });
      }
    };
  }, [enabled, userId, projectIds?.join(',')]); // Use join to prevent array reference issues

  /**
   * Manual control functions for advanced use cases
   */
  const connect = () => {
    if (!socket.connected) {
      setConnectionStatus('connecting');
      socket.connect();
    }
  };

  const disconnect = () => {
    if (socket.connected) {
      socket.disconnect();
    }
  };

  const reconnect = () => {
    socket.disconnect();
    setTimeout(() => {
      socket.connect();
    }, 1000);
  };

  /**
   * Emit project status change (for Kanban drag-and-drop)
   * Notifies other clients of status changes
   */
  const emitStatusChange = (projectId, newStatus) => {
    if (socket.connected) {
      socket.emit('project:change-status', {
        projectId,
        newStatus,
        updatedBy: userId,
      });
    }
  };

  // Return hook interface
  return {
    // Connection state
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    lastUpdate,
    errorCount,

    // Control functions
    connect,
    disconnect,
    reconnect,
    emitStatusChange,

    // Utility functions
    isEnabled: enabled,
    socket, // Expose socket instance for advanced use cases
  };
};

export default useRealTimeProjectUpdates;
