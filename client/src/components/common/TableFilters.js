import React, { useState } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';

/**
 * TableFilters Component
 *
 * This component provides a reusable, configurable filtering interface for data tables.
 * It supports various filter types, collapsible sections, search functionality,
 * and can adapt to different data domains through configuration.
 *
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.filterConfig - Configuration defining available filters
 * @param {Object} props.filterState - Current state of all filters
 * @param {Function} props.onFilterChange - Handler for individual filter changes * @param {Function} props.onApplyFilters - Handler called when filters should be applied
 * @param {Function} props.onClearFilters - Handler to reset filters to defaults
 * @param {Function} props.onSearch - Handler for search queries
 * @param {string} [props.searchPlaceholder] - Placeholder text for the search input
 * @param {React.ReactNode} [props.actionButtons] - Optional additional action buttons to display
 * @returns {JSX.Element} The filter interface component
 */
const TableFilters = ({
  filterConfig,
  filterState,
  onFilterChange,
  onApplyFilters,
  onClearFilters,
  onSearch,
  searchPlaceholder = 'Search...',
  actionButtons,
}) => {
  // Local state for UI controls
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false); // Controls filter section visibility
  const [searchQuery, setSearchQuery] = useState(''); // Tracks the current search query text

  /**
   * Toggles the visibility of the advanced filters section
   * This gives users the option to show or hide detailed filtering options,
   * making the interface cleaner when not needed
   */
  const toggleAdvancedFilters = () => {
    setShowAdvancedFilters(!showAdvancedFilters);
  };

  /**
   * Handles search form submission
   * Prevents the default form action (page refresh) and calls the
   * provided search handler with the current query if it's not empty
   *
   * @param {React.FormEvent} e - The form submission event
   */
  const handleSearch = (e) => {
    e.preventDefault(); // Prevent form from causing page refresh

    // Only trigger search if there's actual text (not just spaces)
    if (searchQuery.trim()) {
      onSearch(searchQuery);
    }
  };
  /**
   * Clears the search input and resets related state
   * This provides a quick way for users to start a new search
   * Also triggers an empty search to reset the results
   */
  const handleClearSearch = () => {
    setSearchQuery('');
    // Trigger search with empty query to reset results
    onSearch('');
  };

  /**
   * Renders a select dropdown filter based on configuration
   *
   * @param {Object} filter - The filter configuration
   * @returns {JSX.Element} A select input with label and options
   */
  const renderSelectFilter = (filter) => {
    return (
      <div key={filter.id} className="filter-field">
        {/* Each filter has a label that describes what it does */}
        <label
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          htmlFor={filter.id}
        >
          {filter.label}
        </label>

        {/* The select dropdown that shows all available options */}
        <select
          id={filter.id}
          className="w-full p-2 border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          value={filterState[filter.id] || filter.defaultValue || ''}
          onChange={(e) => onFilterChange(filter.id, e.target.value)}
        >
          {/* Empty option for "show all" functionality */}
          {filter.emptyOption !== false && (
            <option value="">{filter.emptyOptionLabel || 'All'}</option>
          )}

          {/* Map through all possible options and render them as <option> elements */}
          {filter.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  };

  /**
   * Renders a standard date range filter with start and end date inputs
   *
   * @param {Object} filter - The filter configuration
   * @returns {JSX.Element} Date range inputs with labels
   */
  const renderDateRangeFilter = (filter) => {
    // Extract the current date values or use empty strings as default
    const startDate = filterState[filter.id]?.start || '';
    const endDate = filterState[filter.id]?.end || '';

    return (
      <div key={filter.id} className="filter-field">
        <label
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          htmlFor={`${filter.id}-start`}
        >
          {filter.label}
        </label>

        {/* Grid layout for the date inputs - one column on mobile, two columns on larger screens */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {/* Start date input */}
          <div>
            <input
              id={`${filter.id}-start`}
              type="date"
              className="w-full p-2 border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={startDate}
              onChange={(e) => {
                // Update just the 'start' property while preserving other properties
                onFilterChange(filter.id, {
                  ...filterState[filter.id],
                  start: e.target.value,
                });
              }}
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Start
            </span>
          </div>

          {/* End date input */}
          <div>
            <input
              id={`${filter.id}-end`}
              type="date"
              className="w-full p-2 border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={endDate}
              onChange={(e) => {
                // Update just the 'end' property while preserving other properties
                onFilterChange(filter.id, {
                  ...filterState[filter.id],
                  end: e.target.value,
                });
              }}
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              End
            </span>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Renders a date range filter with preset options and optional custom date inputs
   * This combines the convenience of common presets with the flexibility of custom dates
   *
   * @param {Object} filter - The filter configuration
   * @returns {JSX.Element} Date preset select and optional custom date inputs
   */
  const renderDatePresetFilter = (filter) => {
    // Get the current preset value or use the default
    const currentPreset = filterState.datePreset || filter.defaultValue || '';
    const showCustomDateInputs = filterState.showCustomDateInputs || false;

    return (
      <div key={filter.id} className="filter-field">
        {/* Label for the preset dropdown */}
        <label
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          htmlFor={filter.id}
        >
          {filter.label}
        </label>

        {/* Dropdown for selecting common date presets */}
        <select
          id={filter.id}
          className="w-full p-2 border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          value={currentPreset}
          onChange={(e) => {
            const newValue = e.target.value;

            // Update the date preset selection
            onFilterChange('datePreset', newValue);

            // Show custom date inputs if 'custom' option is selected
            // Special logic for 'custom' preset which requires additional UI
            if (newValue === 'custom') {
              onFilterChange('showCustomDateInputs', true);
            } else {
              onFilterChange('showCustomDateInputs', false);
            }
          }}
        >
          {/* Map through all preset options */}
          {filter.presets.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </select>

        {/* Show custom date inputs only if 'custom' preset is selected */}
        {showCustomDateInputs && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
            {/* Start date input for custom range */}
            <div>
              <label
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                htmlFor="start-date"
              >
                Start Date
              </label>
              <input
                id="start-date"
                type="date"
                className="w-full p-2 border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={filterState.startDate || ''}
                onChange={(e) => onFilterChange('startDate', e.target.value)}
              />
            </div>

            {/* End date input for custom range */}
            <div>
              <label
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                htmlFor="end-date"
              >
                End Date
              </label>
              <input
                id="end-date"
                type="date"
                className="w-full p-2 border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={filterState.endDate || ''}
                onChange={(e) => onFilterChange('endDate', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* If using a preset, show helpful information about the selected date range */}
        {!showCustomDateInputs && filter.showDateSummary && (
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {/* This could show a human-readable summary of the date range */}
            {currentPreset &&
              filter.presets.find((p) => p.value === currentPreset)?.label}
          </div>
        )}
      </div>
    );
  };

  /**
   * Renders a text input filter for simple text searches within specific fields
   *
   * @param {Object} filter - The filter configuration
   * @returns {JSX.Element} A text input with label
   */
  const renderTextFilter = (filter) => {
    return (
      <div key={filter.id} className="filter-field">
        <label
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          htmlFor={filter.id}
        >
          {filter.label}
        </label>
        <div className="relative">
          <input
            id={filter.id}
            type="text"
            className="w-full p-2 pr-8 border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            value={filterState[filter.id] || ''}
            placeholder={filter.placeholder || ''}
            onChange={(e) => onFilterChange(filter.id, e.target.value)}
          />
          {/* Clear button appears when there's text input */}
          {filterState[filter.id] && (
            <button
              type="button"
              onClick={() => onFilterChange(filter.id, '')}
              className="absolute right-2 top-2.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              aria-label="Clear"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
    );
  };

  /**
   * Dispatches the rendering to the appropriate filter renderer based on filter type
   * This is a "router" function that delegates to specialized rendering functions
   *
   * @param {Object} filter - The filter configuration object
   * @returns {JSX.Element|null} The rendered filter input
   */
  const renderFilterInput = (filter) => {
    // Based on the filter type, call the appropriate renderer
    switch (filter.type) {
      case 'select':
        return renderSelectFilter(filter);

      case 'dateRange':
        return renderDateRangeFilter(filter);

      case 'dateRangePreset':
        return renderDatePresetFilter(filter);

      case 'text':
        return renderTextFilter(filter);

      // Add new filter type renderers here as needed

      default:
        console.warn(`Unknown filter type: ${filter.type}`);
        return null;
    }
  };

  /**
   * Determines the CSS grid columns based on configuration, defaulting to reasonable values
   *
   * @returns {string} CSS class string for grid columns
   */
  const getGridClasses = () => {
    // Default grid setup for responsive design
    const defaultGrid = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

    // If no layout configuration is provided, use the default
    if (!filterConfig.layout?.columns) {
      return defaultGrid;
    }

    // Build responsive grid column classes based on configuration
    const { columns } = filterConfig.layout;
    const classes = ['grid'];

    // Default (mobile) columns
    classes.push(`grid-cols-${columns.default || 1}`);

    // Medium screen columns
    if (columns.md) {
      classes.push(`md:grid-cols-${columns.md}`);
    }

    // Large screen columns
    if (columns.lg) {
      classes.push(`lg:grid-cols-${columns.lg}`);
    }

    return classes.join(' ');
  };

  // The actual component render
  return (
    <div className="bg-app-sidebar rounded-lg border border-sidebar-border shadow-xl p-6 mb-6">
      {/* Top row: Search bar and filter toggle button */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        {/* Search Box */}
        <form onSubmit={handleSearch} className="flex flex-1 max-w-3xl">
          <div className="relative flex-grow">
            {' '}
            {/* Search text input */}
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-2 pr-8 border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              aria-label="Search input"
            />
            {/* Clear button - only visible when there's a search query */}
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2 top-2.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Search button - disabled when there's no search query */}
          <button
            type="submit"
            disabled={!searchQuery.trim()}
            className={`ml-2 px-4 py-2 rounded-md ${
              !searchQuery.trim()
                ? 'bg-blue-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white`}
            aria-label="Submit search"
          >
            <Search size={18} />
          </button>
        </form>

        {/* Filters Toggle Button */}
        <button
          onClick={toggleAdvancedFilters}
          className="flex items-center gap-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md transition-all"
          aria-expanded={showAdvancedFilters}
          aria-controls="advanced-filters"
        >
          <span>Filters</span>
          {/* Arrow icon that rotates when filters are expanded */}
          <ChevronDown
            size={16}
            className={`transform transition-transform ${
              showAdvancedFilters ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {/* Advanced Filters Section - Only visible when expanded */}
      {showAdvancedFilters && (
        <div
          id="advanced-filters"
          className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-2 animate-fadeIn"
        >
          {/* Grid layout for filter fields - responsive based on config */}
          <div className={`grid gap-4 mb-4 ${getGridClasses()}`}>
            {/* Render each filter based on its configuration */}
            {filterConfig.filters.map((filter) => renderFilterInput(filter))}
          </div>

          {/* Action Buttons Row */}
          <div className="flex flex-wrap gap-2 mt-4">
            {/* Apply Filters Button */}
            <button
              onClick={onApplyFilters}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
            >
              Apply Filters
            </button>

            {/* Clear Filters Button */}
            <button
              onClick={onClearFilters}
              className="px-4 py-2 border border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 rounded-md"
            >
              Clear
            </button>

            {/* Optional additional action buttons */}
            {actionButtons}
          </div>
        </div>
      )}
    </div>
  );
};

export default TableFilters;
