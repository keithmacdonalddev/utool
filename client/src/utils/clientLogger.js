/**
 * Client-side logging utilities
 * Provides consistent logging functions for different parts of the application
 */

/**
 * Enhanced client-side logging function for stock-related operations
 * Includes timestamps and optional data object logging
 *
 * @param {string} message - The log message to display
 * @param {any} data - Optional data to log alongside the message
 */
export const logStockClient = (message, data = null) => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[STOCK CLIENT][${timestamp}] ${message}`);
  if (data) {
    console.log(`[STOCK CLIENT][${timestamp}] Data:`, data);
  }
};

/**
 * Creates a namespaced logger for different application areas
 *
 * @param {string} namespace - The namespace for this logger (e.g., 'WEATHER', 'TASKS')
 * @returns {Function} - A logger function specific to the given namespace
 */
export const createLogger = (namespace) => {
  return (message, data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${namespace}][${timestamp}] ${message}`);
    if (data) {
      console.log(`[${namespace}][${timestamp}] Data:`, data);
    }
  };
};

export default {
  logStockClient,
  createLogger,
};
