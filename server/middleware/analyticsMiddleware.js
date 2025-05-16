import asyncHandler from './async.js';
import Analytics from '../models/Analytics.js';
import crypto from 'crypto';

/**
 * Anonymizes an IP address by hashing it with a server secret
 * This provides analytics capabilities while maintaining privacy
 *
 * @param {string} ipAddress - The IP address to anonymize
 * @returns {string} The hashed representation of the IP address
 */
const anonymizeIp = (ipAddress) => {
  // Guard against null or undefined IP addresses
  if (!ipAddress) return 'unknown-ip';

  try {
    const hash = crypto.createHash('sha256');
    // Use an environment variable for the salt in production
    // IMPORTANT: IP_HASH_SALT must be a strong, unique secret and never committed to the repository
    const salt = process.env.IP_HASH_SALT || 'default-salt-for-development';
    return hash.update(`${ipAddress}${salt}`).digest('hex');
  } catch (error) {
    console.error('Error anonymizing IP address:', error);
    return 'error-hashing-ip';
  }
};

/**
 * Sanitizes a URL to remove sensitive information like tokens or IDs
 *
 * @param {string} url - The URL to sanitize
 * @returns {string} The sanitized URL
 */
const sanitizeUrl = (url) => {
  if (!url) return '/unknown';

  try {
    // Replace query parameters containing sensitive information
    // e.g., /api/resource?token=abc123 becomes /api/resource?token=[REDACTED]
    return url.replace(
      /(\b(token|password|key|secret|auth)\b=)[^&]+/gi,
      '$1[REDACTED]'
    );
  } catch (error) {
    console.error('Error sanitizing URL:', error);
    return '/error-sanitizing-url';
  }
};

/**
 * Middleware to track guest sessions and page views
 * Only tracks guest users, not authenticated users
 * Uses atomic operations to prevent race conditions
 */
export const trackGuestActivity = asyncHandler(async (req, res, next) => {
  // Only track guest users
  if (req.user && req.user.isGuest) {
    const sessionId = req.user._id;
    // Apply defensive programming to handle missing headers
    const userAgent =
      req.headers && req.headers['user-agent']
        ? req.headers['user-agent']
        : 'unknown-agent';
    const ipAddressHash = anonymizeIp(req.ip);
    const currentTime = new Date(); // Use same timestamp for consistency

    try {
      // Store the current URL, filtering out sensitive information
      const sanitizedUrl = sanitizeUrl(req.originalUrl);

      // Using atomic findOneAndUpdate with upsert to avoid race conditions
      // The $setOnInsert operator only sets fields when the document is created (upsert)
      await Analytics.findOneAndUpdate(
        { sessionId },
        {
          $setOnInsert: {
            // These fields only set when document is created
            userAgent,
            ipAddressHash,
            startTime: currentTime, // Set time explicitly on insert for accuracy
          },
          $push: {
            events: {
              type: 'PAGE_VIEW',
              path: sanitizedUrl,
              timestamp: currentTime, // Set explicitly rather than using default
            },
          },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
          // Use write concern for important analytics data
          writeConcern: { w: 'majority', wtimeout: 5000 },
        }
      );
    } catch (error) {
      // Don't block the request if analytics fails
      // Ensure these logs are captured by your production logging system
      console.error('Analytics middleware error:', error);
    }
  }

  next();
});

/**
 * Function to log guest write attempts
 * To be called from controllers when a guest attempts a restricted action
 *
 * @param {Object} req - Express request object
 * @param {string} feature - The feature the guest attempted to access
 * @returns {Promise<void>}
 */
export const logGuestWriteAttempt = async (req, feature) => {
  if (req.user && req.user.isGuest) {
    const currentTime = new Date();

    try {
      await Analytics.findOneAndUpdate(
        { sessionId: req.user._id },
        {
          $push: {
            events: {
              type: 'FEATURE_ATTEMPT',
              path: sanitizeUrl(req.originalUrl),
              timestamp: currentTime,
              details: {
                feature,
                method: req.method,
                statusCode: 403, // Standard status code for forbidden actions
              },
            },
          },
        },
        {
          // If session document doesn't exist (rare edge case), create it
          upsert: true,
          // Use write concern for important analytics data
          writeConcern: { w: 'majority', wtimeout: 5000 },
        }
      );
    } catch (error) {
      // Log but don't fail the request if analytics logging fails
      console.error('Write attempt logging error:', error);
    }
  }
};

/**
 * Function to log errors encountered by guest users
 * To be called from global error handlers or specific error routes
 *
 * @param {Object} req - Express request object
 * @param {Error} error - The error object
 * @param {number} statusCode - HTTP status code
 * @returns {Promise<void>}
 */
export const logGuestError = async (req, error, statusCode) => {
  if (req.user && req.user.isGuest) {
    try {
      await Analytics.findOneAndUpdate(
        { sessionId: req.user._id },
        {
          $push: {
            events: {
              type: 'ERROR',
              path: sanitizeUrl(req.originalUrl),
              timestamp: new Date(),
              details: {
                statusCode,
                // Don't log full error details in production to avoid leaking sensitive info
                // Just log a safe message for analytics purposes
                message:
                  process.env.NODE_ENV === 'production'
                    ? 'Server error encountered'
                    : error.message || 'Unknown error',
              },
            },
          },
        }
      );
    } catch (logError) {
      console.error('Error logging guest error:', logError);
    }
  }
};
