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
import {
  hasCollectionChanged,
  deepCompareObjects,
} from '../../utils/objectUtils';

// Default cache timeout (5 minutes in milliseconds)
const CACHE_TIMEOUT = 5 * 60 * 1000;

/**
 * Initial state object for the tasks slice
 *
 * REDUX STATE DESIGN PATTERNS:
 * - Include UI state flags (isLoading, isError) alongside data
 * - Use null for single-entity references when not loaded
 * - Use arrays for collections of entities
 * - Include status messages for user feedback
 * - Cache tracking for optimized data fetching
 */
const initialState = {
  tasks: [], // Collection of task objects
  currentTask: null, // Currently selected/viewed task
  currentProjectId: null, // Current project context
  isError: false, // Error state flag
  isSuccess: false, // Success state flag
  isLoading: false, // Loading state flag for UI spinners/indicators
  message: '', // Message for notifications/alerts
  lastFetched: null, // When tasks were last fetched
  tasksByProject: {}, // Cache of tasks organized by project ID
  projectTasksTimestamps: {}, // Track last fetch time per project
  backgroundRefreshingRecent: false, // Flag for background refreshing recent tasks
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
 * Get Tasks For Project Async Thunk with caching support
 *
 * Gets tasks that belong to a specific project
 * Only fetches new data if cache is stale or forced refresh
 *
 * @param {Object} payload - Parameters object
 * @param {string} payload.projectId - ID of the project to fetch tasks for (required)
 * @param {boolean} payload.forceRefresh - Whether to bypass cache and force a refresh
 * @param {number} payload.cacheTimeout - Custom cache timeout in ms (defaults to 5 minutes)
 */
export const getTasksForProject = createAsyncThunk(
  'tasks/getForProject',
  async (payload, thunkAPI) => {
    // Handle both string projectId and object payload formats for backward compatibility
    const projectId = typeof payload === 'string' ? payload : payload.projectId;
    const options = typeof payload === 'object' ? payload : {};
    const { forceRefresh = false, cacheTimeout = CACHE_TIMEOUT } = options;

    // VALIDATION PATTERN: Early return for invalid input
    if (!projectId) {
      return thunkAPI.rejectWithValue('Project ID is required to fetch tasks');
    }

    // Check if we have valid cached data for this project
    const state = thunkAPI.getState().tasks;
    const now = Date.now();
    const projectTimestamp = state.projectTasksTimestamps[projectId];
    const cachedTasks = state.tasksByProject[projectId];
    const cacheIsValid =
      projectTimestamp &&
      now - projectTimestamp < cacheTimeout &&
      cachedTasks &&
      cachedTasks.length > 0;

    // Use cached data if available and not forcing refresh
    if (cacheIsValid && !forceRefresh) {
      console.log(`Using cached tasks for project ${projectId}`);
      return {
        tasks: cachedTasks,
        projectId,
        fromCache: true,
      };
    }

    try {
      console.log(`Fetching fresh tasks for project ${projectId} from API`);
      // Use the project-specific task route
      // API PATTERN: RESTful nested resource URL
      const response = await api.get(`/projects/${projectId}/tasks`);
      return {
        tasks: response.data.data,
        projectId,
        fromCache: false,
        timestamp: now,
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
 * Update Task Async Thunk
 *
 * PARAMETER PATTERN: Use destructuring to extract required fields
 * from a single payload object for cleaner function calls
 *
 * Special handling for completed tasks that get archived and deleted on the server.
 * Also supports optimistic updates for better UI responsiveness.
 *
 * @param {Object} payload - Update payload
 * @param {string} payload.projectId - ID of the project the task belongs to (required)
 * @param {string} payload.taskId - ID of the task to update
 * @param {Object} payload.updates - Object with fields to update
 * @param {boolean} payload.optimistic - Whether to apply optimistic update
 */
export const updateTask = createAsyncThunk(
  'tasks/update',
  async ({ projectId, taskId, updates, optimistic = false }, thunkAPI) => {
    // Validate required fields
    if (!projectId || !taskId) {
      return thunkAPI.rejectWithValue(
        'Project ID and Task ID are required to update a task'
      );
    }

    // For optimistic updates, return early with the data for immediate UI update
    if (optimistic) {
      // Get the current task from state
      const state = thunkAPI.getState();
      const existingTask = state.tasks.tasks.find((t) => t._id === taskId);

      if (!existingTask) {
        return thunkAPI.rejectWithValue(
          'Cannot apply optimistic update - task not found in state'
        );
      }

      return {
        ...existingTask,
        ...updates,
        _id: taskId,
        project: projectId,
        optimistic: true, // Flag to identify optimistic updates
      };
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
  async (options = {}, thunkAPI) => {
    const {
      forceRefresh = false,
      cacheTimeout = CACHE_TIMEOUT,
      backgroundRefresh = false,
      smartRefresh = true, // Default to smart refresh for recent tasks
    } = options;

    const state = thunkAPI.getState().tasks;
    const now = Date.now();
    const cacheIsValid =
      state.lastFetched &&
      now - state.lastFetched < cacheTimeout &&
      state.tasks &&
      state.tasks.length > 0;

    // If background refresh, smart refresh, and cache is valid, return cached data and refresh in background
    if (backgroundRefresh && smartRefresh && cacheIsValid && !forceRefresh) {
      console.log(
        'RecentTasks: Cache valid, returning cached data and queueing background refresh.'
      );
      // Dispatch a specific action or thunk for background fetching
      // We'll create a new thunk for this: fetchRecentTasksInBackground
      setTimeout(() => {
        thunkAPI.dispatch(fetchRecentTasksInBackground({ smartRefresh })); // Pass smartRefresh option
      }, 100); // Short delay to allow current call stack to clear

      return {
        tasks: state.tasks, // Return current tasks from cache
        fromCache: true,
        backgroundRefreshInitiated: true, // Indicate that a background refresh has been started
      };
    }

    // Proceed with normal fetch if not background refreshing or cache is invalid/forced
    console.log(
      forceRefresh
        ? 'RecentTasks: Force refreshing data.'
        : cacheIsValid
        ? 'RecentTasks: Cache valid, but not a background/smart refresh, or forceRefresh is true. Fetching fresh data.'
        : 'RecentTasks: Cache invalid or not present. Fetching fresh data.'
    );

    try {
      // ... existing API call logic ...
      const projectsResponse = await api.get('/projects');
      const projects = projectsResponse.data.data;

      if (!projects || projects.length === 0) {
        return { tasks: [], timestamp: now, fromCache: false };
      }

      const recentProjects = projects.slice(0, 5); // Fetch from more projects for recent view
      const taskPromises = recentProjects.map(
        (project) =>
          api
            .get(
              `/projects/${project._id}/tasks?limit=10&sortBy=createdAt:desc`
            ) // Fetch recent tasks per project
            .then((response) =>
              response.data.data.map((task) => ({
                ...task,
                projectName: project.name, // Add project name directly
              }))
            )
            .catch((err) => {
              console.error(
                `Error fetching tasks for project ${project._id}:`,
                err
              );
              return [];
            }) // Return empty array if fetching tasks for a project fails
      );

      const projectTasks = await Promise.all(taskPromises);
      let allTasks = projectTasks.flat();
      allTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      allTasks = allTasks.slice(0, 20); // Limit to overall 20 most recent tasks

      return { tasks: allTasks, timestamp: now, fromCache: false };
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
        state.isLoading = true;
      })
      .addCase(getTasksForProject.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;

        // Store tasks in the main tasks array for current view
        state.tasks = action.payload.tasks;

        // Update the project context
        state.currentProjectId = action.payload.projectId;

        // Only update cache if data was freshly fetched (not from cache)
        if (!action.payload.fromCache) {
          // Cache the tasks by project ID
          state.tasksByProject[action.payload.projectId] = action.payload.tasks;

          // Update the timestamp for this project's data
          state.projectTasksTimestamps[action.payload.projectId] =
            action.payload.timestamp;
        }
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
          // First check if this was an optimistic update
          if (action.payload.optimistic) {
            // For optimistic updates, we replace the task immediately
            state.tasks = state.tasks.map((t) => {
              if (t._id === action.payload._id) {
                return action.payload;
              }
              return t;
            });

            // No message for optimistic updates to avoid disrupting the UI
            return;
          }

          // Standard update - replace the updated task in the array based on ID
          // Only update if there are actual differences to avoid unnecessary re-renders
          state.tasks = state.tasks.map((t) => {
            if (t._id === action.payload._id) {
              // Use our deep comparison utility with excluded metadata fields
              const existingTask = { ...t };
              const newTask = { ...action.payload };

              const hasMeaningfulChanges = !deepCompareObjects(
                existingTask,
                newTask,
                ['__v', 'updatedAt', 'lastModified']
              );

              return hasMeaningfulChanges ? action.payload : t;
            }
            return t;
          });
          state.message = 'Task updated successfully!';
        }
      })
      .addCase(updateTask.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;

        // If the rejection is from a failed optimistic update, we need to restore original state
        if (
          action.payload &&
          typeof action.payload === 'object' &&
          action.payload.failedTaskId
        ) {
          // Find and revert the optimistically updated task
          state.tasks = state.tasks.map((t) => {
            if (t._id === action.payload.failedTaskId) {
              return action.payload.originalTask;
            }
            return t;
          });
          state.message = `Failed to update task: ${action.payload.message}`;
        } else {
          state.message = action.payload || 'Failed to update task';
        }
        // Important: Do NOT clear tasks array on error - tasks should remain visible
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
      .addCase(getRecentTasks.pending, (state, action) => {
        // Only set isLoading if it's not a background refresh where cache is being returned
        const isBackgroundCacheReturn =
          action.meta.arg.backgroundRefresh &&
          action.meta.arg.smartRefresh &&
          state.lastFetched &&
          Date.now() - state.lastFetched <
            (action.meta.arg.cacheTimeout || CACHE_TIMEOUT) &&
          state.tasks &&
          state.tasks.length > 0 &&
          !action.meta.arg.forceRefresh;

        if (!isBackgroundCacheReturn) {
          state.isLoading = true;
        } else {
          // If cache is being returned and background refresh is initiated,
          // we might briefly set a background flag, though the main fetch is deferred.
          // The actual backgroundRefreshingRecent will be more accurately set by fetchRecentTasksInBackground.pending
          // For now, let's ensure isLoading is false if we are returning cache.
          state.isLoading = false;
        }
        // Clear previous error/success messages related to this specific operation
        state.isError = false;
        state.message = '';
      })
      .addCase(getRecentTasks.fulfilled, (state, action) => {
        // If data came from cache and a background refresh was initiated,
        // the main state update will be handled by fetchRecentTasksInBackground.
        // We just ensure isLoading is false.
        if (
          action.payload.fromCache &&
          action.payload.backgroundRefreshInitiated
        ) {
          state.isLoading = false;
          state.isSuccess = true; // Indicate that cached data was successfully returned
          // state.backgroundRefreshingRecent might be true if the background thunk started
          return; // No further processing for main state here
        }

        // If data was fetched directly (not from cache, or cache was invalid/bypassed)
        state.isLoading = false;
        state.isSuccess = true;

        const { tasks: newTasks, timestamp } = action.payload;
        const smartRefresh =
          action.meta.arg.smartRefresh !== undefined
            ? action.meta.arg.smartRefresh
            : true;

        if (smartRefresh) {
          if (hasCollectionChanged(state.tasks, newTasks, '_id')) {
            console.log(
              'RecentTasks: Smart refresh detected changes, updating tasks.'
            );
            state.tasks = newTasks;
            state.lastFetched = timestamp;
          } else {
            console.log(
              'RecentTasks: Smart refresh detected no changes, preserving existing tasks.'
            );
            // Even if no data change, update timestamp if this was a direct fetch,
            // as it signifies a successful refresh attempt.
            state.lastFetched = timestamp;
          }
        } else {
          // If not smart refreshing, always update
          console.log('RecentTasks: Not a smart refresh, updating tasks.');
          state.tasks = newTasks;
          state.lastFetched = timestamp;
        }
        // Ensure background flag is reset if it was somehow set by this thunk's pending state
        state.backgroundRefreshingRecent = false;
      })
      .addCase(getRecentTasks.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message =
          action.payload?.message ||
          action.payload ||
          'Failed to fetch recent tasks';
        state.backgroundRefreshingRecent = false; // Ensure reset on failure
      })

      // Fetch Recent Tasks In Background Cases
      .addCase(fetchRecentTasksInBackground.pending, (state) => {
        state.backgroundRefreshingRecent = true;
        // DO NOT set state.isLoading = true for background fetches
        state.isError = false; // Clear previous errors for this specific background operation
        state.message = '';
      })
      .addCase(fetchRecentTasksInBackground.fulfilled, (state, action) => {
        state.backgroundRefreshingRecent = false;
        // No change to global isLoading or isSuccess for background updates

        const { tasks: newTasks, timestamp, smartRefresh } = action.payload;

        if (smartRefresh) {
          if (hasCollectionChanged(state.tasks, newTasks, '_id')) {
            console.log(
              'RecentTasks (Background): Smart refresh detected changes, updating tasks.'
            );
            state.tasks = newTasks;
            state.lastFetched = timestamp;
          } else {
            console.log(
              'RecentTasks (Background): Smart refresh detected no changes, preserving existing tasks.'
            );
            // Update timestamp even if no data change to reflect the background refresh time
            state.lastFetched = timestamp;
          }
        } else {
          console.log(
            'RecentTasks (Background): Not a smart refresh, updating tasks.'
          );
          state.tasks = newTasks;
          state.lastFetched = timestamp;
        }
      })
      .addCase(fetchRecentTasksInBackground.rejected, (state, action) => {
        state.backgroundRefreshingRecent = false;
        // For background errors, we typically don't set the global isError flag
        // as it might be too disruptive. Log it instead.
        console.error(
          'Error during background fetch of recent tasks:',
          action.payload?.message || action.payload
        );
        // Optionally, set a specific error message for background failures if needed for UI
        // state.message = `Background refresh failed: ${action.payload?.message || action.payload}`;
      });
  },
});

/**
 * Fetch Recent Tasks In Background Async Thunk
 *
 * This thunk is dispatched by getRecentTasks when a background refresh is needed.
 * It fetches the latest recent tasks without setting the main isLoading flag,
 * and can use smartRefresh to avoid unnecessary state updates.
 *
 * @param {Object} options - Options object.
 * @param {boolean} options.smartRefresh - Whether to perform a smart comparison before updating state.
 * @returns {Promise<Object>} - Promise with fetched tasks, timestamp, and smartRefresh flag.
 */
export const fetchRecentTasksInBackground = createAsyncThunk(
  'tasks/fetchRecentInBackground',
  async ({ smartRefresh = true } = {}, thunkAPI) => {
    const now = Date.now();
    console.log('RecentTasks (Background): Fetching fresh data.');
    try {
      const projectsResponse = await api.get('/projects');
      const projects = projectsResponse.data.data;

      if (!projects || projects.length === 0) {
        return {
          tasks: [],
          timestamp: now,
          smartRefresh,
          fromBackground: true,
        };
      }

      const recentProjects = projects.slice(0, 5);
      const taskPromises = recentProjects.map((project) =>
        api
          .get(`/projects/${project._id}/tasks?limit=10&sortBy=createdAt:desc`)
          .then((response) =>
            response.data.data.map((task) => ({
              ...task,
              projectName: project.name,
            }))
          )
          .catch((err) => {
            console.error(
              `Background fetch tasks for project ${project._id} failed:`,
              err
            );
            return [];
          })
      );

      const projectTasks = await Promise.all(taskPromises);
      let allTasks = projectTasks.flat();
      allTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      allTasks = allTasks.slice(0, 20);

      return {
        tasks: allTasks,
        timestamp: now,
        smartRefresh,
        fromBackground: true,
      };
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      console.error('RecentTasks (Background) fetch failed:', message);
      // For background errors, we might not want to blast the main error state
      // but rather just log it or handle it more subtly.
      // However, for consistency with other thunks, we'll use rejectWithValue.
      return thunkAPI.rejectWithValue({ message, fromBackground: true });
    }
  }
);

// Export the reducer's actions
export const { resetTaskStatus, setTaskProjectContext, clearTasks } =
  taskSlice.actions;

// Export the reducer as default
export default taskSlice.reducer;
