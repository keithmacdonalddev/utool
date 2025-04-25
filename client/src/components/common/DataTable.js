import React from 'react';
import PropTypes from 'prop-types';

/**
 * DataTable Component
 *
 * A highly flexible and reusable table component that handles various states (loading, empty, data)
 * and supports custom column definitions, row actions, and styling.
 *
 * This component abstracts away the common patterns and boilerplate associated with
 * displaying tabular data, allowing consumers to focus on their data and presentation needs.
 *
 * @component
 * @example
 * // Basic usage
 * const columns = [
 *   { key: 'name', label: 'Name', sortable: true },
 *   { key: 'email', label: 'Email' },
 *   { key: 'role', label: 'Role' }
 * ];
 *
 * <DataTable
 *   columns={columns}
 *   data={users}
 *   isLoading={loading}
 *   keyField="id"
 * />
 */
const DataTable = ({
  // Core data props
  columns, // Column definitions
  data, // Data array to display
  keyField = '_id', // Field to use as unique key for rows
  isLoading = false, // Whether the data is currently loading

  // Event handlers
  onRowClick, // Handler when a row is clicked

  // Customization props
  emptyMessage = 'No data found', // Message to display when data is empty
  loadingComponent, // Custom component to show during loading
  emptyComponent, // Custom component to show when empty
  rowClassName, // Function to determine CSS class for rows
  containerClassName = 'bg-app-sidebar rounded-lg border border-sidebar-border shadow-xl overflow-auto',
  tableClassName = 'min-w-full divide-y divide-gray-200 dark:divide-gray-700 border-collapse',
  headerClassName = 'bg-primary bg-opacity-20',
  bodyClassName = 'bg-card divide-y divide-gray-700',

  // Table behavior
  sortable = false, // Whether the table can be sorted
  onSort, // Handler for sort events

  // Row customization
  renderRowActions, // Function to render action buttons for each row
  expandableRows = false, // Whether rows can be expanded
  expandedRowContent, // Function to render expanded row content

  // Accessibility props
  ariaLabel = 'Data table',
}) => {
  /**
   * Generates a CSS class string for a table row based on the rowClassName function prop
   * and other dynamic conditions.
   *
   * @param {Object} row - The data row object
   * @param {number} index - The row's index
   * @returns {string} - The CSS class string for the row
   */
  const getRowClassName = (row, index) => {
    let classes = 'hover:bg-gray-50 dark:hover:bg-gray-700';

    if (typeof rowClassName === 'function') {
      const customClass = rowClassName(row, index);
      if (customClass) {
        classes = `${classes} ${customClass}`;
      }
    }

    return classes;
  };

  /**
   * Renders a cell's content based on the column configuration and row data
   *
   * @param {Object} row - The data row
   * @param {Object} column - The column configuration
   * @returns {React.ReactNode} - The rendered cell content
   */
  const renderCellContent = (row, column) => {
    // If the column has a custom render function, use it
    if (column.render) {
      return column.render(row, column);
    }

    // Get the value from the row based on the column key
    let value = row[column.key];

    // Optional formatting based on column type
    if (column.type === 'date' && value) {
      try {
        value = new Date(value).toLocaleString();
      } catch (e) {
        console.warn(`Failed to format date: ${value}`, e);
      }
    }

    // Handle special formatting for specific column types
    if (column.type === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    // For empty values, return a placeholder
    if (value === null || value === undefined) {
      return column.emptyValue || '-';
    }

    return value;
  };

  /**
   * Handles row click events. If a row is clicked and an onRowClick handler
   * is provided, it will invoke the handler with the row data.
   *
   * @param {Object} row - The data row that was clicked
   * @param {Event} event - The click event object
   */
  const handleRowClick = (row, event) => {
    if (onRowClick) {
      // If the click came from an action button, don't trigger the row click
      if (event.target.closest('[data-action="true"]')) {
        return;
      }
      onRowClick(row, event);
    }
  };

  /**
   * Renders the loading state
   * This shows when data is being fetched or processed
   *
   * @returns {React.ReactNode} - The loading state UI
   */
  const renderLoading = () => {
    if (loadingComponent) {
      return loadingComponent;
    }

    return (
      <tr>
        <td
          colSpan={columns.length + (renderRowActions ? 1 : 0)}
          className="px-6 py-4 text-center border-b border-gray-700"
        >
          <div className="flex justify-center">
            <svg
              className="animate-spin h-5 w-5 text-blue-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
        </td>
      </tr>
    );
  };

  /**
   * Renders the empty state
   * This shows when there is no data to display
   *
   * @returns {React.ReactNode} - The empty state UI
   */
  const renderEmpty = () => {
    if (emptyComponent) {
      return emptyComponent;
    }

    return (
      <tr>
        <td
          colSpan={columns.length + (renderRowActions ? 1 : 0)}
          className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700"
        >
          {emptyMessage}
        </td>
      </tr>
    );
  };

  /**
   * Renders a table header cell with optional sorting controls
   *
   * @param {Object} column - The column configuration
   * @param {number} index - The column index
   * @returns {React.ReactNode} - The rendered header cell
   */
  const renderHeaderCell = (column, index) => {
    const headerClasses =
      'px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700';

    // If the column is sortable, add sort controls
    if (sortable && column.sortable && onSort) {
      return (
        <th
          key={column.key || index}
          className={`${headerClasses} cursor-pointer`}
          onClick={() => onSort(column.key)}
        >
          <div className="flex items-center space-x-1">
            <span>{column.label}</span>
            {/* Sort icon would go here */}
          </div>
        </th>
      );
    }

    return (
      <th key={column.key || index} className={headerClasses}>
        {column.label}
      </th>
    );
  };

  /**
   * Renders a table data cell with the appropriate content and styling
   *
   * @param {Object} row - The data row
   * @param {Object} column - The column configuration
   * @param {number} colIndex - The column index
   * @returns {React.ReactNode} - The rendered table cell
   */
  const renderCell = (row, column, colIndex) => {
    // Base cell classes
    const cellClasses =
      'px-6 py-4 whitespace-nowrap text-left border-b border-gray-200 dark:border-gray-700';

    // Apply additional column-specific classes
    const classes = column.className
      ? `${cellClasses} ${column.className}`
      : cellClasses;

    return (
      <td key={column.key || colIndex} className={classes}>
        {typeof column.cellClassName === 'function' ? (
          <div className={column.cellClassName(row)}>
            {renderCellContent(row, column)}
          </div>
        ) : (
          <div className={column.cellClassName || ''}>
            {renderCellContent(row, column)}
          </div>
        )}
      </td>
    );
  };

  /**
   * Renders the actions cell with custom action buttons for a row
   *
   * @param {Object} row - The data row
   * @returns {React.ReactNode} - The rendered actions cell
   */
  const renderActionsCell = (row) => {
    if (!renderRowActions) return null;

    return (
      <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium border-b border-gray-200 dark:border-gray-700">
        <div className="flex space-x-2" data-action="true">
          {renderRowActions(row)}
        </div>
      </td>
    );
  };

  /**
   * Renders the expandable content for a row
   * Only shown when the row is expanded and expandableRows is true
   *
   * @param {Object} row - The data row
   * @returns {React.ReactNode} - The rendered expanded content
   */
  const renderExpandedContent = (row, isExpanded) => {
    if (!expandableRows || !isExpanded || !expandedRowContent) return null;

    return (
      <tr>
        <td
          colSpan={columns.length + (renderRowActions ? 1 : 0)}
          className="bg-gray-50 dark:bg-gray-800"
        >
          <div className="p-4">{expandedRowContent(row)}</div>
        </td>
      </tr>
    );
  };

  /**
   * Renders data rows when data is available
   * Each row contains cells for each column, and optionally action buttons
   *
   * @returns {React.ReactNode[]} - The array of rendered row elements
   */
  const renderRows = () => {
    // Track expanded rows with state if we implement expandable rows
    // This is just a placeholder - in a real component, you'd use React.useState
    const expandedRows = {};

    return data.map((row, rowIndex) => {
      const rowKey = row[keyField] || rowIndex;
      const isExpanded = expandedRows[rowKey] || false;

      return (
        <React.Fragment key={rowKey}>
          <tr
            className={getRowClassName(row, rowIndex)}
            onClick={(e) => handleRowClick(row, e)}
          >
            {columns.map((column, colIndex) =>
              renderCell(row, column, colIndex)
            )}
            {renderActionsCell(row)}
          </tr>
          {renderExpandedContent(row, isExpanded)}
        </React.Fragment>
      );
    });
  };

  return (
    <div className={containerClassName} role="region" aria-label={ariaLabel}>
      <table className={tableClassName}>
        <thead className={headerClassName}>
          <tr>
            {columns.map((column, index) => renderHeaderCell(column, index))}
            {renderRowActions && (
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className={bodyClassName}>
          {isLoading
            ? renderLoading()
            : data.length > 0
            ? renderRows()
            : renderEmpty()}
        </tbody>
      </table>
    </div>
  );
};

/**
 * PropTypes for the DataTable component
 * These provide type validation for the component props
 * and serve as documentation for consumers of this component
 */
DataTable.propTypes = {
  /** Array of column definition objects */
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      /** Unique identifier for the column, also used as the key to access data */
      key: PropTypes.string.isRequired,
      /** Display label for the column header */
      label: PropTypes.string.isRequired,
      /** Whether this column can be sorted */
      sortable: PropTypes.bool,
      /** Optional CSS class for the column */
      className: PropTypes.string,
      /** CSS class for the cell content, can be a function (row) => string */
      cellClassName: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
      /** Data type for special handling ('string', 'number', 'date', 'boolean', etc.) */
      type: PropTypes.string,
      /** Custom render function for this column: (row, column) => ReactNode */
      render: PropTypes.func,
      /** Value to display when cell data is empty */
      emptyValue: PropTypes.node,
    })
  ).isRequired,

  /** Array of data objects to display in the table */
  data: PropTypes.array.isRequired,

  /** Field to use as the unique key for each row */
  keyField: PropTypes.string,

  /** Whether the data is currently loading */
  isLoading: PropTypes.bool,

  /** Handler for row click events: (row, event) => void */
  onRowClick: PropTypes.func,

  /** Message to display when there is no data */
  emptyMessage: PropTypes.node,

  /** Custom component to display during loading */
  loadingComponent: PropTypes.node,

  /** Custom component to display when empty */
  emptyComponent: PropTypes.node,

  /** Function to determine CSS class for rows: (row, index) => string */
  rowClassName: PropTypes.func,

  /** CSS class for the table container */
  containerClassName: PropTypes.string,

  /** CSS class for the table element */
  tableClassName: PropTypes.string,

  /** CSS class for the thead element */
  headerClassName: PropTypes.string,

  /** CSS class for the tbody element */
  bodyClassName: PropTypes.string,

  /** Whether the table can be sorted */
  sortable: PropTypes.bool,

  /** Handler for sort events: (columnKey) => void */
  onSort: PropTypes.func,

  /** Function to render action buttons for each row: (row) => ReactNode */
  renderRowActions: PropTypes.func,

  /** Whether rows can be expanded */
  expandableRows: PropTypes.bool,

  /** Function to render expanded row content: (row) => ReactNode */
  expandedRowContent: PropTypes.func,

  /** Accessibility label for the table */
  ariaLabel: PropTypes.string,
};

export default DataTable;
