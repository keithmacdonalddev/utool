const { format, createLogger, transports } = require('winston');
const AuditLog = require('../models/AuditLog');

// Format for console logging
const consoleFormat = format.combine(
  format.colorize(),
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length
      ? JSON.stringify(meta, null, 2)
      : '';
    return `${timestamp} [${level}]: ${message} ${metaString}`;
  })
);

// Create Winston logger instance
const winstonLogger = createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: format.combine(format.timestamp(), format.json()),
  transports: [
    new transports.Console({ format: consoleFormat }),
    // Could add file transport here for persistent logs
  ],
  exitOnError: false,
});

// Log levels with their numeric priority
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Function to log to database
async function logToDb(type, message, data = {}) {
  try {
    // Create log object
    const logEntry = {
      type,
      message,
      data,
      timestamp: new Date(),
    };

    // For requests/responses, extract userId if available
    if (data.req && data.req.user && data.req.user.id) {
      logEntry.userId = data.req.user.id;
    }

    // For errors, clean up stack trace for readability
    if (type === 'error' && data.error && data.error.stack) {
      logEntry.data.stack = data.error.stack
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
    }

    // Only store necessary info from req/res
    if (data.req) {
      const { method, originalUrl, ip, headers } = data.req;
      logEntry.data.req = {
        method,
        originalUrl,
        ip,
        headers: {
          'user-agent': headers['user-agent'] || 'Unknown',
          'content-type': headers['content-type'],
          referer: headers.referer,
        },
      };

      // Extract user agent for AuditLog
      logEntry.userAgent = headers['user-agent'] || 'System';

      // Extract IP address for AuditLog
      logEntry.ipAddress = ip || '0.0.0.0';
    } else {
      // Ensure these fields are always present, even without a request
      logEntry.userAgent = 'System';
      logEntry.ipAddress = '0.0.0.0';
    }

    if (data.res) {
      const { statusCode } = data.res;
      logEntry.data.statusCode = statusCode;

      // Don't store the full res object
      delete data.res;
    }

    // For API requests, log the route info
    if (logEntry.data.req && logEntry.data.req.method) {
      const { method, originalUrl } = logEntry.data.req;
      logEntry.message = `${method} ${originalUrl} ${logEntry.message}`;
    }

    // Store in DB if it's important enough (not debug logs)
    if (LOG_LEVELS[type] <= LOG_LEVELS.http) {
      // Map log type to AuditLog action and status
      const actionMap = {
        error: 'admin_action',
        warn: 'admin_action',
        info: 'admin_action',
        http: 'admin_action',
      };

      // For non-blocking DB operation, don't await
      new AuditLog({
        action: actionMap[type] || 'admin_action',
        status: type === 'error' ? 'failed' : 'success',
        message: logEntry.message,
        metadata: logEntry.data,
        userId: logEntry.userId || '000000000000000000000000', // Use a default system user ID
        userAgent: logEntry.userAgent || 'System',
        ipAddress: logEntry.ipAddress || '0.0.0.0',
      })
        .save()
        .catch((err) => {
          console.error('Error saving log to database:', err);
        });
    }

    return logEntry;
  } catch (err) {
    console.error('Error in logging system:', err);
    return null;
  }
}

// Main logger object with methods for each log level
const logger = {
  error: (message, data = {}) => {
    winstonLogger.error(message, data);
    return logToDb('error', message, data);
  },
  warn: (message, data = {}) => {
    winstonLogger.warn(message, data);
    return logToDb('warn', message, data);
  },
  info: (message, data = {}) => {
    winstonLogger.info(message, data);
    return logToDb('info', message, data);
  },
  http: (message, data = {}) => {
    winstonLogger.http(message, data);
    return logToDb('http', message, data);
  },
  debug: (message, data = {}) => {
    winstonLogger.debug(message, data);
    // Don't store debug logs in the database
    return { type: 'debug', message, data, timestamp: new Date() };
  },

  // Log HTTP requests with response time
  logRequest: (req, res, responseTime) => {
    const message = `${req.method} ${req.originalUrl} ${res.statusCode} - ${responseTime}ms`;
    const data = { req, res, responseTime };
    winstonLogger.http(message, data);
    return logToDb('http', message, data);
  },
};

module.exports = {
  logger,
};
