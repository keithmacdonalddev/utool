import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api'; // Use our configured axios instance

const TASK_URL = '/tasks/'; // Relative to base URL in api.js

// Initial state for tasks
const initialState = {
  tasks: [],
  currentTask: null,
  isError: false,
  isSuccess: false,
  isLoading: false,
  message: '',
};

// Async thunk to create a new task
export const createTask = createAsyncThunk(
  'tasks/create',
  async ({ title, projectId }, thunkAPI) => {
    // Expect title and projectId
    try {
      const response = await api.post(TASK_URL, { title, project: projectId }); // Send both
      return response.data.data; // Return the newly created task data
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

// Async thunk to get user's tasks
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

// Async thunk to get tasks for a specific project
export const getTasksForProject = createAsyncThunk(
  'tasks/getForProject',
  async (projectId, thunkAPI) => {
    if (!projectId) {
      // No project context, return empty list
      return [];
    }
    try {
      // Use the project-specific task route
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

// Async thunk to update a task
export const updateTask = createAsyncThunk(
  'tasks/update',
  async ({ taskId, updates }, thunkAPI) => {
    try {
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

// Async thunk to delete a task
export const deleteTask = createAsyncThunk(
  'tasks/delete',
  async (taskId, thunkAPI) => {
    try {
      await api.delete(`${TASK_URL}${taskId}`);
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

// Async thunk for bulk updating tasks
export const bulkUpdateTasks = createAsyncThunk(
  'tasks/bulkUpdate',
  async ({ taskIds, updates }, thunkAPI) => {
    try {
      const response = await api.put('/tasks/bulk-update', {
        taskIds,
        update: updates,
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

// Async thunk to fetch a single task by ID
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

// TODO: Add thunks for updateTask, deleteTask later

// Create the task slice
export const taskSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    resetTaskStatus: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = '';
    },
    // Add other specific reducers if needed (e.g., manually updating a task locally)
  },
  extraReducers: (builder) => {
    builder
      // Create Task Cases
      .addCase(createTask.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true; // Indicate success for potential UI feedback
        state.tasks.push(action.payload); // Add the new task to the state array
        state.message = 'Task created successfully!'; // Optional success message
      })
      .addCase(createTask.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload; // Error message
      })
      // Get Tasks Cases
      .addCase(getTasks.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getTasks.fulfilled, (state, action) => {
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
        state.isLoading = false;
        state.isSuccess = true;
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
        state.isLoading = false;
        state.isSuccess = true;
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
      })
      .addCase(bulkUpdateTasks.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Get Single Task Cases
      .addCase(getTask.pending, (state) => {
        state.isLoading = true;
        state.currentTask = null;
      })
      .addCase(getTask.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.currentTask = action.payload;
      })
      .addCase(getTask.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        state.currentTask = null;
      });
    // TODO: Add cases for updateTask, deleteTask later
  },
});

export const { resetTaskStatus } = taskSlice.actions;
export default taskSlice.reducer;
