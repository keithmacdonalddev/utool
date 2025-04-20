import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api'; // Import the configured axios instance

// API endpoint paths (relative to baseURL defined in api.js)
const AUTH_URL = '/auth/';

// Get user/token from localStorage for initial state
const user = JSON.parse(localStorage.getItem('user'));
const token = localStorage.getItem('token'); // Token is likely just a string

// Define initial state
const initialState = {
  user: user ? user : null,
  token: token ? token : null,
  isError: false,
  isSuccess: false,
  isLoading: false,
  message: '',
};

// Async thunk for user registration
export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData, thunkAPI) => {
    try {
      // Use the api instance and relative path
      const response = await api.post(AUTH_URL + 'register', userData);
      // If registration is successful but requires verification,
      // we might just return the success message without user/token data yet.
      // Or, if the backend sends back user/token immediately (less common for verified flows):
      // if (response.data.token) {
      //     localStorage.setItem('user', JSON.stringify(response.data.user)); // Example persistence
      //     localStorage.setItem('token', response.data.token); // Example persistence
      // }
      return response.data; // Return the success message or user/token data
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message); // Send error message as payload
    }
  }
);

// Async thunk for user login
export const loginUser = createAsyncThunk(
  'auth/login',
  async (userData, thunkAPI) => {
    try {
      // Use the api instance and relative path
      const response = await api.post(AUTH_URL + 'login', userData);
      if (response.data.token && response.data.user) {
        // Store user and token in localStorage on successful login
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('token', response.data.token);
      }
      return response.data; // Contains user and token
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

// Async thunk for user logout
export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, thunkAPI) => {
    try {
      // If you have a backend logout endpoint, call it here:
      // await api.post(AUTH_URL + 'logout');

      // Clear user/token from localStorage on logout
      localStorage.removeItem('user');
      localStorage.removeItem('token');

      // No specific data needs to be returned, but fulfill the promise
      return true;
    } catch (error) {
      // Even if backend logout fails, we still want to clear frontend state
      // So we might not reject here, or handle differently
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      console.error('Logout error:', message);
      // Optionally reject if backend confirmation is critical
      // return thunkAPI.rejectWithValue(message);
      // For now, fulfill even if backend call fails to ensure frontend logout
      return false; // Indicate backend call failed if needed
    }
  }
);

// Async thunk for deleting user account
export const deleteUser = createAsyncThunk(
  'auth/delete',
  async (_, thunkAPI) => {
    try {
      // Call the API to delete the user
      const response = await api.delete(AUTH_URL + 'me');

      // Clear user/token from localStorage on successful deletion
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

// Create the auth slice
export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Standard reducer for resetting state (e.g., on error display)
    resetAuthStatus: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = '';
    },
    // Reducer to update user data in state directly
    updateUserInState: (state, action) => {
      if (action.payload) {
        // Merge new data into existing user state
        state.user = { ...state.user, ...action.payload };
        // Also update localStorage if user data is stored there
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Register User Cases
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        // If register returns user/token immediately:
        // state.user = action.payload.user;
        // state.token = action.payload.token;
        state.message = action.payload.message; // Display success message (e.g., "Check email")
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload; // Error message from rejectWithValue
        state.user = null;
        state.token = null;
      })
      // Login User Cases
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.user = action.payload.user; // User data from backend
        state.token = action.payload.token; // Token from backend
        state.message = ''; // Clear any previous error messages
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload; // Error message
        state.user = null;
        state.token = null;
      })
      // Logout User Cases
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isSuccess = false;
        state.message = '';
        // localStorage is cleared in the thunk itself
      })
      // Optionally handle logout pending/rejected if needed
      .addCase(logoutUser.pending, (state) => {
        state.isLoading = true; // Indicate loading during logout process
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.isLoading = false;
        // Still log out frontend state even if backend fails? Yes.
        state.user = null;
        state.token = null;
        state.isError = true;
        state.message = action.payload || 'Logout failed on server.';
        // Ensure localStorage is cleared even if backend call fails
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      })
      // Delete User Cases
      .addCase(deleteUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deleteUser.fulfilled, (state) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.user = null;
        state.token = null;
        state.message = 'User account deleted successfully.';
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload; // Error message
      });
  },
});

// Export the actions and the reducer
export const { resetAuthStatus, updateUserInState } = authSlice.actions; // Added updateUserInState
export default authSlice.reducer;
