/**
 * useKbArticles.js - Custom hook for efficiently fetching knowledge base articles
 *
 * This hook leverages our generic useDataFetching hook to provide a simple interface
 * for components that need to load KB articles. It prevents redundant API calls by
 * using the caching system in Redux.
 */

import { useMemo } from 'react';
import { getKbArticles } from '../features/kb/kbSlice';
import useDataFetching from './useDataFetching';

/**
 * Custom hook for efficiently loading KB articles with caching
 * This prevents redundant API calls when navigating between pages
 *
 * @param {Object} options - Additional options
 * @param {number} options.cacheTimeout - How long to consider cached data fresh (ms)
 * @param {boolean} options.skipInitialFetch - Whether to skip the initial fetch
 * @param {boolean} options.backgroundRefresh - Whether to refresh in background while showing cached data
 * @param {boolean} options.smartRefresh - Whether to apply smart comparison for state updates
 * @param {Object} options.queryParams - Optional query parameters (limit, sort, etc.)
 * @returns {Object} Object containing { articles, isLoading, error, refetchArticles }
 */
const useKbArticles = (options = {}) => {
  const {
    cacheTimeout,
    skipInitialFetch,
    backgroundRefresh = true,
    smartRefresh = true,
    queryParams = {},
  } = options;

  // Selector functions for the useDataFetching hook
  const selectArticles = useMemo(() => (state) => state.kb.articles, []);

  const selectLastFetched = useMemo(() => (state) => state.kb.lastFetched, []);

  const selectIsLoading = useMemo(() => (state) => state.kb.isLoading, []);

  const selectError = useMemo(
    () => (state) => state.kb.isError ? state.kb.message : null,
    []
  );

  // Use our generic hook with KB-specific selectors
  const {
    data: articles,
    isLoading,
    error,
    refetch: refetchArticles,
  } = useDataFetching({
    fetchAction: getKbArticles,
    selectData: selectArticles,
    selectLastFetched: selectLastFetched,
    selectIsLoading: selectIsLoading,
    selectError: selectError,
    dependencies: [JSON.stringify(queryParams)], // Re-fetch if query params change
    fetchParams: queryParams,
    cacheTimeout,
    skipInitialFetch,
    backgroundRefresh,
    smartRefresh,
    idField: '_id', // Use _id as the identification field for comparison
  });

  return { articles, isLoading, error, refetchArticles };
};

export default useKbArticles;
