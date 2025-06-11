/**
 * useProjects.js - Custom hook for efficiently fetching projects
 *
 * This hook leverages our generic useDataFetching hook to provide a simple interface
 * for components that need to load and display projects. It prevents redundant API
 * calls by using the caching system in Redux.
 *
 * Enhanced with smart data comparison and background refresh capabilities for
 * optimal UI performance and reduced unnecessary updates.
 *
 * Updated to support guest users by returning data from the guest sandbox when the user is a guest.
 */

import { useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { createSelector } from 'reselect'; // Ensure createSelector is imported
import {
  fetchProjects,
  fetchProjectById,
} from '../features/projects/projectsSlice';
import { selectGuestItemsByType } from '../features/guestSandbox/guestSandboxSlice';
import useDataFetching from './useDataFetching';

/**
 * useProjects Hook - Enhanced with Intelligent Caching and Conditional Execution
 *
 * @param {Object} options - Configuration options
 * @param {number} options.cacheTimeout - How long to consider cached data fresh (ms)
 * @param {boolean} options.skipInitialFetch - Whether to skip the initial fetch
 * @param {boolean} options.backgroundRefresh - Whether to refresh in background while showing cached data
 * @param {boolean} options.smartRefresh - Whether to apply smart comparison for state updates
 * @param {Function} options.selector - Custom selector function to get specific data (e.g., for a single project)
 * @param {string} options.actionCreator - Which action to use ('getProjects' or 'getProject')
 * @param {any} options.actionParams - Parameters to pass to the action creator (e.g., projectId)
 * @returns {Object} Object containing { projects/data, isLoading, error, refetchProjects/refetch }
 */
const useProjects = (options = {}) => {
  const {
    cacheTimeout,
    skipInitialFetch,
    backgroundRefresh = true,
    smartRefresh = true,
    selector: customSelector,
    actionCreator = 'getProjects',
    actionParams = {},
    enabled = true, // Add support for enabled option
  } = options;

  // Memoized selectors to prevent Redux rerender warnings
  const selectAuth = useMemo(() => (state) => state.auth, []);

  // Get auth state to check if user is a guest and if auth is restored
  const { isGuest, isAuthRestored, authRestorationAttempted } =
    useSelector(selectAuth); // CRITICAL: Only enable data fetching after authentication state is restored
  // This prevents race conditions on page refresh where project fetching
  // attempts to run before authentication tokens are available
  const isDataFetchingEnabled = enabled && isAuthRestored;

  // Memoized selector for guest items - FIXED to prevent new array creation
  const selectGuestProjects = useMemo(
    () => (state) => selectGuestItemsByType(state, 'projects'),
    []
  );

  // Get guest project data directly if the user is a guest
  const guestProjects = useSelector(selectGuestProjects);

  // Format guest projects to match API structure
  const formattedGuestProjects = useMemo(() => {
    if (!isGuest) return [];

    // For a specific project
    if (actionCreator === 'getProject') {
      const projectId =
        typeof actionParams === 'string'
          ? actionParams
          : actionParams.projectId;

      const project = guestProjects.find((p) => p.id === projectId);

      if (project) {
        return {
          ...project.data,
          _id: project.id,
          id: project.id,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        };
      }
      return null;
    }

    // For all projects
    return guestProjects.map((project) => ({
      ...project.data,
      _id: project.id,
      id: project.id,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    }));
  }, [isGuest, guestProjects, actionCreator, actionParams]);
  // Determine which action function to use based on actionCreator
  const fetchAction = useMemo(() => {
    if (actionCreator === 'getProject') {
      return fetchProjectById;
    }
    return fetchProjects;
  }, [actionCreator]);

  // PERFORMANCE FIX: Simplified and stable selector to prevent re-renders

  // Input selectors for project data
  const selectProjectsState = (state) => state.projects;
  const selectActionParamsProjectId = (_state, params) =>
    typeof params === 'string' ? params : params?.projectId;

  const selectData = useMemo(() => {
    if (customSelector) {
      return customSelector;
    }
    if (actionCreator === 'getProject') {
      // Use projectsSlice.js state structure: currentProject for single project
      return createSelector(
        [selectProjectsState, selectActionParamsProjectId],
        (projectsState, projectId) => {
          // Primary source: currentProject if it matches
          if (projectsState.currentProject?._id === projectId) {
            return projectsState.currentProject;
          }

          // Secondary source: projects array (simple lookup)
          if (projectsState.projects && Array.isArray(projectsState.projects)) {
            return (
              projectsState.projects.find(
                (project) => project._id === projectId
              ) || null
            );
          }
          // Return null instead of currentProject to prevent selector instability
          return null;
        }
      );
    }

    // For all projects, return the projects array
    // This selector is simple and direct, reselect might be overkill unless state.projects.projects itself is unstable.
    return (state) => state.projects.projects;
  }, [customSelector, actionCreator]); // Removed JSON.stringify(actionParams) as projectId is now passed directly

  // PERFORMANCE FIX: Simplified selector to prevent instability
  const selectLastFetched = useMemo(() => {
    if (actionCreator === 'getProject') {
      // projectsSlice.js doesn't have complex projectCache, use lastSync for freshness
      return (state) => state.projects.lastSync;
    }
    // For all projects, use the lastSync timestamp from projectsSlice.js
    return (state) => state.projects.lastSync;
  }, [actionCreator]);
  const selectIsLoading = useMemo(
    () => (state) => {
      // projectsSlice.js uses "loading" field name
      return state.projects.loading ?? false;
    },
    []
  );
  const selectError = useMemo(
    () => (state) => {
      // projectsSlice.js uses "error" field name
      return state.projects.error || null;
    },
    []
  ); // PERFORMANCE FIX: Highly optimized fetchParams to prevent re-renders
  const fetchParams = useMemo(() => {
    // Return a simple, stable object structure
    if (actionCreator === 'getProject') {
      const projectId =
        typeof actionParams === 'string'
          ? actionParams
          : actionParams?.projectId;
      return projectId || null;
    }
    // For fetchProjects, return empty object or shallow copy of actionParams
    // Ensure actionParams itself is stable if it's an object.
    return actionParams && typeof actionParams === 'object'
      ? { ...actionParams } // Shallow copy for safety if actionParams could be mutated elsewhere
      : {};
  }, [actionCreator, actionParams]); // Changed from JSON.stringify(actionParams) to direct actionParams
  // Phase 3 Step 2: Enhanced hook with optimistic updates
  const {
    data: apiData,
    isLoading,
    error,
    refetch,
    backgroundRefreshState,
    applyOptimisticUpdate,
    rollbackOptimisticUpdate,
    triggerBackgroundRefresh,
    pendingOperations,
    hasOptimisticUpdates,
  } = useDataFetching({
    fetchAction,
    selectData, // Pass the memoized selector function
    selectLastFetched,
    selectIsLoading,
    selectError,
    // fetchParams, // fetchParams is passed directly to useDataFetching
    // cacheTimeout,
    // skipInitialFetch: skipInitialFetch || isGuest, // Skip fetch for guest users
    // backgroundRefresh: false, // PERFORMANCE FIX: Temporarily disable background refresh to isolate issue
    // smartRefresh: false, // PERFORMANCE FIX: Temporarily disable smart refresh to isolate issue
    // idField: '_id', // Use _id for comparing project objects
    // enabled: isDataFetchingEnabled && !isGuest, // Wait for auth restoration and disable for guest users
    // // Phase 3 Step 2: Enable optimistic updates for better UX
    // enableOptimisticUpdates: false, // PERFORMANCE FIX: Temporarily disable optimistic updates to isolate issue
    // }); // For guest users, use the formatted guest data directly
    fetchParams: actionCreator === 'getProject' ? fetchParams : actionParams, // Pass projectId string directly for getProject
    cacheTimeout,
    skipInitialFetch: skipInitialFetch || isGuest,
    backgroundRefresh: false,
    smartRefresh: false,
    idField: '_id',
    enabled: isDataFetchingEnabled && !isGuest,
    enableOptimisticUpdates: false,
  });
  const data = isGuest ? formattedGuestProjects : apiData;

  // Phase 3 Step 2: Optimistic update functions for projects
  const updateProjectOptimistically = useCallback(
    (projectId, updates) => {
      const operationId = `update-project-${projectId}-${Date.now()}`;

      return applyOptimisticUpdate(operationId, (currentData) => {
        if (actionCreator === 'getProject') {
          // Single project update
          return currentData && currentData._id === projectId
            ? { ...currentData, ...updates }
            : currentData;
        } else {
          // Array of projects update
          return Array.isArray(currentData)
            ? currentData.map((project) =>
                project._id === projectId ? { ...project, ...updates } : project
              )
            : currentData;
        }
      });
    },
    [applyOptimisticUpdate, actionCreator]
  );

  const addProjectOptimistically = useCallback(
    (newProject) => {
      const operationId = `add-project-${
        newProject._id || 'temp'
      }-${Date.now()}`;

      return applyOptimisticUpdate(operationId, (currentData) => {
        if (actionCreator === 'getProjects') {
          // Add to array of projects
          return Array.isArray(currentData)
            ? [...currentData, newProject]
            : [newProject];
        }
        return currentData;
      });
    },
    [applyOptimisticUpdate, actionCreator]
  );

  const deleteProjectOptimistically = useCallback(
    (projectId) => {
      const operationId = `delete-project-${projectId}-${Date.now()}`;

      return applyOptimisticUpdate(operationId, (currentData) => {
        if (actionCreator === 'getProjects') {
          // Remove from array of projects
          return Array.isArray(currentData)
            ? currentData.filter((project) => project._id !== projectId)
            : currentData;
        }
        return currentData;
      });
    },
    [applyOptimisticUpdate, actionCreator]
  );

  // Return appropriate property names based on what's being fetched
  if (actionCreator === 'getProject') {
    return {
      data, // This will be a single project (guest data for guests, API data for regular users)
      isLoading: isGuest ? false : isLoading, // Never loading for guest users
      error,
      refetch,
      backgroundRefreshState, // Expose background refresh state to components
      // Phase 3 Step 2: Enhanced features
      updateProjectOptimistically,
      triggerBackgroundRefresh,
      pendingOperations,
      hasOptimisticUpdates,
      rollbackOptimisticUpdate,
    };
  }

  return {
    projects: data, // This will be an array of projects (guest data for guests, API data for regular users)
    isLoading: isGuest ? false : isLoading, // Never loading for guest users
    error,
    refetchProjects: refetch,
    backgroundRefreshState, // Expose background refresh state to components
    // Phase 3 Step 2: Enhanced features
    updateProjectOptimistically,
    addProjectOptimistically,
    deleteProjectOptimistically,
    triggerBackgroundRefresh,
    pendingOperations,
    hasOptimisticUpdates,
    rollbackOptimisticUpdate,
  };
};

export default useProjects;
