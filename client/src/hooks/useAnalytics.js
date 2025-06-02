import { useState, useEffect, useCallback, useRef } from 'react';
import analyticsService from '../services/analyticsService';

/**
 * useAnalytics Hook
 *
 * Custom hook for managing analytics data with caching, error handling,
 * and real-time updates. Provides a consistent interface for all analytics
 * data needs throughout the admin dashboard.
 *
 * Part of Milestone 2: Analytics Dashboard & User Insights
 *
 * @param {Object} options - Hook configuration options
 * @param {boolean} options.realTime - Enable real-time data updates
 * @param {number} options.refreshInterval - Refresh interval in seconds (default: 30)
 * @param {boolean} options.autoRefresh - Enable automatic data refresh
 * @returns {Object} Analytics data and management functions
 */
const useAnalytics = (options = {}) => {
  const {
    realTime = false,
    refreshInterval = 30,
    autoRefresh = true,
  } = options;

  // State management
  const [data, setData] = useState({
    userActivity: [],
    realTimeData: null,
    performanceMetrics: null,
    guestAnalytics: null,
    userEngagement: null,
    contentAnalytics: null,
  });

  const [loading, setLoading] = useState({
    userActivity: false,
    realTimeData: false,
    performanceMetrics: false,
    guestAnalytics: false,
    userEngagement: false,
    contentAnalytics: false,
  });

  const [errors, setErrors] = useState({
    userActivity: null,
    realTimeData: null,
    performanceMetrics: null,
    guestAnalytics: null,
    userEngagement: null,
    contentAnalytics: null,
  });

  // Refs for managing intervals and cleanup
  const intervalsRef = useRef(new Map());
  const mountedRef = useRef(true);

  /**
   * Generic error handler for analytics operations
   * @param {string} operation - The operation that failed
   * @param {Error} error - The error object
   */
  const handleError = useCallback((operation, error) => {
    console.error(`Analytics ${operation} error:`, error);

    if (mountedRef.current) {
      setErrors((prev) => ({
        ...prev,
        [operation]: error.message || 'An error occurred while fetching data',
      }));

      setLoading((prev) => ({
        ...prev,
        [operation]: false,
      }));
    }
  }, []);

  /**
   * Clear error for a specific operation
   * @param {string} operation - The operation to clear error for
   */
  const clearError = useCallback((operation) => {
    setErrors((prev) => ({
      ...prev,
      [operation]: null,
    }));
  }, []);

  /**
   * Set loading state for a specific operation
   * @param {string} operation - The operation to set loading for
   * @param {boolean} isLoading - Loading state
   */
  const setOperationLoading = useCallback((operation, isLoading) => {
    if (mountedRef.current) {
      setLoading((prev) => ({
        ...prev,
        [operation]: isLoading,
      }));
    }
  }, []);

  /**
   * Update data for a specific operation
   * @param {string} operation - The operation to update data for
   * @param {*} newData - The new data
   */
  const updateData = useCallback((operation, newData) => {
    if (mountedRef.current) {
      setData((prev) => ({
        ...prev,
        [operation]: newData,
      }));
    }
  }, []);

  /**
   * Fetch user activity data
   * @param {Object} queryOptions - Query options for the request
   */
  const fetchUserActivity = useCallback(
    async (queryOptions = {}) => {
      const operation = 'userActivity';
      setOperationLoading(operation, true);
      clearError(operation);

      try {
        const result = await analyticsService.getUserActivity(queryOptions);
        updateData(operation, result);
      } catch (error) {
        handleError(operation, error);
      } finally {
        setOperationLoading(operation, false);
      }
    },
    [handleError, clearError, setOperationLoading, updateData]
  );

  /**
   * Fetch real-time data
   */
  const fetchRealTimeData = useCallback(async () => {
    const operation = 'realTimeData';
    setOperationLoading(operation, true);
    clearError(operation);

    try {
      const result = await analyticsService.getRealTimeData();
      updateData(operation, result);
    } catch (error) {
      handleError(operation, error);
    } finally {
      setOperationLoading(operation, false);
    }
  }, [handleError, clearError, setOperationLoading, updateData]);

  /**
   * Fetch performance metrics
   */
  const fetchPerformanceMetrics = useCallback(async () => {
    const operation = 'performanceMetrics';
    setOperationLoading(operation, true);
    clearError(operation);

    try {
      const result = await analyticsService.getPerformanceMetrics();
      updateData(operation, result);
    } catch (error) {
      handleError(operation, error);
    } finally {
      setOperationLoading(operation, false);
    }
  }, [handleError, clearError, setOperationLoading, updateData]);

  /**
   * Fetch guest analytics
   * @param {Object} queryOptions - Query options for the request
   */
  const fetchGuestAnalytics = useCallback(
    async (queryOptions = {}) => {
      const operation = 'guestAnalytics';
      setOperationLoading(operation, true);
      clearError(operation);

      try {
        const result = await analyticsService.getGuestAnalytics(queryOptions);
        updateData(operation, result);
      } catch (error) {
        handleError(operation, error);
      } finally {
        setOperationLoading(operation, false);
      }
    },
    [handleError, clearError, setOperationLoading, updateData]
  );

  /**
   * Fetch user engagement metrics
   */
  const fetchUserEngagement = useCallback(async () => {
    const operation = 'userEngagement';
    setOperationLoading(operation, true);
    clearError(operation);

    try {
      const result = await analyticsService.getUserEngagement();
      updateData(operation, result);
    } catch (error) {
      handleError(operation, error);
    } finally {
      setOperationLoading(operation, false);
    }
  }, [handleError, clearError, setOperationLoading, updateData]);

  /**
   * Fetch content analytics
   */
  const fetchContentAnalytics = useCallback(async () => {
    const operation = 'contentAnalytics';
    setOperationLoading(operation, true);
    clearError(operation);

    try {
      const result = await analyticsService.getContentAnalytics();
      updateData(operation, result);
    } catch (error) {
      handleError(operation, error);
    } finally {
      setOperationLoading(operation, false);
    }
  }, [handleError, clearError, setOperationLoading, updateData]);

  /**
   * Refresh all analytics data
   */
  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchUserActivity(),
      fetchRealTimeData(),
      fetchPerformanceMetrics(),
      fetchGuestAnalytics(),
      fetchUserEngagement(),
      fetchContentAnalytics(),
    ]);
  }, [
    fetchUserActivity,
    fetchRealTimeData,
    fetchPerformanceMetrics,
    fetchGuestAnalytics,
    fetchUserEngagement,
    fetchContentAnalytics,
  ]);

  /**
   * Set up automatic refresh interval for a specific operation
   * @param {string} operation - The operation to set up interval for
   * @param {Function} fetchFunction - The fetch function to call
   * @param {number} interval - Interval in seconds
   */
  const setupInterval = useCallback((operation, fetchFunction, interval) => {
    // Clear existing interval
    if (intervalsRef.current.has(operation)) {
      clearInterval(intervalsRef.current.get(operation));
    }

    // Set up new interval
    const intervalId = setInterval(() => {
      if (mountedRef.current) {
        fetchFunction();
      }
    }, interval * 1000);

    intervalsRef.current.set(operation, intervalId);
  }, []);

  /**
   * Clear interval for a specific operation
   * @param {string} operation - The operation to clear interval for
   */
  const clearInterval = useCallback((operation) => {
    if (intervalsRef.current.has(operation)) {
      clearInterval(intervalsRef.current.get(operation));
      intervalsRef.current.delete(operation);
    }
  }, []);

  // Initial data fetch and auto-refresh setup
  useEffect(() => {
    // Initial fetch of all data
    refreshAll();

    // Set up auto-refresh for real-time data if enabled
    if (realTime && autoRefresh) {
      setupInterval('realTimeData', fetchRealTimeData, 5); // Update every 5 seconds
    }

    // Set up auto-refresh for other data if enabled
    if (autoRefresh) {
      setupInterval(
        'performanceMetrics',
        fetchPerformanceMetrics,
        refreshInterval
      );
      setupInterval('userActivity', fetchUserActivity, refreshInterval * 2); // Less frequent
    }

    // Cleanup function
    return () => {
      mountedRef.current = false;

      // Clear all intervals
      intervalsRef.current.forEach((intervalId) => {
        clearInterval(intervalId);
      });
      intervalsRef.current.clear();
    };
  }, [
    realTime,
    autoRefresh,
    refreshInterval,
    refreshAll,
    fetchRealTimeData,
    fetchPerformanceMetrics,
    fetchUserActivity,
    setupInterval,
  ]);

  // Calculated values
  const isLoading = Object.values(loading).some(Boolean);
  const hasErrors = Object.values(errors).some(Boolean);
  const lastUpdated = new Date().toLocaleTimeString();

  return {
    // Data
    data,

    // Loading states
    loading,
    isLoading,

    // Error states
    errors,
    hasErrors,

    // Actions
    fetchUserActivity,
    fetchRealTimeData,
    fetchPerformanceMetrics,
    fetchGuestAnalytics,
    fetchUserEngagement,
    fetchContentAnalytics,
    refreshAll,
    clearError,

    // Metadata
    lastUpdated,
  };
};

export default useAnalytics;
