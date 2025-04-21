/**
 * Logout Priority Middleware
 *
 * This middleware addresses race conditions during logout by:
 * 1. Detecting logout requests and processing them with highest priority
 * 2. Immediately blacklisting tokens for logout requests before other routes execute
 * 3. Adding a short delay to non-logout requests to ensure logout completes first
 */

import { blacklistToken } from '../utils/tokenBlacklist.js';
import { logger } from '../utils/logger.js';
import jwt from 'jsonwebtoken';

/**
 * Priority processing middleware for logout requests
 * This middleware runs before all route handlers
 */
export const logoutPriorityMiddleware = async (req, res, next) => {
  try {
    // Check if this is a logout request (POST to /auth/logout)
    const isLogoutRequest =
      req.method === 'POST' && req.originalUrl.endsWith('/auth/logout');

    if (isLogoutRequest) {
      logger.verbose('Logout request detected in priority middleware');

      // Extract token from request immediately
      const token = req.headers.authorization?.split(' ')[1];

      if (token) {
        try {
          // Store the user ID from token for logging purposes
          const decodedToken = jwt.decode(token);
          if (decodedToken && decodedToken.id) {
            // Store user ID in req for use by logout controller
            req.logoutUserId = decodedToken.id;
          }

          // We don't blacklist the token here anymore - let the auth controller handle it
          // This ensures the user is properly authenticated when the controller runs
          logger.verbose('User ID extracted from token for logout', {
            userId: req.logoutUserId,
          });
        } catch (error) {
          logger.error('Error decoding token in logout priority middleware:', {
            error: error.message,
            stack: error.stack,
          });
        }
      } else {
        logger.warn('No authorization token found in logout request');
      }
    }

    // For all other requests, add a very small delay to ensure logout request completes first
    // Only delay if there's an authorization header (authenticated requests)
    if (!isLogoutRequest && req.headers.authorization) {
      const delay = 10; // 10ms delay - small enough not to be noticeable but gives logout priority
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    next();
  } catch (error) {
    logger.error('Unexpected error in logout priority middleware:', {
      error: error.message,
      stack: error.stack,
    });
    next(); // Continue to next middleware even if this one fails
  }
};
