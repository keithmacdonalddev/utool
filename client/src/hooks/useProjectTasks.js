/**
 * useProjectTasks.js - Custom hook for efficiently fetching tasks for a project
 *
 * This hook combines our generic useDataFetching hook with project-specific logic.
 * It solves the problem of redundant API calls by:
 * 1. Using the cache system in the tasks slice
 * 2. Only fetching fresh data when needed
 * 3. Providing a simple interface for components
 *
 * Enhanced with smart data comparison and background refresh capabilities for
 * optimal UI performance and reduced unnecessary updates.
 */

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { getTasksForProject } from '../features/tasks/taskSlice';
import { selectGuestItemsByType } from '../features/guestSandbox/guestSandboxSlice';
import useDataFetching from './useDataFetching';

/**
 * Custom hook for efficiently loading tasks for a specific project
 * This prevents redundant API calls by using the caching system in Redux
 *
 * @param {string} projectId - The ID of the project to fetch tasks for
 * @param {Object} options - Additional options
 * @param {number} options.cacheTimeout - How long to consider cached data fresh (ms)
 * @param {boolean} options.skipInitialFetch - Whether to skip the initial fetch
 * @param {boolean} options.backgroundRefresh - Whether to refresh in background while showing cached data
 * @param {boolean} options.smartRefresh - Whether to apply smart comparison for state updates
 * @returns {Object} Object containing { tasks, isLoading, error, refetchTasks, backgroundRefreshState }
 */
const useProjectTasks = (projectId, options = {}) => {
  const {
    cacheTimeout,
    skipInitialFetch,
    backgroundRefresh = true,
    smartRefresh = true,
  } = options;

  // Get auth state to check if user is a guest
  const { isGuest } = useSelector((state) => state.auth);

  // Get guest task data directly if the user is a guest
  const guestTasks = useSelector((state) =>
    isGuest ? selectGuestItemsByType(state, 'tasks') : []
  );

  // Filter guest tasks for this project and format them to match API structure
  const filteredGuestTasks = useMemo(() => {
    if (!isGuest || !projectId) return [];
    return guestTasks
      .filter((task) => task.data.projectId === projectId)
      .map((task) => ({
        ...task.data,
        _id: task.id,
        id: task.id,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      }));
  }, [isGuest, projectId, guestTasks]);
  // Selector functions for the useDataFetching hook
  const selectTasks = useMemo(() => (state) => state.tasks.tasks, []);

  const selectLastFetched = useMemo(
    () => (state) => state.tasks.projectTasksTimestamps[projectId],
    [projectId]
  );

  const selectIsLoading = useMemo(() => (state) => state.tasks.isLoading, []);

  const selectError = useMemo(
    () => (state) => state.tasks.isError ? state.tasks.message : null,
    []
  );

  // Skip API fetch if user is a guest - we'll use the guest tasks directly
  const shouldSkipFetch = isGuest || skipInitialFetch; // Use our generic hook with task-specific selectors
  const {
    data: regularTasks,
    isLoading,
    error,
    refetch: refetchTasks,
    backgroundRefreshState,
  } = useDataFetching({
    fetchAction: getTasksForProject,
    selectData: selectTasks,
    selectLastFetched: selectLastFetched,
    selectIsLoading: selectIsLoading,
    selectError: selectError,
    dependencies: [projectId], // Re-fetch when project ID changes
    fetchParams: {
      projectId,
      backgroundRefresh,
      smartRefresh,
    }, // Pass to the action creator
    cacheTimeout,
    skipInitialFetch: shouldSkipFetch, // Skip if guest user
    backgroundRefresh: isGuest ? false : backgroundRefresh, // No background refresh for guests
    smartRefresh,
    idField: '_id', // Use _id for comparing task objects
  });

  // Combine the results - for guests, use filteredGuestTasks; for regular users, use the API data
  const tasks = isGuest ? filteredGuestTasks : regularTasks;

  return {
    tasks,
    isLoading,
    error,
    refetchTasks,
    backgroundRefreshState,
  };
};

export default useProjectTasks;
