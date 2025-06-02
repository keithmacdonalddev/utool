import React, { useState, useEffect, useMemo } from 'react';
import {
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  Info,
  Shield,
  Users2,
  Settings,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Plus,
  Minus,
  Lock,
  Unlock,
  Database,
  FileText,
  BarChart3,
  UserCog,
  Globe,
  Zap,
} from 'lucide-react';

/**
 * RoleForm Component
 *
 * Comprehensive form for creating and editing roles with advanced permission
 * management interface. Supports hierarchical permission structures,
 * validation, and conflict detection.
 *
 * Part of Milestone 5: Role Management & Permissions
 *
 * Features:
 * - Role creation and editing
 * - Hierarchical permission management
 * - Permission conflict detection
 * - Validation with real-time feedback
 * - Permission inheritance visualization
 * - Collapsible permission categories
 * - Form state management with auto-save
 * - Accessibility support
 *
 * @param {Object} props - Component props
 * @param {Object} props.role - Role data for editing (null for creation)
 * @param {Object} props.systemPermissions - Available system permissions
 * @param {Object} props.permissionValidation - Permission validation results
 * @param {boolean} props.isLoading - Loading state
 * @param {string} props.error - Error message
 * @param {Function} props.onSave - Save role handler
 * @param {Function} props.onCancel - Cancel handler
 * @param {Function} props.onValidatePermissions - Permission validation handler
 * @param {Function} props.isSystemRole - Check if role is system role
 * @returns {React.ReactElement} The RoleForm component
 */
const RoleForm = ({
  role = null,
  systemPermissions = {},
  permissionValidation = null,
  isLoading = false,
  error = null,
  onSave,
  onCancel,
  onValidatePermissions,
  isSystemRole,
}) => {
  // ===============================================
  // STATE MANAGEMENT
  // ===============================================

  const isEditMode = Boolean(role);
  const isSystemRoleEdit = isEditMode && isSystemRole(role);

  // Form data state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: {},
    isDefault: false,
  });

  // UI state
  const [expandedCategories, setExpandedCategories] = useState({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showPermissionDetails, setShowPermissionDetails] = useState({});

  // ===============================================
  // EFFECTS
  // ===============================================

  /**
   * Initialize form with role data or defaults
   */
  useEffect(() => {
    if (isEditMode && role) {
      setFormData({
        name: role.name || '',
        description: role.description || '',
        permissions: role.permissions || {},
        isDefault: role.isDefault || false,
      });

      // Expand all categories for editing
      const categories = Object.keys(systemPermissions);
      const expanded = {};
      categories.forEach((cat) => {
        expanded[cat] = true;
      });
      setExpandedCategories(expanded);
    } else {
      // Initialize empty form for creation
      setFormData({
        name: '',
        description: '',
        permissions: {},
        isDefault: false,
      });
    }
  }, [role, isEditMode, systemPermissions]);

  /**
   * Validate permissions when they change
   */
  useEffect(() => {
    if (Object.keys(formData.permissions).length > 0 && onValidatePermissions) {
      const timer = setTimeout(() => {
        onValidatePermissions(formData.permissions);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [formData.permissions, onValidatePermissions]);

  // ===============================================
  // FORM HANDLERS
  // ===============================================

  /**
   * Handle form field changes
   */
  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setHasUnsavedChanges(true);

    // Clear field-specific validation error
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({
        ...prev,
        [field]: null,
      }));
    }
  };

  /**
   * Handle permission toggle
   */
  const handlePermissionToggle = (category, permission) => {
    if (isSystemRoleEdit) return; // Prevent editing system roles

    setFormData((prev) => {
      const newPermissions = { ...prev.permissions };

      if (!newPermissions[category]) {
        newPermissions[category] = [];
      }

      const permissions = [...newPermissions[category]];
      const index = permissions.indexOf(permission);

      if (index > -1) {
        permissions.splice(index, 1);
      } else {
        permissions.push(permission);
      }

      newPermissions[category] = permissions;

      return {
        ...prev,
        permissions: newPermissions,
      };
    });

    setHasUnsavedChanges(true);
  };

  /**
   * Handle category permission toggle (select/deselect all)
   */
  const handleCategoryToggle = (category) => {
    if (isSystemRoleEdit) return;

    const categoryData = systemPermissions[category];
    const categoryPermissions = categoryData?.permissions || [];
    const currentPermissions = formData.permissions[category] || [];
    const allSelected = categoryPermissions.every((permKey) =>
      currentPermissions.includes(permKey)
    );

    setFormData((prev) => {
      const newPermissions = { ...prev.permissions };

      if (allSelected) {
        // Deselect all
        newPermissions[category] = [];
      } else {
        // Select all
        newPermissions[category] = [...categoryPermissions];
      }

      return {
        ...prev,
        permissions: newPermissions,
      };
    });

    setHasUnsavedChanges(true);
  };

  /**
   * Toggle category expansion
   */
  const toggleCategory = (category) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // ===============================================
  // VALIDATION
  // ===============================================

  /**
   * Validate form data
   */
  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Role name is required';
    } else if (formData.name.length < 3) {
      errors.name = 'Role name must be at least 3 characters';
    } else if (formData.name.length > 50) {
      errors.name = 'Role name must be less than 50 characters';
    }

    if (!formData.description.trim()) {
      errors.description = 'Role description is required';
    } else if (formData.description.length < 10) {
      errors.description = 'Description must be at least 10 characters';
    } else if (formData.description.length > 200) {
      errors.description = 'Description must be less than 200 characters';
    }

    const totalPermissions = Object.values(formData.permissions).reduce(
      (total, perms) => total + (perms?.length || 0),
      0
    );

    if (totalPermissions === 0) {
      errors.permissions = 'At least one permission must be selected';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSave(formData);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  // ===============================================
  // COMPUTED VALUES
  // ===============================================

  /**
   * Get permission category icons
   */
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

  /**
   * Get total selected permissions count
   */
  const totalSelectedPermissions = useMemo(() => {
    return Object.values(formData.permissions).reduce(
      (total, perms) => total + (perms?.length || 0),
      0
    );
  }, [formData.permissions]);

  /**
   * Get permission validation status
   */
  const getPermissionValidationStatus = () => {
    if (!permissionValidation) return null;

    const { conflicts, warnings, recommendations } = permissionValidation;

    return {
      hasConflicts: conflicts?.length > 0,
      hasWarnings: warnings?.length > 0,
      hasRecommendations: recommendations?.length > 0,
      conflicts: conflicts || [],
      warnings: warnings || [],
      recommendations: recommendations || [],
    };
  };

  const validationStatus = getPermissionValidationStatus();

  // ===============================================
  // RENDER METHODS
  // ===============================================

  /**
   * Render form header
   */
  const renderHeader = () => (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="text-heading text-xl font-semibold">
          {isEditMode ? `Edit Role: ${role?.name}` : 'Create New Role'}
        </h2>
        <p className="text-caption text-sm mt-1">
          {isEditMode
            ? 'Modify role permissions and settings'
            : 'Define a new role with specific permissions and access levels'}
        </p>
      </div>

      {isSystemRoleEdit && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <Lock className="h-4 w-4 text-blue-400" />
          <span className="text-blue-400 text-sm font-medium">System Role</span>
        </div>
      )}
    </div>
  );

  /**
   * Render basic information form
   */
  const renderBasicInfo = () => (
    <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6 mb-6">
      <h3 className="text-heading font-medium mb-4">Basic Information</h3>

      <div className="grid grid-cols-1 gap-4">
        {/* Role Name */}
        <div>
          <label className="block text-heading text-sm font-medium mb-2">
            Role Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            disabled={isSystemRoleEdit}
            placeholder="Enter role name (e.g., Content Manager)"
            className={`w-full px-3 py-2 bg-surface-secondary border rounded-lg text-heading placeholder-muted focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${
              validationErrors.name
                ? 'border-red-500'
                : 'border-border-secondary'
            }`}
          />
          {validationErrors.name && (
            <p className="text-red-400 text-sm mt-1">{validationErrors.name}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-heading text-sm font-medium mb-2">
            Description <span className="text-red-400">*</span>
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            disabled={isSystemRoleEdit}
            placeholder="Describe the role's purpose and responsibilities..."
            rows={3}
            className={`w-full px-3 py-2 bg-surface-secondary border rounded-lg text-heading placeholder-muted focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none ${
              validationErrors.description
                ? 'border-red-500'
                : 'border-border-secondary'
            }`}
          />
          {validationErrors.description && (
            <p className="text-red-400 text-sm mt-1">
              {validationErrors.description}
            </p>
          )}
        </div>

        {/* Default Role Checkbox */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isDefault"
            checked={formData.isDefault}
            onChange={(e) => handleFieldChange('isDefault', e.target.checked)}
            disabled={isSystemRoleEdit}
            className="rounded border-border-secondary text-brand-primary focus:ring-brand-primary disabled:opacity-50"
          />
          <label
            htmlFor="isDefault"
            className="text-heading text-sm cursor-pointer"
          >
            Set as default role for new users
          </label>
        </div>
      </div>
    </div>
  );

  /**
   * Render permission validation alerts
   */
  const renderValidationAlerts = () => {
    if (!validationStatus) return null;

    const { hasConflicts, hasWarnings, conflicts, warnings } = validationStatus;

    return (
      <div className="space-y-3 mb-6">
        {hasConflicts && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <h4 className="text-red-400 font-medium">Permission Conflicts</h4>
            </div>
            <ul className="space-y-1">
              {conflicts.map((conflict, index) => (
                <li key={index} className="text-red-400 text-sm">
                  • {conflict.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {hasWarnings && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-amber-400" />
              <h4 className="text-amber-400 font-medium">Warnings</h4>
            </div>
            <ul className="space-y-1">
              {warnings.map((warning, index) => (
                <li key={index} className="text-amber-400 text-sm">
                  • {warning.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  /**
   * Render permissions section
   */
  const renderPermissions = () => (
    <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-heading font-medium">Permissions</h3>
          <p className="text-caption text-sm mt-1">
            Select permissions for this role ({totalSelectedPermissions}{' '}
            selected)
          </p>
        </div>

        {!isSystemRoleEdit && (
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 px-3 py-2 text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-colors duration-200"
          >
            <Settings className="h-4 w-4" />
            {showAdvanced ? 'Hide' : 'Show'} Advanced
          </button>
        )}
      </div>

      {validationErrors.permissions && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
          <p className="text-red-400 text-sm">{validationErrors.permissions}</p>
        </div>
      )}

      <div className="space-y-4">
        {Object.entries(systemPermissions).map(([category, categoryData]) => {
          const CategoryIcon = getCategoryIcon(category);
          const isExpanded = expandedCategories[category];
          const categoryPermissions = formData.permissions[category] || [];
          const availablePermissions = categoryData?.permissions || [];
          const allSelected = availablePermissions.every((permKey) =>
            categoryPermissions.includes(permKey)
          );
          const someSelected = availablePermissions.some((permKey) =>
            categoryPermissions.includes(permKey)
          );

          return (
            <div
              key={category}
              className="border border-border-secondary rounded-lg"
            >
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-secondary/50 transition-colors duration-150"
                onClick={() => toggleCategory(category)}
              >
                <div className="flex items-center gap-3">
                  <CategoryIcon className="h-5 w-5 text-brand-primary" />
                  <div>
                    <h4 className="text-heading font-medium capitalize">
                      {categoryData?.name || category} Permissions
                    </h4>
                    <p className="text-caption text-sm">
                      {categoryPermissions.length} of{' '}
                      {availablePermissions.length} selected
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isSystemRoleEdit && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCategoryToggle(category);
                      }}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors duration-200 ${
                        allSelected
                          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                          : 'bg-brand-primary/20 text-brand-primary hover:bg-brand-primary/30'
                      }`}
                    >
                      {allSelected ? 'Deselect All' : 'Select All'}
                    </button>
                  )}

                  <div
                    className={`p-1 rounded transition-transform duration-200 ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  >
                    <ChevronRight className="h-4 w-4 text-muted" />
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-border-secondary p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {availablePermissions.map((permissionKey) => {
                      const isSelected =
                        categoryPermissions.includes(permissionKey);

                      return (
                        <div
                          key={permissionKey}
                          className={`flex items-start gap-3 p-3 rounded-lg border transition-colors duration-150 ${
                            isSelected
                              ? 'bg-brand-primary/5 border-brand-primary/20'
                              : 'bg-surface-secondary border-border-secondary hover:border-border-primary'
                          } ${isSystemRoleEdit ? 'opacity-60' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() =>
                              handlePermissionToggle(category, permissionKey)
                            }
                            disabled={isSystemRoleEdit}
                            className="mt-1 rounded border-border-secondary text-brand-primary focus:ring-brand-primary disabled:opacity-50"
                          />

                          <div className="flex-1">
                            <h5 className="text-heading font-medium text-sm">
                              {permissionKey}
                            </h5>
                            <p className="text-caption text-xs mt-1">
                              {categoryData?.description ||
                                `${permissionKey} access for ${category}`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  /**
   * Render form actions
   */
  const renderActions = () => (
    <div className="flex items-center justify-between pt-6 border-t border-border-secondary">
      <div className="flex items-center gap-2 text-caption text-sm">
        {hasUnsavedChanges && (
          <>
            <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
            Unsaved changes
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-surface-secondary hover:bg-surface-secondary/80 text-heading rounded-lg transition-colors duration-200"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={isLoading || Object.keys(validationErrors).length > 0}
          className="flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-brand-primary-dark text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {isEditMode ? 'Update Role' : 'Create Role'}
            </>
          )}
        </button>
      </div>
    </div>
  );

  // ===============================================
  // MAIN RENDER
  // ===============================================

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        {renderHeader()}

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <p className="text-red-400 font-medium">Error</p>
            </div>
            <p className="text-red-400 text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Basic Information */}
        {renderBasicInfo()}

        {/* Validation Alerts */}
        {renderValidationAlerts()}

        {/* Permissions */}
        {renderPermissions()}

        {/* Actions */}
        {renderActions()}
      </form>
    </div>
  );
};

export default RoleForm;
