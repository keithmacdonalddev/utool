/**
 * Global Authentication State Manager
 *
 * This module provides global flags and utilities to track authentication state
 * across the application. It's particularly useful for preventing API requests
 * during logout transitions.
 */

// Global flag that indicates a logout is in progress
let isLoggingOut = false;

/**
 * Set the application's logging out state
 * @param {boolean} status - Whether a logout is in progress
 */
export const setLoggingOut = (status) => {
  isLoggingOut = status;
  console.log(`Auth state: Logout in progress = ${status}`);
};

/**
 * Check if the application is currently in logout state
 * @returns {boolean} - True if logout is in progress
 */
export const isLogoutInProgress = () => {
  return isLoggingOut;
};

/**
 * Execute a logout with safety measures
 * This ensures all API requests are blocked before clearing auth state
 */
export const executeSecureLogout = () => {
  // Set global flag first to block all new requests
  setLoggingOut(true);

  // Small delay to ensure any in-flight requests complete
  setTimeout(() => {
    // Clear authentication data
    localStorage.removeItem('user');
    localStorage.removeItem('token');

    // Redirect to login page
    window.location.href = '/login';
  }, 50);
};
