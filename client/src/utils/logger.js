/**
 * Shared Logging Utility for Client-Side Diagnostics
 *
 * Provides consistent logging across the application with:
 * - Component-specific loggers
 * - Integration with error tracking
 * - Performance monitoring
 * - Debug log retention
 * - Environment-aware log levels
 */

const logLevels = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// Environment-aware log level configuration
const currentLevel = (() => {
  const env = process.env.NODE_ENV;
  const configLevel = process.env.REACT_APP_LOG_LEVEL;

  if (configLevel) {
    return logLevels[configLevel.toUpperCase()] || logLevels.INFO;
  }

  return env === 'development' ? logLevels.DEBUG : logLevels.INFO;
})();

// Performance monitoring for log operations
const performanceMetrics = {
  totalLogs: 0,
  logsByLevel: {
    DEBUG: 0,
    INFO: 0,
    WARN: 0,
    ERROR: 0,
  },
  logsByComponent: new Map(),
  startTime: Date.now(),
};

/**
 * Format log message with comprehensive context
 */
const formatMessage = (level, message, data = {}, context = {}) => {
  const timestamp = new Date().toISOString();
  const sessionId = getSessionId();

  return {
    timestamp,
    sessionId,
    level,
    message,
    context: {
      component: context.component || 'UNKNOWN',
      url: window.location.href,
      pathname: window.location.pathname,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      connection: navigator.connection
        ? {
            effectiveType: navigator.connection.effectiveType,
            downlink: navigator.connection.downlink,
            rtt: navigator.connection.rtt,
          }
        : null,
      memory: performance.memory
        ? {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
          }
        : null,
      ...context,
    },
    data,
    logId: generateLogId(),
  };
};

/**
 * Generate unique session ID for log correlation
 */
let sessionId = null;
const getSessionId = () => {
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }
  return sessionId;
};

/**
 * Generate unique log ID for tracing
 */
const generateLogId = () => {
  return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Core logging function with performance tracking and storage
 */
const log = (level, message, data = {}, context = {}) => {
  const logStartTime = performance.now();

  // Check log level filter
  if (logLevels[level] < currentLevel) return;

  try {
    const logEntry = formatMessage(level, message, data, context);

    // Update performance metrics
    performanceMetrics.totalLogs++;
    performanceMetrics.logsByLevel[level]++;

    if (context.component) {
      const componentCount =
        performanceMetrics.logsByComponent.get(context.component) || 0;
      performanceMetrics.logsByComponent.set(
        context.component,
        componentCount + 1
      );
    }

    // Console logging with appropriate method
    const consoleMethod =
      level === 'ERROR'
        ? 'error'
        : level === 'WARN'
        ? 'warn'
        : level === 'INFO'
        ? 'info'
        : 'debug';

    // Enhanced console output
    const componentTag = context.component ? `[${context.component}]` : '[APP]';
    console[consoleMethod](`${componentTag} ${level}:`, logEntry.message, {
      ...logEntry,
      logDuration: performance.now() - logStartTime,
    });

    // Store in global logs for debugging (keep last 500 entries)
    if (!window.appLogs) {
      window.appLogs = [];
      window.logMetrics = performanceMetrics;
    }

    window.appLogs.push(logEntry);
    if (window.appLogs.length > 500) {
      window.appLogs.shift();
    }

    // Update global metrics reference
    window.logMetrics = performanceMetrics;

    // Error tracking integration
    if (level === 'ERROR') {
      handleErrorTracking(logEntry, data);
    }

    // Performance monitoring for slow logs
    const logDuration = performance.now() - logStartTime;
    if (logDuration > 10) {
      // Log operations taking >10ms
      console.warn('Slow log operation detected', {
        duration: logDuration,
        level,
        component: context.component,
        messageLength: message.length,
        dataSize: JSON.stringify(data).length,
      });
    }
  } catch (error) {
    // Fallback logging to prevent log failures from breaking the app
    console.error('Logger error:', error.message, {
      originalLevel: level,
      originalMessage: message,
      loggerError: error,
    });
  }
};

/**
 * Enhanced error tracking with context aggregation
 */
const handleErrorTracking = (logEntry, originalData) => {
  try {
    // Built-in error tracking
    if (window.errorTracker) {
      window.errorTracker.captureException(new Error(logEntry.message), {
        extra: {
          ...logEntry,
          originalData,
          loggerVersion: '1.0.0',
        },
        tags: {
          component: logEntry.context.component,
          level: logEntry.level,
          sessionId: logEntry.sessionId,
        },
      });
    }

    // Send to custom error endpoint if configured
    if (window.customErrorEndpoint && navigator.onLine) {
      fetch(window.customErrorEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'client_error',
          ...logEntry,
          originalData,
        }),
      }).catch(() => {
        // Silently fail to avoid infinite error loops
      });
    }

    // Store critical errors in localStorage for offline analysis
    const criticalErrors = JSON.parse(
      localStorage.getItem('criticalErrors') || '[]'
    );
    criticalErrors.push({
      ...logEntry,
      originalData,
      offline: !navigator.onLine,
    });

    // Keep only last 50 critical errors
    if (criticalErrors.length > 50) {
      criticalErrors.shift();
    }

    localStorage.setItem('criticalErrors', JSON.stringify(criticalErrors));
  } catch (trackingError) {
    console.error('Error tracking failed:', trackingError.message);
  }
};

/**
 * Component-specific logger factory
 */
export const createComponentLogger = (componentName) => {
  if (!componentName || typeof componentName !== 'string') {
    throw new Error('Component name is required and must be a string');
  }

  const context = { component: componentName };

  return {
    debug: (message, data = {}) => log('DEBUG', message, data, context),
    info: (message, data = {}) => log('INFO', message, data, context),
    warn: (message, data = {}) => log('WARN', message, data, context),
    error: (message, data = {}) => log('ERROR', message, data, context),

    // Specialized logging methods
    performance: (operation, duration, data = {}) => {
      log(
        'INFO',
        `Performance: ${operation}`,
        {
          ...data,
          duration,
          operation,
          performanceCategory: 'timing',
        },
        context
      );
    },

    userAction: (action, details = {}) => {
      log(
        'INFO',
        `User Action: ${action}`,
        {
          ...details,
          action,
          userActionCategory: 'interaction',
          timestamp: Date.now(),
        },
        context
      );
    },

    apiCall: (method, url, duration, status, data = {}) => {
      const level = status >= 400 ? 'ERROR' : status >= 300 ? 'WARN' : 'INFO';
      log(
        level,
        `API ${method} ${url}`,
        {
          ...data,
          method,
          url,
          duration,
          status,
          apiCategory: 'request',
        },
        context
      );
    },

    render: (renderTime, data = {}) => {
      if (renderTime > 100) {
        // Only log slow renders
        log(
          'WARN',
          `Slow render detected`,
          {
            ...data,
            renderTime,
            renderCategory: 'performance',
          },
          context
        );
      }
    },
  };
};

/**
 * Global logger instance
 */
export const logger = createComponentLogger('GLOBAL');

/**
 * Utility functions for debugging and monitoring
 */
export const loggerUtils = {
  /**
   * Get recent logs filtered by criteria
   */
  getLogs: (filter = {}) => {
    if (!window.appLogs) return [];

    return window.appLogs.filter((log) => {
      if (filter.component && log.context.component !== filter.component)
        return false;
      if (filter.level && log.level !== filter.level) return false;
      if (filter.since && new Date(log.timestamp) < new Date(filter.since))
        return false;
      if (
        filter.message &&
        !log.message.toLowerCase().includes(filter.message.toLowerCase())
      )
        return false;
      return true;
    });
  },

  /**
   * Get performance metrics
   */
  getMetrics: () => ({
    ...performanceMetrics,
    uptime: Date.now() - performanceMetrics.startTime,
    logsPerMinute: (
      performanceMetrics.totalLogs /
      ((Date.now() - performanceMetrics.startTime) / 60000)
    ).toFixed(2),
    componentStats: Array.from(
      performanceMetrics.logsByComponent.entries()
    ).map(([component, count]) => ({
      component,
      count,
      percentage: ((count / performanceMetrics.totalLogs) * 100).toFixed(1),
    })),
  }),

  /**
   * Export logs for analysis
   */
  exportLogs: (format = 'json') => {
    const logs = window.appLogs || [];
    const metrics = loggerUtils.getMetrics();

    const exportData = {
      meta: {
        exportedAt: new Date().toISOString(),
        sessionId: getSessionId(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        format,
        version: '1.0.0',
      },
      metrics,
      logs,
    };

    if (format === 'csv') {
      // Convert to CSV format
      const headers = ['timestamp', 'level', 'component', 'message', 'url'];
      const csvRows = [
        headers.join(','),
        ...logs.map((log) =>
          [
            log.timestamp,
            log.level,
            log.context.component,
            `"${log.message.replace(/"/g, '""')}"`,
            log.context.url,
          ].join(',')
        ),
      ];
      return csvRows.join('\n');
    }

    return JSON.stringify(exportData, null, 2);
  },

  /**
   * Clear stored logs
   */
  clearLogs: () => {
    if (window.appLogs) window.appLogs.length = 0;
    localStorage.removeItem('criticalErrors');
    console.info('Logger: All logs cleared');
  },

  /**
   * Get critical errors from localStorage
   */
  getCriticalErrors: () => {
    try {
      return JSON.parse(localStorage.getItem('criticalErrors') || '[]');
    } catch (error) {
      console.error(
        'Failed to parse critical errors from localStorage:',
        error
      );
      return [];
    }
  },

  /**
   * Set log level dynamically
   */
  setLogLevel: (level) => {
    if (logLevels[level.toUpperCase()] !== undefined) {
      currentLevel = logLevels[level.toUpperCase()];
      logger.info(`Log level changed to ${level.toUpperCase()}`);
    } else {
      logger.error(`Invalid log level: ${level}`);
    }
  },
};

/**
 * Development helper to expose logger globally
 */
if (process.env.NODE_ENV === 'development') {
  window.logger = logger;
  window.loggerUtils = loggerUtils;
  window.createComponentLogger = createComponentLogger;

  // Helpful console message
  console.info(
    '%cLogger Utils Available:',
    'color: #4CAF50; font-weight: bold; font-size: 14px;',
    '\n• window.logger - Global logger',
    '\n• window.loggerUtils.getLogs() - Filter logs',
    '\n• window.loggerUtils.getMetrics() - Performance metrics',
    '\n• window.loggerUtils.exportLogs() - Export for analysis',
    '\n• window.createComponentLogger("ComponentName") - Create component logger'
  );
}

export default logger;
