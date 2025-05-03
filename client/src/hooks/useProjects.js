/**
 * useProjects.js - Custom hook for efficiently fetching projects
 *
 * This hook leverages our generic useDataFetching hook to provide a simple interface
 * for components that need to load and display projects. It prevents redundant API
 * calls by using the caching system in Redux.
 */

import { useMemo } from 'react';
import { getProjects, getProject } from '../features/projects/projectSlice';
import useDataFetching from './useDataFetching';

/**
 * Custom hook for efficiently loading projects list or a single project
 * This prevents redundant API calls by using the caching system in Redux
 *
 * @param {Object} options - Additional options
 * @param {number} options.cacheTimeout - How long to consider cached data fresh (ms)
 * @param {boolean} options.skipInitialFetch - Whether to skip the initial fetch
 * @param {Function} options.selector - Custom selector function to get specific data (e.g., for a single project)
 * @param {string} options.actionCreator - Which action to use ('getProjects' or 'getProject')
 * @param {any} options.actionParams - Parameters to pass to the action creator (e.g., projectId)
 * @returns {Object} Object containing { projects/data, isLoading, error, refetchProjects/refetch }
 */
const useProjects = (options = {}) => {
  const {
    cacheTimeout,
    skipInitialFetch,
    selector: customSelector,
    actionCreator = 'getProjects',
    actionParams = {},
  } = options;

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
        return state.projects.projectCache?.[projectId]?.lastFetched;
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
    if (actionCreator === 'getProject') {
      // For getProject, we need to ensure we pass the project ID in the correct format
      if (typeof actionParams === 'string') {
        // If it's a string ID, convert it to the object format expected by getProject
        return { projectId: actionParams };
      } else if (actionParams && actionParams.projectId) {
        // If it's already an object with projectId, use it as is
        return actionParams;
      } else {
        // If it's empty or invalid, return an empty object (will be caught by the thunk)
        return {};
      }
    }
    // For getProjects, we pass any options (forceRefresh, cacheTimeout)
    return actionParams;
  }, [actionCreator, actionParams]);

  // Use our generic hook with project-specific selectors
  const { data, isLoading, error, refetch } = useDataFetching({
    fetchAction,
    selectData,
    selectLastFetched,
    selectIsLoading,
    selectError,
    dependencies: [], // Only re-fetch on explicit refetch or cache timeout
    fetchParams,
    cacheTimeout,
    skipInitialFetch,
  });

  // Return appropriate property names based on what's being fetched
  if (actionCreator === 'getProject') {
    return {
      data, // This will be a single project
      isLoading,
      error,
      refetch,
    };
  }

  return {
    projects: data, // This will be an array of projects
    isLoading,
    error,
    refetchProjects: refetch,
  };
};

export default useProjects;
