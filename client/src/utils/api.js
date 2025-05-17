// api.js - REST API Integration with Axios
//
// KEY CONCEPTS:
// 1. Centralized API Configuration: Single instance for consistent API access
// 2. Interceptor Pattern: Modifying requests and responses globally
// 3. Authentication Integration: Automatically including auth tokens
// 4. Error Handling: Global error processing strategies
// 5. Environment Awareness: Different behavior in dev vs production

import axios from 'axios';
import { store } from '../app/store'; // Import the Redux store
import { refreshToken, logoutUser } from '../features/auth/authSlice'; // Import actions
import { toast } from 'react-toastify';
import { isLogoutInProgress } from './authState'; // Import the global logout state checker

/**
 * AXIOS INSTANCE PATTERN
 *
 * Creating a custom axios instance allows us to:
 * 1. Set default configurations that apply to all requests
 * 2. Create a consistent API interface throughout the app
 * 3. Avoid repeating configuration code in multiple components
 * 4. Centralize request/response processing
 */
const api = axios.create({
  /**
   * ENVIRONMENT-BASED CONFIGURATION
   *
   * This pattern handles different environments (development, production)
   * by checking environment variables and falling back to defaults.
   *
   * Supports:
   * - Local development (http://localhost:5000/api/v1)
   * - Production deployments (using relative paths to work with Vercel rewrites)
   * - Custom API URLs via REACT_APP_API_URL environment variable
   */
  baseURL:
    process.env.REACT_APP_API_URL || // Check for an environment variable first
    (process.env.NODE_ENV === 'production'
      ? '/api/v1' // Use relative path for production to work with Vercel rewrites
      : 'http://localhost:5000/api/v1'), // Fallback development URL

  /**
   * DEFAULT HEADERS
   *
   * Set default headers that will be included with every request.
   * Additional headers can be added per-request or via interceptors.
   */
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * NOTIFICATION HANDLER
 *
 * Centralized function to process server messages and display them to users.
 * Takes advantage of the consistent API response format from our backend.
 *
 * Example API Response:
 * {
 *   data: { ... },
 *   message: "Operation successful",
 *   notificationType: "success"
 * }
 */
const handleServerNotification = (response) => {
  // Check if the response contains a message and notification type
  if (
    response.data &&
    response.data.message &&
    response.data.notificationType
  ) {
    const { message, notificationType } = response.data;

    /**
     * TOAST NOTIFICATION PATTERN
     *
     * Using react-toastify for temporary, non-intrusive notifications.
     * The notification type from the server maps directly to toast methods:
     * - success: Green success message
     * - error: Red error message
     * - warning: Yellow warning message
     * - info: Blue informational message
     */
    toast[notificationType || 'info'](message, {
      position: 'top-right',
      autoClose: 5000,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  }
};

/**
 * REQUEST INTERCEPTOR PATTERN
 *
 * Intercepts and modifies every outgoing request before it's sent.
 * Common uses:
 * - Adding authentication headers
 * - Request logging
 * - Request transformation
 * - Adding timestamps or request IDs
 */
api.interceptors.request.use(
  (config) => {
    // IMPORTANT: Check if logout is in progress - block ALL requests except logout itself
    if (isLogoutInProgress() && !config.url.includes('/auth/logout')) {
      console.log(`Request blocked during logout: ${config.url}`);
      const error = new Error('Request canceled - logout in progress');
      error.isLogoutError = true;
      return Promise.reject(error);
    }

    /**
     * AUTHENTICATION TOKEN INJECTION
     *
     * This pattern automatically adds the JWT token to every request,
     * eliminating the need to manually add auth headers throughout the app.
     *
     * It uses the Redux store directly to access the current auth state,
     * demonstrating how to integrate Redux with API requests.
     */
    const token = store.getState().auth.token;
    // If we're making an authenticated request (to a protected endpoint)
    // but we don't have a token, AND it's not a refresh token request itself,
    // reject the request immediately.
    const isRefreshTokenRequest = config.url.includes('/auth/refresh-token');

    const isProtectedEndpoint =
      !config.url.includes('/auth/login') &&
      !config.url.includes('/auth/register') &&
      !config.url.includes('/auth/verify-email') &&
      !config.url.includes('/settings/guest-access-status'); // Add guest access status endpoint as public

    if (isProtectedEndpoint && !token && !isRefreshTokenRequest) {
      // Create a canceled request error
      const error = new Error(
        'Request canceled - no authentication token available'
      );
      error.isAuthError = true;
      return Promise.reject(error);
    }

    if (token && !isRefreshTokenRequest) {
      // Do not add Auth header to refresh token requests if it uses cookies
      // Add Authorization header if token exists (Bearer token pattern)
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    // Request error handling (network issues, etc.)
    return Promise.reject(error);
  }
);

// Variable to prevent multiple concurrent refresh attempts
let isRefreshing = false;
// Array to hold requests that are waiting for token refresh
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    /**
     * SUCCESS RESPONSE HANDLING
     *
     * Process successful responses (HTTP 2xx) before they
     * reach your components.
     */
    handleServerNotification(response);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    // Check if logout is in progress - if so, don't attempt refresh
    if (isLogoutInProgress()) {
      console.log('Logout in progress, refresh attempt skipped.');
      return Promise.reject(error);
    }

    // Handle server notifications for errors as well
    if (error.response && error.response.data) {
      handleServerNotification(error.response);
    }

    // Specific handling for 401 Unauthorized errors (potential token expiry)
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry
    ) {
      // Prevent retrying refresh token requests themselves if they fail with 401
      if (originalRequest.url.includes('/auth/refresh-token')) {
        console.error(
          'Refresh token request itself failed with 401. Logging out.'
        );
        store.dispatch(logoutUser()); // Dispatch logoutUser thunk
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // If token is already being refreshed, queue the original request
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            return api(originalRequest); // Retry with new token
          })
          .catch((err) => {
            return Promise.reject(err); // Propagate error if queue processing fails
          });
      }

      originalRequest._retry = true; // Mark that we've attempted a retry
      isRefreshing = true;

      try {
        const resultAction = await store.dispatch(refreshToken()); // Dispatch refreshToken thunk
        if (refreshToken.fulfilled.match(resultAction)) {
          const { token: newToken } = resultAction.payload;
          api.defaults.headers.common['Authorization'] = 'Bearer ' + newToken;
          originalRequest.headers['Authorization'] = 'Bearer ' + newToken;
          processQueue(null, newToken); // Process queued requests with new token
          return api(originalRequest); // Retry the original request with the new token
        } else {
          // Refresh token failed (e.g., it was invalid or expired)
          console.error('Token refresh failed:', resultAction.payload);
          processQueue(
            resultAction.payload || new Error('Token refresh failed'),
            null
          );
          store.dispatch(logoutUser()); // Dispatch logoutUser thunk
          return Promise.reject(
            resultAction.payload || new Error('Token refresh failed')
          );
        }
      } catch (refreshError) {
        console.error('Exception during token refresh:', refreshError);
        processQueue(refreshError, null);
        store.dispatch(logoutUser()); // Dispatch logoutUser thunk on critical error
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    } else if (
      error.response &&
      error.response.status === 401 &&
      originalRequest._retry
    ) {
      // If retry already happened and still 401, logout
      console.error('Token refresh retry failed. Logging out.');
      store.dispatch(logoutUser());
      return Promise.reject(error);
    }

    /**
     * PERMISSION ERROR HANDLING
     *
     * This pattern handles authorization issues (403 Forbidden),
     * redirecting to an unauthorized page.
     */
    if (error.response && error.response.status === 403) {
      console.log('Permission denied:', error.response.data.message);

      // Prevent redirect loops
      if (!window.location.pathname.includes('/unauthorized')) {
        // Redirect to unauthorized page
        setTimeout(() => {
          window.location.href = '/unauthorized';
        }, 100);
      }
    }

    /**
     * ERROR PROPAGATION
     *
     * Always reject the promise to ensure errors reach components
     * that need to handle them specifically.
     *
     * This allows for both:
     * - Global error handling (here)
     * - Component-specific error handling (in components)
     */
    return Promise.reject(error);
  }
);

export default api;
