import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api'; // Use our configured axios instance
import {
  deepCompareObjects,
  hasCollectionChanged,
} from '../../utils/objectUtils';

const PROJECT_URL = '/projects/'; // Relative to base URL in api.js

// Default cache timeout (5 minutes in milliseconds)
const CACHE_TIMEOUT = 5 * 60 * 1000;

/**
 * Initial state for projects slice with caching and background refresh support
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
  backgroundRefreshingAll: false, // Flag for background refreshing all projects
  backgroundRefreshingSingle: false, // Flag for background refreshing a single project
  backgroundRefreshTarget: null, // ID of project being background refreshed
};

/**
 * Gets all projects for the current user with cache support
 * Only fetches new data if the cache is stale or forceRefresh is true
 * Supports smart refresh and background refresh capabilities
 *
 * @param {Object} options - Optional parameters
 * @param {boolean} options.forceRefresh - Force a data refresh regardless of cache
 * @param {number} options.cacheTimeout - Custom cache timeout in ms (default: 5 minutes)
 * @param {boolean} options.backgroundRefresh - Whether to refresh in background while showing cached data
 * @param {boolean} options.smartRefresh - Whether to apply smart comparison for state updates
 * @returns {Promise<Array>} - Array of projects
 */
export const getProjects = createAsyncThunk(
  'projects/getAll',
  async (options = {}, thunkAPI) => {
    const {
      forceRefresh = false,
      cacheTimeout = CACHE_TIMEOUT,
      backgroundRefresh = false,
      smartRefresh = true,
    } = options;
    const state = thunkAPI.getState().projects;

    // Check if we have recent data in the cache
    const now = Date.now();
    const cacheIsValid =
      state.lastFetched && now - state.lastFetched < cacheTimeout;

    // Use cached data if available and not forcing refresh
    if (cacheIsValid && !forceRefresh && state.projects.length > 0) {
      console.log('Using cached projects data');

      // If backgroundRefresh is enabled, trigger a refresh but return cached data immediately
      if (backgroundRefresh) {
        // We return cached data immediately, but dispatch a background refresh
        setTimeout(() => {
          api
            .get(PROJECT_URL)
            .then((response) => {
              // Dispatch a special action for background update
              thunkAPI.dispatch({
                type: 'projects/backgroundUpdate',
                payload: {
                  projects: response.data.data,
                  timestamp: Date.now(),
                  smartRefresh,
                },
              });
            })
            .catch((error) => {
              console.error('Background refresh failed:', error);
              // No need to notify user for background refresh failures
            });
        }, 0);
      }

      return {
        projects: state.projects,
        fromCache: true,
        backgroundRefreshing: backgroundRefresh,
      };
    }

    try {
      console.log('Fetching fresh projects data from API');
      const response = await api.get(PROJECT_URL);
      return {
        projects: response.data.data,
        fromCache: false,
        timestamp: now,
        smartRefresh,
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
 * Supports smart refresh and background refresh capabilities
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
    let backgroundRefresh = false;
    let smartRefresh = true;

    // Handle different parameter formats (string ID or options object)
    if (typeof projectIdOrOptions === 'string') {
      projectId = projectIdOrOptions;
    } else {
      projectId = projectIdOrOptions.projectId;
      forceRefresh = projectIdOrOptions.forceRefresh || false;
      cacheTimeout = projectIdOrOptions.cacheTimeout || CACHE_TIMEOUT;
      backgroundRefresh = projectIdOrOptions.backgroundRefresh || false;
      smartRefresh = projectIdOrOptions.smartRefresh !== false; // Default to true
    }

    // Validate project ID
    if (!projectId) {
      return thunkAPI.rejectWithValue('Project ID is required');
    }

    const state = thunkAPI.getState().projects;
    const now = Date.now(); // Check if this specific project is in cache and if cache is still valid
    const projectCache = state.projectCache[projectId];
    const cacheIsValid =
      projectCache && now - projectCache.lastFetched < cacheTimeout;

    // Check if we already have this project in the projects array
    const projectInList = state.projects.find((p) => p._id === projectId);

    // Add more detailed logging
    console.log(`Project cache status check for ID ${projectId}:`, {
      cacheExists: !!projectCache,
      cacheIsValid,
      projectInList: !!projectInList,
      forceRefresh,
      currentProjectMatch: state.currentProject?._id === projectId,
    });

    // Use cached project if conditions are met
    if (!forceRefresh && cacheIsValid) {
      // If we have a current project and it matches the requested ID
      if (state.currentProject && state.currentProject._id === projectId) {
        console.log(`Using cached current project data for ID: ${projectId}`);

        // If backgroundRefresh is enabled, trigger a refresh but return cached data immediately
        if (backgroundRefresh) {
          setTimeout(() => {
            api
              .get(PROJECT_URL + projectId)
              .then((response) => {
                // Dispatch a special action for background update of a single project
                thunkAPI.dispatch({
                  type: 'projects/backgroundUpdateSingle',
                  payload: {
                    project: response.data.data,
                    projectId,
                    timestamp: Date.now(),
                    smartRefresh,
                  },
                });
              })
              .catch((error) => {
                console.error('Background refresh failed:', error);
                // No need to notify user for background refresh failures
              });
          }, 0);
        }

        return {
          project: state.currentProject,
          fromCache: true,
          backgroundRefreshing: backgroundRefresh,
        };
      }

      // If project is in projects list but not set as currentProject
      if (projectInList) {
        console.log(`Using cached project data from list for ID: ${projectId}`);

        // Same background refresh logic for this case too
        if (backgroundRefresh) {
          setTimeout(() => {
            api
              .get(PROJECT_URL + projectId)
              .then((response) => {
                thunkAPI.dispatch({
                  type: 'projects/backgroundUpdateSingle',
                  payload: {
                    project: response.data.data,
                    projectId,
                    timestamp: Date.now(),
                    smartRefresh,
                  },
                });
              })
              .catch((error) => {
                console.error('Background refresh failed:', error);
              });
          }, 0);
        }

        return {
          project: projectInList,
          fromCache: true,
          backgroundRefreshing: backgroundRefresh,
        };
      } // If we get here, the cache is valid but neither currentProject nor projectInList match
      // This is a special case where we should force a refresh
      console.log(
        `Cache is valid but project ${projectId} not found in memory. Forcing API fetch.`
      );
    } // If we need to fetch from API
    try {
      console.log(`Fetching fresh project data for ID: ${projectId}`);
      const response = await api.get(PROJECT_URL + projectId);

      // Verify we have valid project data with an ID
      if (!response.data?.data || !response.data.data._id) {
        console.error('Invalid project data received from API:', response.data);
        return thunkAPI.rejectWithValue(
          'Invalid project data received from API'
        );
      }

      return {
        project: response.data.data,
        fromCache: false,
        timestamp: now,
        projectId, // Include ID for updating projectCache
        smartRefresh,
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
  async ({ projectId, projectData, optimistic = false }, thunkAPI) => {
    // If optimistic update is enabled, return early with the data for immediate UI update
    if (optimistic) {
      return {
        ...projectData,
        _id: projectId,
        optimistic: true, // Flag to identify optimistic updates
      };
    }

    try {
      const response = await api.put(PROJECT_URL + projectId, projectData);
      return response.data.data;
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || error.toString();
      return thunkAPI.rejectWithValue({
        message,
        failedProjectId: projectId,
        originalData: projectData, // Include original data for reverting optimistic updates
      });
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
      .addCase(getProjects.pending, (state, action) => {
        // Check if this is a background refresh
        const isBackground = action.meta.arg?.backgroundRefresh;

        // Only set loading to true for non-background refreshes
        if (!isBackground) {
          state.isLoading = true;
        } else {
          // Set background refresh flag
          state.backgroundRefreshingAll = true;
        }
      })
      .addCase(getProjects.fulfilled, (state, action) => {
        // If this is not from cache (i.e., it's a fresh fetch)
        if (!action.payload.fromCache) {
          state.isLoading = false;
          state.isSuccess = true;

          // If smart refresh is enabled, check if data has actually changed
          if (action.payload.smartRefresh) {
            // Check if the collection has significant changes
            const hasChanges = hasCollectionChanged(
              state.projects,
              action.payload.projects
            );

            if (hasChanges) {
              // Only update state if the data has actually changed
              state.projects = action.payload.projects;
              console.log(
                'Projects data updated - meaningful changes detected'
              );
            } else {
              console.log(
                'No meaningful changes in projects data, skipping update'
              );
            }
          } else {
            // Without smart refresh, always update
            state.projects = action.payload.projects;
          }

          // Update both the global lastFetched and individual project cache entries
          state.lastFetched = action.payload.timestamp; // Update last fetched timestamp

          // Also update cache entries for each project
          action.payload.projects.forEach((project) => {
            state.projectCache[project._id] = {
              lastFetched: action.payload.timestamp,
              fromAPI: true,
            };
          });
        }

        // If this was a background refresh, reset the flag
        if (action.payload.backgroundRefreshing) {
          state.backgroundRefreshingAll = false;
        }
      })
      .addCase(getProjects.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        state.backgroundRefreshingAll = false; // Reset flag regardless

        // Only clear projects on non-background refresh failures
        if (!action.meta.arg?.backgroundRefresh) {
          state.projects = []; // Clear on error for non-background refreshes
        }
      })
      // Handle background refresh updates for all projects
      .addCase('projects/backgroundUpdate', (state, action) => {
        // Only update if there are meaningful changes when smart refresh is enabled
        if (action.payload.smartRefresh) {
          const hasChanges = hasCollectionChanged(
            state.projects,
            action.payload.projects
          );

          if (hasChanges) {
            state.projects = action.payload.projects;
            console.log('Background refresh completed - projects updated');
          } else {
            console.log('Background refresh completed - no meaningful changes');
          }
        } else {
          // If smart refresh is disabled, always update
          state.projects = action.payload.projects;
          console.log('Background refresh completed - projects updated');
        }

        // Update timestamp and project cache entries
        state.lastFetched = action.payload.timestamp;
        action.payload.projects.forEach((project) => {
          state.projectCache[project._id] = {
            lastFetched: action.payload.timestamp,
            fromAPI: true,
          };
        });

        // Reset background refresh flag
        state.backgroundRefreshingAll = false;
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
      }) // Get Single Project Cases
      .addCase(getProject.pending, (state, action) => {
        // Check if this is a background refresh
        const isBackground = action.meta.arg?.backgroundRefresh;

        // Only set loading to true for non-background refreshes
        if (!isBackground) {
          state.isLoading = true;
        } else {
          // Set background refresh flags
          state.backgroundRefreshingSingle = true;
          state.backgroundRefreshTarget =
            typeof action.meta.arg === 'string'
              ? action.meta.arg
              : action.meta.arg.projectId;
        }
      })
      .addCase(getProject.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;

        if (!action.payload.fromCache) {
          // For smart refresh, compare with the existing project
          const existingProject =
            state.currentProject?._id === action.payload.project._id
              ? state.currentProject
              : state.projects.find(
                  (p) => p._id === action.payload.project._id
                );

          let shouldUpdate = true;

          // Only do comparison if smart refresh is enabled and we have an existing project
          if (action.payload.smartRefresh && existingProject) {
            // Deep compare objects to see if there are meaningful changes
            shouldUpdate = deepCompareObjects(
              existingProject,
              action.payload.project
            );

            if (!shouldUpdate) {
              console.log(
                `No meaningful changes for project ${action.payload.project._id}, skipping update`
              );
            }
          }

          if (shouldUpdate) {
            // Update projectCache for this specific project
            state.projectCache[action.payload.project._id] = {
              lastFetched: action.payload.timestamp,
              fromAPI: true,
            };

            // Set the fetched project
            state.currentProject = action.payload.project;

            console.log(`Updated current project to:`, {
              id: action.payload.project._id,
              name: action.payload.project.name,
            });

            // Also update this project in the projects array if it exists there
            const index = state.projects.findIndex(
              (p) => p._id === action.payload.project._id
            );
            if (index !== -1) {
              state.projects[index] = action.payload.project;
            }
          }
        } else {
          // Using cached data, just set currentProject
          state.currentProject = action.payload.project;

          console.log(`Using cached project:`, {
            id: action.payload.project._id,
            name: action.payload.project.name,
          });
        }

        // Reset background refresh flags if this was a background refresh
        if (action.payload.backgroundRefreshing) {
          state.backgroundRefreshingSingle = false;
          state.backgroundRefreshTarget = null;
        }
      })
      .addCase(getProject.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;

        // Only clear current project for non-background refreshes
        if (!action.meta.arg?.backgroundRefresh) {
          state.currentProject = null;
        }

        // Reset background refresh flags
        state.backgroundRefreshingSingle = false;
        state.backgroundRefreshTarget = null;
      })
      // Handle background refresh updates for a single project
      .addCase('projects/backgroundUpdateSingle', (state, action) => {
        const { project, projectId, timestamp, smartRefresh } = action.payload;

        // For smart refresh, compare with the existing project
        const existingProject =
          state.currentProject?._id === projectId
            ? state.currentProject
            : state.projects.find((p) => p._id === projectId);

        let shouldUpdate = true;

        // Only do comparison if smart refresh is enabled and we have an existing project
        if (smartRefresh && existingProject) {
          // Deep compare objects to see if there are meaningful changes
          shouldUpdate = deepCompareObjects(existingProject, project);

          if (!shouldUpdate) {
            console.log(
              `Background refresh - no meaningful changes for project ${projectId}`
            );
          }
        }

        if (shouldUpdate) {
          console.log(`Background refresh - updating project ${projectId}`);

          // Update project cache entry
          state.projectCache[projectId] = {
            lastFetched: timestamp,
            fromAPI: true,
          };

          // Update current project if it's the one we're looking at
          if (state.currentProject?._id === projectId) {
            state.currentProject = project;
          }

          // Update in projects array if it exists there
          const index = state.projects.findIndex((p) => p._id === projectId);
          if (index !== -1) {
            state.projects[index] = project;
          }
        }

        // Reset background refresh flags
        state.backgroundRefreshingSingle = false;
        state.backgroundRefreshTarget = null;
      }) // Update Project Cases
      .addCase(updateProject.pending, (state, action) => {
        // Only set loading for non-optimistic updates
        if (!action.meta.arg.optimistic) {
          state.isLoading = true;
        }
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;

        // For optimistic updates, we've already updated the UI, so we don't
        // need to do it again unless there's a difference in the server response
        const isOptimistic = action.payload.optimistic;

        // Update the project in the projects array with smart comparison
        const index = state.projects.findIndex(
          (p) => p._id === action.payload._id
        );

        if (index !== -1) {
          // Only update if there are meaningful changes or it's not an optimistic update
          if (
            !isOptimistic ||
            deepCompareObjects(state.projects[index], action.payload)
          ) {
            state.projects[index] = action.payload;
          }
        }

        // Update currentProject if it's the one being edited
        if (state.currentProject?._id === action.payload._id) {
          // Only update if there are meaningful changes or it's not an optimistic update
          if (
            !isOptimistic ||
            deepCompareObjects(state.currentProject, action.payload)
          ) {
            state.currentProject = action.payload;
          }
        }

        // Update project cache
        state.projectCache[action.payload._id] = {
          lastFetched: Date.now(),
          fromAPI: !isOptimistic, // Mark as not from API if optimistic
        };
      })
      .addCase(updateProject.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;

        // For optimistic updates that failed, we need to revert the changes
        if (action.meta.arg.optimistic && action.payload?.failedProjectId) {
          // Find the project in our projects array
          const index = state.projects.findIndex(
            (p) => p._id === action.payload.failedProjectId
          );

          if (index !== -1 && action.payload.originalData) {
            // If we have the original data, try to restore from server
            // This would be better with a fresh fetch, but we'll use what we have
            const originalId = action.payload.failedProjectId;
            const cachedVersion =
              state.projectCache[originalId]?.lastSavedVersion;

            if (cachedVersion) {
              // Restore from our last saved version
              state.projects[index] = cachedVersion;

              // Also update currentProject if needed
              if (state.currentProject?._id === originalId) {
                state.currentProject = cachedVersion;
              }
            }
          }
        }

        // Set error message
        state.message =
          typeof action.payload === 'string'
            ? action.payload
            : action.payload.message;
      })
      // Delete Project Cases
      .addCase(deleteProject.pending, (state) => {
        state.isLoading = true;
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
