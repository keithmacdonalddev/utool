// authSlice.js - Redux state management for user authentication
// This file defines how authentication data is stored and modified in the Redux store

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'; // Redux Toolkit utilities
import api from '../../utils/api'; // Preconfigured axios instance with baseURL and interceptors
import { resetGuestSandbox, setItems } from '../guestSandbox/guestSandboxSlice'; // Import the actions
import { createGuestItem } from '../../utils/guestDataFormatters'; // Import utility for guest items
import { generateAllSampleData } from '../../utils/guestSampleData'; // Import sample data generator
import { disconnectSocket } from '../../utils/socket'; // Import socket utility for proper cleanup

// API endpoint paths (relative to baseURL defined in api.js)
// Using a constant makes it easier to update all endpoint paths if they change
const AUTH_URL = '/auth/';

// === PERSISTED STATE RETRIEVAL ===
// Get user/token from localStorage for initial state (persists login across page refreshes)
// localStorage only stores strings, so we need to parse the stored JSON
const user = JSON.parse(localStorage.getItem('user'));
const token = localStorage.getItem('token'); // Token is stored as a plain string

// === ADDED FOR GUEST ACCESS ===
// Check for guest user state in localStorage
// Initialize guestUser from localStorage. If it doesn't exist or is invalid JSON, default to null.
let guestUser = null;
const guestUserString = localStorage.getItem('guestUser');
if (guestUserString) {
  try {
    guestUser = JSON.parse(guestUserString);
  } catch (e) {
    console.error('Failed to parse guestUser from localStorage:', e);
    localStorage.removeItem('guestUser'); // Clear invalid entry
  }
}
const guestAccessEnabled =
  localStorage.getItem('guestAccessFeatureEnabled') === 'true';

// === INITIAL STATE DEFINITION ===
// Define the initial state structure for authentication
// This object structure is what will be available as state.auth in components
const initialState = {
  // Core auth data
  user: user ? user : guestUser ? guestUser : null, // Prioritize logged-in user, then guest, then null
  token: token ? token : null, // JWT token for API requests
  isGuest: guestUser ? true : false, // Flag to indicate if the current user is a guest
  guestAccessFeatureEnabled: guestAccessEnabled, // Tracks if the guest access feature is enabled globally by admin

  // Authentication restoration state - CRITICAL for page refresh handling
  isAuthRestored: false, // Tracks if auth state has been fully restored from localStorage
  authRestorationAttempted: false, // Tracks if restoration has been attempted (prevents multiple attempts)

  // UI state flags
  isError: false, // True when an operation results in an error
  isSuccess: false, // True when an operation completes successfully
  isLoading: false, // True when an async operation is in progress
  isLoggingInUser: false, // True when specifically logging in a regular user
  isLoggingInGuest: false, // True when specifically logging in as a guest
  message: '', // Success/error message to display to the user
};

// === ASYNC THUNKS ===
// Async thunks handle side effects (API calls) and update the Redux store
// They are the recommended way to handle async logic in Redux Toolkit

/**
 * Restore authentication state from localStorage
 * This thunk ensures proper authentication state restoration on page refresh
 * and prevents race conditions with API calls during app initialization
 */
export const restoreAuthState = createAsyncThunk(
  'auth/restoreAuthState',
  async (_, thunkAPI) => {
    try {
      // Check if restoration has already been attempted to prevent multiple attempts
      const { auth } = thunkAPI.getState();
      if (auth.authRestorationAttempted) {
        return { alreadyRestored: true };
      }

      // Get stored auth data
      const storedUser = localStorage.getItem('user');
      const storedToken = localStorage.getItem('token');
      const storedGuestUser = localStorage.getItem('guestUser');
      const storedGuestAccess = localStorage.getItem(
        'guestAccessFeatureEnabled'
      );

      let restoredUser = null;
      let restoredToken = null;
      let isGuest = false;
      let guestAccessEnabled = storedGuestAccess === 'true';

      // Try to restore regular user first
      if (storedUser && storedToken) {
        try {
          restoredUser = JSON.parse(storedUser);
          restoredToken = storedToken;
          console.log(
            'Auth state restored: Regular user found in localStorage'
          );
        } catch (e) {
          console.error('Failed to parse stored user data:', e);
          localStorage.removeItem('user');
          localStorage.removeItem('token');
        }
      }

      // If no regular user, try guest user
      if (!restoredUser && storedGuestUser) {
        try {
          restoredUser = JSON.parse(storedGuestUser);
          isGuest = true;
          console.log('Auth state restored: Guest user found in localStorage');
        } catch (e) {
          console.error('Failed to parse stored guest user data:', e);
          localStorage.removeItem('guestUser');
        }
      }

      // Validate token if present (basic validation)
      if (restoredToken && !isGuest) {
        try {
          // Basic JWT structure check (should have 3 parts separated by dots)
          const tokenParts = restoredToken.split('.');
          if (tokenParts.length !== 3) {
            console.warn('Invalid token structure detected, clearing token');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            restoredToken = null;
            restoredUser = null;
          }
        } catch (e) {
          console.warn('Token validation failed, clearing token:', e);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          restoredToken = null;
          restoredUser = null;
        }
      }

      return {
        user: restoredUser,
        token: restoredToken,
        isGuest,
        guestAccessFeatureEnabled: guestAccessEnabled,
        restorationSuccessful: true,
      };
    } catch (error) {
      console.error('Auth restoration failed:', error);
      // Return empty state on error to prevent app from breaking
      return {
        user: null,
        token: null,
        isGuest: false,
        guestAccessFeatureEnabled: false,
        restorationSuccessful: false,
      };
    }
  }
);

/**
 * New Async Thunk for refreshing the access token
 */
export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, thunkAPI) => {
    try {
      // The refresh token is in an HttpOnly cookie, so no need to send it in the body/headers.
      // The server will automatically use it.
      const response = await api.post(AUTH_URL + 'refresh-token');

      if (response.data && response.data.token) {
        // Store the new access token in localStorage
        localStorage.setItem('token', response.data.token);
        // Optionally, if the response includes updated user details, update them too
        // if (response.data.user) {
        //   localStorage.setItem('user', JSON.stringify(response.data.user));
        // }
        return response.data; // Contains the new access token, potentially user data
      } else {
        // If the response is not as expected, reject.
        return thunkAPI.rejectWithValue(
          'Invalid response from refresh token endpoint'
        );
      }
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      // If refresh fails (e.g., refresh token expired or invalid), log out the user
      // Dispatching logoutUser directly from here can be complex due to thunk interactions.
      // It's often better to handle this in the component or Axios interceptor that calls refreshToken.
      // For now, we just reject, and the caller (e.g., Axios interceptor) will handle logout.
      console.error('Refresh token thunk error:', message);
      return thunkAPI.rejectWithValue(message);
    }
  }
);

/**
 * Fetches the current guest access status from the server.
 * This is used to determine if the "Continue as Guest" option should be shown,
 * and to keep the client-side flag in sync with the server.
 */
export const fetchGuestAccessStatus = createAsyncThunk(
  'auth/fetchGuestAccessStatus',
  async (_, thunkAPI) => {
    try {
      const response = await api.get('/settings/guest-access-status'); // Public endpoint

      // More defensive checks for nested properties
      if (
        response?.data?.data &&
        typeof response.data.data.guestAccessEnabled === 'boolean'
      ) {
        localStorage.setItem(
          'guestAccessFeatureEnabled',
          response.data.data.guestAccessEnabled.toString()
        );
        return response.data.data.guestAccessEnabled;
      } else {
        // If the response structure is not as expected, log and throw a detailed error
        console.warn('Unexpected response format:', response);
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString() ||
        'Unknown error';

      // It's important not to block app load if this fails, default to false
      console.error('Failed to fetch guest access status:', message);
      localStorage.setItem('guestAccessFeatureEnabled', 'false'); // Default to false on error

      // We still want to inform the application about the failure, so reject with detailed message
      return thunkAPI.rejectWithValue(
        `Failed to fetch guest access status: ${message}`
      );
    }
  }
);

/**
 * Logs in the user as a guest.
 * This does not involve a backend call for authentication but sets up a guest session locally.
 * It relies on the guestAccessFeatureEnabled flag being true.
 */
export const loginAsGuest = createAsyncThunk(
  'auth/loginAsGuest',
  async (_, thunkAPI) => {
    try {
      // Ensure guest access is actually enabled by checking the flag from the state
      const guestAccessAllowed =
        thunkAPI.getState().auth.guestAccessFeatureEnabled;
      if (!guestAccessAllowed) {
        return thunkAPI.rejectWithValue(
          'Guest access is currently disabled by the site administrator.'
        );
      }

      // Clear any existing authenticated user session first to avoid conflicts.
      // This ensures that if a real user was logged in, their session is ended before guest mode starts.
      localStorage.removeItem('user');
      localStorage.removeItem('token'); // Create a guest user object. This object structure should be consistent with
      // what an authenticated user object might look like, at least for common fields like _id, name, role.
      const guestUserData = {
        _id: `guest_client_${Date.now()}_${
          crypto.randomUUID
            ? crypto.randomUUID()
            : Math.random().toString(36).substring(2, 15)
        }`,
        name: 'Guest User',
        role: 'Guest',
        // Add any other default properties a guest user might need for the UI or client-side logic.
        // For example, default preferences or an indicator that data is not saved.
        isTemporary: true,
      }; // Persist the guest user object in localStorage so that guest sessions can survive page refreshes.      localStorage.setItem('guestUser', JSON.stringify(guestUserData));
      // Guests do not have a JWT token.

      try {
        // Generate all sample data for various entity types
        const sampleData = generateAllSampleData();

        // Add each type of sample data to the guest sandbox
        Object.entries(sampleData).forEach(([entityType, items]) => {
          if (items && items.length > 0) {
            thunkAPI.dispatch(
              setItems({
                entityType,
                items,
              })
            );
            console.log(
              `Added sample ${entityType} data for guest user:`,
              items.length,
              'items'
            );
          }
        });
      } catch (error) {
        // If sample data loading fails, log the error but don't fail the login
        console.error('Error loading sample data for guest user:', error);
      }

      return guestUserData; // This will be the action.payload in the fulfilled reducer.
    } catch (error) {
      // Catch any unexpected errors during the guest login process.
      const message = error.message || error.toString();
      console.error('Error during loginAsGuest:', message);
      return thunkAPI.rejectWithValue(
        'Could not start guest session. Please try again.'
      );
    }
  }
);

/**
 * Register a new user
 * createAsyncThunk creates an action creator that returns a Promise
 * The Promise lifecycle (pending/fulfilled/rejected) is handled automatically
 *
 * @param {Object} userData - Registration form data (name, email, password)
 * @returns {Promise} With the server response data
 */
export const registerUser = createAsyncThunk(
  'auth/register', // Action type prefix
  async (userData, thunkAPI) => {
    try {
      // Make API request to register endpoint
      const response = await api.post(AUTH_URL + 'register', userData);

      // Most registration flows require email verification, so we typically
      // don't store auth tokens at this point
      // If your app doesn't use email verification, you might store tokens here instead:
      // if (response.data.token) {
      //     localStorage.setItem('user', JSON.stringify(response.data.user));
      //     localStorage.setItem('token', response.data.token);
      // }

      return response.data; // Return the success message or user data
    } catch (error) {
      // Error handling - extract message from the error response
      // This standardized approach ensures consistent error handling across thunks
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();

      // rejectWithValue sends the error message as the action payload
      // This will be available in the rejected case handler in the slice
      return thunkAPI.rejectWithValue(message);
    }
  }
);

/**
 * Log in an existing user
 *
 * @param {Object} userData - Login credentials (email, password)
 * @returns {Promise} With the user data and authentication token
 */
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/login', userData);
      // The backend now sends { success: true, token: '...', user: { ... } }
      // So, response.data will be this object.
      return response.data; // This will be { success, token, user }
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return rejectWithValue(message);
    }
  }
);

/**
 * Log out the current user
 *
 * @returns {Promise} Resolves when logout is complete
 */
export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, thunkAPI) => {
    try {
      disconnectSocket();

      const { auth } = thunkAPI.getState();
      if (auth.isGuest && auth.user && auth.user._id) {
        try {
          await api.put(`/api/v1/analytics/guest-session/${auth.user._id}/end`);
        } catch (error) {
          console.error('Error ending guest session:', error);
        }
      }

      const { executeSecureLogout } = await import('../../utils/authState');

      // For authenticated users, make the API call to the server.
      // The server will clear the HttpOnly refresh token cookie.
      if (!auth.isGuest) {
        await api.get(AUTH_URL + 'logout'); // Changed to GET to match route, if it was POST, adjust server route or this.
        // Assuming the plan meant to call the existing logout which is GET.
        // If a new POST logout is made for clearing cookies, this should be POST.
      }

      executeSecureLogout(); // Clears client-side access token and user from localStorage and Redux state.
      thunkAPI.dispatch(resetGuestSandbox());

      return true;
    } catch (error) {
      disconnectSocket();
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      console.error('Logout error:', message);

      const { executeSecureLogout } = await import('../../utils/authState');
      executeSecureLogout();
      thunkAPI.dispatch(resetGuestSandbox());

      return false;
    }
  }
);

// Ensure deleteUser is defined if it was intended to be used.
// If it was a copy-paste error and not needed, these cases should be removed.
// Assuming it IS a thunk that should exist:
export const deleteUser = createAsyncThunk(
  'auth/delete', // Action type prefix
  async (_, thunkAPI) => {
    try {
      // Example: API call to delete the user
      await api.delete(AUTH_URL + 'me'); // Assuming 'me' is the endpoint for the current user

      // Clear local storage upon successful deletion
      localStorage.removeItem('user');
      localStorage.removeItem('token');

      return true; // Indicate success
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// === SLICE DEFINITION ===
// A "slice" is a collection of Redux reducer logic and actions for a single feature
/**
 * Authentication slice for Redux store
 * This defines how authentication state changes in response to actions
 */
export const authSlice = createSlice({
  name: 'auth', // Slice name, used in action types
  initialState, // The initial state defined above

  // Regular reducers - synchronous functions that modify state
  // Called directly with dispatch(actionName())
  reducers: {
    // Reset UI status flags (typically after showing success/error messages)
    resetAuthStatus: (state) => {
      state.isLoading = false;
      state.isLoggingInUser = false;
      state.isLoggingInGuest = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = '';
    },
    // Action to clear guest user data. This can be dispatched when a guest explicitly exits guest mode,
    // or when a real user logs in, or if guest access is disabled while a guest is active.
    clearGuestUser: (state) => {
      state.user = null; // Clear the user from Redux state.
      state.isGuest = false; // Set the guest flag to false.
      localStorage.removeItem('guestUser'); // Remove guest data from localStorage.
      // We don't clear guestAccessFeatureEnabled from Redux state or localStorage here,
      // as it reflects a global setting fetched from the server, not session state.
      // If a message is needed, it should be set by the calling action/thunk.
    },

    // Update user data in state (e.g., after profile update)
    // Called with dispatch(updateUserInState(updatedData))
    updateUserInState: (state, action) => {
      if (action.payload) {
        // Update user state by merging new data with existing data
        // Object spread ensures all existing properties are preserved
        state.user = { ...state.user, ...action.payload };

        // Also update localStorage to persist changes
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    },
  },

  // Extra reducers handle actions defined outside the slice
  // In this case, these handle the async thunk actions defined above
  extraReducers: (builder) => {
    builder
      // === RESTORE AUTH STATE CASES ===
      .addCase(restoreAuthState.pending, (state) => {
        // Mark that restoration is being attempted to prevent duplicate calls
        state.authRestorationAttempted = true;
        // Don't set isLoading to true here to avoid showing loading indicators during initialization
      })
      .addCase(restoreAuthState.fulfilled, (state, action) => {
        const {
          user,
          token,
          isGuest,
          guestAccessFeatureEnabled,
          restorationSuccessful,
          alreadyRestored,
        } = action.payload;

        // Mark restoration as completed regardless of success
        state.isAuthRestored = true;
        state.authRestorationAttempted = true;

        // Only update state if restoration was successful and wasn't already restored
        if (restorationSuccessful && !alreadyRestored) {
          state.user = user;
          state.token = token;
          state.isGuest = isGuest;
          state.guestAccessFeatureEnabled = guestAccessFeatureEnabled;

          console.log('Auth state restoration completed successfully:', {
            hasUser: !!user,
            hasToken: !!token,
            isGuest,
            userId: user?._id || user?.id,
          });
        } else if (alreadyRestored) {
          console.log('Auth state restoration skipped - already restored');
        } else {
          console.log(
            'Auth state restoration completed - no stored auth data found'
          );
        }
      })
      .addCase(restoreAuthState.rejected, (state, action) => {
        // Mark restoration as completed even if it failed
        state.isAuthRestored = true;
        state.authRestorationAttempted = true;

        // Ensure clean state on restoration failure
        state.user = null;
        state.token = null;
        state.isGuest = false;
        state.guestAccessFeatureEnabled = false;

        console.error('Auth state restoration failed:', action.payload);
      })

      // === REFRESH TOKEN CASES ===
      .addCase(refreshToken.pending, (state) => {
        // Optionally set a loading state for token refresh if needed for UI feedback
        // state.isRefreshingToken = true;
      })
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.token = action.payload.token; // Update the access token in Redux state
        // if (action.payload.user) { // If user data is also sent back
        //   state.user = action.payload.user;
        // }
        // state.isRefreshingToken = false;
      })
      .addCase(refreshToken.rejected, (state, action) => {
        // If refresh token fails, the interceptor should handle logout.
        // We might clear the token here as a defensive measure, but the primary
        // logout flow (clearing user, etc.) is usually handled by logoutUser.
        state.token = null;
        // state.isRefreshingToken = false;
        // state.isError = true; // Potentially set error state
        // state.message = action.payload; // Store error message
        console.error('Refresh token rejected in slice:', action.payload);
        // Consider dispatching logoutUser or a specific action to handle session termination
        // For now, this is handled by the Axios interceptor which will dispatch logoutUser.
      })
      // === REGISTER USER CASES ===
      // The pending case is when the API call starts
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true; // Show loading indicator
        // If a guest was active, clear them out upon registration attempt to prevent state conflicts.
        if (state.isGuest) {
          state.user = null;
          state.isGuest = false;
          localStorage.removeItem('guestUser');
        }
      })
      // The fulfilled case is when the API call succeeds
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false; // Hide loading indicator
        state.isSuccess = true; // Show success message/UI
        // Don't set user/token if verification is required
        // state.user = action.payload.user;
        // state.token = action.payload.token;
        state.message = action.payload.message; // "Check email for verification link"
      })
      // The rejected case is when the API call fails
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false; // Hide loading indicator
        state.isError = true; // Show error message/UI
        state.message = action.payload; // Error message from rejectWithValue
        state.user = null; // Ensure user is null
        state.token = null; // Ensure token is null
      }) // === LOGIN USER CASES ===
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.isSuccess = false;
        state.message = '';
        state.user = null; // Explicitly set user to null on pending
        state.token = null; // Explicitly set token to null on pending
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        // action.payload is now { success: true, token: '...', user: { ... } }
        state.user = action.payload.user; // Correctly access user object
        state.token = action.payload.token; // Correctly access token
        state.isError = false;
        state.message = action.payload.message || 'Login successful'; // Use message from payload if available

        // Store user and token in localStorage
        if (action.payload.user) {
          localStorage.setItem('user', JSON.stringify(action.payload.user));
        }
        if (action.payload.token) {
          localStorage.setItem('token', action.payload.token);
        }
        // connectSocket(); // Socket connection is handled in App.js based on token presence
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload || 'Login failed'; // Use action.payload directly
        state.user = null;
        state.token = null; // Clear token on rejection
        // disconnectSocket(); // Socket disconnection is handled in App.js
        // Clear localStorage on failed login
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      })

      // === LOGOUT USER CASES ===
      .addCase(logoutUser.pending, (state) => {
        state.isLoading = true; // Show loading during logout
      })
      .addCase(logoutUser.fulfilled, (state) => {
        // Reset state to logged-out values for an authenticated user.
        state.user = null;
        state.token = null;
        state.isGuest = false; // Ensure guest flag is false on logout of an authenticated user.
        state.isSuccess = false;
        state.message = '';
        // Note: localStorage is cleared in the thunk itself
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.isLoading = false;
        // Still log out frontend state even if backend call fails for an authenticated user.
        state.user = null;
        state.token = null;
        state.isGuest = false; // Ensure guest flag is false.
        state.isError = true;
        state.message = action.payload || 'Logout failed on server.';
        // Ensure localStorage is cleared even if backend call fails
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      })
      // === DELETE USER CASES ===
      .addCase(deleteUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deleteUser.fulfilled, (state) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.user = null;
        state.token = null;
        state.isGuest = false;
        state.message = 'User account deleted successfully.';
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // === FETCH GUEST ACCESS STATUS CASES ===
      .addCase(fetchGuestAccessStatus.pending, (state) => {
        state.isLoading = true; // Indicate loading while fetching status.
        state.isError = false; // Reset error state for this specific action
        state.message = ''; // Clear previous messages
      })
      .addCase(fetchGuestAccessStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        state.guestAccessFeatureEnabled = action.payload; // Update the global flag based on server response.
        // If guest access has just been disabled by an admin AND a guest user is currently active,
        // we need to log out the guest user to enforce the new setting immediately.
        if (!action.payload && state.isGuest) {
          state.user = null; // Clear guest user from state
          state.isGuest = false; // Set guest flag to false
          localStorage.removeItem('guestUser'); // Remove guest data from localStorage
          state.message =
            'Guest access has been disabled by an administrator. You have been logged out from guest mode.';
          state.isSuccess = true; // Indicate a change occurred, message explains it.
        }
      })
      .addCase(fetchGuestAccessStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.guestAccessFeatureEnabled = false; // Default to false on error to be safe.
        state.isError = true;
        state.message =
          action.payload ||
          'Could not verify guest access status from the server.';
        // If a guest user is currently active and we failed to confirm guest access status,
        // it's safer to log out the guest to prevent unintended access.
        if (state.isGuest) {
          state.user = null;
          state.isGuest = false;
          localStorage.removeItem('guestUser');
          state.message +=
            ' You have been logged out from guest mode as a precaution.';
        }
      }) // === LOGIN AS GUEST CASES ===
      .addCase(loginAsGuest.pending, (state) => {
        state.isLoading = true;
        state.isLoggingInGuest = true; // Specific flag for guest login
        // Before logging in as guest, ensure any existing authenticated user state is cleared.
        state.user = null;
        state.token = null;
        state.isGuest = false; // Set to false initially, will be true on success.
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        // Also clear any previous guestUser from localStorage to start fresh.
        localStorage.removeItem('guestUser');
        console.log('loginAsGuest.pending: Clearing user and token state');
      })
      .addCase(loginAsGuest.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isLoggingInGuest = false; // Reset specific flag
        state.isSuccess = true;
        state.user = action.payload; // Set user to the guest user object from the thunk.
        state.token = null; // Guests do not have JWT tokens.
        state.isGuest = true; // Explicitly set the guest flag to true.
        state.message =
          'Successfully logged in as Guest. Your changes will not be saved.';
        console.log(
          'loginAsGuest.fulfilled: Setting guest user state:',
          action.payload
        );
      })
      .addCase(loginAsGuest.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload; // Error message from thunk (e.g., "Guest access is currently disabled").
        state.user = null; // Ensure no user is set.
        state.token = null;
        state.isGuest = false; // Ensure guest flag is false.
        console.log(
          'loginAsGuest.rejected: Error during guest login:',
          action.payload
        );
      });
  },
});

// Export the regular actions created by createSlice
export const { resetAuthStatus, updateUserInState, clearGuestUser } =
  authSlice.actions;

// Selectors
export const selectCurrentUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) =>
  !!state.auth.user && !!state.auth.token;
export const selectIsGuest = (state) => state.auth.isGuest;

// Export the reducer for use in the Redux store
export default authSlice.reducer;
