// authSlice.js - Redux state management for user authentication
// This file defines how authentication data is stored and modified in the Redux store

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'; // Redux Toolkit utilities
import api from '../../utils/api'; // Preconfigured axios instance with baseURL and interceptors

// API endpoint paths (relative to baseURL defined in api.js)
// Using a constant makes it easier to update all endpoint paths if they change
const AUTH_URL = '/auth/';

// === PERSISTED STATE RETRIEVAL ===
// Get user/token from localStorage for initial state (persists login across page refreshes)
// localStorage only stores strings, so we need to parse the stored JSON
const user = JSON.parse(localStorage.getItem('user'));
const token = localStorage.getItem('token'); // Token is stored as a plain string

// === INITIAL STATE DEFINITION ===
// Define the initial state structure for authentication
// This object structure is what will be available as state.auth in components
const initialState = {
  // Core auth data
  user: user ? user : null, // User data: null when logged out, object when logged in
  token: token ? token : null, // JWT token for API requests

  // UI state flags
  isError: false, // True when an operation results in an error
  isSuccess: false, // True when an operation completes successfully
  isLoading: false, // True when an async operation is in progress
  message: '', // Success/error message to display to the user
};

// === ASYNC THUNKS ===
// Async thunks handle side effects (API calls) and update the Redux store
// They are the recommended way to handle async logic in Redux Toolkit

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
  'auth/login',
  async (userData, thunkAPI) => {
    try {
      // Make API request to login endpoint
      const response = await api.post(AUTH_URL + 'login', userData);

      // When login is successful, we receive both user data and a JWT token
      if (response.data.token && response.data.user) {
        // Store authentication data in localStorage for persistence
        // This allows the user to remain logged in after page refresh
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('token', response.data.token);
      }

      return response.data; // Contains user object and token
    } catch (error) {
      // Standardized error handling
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

/**
 * Log out the current user
 *
 * @returns {Promise} Resolves when logout is complete
 */
export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, thunkAPI) => {
    try {
      // Optional: Call backend logout endpoint if needed
      // This might be necessary to invalidate tokens on the server
      // await api.post(AUTH_URL + 'logout');

      // Clear authentication data from localStorage
      // This prevents the user from being logged in after page refresh
      localStorage.removeItem('user');
      localStorage.removeItem('token');

      // Return true to indicate success
      return true;
    } catch (error) {
      // Even if backend logout fails, we generally want to clear frontend state
      // because forcing a user to stay logged in when they want to log out
      // is a poor UX choice
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      console.error('Logout error:', message);

      // Return false instead of rejecting so the user is still logged out
      // on the frontend even if the backend call fails
      return false;
    }
  }
);

/**
 * Delete the current user's account
 *
 * @returns {Promise} Resolves when account deletion is complete
 */
export const deleteUser = createAsyncThunk(
  'auth/delete',
  async (_, thunkAPI) => {
    try {
      // Call API to delete user account
      const response = await api.delete(AUTH_URL + 'me');

      // Clear authentication data from localStorage
      localStorage.removeItem('user');
      localStorage.removeItem('token');

      return response.data;
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
      state.isSuccess = false;
      state.isError = false;
      state.message = '';
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
      // === REGISTER USER CASES ===
      // The pending case is when the API call starts
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true; // Show loading indicator
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
      })

      // === LOGIN USER CASES ===
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true; // Show loading indicator
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false; // Hide loading indicator
        state.isSuccess = true; // Show success message/UI
        state.user = action.payload.user; // Store user data
        state.token = action.payload.token; // Store token
        state.message = ''; // Clear any previous messages
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false; // Hide loading indicator
        state.isError = true; // Show error message/UI
        state.message = action.payload; // Error message from rejectWithValue
        state.user = null; // Ensure user is null
        state.token = null; // Ensure token is null
      })

      // === LOGOUT USER CASES ===
      .addCase(logoutUser.fulfilled, (state) => {
        // Reset state to logged-out values
        state.user = null;
        state.token = null;
        state.isSuccess = false;
        state.message = '';
        // Note: localStorage is cleared in the thunk itself
      })
      .addCase(logoutUser.pending, (state) => {
        state.isLoading = true; // Show loading during logout
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.isLoading = false;
        // Still log out frontend state even if backend call fails
        // This ensures users aren't stuck logged in
        state.user = null;
        state.token = null;
        state.isError = true;
        state.message = action.payload || 'Logout failed on server.';
        // Ensure localStorage is cleared even if backend call fails
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      })

      // === DELETE USER CASES ===
      .addCase(deleteUser.pending, (state) => {
        state.isLoading = true; // Show loading indicator
      })
      .addCase(deleteUser.fulfilled, (state) => {
        state.isLoading = false; // Hide loading indicator
        state.isSuccess = true; // Show success message/UI
        state.user = null; // Clear user data
        state.token = null; // Clear token
        state.message = 'User account deleted successfully.';
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.isLoading = false; // Hide loading indicator
        state.isError = true; // Show error message/UI
        state.message = action.payload; // Error message
      });
  },
});

// Export the regular actions created by createSlice
export const { resetAuthStatus, updateUserInState } = authSlice.actions;

// Export the reducer for use in the Redux store
export default authSlice.reducer;
