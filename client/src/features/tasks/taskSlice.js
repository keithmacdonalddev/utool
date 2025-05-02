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
  currentProjectId: null, // Current project context
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
 * @param {string} payload.projectId - Project ID this task belongs to (required)
 * @param {string} payload.description - Task description
 * @param {string} payload.status - Task status
 * @param {string} payload.priority - Task priority
 * @param {string} payload.dueDate - Task due date
 * @param {Array} payload.tags - Task tags
 * @returns {Promise<Object>} - Promise with the created task data
 */
export const createTask = createAsyncThunk(
  'tasks/create',
  async (
    { title, projectId, description, status, priority, dueDate, tags },
    thunkAPI
  ) => {
    try {
      // Validate required project ID
      if (!projectId) {
        return thunkAPI.rejectWithValue(
          'Project ID is required for task creation'
        );
      }

      // Make API request with all task fields to the project-scoped endpoint
      const response = await api.post(`/projects/${projectId}/tasks`, {
        title,
        description,
        status,
        priority,
        dueDate,
        tags, // Include tags in the API call
      });
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
 * Get Tasks For Project Async Thunk
 *
 * Gets tasks that belong to a specific project
 * Shows error handling and validation patterns
 *
 * @param {string} projectId - ID of the project to fetch tasks for (required)
 */
export const getTasksForProject = createAsyncThunk(
  'tasks/getForProject',
  async (projectId, thunkAPI) => {
    // VALIDATION PATTERN: Early return for invalid input
    if (!projectId) {
      return thunkAPI.rejectWithValue('Project ID is required to fetch tasks');
    }

    try {
      // Use the project-specific task route
      // API PATTERN: RESTful nested resource URL
      const response = await api.get(`/projects/${projectId}/tasks`);
      return {
        tasks: response.data.data,
        projectId,
      }; // Return the array of tasks for this project and the project ID
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
 * Special handling for completed tasks that get archived and deleted on the server.
 *
 * @param {Object} payload - Update payload
 * @param {string} payload.projectId - ID of the project the task belongs to (required)
 * @param {string} payload.taskId - ID of the task to update
 * @param {Object} payload.updates - Object with fields to update
 */
export const updateTask = createAsyncThunk(
  'tasks/update',
  async ({ projectId, taskId, updates }, thunkAPI) => {
    // Validate required fields
    if (!projectId || !taskId) {
      return thunkAPI.rejectWithValue(
        'Project ID and Task ID are required to update a task'
      );
    }

    // Check if we're marking a task as complete - this will be handled specially
    const isCompletingTask = updates.status === 'Completed';

    try {
      // URL PATTERN: Project-scoped task URL
      const response = await api.put(
        `/projects/${projectId}/tasks/${taskId}`,
        updates
      );

      // For task completion, return special payload that indicates it was completed and should be removed
      if (isCompletingTask) {
        return {
          taskId,
          projectId,
          wasCompleted: true, // Flag to indicate this task was completed and archived
          originalData: response.data.data || { _id: taskId }, // Fallback with at least the ID
        };
      }

      return response.data.data;
    } catch (error) {
      // If we're completing a task and get a 500 error, it's likely because
      // the task was archived and deleted - handle this specially
      if (isCompletingTask && error.response && error.response.status === 500) {
        console.log(
          'Task was completed and archived - removing from state',
          taskId
        );
        return {
          taskId,
          projectId,
          wasCompleted: true,
          originalData: { _id: taskId }, // Minimal data since original is gone
        };
      }

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
 * @param {Object} payload - Delete payload
 * @param {string} payload.projectId - ID of the project the task belongs to (required)
 * @param {string} payload.taskId - ID of task to delete
 * @returns {Object} - Contains taskId used for state updates
 */
export const deleteTask = createAsyncThunk(
  'tasks/delete',
  async ({ projectId, taskId }, thunkAPI) => {
    // Validate required fields
    if (!projectId || !taskId) {
      return thunkAPI.rejectWithValue(
        'Project ID and Task ID are required to delete a task'
      );
    }

    try {
      await api.delete(`/projects/${projectId}/tasks/${taskId}`);
      // Return the ID so we can filter it from state
      return { taskId };
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
 * @param {string} payload.projectId - Project ID the tasks belong to (required)
 * @param {string[]} payload.taskIds - Array of task IDs to update
 * @param {Object} payload.updates - Update object to apply to all tasks
 */
export const bulkUpdateTasks = createAsyncThunk(
  'tasks/bulkUpdate',
  async ({ projectId, taskIds, updates }, thunkAPI) => {
    // Validate required fields
    if (!projectId || !taskIds || taskIds.length === 0) {
      return thunkAPI.rejectWithValue(
        'Project ID and Task IDs are required for bulk updates'
      );
    }

    try {
      const response = await api.put(
        `/projects/${projectId}/tasks/bulk-update`,
        {
          taskIds,
          update: updates, // Note the field name difference (API expects "update")
        }
      );
      return {
        modifiedCount: response.data.modifiedCount,
        taskIds,
        projectId,
      };
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
 * @param {Object} payload - Fetch parameters
 * @param {string} payload.projectId - ID of the project the task belongs to (required)
 * @param {string} payload.taskId - ID of task to fetch
 */
export const getTask = createAsyncThunk(
  'tasks/getOne',
  async ({ projectId, taskId }, thunkAPI) => {
    // Validate required fields
    if (!projectId || !taskId) {
      return thunkAPI.rejectWithValue(
        'Project ID and Task ID are required to retrieve a task'
      );
    }

    try {
      const response = await api.get(`/projects/${projectId}/tasks/${taskId}`);
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
 * Get Recent Tasks Across All Projects
 *
 * This thunk fetches the user's most recent tasks across all their projects
 * It's used by dashboard widgets that need to display tasks regardless of project context
 *
 * @returns {Promise<Array>} - Promise with array of recent tasks
 */
export const getRecentTasks = createAsyncThunk(
  'tasks/getRecent',
  async (_, thunkAPI) => {
    try {
      // First, fetch all projects the user has access to
      const projectsResponse = await api.get('/projects');
      const projects = projectsResponse.data.data;

      if (!projects || projects.length === 0) {
        return { tasks: [] };
      }

      // Get tasks from the user's most recent projects (limit to avoid too many requests)
      const recentProjects = projects.slice(0, 3);
      const taskPromises = recentProjects.map(
        (project) =>
          api
            .get(`/projects/${project._id}/tasks`)
            .then((response) => response.data.data)
            .catch((err) => []) // Return empty array if fetching tasks for a project fails
      );

      // Wait for all task requests to complete
      const projectTasks = await Promise.all(taskPromises);

      // Flatten the arrays and add project information to each task
      const allTasks = projectTasks.flat().map((task) => ({
        ...task,
        projectName:
          recentProjects.find((p) => p._id === task.project)?.name ||
          'Unknown Project',
      }));

      // Sort by creation date (newest first)
      allTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return { tasks: allTasks };
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

    /**
     * Set current project context for tasks
     * This helps components know which project they're working with
     */
    setTaskProjectContext: (state, action) => {
      state.currentProjectId = action.payload;
    },

    /**
     * Clear tasks when switching projects or contexts
     * This prevents tasks from one project appearing in another
     */
    clearTasks: (state) => {
      state.tasks = [];
      state.currentTask = null;
    },
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

      // Get Tasks for Project Cases
      .addCase(getTasksForProject.pending, (state) => {
        state.isLoading = true; // Reuse general loading flag for now
      })
      .addCase(getTasksForProject.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        // Replace the tasks state with only the tasks for the current project
        state.tasks = action.payload.tasks;
        // Store the current project ID context
        state.currentProjectId = action.payload.projectId;
      })
      .addCase(getTasksForProject.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        state.tasks = []; // Clear tasks on error
      })

      // Update Task Cases
      .addCase(updateTask.pending, (state) => {
        state.isLoading = true;
        // Don't clear tasks while loading, preserve them
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;

        // Special handling for completed tasks that were archived
        if (action.payload.wasCompleted) {
          console.log(
            'Removing completed/archived task from Redux state:',
            action.payload.taskId
          );
          // Remove the completed task from the array based on ID
          state.tasks = state.tasks.filter(
            (t) => t._id !== action.payload.taskId
          );
          state.message = 'Task completed and archived successfully!';
        } else {
          // Standard update - replace the updated task in the array based on ID
          state.tasks = state.tasks.map((t) =>
            t._id === action.payload._id ? action.payload : t
          );
          state.message = 'Task updated successfully!';
        }
      })
      .addCase(updateTask.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload || 'Failed to update task';
        // Important: Do NOT clear tasks array on error - tasks should remain visible
        // state.tasks remains unchanged
      })

      // Delete Task Cases
      .addCase(deleteTask.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        // ARRAY FILTER PATTERN: Remove an item from an array
        state.isLoading = false;
        state.isSuccess = true;
        // Remove the deleted task from the array based on ID
        state.tasks = state.tasks.filter(
          (t) => t._id !== action.payload.taskId
        );
        state.message = 'Task deleted successfully!';
      })
      .addCase(deleteTask.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })

      // Bulk Update Cases
      .addCase(bulkUpdateTasks.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(bulkUpdateTasks.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.message = `${action.payload.modifiedCount} tasks updated successfully!`;
        // The proper way to update would be to re-fetch the tasks
        // but for now, we just set a success message
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
      })

      // Get Recent Tasks Cases
      .addCase(getRecentTasks.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getRecentTasks.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.tasks = action.payload.tasks;
      })
      .addCase(getRecentTasks.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      });
  },
});

// Export the reducer's actions
export const { resetTaskStatus, setTaskProjectContext, clearTasks } =
  taskSlice.actions;

// Export the reducer as default
export default taskSlice.reducer;
