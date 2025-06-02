import { useState, useEffect, useCallback, useRef } from 'react';
import batchOperationsService, {
  BATCH_STATUS,
} from '../services/batchOperationsService';

/**
 * useBatchOperations Hook
 *
 * Custom hook for managing batch operations with real-time progress tracking,
 * selection management, and comprehensive error handling. Provides a centralized
 * interface for all batch operation needs throughout the admin interface.
 *
 * Part of Milestone 4: Batch Operations & User Management
 *
 * @param {Object} options - Hook configuration options
 * @param {boolean} options.autoRefresh - Enable automatic refresh of active operations
 * @param {number} options.refreshInterval - Refresh interval in seconds
 * @param {boolean} options.enableNotifications - Enable toast notifications for operations
 * @returns {Object} Batch operations data and management functions
 */
const useBatchOperations = (options = {}) => {
  const {
    autoRefresh = true,
    refreshInterval = 5,
    enableNotifications = true,
  } = options;

  // State management for batch operations
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);

  // Active operations state
  const [activeOperations, setActiveOperations] = useState(new Map());
  const [operationHistory, setOperationHistory] = useState([]);
  const [systemStats, setSystemStats] = useState(null);

  // UI state management
  const [loading, setLoading] = useState({
    operations: false,
    history: false,
    systemStats: false,
  });

  const [errors, setErrors] = useState({
    operations: null,
    history: null,
    systemStats: null,
  });

  // Refs for managing intervals and component lifecycle
  const refreshIntervalRef = useRef(null);
  const mountedRef = useRef(true);
  const progressCallbacksRef = useRef(new Map());

  /**
   * Generic error handler for batch operations
   * @param {string} operation - The operation that failed
   * @param {Error} error - The error object
   */
  const handleError = useCallback((operation, error) => {
    console.error(`Batch operation ${operation} error:`, error);

    if (mountedRef.current) {
      setErrors((prev) => ({
        ...prev,
        [operation]: error.message || 'An error occurred during the operation',
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
   * Selection management functions
   */
  const selectionFunctions = {
    /**
     * Toggle selection of a single item
     * @param {string} itemId - ID of item to toggle
     */
    toggleSelection: useCallback((itemId) => {
      setSelectedItems((prev) => {
        const newSelection = new Set(prev);
        if (newSelection.has(itemId)) {
          newSelection.delete(itemId);
        } else {
          newSelection.add(itemId);
        }
        return newSelection;
      });
    }, []),

    /**
     * Select all items from a provided list
     * @param {Array} items - Array of items to select
     */
    selectAllItems: useCallback((items) => {
      const itemIds = items.map((item) => item._id || item.id);
      setSelectedItems(new Set(itemIds));
      setSelectAll(true);
    }, []),

    /**
     * Clear all selections
     */
    clearSelection: useCallback(() => {
      setSelectedItems(new Set());
      setSelectAll(false);
    }, []),

    /**
     * Get currently selected items as array
     */
    getSelectedItems: useCallback(() => {
      return Array.from(selectedItems);
    }, [selectedItems]),

    /**
     * Check if item is selected
     * @param {string} itemId - ID of item to check
     */
    isSelected: useCallback(
      (itemId) => {
        return selectedItems.has(itemId);
      },
      [selectedItems]
    ),

    /**
     * Toggle selection mode
     */
    toggleSelectionMode: useCallback(() => {
      setSelectionMode((prev) => !prev);
      if (selectionMode) {
        // Clear selections when exiting selection mode
        setSelectedItems(new Set());
        setSelectAll(false);
      }
    }, [selectionMode]),
  };

  /**
   * Fetch active operations
   */
  const fetchActiveOperations = useCallback(async () => {
    setOperationLoading('operations', true);
    clearError('operations');

    try {
      const operations = await batchOperationsService.getActiveOperations();

      if (mountedRef.current) {
        const operationsMap = new Map();
        operations.forEach((op) => operationsMap.set(op.operationId, op));
        setActiveOperations(operationsMap);
      }
    } catch (error) {
      handleError('operations', error);
    } finally {
      setOperationLoading('operations', false);
    }
  }, [handleError, clearError, setOperationLoading]);

  /**
   * Fetch operation history
   */
  const fetchOperationHistory = useCallback(
    async (options = {}) => {
      setOperationLoading('history', true);
      clearError('history');

      try {
        const result = await batchOperationsService.getOperationHistory(
          options
        );

        if (mountedRef.current) {
          setOperationHistory(result.operations);
        }
      } catch (error) {
        handleError('history', error);
      } finally {
        setOperationLoading('history', false);
      }
    },
    [handleError, clearError, setOperationLoading]
  );

  /**
   * Fetch system statistics
   */
  const fetchSystemStats = useCallback(async () => {
    setOperationLoading('systemStats', true);
    clearError('systemStats');

    try {
      const stats = await batchOperationsService.getSystemStatistics();

      if (mountedRef.current) {
        setSystemStats(stats);
      }
    } catch (error) {
      handleError('systemStats', error);
    } finally {
      setOperationLoading('systemStats', false);
    }
  }, [handleError, clearError, setOperationLoading]);

  /**
   * Progress callback handler for operations
   * @param {string} operationId - Operation ID
   * @param {Object} operation - Updated operation data
   */
  const handleOperationProgress = useCallback((operationId, operation) => {
    if (mountedRef.current) {
      setActiveOperations((prev) => {
        const updated = new Map(prev);
        updated.set(operationId, operation);
        return updated;
      });
    }
  }, []);

  /**
   * User management batch operations
   */
  const userOperations = {
    /**
     * Bulk update user roles
     * @param {Array} userIds - Array of user IDs
     * @param {string} newRole - New role to assign
     */
    bulkUpdateRoles: useCallback(
      async (userIds, newRole) => {
        try {
          const result = await batchOperationsService.bulkUpdateUserRoles(
            userIds,
            newRole,
            (operation) =>
              handleOperationProgress(operation.operationId, operation)
          );

          if (enableNotifications) {
            console.log(`Started bulk role update: ${result.message}`);
          }

          return result;
        } catch (error) {
          handleError('bulkUpdateRoles', error);
          throw error;
        }
      },
      [handleOperationProgress, enableNotifications, handleError]
    ),

    /**
     * Bulk update user status
     * @param {Array} userIds - Array of user IDs
     * @param {boolean} isActive - New active status
     */
    bulkUpdateStatus: useCallback(
      async (userIds, isActive) => {
        try {
          const result = await batchOperationsService.bulkUpdateUserStatus(
            userIds,
            isActive,
            (operation) =>
              handleOperationProgress(operation.operationId, operation)
          );

          if (enableNotifications) {
            console.log(`Started bulk status update: ${result.message}`);
          }

          return result;
        } catch (error) {
          handleError('bulkUpdateStatus', error);
          throw error;
        }
      },
      [handleOperationProgress, enableNotifications, handleError]
    ),

    /**
     * Bulk update user verification
     * @param {Array} userIds - Array of user IDs
     * @param {boolean} isVerified - New verification status
     */
    bulkUpdateVerification: useCallback(
      async (userIds, isVerified) => {
        try {
          const result =
            await batchOperationsService.bulkUpdateUserVerification(
              userIds,
              isVerified,
              (operation) =>
                handleOperationProgress(operation.operationId, operation)
            );

          if (enableNotifications) {
            console.log(`Started bulk verification update: ${result.message}`);
          }

          return result;
        } catch (error) {
          handleError('bulkUpdateVerification', error);
          throw error;
        }
      },
      [handleOperationProgress, enableNotifications, handleError]
    ),

    /**
     * Bulk delete users
     * @param {Array} userIds - Array of user IDs to delete
     * @param {Object} options - Deletion options
     */
    bulkDeleteUsers: useCallback(
      async (userIds, options = {}) => {
        try {
          const result = await batchOperationsService.bulkDeleteUsers(
            userIds,
            options,
            (operation) =>
              handleOperationProgress(operation.operationId, operation)
          );

          if (enableNotifications) {
            console.log(`Started bulk user deletion: ${result.message}`);
            if (result.warning) {
              console.warn(`Warning: ${result.warning}`);
            }
          }

          return result;
        } catch (error) {
          handleError('bulkDeleteUsers', error);
          throw error;
        }
      },
      [handleOperationProgress, enableNotifications, handleError]
    ),

    /**
     * Export users
     * @param {Array} userIds - Array of user IDs (empty for all users)
     * @param {Object} options - Export options
     */
    exportUsers: useCallback(
      async (userIds = [], options = {}) => {
        try {
          const result = await batchOperationsService.exportUsers(
            userIds,
            options
          );

          if (enableNotifications) {
            console.log(`User export completed: ${result.message}`);
          }

          return result;
        } catch (error) {
          handleError('exportUsers', error);
          throw error;
        }
      },
      [enableNotifications, handleError]
    ),

    /**
     * Import users from file
     * @param {File} file - CSV file containing user data
     * @param {Object} options - Import options
     */
    importUsers: useCallback(
      async (file, options = {}) => {
        try {
          const result = await batchOperationsService.importUsers(
            file,
            options,
            (operation) =>
              handleOperationProgress(operation.operationId, operation)
          );

          if (enableNotifications) {
            console.log(`User import started: ${result.message}`);
          }

          return result;
        } catch (error) {
          handleError('importUsers', error);
          throw error;
        }
      },
      [handleOperationProgress, enableNotifications, handleError]
    ),
  };

  /**
   * System maintenance operations
   */
  const maintenanceOperations = {
    /**
     * Clean up orphaned data
     * @param {Object} options - Cleanup options
     */
    cleanupOrphanedData: useCallback(
      async (options = {}) => {
        try {
          const result = await batchOperationsService.cleanupOrphanedData(
            options,
            (operation) =>
              handleOperationProgress(operation.operationId, operation)
          );

          if (enableNotifications) {
            console.log(`Data cleanup started: ${result.message}`);
          }

          return result;
        } catch (error) {
          handleError('cleanupOrphanedData', error);
          throw error;
        }
      },
      [handleOperationProgress, enableNotifications, handleError]
    ),

    /**
     * Clear application caches
     * @param {Object} options - Cache clearing options
     */
    clearCaches: useCallback(
      async (options = {}) => {
        try {
          const result = await batchOperationsService.clearCaches(options);

          if (enableNotifications) {
            console.log(`Caches cleared: ${result.message}`);
          }

          return result;
        } catch (error) {
          handleError('clearCaches', error);
          throw error;
        }
      },
      [enableNotifications, handleError]
    ),

    /**
     * Archive old data
     * @param {Object} options - Archive options
     */
    archiveOldData: useCallback(
      async (options = {}) => {
        try {
          const result = await batchOperationsService.archiveOldData(
            options,
            (operation) =>
              handleOperationProgress(operation.operationId, operation)
          );

          if (enableNotifications) {
            console.log(`Data archiving started: ${result.message}`);
          }

          return result;
        } catch (error) {
          handleError('archiveOldData', error);
          throw error;
        }
      },
      [handleOperationProgress, enableNotifications, handleError]
    ),
  };

  /**
   * Operation management functions
   */
  const operationManagement = {
    /**
     * Cancel a running operation
     * @param {string} operationId - ID of operation to cancel
     */
    cancelOperation: useCallback(
      async (operationId) => {
        try {
          const result = await batchOperationsService.cancelOperation(
            operationId
          );

          if (mountedRef.current) {
            setActiveOperations((prev) => {
              const updated = new Map(prev);
              const operation = updated.get(operationId);
              if (operation) {
                operation.status = BATCH_STATUS.CANCELLED;
                updated.set(operationId, operation);
              }
              return updated;
            });
          }

          if (enableNotifications) {
            console.log(`Operation cancelled: ${result.message}`);
          }

          return result;
        } catch (error) {
          handleError('cancelOperation', error);
          throw error;
        }
      },
      [enableNotifications, handleError]
    ),

    /**
     * Get detailed operation report
     * @param {string} operationId - Operation ID
     */
    getOperationReport: useCallback(
      async (operationId) => {
        try {
          return await batchOperationsService.getOperationReport(operationId);
        } catch (error) {
          handleError('getOperationReport', error);
          throw error;
        }
      },
      [handleError]
    ),

    /**
     * Refresh all data
     */
    refreshAll: useCallback(async () => {
      await Promise.all([
        fetchActiveOperations(),
        fetchOperationHistory(),
        fetchSystemStats(),
      ]);
    }, [fetchActiveOperations, fetchOperationHistory, fetchSystemStats]),
  };

  // Auto-refresh effect for active operations
  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        if (mountedRef.current && activeOperations.size > 0) {
          fetchActiveOperations();
        }
      }, refreshInterval * 1000);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [
    autoRefresh,
    refreshInterval,
    activeOperations.size,
    fetchActiveOperations,
  ]);

  // Initial data fetch
  useEffect(() => {
    fetchActiveOperations();
    fetchSystemStats();
  }, [fetchActiveOperations, fetchSystemStats]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      progressCallbacksRef.current.clear();
    };
  }, []);

  // Calculated values
  const selectedCount = selectedItems.size;
  const hasActiveOperations = activeOperations.size > 0;
  const isLoading = Object.values(loading).some(Boolean);
  const hasErrors = Object.values(errors).some(Boolean);

  return {
    // Selection state
    selectedItems: Array.from(selectedItems),
    selectedCount,
    selectAll,
    selectionMode,

    // Selection functions
    ...selectionFunctions,

    // Operations data
    activeOperations: Array.from(activeOperations.values()),
    operationHistory,
    systemStats,
    hasActiveOperations,

    // Loading states
    loading,
    isLoading,

    // Error states
    errors,
    hasErrors,
    clearError,

    // User operations
    userOperations,

    // Maintenance operations
    maintenanceOperations,

    // Operation management
    ...operationManagement,

    // Data fetching
    fetchActiveOperations,
    fetchOperationHistory,
    fetchSystemStats,
  };
};

export default useBatchOperations;
