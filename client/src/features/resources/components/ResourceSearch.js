import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Search } from 'lucide-react';

/**
 * ResourceSearch Component
 *
 * A reusable search component for resource features that provides:
 * - Expanding/collapsing search bar functionality
 * - Consistent styling for search inputs across the application
 * - Search icon that expands to show input on click
 * - Collapses back to icon when focus is lost and input is empty
 * - Controlled input with state management
 *
 * @param {Object} props - Component props
 * @param {string} props.searchTerm - Current search term value
 * @param {Function} props.setSearchTerm - Function to update search term
 * @param {string} props.placeholder - Placeholder text to display when empty
 * @param {string} props.resourceType - Type of resource being searched (for placeholder text)
 * @param {boolean} props.expandable - Whether the search bar should expand/collapse
 * @returns {React.ReactElement} The ResourceSearch component
 */
const ResourceSearch = ({
  searchTerm,
  setSearchTerm,
  placeholder,
  resourceType = 'resources',
  expandable = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef(null);

  /**
   * Expands the search bar and focuses the input
   * Called when the search icon is clicked
   */
  const expandSearch = () => {
    setIsExpanded(true);
    // Use setTimeout to ensure the input is focused after it's expanded
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  /**
   * Collapses the search bar if the input is empty
   * Called when the input loses focus
   */
  const handleBlur = () => {
    if (searchTerm === '') {
      setIsExpanded(false);
    }
  };

  /**
   * If search term is not empty, keep the search bar expanded
   */
  useEffect(() => {
    if (searchTerm !== '') {
      setIsExpanded(true);
    }
  }, [searchTerm]);

  // If not expandable, use the original design
  if (!expandable) {
    return (
      <div className="relative mb-0">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={placeholder || `Search ${resourceType}...`}
          className="w-full py-2 px-4 pl-10 bg-app-input border border-dark-600 rounded-md text-[#F8FAFC] focus:outline-none focus:border-primary"
          aria-label={`Search ${resourceType}`}
        />
        <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
      </div>
    );
  }

  return (
    <div className="relative mb-0">
      {isExpanded ? (
        <div className="flex items-center transition-all duration-300 ease-in-out">
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onBlur={handleBlur}
            placeholder={placeholder || `Search ${resourceType}...`}
            className="w-48 py-2 px-4 pl-10 bg-app-input border border-dark-600 rounded-md text-[#F8FAFC] focus:outline-none focus:border-primary transition-all duration-300"
            aria-label={`Search ${resourceType}`}
          />
          <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
        </div>
      ) : (
        <button
          onClick={expandSearch}
          className="p-2 bg-transparent hover:bg-dark-700 rounded-md transition-colors"
          aria-label={`Show search ${resourceType}`}
        >
          <Search size={18} className="text-gray-400" />
        </button>
      )}
    </div>
  );
};

ResourceSearch.propTypes = {
  searchTerm: PropTypes.string.isRequired,
  setSearchTerm: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  resourceType: PropTypes.string,
  expandable: PropTypes.bool,
};

export default ResourceSearch;
