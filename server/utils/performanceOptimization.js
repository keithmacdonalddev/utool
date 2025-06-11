/**
 * Performance Optimization Utilities
 *
 * MILESTONE 0: Foundation & Architecture
 * Server-side performance infrastructure including caching, monitoring, and optimization
 */

import NodeCache from 'node-cache';
import { performance } from 'perf_hooks';
import mongoose from 'mongoose';

/**
 * Configuration for performance optimization
 */
const PERF_CONFIG = {
  cache: {
    stdTTL: 300, // 5 minutes default TTL
    checkperiod: 60, // Check for expired keys every 60 seconds
    useClones: false, // Don't clone objects for better performance
    maxKeys: 1000, // Maximum number of cached items
  },
  monitoring: {
    slowQueryThreshold: 100, // Log queries slower than 100ms
    memoryCheckInterval: 30000, // Check memory every 30 seconds
    metricsRetentionPeriod: 3600000, // Keep metrics for 1 hour
  },
};

/**
 * In-memory cache for frequently accessed data
 */
export class PerformanceCache {
  constructor() {
    this.cache = new NodeCache(PERF_CONFIG.cache);
    this.hitRate = { hits: 0, misses: 0 };

    // Setup cache event listeners
    this.cache.on('set', (key, value) => {
      console.debug(`Cache SET: ${key}`);
    });

    this.cache.on('get', (key, value) => {
      if (value === undefined) {
        this.hitRate.misses++;
        console.debug(`Cache MISS: ${key}`);
      } else {
        this.hitRate.hits++;
        console.debug(`Cache HIT: ${key}`);
      }
    });
  }

  /**
   * Get item from cache
   */
  get(key) {
    return this.cache.get(key);
  }

  /**
   * Set item in cache with optional TTL
   */
  set(key, value, ttl = null) {
    return this.cache.set(key, value, ttl || PERF_CONFIG.cache.stdTTL);
  }

  /**
   * Delete item from cache
   */
  del(key) {
    return this.cache.del(key);
  }

  /**
   * Clear all cache
   */
  clear() {
    this.hitRate = { hits: 0, misses: 0 };
    return this.cache.flushAll();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const stats = this.cache.getStats();
    const total = this.hitRate.hits + this.hitRate.misses;
    const hitRatePercent =
      total > 0 ? ((this.hitRate.hits / total) * 100).toFixed(2) : 0;

    return {
      ...stats,
      hitRate: `${hitRatePercent}%`,
      hits: this.hitRate.hits,
      misses: this.hitRate.misses,
    };
  }

  /**
   * Get or set with a factory function
   */
  async getOrSet(key, factoryFn, ttl = null) {
    let value = this.get(key);

    if (value === undefined) {
      value = await factoryFn();
      this.set(key, value, ttl);
    }

    return value;
  }
}

/**
 * Database query optimization utilities
 */
export class QueryOptimizer {
  constructor() {
    this.queryMetrics = new Map();
    this.slowQueries = [];
  }

  /**
   * Wrap a Mongoose query with performance monitoring
   */
  monitorQuery(query, operation = 'unknown') {
    const startTime = performance.now();
    const queryString = JSON.stringify(query.getQuery());

    return query
      .exec()
      .then((result) => {
        const duration = performance.now() - startTime;
        this.recordQueryMetric(operation, duration, queryString);

        if (duration > PERF_CONFIG.monitoring.slowQueryThreshold) {
          this.recordSlowQuery(operation, duration, queryString);
        }

        return result;
      })
      .catch((error) => {
        const duration = performance.now() - startTime;
        this.recordQueryMetric(operation, duration, queryString, error);
        throw error;
      });
  }

  /**
   * Record query performance metrics
   */
  recordQueryMetric(operation, duration, queryString, error = null) {
    const metric = {
      operation,
      duration,
      queryString,
      timestamp: Date.now(),
      error: error ? error.message : null,
    };

    if (!this.queryMetrics.has(operation)) {
      this.queryMetrics.set(operation, []);
    }

    const metrics = this.queryMetrics.get(operation);
    metrics.push(metric);

    // Keep only recent metrics
    const cutoff = Date.now() - PERF_CONFIG.monitoring.metricsRetentionPeriod;
    this.queryMetrics.set(
      operation,
      metrics.filter((m) => m.timestamp > cutoff)
    );
  }

  /**
   * Record slow queries for analysis
   */
  recordSlowQuery(operation, duration, queryString) {
    const slowQuery = {
      operation,
      duration,
      queryString,
      timestamp: Date.now(),
    };

    this.slowQueries.push(slowQuery);

    // Keep only recent slow queries
    const cutoff = Date.now() - PERF_CONFIG.monitoring.metricsRetentionPeriod;
    this.slowQueries = this.slowQueries.filter((q) => q.timestamp > cutoff);

    console.warn(
      `Slow query detected: ${operation} took ${duration.toFixed(2)}ms`
    );
  }

  /**
   * Get query performance statistics
   */
  getQueryStats() {
    const stats = {};

    for (const [operation, metrics] of this.queryMetrics) {
      const durations = metrics.map((m) => m.duration);
      const errors = metrics.filter((m) => m.error).length;

      if (durations.length > 0) {
        stats[operation] = {
          count: metrics.length,
          averageDuration:
            durations.reduce((a, b) => a + b, 0) / durations.length,
          minDuration: Math.min(...durations),
          maxDuration: Math.max(...durations),
          errorCount: errors,
          errorRate: `${((errors / metrics.length) * 100).toFixed(2)}%`,
        };
      }
    }

    return {
      operations: stats,
      slowQueries: this.slowQueries.length,
      totalQueries: Array.from(this.queryMetrics.values()).reduce(
        (sum, metrics) => sum + metrics.length,
        0
      ),
    };
  }
}

/**
 * System performance monitor
 */
export class PerformanceMonitor {
  constructor() {
    this.metrics = {
      memory: [],
      database: [],
    };
    this.isMonitoring = false;
  }

  /**
   * Start performance monitoring
   */
  start() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, PERF_CONFIG.monitoring.memoryCheckInterval);

    console.log('Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stop() {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    console.log('Performance monitoring stopped');
  }

  /**
   * Collect system performance metrics
   */
  collectMetrics() {
    const memUsage = process.memoryUsage();
    const timestamp = Date.now();

    // Memory metrics
    this.metrics.memory.push({
      timestamp,
      rss: memUsage.rss,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
    });

    // Database connection metrics
    if (mongoose.connection.readyState === 1) {
      this.metrics.database.push({
        timestamp,
        connectionState: mongoose.connection.readyState,
      });
    }

    // Keep only recent metrics
    const cutoff = timestamp - PERF_CONFIG.monitoring.metricsRetentionPeriod;
    this.metrics.memory = this.metrics.memory.filter(
      (m) => m.timestamp > cutoff
    );
    this.metrics.database = this.metrics.database.filter(
      (m) => m.timestamp > cutoff
    );

    // Log warnings for high memory usage
    const memoryUsageMB = memUsage.heapUsed / 1024 / 1024;
    if (memoryUsageMB > 500) {
      // 500MB threshold
      console.warn(`High memory usage detected: ${memoryUsageMB.toFixed(2)}MB`);
    }
  }

  /**
   * Get performance statistics
   */
  getStats() {
    const now = Date.now();
    const recent = now - 5 * 60 * 1000; // Last 5 minutes

    const recentMemory = this.metrics.memory.filter(
      (m) => m.timestamp > recent
    );
    const recentDatabase = this.metrics.database.filter(
      (m) => m.timestamp > recent
    );

    return {
      monitoring: this.isMonitoring,
      uptime: process.uptime(),
      memory: {
        current: process.memoryUsage(),
        samples: recentMemory.length,
        average:
          recentMemory.length > 0
            ? {
                heapUsed:
                  recentMemory.reduce((sum, m) => sum + m.heapUsed, 0) /
                  recentMemory.length,
                heapTotal:
                  recentMemory.reduce((sum, m) => sum + m.heapTotal, 0) /
                  recentMemory.length,
              }
            : null,
      },
      database: {
        connectionState: mongoose.connection.readyState,
        samples: recentDatabase.length,
      },
    };
  }
}

// Global instances
export const performanceCache = new PerformanceCache();
export const queryOptimizer = new QueryOptimizer();
export const performanceMonitor = new PerformanceMonitor();

/**
 * Express middleware for request performance monitoring
 */
export const performanceMiddleware = (req, res, next) => {
  const startTime = performance.now();

  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function (...args) {
    const duration = performance.now() - startTime;

    // Log slow requests
    if (duration > PERF_CONFIG.monitoring.slowQueryThreshold) {
      console.warn(
        `Slow request: ${req.method} ${req.path} took ${duration.toFixed(2)}ms`
      );
    }

    // Add performance header
    res.setHeader('X-Response-Time', `${duration.toFixed(2)}ms`);

    originalEnd.apply(this, args);
  };

  next();
};

/**
 * Initialize performance optimization
 */
export const initializePerformanceOptimization = () => {
  console.log('Initializing performance optimization');

  // Start monitoring
  performanceMonitor.start();

  // Setup graceful shutdown
  process.on('SIGTERM', () => {
    performanceMonitor.stop();
    performanceCache.clear();
  });

  process.on('SIGINT', () => {
    performanceMonitor.stop();
    performanceCache.clear();
  });

  return {
    cache: performanceCache,
    queryOptimizer,
    performanceMonitor,
  };
};

/**
 * Helper functions for common optimization patterns
 */
export const optimizationHelpers = {
  /**
   * Cached database lookup
   */
  cachedLookup: async (key, lookupFn, ttl = 300) => {
    return performanceCache.getOrSet(key, lookupFn, ttl);
  },

  /**
   * Optimized pagination
   */
  optimizedPagination: (
    query,
    page = 1,
    limit = 20,
    sortField = 'createdAt'
  ) => {
    const skip = (page - 1) * limit;
    return query
      .sort({ [sortField]: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  },

  /**
   * Memory usage formatter
   */
  formatMemoryUsage: (bytes) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  },
};

export default {
  performanceCache,
  queryOptimizer,
  performanceMonitor,
  performanceMiddleware,
  initializePerformanceOptimization,
  optimizationHelpers,
};
