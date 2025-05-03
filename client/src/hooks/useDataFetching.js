/**
 * useDataFetching.js - Custom hook for efficient data fetching with caching
 *
 * This hook solves the problem of redundant API calls by implementing intelligent
 * caching with timestamp tracking. It works with the existing Redux store to:
 * 1. Track when data was last fetched
 * 2. Only fetch new data when necessary (cache is expired or forced)
 * 3. Provide a consistent interface for components
 * 4. Deduplicate simultaneous requests for the same data
 * 5. Prevent fetch storms during initial page load
 *
 * This significantly reduces server load and improves performance.
 */

import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

/**
 * Default cache timeout of 5 minutes in milliseconds
 * This determines how long fetched data is considered "fresh"
 */
const DEFAULT_CACHE_TIMEOUT = 5 * 60 * 1000;

/**
 * Request tracking object to deduplicate simultaneous API calls
 * Keys are fetch action types, values contain timestamps and promise references
 * This is now enhanced to include the actual promise for better deduplication
 */
const ongoingRequests = {};

/**
 * Global fetch count limiter to prevent fetch storms during initial page load
 * Acts as a rate limiter for API calls, allowing only a certain number in a time window
 */
const fetchRateLimiter = {
  fetchCount: 0,
  windowStart: Date.now(),
  windowSize: 2000, // 2 second window
  maxFetchesPerWindow: 5, // Max 5 fetches per 2 seconds

  /**
   * Check if we should allow another fetch based on rate limiting
   * @returns {boolean} Whether a new fetch should be allowed
   */
  canFetch() {
    const now = Date.now();

    // Reset window if it's expired
    if (now - this.windowStart > this.windowSize) {
      this.fetchCount = 0;
      this.windowStart = now;
    }

    // Allow fetch if we're under the limit
    return this.fetchCount < this.maxFetchesPerWindow;
  },

  /**
   * Register a fetch with the rate limiter
   */
  registerFetch() {
    this.fetchCount++;
  },
};

/**
 * Custom hook for efficiently fetching and caching data
 *
 * @param {Object} options - Configuration options for the data fetching
 * @param {Function} options.fetchAction - Redux thunk action creator (e.g., getProjects, getTasksForProject)
 * @param {Function} options.selectData - Selector function to get the data from Redux state
 * @param {Function} options.selectLastFetched - Selector function to get the last fetched timestamp
 * @param {Function} options.selectIsLoading - Selector function to get the loading state
 * @param {Function} options.selectError - Selector function to get any error state
 * @param {Array} options.dependencies - Dependencies array that triggers refetching (like react useEffect deps)
 * @param {Object} options.fetchParams - Parameters to pass to the fetch action
 * @param {number} options.cacheTimeout - Custom cache timeout in milliseconds (default: 5 minutes)
 * @param {boolean} options.skipInitialFetch - Whether to skip the initial fetch on mount
 * @param {boolean} options.priority - Higher priority requests skip the rate limiter
 * @returns {Object} Object containing { data, isLoading, error, refetch }
 */
const useDataFetching = ({
  fetchAction,
  selectData,
  selectLastFetched,
  selectIsLoading,
  selectError,
  dependencies = [],
  fetchParams = {},
  cacheTimeout = DEFAULT_CACHE_TIMEOUT,
  skipInitialFetch = false,
  priority = false,
}) => {
  const dispatch = useDispatch();

  // Select relevant data from Redux store
  const data = useSelector(selectData);
  const lastFetched = useSelector(selectLastFetched);
  const isLoading = useSelector(selectIsLoading);
  const error = useSelector(selectError);

  // Local state to track if we've performed an initial fetch
  const [hasInitiallyFetched, setHasInitiallyFetched] =
    useState(skipInitialFetch);

  // Get a stable reference to the action type for tracking
  const actionType = fetchAction.typePrefix || fetchAction.toString();

  /**
   * Determines if the cache is stale and new data should be fetched
   * A cache is considered stale if:
   * 1. No data has been fetched yet (lastFetched is null)
   * 2. The time since last fetch exceeds the cache timeout
   *
   * @returns {boolean} True if cache is stale and data should be refreshed
   */
  const isCacheStale = useCallback(() => {
    // If no timestamp exists, the cache is stale
    if (!lastFetched) return true;

    const now = Date.now();
    const timeSinceLastFetch = now - lastFetched;

    // Cache is stale if the time since last fetch exceeds timeout
    return timeSinceLastFetch > cacheTimeout;
  }, [lastFetched, cacheTimeout]);

  /**
   * Checks if there's already an ongoing request for this action type
   * This prevents duplicate API calls when multiple components request
   * the same data nearly simultaneously (e.g., on initial page load)
   *
   * @returns {Promise|null} The ongoing request promise if one exists, otherwise null
   */
  const getOngoingRequest = useCallback(() => {
    if (!ongoingRequests[actionType]) return null;

    const now = Date.now();
    // Request is considered ongoing if it started in the last 5 seconds
    // This window helps deduplicate near-simultaneous requests on initial page load
    if (now - ongoingRequests[actionType].timestamp < 5000) {
      return ongoingRequests[actionType].promise;
    }

    // Clean up stale entry
    delete ongoingRequests[actionType];
    return null;
  }, [actionType]);

  /**
   * Fetches data only if cache is stale or force refresh is requested
   * This is the main function that prevents redundant API calls
   *
   * @param {boolean} forceRefresh - Whether to bypass cache and force a refresh
   * @returns {Promise} The dispatch promise for chaining
   */
  const fetchData = useCallback(
    (forceRefresh = false) => {
      // Check if cache is stale or force refresh is requested
      if (forceRefresh || isCacheStale()) {
        // Check for existing request - return its promise if found
        const existingRequest = getOngoingRequest();
        if (!forceRefresh && existingRequest) {
          console.log(
            `Reusing existing request for ${actionType} - already in progress`
          );
          return existingRequest;
        }

        // Check rate limiting - skip low priority requests if rate limited
        if (!priority && !forceRefresh && !fetchRateLimiter.canFetch()) {
          console.log(
            `Rate limiting fetch for ${actionType} - too many requests in progress`
          );
          // Return a promise that resolves with current data
          return Promise.resolve(data);
        }

        // Register this fetch with the rate limiter
        if (!forceRefresh) {
          fetchRateLimiter.registerFetch();
        }

        console.log(
          `Fetching fresh data for ${actionType} - cache is stale or forced refresh`
        );

        // Create and store promise
        const fetchPromise = dispatch(
          fetchAction({
            ...fetchParams,
            forceRefresh,
            cacheTimeout,
          })
        );

        // Store the request in our tracking object
        ongoingRequests[actionType] = {
          timestamp: Date.now(),
          promise: fetchPromise,
        };

        // Clean up after request completes
        fetchPromise.finally(() => {
          // Remove request entry after a delay to catch any near-simultaneous requests
          setTimeout(() => {
            if (ongoingRequests[actionType]?.promise === fetchPromise) {
              delete ongoingRequests[actionType];
            }
          }, 2000);
        });

        return fetchPromise;
      } else {
        console.log(
          `Using cached data for ${actionType} - cache is still fresh`
        );
        // Return resolved promise for consistent interface
        return Promise.resolve(data);
      }
    },
    [
      dispatch,
      fetchAction,
      fetchParams,
      isCacheStale,
      cacheTimeout,
      getOngoingRequest,
      actionType,
      data,
      priority,
    ]
  );

  /**
   * Refetch function exposed to components
   * This gives components control to force a refresh when needed
   *
   * @param {boolean} forceRefresh - Whether to bypass cache and force a refresh
   * @returns {Promise} The dispatch promise
   */
  const refetch = useCallback(
    (forceRefresh = true) => {
      return fetchData(forceRefresh); // Default to force refresh
    },
    [fetchData]
  );

  /**
   * Effect to fetch data on initial render and when dependencies change
   * Implements the intelligent caching logic to prevent redundant calls
   */
  useEffect(() => {
    // Skip initial fetch if requested
    if (!hasInitiallyFetched) {
      setHasInitiallyFetched(true);
      if (skipInitialFetch) return;
    }

    fetchData(false); // Not forcing refresh, will check cache first

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, fetchAction]); // Include all dependencies that should trigger a refetch

  return { data, isLoading, error, refetch };
};

export default useDataFetching;
