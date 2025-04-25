import React from 'react';
import PropTypes from 'prop-types';

/**
 * # Pagination Component
 *
 * ## What is Pagination?
 *
 * Pagination is a user interface pattern used when we have a large collection of data that
 * would be overwhelming to display all at once. Instead, we split the data into "pages" and
 * let users navigate between these pages to see different portions of the data.
 *
 * ## How Pagination Works in Web Applications
 *
 * Think of pagination like a book: instead of showing all pages at once, you view one page at a time
 * and have controls to move forward or backward. In web applications:
 *
 * 1. The backend typically provides an API that accepts parameters like `page` and `limit`
 * 2. The frontend sends these parameters when requesting data
 * 3. The backend returns only the specified "page" of results, along with metadata about the total
 * 4. The frontend displays this page of data along with navigation controls
 *
 * ## This Component's Features
 *
 * This pagination component offers:
 * - First/last page navigation
 * - Previous/next page navigation
 * - Jump forward/backward by multiple pages
 * - Current page indicator
 * - Disabled states for controls when at boundaries
 * - Full accessibility support
 * - Customizable styling
 *
 * @component
 * @example
 * // Basic usage
 * <Pagination
 *   currentPage={2}
 *   totalPages={10}
 *   onPageChange={(newPage) => setPage(newPage)}
 * />
 *
 * // With jump size customization
 * <Pagination
 *   currentPage={5}
 *   totalPages={20}
 *   jumpSize={5}
 *   onPageChange={(newPage) => setPage(newPage)}
 * />
 */
const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  showJumpControls = true,
  jumpSize = 10,
  ariaLabel = 'Pagination',
  className = '',
}) => {
  /**
   * ## Navigation Functions
   *
   * These helper functions handle the different types of page navigation.
   * Each function ensures we stay within valid page boundaries (1 to totalPages).
   */

  /**
   * Navigate to the first page (page 1)
   *
   * We use this function when the user clicks the "First Page" button.
   * No parameters needed since the first page is always 1.
   */
  const goToFirstPage = () => {
    if (currentPage !== 1) {
      onPageChange(1);
    }
  };

  /**
   * Navigate to the previous page (current page - 1)
   *
   * We use this function when the user clicks the "Previous Page" button.
   * It decrements the current page by 1, but won't go below page 1.
   */
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  /**
   * Navigate to the next page (current page + 1)
   *
   * We use this function when the user clicks the "Next Page" button.
   * It increments the current page by 1, but won't exceed totalPages.
   */
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  /**
   * Navigate to the last page (totalPages)
   *
   * We use this function when the user clicks the "Last Page" button.
   * No calculation needed since we already have the totalPages value.
   */
  const goToLastPage = () => {
    if (currentPage !== totalPages) {
      onPageChange(totalPages);
    }
  };

  /**
   * Jump backward by multiple pages
   *
   * This allows users to skip backward quickly through larger datasets.
   * We ensure the new page isn't less than 1.
   */
  const jumpBackward = () => {
    const newPage = Math.max(1, currentPage - jumpSize);
    if (newPage !== currentPage) {
      onPageChange(newPage);
    }
  };

  /**
   * Jump forward by multiple pages
   *
   * This allows users to skip forward quickly through larger datasets.
   * We ensure the new page doesn't exceed totalPages.
   */
  const jumpForward = () => {
    const newPage = Math.min(totalPages, currentPage + jumpSize);
    if (newPage !== currentPage) {
      onPageChange(newPage);
    }
  };

  /**
   * ## Helper Function: Button Class Generator
   *
   * This function centralizes our button styling logic. It returns CSS classes
   * for buttons based on whether they are disabled or not.
   *
   * @param {boolean} isDisabled - Whether the button should be in a disabled state
   * @returns {string} The appropriate CSS classes for the button
   */
  const getButtonClasses = (isDisabled) => {
    return `px-3 py-1 rounded ${
      isDisabled
        ? 'bg-gray-200 cursor-not-allowed dark:bg-gray-700 text-gray-400 dark:text-gray-500'
        : 'bg-blue-600 hover:bg-blue-700 text-white'
    }`;
  };

  /**
   * ## Early Return for Single Page
   *
   * If there's only one page (or none), we don't need to show pagination controls.
   * User experience best practice: don't show unnecessary UI elements.
   */
  if (totalPages <= 1) {
    return null;
  }

  /**
   * ## Component Render
   *
   * Here we render the pagination controls with appropriate accessibility attributes.
   * The structure follows a common pagination pattern:
   *
   * [First] [<<] [<] [Current Page] [>] [>>] [Last]
   *
   * Where:
   * - [First]: Jump to first page
   * - [<<]: Jump backward multiple pages
   * - [<]: Go to previous page
   * - [Current Page]: Visual indicator of which page we're on
   * - [>]: Go to next page
   * - [>>]: Jump forward multiple pages
   * - [Last]: Jump to last page
   */
  return (
    <nav
      aria-label={ariaLabel}
      className={`flex items-center justify-between mt-6 ${className}`}
    >
      {/* Left side: Page counter */}
      <div className="text-sm text-gray-700 dark:text-gray-400">
        Page {currentPage} of {totalPages}
      </div>

      {/* Right side: Navigation controls */}
      <div className="flex space-x-2">
        {/* First Page Button */}
        <button
          onClick={goToFirstPage}
          disabled={currentPage <= 1}
          title="First Page"
          className={getButtonClasses(currentPage <= 1)}
          aria-label="Go to first page"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="11 17 6 12 11 7"></polyline>
            <polyline points="18 17 13 12 18 7"></polyline>
          </svg>
        </button>

        {/* Jump Backward Button - Only shown if showJumpControls is true */}
        {showJumpControls && (
          <button
            onClick={jumpBackward}
            disabled={currentPage <= 1}
            title={`Back ${jumpSize} Pages`}
            className={getButtonClasses(currentPage <= 1)}
            aria-label={`Go back ${jumpSize} pages`}
          >
            -{jumpSize}
          </button>
        )}

        {/* Previous Page Button */}
        <button
          onClick={goToPreviousPage}
          disabled={currentPage <= 1}
          title="Previous Page"
          className={getButtonClasses(currentPage <= 1)}
          aria-label="Go to previous page"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>

        {/* Current Page Indicator */}
        <span
          className="px-4 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-800 dark:text-gray-200 font-medium"
          aria-current="page"
          role="status"
        >
          {currentPage}
        </span>

        {/* Next Page Button */}
        <button
          onClick={goToNextPage}
          disabled={currentPage >= totalPages}
          title="Next Page"
          className={getButtonClasses(currentPage >= totalPages)}
          aria-label="Go to next page"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>

        {/* Jump Forward Button - Only shown if showJumpControls is true */}
        {showJumpControls && (
          <button
            onClick={jumpForward}
            disabled={currentPage >= totalPages}
            title={`Forward ${jumpSize} Pages`}
            className={getButtonClasses(currentPage >= totalPages)}
            aria-label={`Go forward ${jumpSize} pages`}
          >
            +{jumpSize}
          </button>
        )}

        {/* Last Page Button */}
        <button
          onClick={goToLastPage}
          disabled={currentPage >= totalPages}
          title="Last Page"
          className={getButtonClasses(currentPage >= totalPages)}
          aria-label="Go to last page"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="13 17 18 12 13 7"></polyline>
            <polyline points="6 17 11 12 6 7"></polyline>
          </svg>
        </button>
      </div>
    </nav>
  );
};

/**
 * ## PropTypes for Input Validation
 *
 * PropTypes help us validate the input props to ensure they match what our component expects.
 * This is a form of "type checking" that helps catch errors early.
 *
 * When someone uses our component incorrectly (like passing a string instead of a number),
 * React will show a warning in the console during development.
 */
Pagination.propTypes = {
  /**
   * The current active page number (starts at 1)
   */
  currentPage: PropTypes.number.isRequired,

  /**
   * The total number of pages available
   */
  totalPages: PropTypes.number.isRequired,

  /**
   * Callback function that is called when the page changes
   * It receives the new page number as an argument
   */
  onPageChange: PropTypes.func.isRequired,

  /**
   * Whether to show the jump forward/backward controls
   * These are useful for datasets with many pages
   */
  showJumpControls: PropTypes.bool,

  /**
   * How many pages to jump when using the jump controls
   */
  jumpSize: PropTypes.number,

  /**
   * ARIA label for the pagination navigation for accessibility
   */
  ariaLabel: PropTypes.string,

  /**
   * Additional CSS classes to apply to the pagination container
   */
  className: PropTypes.string,
};

/**
 * ## Default Props
 *
 * These values are used when the corresponding props aren't explicitly provided.
 * This makes our component more flexible while maintaining expected behavior.
 */
Pagination.defaultProps = {
  showJumpControls: true,
  jumpSize: 10,
  ariaLabel: 'Pagination',
  className: '',
};

export default Pagination;
