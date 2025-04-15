/**
 * Enhanced logger utility that both logs to console and streams logs to connected clients
 */
const LogTypes = {
  INFO: 'info',
  ERROR: 'error',
  DEBUG: 'debug',
  WARN: 'warn'
};

// Will be set when server starts
let io = null;

// In-memory log storage for recent logs
const recentLogs = [];
const MAX_LOGS = 500; // Store up to 500 recent logs

// Initialize with socket.io instance
function initLogger(socketIo) {
  io = socketIo;
}

/**
 * Log a message and emit to connected admin clients
 * @param {string} type - Log type (info, error, warn, debug)
 * @param {string} message - Log message
 * @param {object} data - Optional data to include
 */
function log(type, message, data = null) {
  const timestamp = new Date();
  const logEntry = {
    type,
    message,
    data,
    timestamp
  };

  // Standard console logging
  switch (type) {
    case LogTypes.ERROR:
      console.error(`[${timestamp.toISOString()}] ${message}`, data || '');
      break;
    case LogTypes.WARN:
      console.warn(`[${timestamp.toISOString()}] ${message}`, data || '');
      break;
    case LogTypes.DEBUG:
      console.debug(`[${timestamp.toISOString()}] ${message}`, data || '');
      break;
    default:
      console.log(`[${timestamp.toISOString()}] ${message}`, data || '');
  }

  // Store in recent logs
  recentLogs.unshift(logEntry);
  if (recentLogs.length > MAX_LOGS) {
    recentLogs.pop();
  }

  // Emit to connected clients if socket.io is initialized
  if (io) {
    io.to('admin-logs').emit('server-log', logEntry);
  }
}

// Wrapper functions for different log types
const info = (message, data = null) => log(LogTypes.INFO, message, data);
const error = (message, data = null) => log(LogTypes.ERROR, message, data);
const warn = (message, data = null) => log(LogTypes.WARN, message, data);
const debug = (message, data = null) => log(LogTypes.DEBUG, message, data);

// Get recent logs for when clients first connect
function getRecentLogs() {
  return recentLogs;
}

module.exports = {
  initLogger,
  info,
  error,
  warn,
  debug,
  getRecentLogs,
  LogTypes
};