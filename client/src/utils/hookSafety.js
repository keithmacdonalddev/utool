/**
 * Hook Safety Utilities
 *
 * Global patterns and utilities to prevent common hook-related issues
 * such as infinite loops, stale closures, and dependency cycle problems.
 */

import { useRef, useCallback, useEffect } from 'react';

/**
 * Creates a stable ref-based callback that prevents dependency cycles
 * Use this pattern when a callback needs to access state but shouldn't
 * trigger re-renders when used as a dependency.
 *
 * @param {Function} callback - The callback function
 * @param {Array} deps - Dependencies for the callback
 * @returns {Function} Stable callback that won't cause dependency cycles
 */
export const useStableCallback = (callback, deps = []) => {
  const callbackRef = useRef(callback);

  // Update the ref when dependencies change
  useEffect(() => {
    callbackRef.current = callback;
  }, deps);

  // Return a stable function that calls the current callback
  return useCallback((...args) => {
    return callbackRef.current(...args);
  }, []); // Empty deps - this function never changes
};

/**
 * Creates a state ref that stays in sync with state but doesn't cause re-renders
 * Use this pattern to access current state in callbacks without adding state as dependency
 *
 * @param {any} state - The state value to track
 * @returns {Object} Ref object with current property
 */
export const useStateRef = (state) => {
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  return stateRef;
};

/**
 * Debounce hook with infinite loop protection
 * Prevents rapid successive calls that could cause infinite loops
 *
 * @param {Function} callback - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @param {Object} options - Options object
 * @param {number} options.maxCalls - Maximum calls within resetPeriod before circuit breaker trips
 * @param {number} options.resetPeriod - Period to reset call counter (ms)
 * @returns {Function} Debounced function with circuit breaker
 */
export const useSafeDebounce = (callback, delay, options = {}) => {
  const { maxCalls = 50, resetPeriod = 1000 } = options;

  const timeoutRef = useRef();
  const callCountRef = useRef(0);
  const lastResetRef = useRef(Date.now());
  const circuitBreakerRef = useRef(false);

  return useCallback(
    (...args) => {
      const now = Date.now();

      // Reset call counter if enough time has passed
      if (now - lastResetRef.current > resetPeriod) {
        callCountRef.current = 0;
        lastResetRef.current = now;
        circuitBreakerRef.current = false;
      }

      // Circuit breaker: reject if too many calls
      if (circuitBreakerRef.current) {
        console.warn('SafeDebounce: Circuit breaker active - rejecting call');
        return;
      }

      callCountRef.current++;

      if (callCountRef.current > maxCalls) {
        circuitBreakerRef.current = true;
        console.error(
          `SafeDebounce: Circuit breaker tripped! ${maxCalls} calls in ${resetPeriod}ms`
        );
        return;
      }

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay, maxCalls, resetPeriod]
  );
};

/**
 * Loop detection hook for development
 * Detects when a component is re-rendering too frequently
 *
 * @param {string} componentName - Name of the component for logging
 * @param {number} threshold - Max renders per second before warning
 */
export const useRenderLoopDetection = (componentName, threshold = 10) => {
  const renderCountRef = useRef(0);
  const windowStartRef = useRef(Date.now());

  useEffect(() => {
    const now = Date.now();
    renderCountRef.current++;

    // Check if we're within a 1-second window
    if (now - windowStartRef.current < 1000) {
      if (renderCountRef.current > threshold) {
        console.error(
          `🔄 RENDER LOOP DETECTED: ${componentName} rendered ${renderCountRef.current} times in 1 second!`
        );
        console.trace('Render loop stack trace');
      }
    } else {
      // Reset counter for new window
      renderCountRef.current = 1;
      windowStartRef.current = now;
    }
  });
};

/**
 * Safe useEffect hook that prevents cleanup from running during StrictMode re-mounts
 *
 * @param {Function} effect - Effect function
 * @param {Array} deps - Dependencies array
 * @param {Object} options - Options object
 * @param {boolean} options.strictModeSafe - Whether to handle StrictMode remounts
 * @param {string} options.name - Name for debugging
 */
export const useSafeEffect = (effect, deps, options = {}) => {
  const { strictModeSafe = true, name = 'anonymous' } = options;

  const isMountedRef = useRef(true);
  const cleanupTimerRef = useRef(null);

  useEffect(() => {
    isMountedRef.current = true;

    const cleanup = effect();

    if (typeof cleanup !== 'function') {
      return cleanup;
    }

    return () => {
      isMountedRef.current = false;

      if (strictModeSafe) {
        // Clear any existing timer
        if (cleanupTimerRef.current) {
          clearTimeout(cleanupTimerRef.current);
        }

        // Defer cleanup to detect StrictMode re-mount
        cleanupTimerRef.current = setTimeout(() => {
          if (!isMountedRef.current) {
            console.log(
              `SafeEffect[${name}]: True unmount detected, running cleanup`
            );
            cleanup();
          } else {
            console.log(
              `SafeEffect[${name}]: StrictMode re-mount detected, skipping cleanup`
            );
          }
        }, 100);
      } else {
        cleanup();
      }
    };
  }, deps);
};

/**
 * Development-only hook to monitor and log hook patterns that could cause issues
 */
export const useHookDebugger = (hookName, deps = [], state = null) => {
  const renderCountRef = useRef(0);
  const depsHistoryRef = useRef([]);
  const stateHistoryRef = useRef([]);

  if (process.env.NODE_ENV === 'development') {
    renderCountRef.current++;

    // Track dependency changes
    const depsString = JSON.stringify(deps);
    const lastDeps = depsHistoryRef.current[depsHistoryRef.current.length - 1];

    if (lastDeps !== depsString) {
      depsHistoryRef.current.push(depsString); // Warn about frequent dependency changes in development only
      if (depsHistoryRef.current.length > 5) {
        depsHistoryRef.current = depsHistoryRef.current.slice(-5);
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            `🔍 ${hookName}: Dependencies changing frequently - check for object/array recreation`
          );
        }
      }
    }

    // Track state changes
    if (state !== null) {
      const stateString = JSON.stringify(state);
      const lastState =
        stateHistoryRef.current[stateHistoryRef.current.length - 1];

      if (lastState !== stateString) {
        stateHistoryRef.current.push(stateString);
        if (stateHistoryRef.current.length > 10) {
          stateHistoryRef.current = stateHistoryRef.current.slice(-10);
          if (process.env.NODE_ENV === 'development') {
            console.warn(
              `🔍 ${hookName}: State changing rapidly - potential loop`
            );
          }
        }
      }
    } // Development-only render frequency logging
    useEffect(() => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 ${hookName}: Render #${renderCountRef.current}`);
      }
    });
  }
};

export default {
  useStableCallback,
  useStateRef,
  useSafeDebounce,
  useRenderLoopDetection,
  useSafeEffect,
  useHookDebugger,
};
