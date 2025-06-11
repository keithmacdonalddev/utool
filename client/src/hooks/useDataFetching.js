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

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { hasCollectionChanged } from '../utils/objectUtils';
import { useRenderLoopDetection, useHookDebugger } from '../utils/hookSafety';

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
 * @param {boolean} options.enabled - Whether to enable data fetching (default: true)
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
  backgroundRefresh = false,
  smartRefresh = true, // New parameter to control smart data comparison
  idField = '_id', // ID field to use for comparison
  enabled = true, // Add enabled parameter
  // Phase 3 Step 2: Optimistic Updates
  enableOptimisticUpdates = false, // Enable optimistic update behavior
  optimisticMutations = {}, // Object containing optimistic update functions
}) => {
  const dispatch = useDispatch();

  // Global safety monitoring for development
  useRenderLoopDetection('useDataFetching', 15);
  // PERFORMANCE FIX: Simplified hook debugger to prevent re-render triggers
  useHookDebugger('useDataFetching', [], {
    enabled,
    actionType: fetchAction.typePrefix || fetchAction.toString(),
  });

  // PERFORMANCE FIX: Use selectors directly to prevent memoization overhead
  const data = useSelector(selectData);
  const lastFetched = useSelector(selectLastFetched);
  const isLoading = useSelector(selectIsLoading);
  const error = useSelector(selectError);

  // Local state to track if we've performed an initial fetch
  const [hasInitiallyFetched, setHasInitiallyFetched] =
    useState(skipInitialFetch);

  // ** RENDER LOOP FIX **
  // A ref to hold the isCacheStale function. This allows us to use the latest
  // version of the function inside fetchData without adding it to fetchData's
  // dependency array, which would create a new fetchData function on every render
  // and trigger the infinite loop.
  const isCacheStaleRef = useRef(null);

  // Phase 3 Step 2: Optimistic Updates state
  const [optimisticData, setOptimisticData] = useState(null);
  const [pendingOperations, setPendingOperations] = useState(new Set());
  const [backgroundRefreshState, setBackgroundRefreshState] = useState({
    isRefreshing: false,
    lastRefreshTime: null,
    refreshCount: 0,
  });

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

  // ** RENDER LOOP FIX **
  // Keep the ref updated with the latest version of the function.
  useEffect(() => {
    isCacheStaleRef.current = isCacheStale;
  }, [isCacheStale]);

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
   * @returns {Promise} The dispatch promise for chaining   */ const fetchData =
    useCallback(
      (forceRefresh = false) => {
        // DEBUG: Development-only fetchData call logging
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔍 [useDataFetching] fetchData called:`, {
            actionType,
            forceRefresh,
            data: data ? 'exists' : 'null',
            hasData: !!data,
            dataLength: Array.isArray(data) ? data.length : data ? 1 : 0,
            backgroundRefresh,
            isCacheStale: isCacheStaleRef.current(),
            timestamp: new Date().toISOString(),
          });
        } // Phase 3 Step 2: Enhanced background refresh with state tracking
        if (backgroundRefresh && data && data.length > 0 && !forceRefresh) {
          if (process.env.NODE_ENV === 'development') {
            console.log(
              `🔍 [useDataFetching] Background refresh path - returning existing data`
            );
          }
          // Still trigger the refresh in the background if needed
          if (isCacheStaleRef.current()) {
            setBackgroundRefreshState((prev) => ({
              isRefreshing: true,
              lastRefreshTime: Date.now(),
              refreshCount: prev.refreshCount + 1,
            }));
            setTimeout(() => {
              // CRITICAL FIX: Handle primitive fetchParams for background refresh too
              let actionPayload;
              if (fetchParams === null || fetchParams === undefined) {
                actionPayload = { forceRefresh: false, cacheTimeout };
              } else if (
                typeof fetchParams === 'object' &&
                !Array.isArray(fetchParams)
              ) {
                actionPayload = {
                  ...fetchParams,
                  forceRefresh: false,
                  cacheTimeout,
                };
              } else {
                // fetchParams is a primitive - pass it directly
                actionPayload = fetchParams;
              }

              dispatch(fetchAction(actionPayload)).finally(() => {
                setBackgroundRefreshState((prev) => ({
                  ...prev,
                  isRefreshing: false,
                }));
              });
            }, 0);
          }

          // Immediately return existing data without waiting for the refresh
          return Promise.resolve(data);
        }

        // Check if cache is stale or force refresh is requested
        if (forceRefresh || isCacheStaleRef.current()) {
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

          // CRITICAL FIX: Handle primitive fetchParams (strings, numbers) vs objects
          // For actions like fetchProjectById that expect a primitive parameter,
          // don't spread fetchParams into an object
          let actionPayload;
          if (fetchParams === null || fetchParams === undefined) {
            // No params needed
            actionPayload = {
              forceRefresh,
              cacheTimeout,
              smartRefresh,
              idField,
            };
          } else if (
            typeof fetchParams === 'object' &&
            !Array.isArray(fetchParams)
          ) {
            // fetchParams is an object - spread it with other options
            actionPayload = {
              ...fetchParams,
              forceRefresh,
              cacheTimeout,
              smartRefresh,
              idField,
            };
          } else {
            // fetchParams is a primitive (string, number, etc.) - pass it directly
            // This is the case for fetchProjectById(projectId)
            actionPayload = fetchParams;
          } // DEBUG: Development-only action dispatch logging
          if (process.env.NODE_ENV === 'development') {
            console.log(`🔍 [useDataFetching] Dispatching action:`, {
              actionType,
              fetchParams,
              fetchParamsType: typeof fetchParams,
              actionPayload,
              actionPayloadType: typeof actionPayload,
              timestamp: new Date().toISOString(),
            });
          }

          // Create and store promise
          const fetchPromise = dispatch(fetchAction(actionPayload));

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
            `Using cached data for ${actionType} - cache is still fresh, ensuring Redux state is updated.`
          ); // **THE FIX**: Always dispatch the action. The thunk itself is smart enough
          // to return cached data immediately without an API call. This ensures the
          // Redux Toolkit lifecycle completes and the `.fulfilled` action is dispatched,
          // which will in turn update the `currentProject` state via the reducer.

          // CRITICAL FIX: Handle primitive fetchParams for cached path too
          let actionPayload;
          if (fetchParams === null || fetchParams === undefined) {
            actionPayload = { forceRefresh: false };
          } else if (
            typeof fetchParams === 'object' &&
            !Array.isArray(fetchParams)
          ) {
            actionPayload = { ...fetchParams, forceRefresh: false };
          } else {
            // fetchParams is a primitive - pass it directly
            actionPayload = fetchParams;
          }

          return dispatch(fetchAction(actionPayload));
        }
      },
      [
        dispatch,
        fetchAction,
        JSON.stringify(fetchParams), // PERFORMANCE FIX: Stringify for stable comparison
        actionType,
        getOngoingRequest,
        priority,
        backgroundRefresh,
        cacheTimeout,
        smartRefresh,
        idField,
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
   */ useEffect(() => {
    // DEBUG: Development-only useEffect trigger logging
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 [useDataFetching] useEffect triggered:`, {
        enabled,
        hasInitiallyFetched,
        skipInitialFetch,
        actionType,
        fetchParams: JSON.stringify(fetchParams),
        timestamp: new Date().toISOString(),
      });
    }

    // Don't fetch if disabled
    if (!enabled) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 [useDataFetching] Fetch skipped - disabled`);
      }
      return;
    }

    // Skip initial fetch if requested
    if (!hasInitiallyFetched) {
      setHasInitiallyFetched(true);
      if (skipInitialFetch) {
        if (process.env.NODE_ENV === 'development') {
          console.log(
            `🔍 [useDataFetching] Initial fetch skipped per configuration`
          );
        }
        return;
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 [useDataFetching] Calling fetchData...`);
    }
    fetchData(false); // Not forcing refresh, will check cache first

    // PERFORMANCE FIX: Depend on stable fetchData reference
  }, [enabled, fetchData]);

  // Phase 3 Step 2: Optimistic Update Functions
  const applyOptimisticUpdate = useCallback(
    (operationId, updateFunction) => {
      if (!enableOptimisticUpdates) return Promise.resolve();

      // Apply optimistic update immediately
      const currentData = optimisticData || data;
      const updatedData = updateFunction(currentData);

      setOptimisticData(updatedData);
      setPendingOperations((prev) => new Set([...prev, operationId]));

      // Return a promise that resolves when the real operation completes
      return new Promise((resolve, reject) => {
        // Simulate API delay for demo purposes
        setTimeout(() => {
          // In real implementation, this would be tied to actual API completion
          setPendingOperations((prev) => {
            const newSet = new Set(prev);
            newSet.delete(operationId);
            return newSet;
          });

          // If no more pending operations, clear optimistic data
          if (pendingOperations.size <= 1) {
            setOptimisticData(null);
          }

          resolve(updatedData);
        }, 1000);
      });
    },
    [enableOptimisticUpdates, optimisticData, data, pendingOperations]
  );

  const rollbackOptimisticUpdate = useCallback(
    (operationId) => {
      setPendingOperations((prev) => {
        const newSet = new Set(prev);
        newSet.delete(operationId);
        return newSet;
      });

      // If no more pending operations, clear optimistic data
      if (pendingOperations.size <= 1) {
        setOptimisticData(null);
      }
    },
    [pendingOperations]
  );

  // Enhanced background refresh with state tracking
  const triggerBackgroundRefresh = useCallback(() => {
    if (!backgroundRefresh) return;

    setBackgroundRefreshState((prev) => ({
      isRefreshing: true,
      lastRefreshTime: Date.now(),
      refreshCount: prev.refreshCount + 1,
    }));

    fetchData(false).finally(() => {
      setBackgroundRefreshState((prev) => ({
        ...prev,
        isRefreshing: false,
      }));
    });
  }, [backgroundRefresh, fetchData]);

  // Determine final data to return (optimistic data takes precedence)
  const finalData = useMemo(() => {
    return optimisticData || data;
  }, [optimisticData, data]);

  // Enhanced return object with Phase 3 Step 2 features
  return {
    data: finalData,
    isLoading,
    error,
    refetch,
    // Phase 3 Step 2: Enhanced features
    backgroundRefreshState,
    applyOptimisticUpdate,
    rollbackOptimisticUpdate,
    triggerBackgroundRefresh,
    pendingOperations: Array.from(pendingOperations),
    hasOptimisticUpdates: optimisticData !== null,
  };
};

export default useDataFetching;
