import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Search,
  Filter,
  X,
  Calendar,
  User,
  Tag,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react';
import { cn } from '../../../utils/cn';

/**
 * @component TaskFilters
 * @description Molecular component for comprehensive task filtering functionality.
 * Provides search, status, priority, assignee, and date filtering capabilities.
 * Uses Tailwind CSS and follows the project's design system.
 *
 * @param {Object} filters - Current filter values
 * @param {function} onFiltersChange - Callback when filters change
 * @param {Array} teamMembers - Available team members for assignee filter
 * @param {Array} availableStatuses - Available status options
 * @param {Array} availablePriorities - Available priority options
 * @param {Array} availableTags - Available tags for filtering
 * @param {boolean} showAdvanced - Whether to show advanced filters
 * @param {string} size - Size variant: 'sm', 'md', 'lg'
 * @param {string} className - Additional CSS classes
 */
const TaskFilters = ({
  filters = {},
  onFiltersChange,
  teamMembers = [],
  availableStatuses = [],
  availablePriorities = [],
  availableTags = [],
  showAdvanced = false,
  size = 'md',
  className = '',
  ...props
}) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(showAdvanced);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef(null);

  // Default filter structure
  const defaultFilters = {
    search: '',
    status: [],
    priority: [],
    assignee: [],
    tags: [],
    dueDate: {
      from: '',
      to: '',
      preset: '', // 'today', 'week', 'month', 'overdue'
    },
    createdDate: {
      from: '',
      to: '',
    },
    completed: null, // null, true, false
    ...filters,
  };

  // Size variants
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  // Default options if not provided
  const defaultStatuses = [
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
    {
      value: 'blocked',
      label: 'Blocked',
      color: 'text-red-600',
      bg: 'bg-red-100',
    },
  ];

  const defaultPriorities = [
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

  const statuses =
    availableStatuses.length > 0 ? availableStatuses : defaultStatuses;
  const priorities =
    availablePriorities.length > 0 ? availablePriorities : defaultPriorities;

  const dueDatePresets = [
    { value: '', label: 'All time' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'today', label: 'Due today' },
    { value: 'week', label: 'Due this week' },
    { value: 'month', label: 'Due this month' },
    { value: 'no-date', label: 'No due date' },
  ];

  /**
   * Handle filter change
   */
  const handleFilterChange = (key, value, isArray = false) => {
    const newFilters = { ...defaultFilters };

    if (isArray) {
      const currentArray = newFilters[key] || [];
      const newArray = currentArray.includes(value)
        ? currentArray.filter((item) => item !== value)
        : [...currentArray, value];
      newFilters[key] = newArray;
    } else if (key.includes('.')) {
      // Handle nested objects like dueDate.from
      const [parent, child] = key.split('.');
      newFilters[parent] = {
        ...newFilters[parent],
        [child]: value,
      };
    } else {
      newFilters[key] = value;
    }

    if (onFiltersChange) {
      onFiltersChange(newFilters);
    }
  };

  /**
   * Handle search input
   */
  const handleSearchChange = (e) => {
    handleFilterChange('search', e.target.value);
  };

  /**
   * Clear all filters
   */
  const clearAllFilters = () => {
    if (onFiltersChange) {
      onFiltersChange({
        search: '',
        status: [],
        priority: [],
        assignee: [],
        tags: [],
        dueDate: { from: '', to: '', preset: '' },
        createdDate: { from: '', to: '' },
        completed: null,
      });
    }
  };

  /**
   * Check if any filters are active
   */
  const hasActiveFilters = () => {
    return (
      defaultFilters.search ||
      defaultFilters.status?.length > 0 ||
      defaultFilters.priority?.length > 0 ||
      defaultFilters.assignee?.length > 0 ||
      defaultFilters.tags?.length > 0 ||
      defaultFilters.dueDate?.from ||
      defaultFilters.dueDate?.to ||
      defaultFilters.dueDate?.preset ||
      defaultFilters.createdDate?.from ||
      defaultFilters.createdDate?.to ||
      defaultFilters.completed !== null
    );
  };

  /**
   * Get count of active filters
   */
  const getActiveFilterCount = () => {
    let count = 0;
    if (defaultFilters.search) count++;
    if (defaultFilters.status?.length > 0) count++;
    if (defaultFilters.priority?.length > 0) count++;
    if (defaultFilters.assignee?.length > 0) count++;
    if (defaultFilters.tags?.length > 0) count++;
    if (
      defaultFilters.dueDate?.preset ||
      defaultFilters.dueDate?.from ||
      defaultFilters.dueDate?.to
    )
      count++;
    if (defaultFilters.createdDate?.from || defaultFilters.createdDate?.to)
      count++;
    if (defaultFilters.completed !== null) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <div
      className={cn(
        'bg-white border border-gray-200 rounded-lg p-4 space-y-4',
        className
      )}
      {...props}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <h3 className={cn('font-medium text-gray-900', sizeClasses[size])}>
            Filters
          </h3>
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              {activeFilterCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilters() && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
            >
              Clear all
            </button>
          )}
          <button
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded',
              isAdvancedOpen && 'text-blue-600 bg-blue-50'
            )}
          >
            <SlidersHorizontal className="h-3 w-3" />
            Advanced
            <ChevronDown
              className={cn(
                'h-3 w-3 transition-transform',
                isAdvancedOpen && 'rotate-180'
              )}
            />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          ref={searchRef}
          type="text"
          placeholder="Search tasks..."
          value={defaultFilters.search}
          onChange={handleSearchChange}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          className={cn(
            'w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            searchFocused && 'ring-2 ring-blue-500 border-blue-500'
          )}
        />
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {/* Status Filters */}
        <div className="flex flex-wrap gap-1">
          {statuses.map((status) => (
            <button
              key={status.value}
              onClick={() => handleFilterChange('status', status.value, true)}
              className={cn(
                'inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border transition-colors',
                defaultFilters.status?.includes(status.value)
                  ? `${status.bg} ${status.color} border-current`
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              )}
            >
              {status.label}
            </button>
          ))}
        </div>

        {/* Priority Filters */}
        <div className="flex flex-wrap gap-1">
          {priorities.map((priority) => (
            <button
              key={priority.value}
              onClick={() =>
                handleFilterChange('priority', priority.value, true)
              }
              className={cn(
                'inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border transition-colors',
                defaultFilters.priority?.includes(priority.value)
                  ? `${priority.bg} ${priority.color} border-current`
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              )}
            >
              {priority.label}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Filters */}
      {isAdvancedOpen && (
        <div className="pt-4 border-t border-gray-200 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Assignee Filter */}
            {teamMembers.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Assignee
                </label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {teamMembers.map((member) => (
                    <label
                      key={member.id || member._id}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="checkbox"
                        checked={
                          defaultFilters.assignee?.includes(
                            member.id || member._id
                          ) || false
                        }
                        onChange={() =>
                          handleFilterChange(
                            'assignee',
                            member.id || member._id,
                            true
                          )
                        }
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex items-center gap-2">
                        {member.avatar && (
                          <img
                            src={member.avatar}
                            alt={member.name}
                            className="h-4 w-4 rounded-full"
                          />
                        )}
                        <span className="text-xs text-gray-700">
                          {member.name}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Due Date Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Due Date
              </label>
              <select
                value={defaultFilters.dueDate?.preset || ''}
                onChange={(e) =>
                  handleFilterChange('dueDate.preset', e.target.value)
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {dueDatePresets.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>

              {/* Custom Date Range */}
              <div className="grid grid-cols-2 gap-2 mt-2">
                <input
                  type="date"
                  value={defaultFilters.dueDate?.from || ''}
                  onChange={(e) =>
                    handleFilterChange('dueDate.from', e.target.value)
                  }
                  className="border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="From"
                />
                <input
                  type="date"
                  value={defaultFilters.dueDate?.to || ''}
                  onChange={(e) =>
                    handleFilterChange('dueDate.to', e.target.value)
                  }
                  className="border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="To"
                />
              </div>
            </div>
          </div>

          {/* Tags Filter */}
          {availableTags.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-1">
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleFilterChange('tags', tag, true)}
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-colors',
                      defaultFilters.tags?.includes(tag)
                        ? 'bg-blue-100 text-blue-700 border-blue-200'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    )}
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Completion Status */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Completion
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => handleFilterChange('completed', null)}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-medium border transition-colors',
                  defaultFilters.completed === null
                    ? 'bg-blue-100 text-blue-700 border-blue-200'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                )}
              >
                All
              </button>
              <button
                onClick={() => handleFilterChange('completed', false)}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-medium border transition-colors',
                  defaultFilters.completed === false
                    ? 'bg-blue-100 text-blue-700 border-blue-200'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                )}
              >
                Incomplete
              </button>
              <button
                onClick={() => handleFilterChange('completed', true)}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-medium border transition-colors',
                  defaultFilters.completed === true
                    ? 'bg-blue-100 text-blue-700 border-blue-200'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                )}
              >
                Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

TaskFilters.propTypes = {
  filters: PropTypes.object,
  onFiltersChange: PropTypes.func.isRequired,
  teamMembers: PropTypes.array,
  availableStatuses: PropTypes.array,
  availablePriorities: PropTypes.array,
  availableTags: PropTypes.array,
  showAdvanced: PropTypes.bool,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string,
};

export default TaskFilters;
