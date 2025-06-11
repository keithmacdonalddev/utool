import { useCallback, useRef, useMemo, useEffect, useState } from 'react';
import { debounce, throttle } from 'lodash';

/**
 * @fileoverview Performance optimization utilities for the utool application.
 * Provides hooks and utilities for debouncing, throttling, memoization,
 * virtual scrolling, and performance monitoring.
 */

/**
 * Custom hook for debounced values
 * Useful for search inputs, API calls, etc.
 * 
 * @param {any} value - The value to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {any} - Debounced value
 */
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Custom hook for debounced callbacks
 * Prevents excessive function calls
 * 
 * @param {Function} callback - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @param {Array} deps - Dependencies array
 * @returns {Function} - Debounced callback
 */
export const useDebouncedCallback = (callback, delay, deps = []) => {
  const callbackRef = useRef(callback);
  
  // Update callback ref when dependencies change
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback, ...deps]);

  return useMemo(
    () => debounce((...args) => callbackRef.current(...args), delay),
    [delay]
  );
};

/**
 * Custom hook for throttled callbacks
 * Limits function execution frequency
 * 
 * @param {Function} callback - Function to throttle
 * @param {number} delay - Delay in milliseconds
 * @param {Array} deps - Dependencies array
 * @returns {Function} - Throttled callback
 */
export const useThrottledCallback = (callback, delay, deps = []) => {
  const callbackRef = useRef(callback);
  
  // Update callback ref when dependencies change
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback, ...deps]);

  return useMemo(
    () => throttle((...args) => callbackRef.current(...args), delay),
    [delay]
  );
};

/**
 * Custom hook for intersection observer
 * Useful for lazy loading and infinite scroll
 * 
 * @param {Object} options - Intersection observer options
 * @returns {Array} - [ref, isIntersecting, entry]
 */
export const useIntersectionObserver = (options = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [entry, setEntry] = useState(null);
  const elementRef = useRef(null);
  const observerRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        setEntry(entry);
      },
      options
    );

    observer.observe(element);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [options.threshold, options.rootMargin]);

  return [elementRef, isIntersecting, entry];
};

/**
 * Custom hook for virtual scrolling
 * Efficiently handles large lists by rendering only visible items
 * 
 * @param {Array} items - Array of items to virtualize
 * @param {number} itemHeight - Height of each item in pixels
 * @param {number} containerHeight - Height of the container in pixels
 * @param {number} overscan - Number of items to render outside visible area
 * @returns {Object} - Virtual scrolling data and handlers
 */
export const useVirtualScroll = (items, itemHeight, containerHeight, overscan = 5) => {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef(null);

  const handleScroll = useThrottledCallback((e) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, 16); // ~60fps

  const visibleRange = useMemo(() => {
    const visibleStart = Math.floor(scrollTop / itemHeight);
    const visibleEnd = Math.min(
      visibleStart + Math.ceil(containerHeight / itemHeight),
      items.length - 1
    );

    const start = Math.max(0, visibleStart - overscan);
    const end = Math.min(items.length - 1, visibleEnd + overscan);

    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end + 1).map((item, index) => ({
      item,
      index: visibleRange.start + index,
    }));
  }, [items, visibleRange.start, visibleRange.end]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  return {
    scrollElementRef,
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
  };
};

/**
 * Performance monitoring hook
 * Tracks component render times and performance metrics
 * 
 * @param {string} componentName - Name of the component being monitored
 * @param {boolean} enabled - Whether monitoring is enabled
 * @returns {Object} - Performance metrics and utilities
 */
export const usePerformanceMonitor = (componentName, enabled = process.env.NODE_ENV === 'development') => {
  const renderCountRef = useRef(0);
  const renderTimesRef = useRef([]);
  const lastRenderTimeRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    renderCountRef.current += 1;
    const now = performance.now();

    if (lastRenderTimeRef.current) {
      const renderTime = now - lastRenderTimeRef.current;
      renderTimesRef.current.push(renderTime);

      // Keep only last 100 render times
      if (renderTimesRef.current.length > 100) {
        renderTimesRef.current.shift();
      }

      // Log slow renders (>16ms for 60fps)
      if (renderTime > 16) {
        console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
      }
    }

    lastRenderTimeRef.current = now;
  });

  const getMetrics = useCallback(() => {
    if (!enabled || renderTimesRef.current.length === 0) return null;

    const times = renderTimesRef.current;
    const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
    const max = Math.max(...times);
    const min = Math.min(...times);

    return {
      componentName,
      renderCount: renderCountRef.current,
      averageRenderTime: avg,
      maxRenderTime: max,
      minRenderTime: min,
      slowRenders: times.filter(time => time > 16).length,
    };
  }, [componentName, enabled]);

  const logMetrics = useCallback(() => {
    const metrics = getMetrics();
    if (metrics) {
      console.table(metrics);
    }
  }, [getMetrics]);

  return {
    getMetrics,
    logMetrics,
    renderCount: renderCountRef.current,
  };
};

/**
 * Memoized selector hook with deep equality check
 * Prevents unnecessary re-renders when selector output hasn't changed
 * 
 * @param {Function} selector - Selector function
 * @param {Array} deps - Dependencies array
 * @param {Function} equalityFn - Custom equality function
 * @returns {any} - Memoized selector result
 */
export const useDeepMemoizedSelector = (selector, deps = [], equalityFn) => {
  const prevResultRef = useRef();
  const prevDepsRef = useRef();

  return useMemo(() => {
    // Check if dependencies have changed
    const depsChanged = !prevDepsRef.current || 
      deps.length !== prevDepsRef.current.length ||
      deps.some((dep, index) => dep !== prevDepsRef.current[index]);

    if (!depsChanged && prevResultRef.current !== undefined) {
      return prevResultRef.current;
    }

    const result = selector();

    // Use custom equality function or default deep equality
    const isEqual = equalityFn ? 
      equalityFn(result, prevResultRef.current) :
      JSON.stringify(result) === JSON.stringify(prevResultRef.current);

    if (!isEqual || prevResultRef.current === undefined) {
      prevResultRef.current = result;
      prevDepsRef.current = deps;
      return result;
    }

    return prevResultRef.current;
  }, deps);
};

/**
 * Image lazy loading hook
 * Loads images only when they're about to become visible
 * 
 * @param {string} src - Image source URL
 * @param {Object} options - Intersection observer options
 * @returns {Object} - Loading state and image ref
 */
export const useLazyImage = (src, options = {}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const [ref, isIntersecting] = useIntersectionObserver({
    threshold: 0.1,
    ...options,
  });

  useEffect(() => {
    if (isIntersecting && src && !imageSrc) {
      const img = new Image();
      
      img.onload = () => {
        setImageSrc(src);
        setIsLoaded(true);
      };
      
      img.onerror = () => {
        setIsError(true);
      };
      
      img.src = src;
    }
  }, [isIntersecting, src, imageSrc]);

  return {
    ref,
    src: imageSrc,
    isLoaded,
    isError,
    isIntersecting,
  };
};

/**
 * Batch updates hook
 * Batches multiple state updates to reduce re-renders
 * 
 * @param {number} delay - Delay before applying batched updates
 * @returns {Object} - Batching utilities
 */
export const useBatchUpdates = (delay = 100) => {
  const pendingUpdatesRef = useRef([]);
  const timeoutRef = useRef(null);

  const batchUpdate = useCallback((updateFn) => {
    pendingUpdatesRef.current.push(updateFn);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const updates = pendingUpdatesRef.current;
      pendingUpdatesRef.current = [];

      // Apply all updates in a single batch
      updates.forEach(updateFn => updateFn());
    }, delay);
  }, [delay]);

  const flushUpdates = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const updates = pendingUpdatesRef.current;
    pendingUpdatesRef.current = [];
    updates.forEach(updateFn => updateFn());
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    batchUpdate,
    flushUpdates,
    hasPendingUpdates: pendingUpdatesRef.current.length > 0,
  };
};

/**
 * Memory usage monitoring utilities
 */
export const memoryUtils = {
  /**
   * Get current memory usage (if available)
   * @returns {Object|null} Memory usage information
   */
  getMemoryUsage: () => {
    if (performance.memory) {
      return {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024 * 100) / 100,
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024 * 100) / 100,
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024 * 100) / 100,
      };
    }
    return null;
  },

  /**
   * Log memory usage to console
   */
  logMemoryUsage: () => {
    const usage = memoryUtils.getMemoryUsage();
    if (usage) {
      console.log(`Memory Usage: ${usage.used}MB / ${usage.total}MB (Limit: ${usage.limit}MB)`);
    }
  },

  /**
   * Check if memory usage is high
   * @param {number} threshold Memory usage threshold (0-1)
   * @returns {boolean} Whether memory usage is above threshold
   */
  isMemoryUsageHigh: (threshold = 0.8) => {
    const usage = memoryUtils.getMemoryUsage();
    if (usage) {
      return (usage.total / usage.limit) > threshold;
    }
    return false;
  },
};

/**
 * Bundle analyzer utilities for development
 */
export const bundleUtils = {
  /**
   * Dynamically import a module with loading state
   * @param {Function} importFn Dynamic import function
   * @returns {Object} Loading state and component
   */
  useDynamicImport: (importFn) => {
    const [component, setComponent] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const loadComponent = useCallback(async () => {
      setLoading(true);
      setError(null);

      try {
        const module = await importFn();
        setComponent(module.default || module);
      } catch (err) {
        setError(err);
        console.error('Dynamic import failed:', err);
      } finally {
        setLoading(false);
      }
    }, [importFn]);

    return {
      component,
      loading,
      error,
      loadComponent,
    };
  },
};

/**
 * Performance measurement decorator for functions
 * @param {Function} fn Function to measure
 * @param {string} name Function name for logging
 * @returns {Function} Wrapped function with performance measurement
 */
export const measurePerformance = (fn, name) => {
  return function(...args) {
    const start = performance.now();
    const result = fn.apply(this, args);
    const end = performance.now();
    const duration = end - start;

    if (duration > 10) { // Log only slow operations
      console.log(`Performance: ${name} took ${duration.toFixed(2)}ms`);
    }

    return result;
  };
};

export default {
  useDebounce,
  useDebouncedCallback,
  useThrottledCallback,
  useIntersectionObserver,
  useVirtualScroll,
  usePerformanceMonitor,
  useDeepMemoizedSelector,
  useLazyImage,
  useBatchUpdates,
  memoryUtils,
  bundleUtils,
  measurePerformance,
}; 