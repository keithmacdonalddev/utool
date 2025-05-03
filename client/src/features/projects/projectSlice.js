import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api'; // Use our configured axios instance

const PROJECT_URL = '/projects/'; // Relative to base URL in api.js

// Default cache timeout (5 minutes in milliseconds)
const CACHE_TIMEOUT = 5 * 60 * 1000;

/**
 * Initial state for projects slice with caching support
 * Added lastFetched timestamp to track when data was last retrieved
 * This helps prevent redundant API calls
 */
const initialState = {
  projects: [],
  currentProject: null, // For viewing a single project later
  isError: false,
  isSuccess: false,
  isLoading: false,
  message: '',
  lastFetched: null, // Timestamp when projects were last fetched
  projectCache: {}, // Object to store individual project fetch timestamps by ID
};

/**
 * Gets all projects for the current user with cache support
 * Only fetches new data if the cache is stale or forceRefresh is true
 *
 * @param {Object} options - Optional parameters
 * @param {boolean} options.forceRefresh - Force a data refresh regardless of cache
 * @param {number} options.cacheTimeout - Custom cache timeout in ms (default: 5 minutes)
 * @returns {Promise<Array>} - Array of projects
 */
export const getProjects = createAsyncThunk(
  'projects/getAll',
  async (options = {}, thunkAPI) => {
    const { forceRefresh = false, cacheTimeout = CACHE_TIMEOUT } = options;
    const state = thunkAPI.getState().projects;

    // Check if we have recent data in the cache
    const now = Date.now();
    const cacheIsValid =
      state.lastFetched && now - state.lastFetched < cacheTimeout;

    // Use cached data if available and not forcing refresh
    if (cacheIsValid && !forceRefresh && state.projects.length > 0) {
      console.log('Using cached projects data');
      return { projects: state.projects, fromCache: true };
    }

    try {
      console.log('Fetching fresh projects data from API');
      const response = await api.get(PROJECT_URL);
      return {
        projects: response.data.data,
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

// Async thunk to create a project
export const createProject = createAsyncThunk(
  'projects/create',
  async (projectData, thunkAPI) => {
    try {
      const response = await api.post(PROJECT_URL, projectData);
      return response.data.data;
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

/**
 * Gets a single project by ID with cache support
 * Only fetches new data if the cache is stale or forceRefresh is true
 *
 * @param {string|Object} projectIdOrOptions - Project ID or options object with ID and cache settings
 * @returns {Promise<Object>} - Project data
 */
export const getProject = createAsyncThunk(
  'projects/getOne',
  async (projectIdOrOptions, thunkAPI) => {
    let projectId;
    let forceRefresh = false;
    let cacheTimeout = CACHE_TIMEOUT;

    // Handle different parameter formats (string ID or options object)
    if (typeof projectIdOrOptions === 'string') {
      projectId = projectIdOrOptions;
    } else {
      projectId = projectIdOrOptions.projectId;
      forceRefresh = projectIdOrOptions.forceRefresh || false;
      cacheTimeout = projectIdOrOptions.cacheTimeout || CACHE_TIMEOUT;
    }

    // Validate project ID
    if (!projectId) {
      return thunkAPI.rejectWithValue('Project ID is required');
    }

    const state = thunkAPI.getState().projects;
    const now = Date.now();

    // Check if this specific project is in cache and if cache is still valid
    const projectCache = state.projectCache[projectId];
    const cacheIsValid =
      projectCache && now - projectCache.lastFetched < cacheTimeout;

    // Check if we already have this project in the projects array
    const projectInList = state.projects.find((p) => p._id === projectId);

    // Use cached project if conditions are met
    if (!forceRefresh && cacheIsValid) {
      // If we have a current project and it matches the requested ID
      if (state.currentProject && state.currentProject._id === projectId) {
        console.log(`Using cached project data for ID: ${projectId}`);
        return {
          project: state.currentProject,
          fromCache: true,
        };
      }

      // If project is in projects list but not set as currentProject
      if (projectInList) {
        console.log(`Using cached project data from list for ID: ${projectId}`);
        return {
          project: projectInList,
          fromCache: true,
        };
      }
    }

    // If we need to fetch from API
    try {
      console.log(`Fetching fresh project data for ID: ${projectId}`);
      const response = await api.get(PROJECT_URL + projectId);
      return {
        project: response.data.data,
        fromCache: false,
        timestamp: now,
        projectId, // Include ID for updating projectCache
      };
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Async thunk to update a project
export const updateProject = createAsyncThunk(
  'projects/update',
  async ({ projectId, projectData }, thunkAPI) => {
    try {
      const response = await api.put(PROJECT_URL + projectId, projectData);
      return response.data.data;
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Async thunk to delete a project
export const deleteProject = createAsyncThunk(
  'projects/delete',
  async (projectId, thunkAPI) => {
    try {
      await api.delete(PROJECT_URL + projectId);
      return projectId; // Return the ID of the deleted project for removal from state
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Create the project slice
export const projectSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    resetProjectStatus: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = '';
    },
    // Add other specific reducers if needed
  },
  extraReducers: (builder) => {
    builder
      // Get Projects Cases
      .addCase(getProjects.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getProjects.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.projects = action.payload.projects; // Store fetched projects

        // Update both the global lastFetched and individual project cache entries
        if (!action.payload.fromCache) {
          state.lastFetched = action.payload.timestamp; // Update last fetched timestamp

          // Also update cache entries for each project
          action.payload.projects.forEach((project) => {
            state.projectCache[project._id] = {
              lastFetched: action.payload.timestamp,
              fromAPI: true,
            };
          });
        }
      })
      .addCase(getProjects.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        state.projects = []; // Clear on error
      })
      // Create Project Cases
      .addCase(createProject.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.projects.push(action.payload); // Add new project to the list

        // Add to project cache
        state.projectCache[action.payload._id] = {
          lastFetched: Date.now(),
          fromAPI: true,
        };
      })
      .addCase(createProject.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Get Single Project Cases
      .addCase(getProject.pending, (state) => {
        state.isLoading = true; // Or a different loading flag like isLoadingCurrent
      })
      .addCase(getProject.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;

        if (!action.payload.fromCache) {
          // Update projectCache for this specific project
          state.projectCache[action.payload.projectId] = {
            lastFetched: action.payload.timestamp,
            fromAPI: true,
          };

          // Set the fetched project
          state.currentProject = action.payload.project;

          // Also update this project in the projects array if it exists there
          const index = state.projects.findIndex(
            (p) => p._id === action.payload.projectId
          );
          if (index !== -1) {
            state.projects[index] = action.payload.project;
          }
        } else {
          // Using cached data, just set currentProject
          state.currentProject = action.payload.project;
        }
      })
      .addCase(getProject.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        state.currentProject = null;
      })
      // Update Project Cases
      .addCase(updateProject.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        // Update the project in the projects array
        const index = state.projects.findIndex(
          (p) => p._id === action.payload._id
        );
        if (index !== -1) {
          state.projects[index] = action.payload;
        }
        // Update currentProject if it's the one being edited
        if (state.currentProject?._id === action.payload._id) {
          state.currentProject = action.payload;
        }

        // Update project cache
        state.projectCache[action.payload._id] = {
          lastFetched: Date.now(),
          fromAPI: true,
        };
      })
      .addCase(updateProject.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Delete Project Cases
      .addCase(deleteProject.pending, (state) => {
        state.isLoading = true; // Or a specific deleting flag
      })
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        // Remove the project from the projects array
        state.projects = state.projects.filter((p) => p._id !== action.payload);
        // Clear currentProject if it's the one deleted
        if (state.currentProject?._id === action.payload) {
          state.currentProject = null;
        }

        // Remove from project cache
        delete state.projectCache[action.payload];
      })
      .addCase(deleteProject.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      });
  },
});

export const { resetProjectStatus } = projectSlice.actions;
export default projectSlice.reducer;
