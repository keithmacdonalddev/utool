import React, { useState } from 'react';
import {
  Users2,
  Search,
  Filter,
  Plus,
  Edit3,
  Trash2,
  Eye,
  Shield,
  Crown,
  Users,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
} from 'lucide-react';

/**
 * RoleList Component
 *
 * Comprehensive role listing interface that displays system and custom roles
 * with advanced filtering, searching, pagination, and management actions.
 * Integrates with the useRoleManagement hook for complete role management.
 *
 * Part of Milestone 5: Role Management & Permissions
 *
 * Features:
 * - Role display with detailed information
 * - Advanced search and filtering
 * - Pagination with customizable page sizes
 * - Role actions (view, edit, delete)
 * - System vs Custom role differentiation
 * - Permission count and user count display
 * - Responsive design with mobile optimization
 * - Loading states and error handling
 *
 * @param {Object} props - Component props
 * @param {Array} props.roles - Array of role objects
 * @param {Object} props.rolesData - Pagination and metadata
 * @param {Object} props.rolesFilter - Current filter state
 * @param {boolean} props.isLoading - Loading state
 * @param {string} props.error - Error message
 * @param {Object} props.roleStatistics - Role statistics
 * @param {Function} props.onCreateRole - Create new role handler
 * @param {Function} props.onEditRole - Edit role handler
 * @param {Function} props.onDeleteRole - Delete role handler
 * @param {Function} props.onViewRole - View role details handler
 * @param {Function} props.onSearchRoles - Search roles handler
 * @param {Function} props.onFilterRoles - Filter roles handler
 * @param {Function} props.onSortRoles - Sort roles handler
 * @param {Function} props.onChangePage - Change page handler
 * @param {Function} props.isSystemRole - Check if role is system role
 * @returns {React.ReactElement} The RoleList component
 */
const RoleList = ({
  roles = [],
  rolesData = {
    totalRoles: 0,
    page: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  },
  rolesFilter = { search: '', type: 'all', sortBy: 'name', sortOrder: 'asc' },
  isLoading = false,
  error = null,
  roleStatistics = {
    totalRoles: 0,
    systemRoles: 0,
    customRoles: 0,
    totalUsers: 0,
  },
  onCreateRole,
  onEditRole,
  onDeleteRole,
  onViewRole,
  onSearchRoles,
  onFilterRoles,
  onSortRoles,
  onChangePage,
  isSystemRole,
}) => {
  // ===============================================
  // STATE MANAGEMENT
  // ===============================================

  const [searchTerm, setSearchTerm] = useState(rolesFilter.search || '');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);

  // ===============================================
  // EVENT HANDLERS
  // ===============================================

  /**
   * Handle search input change with debouncing
   */
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    // Debounce search to avoid excessive API calls
    clearTimeout(handleSearchChange.timeout);
    handleSearchChange.timeout = setTimeout(() => {
      onSearchRoles(value);
    }, 300);
  };

  /**
   * Handle role type filter change
   */
  const handleTypeFilter = (type) => {
    onFilterRoles(type);
  };

  /**
   * Handle column sorting
   */
  const handleSort = (column) => {
    const newOrder =
      rolesFilter.sortBy === column && rolesFilter.sortOrder === 'asc'
        ? 'desc'
        : 'asc';
    onSortRoles(column, newOrder);
  };

  /**
   * Handle role selection for bulk operations
   */
  const handleRoleSelection = (roleId) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId]
    );
  };

  /**
   * Handle select all roles
   */
  const handleSelectAll = () => {
    if (selectedRoles.length === roles.length) {
      setSelectedRoles([]);
    } else {
      setSelectedRoles(roles.map((role) => role.id));
    }
  };

  /**
   * Handle delete role with confirmation
   */
  const handleDeleteRole = async (role) => {
    if (isSystemRole(role)) {
      alert('Cannot delete system roles');
      return;
    }

    setShowDeleteConfirm(role);
  };

  /**
   * Confirm role deletion
   */
  const confirmDeleteRole = async () => {
    if (showDeleteConfirm) {
      try {
        await onDeleteRole(showDeleteConfirm.id);
        setShowDeleteConfirm(null);
        setActionMenuOpen(null);
      } catch (error) {
        console.error('Delete failed:', error);
      }
    }
  };

  // ===============================================
  // UTILITY FUNCTIONS
  // ===============================================

  /**
   * Get role type badge styling
   */
  const getRoleTypeBadge = (role) => {
    if (isSystemRole(role)) {
      return {
        icon: Shield,
        text: 'System',
        className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      };
    }
    return {
      icon: Users2,
      text: 'Custom',
      className: 'bg-green-500/10 text-green-400 border-green-500/20',
    };
  };

  /**
   * Get permission count for a role
   */
  const getPermissionCount = (role) => {
    if (!role.permissions) return 0;

    return Object.values(role.permissions).reduce((total, perms) => {
      return total + (Array.isArray(perms) ? perms.length : 0);
    }, 0);
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // ===============================================
  // RENDER METHODS
  // ===============================================

  /**
   * Render role statistics cards
   */
  const renderStatistics = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-surface-elevated rounded-lg border border-border-secondary p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-caption text-sm">Total Roles</p>
            <p className="text-heading text-2xl font-bold">
              {roleStatistics.totalRoles}
            </p>
          </div>
          <Users2 className="h-8 w-8 text-brand-primary" />
        </div>
      </div>

      <div className="bg-surface-elevated rounded-lg border border-border-secondary p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-caption text-sm">System Roles</p>
            <p className="text-heading text-2xl font-bold">
              {roleStatistics.systemRoles}
            </p>
          </div>
          <Shield className="h-8 w-8 text-blue-400" />
        </div>
      </div>

      <div className="bg-surface-elevated rounded-lg border border-border-secondary p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-caption text-sm">Custom Roles</p>
            <p className="text-heading text-2xl font-bold">
              {roleStatistics.customRoles}
            </p>
          </div>
          <Settings className="h-8 w-8 text-green-400" />
        </div>
      </div>

      <div className="bg-surface-elevated rounded-lg border border-border-secondary p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-caption text-sm">Total Users</p>
            <p className="text-heading text-2xl font-bold">
              {roleStatistics.totalUsers}
            </p>
          </div>
          <Users className="h-8 w-8 text-purple-400" />
        </div>
      </div>
    </div>
  );

  /**
   * Render search and filter controls
   */
  const renderControls = () => (
    <div className="flex flex-col md:flex-row gap-4 mb-6">
      {/* Search */}
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted" />
        <input
          type="text"
          placeholder="Search roles by name or description..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="w-full pl-10 pr-4 py-2 bg-surface-secondary border border-border-secondary rounded-lg text-heading placeholder-muted focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors duration-200 ${
            showFilters
              ? 'bg-brand-primary text-white border-brand-primary'
              : 'bg-surface-secondary text-heading border-border-secondary hover:bg-surface-secondary/80'
          }`}
        >
          <Filter className="h-4 w-4" />
          Filters
        </button>

        {/* Create Role Button */}
        {onCreateRole && (
          <button
            onClick={onCreateRole}
            className="flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-brand-primary-dark text-white rounded-lg transition-colors duration-200"
          >
            <Plus className="h-4 w-4" />
            Create Role
          </button>
        )}
      </div>

      {/* Filter Options */}
      {showFilters && (
        <div className="md:absolute md:top-full md:right-0 md:mt-2 md:w-64 bg-surface-elevated border border-border-secondary rounded-lg shadow-lg p-4 z-10">
          <h4 className="text-heading font-medium mb-3">Filter by Type</h4>
          <div className="space-y-2">
            {[
              { value: 'all', label: 'All Roles' },
              { value: 'system', label: 'System Roles' },
              { value: 'custom', label: 'Custom Roles' },
            ].map((filter) => (
              <label
                key={filter.value}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="roleType"
                  value={filter.value}
                  checked={rolesFilter.type === filter.value}
                  onChange={() => handleTypeFilter(filter.value)}
                  className="text-brand-primary focus:ring-brand-primary"
                />
                <span className="text-heading text-sm">{filter.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  /**
   * Render roles table
   */
  const renderRolesTable = () => (
    <div className="bg-surface-elevated rounded-lg border border-border-secondary overflow-hidden">
      {/* Table Header */}
      <div className="bg-surface-secondary border-b border-border-secondary">
        <div className="flex items-center px-6 py-3">
          <div className="flex items-center gap-2 mr-4">
            <input
              type="checkbox"
              checked={
                selectedRoles.length === roles.length && roles.length > 0
              }
              onChange={handleSelectAll}
              className="rounded border-border-secondary text-brand-primary focus:ring-brand-primary"
            />
          </div>

          <div className="grid grid-cols-12 gap-4 flex-1 text-caption text-sm font-medium">
            <div
              className="col-span-3 flex items-center gap-1 cursor-pointer"
              onClick={() => handleSort('name')}
            >
              Role Name
              <ArrowUpDown className="h-3 w-3" />
            </div>
            <div className="col-span-2">Type</div>
            <div className="col-span-3">Description</div>
            <div className="col-span-1 text-center">Users</div>
            <div className="col-span-1 text-center">Permissions</div>
            <div
              className="col-span-1 text-center cursor-pointer"
              onClick={() => handleSort('updatedAt')}
            >
              Modified
            </div>
            <div className="col-span-1 text-center">Actions</div>
          </div>
        </div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-border-secondary">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-primary"></div>
              <span className="text-muted">Loading roles...</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2" />
              <p className="text-red-400 font-medium">Error loading roles</p>
              <p className="text-caption text-sm">{error}</p>
            </div>
          </div>
        ) : roles.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Users2 className="h-8 w-8 text-muted mx-auto mb-2" />
              <p className="text-heading font-medium">No roles found</p>
              <p className="text-caption text-sm">
                Try adjusting your search or filters
              </p>
            </div>
          </div>
        ) : (
          roles.map((role) => {
            const typeBadge = getRoleTypeBadge(role);
            const permissionCount = getPermissionCount(role);

            return (
              <div
                key={role.id}
                className="flex items-center px-6 py-4 hover:bg-surface-secondary/50 transition-colors duration-150"
              >
                <div className="flex items-center gap-2 mr-4">
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role.id)}
                    onChange={() => handleRoleSelection(role.id)}
                    className="rounded border-border-secondary text-brand-primary focus:ring-brand-primary"
                  />
                </div>

                <div className="grid grid-cols-12 gap-4 flex-1 items-center">
                  {/* Role Name */}
                  <div className="col-span-3">
                    <div className="flex items-center gap-2">
                      <typeBadge.icon className="h-4 w-4 text-brand-primary" />
                      <div>
                        <p className="text-heading font-medium">{role.name}</p>
                        {role.isDefault && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-400">
                            <Crown className="h-3 w-3" />
                            Default
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Type Badge */}
                  <div className="col-span-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${typeBadge.className}`}
                    >
                      <typeBadge.icon className="h-3 w-3" />
                      {typeBadge.text}
                    </span>
                  </div>

                  {/* Description */}
                  <div className="col-span-3">
                    <p
                      className="text-caption text-sm truncate"
                      title={role.description}
                    >
                      {role.description}
                    </p>
                  </div>

                  {/* User Count */}
                  <div className="col-span-1 text-center">
                    <span className="text-heading font-medium">
                      {role.userCount || 0}
                    </span>
                  </div>

                  {/* Permission Count */}
                  <div className="col-span-1 text-center">
                    <span className="text-heading font-medium">
                      {permissionCount}
                    </span>
                  </div>

                  {/* Modified Date */}
                  <div className="col-span-1 text-center">
                    <span className="text-caption text-sm">
                      {formatDate(role.updatedAt)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 text-center">
                    <div className="relative">
                      <button
                        onClick={() =>
                          setActionMenuOpen(
                            actionMenuOpen === role.id ? null : role.id
                          )
                        }
                        className="p-1 rounded hover:bg-surface-secondary transition-colors duration-150"
                      >
                        <MoreVertical className="h-4 w-4 text-muted" />
                      </button>

                      {actionMenuOpen === role.id && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-surface-elevated border border-border-secondary rounded-lg shadow-lg py-1 z-10">
                          <button
                            onClick={() => {
                              onViewRole(role);
                              setActionMenuOpen(null);
                            }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-left text-heading hover:bg-surface-secondary text-sm"
                          >
                            <Eye className="h-4 w-4" />
                            View Details
                          </button>

                          {!isSystemRole(role) && (
                            <>
                              <button
                                onClick={() => {
                                  onEditRole(role);
                                  setActionMenuOpen(null);
                                }}
                                className="flex items-center gap-2 w-full px-3 py-2 text-left text-heading hover:bg-surface-secondary text-sm"
                              >
                                <Edit3 className="h-4 w-4" />
                                Edit Role
                              </button>

                              <button
                                onClick={() => handleDeleteRole(role)}
                                className="flex items-center gap-2 w-full px-3 py-2 text-left text-red-400 hover:bg-surface-secondary text-sm"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete Role
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  /**
   * Render pagination controls
   */
  const renderPagination = () => {
    if (rolesData.totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between mt-6">
        <div className="text-caption text-sm">
          Showing {(rolesData.page - 1) * rolesFilter.limit + 1} to{' '}
          {Math.min(rolesData.page * rolesFilter.limit, rolesData.totalRoles)}{' '}
          of {rolesData.totalRoles} roles
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onChangePage(rolesData.page - 1)}
            disabled={!rolesData.hasPrevPage}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-border-secondary text-heading hover:bg-surface-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>

          <span className="px-3 py-2 text-heading font-medium">
            Page {rolesData.page} of {rolesData.totalPages}
          </span>

          <button
            onClick={() => onChangePage(rolesData.page + 1)}
            disabled={!rolesData.hasNextPage}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-border-secondary text-heading hover:bg-surface-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  // ===============================================
  // MAIN RENDER
  // ===============================================

  return (
    <div className="space-y-6">
      {/* Statistics */}
      {renderStatistics()}

      {/* Controls */}
      {renderControls()}

      {/* Roles Table */}
      {renderRolesTable()}

      {/* Pagination */}
      {renderPagination()}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <AlertTriangle className="mr-2 h-5 w-5 text-red-400" />
              <h3 className="text-heading text-lg font-semibold">
                Delete Role
              </h3>
            </div>

            <p className="text-caption mb-4">
              Are you sure you want to delete the role "{showDeleteConfirm.name}
              "? This action cannot be undone.
            </p>

            {showDeleteConfirm.userCount > 0 && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                <p className="text-red-400 text-sm">
                  <strong>Warning:</strong> This role is currently assigned to{' '}
                  {showDeleteConfirm.userCount} user(s). Deleting it will remove
                  this role from all assigned users.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={confirmDeleteRole}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Delete Role
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 bg-surface-secondary hover:bg-surface-secondary/80 text-heading px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleList;
