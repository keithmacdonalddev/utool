import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api'; // Use our configured axios instance
import {
  deepCompareObjects,
  hasCollectionChanged,
} from '../../utils/objectUtils';
// Import actions from guestSandboxSlice for guest user support
import {
  addItem,
  updateItem,
  deleteItem,
  setItems,
} from '../guestSandbox/guestSandboxSlice';

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
    } = options; // Get state and check if user is a guest
    const state = thunkAPI.getState().projects;
    const { auth } = thunkAPI.getState();

    // Handle guest user
    if (auth.user && auth.isGuest) {
      // For guest users, get projects from guest sandbox
      const guestProjects = thunkAPI
        .getState()
        .guestSandbox.projects.map((project) => ({
          ...project.data,
          _id: project.id,
          id: project.id,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        }));

      return {
        projects: guestProjects,
        fromCache: true,
        isGuestData: true,
      };
    }

    // For regular users, continue with normal flow
    // Check if we have recent data in the cache
    const now = Date.now();
    const cacheIsValid =
      state.lastFetched && now - state.lastFetched < cacheTimeout;

    // Use cached data if available and not forcing refresh
    if (cacheIsValid && !forceRefresh && state.projects.length > 0) {
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
    const { getState, dispatch } = thunkAPI;
    const { auth } = getState();

    // Handle guest user
    if (auth.user && auth.isGuest) {
      // Guest user: Add to sandbox, no API call
      const guestProjectData = {
        ...projectData,
        // Add any additional fields needed for consistency with API structure
      };

      // Dispatch to add item to guest sandbox
      dispatch(
        addItem({
          entityType: 'projects',
          itemData: { data: guestProjectData },
        })
      );

      // Return data structure that matches the API response
      // The actual item with ID will be in the guestSandbox state.
      return {
        ...guestProjectData,
        _id: 'guest-' + Date.now(), // Temporary ID for immediate feedback
        _isGuestCreation: true,
      };
    }

    // Regular user: Proceed with API call
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
    if (!projectId) {
      return thunkAPI.rejectWithValue('Project ID is required');
    }

    // Check if user is a guest
    const { auth } = thunkAPI.getState();
    if (auth.user && auth.isGuest) {
      // For guest users, get project data from guest sandbox
      const guestProjects = thunkAPI.getState().guestSandbox.projects;
      const guestProject = guestProjects.find((p) => p.id === projectId);

      if (guestProject) {
        // Return formatted guest project with API-compatible structure
        return {
          project: {
            ...guestProject.data,
            _id: guestProject.id,
            id: guestProject.id,
            createdAt: guestProject.createdAt,
            updatedAt: guestProject.updatedAt,
          },
          fromCache: true,
          isGuestProject: true,
        };
      }

      // If guest project not found, return empty project
      // This can happen if trying to access a project that doesn't exist in guest sandbox
      return thunkAPI.rejectWithValue('Project not found in guest session');
    }

    // For regular users, continue with normal flow
    const state = thunkAPI.getState().projects;
    const now = Date.now(); // Check if the project is already in the main list and if we should use it
    const projectFromList = state.projects.find((p) => p._id === projectId);

    if (projectFromList && !forceRefresh) {
      // If found in the main list and not forcing a refresh, use this data
      // Optionally, trigger a background refresh if data might be stale
      const BACKGROUND_REFRESH_THRESHOLD = 30 * 60 * 1000; // 30 minutes
      if (
        !state.projectCache[projectId]?.lastFetched ||
        Date.now() - state.projectCache[projectId].lastFetched >
          BACKGROUND_REFRESH_THRESHOLD
      ) {
        if (process.env.NODE_ENV === 'development') {
          console.log(
            `ProjectDetails: Project ${projectId} found in list, initiating background refresh.`
          );
        }
        // No need to await, let it run in background
        thunkAPI.dispatch(
          getProject({ projectId, forceRefresh: true, isBackground: true })
        );
      } // Update the projectCache's lastFetched timestamp to now, as we are serving it.
      // This helps useDataFetching recognize it as fresh.
      if (state.projectCache[projectId]) {
        state.projectCache[projectId].lastFetched = Date.now();
        // Also update the data field to ensure cache consistency
        state.projectCache[projectId].data = projectFromList;
      } else {
        state.projectCache[projectId] = {
          lastFetched: Date.now(),
          data: projectFromList, // Store the actual project data
          fromAPI: true,
        };
      }
      console.log(
        `projectSlice: Using cached project data from list for ID: ${projectId}`
      );
      return {
        project: projectFromList,
        fromCache: true,
        fromListCache: true,
      };
    }

    // Check project-specific cache if not found in the main list or if forced refresh on list item
    const projectCache = state.projectCache?.[projectId];
    const cacheIsValid =
      projectCache && now - projectCache.lastFetched < cacheTimeout; // Use specific project cache if it's valid
    if (cacheIsValid && !forceRefresh) {
      console.log(`Using cached current project data for ID: ${projectId}`);
      // CRITICAL FIX: Return the actual cached project data instead of state.currentProject
      // The cache now stores the actual project data, not just timestamps
      return {
        project: projectCache.data, // Return the cached project data
        fromCache: true,
        backgroundRefreshing: false,
      };
    } // If we need to fetch from API (not in any cache or forceRefresh is true)
    try {
      console.log(`Fetching fresh project data for ID: ${projectId}`);
      const response = await api.get(PROJECT_URL + projectId);

      console.log(`✅ API response received for project ${projectId}:`, {
        status: response.status,
        hasData: !!response.data,
        hasProject: !!response.data?.data,
        projectId: response.data?.data?._id,
        projectName: response.data?.data?.name,
      });

      // Verify we have valid project data with an ID
      if (!response.data?.data || !response.data.data._id) {
        console.error('Invalid project data received from API:', response.data);
        return thunkAPI.rejectWithValue(
          'Invalid project data received from API'
        );
      }

      const returnValue = {
        project: response.data.data,
        fromCache: false,
        timestamp: now,
        projectId, // Include ID for updating projectCache
        smartRefresh,
      };
      console.log(`✅ getProject thunk returning success:`, {
        projectId,
        projectName: returnValue.project.name,
        returnStructure: Object.keys(returnValue),
      });

      // Add comprehensive validation before return to catch any potential issues
      try {
        // Validate that all required properties are present and valid
        if (!returnValue.project) {
          console.error('❌ CRITICAL: returnValue.project is null/undefined');
          throw new Error('Project data is null');
        }

        if (!returnValue.project._id) {
          console.error('❌ CRITICAL: returnValue.project._id is missing');
          throw new Error('Project ID is missing');
        }

        // Ensure the return value is serializable (Redux requirement)
        const serializedTest = JSON.stringify(returnValue);
        const deserializedTest = JSON.parse(serializedTest);

        console.log('✅ Return value serialization test passed');
        console.log('🚀 About to return from getProject thunk...');

        return returnValue;
      } catch (serializationError) {
        console.error(
          '❌ CRITICAL: Return value serialization failed:',
          serializationError
        );
        console.error('❌ Return value that failed:', returnValue);

        // Return a simplified, guaranteed-serializable version
        return {
          project: {
            _id: returnValue.project._id,
            name: returnValue.project.name,
            // Add other essential fields manually to ensure serialization
            description: returnValue.project.description || '',
            tasks: returnValue.project.tasks || [],
            members: returnValue.project.members || [],
            isCompleted: returnValue.project.isCompleted || false,
            createdAt: returnValue.project.createdAt,
            updatedAt: returnValue.project.updatedAt,
          },
          fromCache: false,
          timestamp: now,
          projectId,
          smartRefresh,
        };
      }
    } catch (error) {
      console.error(`Failed to fetch project ${projectId}:`, error);
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        projectId,
        userInfo: {
          userId: auth.user?.id || auth.user?._id,
          isGuest: auth.isGuest,
          userName: auth.user?.name,
        },
      });

      // Enhanced error handling based on status code
      let errorMessage = 'Failed to fetch project';

      if (error.response?.status === 404) {
        errorMessage = `Project with ID "${projectId}" could not be found, or you may not have permission to view it.`;
        console.error('⚠️ 404 Error Analysis:', {
          possibleCauses: [
            'Project exists in list but user lacks individual access permissions',
            'Project was deleted between dashboard load and detail request',
            'User is not owner or member of this project',
            'Database inconsistency between getProjects and getProject queries',
          ],
          troubleshooting: [
            'Check if user is owner or member in project.members array',
            'Verify project exists in database with this exact ID',
            'Check if there are permission differences between list and detail access',
          ],
        });
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to access this project.';
        console.error('⚠️ 403 Permission Error:', {
          explanation: 'User is not authorized to view this project',
          checkRequired: 'User must be project owner or member',
        });
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error while fetching project. Please try again.';
      }

      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// Async thunk to update a project
export const updateProject = createAsyncThunk(
  'projects/update',
  async ({ projectId, projectData, optimistic = false }, thunkAPI) => {
    const { getState, dispatch } = thunkAPI;
    const { auth } = getState();

    // Handle guest user
    if (auth.user && auth.isGuest) {
      // Guest user: Update item in sandbox, no API call
      dispatch(
        updateItem({
          entityType: 'projects',
          itemId: projectId,
          updates: { data: projectData },
        })
      );

      // Return a response that matches API structure but with guest data
      return {
        ...projectData,
        _id: projectId,
        id: projectId,
        _isGuestUpdate: true,
      };
    }

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
    const { getState, dispatch } = thunkAPI;
    const { auth } = getState();

    // Handle guest user
    if (auth.user && auth.isGuest) {
      // Guest user: Delete item from sandbox, no API call
      dispatch(
        deleteItem({
          entityType: 'projects',
          itemId: projectId,
        })
      );

      // Return the ID for the reducer to remove from state
      return projectId;
    }

    // Regular user: Proceed with API call
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
      state.currentProject = null;
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
          state.lastFetched = action.payload.timestamp; // Update last fetched timestamp          // Also update cache entries for each project
          action.payload.projects.forEach((project) => {
            state.projectCache[project._id] = {
              lastFetched: action.payload.timestamp,
              data: project, // Store the actual project data
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
        } // Update timestamp and project cache entries
        state.lastFetched = action.payload.timestamp;
        action.payload.projects.forEach((project) => {
          state.projectCache[project._id] = {
            lastFetched: action.payload.timestamp,
            data: project, // Store the actual project data
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
        state.projects.push(action.payload); // Add new project to the list        // Add to project cache
        state.projectCache[action.payload._id] = {
          lastFetched: Date.now(),
          data: action.payload, // Store the actual project data
          fromAPI: true,
        };
      })
      .addCase(createProject.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      }) // Get Single Project Cases
      .addCase(getProject.pending, (state, action) => {
        const isBackground = action.meta.arg?.backgroundRefresh;
        const projectId =
          typeof action.meta.arg === 'string'
            ? action.meta.arg
            : action.meta.arg?.projectId;

        if (!isBackground) {
          state.isLoading = true;
        } else {
          state.backgroundRefreshingSingle = true;
          state.backgroundRefreshTarget = projectId;
        }
        // Clear previous error/success states for a new fetch attempt
        state.isError = false;
        state.message = '';
        state.isSuccess = false; // Reset success state as well

        // CRITICAL FIX: Don't clear currentProject if we're loading the same project
        // Only clear if we're switching to a different project or have no project at all
        const currentProjectId = state.currentProject?._id;
        const willClearProject =
          !isBackground &&
          state.currentProject &&
          currentProjectId !== projectId;

        if (willClearProject) {
          state.currentProject = null;
        }

        // Add logging to verify the fix (Teammate 2's diagnostic addition)
        console.log('getProject.pending:', {
          currentProjectId,
          requestedProjectId: projectId,
          willClearProject,
          isBackground,
          hasCurrentProject: !!state.currentProject,
        });
      })
      .addCase(getProject.fulfilled, (state, action) => {
        console.log('🎉 getProject.fulfilled reducer called!');
        console.log('🎉 Action payload received:', action.payload);

        state.isLoading = false;
        state.isSuccess = true;
        state.isError = false; // Ensure isError is false on success
        state.message = ''; // Clear any previous error messages

        const { project, fromCache, timestamp, smartRefresh, projectId } =
          action.payload;

        console.log('✅ getProject.fulfilled reducer:', {
          payload: action.payload,
        });

        // **THE FIX - REINFORCED**: Always set the current project right away.
        // This ensures the UI has data immediately, especially when loading from cache.
        if (project && project._id) {
          state.currentProject = project;
        } else if (fromCache && !project) {
          console.error(
            'getProject.fulfilled: fromCache is true but project data is missing from payload!'
          );
        } else if (!project) {
          console.error(
            'getProject.fulfilled: Project data is missing from payload!'
          );
        }

        // If this is not from cache (i.e., it's a fresh fetch or background update)
        if (!fromCache) {
          // Apply smart refresh logic if enabled and data is available
          if (smartRefresh && project) {
            // Compare with the project in the main list
            const projectIndex = state.projects.findIndex(
              (p) => p._id === project._id
            );

            if (
              projectIndex === -1 ||
              !deepCompareObjects(state.projects[projectIndex], project)
            ) {
              console.log(
                `Project data for ${project._id} updated - meaningful changes detected`
              );
              // Update the project in the main projects list as well
              if (projectIndex !== -1) {
                state.projects[projectIndex] = project;
              } else {
                // If project was not in the list (e.g. direct fetch by ID), add it
                state.projects.push(project);
              }
            } else {
              console.log(
                `No meaningful changes in project data for ${project._id}, skipping list update`
              );
            }
          } else if (project) {
            // Without smart refresh, always update the list
            const projectIndex = state.projects.findIndex(
              (p) => p._id === project._id
            );
            if (projectIndex !== -1) {
              state.projects[projectIndex] = project;
            } else if (project._id) {
              state.projects.push(project);
            }
          } // Update cache timestamp for this specific project if projectId is available
          if (projectId && timestamp && project) {
            state.projectCache[projectId] = {
              lastFetched: timestamp,
              data: project, // Store the actual project data
              fromAPI: true,
            };
          }
        }
        // No 'else' block needed here anymore because we set currentProject at the top.
        // The logic for handling 'fromCache' is now implicitly handled.

        // If this was a background refresh, reset the flag
        if (action.payload.backgroundRefreshing) {
          state.backgroundRefreshingSingle = false;
          state.backgroundRefreshTarget = null;
        }
      })
      .addCase(getProject.rejected, (state, action) => {
        console.log('❌ getProject.rejected reducer called!');
        console.log('❌ Rejection payload:', action.payload);
        console.log('❌ Rejection error:', action.error);
        console.log('❌ Full rejection action:', action);

        state.isLoading = false;
        state.isError = true;
        state.message = action.payload || 'Failed to fetch project';
        state.currentProject = null; // Ensure currentProject is cleared on error
        state.isSuccess = false; // Reset success state

        // If this was a background refresh, reset the flag
        const isBackground = action.meta.arg?.backgroundRefresh;
        if (isBackground) {
          state.backgroundRefreshingSingle = false;
          state.backgroundRefreshTarget = null;
        }
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
          shouldUpdate = !deepCompareObjects(existingProject, project);

          if (!shouldUpdate) {
            console.log(
              `Background refresh - no meaningful changes for project ${projectId}`
            );
          }
        }

        if (shouldUpdate) {
          console.log(`Background refresh - updating project ${projectId}`); // Update project cache entry
          state.projectCache[projectId] = {
            lastFetched: timestamp,
            data: project, // Store the actual project data
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
            !deepCompareObjects(state.projects[index], action.payload)
          ) {
            state.projects[index] = action.payload;
          }
        }

        // Update currentProject if it's the one being edited
        if (state.currentProject?._id === action.payload._id) {
          // Only update if there are meaningful changes or it's not an optimistic update
          if (
            !isOptimistic ||
            !deepCompareObjects(state.currentProject, action.payload)
          ) {
            state.currentProject = action.payload;
          }
        } // Update project cache
        state.projectCache[action.payload._id] = {
          lastFetched: Date.now(),
          data: action.payload, // Store the actual project data
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
