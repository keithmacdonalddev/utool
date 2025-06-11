import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useLocalStoragePersistence - Custom hook for persisting UI state to localStorage
 *
 * This hook provides a robust interface for saving and restoring dashboard state
 * including view preferences, filters, sorting, and other UI configurations.
 * It handles JSON serialization, error recovery, and performance optimizations.
 *
 * Features:
 * - Automatic serialization/deserialization
 * - Error handling and fallback values
 * - Debounced saves to prevent excessive localStorage writes
 * - Type validation and migration support
 * - Namespace isolation for different dashboard contexts
 *
 * @param {string} key - localStorage key namespace
 * @param {Object} defaultState - Default state structure
 * @param {Object} options - Configuration options
 * @returns {Object} State, setter, and utility functions
 */
const useLocalStoragePersistence = (key, defaultState = {}, options = {}) => {
  const {
    debounceMs = 300,
    validateState = null,
    migrateState = null,
    onError = null,
    enableLogging = false,
  } = options;

  // Internal state for the persisted data
  const [state, setState] = useState(defaultState);
  const [isLoaded, setIsLoaded] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  // Refs for performance optimization
  const saveTimeoutRef = useRef(null);
  const initialLoadRef = useRef(false);
  const stateRef = useRef(state);

  // Global loop detection and circuit breaker
  const saveCallCountRef = useRef(0);
  const lastSaveTimeRef = useRef(0);
  const circuitBreakerRef = useRef(false);

  /**
   * Log messages if logging is enabled
   * Provides debugging information for development
   */
  const log = useCallback(
    (message, data = null) => {
      if (enableLogging) {
        console.log(`[LocalStoragePersistence:${key}] ${message}`, data || '');
      }
    },
    [key, enableLogging]
  );

  /**
   * Safely parse JSON with error handling
   * Returns null if parsing fails
   */
  const safeParse = useCallback(
    (jsonString) => {
      try {
        return JSON.parse(jsonString);
      } catch (error) {
        log('JSON parse error', error.message);
        if (onError) {
          onError('parse_error', error, jsonString);
        }
        return null;
      }
    },
    [log, onError]
  );

  /**
   * Safely stringify data with error handling
   * Returns null if stringification fails
   */
  const safeStringify = useCallback(
    (data) => {
      try {
        return JSON.stringify(data);
      } catch (error) {
        log('JSON stringify error', error.message);
        if (onError) {
          onError('stringify_error', error, data);
        }
        return null;
      }
    },
    [log, onError]
  );

  /**
   * Validate state structure against expected format
   * Returns true if valid, false otherwise
   */
  const isValidState = useCallback(
    (stateToValidate) => {
      if (!validateState) return true;

      try {
        return validateState(stateToValidate);
      } catch (error) {
        log('State validation error', error.message);
        if (onError) {
          onError('validation_error', error, stateToValidate);
        }
        return false;
      }
    },
    [validateState, log, onError]
  );

  /**
   * Migrate old state format to new format
   * Returns migrated state or null if migration fails
   */
  const migrateStateIfNeeded = useCallback(
    (stateToMigrate) => {
      if (!migrateState) return stateToMigrate;

      try {
        return migrateState(stateToMigrate);
      } catch (error) {
        log('State migration error', error.message);
        if (onError) {
          onError('migration_error', error, stateToMigrate);
        }
        return null;
      }
    },
    [migrateState, log, onError]
  );

  /**
   * Load state from localStorage
   * Handles parsing, validation, and migration
   */
  const loadState = useCallback(() => {
    try {
      const storedValue = localStorage.getItem(key);

      if (!storedValue) {
        log('No stored value found, using default state');
        setState(defaultState);
        setIsLoaded(true);
        return;
      }

      // Parse the stored JSON
      const parsedState = safeParse(storedValue);
      if (!parsedState) {
        log('Failed to parse stored state, using default');
        setState(defaultState);
        setIsLoaded(true);
        return;
      }

      // Migrate state if needed
      const migratedState = migrateStateIfNeeded(parsedState);
      if (!migratedState) {
        log('State migration failed, using default');
        setState(defaultState);
        setIsLoaded(true);
        return;
      }

      // Validate the final state
      if (!isValidState(migratedState)) {
        log('State validation failed, using default');
        setState(defaultState);
        setIsLoaded(true);
        return;
      }

      // Merge with default state to ensure all properties exist
      const mergedState = { ...defaultState, ...migratedState };

      log('Successfully loaded state', mergedState);
      setState(mergedState);
      setIsLoaded(true);
    } catch (error) {
      log('Error loading state', error.message);
      if (onError) {
        onError('load_error', error);
      }
      setState(defaultState);
      setIsLoaded(true);
    }
  }, [
    key,
    defaultState,
    safeParse,
    migrateStateIfNeeded,
    isValidState,
    log,
    onError,
  ]);

  /**
   * Save state to localStorage
   * Handles stringification and error recovery
   * Includes global loop detection and circuit breaker
   */
  const saveState = useCallback(
    (stateToSave) => {
      const now = Date.now();

      // Circuit breaker: if already triggered, reject saves for 5 seconds
      if (circuitBreakerRef.current && now - lastSaveTimeRef.current < 5000) {
        console.warn(
          `[${key}] Circuit breaker active - preventing save to avoid infinite loop`
        );
        return false;
      }

      // Loop detection: if too many saves in short time, trigger circuit breaker
      if (now - lastSaveTimeRef.current < 100) {
        saveCallCountRef.current++;
        if (saveCallCountRef.current > 10) {
          circuitBreakerRef.current = true;
          console.error(
            `[${key}] INFINITE LOOP DETECTED! Circuit breaker activated. ${saveCallCountRef.current} saves in <100ms`
          );

          // Reset counter after 5 seconds
          setTimeout(() => {
            circuitBreakerRef.current = false;
            saveCallCountRef.current = 0;
            console.log(
              `[${key}] Circuit breaker reset - normal operation resumed`
            );
          }, 5000);

          if (onError) {
            onError(
              'infinite_loop_detected',
              new Error('Infinite save loop detected'),
              {
                saveCount: saveCallCountRef.current,
                key,
              }
            );
          }
          return false;
        }
      } else {
        // Reset counter if enough time has passed
        saveCallCountRef.current = 0;
      }

      lastSaveTimeRef.current = now;

      try {
        const jsonString = safeStringify(stateToSave);
        if (!jsonString) {
          log('Failed to stringify state for saving');
          return false;
        }

        localStorage.setItem(key, jsonString);

        // Use setTimeout to prevent setLastSaved from causing immediate re-renders
        // that could trigger infinite loops
        setTimeout(() => {
          setLastSaved(Date.now());
        }, 0);

        log('Successfully saved state', stateToSave);
        return true;
      } catch (error) {
        log('Error saving state', error.message);
        if (onError) {
          onError('save_error', error, stateToSave);
        }
        return false;
      }
    },
    [key, safeStringify, log, onError]
  );

  /**
   * Debounced save function
   * Prevents excessive localStorage writes
   */
  const debouncedSave = useCallback(
    (stateToSave) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        saveState(stateToSave);
        saveTimeoutRef.current = null;
      }, debounceMs);
    },
    [saveState, debounceMs]
  );

  /**
   * Update state and trigger persistence
   * Main function for updating persisted state
   */
  const updateState = useCallback(
    (newState) => {
      let finalState;
      const currentState = stateRef.current;

      if (typeof newState === 'function') {
        // Support functional updates like React's setState
        finalState = newState(currentState);
      } else if (typeof newState === 'object' && newState !== null) {
        // Merge objects
        finalState = { ...currentState, ...newState };
      } else {
        // Replace entire state
        finalState = newState;
      }

      // Validate the new state
      if (!isValidState(finalState)) {
        log('Attempted to set invalid state', finalState);
        return false;
      }

      setState(finalState);

      // Only save after initial load to prevent overwriting with defaults
      if (initialLoadRef.current) {
        debouncedSave(finalState);
      }

      return true;
    },
    [isValidState, debouncedSave, log]
  ); // Removed 'state' dependency

  /**
   * Reset state to default values
   * Clears localStorage entry
   */
  const resetState = useCallback(() => {
    setState(defaultState);
    try {
      localStorage.removeItem(key);
      setLastSaved(null);
      log('State reset to defaults');
    } catch (error) {
      log('Error removing localStorage item', error.message);
      if (onError) {
        onError('reset_error', error);
      }
    }
  }, [key, defaultState, log, onError]);

  /**
   * Force immediate save without debouncing
   * Useful for critical state changes
   */
  const forceSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    return saveState(stateRef.current);
  }, [saveState]); // Removed 'state' dependency

  /**
   * Get specific property from state
   * Provides type-safe property access
   */
  const getProperty = useCallback(
    (propertyPath, fallback = undefined) => {
      try {
        const keys = propertyPath.split('.');
        let value = stateRef.current;

        for (const key of keys) {
          if (value && typeof value === 'object' && key in value) {
            value = value[key];
          } else {
            return fallback;
          }
        }

        return value;
      } catch (error) {
        log('Error getting property', error.message);
        return fallback;
      }
    },
    [log]
  ); // Removed 'state' dependency

  /**
   * Set specific property in state
   * Provides type-safe property updates
   */
  const setProperty = useCallback(
    (propertyPath, value) => {
      try {
        const keys = propertyPath.split('.');
        const lastKey = keys.pop();

        const newState = { ...stateRef.current };
        let current = newState;

        // Navigate to the parent object
        for (const key of keys) {
          if (!current[key] || typeof current[key] !== 'object') {
            current[key] = {};
          }
          current = current[key];
        }

        // Set the final value
        current[lastKey] = value;

        return updateState(newState);
      } catch (error) {
        log('Error setting property', error.message);
        if (onError) {
          onError('property_error', error, { propertyPath, value });
        }
        return false;
      }
    },
    [updateState, log, onError]
  ); // Removed 'state' dependency

  /**
   * Keep state ref in sync with state
   * Used for cleanup without dependency issues
   */
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  /**
   * Initialize state on mount
   * Load from localStorage on first render
   */
  useEffect(() => {
    if (!initialLoadRef.current) {
      loadState();
      initialLoadRef.current = true;
    }
  }, [loadState]);

  /**
   * Cleanup on unmount
   * Clear any pending save operations
   */
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        // Force save any pending changes before unmount
        // Use current state from ref to avoid dependency issues
        if (initialLoadRef.current) {
          saveState(stateRef.current);
        }
      }
    };
  }, [saveState]); // Removed 'state' dependency to prevent infinite loop

  // Return the hook interface
  return {
    // State access
    state,
    isLoaded,
    lastSaved,

    // State modification
    updateState,
    resetState,
    forceSave,

    // Property access (for convenience)
    getProperty,
    setProperty,

    // Utility functions
    get isValid() {
      return isValidState(stateRef.current);
    },

    // Advanced functions
    loadState: () => {
      initialLoadRef.current = false;
      loadState();
    },
  };
};

/**
 * Predefined dashboard state structure
 * Common configuration for dashboard persistence
 */
export const createDashboardState = (overrides = {}) => ({
  // View preferences
  view: {
    mode: 'grid', // 'grid', 'list', 'kanban'
    density: 'comfortable', // 'compact', 'comfortable', 'spacious'
    theme: 'dark', // 'light', 'dark', 'auto'
  },

  // Filter settings
  filters: {
    search: '',
    status: 'all', // 'all', 'active', 'completed', etc.
    priority: 'all', // 'all', 'high', 'medium', 'low'
    category: 'all', // 'all' or specific category
    member: 'all', // 'all' or specific member ID
    dateRange: null, // { start: Date, end: Date }
  },

  // Sort settings
  sort: {
    field: 'createdAt', // 'name', 'status', 'priority', 'createdAt', 'updatedAt'
    direction: 'desc', // 'asc', 'desc'
  },

  // Layout settings
  layout: {
    sidebar: {
      collapsed: false,
      width: 280,
    },
    columns: {
      // For list view
      widths: {
        name: 200,
        status: 100,
        priority: 100,
        members: 150,
        progress: 120,
        dueDate: 120,
      },
      visible: {
        name: true,
        status: true,
        priority: true,
        members: true,
        progress: true,
        dueDate: true,
      },
    },
    kanban: {
      columnOrder: ['planning', 'active', 'review', 'on-hold', 'completed'],
      columnWidths: {}, // columnId -> width
      collapsed: {}, // columnId -> boolean
    },
  },

  // User preferences
  preferences: {
    autoRefresh: true,
    refreshInterval: 30000, // 30 seconds
    notifications: {
      enabled: true,
      sound: false,
      position: 'top-right', // 'top-left', 'top-right', 'bottom-left', 'bottom-right'
    },
    shortcuts: {
      enabled: true,
    },
  },

  // Apply any overrides
  ...overrides,
});

/**
 * Validation function for dashboard state
 * Ensures state structure is valid
 */
export const validateDashboardState = (state) => {
  if (!state || typeof state !== 'object') return false;

  // Check required top-level properties
  const requiredProps = ['view', 'filters', 'sort', 'layout', 'preferences'];
  for (const prop of requiredProps) {
    if (!(prop in state)) return false;
  }

  // Validate view mode
  const validViewModes = ['grid', 'list', 'kanban'];
  if (!validViewModes.includes(state.view?.mode)) return false;

  // Validate sort direction
  const validDirections = ['asc', 'desc'];
  if (!validDirections.includes(state.sort?.direction)) return false;

  return true;
};

export default useLocalStoragePersistence;
