import AuditLog from '../models/AuditLog.js';
import mongoose from 'mongoose';
import { isShuttingDown } from '../utils/serverState.js';
import { UAParser } from 'ua-parser-js';
import crypto from 'crypto';

/**
 * Extracts client information from the user agent string
 * Provides detailed browser, OS, and device information for security analysis
 *
 * @param {string} userAgentString - The raw user agent string from request headers
 * @returns {Object} Parsed client information
 */
const extractClientInfo = (userAgentString) => {
  const parser = new UAParser(userAgentString);
  const result = parser.getResult();

  return {
    browser: `${result.browser.name || 'Unknown'} ${
      result.browser.version || ''
    }`.trim(),
    os: `${result.os.name || 'Unknown'} ${result.os.version || ''}`.trim(),
    device:
      result.device.type ||
      (result.device.vendor
        ? `${result.device.vendor} ${result.device.model}`
        : 'Desktop'),
    // Location will be added by IP-based lookup if configured
  };
};

/**
 * Maps action types to standardized event categories for better organization and filtering
 *
 * @param {string} action - The action being performed
 * @returns {string} The corresponding event category
 */
const mapActionToEventCategory = (action) => {
  if (
    action.includes('login') ||
    action.includes('logout') ||
    action.includes('password') ||
    action.includes('verification')
  ) {
    return 'authentication';
  }

  if (
    action.includes('create') ||
    action.includes('update') ||
    action.includes('delete')
  ) {
    return 'data_modification';
  }

  if (action.includes('retrieve') || action === 'task_retrieve') {
    return 'data_access';
  }

  if (action.includes('role') || action.includes('permission')) {
    return 'permission';
  }

  if (action.includes('admin')) {
    return 'system';
  }

  return 'system'; // Default category
};

/**
 * Determines the severity level of an audit event based on action and status
 *
 * @param {string} action - The action being performed
 * @param {string} status - The status of the action (success, failed, pending)
 * @returns {string} The severity level (info, warning, critical)
 */
const determineEventSeverity = (action, status) => {
  // Failed actions are at least warnings
  if (status === 'failed') {
    // Failed security-related actions are critical
    if (
      action.includes('login') ||
      action.includes('password') ||
      action.includes('permission') ||
      action.includes('role')
    ) {
      return 'critical';
    }
    return 'warning';
  }

  // Successful but sensitive operations
  if (status === 'success') {
    if (
      action.includes('delete') ||
      action.includes('role_change') ||
      action.includes('permission_change') ||
      action === 'account_lock'
    ) {
      return 'warning';
    }
  }

  return 'info'; // Default severity
};

/**
 * Compares before and after states of an object and identifies changed fields
 *
 * @param {Object} before - The object state before changes
 * @param {Object} after - The object state after changes
 * @returns {Object} Object containing changed fields and comparison data
 */
const compareStates = (before, after) => {
  if (!before || !after) {
    return {
      changedFields: [],
      before,
      after,
    };
  }

  const changedFields = [];

  // Get all unique keys from both objects
  const allKeys = [...new Set([...Object.keys(before), ...Object.keys(after)])];

  // Compare each field
  for (const key of allKeys) {
    // Skip functions, nested objects will be handled recursively
    if (typeof before[key] === 'function' || typeof after[key] === 'function') {
      continue;
    }

    // Skip MongoDB internal fields and sensitive fields
    if (key.startsWith('_') || key === 'password' || key === '__v') {
      continue;
    }

    // Check for missing keys or different values
    if (
      !(key in before) ||
      !(key in after) ||
      JSON.stringify(before[key]) !== JSON.stringify(after[key])
    ) {
      changedFields.push(key);
    }
  }

  return {
    changedFields,
    before: before ? JSON.parse(JSON.stringify(before)) : null,
    after: after ? JSON.parse(JSON.stringify(after)) : null,
  };
};

/**
 * Generate or retrieve a journey ID to track related user actions
 * @param {Object} req - The Express request object
 * @returns {string} A journey ID
 */
const getJourneyId = (req) => {
  // Try to get journeyId from session if available
  if (req.session?.journeyId) {
    return req.session.journeyId;
  }

  // Try to get from cookie if session isn't available
  if (req.cookies?.journeyId) {
    return req.cookies.journeyId;
  }

  // Try to get from a custom header (for API clients)
  if (req.headers['x-journey-id']) {
    return req.headers['x-journey-id'];
  }

  // Use userId and IP address to create a synthetic journey when possible
  // This helps group related actions even without sessions
  if (req.user?._id) {
    const userId = req.user._id.toString();
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // Create a deterministic journeyId based on user and current hour
    // This naturally groups user actions within a 1-hour window
    const currentHour = new Date();
    currentHour.setMinutes(0, 0, 0);

    const hourlyJourneyId = crypto
      .createHash('md5')
      .update(`${userId}-${ip}-${currentHour.toISOString()}`)
      .digest('hex');

    return hourlyJourneyId;
  }

  // Generate a new journey ID if none exists
  return crypto.randomUUID();
};

/**
 * Creates an audit log entry with enhanced information
 *
 * @param {Object} req - The Express request object
 * @param {string} action - The action being performed
 * @param {string} status - The status of the action (success, failed, pending)
 * @param {Object} metadata - Additional metadata about the action
 * @returns {Promise<void>}
 */
const auditLog = async (req, action, status, metadata = {}) => {
  try {
    // Prevent logging if shutting down or DB is not connected
    if (isShuttingDown || mongoose.connection.readyState !== 1) {
      return;
    }
    // For login/register/verification actions, userId might be passed in metadata
    // This handles the case where req.user is not set yet (during login/register)
    const userId = metadata.userId || req.user?._id;

    // Skip logging if we can't determine the user (except for auth actions that provide userId in metadata)
    // Only allow 'login', 'register', and 'verify-email' to be logged without userId
    if (!userId && !['login', 'register', 'verify-email'].includes(action)) {
      return;
    }

    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgentString = req.headers['user-agent'];

    // Get user context information if available
    const userContext = req.user
      ? {
          role: req.user.role,
          permissions: req.user.permissions || [],
        }
      : {};

    // Extract detailed client information from user agent
    const clientInfo = extractClientInfo(userAgentString);

    // Map action to standardized event category
    const eventCategory = mapActionToEventCategory(action);

    // Determine event severity level
    const severityLevel = determineEventSeverity(action, status);

    // Process state changes if provided in metadata
    let stateChanges = {};
    if (
      metadata.resourceType &&
      (metadata.before !== undefined || metadata.after !== undefined)
    ) {
      const comparison = compareStates(metadata.before, metadata.after);
      stateChanges = {
        resourceType: metadata.resourceType,
        resourceId: metadata.resourceId,
        before: comparison.before,
        after: comparison.after,
        changedFields: comparison.changedFields,
      };
    }

    // Get or generate journey ID
    const journeyId = metadata.journeyId || getJourneyId(req);

    // For login/register, allow creating audit logs without userId (use metadata.userId instead)
    await AuditLog.create({
      // Use userId from metadata or req.user if available
      ...(userId && { userId }),
      action,
      status,
      eventCategory,
      severityLevel,
      ipAddress: ip,
      userAgent: userAgentString,
      clientInfo,
      userContext,
      stateChanges:
        Object.keys(stateChanges).length > 0 ? stateChanges : undefined,
      journeyId,
      metadata: {
        ...metadata,
        endpoint: req.originalUrl,
        method: req.method,
      },
    });
  } catch (err) {
    // Suppress PoolClosedError on shutdown
    if (
      err?.name === 'MongoPoolClosedError' ||
      err?.message?.includes('PoolClosedError')
    ) {
      return;
    }
    console.error('Failed to create audit log:', err);
  }
};

/**
 * Enhanced middleware to wrap routes and auto-log success/error with before/after state capturing
 *
 * @param {string} action - The action being performed
 * @param {Object} options - Additional options for audit logging
 * @returns {Function} Express middleware function
 */
const withAuditLog = (action, options = {}) => {
  return async (req, res, next) => {
    // Save original data if available for before/after comparison
    const resourceType = options.resourceType || action.split('_')[0];
    let originalData;

    // If this is an update or delete operation, try to capture the original state
    if (
      (req.method === 'PUT' ||
        req.method === 'PATCH' ||
        req.method === 'DELETE') &&
      options.model &&
      req.params.id
    ) {
      try {
        // Fetch original data before modification
        originalData = await options.model.findById(req.params.id);
      } catch (err) {
        console.error(
          `Failed to fetch original data for audit logging: ${err.message}`
        );
      }
    }

    // Override the response.json method to capture the response data
    const originalJson = res.json;
    res.json = function (data) {
      // Store the response data
      res.auditData = data;
      // Call the original json method
      return originalJson.call(this, data);
    };

    try {
      // Wait for the next middleware to complete
      await next();

      // Log successful completion
      if (res.statusCode < 400) {
        // For create/update operations, capture the new state from the response
        const responseData = res.auditData?.data;

        await auditLog(req, action, 'success', {
          resourceType,
          resourceId: responseData?._id || req.params.id,
          before: originalData,
          after: responseData,
          // Add a description if provided in options
          description: options.description,
          severity: options.severity,
          // Add any additional metadata
          ...options.metadata,
        });
      }
    } catch (err) {
      // Log error case
      await auditLog(req, action, 'failed', {
        resourceType,
        resourceId: req.params.id,
        before: originalData,
        error: err.message,
        statusCode: err.statusCode || 500,
        // Add a description if provided in options
        description: options.description,
        severity: 'warning', // Errors are at least warnings
      });
      throw err; // Re-throw for error handler
    }
  };
};

export { auditLog, withAuditLog };
