/**
 * Application logging utilities
 * Provides consistent logging across the application with module identification
 * and optional debug mode control
 */

// Enable this for more verbose logging
const DEBUG_MODE = process.env.NODE_ENV !== 'production';

/**
 * Base logging function with module prefix
 * @param {string} module - Module name for log identification
 * @param {...any} args - Arguments to log
 */
export const logApp = (module, ...args) => {
  if (!DEBUG_MODE) return;

  console.log(`[${module}]`, ...args);
};

/**
 * Weather module specific logging
 * @param {...any} args - Arguments to log
 */
export const logWeatherClient = (...args) => {
  logApp('Weather', ...args);
};

/**
 * Stock module specific logging
 * @param {...any} args - Arguments to log
 */
export const logStockClient = (...args) => {
  logApp('Stock', ...args);
};

/**
 * Clock module specific logging
 * @param {...any} args - Arguments to log
 */
export const logClockClient = (...args) => {
  logApp('Clock', ...args);
};

/**
 * Error logging with optional stack trace
 * @param {string} module - Module name for log identification
 * @param {string} message - Error description
 * @param {Error} [error] - Optional error object
 */
export const logError = (module, message, error) => {
  console.error(`[${module} ERROR] ${message}`, error);

  // We always log errors, even in production
  // But only log stacks in debug mode
  if (DEBUG_MODE && error && error.stack) {
    console.error(error.stack);
  }
};

export default {
  logApp,
  logWeatherClient,
  logStockClient,
  logClockClient,
  logError,
};
