import { useState, useEffect, useCallback, useRef } from 'react';
import systemHealthService from '../services/systemHealthService';

/**
 * useSystemHealth Hook
 *
 * Custom hook for managing system health monitoring data with real-time updates,
 * caching, error handling, and automated alerting. Provides a centralized interface
 * for all system monitoring needs throughout the admin dashboard.
 *
 * Part of Milestone 3: System Health Monitoring
 *
 * @param {Object} options - Hook configuration options
 * @param {boolean} options.realTime - Enable real-time data updates (default: true)
 * @param {number} options.refreshInterval - Refresh interval in seconds (default: 10)
 * @param {boolean} options.autoRefresh - Enable automatic data refresh (default: true)
 * @param {boolean} options.enableAlerts - Enable alert monitoring (default: true)
 * @returns {Object} System health data and management functions
 */
const useSystemHealth = (options = {}) => {
  const {
    realTime = true,
    refreshInterval = 10,
    autoRefresh = true,
    enableAlerts = true,
  } = options;

  // State management for all system health data
  const [data, setData] = useState({
    systemMetrics: null,
    serviceStatus: [],
    databaseHealth: null,
    applicationMetrics: null,
    securityMetrics: null,
    historicalData: [],
    alerts: [],
    healthSummary: null,
  });

  // Loading states for each data type
  const [loading, setLoading] = useState({
    systemMetrics: false,
    serviceStatus: false,
    databaseHealth: false,
    applicationMetrics: false,
    securityMetrics: false,
    historicalData: false,
    alerts: false,
    healthSummary: false,
  });

  // Error states for each operation
  const [errors, setErrors] = useState({
    systemMetrics: null,
    serviceStatus: null,
    databaseHealth: null,
    applicationMetrics: null,
    securityMetrics: null,
    historicalData: null,
    alerts: null,
    healthSummary: null,
  });

  // Refs for managing intervals and component lifecycle
  const intervalsRef = useRef(new Map());
  const mountedRef = useRef(true);
  const lastFetchRef = useRef(new Map());

  /**
   * Generic error handler for system health operations
   * @param {string} operation - The operation that failed
   * @param {Error} error - The error object
   */
  const handleError = useCallback((operation, error) => {
    console.error(`System Health ${operation} error:`, error);

    if (mountedRef.current) {
      setErrors((prev) => ({
        ...prev,
        [operation]:
          error.message || 'An error occurred while fetching system data',
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
      lastFetchRef.current.set(operation, new Date());
    }
  }, []);

  /**
   * Fetch system performance metrics
   */
  const fetchSystemMetrics = useCallback(async () => {
    const operation = 'systemMetrics';
    setOperationLoading(operation, true);
    clearError(operation);

    try {
      const result = await systemHealthService.getSystemMetrics();
      updateData(operation, result);
    } catch (error) {
      handleError(operation, error);
    } finally {
      setOperationLoading(operation, false);
    }
  }, [handleError, clearError, setOperationLoading, updateData]);

  /**
   * Fetch service status information
   */
  const fetchServiceStatus = useCallback(async () => {
    const operation = 'serviceStatus';
    setOperationLoading(operation, true);
    clearError(operation);

    try {
      const result = await systemHealthService.getServiceStatus();
      updateData(operation, result);
    } catch (error) {
      handleError(operation, error);
    } finally {
      setOperationLoading(operation, false);
    }
  }, [handleError, clearError, setOperationLoading, updateData]);

  /**
   * Fetch database health metrics
   */
  const fetchDatabaseHealth = useCallback(async () => {
    const operation = 'databaseHealth';
    setOperationLoading(operation, true);
    clearError(operation);

    try {
      const result = await systemHealthService.getDatabaseHealth();
      updateData(operation, result);
    } catch (error) {
      handleError(operation, error);
    } finally {
      setOperationLoading(operation, false);
    }
  }, [handleError, clearError, setOperationLoading, updateData]);

  /**
   * Fetch application performance metrics
   */
  const fetchApplicationMetrics = useCallback(async () => {
    const operation = 'applicationMetrics';
    setOperationLoading(operation, true);
    clearError(operation);

    try {
      const result = await systemHealthService.getApplicationMetrics();
      updateData(operation, result);
    } catch (error) {
      handleError(operation, error);
    } finally {
      setOperationLoading(operation, false);
    }
  }, [handleError, clearError, setOperationLoading, updateData]);

  /**
   * Fetch security monitoring data
   */
  const fetchSecurityMetrics = useCallback(async () => {
    const operation = 'securityMetrics';
    setOperationLoading(operation, true);
    clearError(operation);

    try {
      const result = await systemHealthService.getSecurityMetrics();
      updateData(operation, result);
    } catch (error) {
      handleError(operation, error);
    } finally {
      setOperationLoading(operation, false);
    }
  }, [handleError, clearError, setOperationLoading, updateData]);

  /**
   * Fetch historical performance data
   * @param {Object} queryOptions - Query options for historical data
   */
  const fetchHistoricalData = useCallback(
    async (queryOptions = { hours: 24 }) => {
      const operation = 'historicalData';
      setOperationLoading(operation, true);
      clearError(operation);

      try {
        const result = await systemHealthService.getHistoricalData(
          queryOptions
        );
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
   * Fetch system alerts
   */
  const fetchAlerts = useCallback(async () => {
    const operation = 'alerts';
    setOperationLoading(operation, true);
    clearError(operation);

    try {
      const result = await systemHealthService.getSystemAlerts();
      updateData(operation, result);
    } catch (error) {
      handleError(operation, error);
    } finally {
      setOperationLoading(operation, false);
    }
  }, [handleError, clearError, setOperationLoading, updateData]);

  /**
   * Fetch health summary
   */
  const fetchHealthSummary = useCallback(async () => {
    const operation = 'healthSummary';
    setOperationLoading(operation, true);
    clearError(operation);

    try {
      const result = await systemHealthService.getHealthSummary();
      updateData(operation, result);
    } catch (error) {
      handleError(operation, error);
    } finally {
      setOperationLoading(operation, false);
    }
  }, [handleError, clearError, setOperationLoading, updateData]);

  /**
   * Refresh all critical system data (for real-time monitoring)
   */
  const refreshCriticalData = useCallback(async () => {
    await Promise.all(
      [
        fetchSystemMetrics(),
        fetchServiceStatus(),
        fetchDatabaseHealth(),
        fetchApplicationMetrics(),
        enableAlerts && fetchAlerts(),
        fetchHealthSummary(),
      ].filter(Boolean)
    );
  }, [
    fetchSystemMetrics,
    fetchServiceStatus,
    fetchDatabaseHealth,
    fetchApplicationMetrics,
    fetchAlerts,
    fetchHealthSummary,
    enableAlerts,
  ]);

  /**
   * Refresh all system health data
   */
  const refreshAll = useCallback(async () => {
    await Promise.all(
      [
        fetchSystemMetrics(),
        fetchServiceStatus(),
        fetchDatabaseHealth(),
        fetchApplicationMetrics(),
        fetchSecurityMetrics(),
        fetchHistoricalData(),
        enableAlerts && fetchAlerts(),
        fetchHealthSummary(),
      ].filter(Boolean)
    );
  }, [
    fetchSystemMetrics,
    fetchServiceStatus,
    fetchDatabaseHealth,
    fetchApplicationMetrics,
    fetchSecurityMetrics,
    fetchHistoricalData,
    fetchAlerts,
    fetchHealthSummary,
    enableAlerts,
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
  const clearIntervalForOperation = useCallback((operation) => {
    if (intervalsRef.current.has(operation)) {
      clearInterval(intervalsRef.current.get(operation));
      intervalsRef.current.delete(operation);
    }
  }, []);

  /**
   * Get critical alerts (high and critical severity)
   */
  const getCriticalAlerts = useCallback(() => {
    return data.alerts.filter(
      (alert) => alert.severity === 'critical' || alert.severity === 'warning'
    );
  }, [data.alerts]);

  /**
   * Get overall system status based on current data
   */
  const getOverallStatus = useCallback(() => {
    if (!data.healthSummary) return 'unknown';

    const criticalAlerts = getCriticalAlerts();
    const criticalServices = data.serviceStatus.filter(
      (s) => s.status === 'error'
    ).length;

    if (criticalAlerts.length > 0 || criticalServices > 0) {
      return 'critical';
    }

    if (data.healthSummary.score < 70) {
      return 'warning';
    }

    return 'healthy';
  }, [data.healthSummary, data.serviceStatus, getCriticalAlerts]);

  // Initial data fetch and auto-refresh setup
  useEffect(() => {
    // Initial fetch of all data
    refreshAll();

    // Set up auto-refresh for real-time data if enabled
    if (realTime && autoRefresh) {
      // Critical system data every 10 seconds
      setupInterval('critical', refreshCriticalData, refreshInterval);

      // Security data every 30 seconds
      setupInterval('security', fetchSecurityMetrics, 30);

      // Historical data every 5 minutes
      setupInterval('historical', fetchHistoricalData, 300);
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
    refreshCriticalData,
    fetchSecurityMetrics,
    fetchHistoricalData,
    setupInterval,
  ]);

  // Calculated values
  const isLoading = Object.values(loading).some(Boolean);
  const hasErrors = Object.values(errors).some(Boolean);
  const lastUpdated = new Date().toLocaleTimeString();
  const criticalAlerts = getCriticalAlerts();
  const overallStatus = getOverallStatus();

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
    fetchSystemMetrics,
    fetchServiceStatus,
    fetchDatabaseHealth,
    fetchApplicationMetrics,
    fetchSecurityMetrics,
    fetchHistoricalData,
    fetchAlerts,
    fetchHealthSummary,
    refreshCriticalData,
    refreshAll,
    clearError,

    // Derived values
    criticalAlerts,
    overallStatus,
    lastUpdated,

    // Utilities
    getCriticalAlerts,
    getOverallStatus,
  };
};

export default useSystemHealth;
