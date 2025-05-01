// filepath: c:\Users\macdo\Documents\Cline\mern-productivity-app\server\utils\logRotation.js
/**
 * Log Rotation Utility
 *
 * Handles automatic rotation and cleanup of log files:
 * - Compresses logs over a certain size
 * - Deletes logs older than specified retention period
 * - Creates backups with timestamp suffixes
 * - Schedules regular cleanup operations
 *
 * @module utils/logRotation
 */

import fs from 'fs';
import path from 'path';
import { createGzip } from 'zlib';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';
import { removeOldLogs } from '../middleware/enhancedLogging.js';

// ESM __dirname workaround
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define log directory path
const logsDir = path.join(__dirname, '..', 'logs');

// The maximum size a log file can reach before rotation (5MB)
const MAX_LOG_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Compresses a file using gzip
 *
 * @param {string} filePath - Path to the file to compress
 * @param {string} outputPath - Path where the compressed file will be saved
 * @returns {Promise<void>} A promise that resolves when compression is complete
 */
async function compressFile(filePath, outputPath) {
  try {
    const gzip = createGzip();
    const source = createReadStream(filePath);
    const destination = createWriteStream(outputPath);

    await pipeline(source, gzip, destination);

    logger.info(`Compressed ${filePath} to ${outputPath}`);
    return true;
  } catch (error) {
    logger.error(`Error compressing ${filePath}:`, { error });
    return false;
  }
}

/**
 * Rotates a log file if it exceeds the maximum size
 * Creates a compressed backup with timestamp
 *
 * @param {string} logPath - Path to the log file to check
 * @returns {Promise<boolean>} True if rotation was performed, false otherwise
 */
export async function rotateLogIfNeeded(logPath) {
  try {
    // Skip if file doesn't exist
    if (!fs.existsSync(logPath)) {
      return false;
    }

    const stats = fs.statSync(logPath);

    // Only rotate if the file is larger than the maximum size
    if (stats.size <= MAX_LOG_SIZE_BYTES) {
      return false;
    }

    // Generate timestamp for the rotated log
    const timestamp = new Date()
      .toISOString()
      .replace(/:/g, '-')
      .replace(/\..+/, '');

    // Parse the file name to create the backup name
    const parsedPath = path.parse(logPath);
    const compressedFileName = `${parsedPath.name}-${timestamp}${parsedPath.ext}.gz`;
    const compressedPath = path.join(parsedPath.dir, compressedFileName);

    // Compress the current log
    const compressionSuccess = await compressFile(logPath, compressedPath);

    if (compressionSuccess) {
      // Clear the original log file (don't delete, just truncate)
      fs.truncateSync(logPath, 0);
      logger.info(`Rotated log file ${logPath}`);
      return true;
    }

    return false;
  } catch (error) {
    logger.error(`Error rotating log ${logPath}:`, { error });
    return false;
  }
}

/**
 * Initializes log rotation for all log files
 */
export async function checkAllLogsForRotation() {
  try {
    logger.info('Checking logs for rotation');

    // Check if logs directory exists
    if (!fs.existsSync(logsDir)) {
      logger.warn('Logs directory does not exist');
      return;
    }

    // Get all log files
    const files = fs.readdirSync(logsDir);
    const logFiles = files.filter((file) => file.endsWith('.log'));

    // Process each log file
    for (const file of logFiles) {
      const logPath = path.join(logsDir, file);
      await rotateLogIfNeeded(logPath);
    }

    // Remove old logs
    removeOldLogs();

    logger.info('Log rotation check complete');
  } catch (error) {
    logger.error('Error during log rotation check:', { error });
  }
}

/**
 * Starts the log rotation scheduler
 *
 * @param {number} intervalHours - How often to check for log rotation (in hours)
 */
export function startLogRotationScheduler(intervalHours = 6) {
  const intervalMs = intervalHours * 60 * 60 * 1000;

  logger.info(
    `Starting log rotation scheduler to run every ${intervalHours} hours`
  );

  // Perform initial check
  checkAllLogsForRotation();

  // Schedule regular checks
  setInterval(checkAllLogsForRotation, intervalMs);
}

/**
 * Initialize log rotation on server startup
 */
export function initializeLogManagement() {
  // Create logs directory if it doesn't exist
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    logger.info('Created logs directory');
  }

  // Start the log rotation scheduler
  startLogRotationScheduler();
}
