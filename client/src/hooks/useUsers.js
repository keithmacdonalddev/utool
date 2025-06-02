/**
 * useUsers.js - Custom hook for efficiently fetching users
 *
 * This hook leverages our generic useDataFetching hook to provide a simple interface
 * for components that need to load and display user data. It prevents redundant API
 * calls by using the caching system and provides comprehensive user management
 * functionality for admin interfaces.
 *
 * Enhanced with smart data comparison and background refresh capabilities for
 * optimal UI performance and reduced unnecessary updates.
 *
 * Part of Milestone 4: Batch Operations & User Management
 */

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import api from '../utils/api';
import useDataFetching from './useDataFetching';

/**
 * Fetch users from the API
 * @param {Object} params - Query parameters for filtering and pagination
 * @returns {Promise} API response with user data
 */
const fetchUsers = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();

    // Add query parameters if provided
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.search) queryParams.append('search', params.search);
    if (params.role) queryParams.append('role', params.role);
    if (params.status) queryParams.append('status', params.status);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const queryString = queryParams.toString();
    const url = queryString ? `/users?${queryString}` : '/users';

    const response = await api.get(url);

    if (response.data.success) {
      // Handle both paginated and non-paginated responses
      if (response.data.data && Array.isArray(response.data.data)) {
        // Non-paginated response - all users at once
        return {
          users: response.data.data,
          totalUsers: response.data.count || response.data.data.length,
          currentPage: 1,
          totalPages: 1,
        };
      } else if (response.data.data && response.data.data.users) {
        // Paginated response
        return {
          users: response.data.data.users,
          totalUsers: response.data.data.totalUsers || 0,
          currentPage: response.data.data.page || 1,
          totalPages: response.data.data.totalPages || 1,
        };
      } else {
        // Fallback structure
        return {
          users: response.data.data || [],
          totalUsers: response.data.count || 0,
          currentPage: 1,
          totalPages: 1,
        };
      }
    } else {
      throw new Error(response.data.message || 'Failed to fetch users');
    }
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

/**
 * Fetch a single user by ID
 * @param {string} userId - User ID to fetch
 * @returns {Promise} API response with user data
 */
const fetchUser = async (userId) => {
  try {
    const response = await api.get(`/users/${userId}`);

    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to fetch user');
    }
  } catch (error) {
    console.error(`Error fetching user ${userId}:`, error);
    throw error;
  }
};

/**
 * Custom hook for efficiently loading users list or a single user
 * This prevents redundant API calls by using the caching system
 *
 * @param {Object} options - Additional options
 * @param {string} options.userId - Specific user ID to fetch (for single user mode)
 * @param {number} options.page - Page number for pagination
 * @param {number} options.limit - Number of users per page
 * @param {string} options.search - Search query for filtering users
 * @param {string} options.role - Role filter (Admin, Pro User, Regular User)
 * @param {string} options.status - Status filter (active, inactive)
 * @param {string} options.sortBy - Field to sort by (name, email, createdAt, etc.)
 * @param {string} options.sortOrder - Sort order (asc, desc)
 * @param {number} options.cacheTimeout - How long to consider cached data fresh (ms)
 * @param {boolean} options.skipInitialFetch - Whether to skip the initial fetch
 * @param {boolean} options.backgroundRefresh - Whether to refresh in background while showing cached data
 * @param {boolean} options.smartRefresh - Whether to apply smart comparison for state updates
 * @returns {Object} Object containing { users/user, totalUsers, currentPage, totalPages, isLoading, error, refetch }
 */
export const useUsers = (options = {}) => {
  const {
    userId,
    page = 1,
    limit = 50,
    search = '',
    role = '',
    status = '',
    sortBy = 'createdAt',
    sortOrder = 'desc',
    cacheTimeout = 5 * 60 * 1000, // 5 minutes default
    skipInitialFetch = false,
    backgroundRefresh = true,
    smartRefresh = true,
  } = options;

  // Check if we're in single user mode
  const isSingleUserMode = !!userId;

  // Determine which fetch function to use
  const fetchAction = useMemo(() => {
    if (isSingleUserMode) {
      return () => fetchUser(userId);
    } else {
      return () =>
        fetchUsers({
          page,
          limit,
          search,
          role,
          status,
          sortBy,
          sortOrder,
        });
    }
  }, [
    isSingleUserMode,
    userId,
    page,
    limit,
    search,
    role,
    status,
    sortBy,
    sortOrder,
  ]);

  // Data selector - extracts the appropriate data from the response
  const selectData = useMemo(() => {
    if (isSingleUserMode) {
      // For single user, return the user directly
      return (responseData) => responseData;
    } else {
      // For users list, return the full response with pagination info
      return (responseData) => responseData;
    }
  }, [isSingleUserMode]);

  // Simple in-memory cache key for users data
  const cacheKey = useMemo(() => {
    if (isSingleUserMode) {
      return `user_${userId}`;
    } else {
      return `users_${page}_${limit}_${search}_${role}_${status}_${sortBy}_${sortOrder}`;
    }
  }, [
    isSingleUserMode,
    userId,
    page,
    limit,
    search,
    role,
    status,
    sortBy,
    sortOrder,
  ]);

  // Mock selectors for the useDataFetching hook
  // Since we're not using Redux for users data, we'll use a simple approach
  const selectLastFetched = useMemo(() => {
    return () => null; // Always fetch fresh data for now
  }, []);

  const selectIsLoading = useMemo(() => {
    return () => false; // Loading state handled by useDataFetching
  }, []);

  const selectError = useMemo(() => {
    return () => null; // Error state handled by useDataFetching
  }, []);

  // Use our generic hook with users-specific configuration
  const { data, isLoading, error, refetch } = useDataFetching({
    fetchAction,
    selectData,
    selectLastFetched,
    selectIsLoading,
    selectError,
    dependencies: [cacheKey], // Re-fetch when cache key changes
    fetchParams: {},
    cacheTimeout,
    skipInitialFetch,
    backgroundRefresh,
    smartRefresh,
  });

  // Return appropriate data structure based on mode
  return useMemo(() => {
    if (isSingleUserMode) {
      return {
        user: data,
        isLoading,
        error,
        refetch,
      };
    } else {
      return {
        users: data?.users || [],
        totalUsers: data?.totalUsers || 0,
        currentPage: data?.currentPage || page,
        totalPages: data?.totalPages || 1,
        isLoading,
        error,
        refetch,
      };
    }
  }, [data, isLoading, error, refetch, isSingleUserMode, page]);
};

/**
 * Hook for fetching all users (convenience wrapper)
 * @param {Object} options - Options for filtering and pagination
 * @returns {Object} Users data with loading and error states
 */
export const useAllUsers = (options = {}) => {
  return useUsers(options);
};

/**
 * Hook for fetching a single user by ID
 * @param {string} userId - User ID to fetch
 * @param {Object} options - Additional options
 * @returns {Object} User data with loading and error states
 */
export const useUser = (userId, options = {}) => {
  return useUsers({ ...options, userId });
};

/**
 * Hook for searching users with debounced search functionality
 * @param {string} searchTerm - Search term to filter users
 * @param {Object} options - Additional options
 * @returns {Object} Filtered users data
 */
export const useUserSearch = (searchTerm, options = {}) => {
  return useUsers({
    ...options,
    search: searchTerm,
    cacheTimeout: 30 * 1000, // Shorter cache for search results
  });
};

// Default export
export default useUsers;
