/**
 * useRoleManagement.js - Custom hook for role management operations
 *
 * Comprehensive hook for handling role-based access control (RBAC) operations
 * including role CRUD, permission management, role assignments, and validation.
 * Follows the established useDataFetching pattern with intelligent caching
 * and background refresh capabilities.
 *
 * Part of Milestone 5: Role Management & Permissions
 *
 * Features:
 * - Role data fetching with filtering and pagination
 * - Real-time role and permission management
 * - User-role assignment operations
 * - Permission conflict validation
 * - Intelligent caching and background refresh
 * - Comprehensive error handling and loading states
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import roleManagementService, {
  SYSTEM_PERMISSIONS,
  DEFAULT_ROLES,
} from '../services/roleManagementService';
import useDataFetching from './useDataFetching';

/**
 * Custom hook for role management operations
 * @param {Object} options - Configuration options
 * @param {number} options.cacheTimeout - Cache timeout in milliseconds
 * @param {boolean} options.backgroundRefresh - Enable background refresh
 * @param {boolean} options.smartRefresh - Enable smart data comparison
 * @param {boolean} options.enableNotifications - Enable operation notifications
 * @param {number} options.refreshInterval - Auto-refresh interval in milliseconds
 * @param {boolean} options.skipInitialFetch - Skip initial data fetch
 * @returns {Object} Role management state and operations
 */
const useRoleManagement = (options = {}) => {
  const {
    cacheTimeout = 5 * 60 * 1000, // 5 minutes default
    backgroundRefresh = true,
    smartRefresh = true,
    enableNotifications = true,
    refreshInterval = 30 * 1000, // 30 seconds
    skipInitialFetch = false,
  } = options;

  // ===============================================
  // STATE MANAGEMENT
  // ===============================================

  // Roles data state
  const [rolesFilter, setRolesFilter] = useState({
    page: 1,
    limit: 20,
    search: '',
    type: 'all', // 'all', 'system', 'custom'
    sortBy: 'name',
    sortOrder: 'asc',
  });

  // Roles data state
  const [rolesData, setRolesData] = useState({
    roles: [],
    totalRoles: 0,
    page: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);

  // Permission and assignment state
  const [systemPermissions, setSystemPermissions] =
    useState(SYSTEM_PERMISSIONS);
  const [roleAssignments, setRoleAssignments] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [permissionValidation, setPermissionValidation] = useState(null);

  // Operation loading states
  const [operationLoading, setOperationLoading] = useState({
    creating: false,
    updating: false,
    deleting: false,
    assigning: false,
    validating: false,
  });

  // Error states for specific operations
  const [operationErrors, setOperationErrors] = useState({
    create: null,
    update: null,
    delete: null,
    assign: null,
    validate: null,
  });

  // ===============================================
  // DATA FETCHING FUNCTIONS
  // ===============================================

  /**
   * Check if cached data is stale
   */
  const isCacheStale = useCallback(() => {
    if (!lastFetched) return true;
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetched;
    return timeSinceLastFetch > cacheTimeout;
  }, [lastFetched, cacheTimeout]);

  /**
   * Fetch roles with current filter parameters
   */
  const fetchRoles = useCallback(
    async (forceRefresh = false) => {
      // Check if cache is still fresh and we're not forcing refresh
      if (!forceRefresh && !isCacheStale() && rolesData.roles.length > 0) {
        return rolesData;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await roleManagementService.getRoles(rolesFilter);
        const responseData = result?.data || {
          roles: [],
          totalRoles: 0,
          page: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        };

        setRolesData(responseData);
        setLastFetched(Date.now());
        return responseData;
      } catch (error) {
        console.error('Error fetching roles:', error);
        setError(error.message || 'Failed to fetch roles');
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [rolesFilter, isCacheStale, rolesData]
  );

  /**
   * Refetch roles (public API)
   */
  const refetchRoles = useCallback(
    (forceRefresh = true) => {
      return fetchRoles(forceRefresh);
    },
    [fetchRoles]
  );

  // ===============================================
  // ROLE OPERATIONS
  // ===============================================

  /**
   * Create a new custom role
   * @param {Object} roleData - Role creation data
   * @returns {Promise<Object>} Creation result
   */
  const createRole = useCallback(
    async (roleData) => {
      setOperationLoading((prev) => ({ ...prev, creating: true }));
      setOperationErrors((prev) => ({ ...prev, create: null }));

      try {
        const result = await roleManagementService.createRole(roleData);

        if (enableNotifications) {
          console.log(`Role "${roleData.name}" created successfully`);
        }

        // Refresh roles list after creation
        await refetchRoles();

        return result;
      } catch (error) {
        const errorMessage = error.message || 'Failed to create role';
        setOperationErrors((prev) => ({ ...prev, create: errorMessage }));

        if (enableNotifications) {
          console.error('Role creation failed:', errorMessage);
        }

        throw error;
      } finally {
        setOperationLoading((prev) => ({ ...prev, creating: false }));
      }
    },
    [enableNotifications, refetchRoles]
  );

  /**
   * Update an existing role
   * @param {string} roleId - Role ID to update
   * @param {Object} updates - Role update data
   * @returns {Promise<Object>} Update result
   */
  const updateRole = useCallback(
    async (roleId, updates) => {
      setOperationLoading((prev) => ({ ...prev, updating: true }));
      setOperationErrors((prev) => ({ ...prev, update: null }));

      try {
        const result = await roleManagementService.updateRole(roleId, updates);

        if (enableNotifications) {
          console.log(`Role updated successfully`);
        }

        // Refresh roles list and selected role after update
        await refetchRoles();
        if (selectedRole?.id === roleId) {
          const updatedRole = await roleManagementService.getRole(roleId);
          setSelectedRole(updatedRole.data);
        }

        return result;
      } catch (error) {
        const errorMessage = error.message || 'Failed to update role';
        setOperationErrors((prev) => ({ ...prev, update: errorMessage }));

        if (enableNotifications) {
          console.error('Role update failed:', errorMessage);
        }

        throw error;
      } finally {
        setOperationLoading((prev) => ({ ...prev, updating: false }));
      }
    },
    [enableNotifications, refetchRoles, selectedRole]
  );

  /**
   * Delete a custom role
   * @param {string} roleId - Role ID to delete
   * @returns {Promise<Object>} Deletion result
   */
  const deleteRole = useCallback(
    async (roleId) => {
      setOperationLoading((prev) => ({ ...prev, deleting: true }));
      setOperationErrors((prev) => ({ ...prev, delete: null }));

      try {
        const result = await roleManagementService.deleteRole(roleId);

        if (enableNotifications) {
          console.log('Role deleted successfully');
        }

        // Refresh roles list after deletion
        await refetchRoles();

        // Clear selected role if it was deleted
        if (selectedRole?.id === roleId) {
          setSelectedRole(null);
        }

        return result;
      } catch (error) {
        const errorMessage = error.message || 'Failed to delete role';
        setOperationErrors((prev) => ({ ...prev, delete: errorMessage }));

        if (enableNotifications) {
          console.error('Role deletion failed:', errorMessage);
        }

        throw error;
      } finally {
        setOperationLoading((prev) => ({ ...prev, deleting: false }));
      }
    },
    [enableNotifications, refetchRoles, selectedRole]
  );

  /**
   * Get a specific role by ID
   * @param {string} roleId - Role ID to fetch
   * @returns {Promise<Object>} Role data
   */
  const getRole = useCallback(async (roleId) => {
    try {
      const result = await roleManagementService.getRole(roleId);
      return result.data;
    } catch (error) {
      console.error(`Error fetching role ${roleId}:`, error);
      throw error;
    }
  }, []);

  // ===============================================
  // PERMISSION OPERATIONS
  // ===============================================

  /**
   * Validate role permissions for conflicts
   * @param {Object} permissions - Permissions to validate
   * @returns {Promise<Object>} Validation results
   */
  const validatePermissions = useCallback(async (permissions) => {
    setOperationLoading((prev) => ({ ...prev, validating: true }));
    setOperationErrors((prev) => ({ ...prev, validate: null }));

    try {
      const result = await roleManagementService.validatePermissions(
        permissions
      );
      setPermissionValidation(result.data);
      return result.data;
    } catch (error) {
      const errorMessage = error.message || 'Failed to validate permissions';
      setOperationErrors((prev) => ({ ...prev, validate: errorMessage }));
      throw error;
    } finally {
      setOperationLoading((prev) => ({ ...prev, validating: false }));
    }
  }, []);

  /**
   * Get system permissions structure
   * @returns {Promise<Object>} System permissions
   */
  const getSystemPermissions = useCallback(async () => {
    try {
      const result = await roleManagementService.getSystemPermissions();
      setSystemPermissions(result.data);
      return result.data;
    } catch (error) {
      console.error('Error fetching system permissions:', error);
      throw error;
    }
  }, []);

  // ===============================================
  // ROLE ASSIGNMENT OPERATIONS
  // ===============================================

  /**
   * Assign a role to a user
   * @param {string} userId - User ID
   * @param {string} roleId - Role ID to assign
   * @returns {Promise<Object>} Assignment result
   */
  const assignRole = useCallback(
    async (userId, roleId) => {
      setOperationLoading((prev) => ({ ...prev, assigning: true }));
      setOperationErrors((prev) => ({ ...prev, assign: null }));

      try {
        const result = await roleManagementService.assignRole(userId, roleId);

        if (enableNotifications) {
          console.log('Role assigned successfully');
        }

        // Refresh role assignments after assignment
        const assignmentsResult =
          await roleManagementService.getRoleAssignments();
        setRoleAssignments(assignmentsResult.data.assignments);

        return result;
      } catch (error) {
        const errorMessage = error.message || 'Failed to assign role';
        setOperationErrors((prev) => ({ ...prev, assign: errorMessage }));

        if (enableNotifications) {
          console.error('Role assignment failed:', errorMessage);
        }

        throw error;
      } finally {
        setOperationLoading((prev) => ({ ...prev, assigning: false }));
      }
    },
    [enableNotifications]
  );

  /**
   * Get role assignments for users
   * @returns {Promise<Array>} Role assignments
   */
  const getRoleAssignments = useCallback(async () => {
    try {
      const result = await roleManagementService.getRoleAssignments();
      setRoleAssignments(result.data.assignments);
      return result.data.assignments;
    } catch (error) {
      console.error('Error fetching role assignments:', error);
      throw error;
    }
  }, []);

  // ===============================================
  // FILTER AND PAGINATION OPERATIONS
  // ===============================================

  /**
   * Update roles filter parameters
   * @param {Object} newFilter - New filter parameters
   */
  const updateRolesFilter = useCallback((newFilter) => {
    setRolesFilter((prev) => ({ ...prev, ...newFilter }));
  }, []);

  /**
   * Reset roles filter to default values
   */
  const resetRolesFilter = useCallback(() => {
    setRolesFilter({
      page: 1,
      limit: 20,
      search: '',
      type: 'all',
      sortBy: 'name',
      sortOrder: 'asc',
    });
  }, []);

  /**
   * Search roles by name or description
   * @param {string} searchTerm - Search term
   */
  const searchRoles = useCallback((searchTerm) => {
    setRolesFilter((prev) => ({
      ...prev,
      search: searchTerm,
      page: 1, // Reset to first page when searching
    }));
  }, []);

  /**
   * Filter roles by type (system, custom, all)
   * @param {string} type - Role type filter
   */
  const filterRolesByType = useCallback((type) => {
    setRolesFilter((prev) => ({
      ...prev,
      type,
      page: 1, // Reset to first page when filtering
    }));
  }, []);

  /**
   * Change page for roles pagination
   * @param {number} page - Page number
   */
  const changeRolesPage = useCallback((page) => {
    setRolesFilter((prev) => ({ ...prev, page }));
  }, []);

  /**
   * Sort roles by field and order
   * @param {string} sortBy - Field to sort by
   * @param {string} sortOrder - Sort order (asc, desc)
   */
  const sortRoles = useCallback((sortBy, sortOrder = 'asc') => {
    setRolesFilter((prev) => ({ ...prev, sortBy, sortOrder }));
  }, []);

  // ===============================================
  // UTILITY FUNCTIONS
  // ===============================================

  /**
   * Clear all operation errors
   */
  const clearErrors = useCallback(() => {
    setOperationErrors({
      create: null,
      update: null,
      delete: null,
      assign: null,
      validate: null,
    });
  }, []);

  /**
   * Clear permission validation results
   */
  const clearPermissionValidation = useCallback(() => {
    setPermissionValidation(null);
  }, []);

  /**
   * Check if a role is a system role (cannot be modified/deleted)
   * @param {Object} role - Role object
   * @returns {boolean} True if system role
   */
  const isSystemRole = useCallback((role) => {
    return role?.isSystem === true;
  }, []);

  /**
   * Get role statistics
   * @returns {Object} Role statistics
   */
  const getRoleStatistics = useMemo(() => {
    if (!rolesData?.roles) {
      return {
        totalRoles: 0,
        systemRoles: 0,
        customRoles: 0,
        totalUsers: 0,
      };
    }

    const systemRoles = rolesData.roles.filter((role) => role.isSystem).length;
    const customRoles = rolesData.roles.filter((role) => !role.isSystem).length;
    const totalUsers = rolesData.roles.reduce(
      (sum, role) => sum + (role.userCount || 0),
      0
    );

    return {
      totalRoles: rolesData.totalRoles,
      systemRoles,
      customRoles,
      totalUsers,
    };
  }, [rolesData]);

  // ===============================================
  // EFFECTS FOR DATA FETCHING
  // ===============================================

  /**
   * Initial data fetch and filter change handling
   */
  useEffect(() => {
    if (!skipInitialFetch) {
      fetchRoles(false);
    }
  }, [JSON.stringify(rolesFilter)]); // Re-fetch when filter changes

  /**
   * Background refresh setup
   */
  useEffect(() => {
    if (!backgroundRefresh) return;

    const intervalId = setInterval(() => {
      if (!isLoading && isCacheStale()) {
        fetchRoles(false);
      }
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [backgroundRefresh, refreshInterval, isLoading, isCacheStale, fetchRoles]);

  /**
   * Initial system permissions fetch
   */
  useEffect(() => {
    getSystemPermissions();
  }, [getSystemPermissions]);

  // ===============================================
  // RETURN OBJECT
  // ===============================================

  return {
    // Roles data
    roles: rolesData?.roles || [],
    rolesData: rolesData || {
      roles: [],
      totalRoles: 0,
      page: 1,
      totalPages: 1,
    },
    selectedRole,
    setSelectedRole,
    roleStatistics: getRoleStatistics,

    // System permissions
    systemPermissions,
    permissionValidation,

    // Role assignments
    roleAssignments,

    // Loading states
    isLoading,
    operationLoading,

    // Error states
    error,
    operationErrors,

    // Filter and pagination
    rolesFilter,
    updateRolesFilter,
    resetRolesFilter,
    searchRoles,
    filterRolesByType,
    changeRolesPage,
    sortRoles,

    // Role operations
    createRole,
    updateRole,
    deleteRole,
    getRole,
    refetchRoles,

    // Permission operations
    validatePermissions,
    getSystemPermissions,
    clearPermissionValidation,

    // Assignment operations
    assignRole,
    getRoleAssignments,

    // Utility functions
    clearErrors,
    isSystemRole,

    // Data refresh
    refreshRoles: refetchRoles,
  };
};

export default useRoleManagement;
