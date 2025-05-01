// filepath: c:\Users\macdo\Documents\Cline\mern-productivity-app\server\middleware\enhancedLogging.js
/**
 * Enhanced Logging Middleware
 *
 * Provides improved HTTP request logging with the following features:
 * - JSON formatted logs for machine readability
 * - Request processing time measurement
 * - User ID extraction from auth tokens
 * - Request component/module tagging
 * - Separate logs for errors (4xx/5xx) vs successful requests (2xx/3xx)
 *
 * @module middleware/enhancedLogging
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import morgan from 'morgan';
import { logger } from '../utils/logger.js';

// ESM __dirname workaround
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define log directory paths
const logsDir = path.join(__dirname, '..', 'logs');
const successLogsPath = path.join(logsDir, 'access-success.log');
const errorLogsPath = path.join(logsDir, 'access-error.log');

// Create logs directory if it doesn't exist
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define writeable streams for success and error logs
const successLogStream = fs.createWriteStream(successLogsPath, { flags: 'a' });
const errorLogStream = fs.createWriteStream(errorLogsPath, { flags: 'a' });

/**
 * Extract component/module from URL path
 * This helps with filtering logs by module/component
 *
 * @param {string} url - The request URL
 * @returns {string} The extracted component name
 */
const extractComponent = (url) => {
  // Handle API versioning pattern
  if (url.includes('/api/v1/')) {
    const parts = url.split('/');
    // Extract the component after /api/v1/
    const componentIndex = parts.findIndex((part) => part === 'v1') + 1;
    return componentIndex < parts.length ? parts[componentIndex] : 'unknown';
  }

  return 'unknown';
};

/**
 * Custom Morgan token for authenticated user ID
 * Extracts the user ID from the request object if available
 */
morgan.token('user-id', (req) => {
  // Return user ID if user is authenticated
  if (req.user && req.user.id) {
    return req.user.id;
  }
  // Return anonymous if not authenticated
  return 'anonymous';
});

/**
 * Custom Morgan token for request component/module
 * Uses URL pattern to determine which component is being accessed
 */
morgan.token('component', (req) => {
  return extractComponent(req.originalUrl);
});

/**
 * Custom Morgan token for response time in milliseconds
 * More precise than the default :response-time token
 */
morgan.token('response-time-ms', (req, res) => {
  // Return the response time if available or 0
  if (!req._startTime) return '0';
  const time = new Date() - req._startTime;
  return time.toFixed(2);
});

/**
 * Custom JSON formatter for logs
 * Creates a structured JSON object for each log entry
 */
const jsonFormat = (tokens, req, res) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    ip: tokens['remote-addr'](req, res),
    userId: tokens['user-id'](req, res),
    method: tokens['method'](req, res),
    url: tokens['url'](req, res),
    status: parseInt(tokens['status'](req, res)) || 0,
    responseTime: parseFloat(tokens['response-time-ms'](req, res)),
    contentLength: tokens['res'](req, res, 'content-length') || 0,
    userAgent: tokens['user-agent'](req, res),
    component: tokens['component'](req, res),
    referer: tokens['referrer'](req, res),
  };

  return JSON.stringify(logEntry);
};

/**
 * Determine which log stream to use based on status code
 * 2xx/3xx = success log, 4xx/5xx = error log
 *
 * @param {number} status - HTTP status code
 * @returns {fs.WriteStream} The appropriate log stream
 */
const getLogStream = (status) => {
  // Use error log for 4xx and 5xx status codes
  if (status >= 400) {
    return errorLogStream;
  }
  // Use success log for 2xx and 3xx status codes
  return successLogStream;
};

/**
 * Custom writer function that writes to different log files based on status code
 */
const splitStreamWriter = (logEntry) => {
  try {
    // Parse the log entry to get the status code
    const entry = JSON.parse(logEntry);
    const stream = getLogStream(entry.status);
    stream.write(logEntry + '\n');
  } catch (error) {
    // If there's an error parsing the JSON, log to both streams
    logger.error(`Error parsing log entry: ${error.message}`, { logEntry });
    successLogStream.write(logEntry + '\n');
    errorLogStream.write(logEntry + '\n');
  }
};

/**
 * Mark the start time of the request for accurate response time calculation
 */
const requestTimeTracker = (req, res, next) => {
  req._startTime = new Date();
  next();
};

/**
 * Enhanced morgan middleware that logs in JSON format and splits by status code
 */
const accessLogger = morgan(jsonFormat, {
  skip: (req) => {
    // Skip logs for health check endpoints to reduce noise
    return (
      req.originalUrl.includes('/health') ||
      req.originalUrl.includes('/ping') ||
      req.originalUrl === '/api/v1/status'
    );
  },
  stream: {
    write: splitStreamWriter,
  },
});

/**
 * Main enhanced logging middleware that combines all features
 */
export const enhancedLogging = [requestTimeTracker, accessLogger];

/**
 * Function to remove log files older than specified days
 *
 * @param {number} days - Number of days to keep logs for
 */
export const removeOldLogs = (days = 2) => {
  const now = new Date();
  const cutoff = now.setDate(now.getDate() - days);

  logger.info(`Removing logs older than ${days} days`);

  // Get all files in logs directory
  fs.readdir(logsDir, (err, files) => {
    if (err) {
      logger.error(`Error reading logs directory: ${err.message}`, {
        error: err,
      });
      return;
    }

    // Process each file
    files.forEach((file) => {
      // Only process .log files
      if (!file.endsWith('.log')) return;

      const filePath = path.join(logsDir, file);

      fs.stat(filePath, (err, stats) => {
        if (err) {
          logger.error(`Error getting file stats: ${err.message}`, {
            error: err,
            file,
          });
          return;
        }

        // Delete files older than cutoff date
        if (stats.mtime.getTime() < cutoff) {
          fs.unlink(filePath, (err) => {
            if (err) {
              logger.error(`Error deleting old log file: ${err.message}`, {
                error: err,
                file,
              });
              return;
            }
            logger.info(`Deleted old log file: ${file}`);
          });
        }
      });
    });
  });
};
