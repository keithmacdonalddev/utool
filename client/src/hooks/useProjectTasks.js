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
import { getTasksForProject } from '../features/tasks/taskSlice';
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
  // Use our generic hook with task-specific selectors
  const {
    data: tasks,
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
    skipInitialFetch,
    backgroundRefresh,
    smartRefresh,
    idField: '_id', // Use _id for comparing task objects
  });

  return {
    tasks,
    isLoading,
    error,
    refetchTasks,
    backgroundRefreshState,
  };
};

export default useProjectTasks;
