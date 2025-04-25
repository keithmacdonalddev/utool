import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  format,
  subHours,
  subDays,
  startOfDay,
  startOfWeek,
  startOfMonth,
  endOfDay,
  addDays,
} from 'date-fns';
import {
  fetchAuditLogs,
  searchAuditLogs,
  setFilters,
  clearFilters,
  deleteAuditLogsByDateRange,
} from '../features/auditLogs/auditLogsSlice';
import {
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
  RefreshCw,
  Trash2,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'react-toastify';
import TableFilters from '../components/common/TableFilters';
import DataTable from '../components/common/DataTable';
import Pagination from '../components/common/Pagination';

/**
 * AuditLogsPage Component
 *
 * This page provides a comprehensive interface for viewing, filtering, and managing system audit logs.
 *
 * Audit logs are critical in any production system as they provide a historical record of all
 * important user and system activities. They help with security monitoring, troubleshooting,
 * and compliance requirements.
 *
 * Features include:
 * - Searchable and filterable logs with a reusable TableFilters component
 * - Paginated data display using a reusable DataTable component
 * - Filtering by action type, status, and date range with presets (past hour, today, etc.)
 * - Detailed view of individual log entries via a modal dialog
 * - Ability to delete logs for a selected time period
 *
 * @returns {JSX.Element} The rendered AuditLogsPage component
 */
const AuditLogsPage = () => {
  // Redux dispatch function for triggering actions
  const dispatch = useDispatch();

  /**
   * Select relevant state from the Redux store
   *
   * Here we use the useSelector hook from Redux to extract only the pieces of state
   * that this component needs. This is more efficient than connecting to the entire store.
   *
   * The state includes:
   * - logs: Array of audit log objects
   * - totalCount: Total number of logs matching the current filters
   * - pagination: Information about which pages are available
   * - loading: Boolean indicating if data is being fetched
   * - error: Any error that occurred during data fetching
   * - filters: Currently applied filters
   */
  const { logs, totalCount, pagination, loading, error, filters } = useSelector(
    (state) => state.auditLogs
  );

  /**
   * Local component state declarations
   *
   * React's useState hook allows us to add state to functional components.
   * Each state variable comes with its own setter function, which we use to update that state.
   */
  // Pagination controls - which page we're on and how many items per page
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // Search functionality state
  const [searchQuery, setSearchQuery] = useState('');

  // Log details modal state
  const [selectedLog, setSelectedLog] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Filter state variables
  const [startDate, setStartDate] = useState(filters.startDate || '');
  const [endDate, setEndDate] = useState(filters.endDate || '');
  const [actionFilter, setActionFilter] = useState(filters.action || '');
  const [statusFilter, setStatusFilter] = useState(filters.status || '');
  const [datePreset, setDatePreset] = useState('past_hour'); // Default to past hour
  const [showCustomDateInputs, setShowCustomDateInputs] = useState(false);

  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  /**
   * Date preset options for quick filtering
   *
   * These options allow users to quickly select common time ranges without
   * having to manually set start and end dates.
   *
   * Each preset has:
   * - value: Identifier used internally
   * - label: User-facing text shown in the dropdown
   */
  const datePresets = [
    { value: 'past_hour', label: 'Past Hour' },
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'this_week', label: 'This Week' },
    { value: 'last_week', label: 'Last Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'custom', label: 'Custom Range' },
  ];

  /**
   * Action types for filter dropdown
   *
   * This array contains all possible audit log action types in the system.
   * These are the specific activities that get logged, like user logins,
   * content changes, etc.
   */
  const actionTypes = [
    'login',
    'logout',
    'password_change',
    'email_verification',
    'account_lock',
    'profile_update',
    'role_change',
    'permission_change',
    'content_create',
    'content_update',
    'content_delete',
    'project_create',
    'project_update',
    'project_delete',
    'task_create',
    'task_update',
    'task_delete',
    'task_status_change',
    'kb_create',
    'kb_update',
    'kb_delete',
    'note_create',
    'note_update',
    'note_delete',
    'admin_action',
  ];

  /**
   * Status options for filter dropdown
   *
   * Audit logs can have different statuses to indicate the result
   * of the logged action.
   */
  const statusOptions = ['success', 'failed', 'pending'];

  /**
   * Column definitions for the DataTable component
   *
   * This array defines how each column in the audit logs table should be displayed.
   * Each object in the array represents one column, with properties that determine:
   * - Which data to show (key)
   * - What header to use (label)
   * - How to render the cell content (render function)
   * - Additional styling (className)
   *
   * The render function is particularly powerful as it allows custom formatting
   * and component rendering for each cell based on the row's data.
   */
  const auditLogColumns = [
    {
      key: 'userId',
      label: 'User',
      render: (row) =>
        row.userId ? (
          <>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {row.userId.name}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {row.userId.email}
            </div>
          </>
        ) : (
          'Anonymous'
        ),
    },
    {
      key: 'action',
      label: 'Action',
      render: (row) => (
        <div className="text-sm text-gray-900 dark:text-white">
          {row.action.replace(/_/g, ' ')}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <span
          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
            row.status
          )}`}
        >
          {row.status}
        </span>
      ),
    },
    {
      key: 'ipAddress',
      label: 'IP Address',
      className: 'text-sm text-gray-500 dark:text-gray-400',
    },
    {
      key: 'timestamp',
      label: 'Timestamp',
      className: 'text-sm text-gray-500 dark:text-gray-400',
      type: 'date', // This tells the DataTable to format this as a date
    },
  ];

  /**
   * Filter configuration for the TableFilters component
   *
   * This configuration object defines what filters will be displayed
   * and how they behave. The TableFilters component uses this to render
   * the appropriate filter controls.
   */
  const auditLogFilterConfig = {
    filters: [
      {
        id: 'action',
        type: 'select',
        label: 'Action Type',
        options: actionTypes.map((action) => ({
          value: action,
          label: action.replace(/_/g, ' '),
        })),
        defaultValue: '',
        emptyOptionLabel: 'All Actions',
      },
      {
        id: 'status',
        type: 'select',
        label: 'Status',
        options: statusOptions.map((status) => ({
          value: status,
          label: status.charAt(0).toUpperCase() + status.slice(1),
        })),
        defaultValue: '',
        emptyOptionLabel: 'All Statuses',
      },
      {
        id: 'dateRange',
        type: 'dateRangePreset',
        label: 'Date Range',
        presets: datePresets,
        defaultValue: 'past_hour',
        showDateSummary: true,
      },
    ],
    layout: {
      columns: {
        default: 1,
        md: 2,
        lg: 3,
      },
    },
  };

  /**
   * The current state of all filters, combined into a single object
   *
   * This will be passed to the TableFilters component to maintain
   * the current filter values in the UI.
   */
  const filterState = {
    action: actionFilter,
    status: statusFilter,
    datePreset,
    showCustomDateInputs,
    startDate,
    endDate,
  };

  /**
   * Handles changes to individual filter fields
   *
   * This function is passed to the TableFilters component and will be called
   * whenever any filter value changes. It updates the appropriate state
   * variable based on which filter changed.
   *
   * @param {string} filterId - The identifier of the filter that changed
   * @param {any} value - The new value for the filter
   */
  const handleFilterChange = (filterId, value) => {
    switch (filterId) {
      case 'action':
        setActionFilter(value);
        break;
      case 'status':
        setStatusFilter(value);
        break;
      case 'datePreset':
        handleDatePresetChange(value);
        break;
      case 'showCustomDateInputs':
        setShowCustomDateInputs(value);
        break;
      case 'startDate':
        setStartDate(value);
        break;
      case 'endDate':
        setEndDate(value);
        break;
      default:
        break;
    }
  };

  /**
   * Render action buttons for each row in the DataTable
   *
   * This function is passed to the DataTable component to render
   * custom action buttons for each row. In this case, we're adding
   * a button to view the details of a log entry.
   *
   * @param {Object} row - The data row being rendered
   * @returns {JSX.Element} The action button element
   */
  const renderRowActions = (row) => (
    <button
      onClick={() => handleViewLogDetails(row)}
      className="text-blue-600 hover:text-blue-900 dark:text-blue-500 dark:hover:text-blue-400"
      aria-label={`View details for ${row.action}`}
    >
      <Eye size={18} />
    </button>
  );

  /**
   * Calculate date range based on preset
   *
   * Given a preset identifier like 'past_hour' or 'today', this function
   * calculates the actual start and end dates to use for filtering.
   *
   * @param {string} preset - The preset identifier
   * @returns {Object} An object containing startDate and endDate as ISO strings
   */
  const calculateDateRange = (preset) => {
    // Use the real current date
    const now = new Date();
    let start, end;

    switch (preset) {
      case 'past_hour':
        start = subHours(now, 1);
        end = now;
        break;
      case 'today':
        start = startOfDay(now);
        end = now;
        break;
      case 'yesterday':
        start = startOfDay(subDays(now, 1));
        end = endOfDay(subDays(now, 1));
        break;
      case 'this_week':
        start = startOfWeek(now, { weekStartsOn: 1 }); // Week starts on Monday
        end = now;
        break;
      case 'last_week':
        start = startOfWeek(subDays(now, 7), { weekStartsOn: 1 });
        end = endOfDay(addDays(start, 6)); // End of last week
        break;
      case 'this_month':
        start = startOfMonth(now);
        end = now;
        break;
      case 'custom':
        // Return current custom values
        return {
          startDate: startDate || '',
          endDate: endDate || '',
        };
      default:
        start = subHours(now, 1); // Default to past hour
        end = now;
    }

    // Use full ISO strings for precise time filtering
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  };

  /**
   * Handle date preset change
   *
   * When a user selects a different date preset (like "Today" or "This Week"),
   * this function updates the state accordingly and calculates the new date range.
   *
   * @param {string} preset - The selected preset identifier
   */
  const handleDatePresetChange = (preset) => {
    setDatePreset(preset);
    setShowCustomDateInputs(preset === 'custom');

    if (preset !== 'custom') {
      const { startDate: newStartDate, endDate: newEndDate } =
        calculateDateRange(preset);
      setStartDate(newStartDate);
      setEndDate(newEndDate);
    }
  };

  /**
   * Initialize date range and fetch logs on component mount
   *
   * This effect runs once when the component is first mounted.
   * It sets the initial date range to "past hour" and fetches the first
   * batch of audit logs.
   */
  useEffect(() => {
    // Initialize with "past hour" filter
    const { startDate: initialStartDate, endDate: initialEndDate } =
      calculateDateRange('past_hour');
    setStartDate(initialStartDate);
    setEndDate(initialEndDate);

    // Fetch logs with the initial date range
    dispatch(
      fetchAuditLogs({
        page: 1,
        limit: 25,
        action: '',
        status: '',
        startDate: initialStartDate,
        endDate: initialEndDate,
      })
    );
  }, [dispatch]); // Only run on component mount

  /**
   * Fetch logs when component mounts or filters change
   *
   * This effect runs whenever the page, limit, or filter values change.
   * It fetches a new set of audit logs based on the current filters.
   */
  useEffect(() => {
    // If a date preset is selected and it's not custom, calculate the date range
    if (datePreset && datePreset !== 'custom') {
      const { startDate: newStartDate, endDate: newEndDate } =
        calculateDateRange(datePreset);
      console.log('Fetching with preset date range:', {
        startDate: newStartDate,
        endDate: newEndDate,
      });
      dispatch(
        fetchAuditLogs({
          page,
          limit,
          action: actionFilter,
          status: statusFilter,
          startDate: newStartDate,
          endDate: newEndDate,
        })
      );
    } else {
      console.log('Fetching with custom date range:', { startDate, endDate });
      dispatch(
        fetchAuditLogs({
          page,
          limit,
          action: actionFilter,
          status: statusFilter,
          startDate,
          endDate,
        })
      );
    }
  }, [dispatch, page, limit, datePreset, actionFilter, statusFilter]);

  /**
   * Handle apply filters button click
   *
   * When the user clicks "Apply Filters", this function:
   * 1. Calculates the exact date range based on the selected preset
   * 2. Resets to page 1
   * 3. Updates the Redux store with the new filters
   * 4. Fetches a new set of logs with the applied filters
   */
  const handleApplyFilters = () => {
    // Get fresh date calculations to ensure we're using the most current time
    let dateRange;
    if (datePreset === 'past_hour') {
      // Special handling for "Past Hour" to ensure precise time filtering
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      dateRange = {
        startDate: oneHourAgo.toISOString(),
        endDate: now.toISOString(),
      };
      console.log('Applying precise Past Hour filter:', dateRange);
    } else {
      // Normal date range calculation for other presets
      dateRange = calculateDateRange(datePreset);
      console.log('Applying standard date filter:', dateRange);
    }

    const newFilters = {
      action: actionFilter,
      status: statusFilter,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    };

    // Force reset to page 1 when changing filters
    setPage(1);

    // Apply the filters through Redux
    dispatch(setFilters(newFilters));

    // Immediately fetch logs with the new filters
    dispatch(
      fetchAuditLogs({
        page: 1, // Always start at page 1 when applying new filters
        limit,
        action: actionFilter,
        status: statusFilter,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })
    );
  };

  /**
   * Clear all filters
   *
   * This resets all filter values to their defaults and fetches
   * a new set of logs with no filters applied.
   */
  const handleClearFilters = () => {
    setActionFilter('');
    setStatusFilter('');
    setDatePreset('past_hour');
    const { startDate: newStartDate, endDate: newEndDate } =
      calculateDateRange('past_hour');
    setStartDate(newStartDate);
    setEndDate(newEndDate);
    setShowCustomDateInputs(false);
    dispatch(clearFilters());
    setPage(1);
  };

  /**
   * Handle search functionality
   *
   * When a search term is entered, this dispatches a search action
   * to find logs matching the term.
   *
   * @param {string} searchTerm - The search query entered by the user
   */
  const handleSearch = (searchTerm) => {
    if (searchTerm.trim()) {
      dispatch(searchAuditLogs(searchTerm));
    }
  };

  /**
   * View log details
   *
   * When a user clicks to view details of a log entry, this function
   * stores the selected log in state and opens the detail dialog.
   *
   * @param {Object} log - The log entry to display details for
   */
  const handleViewLogDetails = (log) => {
    setSelectedLog(log);
    setDialogOpen(true);
  };

  /**
   * Close log details dialog
   *
   * This simply closes the log details modal.
   */
  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  /**
   * Refresh logs
   *
   * Re-fetches the current page of logs with the current filters.
   * This is useful when you want to see if any new logs have been added.
   */
  const handleRefresh = () => {
    const dateRange = calculateDateRange(datePreset);

    dispatch(
      fetchAuditLogs({
        page,
        limit,
        action: actionFilter,
        status: statusFilter,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })
    );
  };

  /**
   * Get status color for badges
   *
   * Determines the appropriate CSS class for status badges based on
   * the status value (success, failed, pending).
   *
   * @param {string} status - The status value
   * @returns {string} CSS class string for the badge
   */
  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  /**
   * Render metadata for log details
   *
   * Converts the metadata object into a readable format for display.
   * Handles different types of metadata including nested objects and arrays.
   *
   * @param {Object|null} metadata - The metadata object from the audit log
   * @returns {JSX.Element|string} Formatted representation of the metadata
   */
  const renderMetadata = (metadata) => {
    // Handle null or undefined metadata
    if (!metadata) {
      return 'No additional information available';
    }

    try {
      // If metadata is a string, try to parse it as JSON
      const metadataObj =
        typeof metadata === 'string' ? JSON.parse(metadata) : metadata;

      // Format the metadata as pre-formatted JSON for readability
      return (
        <pre className="whitespace-pre-wrap break-words">
          {JSON.stringify(metadataObj, null, 2)}
        </pre>
      );
    } catch (err) {
      // If parsing fails, just display as string
      return String(metadata);
    }
  };

  /**
   * Handle delete logs
   *
   * Deletes all audit logs within the selected date range.
   * Shows success or error toast notifications based on the result.
   */
  const handleDeleteLogs = () => {
    const dateRange = calculateDateRange(datePreset);

    // Log the date range being used for deletion
    console.log('Deleting logs with date range:', dateRange);

    // Dispatch the delete action and handle the result
    dispatch(deleteAuditLogsByDateRange(dateRange))
      .unwrap() // This converts the promise to
      .then((result) => {
        // Show success message
        toast.success(`Success! ${result.count} audit logs were deleted.`);

        // Refresh the logs display
        handleRefresh();
      })
      .catch((error) => {
        // Show error message
        toast.error(`Error deleting logs: ${error.message || 'Unknown error'}`);
      })
      .finally(() => {
        // Close the delete confirmation dialog
        setDeleteModalOpen(false);
      });
  };

  /**
   * The component's render method
   *
   * This renders the entire AuditLogsPage, including:
   * - Header
   * - TableFilters for filtering and searching
   * - Error message (if any)
   * - Results count
   * - DataTable for displaying the logs
   * - Pagination controls
   * - Log details modal
   * - Delete confirmation modal
   */
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center text-sm text-accent-purple font-bold hover:text-accent-blue hover:underline"
            title="Back to Dashboard"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-2xl font-bold text-[#F8FAFC]">Audit Logs</h1>
        </div>
      </div>

      {/* Filters Section - Using the reusable TableFilters component */}
      <TableFilters
        filterConfig={auditLogFilterConfig}
        filterState={filterState}
        onFilterChange={handleFilterChange}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
        onSearch={handleSearch}
        actionButtons={
          <>
            <button
              onClick={handleRefresh}
              className="p-2 border border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 rounded-md"
              title="Refresh"
            >
              <RefreshCw size={18} />
            </button>
            <button
              onClick={() => setDeleteModalOpen(true)}
              className="p-2 border border-red-300 hover:bg-red-100 dark:border-red-600 dark:hover:bg-red-700 rounded-md"
              title="Delete Logs"
            >
              <Trash2 size={18} className="text-red-600 dark:text-red-400" />
            </button>
          </>
        }
      />

      {/* Error Message - Shown if there was an error fetching logs */}
      {error && (
        <div
          className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded"
          role="alert"
        >
          <p>{error.message || 'Failed to fetch audit logs'}</p>
        </div>
      )}

      {/* Results Count - Shows how many logs are being displayed */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {`Showing ${logs.length} of ${totalCount} total logs`}
        </p>
      </div>

      {/* Logs Table - Using our reusable DataTable component */}
      <DataTable
        columns={auditLogColumns}
        data={logs}
        isLoading={loading}
        keyField="_id"
        emptyMessage="No audit logs found"
        renderRowActions={renderRowActions}
        ariaLabel="Audit logs table"
      />

      {/* Pagination Controls */}
      {totalCount > 0 && (
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(totalCount / limit)}
          onPageChange={setPage}
          showJumpControls={true}
          jumpSize={10}
          ariaLabel="Audit logs pagination"
        />
      )}

      {/* Log Detail Modal - Shown when viewing details of a log */}
      {dialogOpen && selectedLog && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-labelledby="log-details-title"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-start">
              <div>
                <h2
                  id="log-details-title"
                  className="text-xl font-semibold text-gray-900 dark:text-white"
                >
                  Audit Log Details
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(selectedLog.timestamp).toLocaleString()}
                </p>
              </div>
              <button
                onClick={handleCloseDialog}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                aria-label="Close dialog"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    User
                  </h3>
                  <p className="text-gray-900 dark:text-white">
                    {selectedLog.userId
                      ? `${selectedLog.userId.name} (${selectedLog.userId.email})`
                      : 'Anonymous'}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Action
                  </h3>
                  <p className="text-gray-900 dark:text-white">
                    {selectedLog.action.replace(/_/g, ' ')}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Status
                  </h3>
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                      selectedLog.status
                    )}`}
                  >
                    {selectedLog.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    IP Address
                  </h3>
                  <p className="text-gray-900 dark:text-white">
                    {selectedLog.ipAddress}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    User Agent
                  </h3>
                  <p className="text-gray-900 dark:text-white break-words">
                    {selectedLog.userAgent}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Metadata
                  </h3>
                  <div className="bg-gray-100 dark:bg-gray-700 rounded p-3 text-gray-900 dark:text-white text-sm">
                    {renderMetadata(selectedLog.metadata)}
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={handleCloseDialog}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md text-gray-900 dark:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-labelledby="delete-confirmation-title"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-start">
              <div>
                <h2
                  id="delete-confirmation-title"
                  className="text-xl font-semibold text-gray-900 dark:text-white"
                >
                  Confirm Delete
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Are you sure you want to delete the audit logs for the
                  selected date range?
                </p>
              </div>
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                aria-label="Close dialog"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center text-yellow-600 dark:text-yellow-400 mb-4">
                <AlertTriangle size={24} className="mr-2" />
                <p className="text-sm">This action cannot be undone.</p>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setDeleteModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md text-gray-900 dark:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteLogs}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogsPage;
