/**
 * useRecentTasks.js - Custom hook for efficiently fetching recent tasks across projects
 *
 * This hook leverages our generic useDataFetching hook to provide a simple interface
 * for components that need to load recent tasks from multiple projects. It prevents
 * redundant API calls by using the caching system in Redux.
 *
 * Enhanced to support guest users by returning data from the guest sandbox when the user is a guest.
 */

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { getRecentTasks } from '../features/tasks/taskSlice';
import { selectGuestItemsByType } from '../features/guestSandbox/guestSandboxSlice';
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

  // Memoized selectors to prevent Redux rerender warnings
  const selectAuth = useMemo(() => (state) => state.auth, []);
  const selectGuestTasks = useMemo(
    () => (state) => selectGuestItemsByType(state, 'tasks'),
    []
  );

  // Get auth state to check if user is a guest
  const { isGuest } = useSelector(selectAuth);

  // Get guest task data directly if the user is a guest
  const guestTasks = useSelector(selectGuestTasks);

  // Format guest tasks to match API structure
  const formattedGuestTasks = useMemo(() => {
    if (!isGuest) return [];
    return (
      guestTasks
        .map((task) => ({
          ...task.data,
          _id: task.id,
          id: task.id,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
        }))
        // Sort by creation date, most recent first (for "recent tasks")
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        // Take most recent 10 items
        .slice(0, 10)
    );
  }, [isGuest, guestTasks]);
  // Selector functions for the useDataFetching hook (stable references)
  const selectTasks = useMemo(() => (state) => state.tasks.tasks, []);

  const selectLastFetched = useMemo(
    () => (state) => state.tasks.lastFetched,
    []
  );

  const selectIsLoading = useMemo(() => (state) => state.tasks.isLoading, []);

  // PERFORMANCE FIX: Simplified error selector to prevent dependency issues
  const selectError = useMemo(
    () => (state) => state.tasks.isError ? state.tasks.message : null,
    []
  );

  // Skip API fetch if user is a guest - we'll use the guest tasks directly
  const shouldSkipFetch = isGuest || skipInitialFetch;
  // Use our generic hook with task-specific selectors
  const {
    data: regularTasks,
    isLoading,
    error,
    refetch: refetchTasks,
    backgroundRefreshState,
  } = useDataFetching({
    fetchAction: getRecentTasks,
    selectData: selectTasks,
    selectLastFetched: selectLastFetched,
    selectIsLoading: selectIsLoading,
    selectError: selectError,
    dependencies: [], // Only re-fetch on explicit refetch or cache timeout
    fetchParams: {}, // No specific params needed for recent tasks
    cacheTimeout,
    skipInitialFetch: shouldSkipFetch, // Skip if guest user
    backgroundRefresh: isGuest ? false : backgroundRefresh, // No background refresh for guests
    smartRefresh,
    idField: '_id', // Use _id as the identification field for comparison
  });

  // Combine the results - for guests, use formattedGuestTasks; for regular users, use the API data
  const tasks = isGuest ? formattedGuestTasks : regularTasks;

  return {
    tasks,
    isLoading: isGuest ? false : isLoading, // No loading state for guests
    error,
    refetchTasks,
    backgroundRefreshState,
  };
};

export default useRecentTasks;
