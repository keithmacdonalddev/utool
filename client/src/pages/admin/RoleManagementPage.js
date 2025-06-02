import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Users2,
  Plus,
  ArrowLeft,
  Settings,
  Eye,
  Edit3,
  Info,
  CheckCircle,
  AlertTriangle,
  Crown,
  Lock,
  Unlock,
  RefreshCw,
  Filter,
  Search,
  UserCog,
  Database,
  FileText,
  BarChart3,
  Globe,
  Zap,
} from 'lucide-react';

import useRoleManagement from '../../hooks/useRoleManagement';
import RoleList from '../../components/admin/roles/RoleList';
import RoleForm from '../../components/admin/roles/RoleForm';

/**
 * RoleManagementPage Component
 *
 * Comprehensive role management dashboard that provides a complete interface
 * for managing roles and permissions in the system. Integrates role listing,
 * creation, editing, and viewing functionality with advanced permission
 * management capabilities.
 *
 * Part of Milestone 5: Role Management & Permissions
 *
 * Features:
 * - Role listing with search, filtering, and pagination
 * - Role creation and editing with permission management
 * - Role viewing with detailed permission breakdown
 * - Real-time role statistics and overview
 * - Permission validation and conflict detection
 * - System role protection and management
 * - Responsive design with professional UI
 * - Integration with role management service
 *
 * Views:
 * - 'list': Main role listing view (default)
 * - 'create': Role creation form
 * - 'edit': Role editing form
 * - 'view': Role details view (read-only)
 *
 * @returns {React.ReactElement} The RoleManagementPage component
 */
const RoleManagementPage = () => {
  // ===============================================
  // HOOKS AND STATE
  // ===============================================

  const navigate = useNavigate();

  // Role management hook with configuration
  const {
    // Data
    roles,
    rolesData,
    selectedRole,
    setSelectedRole,
    roleStatistics,
    systemPermissions,
    permissionValidation,
    roleAssignments,

    // Loading and error states
    isLoading,
    operationLoading,
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
  } = useRoleManagement({
    cacheTimeout: 5 * 60 * 1000, // 5 minutes
    backgroundRefresh: true,
    smartRefresh: true,
    enableNotifications: true,
    refreshInterval: 30 * 1000, // 30 seconds
  });

  // Page state management
  const [currentView, setCurrentView] = useState('list'); // 'list', 'create', 'edit', 'view'
  const [pageError, setPageError] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(null);

  // ===============================================
  // EFFECTS
  // ===============================================

  /**
   * Auto-hide success messages
   */
  useEffect(() => {
    if (showSuccessMessage) {
      const timer = setTimeout(() => {
        setShowSuccessMessage(null);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [showSuccessMessage]);

  /**
   * Clear errors when view changes
   */
  useEffect(() => {
    setPageError(null);
    clearErrors();
  }, [currentView, clearErrors]);

  // ===============================================
  // EVENT HANDLERS
  // ===============================================

  /**
   * Handle role creation
   */
  const handleCreateRole = () => {
    setSelectedRole(null);
    setCurrentView('create');
    clearPermissionValidation();
  };

  /**
   * Handle role editing
   */
  const handleEditRole = async (role) => {
    try {
      // Fetch fresh role data for editing
      const freshRoleData = await getRole(role.id);
      setSelectedRole(freshRoleData);
      setCurrentView('edit');
      clearPermissionValidation();
    } catch (error) {
      setPageError(`Failed to load role for editing: ${error.message}`);
    }
  };

  /**
   * Handle role viewing
   */
  const handleViewRole = async (role) => {
    try {
      // Fetch fresh role data for viewing
      const freshRoleData = await getRole(role.id);
      setSelectedRole(freshRoleData);
      setCurrentView('view');
    } catch (error) {
      setPageError(`Failed to load role details: ${error.message}`);
    }
  };

  /**
   * Handle role deletion
   */
  const handleDeleteRole = async (roleId) => {
    try {
      await deleteRole(roleId);
      setShowSuccessMessage('Role deleted successfully');

      // Return to list view if we were viewing/editing the deleted role
      if (selectedRole?.id === roleId) {
        setCurrentView('list');
        setSelectedRole(null);
      }
    } catch (error) {
      setPageError(`Failed to delete role: ${error.message}`);
    }
  };

  /**
   * Handle role form save (create or update)
   */
  const handleSaveRole = async (roleData) => {
    try {
      if (currentView === 'create') {
        const newRole = await createRole(roleData);
        setShowSuccessMessage(`Role "${roleData.name}" created successfully`);
        setCurrentView('list');
      } else if (currentView === 'edit' && selectedRole) {
        await updateRole(selectedRole.id, roleData);
        setShowSuccessMessage(`Role "${roleData.name}" updated successfully`);
        setCurrentView('list');
      }

      setSelectedRole(null);
      clearPermissionValidation();
    } catch (error) {
      // Error is handled by the form component
      throw error;
    }
  };

  /**
   * Handle cancel form action
   */
  const handleCancelForm = () => {
    setCurrentView('list');
    setSelectedRole(null);
    clearPermissionValidation();
  };

  /**
   * Handle back to list navigation
   */
  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedRole(null);
  };

  // ===============================================
  // RENDER METHODS
  // ===============================================

  /**
   * Render page header with navigation and actions
   */
  const renderPageHeader = () => {
    const getViewTitle = () => {
      switch (currentView) {
        case 'create':
          return 'Create New Role';
        case 'edit':
          return `Edit Role: ${selectedRole?.name}`;
        case 'view':
          return `Role Details: ${selectedRole?.name}`;
        default:
          return 'Role Management';
      }
    };

    const getViewDescription = () => {
      switch (currentView) {
        case 'create':
          return 'Define a new role with specific permissions and access levels';
        case 'edit':
          return 'Modify role permissions and settings';
        case 'view':
          return 'View role details and permission assignments';
        default:
          return 'Manage user roles and permissions across the system';
      }
    };

    return (
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          {currentView !== 'list' && (
            <button
              onClick={handleBackToList}
              className="flex items-center gap-2 px-3 py-2 text-muted hover:text-heading hover:bg-surface-secondary rounded-lg transition-colors duration-200"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Roles
            </button>
          )}

          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-brand-primary/10 rounded-lg">
                <Shield className="h-6 w-6 text-brand-primary" />
              </div>
              <h1 className="text-heading text-2xl font-bold">
                {getViewTitle()}
              </h1>
            </div>
            <p className="text-caption">{getViewDescription()}</p>
          </div>
        </div>

        {currentView === 'list' && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => refetchRoles()}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 text-heading hover:text-brand-primary hover:bg-surface-secondary rounded-lg transition-colors duration-200 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
              />
              Refresh
            </button>

            <button
              onClick={handleCreateRole}
              className="flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-brand-primary-dark text-white rounded-lg transition-colors duration-200"
            >
              <Plus className="h-4 w-4" />
              Create Role
            </button>
          </div>
        )}
      </div>
    );
  };

  /**
   * Render success message banner
   */
  const renderSuccessMessage = () => {
    if (!showSuccessMessage) return null;

    return (
      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-400" />
          <p className="text-green-400 font-medium">{showSuccessMessage}</p>
        </div>
        <button
          onClick={() => setShowSuccessMessage(null)}
          className="text-green-400 hover:text-green-300 transition-colors duration-200"
        >
          ×
        </button>
      </div>
    );
  };

  /**
   * Render error message banner
   */
  const renderErrorMessage = () => {
    const errorToShow = pageError || error;
    if (!errorToShow) return null;

    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <p className="text-red-400 font-medium">{errorToShow}</p>
        </div>
        <button
          onClick={() => {
            setPageError(null);
            clearErrors();
          }}
          className="text-red-400 hover:text-red-300 transition-colors duration-200"
        >
          ×
        </button>
      </div>
    );
  };

  /**
   * Render milestone features banner
   */
  const renderFeaturesBanner = () => {
    if (currentView !== 'list') return null;

    return (
      <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-lg p-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-brand-primary/10 rounded-lg">
            <Info className="h-5 w-5 text-brand-primary" />
          </div>

          <div className="flex-1">
            <h3 className="text-heading font-semibold mb-2">
              Milestone 5: Role Management & Permissions
            </h3>
            <p className="text-caption mb-4">
              Advanced role-based access control (RBAC) system with granular
              permission management, role inheritance, and comprehensive
              security controls.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-caption text-sm">
                  Hierarchical Permissions
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-caption text-sm">
                  Permission Validation
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-caption text-sm">
                  System Role Protection
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-caption text-sm">
                  Real-time Management
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Render role details view (read-only)
   */
  const renderRoleDetailsView = () => {
    if (!selectedRole) return null;

    const getPermissionCount = (role) => {
      if (!role.permissions) return 0;
      return Object.values(role.permissions).reduce((total, perms) => {
        return total + (Array.isArray(perms) ? perms.length : 0);
      }, 0);
    };

    const getCategoryIcon = (category) => {
      const icons = {
        user: UserCog,
        content: FileText,
        analytics: BarChart3,
        system: Settings,
        api: Database,
        admin: Shield,
        public: Globe,
      };
      return icons[category.toLowerCase()] || Zap;
    };

    return (
      <div className="space-y-6">
        {/* Role Information Card */}
        <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-brand-primary/10 rounded-lg">
                {isSystemRole(selectedRole) ? (
                  <Lock className="h-6 w-6 text-blue-400" />
                ) : (
                  <UserCog className="h-6 w-6 text-brand-primary" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-heading text-xl font-semibold">
                    {selectedRole.name}
                  </h2>

                  {isSystemRole(selectedRole) && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-xs">
                      <Shield className="h-3 w-3" />
                      System Role
                    </span>
                  )}

                  {selectedRole.isDefault && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs">
                      <Crown className="h-3 w-3" />
                      Default
                    </span>
                  )}
                </div>

                <p className="text-caption">{selectedRole.description}</p>
              </div>
            </div>

            {!isSystemRole(selectedRole) && (
              <button
                onClick={() => handleEditRole(selectedRole)}
                className="flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-brand-primary-dark text-white rounded-lg transition-colors duration-200"
              >
                <Edit3 className="h-4 w-4" />
                Edit Role
              </button>
            )}
          </div>

          {/* Role Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-surface-secondary rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption text-sm">Users Assigned</p>
                  <p className="text-heading text-2xl font-bold">
                    {selectedRole.userCount || 0}
                  </p>
                </div>
                <Users2 className="h-8 w-8 text-purple-400" />
              </div>
            </div>

            <div className="bg-surface-secondary rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption text-sm">Total Permissions</p>
                  <p className="text-heading text-2xl font-bold">
                    {getPermissionCount(selectedRole)}
                  </p>
                </div>
                <Shield className="h-8 w-8 text-brand-primary" />
              </div>
            </div>

            <div className="bg-surface-secondary rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption text-sm">Created</p>
                  <p className="text-heading text-sm font-medium">
                    {selectedRole.createdAt
                      ? new Date(selectedRole.createdAt).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
                <Info className="h-8 w-8 text-muted" />
              </div>
            </div>
          </div>
        </div>

        {/* Permissions Breakdown */}
        <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6">
          <h3 className="text-heading font-medium mb-4">
            Permission Breakdown
          </h3>

          {selectedRole.permissions &&
          Object.keys(selectedRole.permissions).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(selectedRole.permissions).map(
                ([category, permissions]) => {
                  if (!permissions || permissions.length === 0) return null;

                  const CategoryIcon = getCategoryIcon(category);

                  return (
                    <div
                      key={category}
                      className="border border-border-secondary rounded-lg p-4"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <CategoryIcon className="h-5 w-5 text-brand-primary" />
                        <h4 className="text-heading font-medium capitalize">
                          {category} Permissions ({permissions.length})
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {permissions.map((permissionKey) => {
                          // Find permission details from system permissions
                          // Access the permissions array within the category object
                          const categoryData = systemPermissions[category];
                          const permissionExists =
                            categoryData?.permissions?.includes(permissionKey);

                          return (
                            <div
                              key={permissionKey}
                              className="flex items-center gap-2 p-2 bg-surface-secondary rounded text-sm"
                            >
                              <CheckCircle className="h-3 w-3 text-green-400 flex-shrink-0" />
                              <span className="text-heading">
                                {permissionExists
                                  ? `${categoryData.name} - ${permissionKey}`
                                  : permissionKey}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-muted mx-auto mb-3" />
              <p className="text-heading font-medium">
                No Permissions Assigned
              </p>
              <p className="text-caption text-sm">
                This role has no permissions configured.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  /**
   * Render current view content
   */
  const renderViewContent = () => {
    switch (currentView) {
      case 'create':
      case 'edit':
        return (
          <RoleForm
            role={currentView === 'edit' ? selectedRole : null}
            systemPermissions={systemPermissions}
            permissionValidation={permissionValidation}
            isLoading={operationLoading.creating || operationLoading.updating}
            error={operationErrors.create || operationErrors.update}
            onSave={handleSaveRole}
            onCancel={handleCancelForm}
            onValidatePermissions={validatePermissions}
            isSystemRole={isSystemRole}
          />
        );

      case 'view':
        return renderRoleDetailsView();

      default:
        return (
          <RoleList
            roles={roles}
            rolesData={rolesData}
            rolesFilter={rolesFilter}
            isLoading={isLoading}
            error={error}
            roleStatistics={roleStatistics}
            onCreateRole={handleCreateRole}
            onEditRole={handleEditRole}
            onDeleteRole={handleDeleteRole}
            onViewRole={handleViewRole}
            onSearchRoles={searchRoles}
            onFilterRoles={filterRolesByType}
            onSortRoles={sortRoles}
            onChangePage={changeRolesPage}
            isSystemRole={isSystemRole}
          />
        );
    }
  };

  // ===============================================
  // MAIN RENDER
  // ===============================================

  return (
    <div className="min-h-screen bg-surface-primary">
      <div className="max-w-7xl mx-auto p-6">
        {/* Page Header */}
        {renderPageHeader()}

        {/* Success Message */}
        {renderSuccessMessage()}

        {/* Error Message */}
        {renderErrorMessage()}

        {/* Features Banner */}
        {renderFeaturesBanner()}

        {/* Main Content */}
        {renderViewContent()}
      </div>
    </div>
  );
};

export default RoleManagementPage;
