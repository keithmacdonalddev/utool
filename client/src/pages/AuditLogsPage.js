import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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
  Search,
  X,
  RefreshCw,
  Eye,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Trash2,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'react-toastify';

/**
 * AuditLogsPage Component
 *
 * This page provides a comprehensive interface for viewing and filtering system audit logs.
 * Features include:
 * - Paginated table of audit logs
 * - Filtering by action type, status, and date range
 * - Preselectable date filters (past hour, today, etc.)
 * - Search functionality
 * - Detailed view of individual log entries
 */
const AuditLogsPage = () => {
  const dispatch = useDispatch();

  // Select audit logs state from Redux store
  const { logs, totalCount, pagination, loading, error, filters } = useSelector(
    (state) => state.auditLogs
  );

  // Local state for UI controls
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState(filters.startDate || '');
  const [endDate, setEndDate] = useState(filters.endDate || '');
  const [actionFilter, setActionFilter] = useState(filters.action || '');
  const [statusFilter, setStatusFilter] = useState(filters.status || '');
  const [datePreset, setDatePreset] = useState('past_hour'); // Default to past hour
  const [showCustomDateInputs, setShowCustomDateInputs] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Date preset options
  const datePresets = [
    { value: 'past_hour', label: 'Past Hour' },
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'this_week', label: 'This Week' },
    { value: 'last_week', label: 'Last Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'custom', label: 'Custom Range' },
  ];

  // Action types for filter dropdown
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

  // Status options for filter dropdown
  const statusOptions = ['success', 'failed', 'pending'];

  // Calculate date range based on preset
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

  // Handle date preset change
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

  // Set initial date range and trigger initial fetch on component mount
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

  // Fetch logs when component mounts or filters change
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

  // Handle apply filters button click
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

  // Clear all filters
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

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      dispatch(searchAuditLogs(searchQuery));
    }
  };

  // View log details
  const handleViewLogDetails = (log) => {
    setSelectedLog(log);
    setDialogOpen(true);
  };

  // Close log details dialog
  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  // Refresh logs
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

  // Get status color for badges
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

  // Change page
  const handlePrevPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (pagination.next) {
      setPage(page + 1);
    }
  };

  // Render metadata as a readable format
  const renderMetadata = (metadata) => {
    if (!metadata) return 'None';

    return (
      <div className="space-y-1">
        {Object.entries(metadata).map(([key, value]) => (
          <div key={key}>
            <span className="font-medium">{key}:</span>{' '}
            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
          </div>
        ))}
      </div>
    );
  };

  // Handle delete logs
  const handleDeleteLogs = () => {
    const dateRange = calculateDateRange(datePreset);
    
    // Log the date range being used for deletion
    console.log('Deleting logs with date range:', dateRange);
    
    dispatch(deleteAuditLogsByDateRange(dateRange))
      .unwrap()
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
        setDeleteModalOpen(false);
      });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Audit Logs
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          View and search system activity logs
        </p>
      </div>

      {/* Filters Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Action Type Filter */}
          <div>
            <label
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              htmlFor="action-type"
            >
              Action Type
            </label>
            <select
              id="action-type"
              className="w-full p-2 border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="">All Actions</option>
              {actionTypes.map((action) => (
                <option key={action} value={action}>
                  {action.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              htmlFor="status"
            >
              Status
            </label>
            <select
              id="status"
              className="w-full p-2 border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Preset Filter */}
          <div>
            <label
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              htmlFor="date-preset"
            >
              Date Range
            </label>
            <select
              id="date-preset"
              className="w-full p-2 border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={datePreset}
              onChange={(e) => handleDatePresetChange(e.target.value)}
            >
              {datePresets.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>

          {/* Info about current date range */}
          <div className="flex items-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <Calendar size={16} className="inline mr-1" />
              <span>
                {datePreset !== 'custom' ? (
                  <span className="font-medium">
                    {datePresets.find((p) => p.value === datePreset)?.label}
                  </span>
                ) : (
                  <span className="font-medium">
                    Custom Range: {new Date(startDate).toLocaleDateString()} to{' '}
                    {new Date(endDate).toLocaleDateString()}
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Custom Date Range Inputs - Only shown when "Custom Range" is selected */}
        {showCustomDateInputs && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
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
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

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
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between gap-4 mt-4">
          {/* Search Box */}
          <form onSubmit={handleSearch} className="flex">
            <div className="relative">
              <input
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-2 pr-8 border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={!searchQuery.trim()}
              className={`ml-2 px-4 py-2 rounded-md ${
                !searchQuery.trim()
                  ? 'bg-blue-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white`}
            >
              <Search size={18} />
            </button>
          </form>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <button
              onClick={handleApplyFilters}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
            >
              Apply Filters
            </button>
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 border border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 rounded-md"
            >
              Clear
            </button>
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
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div
          className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded"
          role="alert"
        >
          <p>{error.message || 'Failed to fetch audit logs'}</p>
        </div>
      )}

      {/* Results Count */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {`Showing ${logs.length} of ${totalCount} total logs`}
        </p>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-gray-800 overflow-auto rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Action
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                IP Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Timestamp
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center">
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
            ) : logs.length > 0 ? (
              logs.map((log) => (
                <tr
                  key={log._id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    {log.userId ? (
                      <>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {log.userId.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {log.userId.email}
                        </div>
                      </>
                    ) : (
                      'Anonymous'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {log.action.replace(/_/g, ' ')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                        log.status
                      )}`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {log.ipAddress}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleViewLogDetails(log)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-500 dark:hover:text-blue-400"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  No audit logs found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-700 dark:text-gray-400">
            Page {page} of {Math.ceil(totalCount / limit)}
          </div>
          <div className="flex space-x-2">
            {/* First Page Button */}
            <button
              onClick={() => setPage(1)}
              disabled={page <= 1}
              title="First Page"
              className={`px-3 py-1 rounded ${
                page <= 1
                  ? 'bg-gray-200 cursor-not-allowed dark:bg-gray-700'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
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

            {/* Jump Back 10 Pages Button */}
            <button
              onClick={() => setPage(Math.max(1, page - 10))}
              disabled={page <= 1}
              title="Back 10 Pages"
              className={`px-3 py-1 rounded ${
                page <= 1
                  ? 'bg-gray-200 cursor-not-allowed dark:bg-gray-700'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              -10
            </button>

            {/* Previous Page Button */}
            <button
              onClick={handlePrevPage}
              disabled={page <= 1}
              title="Previous Page"
              className={`px-3 py-1 rounded ${
                page <= 1
                  ? 'bg-gray-200 cursor-not-allowed dark:bg-gray-700'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <ChevronLeft size={16} />
            </button>

            {/* Current Page Indicator */}
            <span className="px-4 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-800 dark:text-gray-200 font-medium">
              {page}
            </span>

            {/* Next Page Button */}
            <button
              onClick={handleNextPage}
              disabled={!pagination.next}
              title="Next Page"
              className={`px-3 py-1 rounded ${
                !pagination.next
                  ? 'bg-gray-200 cursor-not-allowed dark:bg-gray-700'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <ChevronRight size={16} />
            </button>

            {/* Jump Forward 10 Pages Button */}
            <button
              onClick={() => {
                const maxPage = Math.ceil(totalCount / limit);
                setPage(Math.min(maxPage, page + 10));
              }}
              disabled={page >= Math.ceil(totalCount / limit)}
              title="Forward 10 Pages"
              className={`px-3 py-1 rounded ${
                page >= Math.ceil(totalCount / limit)
                  ? 'bg-gray-200 cursor-not-allowed dark:bg-gray-700'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              +10
            </button>

            {/* Last Page Button */}
            <button
              onClick={() => {
                const maxPage = Math.ceil(totalCount / limit);
                setPage(maxPage);
              }}
              disabled={page >= Math.ceil(totalCount / limit)}
              title="Last Page"
              className={`px-3 py-1 rounded ${
                page >= Math.ceil(totalCount / limit)
                  ? 'bg-gray-200 cursor-not-allowed dark:bg-gray-700'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
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
        </div>
      )}

      {/* Log Detail Dialog */}
      {dialogOpen && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Audit Log Details
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(selectedLog.timestamp).toLocaleString()}
                </p>
              </div>
              <button
                onClick={handleCloseDialog}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
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
