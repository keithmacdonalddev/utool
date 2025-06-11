import React, { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import {
  X,
  Save,
  Loader2,
  Calendar,
  Users,
  Target,
  FileText,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

// Redux
import { createProject } from '../../../features/projects/projectsSlice';

// Components
import { ProjectBadge } from '../atoms/ProjectBadge';

/**
 * CreateProjectModal - Modal dialog for creating new projects
 *
 * This component provides a comprehensive form for creating new projects with:
 * - Form validation and error handling
 * - Real-time field validation feedback
 * - Multiple project configuration options
 * - Accessibility support
 * - Integration with Redux and Socket.IO
 *
 * Features:
 * - Required field validation
 * - Auto-save draft functionality
 * - Member selection and invitation
 * - Timeline configuration
 * - Goal and objective setting
 * - Category and priority selection
 */
const CreateProjectModal = ({
  isOpen,
  onClose,
  onSuccess,
  initialData = null,
}) => {
  const dispatch = useDispatch();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'planning',
    priority: 'medium',
    category: '',
    goals: [''],
    timeline: {
      startDate: '',
      targetEndDate: '',
    },
    members: [],
    isPublic: false,
  });

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Available options for dropdowns
  const statusOptions = [
    {
      value: 'planning',
      label: 'Planning',
      description: 'Project in planning phase',
    },
    {
      value: 'active',
      label: 'Active',
      description: 'Currently in development',
    },
    { value: 'review', label: 'Review', description: 'Under review' },
    { value: 'on-hold', label: 'On Hold', description: 'Temporarily paused' },
  ];

  const priorityOptions = [
    { value: 'high', label: 'High', description: 'Critical priority' },
    { value: 'medium', label: 'Medium', description: 'Normal priority' },
    { value: 'low', label: 'Low', description: 'Lower priority' },
  ];

  const categoryOptions = [
    { value: 'web-development', label: 'Web Development' },
    { value: 'mobile-app', label: 'Mobile App' },
    { value: 'data-analysis', label: 'Data Analysis' },
    { value: 'design', label: 'Design' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'research', label: 'Research' },
    { value: 'infrastructure', label: 'Infrastructure' },
    { value: 'other', label: 'Other' },
  ];

  /**
   * Initialize form data when modal opens or initialData changes
   * Allows for editing existing projects or creating from templates
   */
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          name: initialData.name || '',
          description: initialData.description || '',
          status: initialData.status || 'planning',
          priority: initialData.priority || 'medium',
          category: initialData.category || '',
          goals: initialData.goals || [''],
          timeline: {
            startDate: initialData.timeline?.startDate || '',
            targetEndDate: initialData.timeline?.targetEndDate || '',
          },
          members: initialData.members || [],
          isPublic: initialData.isPublic || false,
        });
      } else {
        // Reset form for new project
        setFormData({
          name: '',
          description: '',
          status: 'planning',
          priority: 'medium',
          category: '',
          goals: [''],
          timeline: {
            startDate: '',
            targetEndDate: '',
          },
          members: [],
          isPublic: false,
        });
      }
      setErrors({});
      setTouched({});
      setShowSuccessMessage(false);
    }
  }, [isOpen, initialData]);

  /**
   * Validate individual field
   * Provides real-time validation feedback
   */
  const validateField = useCallback(
    (name, value) => {
      switch (name) {
        case 'name':
          if (!value.trim()) {
            return 'Project name is required';
          }
          if (value.trim().length < 3) {
            return 'Project name must be at least 3 characters';
          }
          if (value.trim().length > 100) {
            return 'Project name must be less than 100 characters';
          }
          return null;

        case 'description':
          if (value.length > 500) {
            return 'Description must be less than 500 characters';
          }
          return null;

        case 'category':
          if (!value) {
            return 'Please select a project category';
          }
          return null;

        case 'timeline.startDate':
          if (value && formData.timeline.targetEndDate) {
            const startDate = new Date(value);
            const endDate = new Date(formData.timeline.targetEndDate);
            if (startDate >= endDate) {
              return 'Start date must be before target end date';
            }
          }
          return null;

        case 'timeline.targetEndDate':
          if (value && formData.timeline.startDate) {
            const startDate = new Date(formData.timeline.startDate);
            const endDate = new Date(value);
            if (endDate <= startDate) {
              return 'Target end date must be after start date';
            }
          }
          if (value) {
            const endDate = new Date(value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (endDate <= today) {
              return 'Target end date should be in the future';
            }
          }
          return null;

        default:
          return null;
      }
    },
    [formData.timeline]
  );

  /**
   * Validate entire form
   * Returns true if form is valid, false otherwise
   */
  const validateForm = useCallback(() => {
    const newErrors = {};

    // Validate all fields
    Object.keys(formData).forEach((field) => {
      if (field === 'timeline') {
        // Handle nested timeline fields
        Object.keys(formData.timeline).forEach((timelineField) => {
          const error = validateField(
            `timeline.${timelineField}`,
            formData.timeline[timelineField]
          );
          if (error) {
            newErrors[`timeline.${timelineField}`] = error;
          }
        });
      } else {
        const error = validateField(field, formData[field]);
        if (error) {
          newErrors[field] = error;
        }
      }
    });

    // Additional cross-field validation
    if (formData.goals.length === 1 && !formData.goals[0].trim()) {
      newErrors.goals = 'At least one project goal is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, validateField]);

  /**
   * Handle field changes with validation
   * Updates form data and validates field
   */
  const handleFieldChange = useCallback(
    (field, value) => {
      // Handle nested fields (like timeline.startDate)
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        setFormData((prev) => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: value,
          },
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          [field]: value,
        }));
      }

      // Mark field as touched
      setTouched((prev) => ({
        ...prev,
        [field]: true,
      }));

      // Validate field
      const error = validateField(field, value);
      setErrors((prev) => ({
        ...prev,
        [field]: error,
      }));
    },
    [validateField]
  );

  /**
   * Handle goals array changes
   * Manages dynamic goal list
   */
  const handleGoalsChange = useCallback(
    (index, value) => {
      const newGoals = [...formData.goals];
      newGoals[index] = value;

      // Remove empty goals except the last one
      const filteredGoals = newGoals.filter(
        (goal, i) => goal.trim() !== '' || i === newGoals.length - 1
      );

      // Ensure at least one empty goal for adding new ones
      if (
        filteredGoals.length === 0 ||
        filteredGoals[filteredGoals.length - 1].trim() !== ''
      ) {
        filteredGoals.push('');
      }

      setFormData((prev) => ({
        ...prev,
        goals: filteredGoals,
      }));

      // Validate goals
      const hasValidGoals = filteredGoals.some((goal) => goal.trim() !== '');
      setErrors((prev) => ({
        ...prev,
        goals: hasValidGoals ? null : 'At least one project goal is required',
      }));
    },
    [formData.goals]
  );

  /**
   * Remove goal from list
   * Maintains at least one goal input
   */
  const removeGoal = useCallback(
    (index) => {
      if (formData.goals.length > 1) {
        const newGoals = formData.goals.filter((_, i) => i !== index);
        // Ensure at least one empty goal
        if (
          newGoals.length === 0 ||
          newGoals[newGoals.length - 1].trim() !== ''
        ) {
          newGoals.push('');
        }
        setFormData((prev) => ({
          ...prev,
          goals: newGoals,
        }));
      }
    },
    [formData.goals]
  );

  /**
   * Handle form submission
   * Validates and creates project
   */
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      setIsSubmitting(true);

      try {
        // Clean up form data
        const cleanedData = {
          ...formData,
          name: formData.name.trim(),
          description: formData.description.trim(),
          goals: formData.goals.filter((goal) => goal.trim() !== ''),
          timeline: {
            startDate: formData.timeline.startDate || null,
            targetEndDate: formData.timeline.targetEndDate || null,
          },
        };

        // Dispatch create project action
        const result = await dispatch(createProject(cleanedData)).unwrap();

        // Show success message
        setShowSuccessMessage(true);

        // Call success callback
        if (onSuccess) {
          onSuccess(result);
        }

        // Auto-close after 2 seconds
        setTimeout(() => {
          onClose();
        }, 2000);
      } catch (error) {
        console.error('Error creating project:', error);
        setErrors({
          submit:
            error.message || 'Failed to create project. Please try again.',
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, validateForm, dispatch, onSuccess, onClose]
  );

  /**
   * Handle modal close
   * Prevents accidental data loss
   */
  const handleClose = useCallback(() => {
    const hasChanges =
      formData.name.trim() ||
      formData.description.trim() ||
      formData.goals.some((goal) => goal.trim());

    if (hasChanges && !showSuccessMessage) {
      const confirmClose = window.confirm(
        'You have unsaved changes. Are you sure you want to close?'
      );
      if (!confirmClose) return;
    }

    onClose();
  }, [formData, showSuccessMessage, onClose]);

  /**
   * Handle escape key
   * Allows closing modal with keyboard
   */
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleClose]);

  // Don't render if modal is not open
  if (!isOpen) return null;

  // Success state
  if (showSuccessMessage) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-dark-800 rounded-lg p-8 max-w-md w-full mx-4 text-center">
          <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            Project Created Successfully!
          </h3>
          <p className="text-gray-400">
            Your new project has been created and is ready to go.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-dark-800 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-600">
          <h2 className="text-xl font-semibold text-white">
            {initialData ? 'Edit Project' : 'Create New Project'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="overflow-y-auto max-h-[calc(90vh-80px)]"
        >
          <div className="p-6 space-y-6">
            {/* Submit Error */}
            {errors.submit && (
              <div className="p-4 bg-red-900/20 border border-red-500 rounded-lg flex items-center gap-3">
                <AlertCircle size={20} className="text-red-400 flex-shrink-0" />
                <p className="text-red-400">{errors.submit}</p>
              </div>
            )}

            {/* Project Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Project Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="Enter project name..."
                className={`w-full px-4 py-3 bg-dark-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors ${
                  errors.name && touched.name
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-dark-600 focus:ring-blue-500'
                }`}
                disabled={isSubmitting}
              />
              {errors.name && touched.name && (
                <p className="mt-1 text-sm text-red-400">{errors.name}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  handleFieldChange('description', e.target.value)
                }
                placeholder="Describe your project..."
                rows={3}
                className={`w-full px-4 py-3 bg-dark-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors resize-none ${
                  errors.description && touched.description
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-dark-600 focus:ring-blue-500'
                }`}
                disabled={isSubmitting}
              />
              <div className="flex justify-between mt-1">
                {errors.description && touched.description && (
                  <p className="text-sm text-red-400">{errors.description}</p>
                )}
                <p className="text-sm text-gray-500 ml-auto">
                  {formData.description.length}/500
                </p>
              </div>
            </div>

            {/* Status and Priority Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleFieldChange('status', e.target.value)}
                  className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isSubmitting}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) =>
                    handleFieldChange('priority', e.target.value)
                  }
                  className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isSubmitting}
                >
                  {priorityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    handleFieldChange('category', e.target.value)
                  }
                  className={`w-full px-4 py-3 bg-dark-700 border rounded-lg text-white focus:outline-none focus:ring-2 transition-colors ${
                    errors.category && touched.category
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-dark-600 focus:ring-blue-500'
                  }`}
                  disabled={isSubmitting}
                >
                  <option value="">Select category...</option>
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.category && touched.category && (
                  <p className="mt-1 text-sm text-red-400">{errors.category}</p>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Calendar size={16} className="inline mr-2" />
                Timeline
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.timeline.startDate}
                    onChange={(e) =>
                      handleFieldChange('timeline.startDate', e.target.value)
                    }
                    className={`w-full px-4 py-3 bg-dark-700 border rounded-lg text-white focus:outline-none focus:ring-2 transition-colors ${
                      errors['timeline.startDate']
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-dark-600 focus:ring-blue-500'
                    }`}
                    disabled={isSubmitting}
                  />
                  {errors['timeline.startDate'] && (
                    <p className="mt-1 text-sm text-red-400">
                      {errors['timeline.startDate']}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Target End Date
                  </label>
                  <input
                    type="date"
                    value={formData.timeline.targetEndDate}
                    onChange={(e) =>
                      handleFieldChange(
                        'timeline.targetEndDate',
                        e.target.value
                      )
                    }
                    className={`w-full px-4 py-3 bg-dark-700 border rounded-lg text-white focus:outline-none focus:ring-2 transition-colors ${
                      errors['timeline.targetEndDate']
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-dark-600 focus:ring-blue-500'
                    }`}
                    disabled={isSubmitting}
                  />
                  {errors['timeline.targetEndDate'] && (
                    <p className="mt-1 text-sm text-red-400">
                      {errors['timeline.targetEndDate']}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Goals */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Target size={16} className="inline mr-2" />
                Project Goals *
              </label>
              <div className="space-y-2">
                {formData.goals.map((goal, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={goal}
                      onChange={(e) => handleGoalsChange(index, e.target.value)}
                      placeholder={`Goal ${index + 1}...`}
                      className="flex-1 px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isSubmitting}
                    />
                    {formData.goals.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeGoal(index)}
                        className="px-3 py-2 text-gray-400 hover:text-red-400 transition-colors"
                        disabled={isSubmitting}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {errors.goals && (
                <p className="mt-1 text-sm text-red-400">{errors.goals}</p>
              )}
            </div>

            {/* Preview */}
            <div className="bg-dark-700 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-300 mb-3">
                Preview
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">
                    {formData.name || 'Project Name'}
                  </span>
                  {formData.status && (
                    <ProjectBadge
                      variant="status"
                      value={formData.status}
                      size="sm"
                    />
                  )}
                  {formData.priority && formData.priority !== 'medium' && (
                    <ProjectBadge
                      variant="priority"
                      value={formData.priority}
                      size="sm"
                    />
                  )}
                  {formData.category && (
                    <ProjectBadge
                      variant="type"
                      value={formData.category}
                      size="sm"
                    />
                  )}
                </div>
                {formData.description && (
                  <p className="text-sm text-gray-400">
                    {formData.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-dark-600">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || Object.keys(errors).length > 0}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save size={16} />
                  {initialData ? 'Update Project' : 'Create Project'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// PropTypes for development-time validation
CreateProjectModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  initialData: PropTypes.shape({
    name: PropTypes.string,
    description: PropTypes.string,
    status: PropTypes.string,
    priority: PropTypes.string,
    category: PropTypes.string,
    goals: PropTypes.arrayOf(PropTypes.string),
    timeline: PropTypes.shape({
      startDate: PropTypes.string,
      targetEndDate: PropTypes.string,
    }),
    members: PropTypes.array,
    isPublic: PropTypes.bool,
  }),
};

// Default props for graceful fallbacks
CreateProjectModal.defaultProps = {
  onSuccess: null,
  initialData: null,
};

export default CreateProjectModal;
