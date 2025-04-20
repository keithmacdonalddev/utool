const { format, createLogger, transports } = require('winston');
const AuditLog = require('../models/AuditLog');

// Format for console logging with more human-readable output
const consoleFormat = format.combine(
  format.colorize({
    colors: {
      error: 'bold red',
      warn: 'bold yellow',
      info: 'green',
      http: 'cyan',
      debug: 'blue',
      verbose: 'magenta',
    },
  }),
  format.timestamp({ format: 'HH:mm:ss' }), // Shorter timestamp format
  format.printf(({ timestamp, level, message, ...meta }) => {
    // Only show detailed metadata for verbose and debug logs, or on errors
    const isDetailedLog =
      level.includes('verbose') ||
      level.includes('debug') ||
      level.includes('error') ||
      meta.showDetails === true;

    // Format the file info in a cleaner way
    const fileInfo = meta.fileInfo
      ? ` [${meta.fileInfo.split(' in ')[0]}]`
      : '';

    // Clean up the message - remove redundant file info if it's in the message
    let cleanMessage = message;
    if (fileInfo && message.includes(fileInfo.trim())) {
      cleanMessage = message.replace(fileInfo.trim(), '');
    }

    // Format metadata cleanly for human readability
    let metaString = '';
    if (isDetailedLog && Object.keys(meta).length > 0) {
      // Filter out metadata we don't want to display
      const displayMeta = { ...meta };
      delete displayMeta.fileInfo;
      delete displayMeta.showDetails;

      if (Object.keys(displayMeta).length > 0) {
        metaString = `\n  └─ ${JSON.stringify(displayMeta, null, 2)
          .replace(/{\n/g, '{ ')
          .replace(/\n}/g, ' }')
          .replace(/\n/g, '\n     ')}`;
      }
    }

    return `${timestamp} ${level}${fileInfo}: ${cleanMessage}${metaString}`;
  })
);

// Create Winston logger instance with verbose level
const winstonLogger = createLogger({
  level: process.env.NODE_ENV === 'development' ? 'verbose' : 'info', // Change to verbose in development
  format: format.combine(format.timestamp(), format.json()),
  transports: [
    new transports.Console({ format: consoleFormat }),
    // Add file transport for persistent logs in development
    ...(process.env.NODE_ENV === 'development'
      ? [
          new transports.File({
            filename: 'logs/server.log',
            format: format.combine(format.timestamp(), format.json()),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
          }),
        ]
      : []),
  ],
  exitOnError: false,
});

// Log levels with their numeric priority - add 'verbose'
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
};

// Function to log to database
async function logToDb(type, message, data = {}) {
  try {
    // Create log object with added fields for verbose logging
    const logEntry = {
      type,
      message,
      data,
      timestamp: new Date(),
      component: data.component || 'system',
      fileInfo: data.fileInfo || null,
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
      const { method, originalUrl, ip, headers, body, query, params } =
        data.req;
      logEntry.data.req = {
        method,
        originalUrl,
        ip,
        // Add request body for verbose logging (sanitize sensitive data)
        body: sanitizeRequestBody(body),
        // Add query params
        query,
        // Add route params
        params,
        headers: {
          'user-agent': headers['user-agent'] || 'Unknown',
          'content-type': headers['content-type'],
          referer: headers.referer,
          authorization: headers.authorization ? '******' : undefined,
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
      const { statusCode, body } = data.res;
      logEntry.data.statusCode = statusCode;

      // Add response body for verbose logging (with size limit)
      if (body && LOG_LEVELS[type] >= LOG_LEVELS.verbose) {
        const truncatedBody =
          typeof body === 'string'
            ? body.substring(0, 1000)
            : JSON.stringify(body).substring(0, 1000);

        logEntry.data.resBody =
          truncatedBody +
          (truncatedBody.length >= 1000 ? '...(truncated)' : '');
      }

      // Don't store the full res object
      delete data.res;
    }

    // For API requests, log the route info
    if (logEntry.data.req && logEntry.data.req.method) {
      const { method, originalUrl } = logEntry.data.req;
      logEntry.message = `${method} ${originalUrl} ${logEntry.message}`;
    }

    // Store in DB if it's important enough (not debug or verbose logs)
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

// Helper function to sanitize request body (remove passwords and sensitive data)
function sanitizeRequestBody(body) {
  if (!body) return {};

  const sanitizedBody = { ...body };

  // List of sensitive fields to redact
  const sensitiveFields = [
    'password',
    'passwordConfirm',
    'token',
    'jwt',
    'secret',
    'apiKey',
  ];

  // Redact sensitive fields
  sensitiveFields.forEach((field) => {
    if (sanitizedBody[field]) {
      sanitizedBody[field] = '******';
    }
  });

  return sanitizedBody;
}

// Helper to get the calling file and line number
function getCallerInfo() {
  const stackLines = new Error().stack.split('\n');
  // Skip first 3 lines (Error, getCallerInfo, and the logger method)
  const callerLine = stackLines[3] || '';
  const match = callerLine.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);

  if (match) {
    const [, functionName, filePath, line] = match;
    const fileNameMatch = filePath.match(/([^\/\\]+)$/);
    const fileName = fileNameMatch ? fileNameMatch[1] : filePath;
    return `${fileName}:${line} in ${functionName}`;
  }

  return null;
}

// Main logger object with methods for each log level
const logger = {
  error: (message, data = {}) => {
    data.fileInfo = getCallerInfo();
    data.showDetails = true; // Always show details for errors
    winstonLogger.error(message, data);
    return logToDb('error', message, data);
  },
  warn: (message, data = {}) => {
    data.fileInfo = getCallerInfo();
    winstonLogger.warn(message, data);
    return logToDb('warn', message, data);
  },
  info: (message, data = {}) => {
    data.fileInfo = getCallerInfo();
    winstonLogger.info(message, data);
    return logToDb('info', message, data);
  },
  http: (message, data = {}) => {
    data.fileInfo = getCallerInfo();
    winstonLogger.http(message, data);
    return logToDb('http', message, data);
  },
  verbose: (message, data = {}) => {
    data.fileInfo = getCallerInfo();
    data.showDetails = true; // Always show details for verbose logs
    winstonLogger.verbose(message, data);
    // Don't store verbose logs in the database
    return { type: 'verbose', message, data, timestamp: new Date() };
  },
  debug: (message, data = {}) => {
    data.fileInfo = getCallerInfo();
    data.showDetails = true; // Always show details for debug logs
    winstonLogger.debug(message, data);
    // Don't store debug logs in the database
    return { type: 'debug', message, data, timestamp: new Date() };
  },

  // Specialized logging for CRUD operations
  logCreate: (resourceType, resourceId, userId, data = {}) => {
    const message = `Created ${resourceType}${
      resourceId ? ` (ID: ${resourceId})` : ''
    }`;
    data.fileInfo = getCallerInfo();
    data.resourceType = resourceType;
    data.resourceId = resourceId;
    data.userId =
      userId || (data.req && data.req.user ? data.req.user.id : null);
    data.action = 'create';
    winstonLogger.info(message, data);
    return logToDb('info', message, data);
  },

  logUpdate: (resourceType, resourceId, userId, data = {}) => {
    const message = `Updated ${resourceType}${
      resourceId ? ` (ID: ${resourceId})` : ''
    }`;
    data.fileInfo = getCallerInfo();
    data.resourceType = resourceType;
    data.resourceId = resourceId;
    data.userId =
      userId || (data.req && data.req.user ? data.req.user.id : null);
    data.action = 'update';
    winstonLogger.info(message, data);
    return logToDb('info', message, data);
  },

  logDelete: (resourceType, resourceId, userId, data = {}) => {
    const message = `Deleted ${resourceType}${
      resourceId ? ` (ID: ${resourceId})` : ''
    }`;
    data.fileInfo = getCallerInfo();
    data.resourceType = resourceType;
    data.resourceId = resourceId;
    data.userId =
      userId || (data.req && data.req.user ? data.req.user.id : null);
    data.action = 'delete';
    winstonLogger.info(message, data);
    return logToDb('info', message, data);
  },

  logAccess: (resourceType, resourceId, userId, data = {}) => {
    const message = `Accessed ${resourceType}${
      resourceId ? ` (ID: ${resourceId})` : ''
    }`;
    data.fileInfo = getCallerInfo();
    data.resourceType = resourceType;
    data.resourceId = resourceId;
    data.userId =
      userId || (data.req && data.req.user ? data.req.user.id : null);
    data.action = 'access';
    winstonLogger.verbose(message, data);
    return { type: 'verbose', message, data, timestamp: new Date() };
  },

  // Log database operations
  logDbOperation: (
    operation,
    collection,
    success,
    errorDetails = null,
    data = {}
  ) => {
    const status = success ? 'successful' : 'failed';
    const message = `Database ${operation} on ${collection} ${status}`;
    data.fileInfo = getCallerInfo();
    data.dbOperation = { operation, collection, success };

    if (errorDetails) {
      data.dbOperation.error = errorDetails;
      data.showDetails = true;
      winstonLogger.error(message, data);
    } else {
      winstonLogger.info(message, data);
    }

    return logToDb(success ? 'info' : 'error', message, data);
  },

  // Log HTTP requests with response time
  logRequest: (req, res, responseTime) => {
    const message = `${req.method} ${req.originalUrl} ${res.statusCode} - ${responseTime}ms`;
    const data = { req, res, responseTime };

    // Add more verbose information for slow requests
    if (responseTime > 1000) {
      // Requests taking more than 1 second
      data.slowRequest = true;
      data.showDetails = true; // Show details for slow requests
      winstonLogger.warn(`SLOW REQUEST: ${message}`, data);
    } else {
      winstonLogger.http(message, data);
    }

    return logToDb('http', message, data);
  },

  // Stream for Morgan to use (for request logging)
  stream: {
    write: (message) => {
      // Don't add the message to the regular logs if it's just Morgan output
      if (process.env.NODE_ENV !== 'development') {
        winstonLogger.http(message.trim());
      }
    },
  },
};

module.exports = {
  logger,
};
