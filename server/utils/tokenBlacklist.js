/**
 * Token Blacklist Utility
 *
 * This module provides functionality to maintain a blacklist of invalidated tokens
 * to prevent their use after logout. This improves security by ensuring tokens
 * cannot be reused after a user has explicitly logged out.
 *
 * Implementation uses an in-memory Map with token IDs and their invalidation timestamps.
 * In a production environment with multiple servers, this should be replaced with
 * a shared cache like Redis.
 */

import jwt from 'jsonwebtoken';
import { logger } from './logger.js';

// In-memory token blacklist (token ID => expiration timestamp)
// Note: In production with multiple servers, use Redis or another shared cache instead
const blacklistedTokens = new Map();

// Periodic cleanup of expired tokens (every 15 minutes)
const CLEANUP_INTERVAL = 15 * 60 * 1000;
setInterval(() => {
  cleanupExpiredTokens();
}, CLEANUP_INTERVAL);

/**
 * Blacklist a token to prevent its further use
 * @param {string} token - The JWT token to blacklist
 * @returns {boolean} - True if token was successfully blacklisted
 */
export const blacklistToken = (token) => {
  try {
    if (!token) return false;

    // Decode token to get its ID and expiration (without verification)
    const decodedToken = jwt.decode(token);
    if (!decodedToken) {
      logger.warn('Failed to blacklist invalid token format');
      return false;
    }

    // In our JWT structure, the user ID is in decodedToken.id
    // But handle both possibilities - some JWTs use 'sub' for subject
    const tokenId = decodedToken.id || decodedToken.sub;

    if (!tokenId) {
      logger.warn('Token has no ID or subject field', { token: decodedToken });
      return false;
    }

    // Calculate when this token would have expired
    // If exp is missing, use a default of 24 hours from now
    const expiration = decodedToken.exp
      ? decodedToken.exp * 1000 // Convert from seconds to milliseconds
      : Date.now() + 24 * 60 * 60 * 1000;

    // Add to blacklist with expiration
    blacklistedTokens.set(tokenId.toString(), expiration);

    logger.info(`Token blacklisted for user: ${tokenId}`, {
      userId: tokenId,
      expiration: new Date(expiration).toISOString(),
    });

    return true;
  } catch (error) {
    logger.error('Error blacklisting token', {
      error: error.message,
      stack: error.stack,
    });
    return false;
  }
};

/**
 * Check if a token is blacklisted
 * @param {string} token - The JWT token to check
 * @returns {boolean} - True if token is blacklisted
 */
export const isTokenBlacklisted = (token) => {
  try {
    if (!token) return false;

    // Decode token to get ID (without verification)
    const decodedToken = jwt.decode(token);
    if (!decodedToken) return false;

    // Check for ID in both common locations
    const tokenId = decodedToken.id || decodedToken.sub;
    if (!tokenId) return false;

    // Check if token ID exists in blacklist
    const isBlacklisted = blacklistedTokens.has(tokenId.toString());
    if (isBlacklisted) {
      logger.verbose(`Blocked blacklisted token for user: ${tokenId}`);
    }

    return isBlacklisted;
  } catch (error) {
    logger.error('Error checking token blacklist', {
      error: error.message,
      stack: error.stack,
    });
    return false; // Default to allowing the token if there's an error
  }
};

/**
 * Remove expired tokens from the blacklist
 */
export const cleanupExpiredTokens = () => {
  const now = Date.now();
  let expiredCount = 0;

  blacklistedTokens.forEach((expiration, tokenId) => {
    if (expiration < now) {
      blacklistedTokens.delete(tokenId);
      expiredCount++;
    }
  });

  if (expiredCount > 0) {
    logger.verbose(
      `Cleaned up ${expiredCount} expired tokens from blacklist. Current size: ${blacklistedTokens.size}`
    );
  }
};

/**
 * Clear the entire token blacklist (useful for testing)
 */
export const clearBlacklist = () => {
  blacklistedTokens.clear();
  logger.verbose('Token blacklist cleared');
};

/**
 * Get the current count of blacklisted tokens
 * @returns {number} - Number of tokens in the blacklist
 */
export const getBlacklistSize = () => {
  return blacklistedTokens.size;
};
