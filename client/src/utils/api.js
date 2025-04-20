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
import { toast } from 'react-toastify';

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
   * - Production deployments (https://utool.onrender.com/api/v1)
   * - Custom API URLs via REACT_APP_API_URL environment variable
   */
  baseURL:
    process.env.REACT_APP_API_URL || // Check for an environment variable first
    (process.env.NODE_ENV === 'production'
      ? 'https://utool.onrender.com/api/v1' // Fallback production URL
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

    if (token) {
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

/**
 * RESPONSE INTERCEPTOR PATTERN
 *
 * Intercepts and processes every response before it reaches your components.
 * Allows for:
 * - Global error handling
 * - Response transformation
 * - Automatic notifications
 * - Authentication state management
 */
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
  (error) => {
    /**
     * ERROR RESPONSE HANDLING
     *
     * Centralized error processing pattern allows handling common
     * error scenarios once, instead of in every component.
     */

    // Display error notifications from server
    if (error.response && error.response.data) {
      handleServerNotification(error.response);
    }

    /**
     * AUTHENTICATION ERROR HANDLING
     *
     * This pattern handles expired or invalid tokens (401 Unauthorized),
     * automatically redirecting to the login page.
     *
     * Security benefits:
     * - Prevents unauthorized access attempts
     * - Handles token expiration gracefully
     * - Improves user experience by explaining session timeouts
     */
    if (error.response && error.response.status === 401) {
      // Prevent redirect loops by checking current path
      if (!window.location.pathname.includes('/login')) {
        console.log('Authentication error detected, redirecting to login');

        // Security practice: Clear potentially compromised auth data
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        // Redirect to login page with context
        setTimeout(() => {
          window.location.href = '/login?session=expired';
        }, 100);
      }
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
