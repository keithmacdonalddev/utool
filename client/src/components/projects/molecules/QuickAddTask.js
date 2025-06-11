import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Plus,
  X,
  Check,
  AlertCircle,
  Calendar,
  User,
  Flag,
  Zap,
} from 'lucide-react';
import { cn } from '../../../utils/cn';

/**
 * @component QuickAddTask
 * @description Molecular component for rapidly creating tasks with inline form.
 * Provides an intuitive interface for quick task creation with validation and keyboard shortcuts.
 * Uses Tailwind CSS classes and follows the project's design system.
 *
 * @param {function} onTaskCreate - Callback function when task is created
 * @param {string} projectId - Project ID for the new task
 * @param {string} defaultStatus - Default status for new tasks
 * @param {string} defaultPriority - Default priority for new tasks
 * @param {string} defaultAssignee - Default assignee for new tasks
 * @param {boolean} showAdvanced - Whether to show advanced fields by default
 * @param {string} placeholder - Placeholder text for task title
 * @param {string} size - Size variant: 'sm', 'md', 'lg'
 * @param {string} className - Additional CSS classes
 */
const QuickAddTask = ({
  onTaskCreate,
  projectId = null,
  defaultStatus = 'todo',
  defaultPriority = 'medium',
  defaultAssignee = null,
  showAdvanced = false,
  placeholder = 'What needs to be done?',
  size = 'md',
  className = '',
  ...props
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvancedFields, setShowAdvancedFields] = useState(showAdvanced);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: defaultStatus,
    priority: defaultPriority,
    assignee: defaultAssignee,
    dueDate: '',
    tags: [],
  });
  const [errors, setErrors] = useState({});
  const [tagInput, setTagInput] = useState('');

  const titleInputRef = useRef(null);
  const formRef = useRef(null);

  // Size variants
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-3',
  };

  // Focus title input when expanded
  useEffect(() => {
    if (isExpanded && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isExpanded]);

  // Close form when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (formRef.current && !formRef.current.contains(event.target)) {
        handleCancel();
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isExpanded]);

  /**
   * Handle form expansion
   */
  const handleExpand = () => {
    setIsExpanded(true);
    setErrors({});
  };

  /**
   * Handle form cancellation
   */
  const handleCancel = () => {
    if (isSubmitting) return;

    setIsExpanded(false);
    setShowAdvancedFields(showAdvanced);
    setFormData({
      title: '',
      description: '',
      status: defaultStatus,
      priority: defaultPriority,
      assignee: defaultAssignee,
      dueDate: '',
      tags: [],
    });
    setTagInput('');
    setErrors({});
  };

  /**
   * Validate form data
   */
  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Task title is required';
    } else if (formData.title.length > 200) {
      newErrors.title = 'Title must be less than 200 characters';
    }

    if (formData.description && formData.description.length > 1000) {
      newErrors.description = 'Description must be less than 1000 characters';
    }

    if (formData.dueDate) {
      const dueDate = new Date(formData.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dueDate < today) {
        newErrors.dueDate = 'Due date cannot be in the past';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const taskData = {
        ...formData,
        projectId,
        tags: formData.tags.filter((tag) => tag.trim()),
      };

      if (onTaskCreate) {
        await onTaskCreate(taskData);
      }

      // Reset form after successful creation
      handleCancel();
    } catch (error) {
      console.error('Failed to create task:', error);
      setErrors({ submit: error.message || 'Failed to create task' });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle input changes
   */
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  /**
   * Handle tag addition
   */
  const handleAddTag = (tag) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !formData.tags.includes(trimmedTag)) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, trimmedTag],
      }));
    }
    setTagInput('');
  };

  /**
   * Handle tag removal
   */
  const handleRemoveTag = (tagToRemove) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      handleCancel();
    } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      handleSubmit(event);
    }
  };

  /**
   * Handle tag input key events
   */
  const handleTagKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      handleAddTag(tagInput);
    } else if (
      event.key === 'Backspace' &&
      !tagInput &&
      formData.tags.length > 0
    ) {
      handleRemoveTag(formData.tags[formData.tags.length - 1]);
    }
  };

  // Priority options
  const priorityOptions = [
    { value: 'low', label: 'Low', color: 'text-green-600', bg: 'bg-green-100' },
    {
      value: 'medium',
      label: 'Medium',
      color: 'text-yellow-600',
      bg: 'bg-yellow-100',
    },
    {
      value: 'high',
      label: 'High',
      color: 'text-orange-600',
      bg: 'bg-orange-100',
    },
    {
      value: 'critical',
      label: 'Critical',
      color: 'text-red-600',
      bg: 'bg-red-100',
    },
  ];

  const statusOptions = [
    {
      value: 'todo',
      label: 'To Do',
      color: 'text-gray-600',
      bg: 'bg-gray-100',
    },
    {
      value: 'in-progress',
      label: 'In Progress',
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      value: 'review',
      label: 'Review',
      color: 'text-purple-600',
      bg: 'bg-purple-100',
    },
    {
      value: 'done',
      label: 'Done',
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
  ];

  const currentPriority = priorityOptions.find(
    (p) => p.value === formData.priority
  );
  const currentStatus = statusOptions.find((s) => s.value === formData.status);

  if (!isExpanded) {
    return (
      <div className={cn('w-full', className)}>
        <button
          onClick={handleExpand}
          className={cn(
            'w-full flex items-center gap-3 border-2 border-dashed border-gray-300 rounded-lg transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400',
            sizeClasses[size],
            'text-gray-600 hover:text-gray-700'
          )}
          {...props}
        >
          <Plus className="h-4 w-4 flex-shrink-0" />
          <span className="text-left">{placeholder}</span>
        </button>
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)} ref={formRef}>
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-gray-300 rounded-lg shadow-sm p-4 space-y-4"
      >
        {/* Task Title */}
        <div>
          <input
            ref={titleInputRef}
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn(
              'w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
              errors.title &&
                'border-red-300 focus:ring-red-500 focus:border-red-500'
            )}
            maxLength={200}
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.title}
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a description (optional)..."
            rows={2}
            className={cn(
              'w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none',
              errors.description &&
                'border-red-300 focus:ring-red-500 focus:border-red-500'
            )}
            maxLength={1000}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.description}
            </p>
          )}
        </div>

        {/* Advanced Fields Toggle */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowAdvancedFields(!showAdvancedFields)}
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          >
            <Flag className="h-3 w-3" />
            {showAdvancedFields ? 'Hide details' : 'Add details'}
          </button>

          <div className="text-xs text-gray-500">Press Ctrl+Enter to save</div>
        </div>

        {/* Advanced Fields */}
        {showAdvancedFields && (
          <div className="grid grid-cols-1 gap-4 pt-2 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4">
              {/* Priority */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) =>
                    handleInputChange('priority', e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {priorityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => handleInputChange('dueDate', e.target.value)}
                  className={cn(
                    'w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                    errors.dueDate &&
                      'border-red-300 focus:ring-red-500 focus:border-red-500'
                  )}
                />
                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
              {errors.dueDate && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.dueDate}
                </p>
              )}
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Tags
              </label>
              <div className="border border-gray-300 rounded-md p-2 min-h-[38px] flex flex-wrap gap-1 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-blue-500 hover:text-blue-700 focus:outline-none"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder={formData.tags.length === 0 ? 'Add tags...' : ''}
                  className="flex-1 min-w-[100px] bg-transparent border-0 p-0 text-sm placeholder-gray-500 focus:outline-none"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Press Enter or comma to add tags
              </p>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            {currentPriority && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                  currentPriority.bg,
                  currentPriority.color
                )}
              >
                <Zap className="h-3 w-3" />
                {currentPriority.label}
              </span>
            )}
            {currentStatus && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                  currentStatus.bg,
                  currentStatus.color
                )}
              >
                {currentStatus.label}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.title.trim()}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed',
                isSubmitting && 'cursor-wait'
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Create Task
                </>
              )}
            </button>
          </div>
        </div>

        {/* Submit Error */}
        {errors.submit && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {errors.submit}
            </p>
          </div>
        )}
      </form>
    </div>
  );
};

QuickAddTask.propTypes = {
  onTaskCreate: PropTypes.func.isRequired,
  projectId: PropTypes.string,
  defaultStatus: PropTypes.string,
  defaultPriority: PropTypes.string,
  defaultAssignee: PropTypes.string,
  showAdvanced: PropTypes.bool,
  placeholder: PropTypes.string,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string,
};

export default QuickAddTask;
