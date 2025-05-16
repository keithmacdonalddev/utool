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

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { getProjects, getProject } from '../features/projects/projectSlice';
import { selectGuestItemsByType } from '../features/guestSandbox/guestSandboxSlice';
import useDataFetching from './useDataFetching';

/**
 * Custom hook for efficiently loading projects list or a single project
 * This prevents redundant API calls by using the caching system in Redux
 *
 * @param {Object} options - Additional options
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
  } = options;

  // Get auth state to check if user is a guest
  const { isGuest } = useSelector((state) => state.auth);

  // Get guest project data directly if the user is a guest
  const guestProjects = useSelector((state) =>
    isGuest ? selectGuestItemsByType(state, 'projects') : []
  );

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
      return getProject;
    }
    return getProjects;
  }, [actionCreator]);

  // Determine which selector to use based on whether we're getting all projects or a single project
  const selectData = useMemo(() => {
    if (customSelector) {
      return customSelector;
    }
    return (state) => state.projects.projects;
  }, [customSelector]);
  // Selector for last fetched timestamp - different for single project vs all projects
  const selectLastFetched = useMemo(() => {
    if (actionCreator === 'getProject' && actionParams) {
      // For single projects, check the projectCache using the project ID
      return (state) => {
        const projectId =
          typeof actionParams === 'string'
            ? actionParams
            : actionParams.projectId;

        // Check if this project exists in cache
        const cachedTimestamp =
          state.projects.projectCache?.[projectId]?.lastFetched;

        // Also check if the current project matches the requested ID
        const isCurrent = state.projects.currentProject?._id === projectId;

        // Debug information
        console.log(`Project ${projectId} cache check:`, {
          cachedTimestamp: cachedTimestamp
            ? new Date(cachedTimestamp).toLocaleTimeString()
            : 'none',
          isCurrent,
          currentProjectId: state.projects.currentProject?._id,
        });

        // If there's no cache entry or the current project doesn't match,
        // return null to force a refresh
        if (!cachedTimestamp || !isCurrent) {
          return null;
        }

        return cachedTimestamp;
      };
    }
    // For all projects, use the global lastFetched timestamp
    return (state) => state.projects.lastFetched;
  }, [actionCreator, actionParams]);

  const selectIsLoading = useMemo(
    () => (state) => state.projects.isLoading,
    []
  );

  const selectError = useMemo(
    () => (state) => state.projects.isError ? state.projects.message : null,
    []
  );
  // Construct fetch parameters based on the action and options
  const fetchParams = useMemo(() => {
    // Make sure we include the smartRefresh and backgroundRefresh options
    const enhancedParams = {
      ...(actionCreator === 'getProjects' ? actionParams : {}),
      smartRefresh,
      backgroundRefresh,
    };

    if (actionCreator === 'getProject') {
      // For getProject, we need to ensure we pass the project ID in the correct format
      if (typeof actionParams === 'string') {
        // If it's a string ID, convert it to the object format expected by getProject
        return {
          projectId: actionParams,
          smartRefresh,
          backgroundRefresh,
        };
      } else if (actionParams && actionParams.projectId) {
        // If it's already an object with projectId, merge with our enhancement options
        return {
          ...actionParams,
          smartRefresh,
          backgroundRefresh,
        };
      } else {
        // If it's empty or invalid, return an object with just our enhancement options
        return {
          smartRefresh,
          backgroundRefresh,
        };
      }
    }
    // For getProjects, we pass any options with our enhancements
    return enhancedParams;
  }, [actionCreator, actionParams, smartRefresh, backgroundRefresh]);
  // Use our generic hook with project-specific selectors
  const { data, isLoading, error, refetch, backgroundRefreshState } =
    useDataFetching({
      fetchAction,
      selectData,
      selectLastFetched,
      selectIsLoading,
      selectError,
      dependencies: [], // Only re-fetch on explicit refetch or cache timeout
      fetchParams,
      cacheTimeout,
      skipInitialFetch,
      backgroundRefresh,
      smartRefresh,
      idField: '_id', // Use _id for comparing project objects
    });
  // Return appropriate property names based on what's being fetched
  if (actionCreator === 'getProject') {
    return {
      data, // This will be a single project
      isLoading,
      error,
      refetch,
      backgroundRefreshState, // Expose background refresh state to components
    };
  }

  return {
    projects: data, // This will be an array of projects
    isLoading,
    error,
    refetchProjects: refetch,
    backgroundRefreshState, // Expose background refresh state to components
  };
};

export default useProjects;
