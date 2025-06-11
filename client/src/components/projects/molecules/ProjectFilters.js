import React from 'react';
import PropTypes from 'prop-types';
import { Search, Filter, X } from 'lucide-react';

/**
 * ProjectFilters - Search and filter controls for project dashboard
 *
 * This component provides comprehensive filtering capabilities including
 * search, category, status, and priority filters with clear functionality.
 *
 * @param {Object} props - Component props
 * @param {Object} props.filters - Current filter values
 * @param {string} props.filters.search - Search query string
 * @param {string} props.filters.category - Selected category filter
 * @param {string} props.filters.status - Selected status filter
 * @param {string} props.filters.priority - Selected priority filter
 * @param {Function} props.onFiltersChange - Callback when filters change
 * @param {string} props.className - Additional CSS classes
 */
const ProjectFilters = ({ filters, onFiltersChange, className = '' }) => {
  // Define available filter options following the project model structure
  const categories = [
    { value: null, label: 'All Categories' },
    { value: 'development', label: 'Development' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'design', label: 'Design' },
    { value: 'research', label: 'Research' },
    { value: 'operations', label: 'Operations' },
    { value: 'other', label: 'Other' },
  ];

  const statuses = [
    { value: null, label: 'All Status' },
    { value: 'planning', label: 'Planning' },
    { value: 'active', label: 'Active' },
    { value: 'on-hold', label: 'On Hold' },
    { value: 'completed', label: 'Completed' },
    { value: 'archived', label: 'Archived' },
  ];

  const priorities = [
    { value: null, label: 'All Priorities' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' },
  ];

  /**
   * Handle individual filter changes
   * Updates the filters object and calls the parent callback
   */
  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value === '' ? null : value };
    onFiltersChange(newFilters);
  };

  /**
   * Clear all active filters
   * Resets filters to their default empty state
   */
  const clearFilters = () => {
    onFiltersChange({
      search: '',
      category: null,
      status: null,
      priority: null,
    });
  };

  // Check if any filters are currently active (for showing clear button)
  const hasActiveFilters =
    filters.search || filters.category || filters.status || filters.priority;

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {/* Search Input */}
      <div className="relative flex-1 min-w-[200px]">
        <Search
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          size={18}
        />
        <input
          type="text"
          placeholder="Search projects..."
          value={filters.search || ''}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
        />
      </div>

      {/* Category Filter */}
      <select
        value={filters.category || ''}
        onChange={(e) => handleFilterChange('category', e.target.value)}
        className="px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors min-w-[140px]"
      >
        {categories.map((cat) => (
          <option
            key={cat.value || 'all-categories'}
            value={cat.value || ''}
            className="bg-dark-700 text-white"
          >
            {cat.label}
          </option>
        ))}
      </select>

      {/* Status Filter */}
      <select
        value={filters.status || ''}
        onChange={(e) => handleFilterChange('status', e.target.value)}
        className="px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors min-w-[120px]"
      >
        {statuses.map((status) => (
          <option
            key={status.value || 'all-status'}
            value={status.value || ''}
            className="bg-dark-700 text-white"
          >
            {status.label}
          </option>
        ))}
      </select>

      {/* Priority Filter */}
      <select
        value={filters.priority || ''}
        onChange={(e) => handleFilterChange('priority', e.target.value)}
        className="px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors min-w-[130px]"
      >
        {priorities.map((priority) => (
          <option
            key={priority.value || 'all-priorities'}
            value={priority.value || ''}
            className="bg-dark-700 text-white"
          >
            {priority.label}
          </option>
        ))}
      </select>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="flex items-center gap-1 px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-dark-700"
          aria-label="Clear all filters"
        >
          <X size={16} />
          Clear
        </button>
      )}
    </div>
  );
};

// PropTypes for development-time validation
ProjectFilters.propTypes = {
  filters: PropTypes.shape({
    search: PropTypes.string,
    category: PropTypes.string,
    status: PropTypes.string,
    priority: PropTypes.string,
  }).isRequired,
  onFiltersChange: PropTypes.func.isRequired,
  className: PropTypes.string,
};

// Default props for graceful fallbacks
ProjectFilters.defaultProps = {
  className: '',
};

export default ProjectFilters;
