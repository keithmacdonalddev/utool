/**
 * useRecentTasks.js - Custom hook for efficiently fetching recent tasks across projects
 *
 * This hook leverages our generic useDataFetching hook to provide a simple interface
 * for components that need to load recent tasks from multiple projects. It prevents
 * redundant API calls by using the caching system in Redux.
 */

import { useMemo } from 'react';
import { getRecentTasks } from '../features/tasks/taskSlice';
import useDataFetching from './useDataFetching';

/**
 * Custom hook for efficiently loading recent tasks across projects
 * This prevents redundant API calls by using the caching system in Redux
 *
 * @param {Object} options - Additional options
 * @param {number} options.cacheTimeout - How long to consider cached data fresh (ms)
 * @param {boolean} options.skipInitialFetch - Whether to skip the initial fetch
 * @param {boolean} options.backgroundRefresh - Whether to refresh in the background without blocking UI
 * @param {boolean} options.smartRefresh - Whether to apply smart comparison to prevent unnecessary updates
 * @returns {Object} Object containing { tasks, isLoading, error, refetchTasks }
 */
const useRecentTasks = (options = {}) => {
  const {
    cacheTimeout,
    skipInitialFetch,
    backgroundRefresh = true,
    smartRefresh = true,
  } = options;

  // Selector functions for the useDataFetching hook
  const selectTasks = useMemo(() => (state) => state.tasks.tasks, []);

  const selectLastFetched = useMemo(
    () => (state) => state.tasks.lastFetched,
    []
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
  } = useDataFetching({
    fetchAction: getRecentTasks,
    selectData: selectTasks,
    selectLastFetched: selectLastFetched,
    selectIsLoading: selectIsLoading,
    selectError: selectError,
    dependencies: [], // Only re-fetch on explicit refetch or cache timeout
    fetchParams: {}, // No specific params needed for recent tasks
    cacheTimeout,
    skipInitialFetch,
    backgroundRefresh,
    smartRefresh,
    idField: '_id', // Use _id as the identification field for comparison
  });

  return { tasks, isLoading, error, refetchTasks };
};

export default useRecentTasks;
