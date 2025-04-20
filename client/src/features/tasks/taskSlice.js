// taskSlice.js - Redux Toolkit slice for managing task state
//
// KEY CONCEPTS:
// 1. Redux Toolkit: Uses modern Redux patterns with createSlice and createAsyncThunk
// 2. Thunks: Handles async operations like API calls
// 3. Immutable State Management: Updates state following immutability principles
// 4. Action Creators: Automatically generated from the slice definition
// 5. Reducers: Handle state changes based on actions
// 6. State Normalization: Organizes related data efficiently

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api'; // Use our configured axios instance

const TASK_URL = '/tasks/'; // Relative to base URL in api.js

/**
 * Initial state object for the tasks slice
 *
 * REDUX STATE DESIGN PATTERNS:
 * - Include UI state flags (isLoading, isError) alongside data
 * - Use null for single-entity references when not loaded
 * - Use arrays for collections of entities
 * - Include status messages for user feedback
 */
const initialState = {
  tasks: [], // Collection of task objects
  currentTask: null, // Currently selected/viewed task
  isError: false, // Error state flag
  isSuccess: false, // Success state flag
  isLoading: false, // Loading state flag for UI spinners/indicators
  message: '', // Message for notifications/alerts
};

/**
 * Create Task Async Thunk
 *
 * ASYNC THUNK PATTERN:
 * 1. Define a Redux action type string ('tasks/create')
 * 2. Create an async function that returns a Promise
 * 3. Handle success with resolved Promise value
 * 4. Handle errors with thunkAPI.rejectWithValue
 *
 * @param {Object} payload - Object with task properties
 * @param {string} payload.title - Task title
 * @param {string} payload.projectId - Project ID this task belongs to
 * @returns {Promise<Object>} - Promise with the created task data
 */
export const createTask = createAsyncThunk(
  'tasks/create',
  async ({ title, projectId }, thunkAPI) => {
    // Expect title and projectId
    try {
      // Make API request using our axios instance
      const response = await api.post(TASK_URL, { title, project: projectId }); // Send both
      return response.data.data; // Return the newly created task data
    } catch (error) {
      // ERROR HANDLING PATTERN: Extract message from various error response structures
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      // Use rejectWithValue to send error message to the rejected case
      return thunkAPI.rejectWithValue(message);
    }
  }
);

/**
 * Get All Tasks Async Thunk
 *
 * Pattern: No arguments needed, use _ placeholder parameter
 * Fetches all tasks for the current user from the API
 */
export const getTasks = createAsyncThunk(
  'tasks/getAll',
  async (_, thunkAPI) => {
    // No arguments needed for this specific request
    try {
      const response = await api.get(TASK_URL);
      return response.data.data; // Return the array of tasks
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

/**
 * Get Tasks For Project Async Thunk
 *
 * Gets tasks that belong to a specific project
 * Shows error handling and validation patterns
 *
 * @param {string} projectId - ID of the project to fetch tasks for
 */
export const getTasksForProject = createAsyncThunk(
  'tasks/getForProject',
  async (projectId, thunkAPI) => {
    // VALIDATION PATTERN: Early return for invalid input
    if (!projectId) {
      // No project context, return empty list
      return [];
    }
    try {
      // Use the project-specific task route
      // API PATTERN: RESTful nested resource URL
      const response = await api.get(`/projects/${projectId}/tasks`);
      return response.data.data; // Return the array of tasks for this project
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

/**
 * Update Task Async Thunk
 *
 * PARAMETER PATTERN: Use destructuring to extract required fields
 * from a single payload object for cleaner function calls
 *
 * @param {Object} payload - Update payload
 * @param {string} payload.taskId - ID of the task to update
 * @param {Object} payload.updates - Object with fields to update
 */
export const updateTask = createAsyncThunk(
  'tasks/update',
  async ({ taskId, updates }, thunkAPI) => {
    try {
      // URL PATTERN: Combine base URL with specific ID
      const response = await api.put(`${TASK_URL}${taskId}`, updates);
      return response.data.data;
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

/**
 * Delete Task Async Thunk
 *
 * DELETE PATTERN: Return the ID on success to allow
 * filtering from state in the reducer
 *
 * @param {string} taskId - ID of task to delete
 * @returns {string} taskId - Same ID, used for state updates
 */
export const deleteTask = createAsyncThunk(
  'tasks/delete',
  async (taskId, thunkAPI) => {
    try {
      await api.delete(`${TASK_URL}${taskId}`);
      // Return the ID so we can filter it from state
      return taskId;
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

/**
 * Bulk Update Tasks Async Thunk
 *
 * BATCH OPERATION PATTERN: Send multiple IDs and one update
 * More efficient than updating each task individually
 *
 * @param {Object} payload - Bulk update properties
 * @param {string[]} payload.taskIds - Array of task IDs to update
 * @param {Object} payload.updates - Update object to apply to all tasks
 */
export const bulkUpdateTasks = createAsyncThunk(
  'tasks/bulkUpdate',
  async ({ taskIds, updates }, thunkAPI) => {
    try {
      const response = await api.put('/tasks/bulk-update', {
        taskIds,
        update: updates, // Note the field name difference (API expects "update")
      });
      return { modifiedCount: response.data.modifiedCount, taskIds };
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

/**
 * Get Single Task Async Thunk
 *
 * Fetches detailed information for a single task
 * Sets the currentTask property in state
 *
 * @param {string} taskId - ID of task to fetch
 */
export const getTask = createAsyncThunk(
  'tasks/getOne',
  async (taskId, thunkAPI) => {
    try {
      const response = await api.get(`${TASK_URL}${taskId}`);
      return response.data.data;
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

/**
 * Task Slice Definition
 *
 * REDUX TOOLKIT PATTERNS:
 * 1. Slice combines reducers, action creators, and initial state
 * 2. Immutable updates handled automatically by Immer
 * 3. Actions created automatically based on reducer names
 * 4. Extra reducers handle async action states (pending/fulfilled/rejected)
 */
export const taskSlice = createSlice({
  name: 'tasks', // Namespace for actions
  initialState, // Initial state object defined above
  // Synchronous reducers
  reducers: {
    /**
     * Reset status flags
     * This reducer is useful after showing notifications
     * or when navigating between routes
     */
    resetTaskStatus: (state) => {
      // STATE UPDATE PATTERN: With Immer, we can "mutate" state directly
      // even though it's actually producing immutable updates
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = '';
    },
    // Add other specific reducers if needed (e.g., manually updating a task locally)
  },
  // Handle async action states using builder callback pattern
  extraReducers: (builder) => {
    builder
      // ASYNC REDUCER PATTERN: Handle the three states of each async action
      // Each async thunk creates three action types: pending, fulfilled, rejected

      // Create Task Cases
      .addCase(createTask.pending, (state) => {
        state.isLoading = true; // Set loading flag
      })
      .addCase(createTask.fulfilled, (state, action) => {
        // IMMUTABLE UPDATE PATTERN: Modifying arrays
        state.isLoading = false;
        state.isSuccess = true; // Indicate success for potential UI feedback
        state.tasks.push(action.payload); // Add the new task to the state array
        state.message = 'Task created successfully!'; // Optional success message
      })
      .addCase(createTask.rejected, (state, action) => {
        // ERROR HANDLING PATTERN: Store error details in state
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload; // Error message from rejectWithValue
      })

      // Get Tasks Cases
      .addCase(getTasks.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getTasks.fulfilled, (state, action) => {
        // IMMUTABLE UPDATE PATTERN: Replacing arrays
        state.isLoading = false;
        state.isSuccess = true; // Indicate success
        state.tasks = action.payload; // Replace existing tasks with fetched ones
      })
      .addCase(getTasks.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload; // Error message
        state.tasks = []; // Clear tasks on error? Or keep stale data?
      })

      // Get Tasks for Project Cases
      .addCase(getTasksForProject.pending, (state) => {
        state.isLoading = true; // Reuse general loading flag for now
      })
      .addCase(getTasksForProject.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        // Replace the tasks state with only the tasks for the current project
        // This might need adjustment if you want to cache tasks for multiple projects
        state.tasks = action.payload;
      })
      .addCase(getTasksForProject.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        state.tasks = []; // Clear tasks on error
      })

      // Update Task Cases
      .addCase(updateTask.fulfilled, (state, action) => {
        // ARRAY UPDATE PATTERN: Map to replace an item in an array
        state.isLoading = false;
        state.isSuccess = true;
        // Replace the updated task in the array based on ID
        state.tasks = state.tasks.map((t) =>
          t._id === action.payload._id ? action.payload : t
        );
      })
      .addCase(updateTask.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })

      // Delete Task Cases
      .addCase(deleteTask.fulfilled, (state, action) => {
        // ARRAY FILTER PATTERN: Remove an item from an array
        state.isLoading = false;
        state.isSuccess = true;
        // Remove the deleted task from the array based on ID
        state.tasks = state.tasks.filter((t) => t._id !== action.payload);
      })
      .addCase(deleteTask.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })

      // Bulk Update Cases
      .addCase(bulkUpdateTasks.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        // Optionally mark tasks or re-fetch
        // For more complex updates, we might want to refresh the tasks
        // by dispatching getTasks or getTasksForProject instead of
        // trying to update the local state
      })
      .addCase(bulkUpdateTasks.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })

      // Get Single Task Cases
      .addCase(getTask.pending, (state) => {
        state.isLoading = true;
        state.currentTask = null; // Clear current task while loading
      })
      .addCase(getTask.fulfilled, (state, action) => {
        // SINGLE ENTITY PATTERN: Store the current entity separately
        state.isLoading = false;
        state.isSuccess = true;
        state.currentTask = action.payload; // Store the fetched task
      })
      .addCase(getTask.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        state.currentTask = null; // Clear current task on error
      });
  },
});

// Export the reducer's actions
export const { resetTaskStatus } = taskSlice.actions;
// Export the reducer as default
export default taskSlice.reducer;
