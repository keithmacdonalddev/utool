/**
 * ReportList Component
 *
 * Comprehensive interface for managing generated reports with advanced
 * search, filtering, pagination, and quick actions. Provides overview
 * statistics and professional table interface for report management.
 *
 * Part of Milestone 6: Reporting & Audit
 *
 * Features:
 * - Report management dashboard with statistics
 * - Advanced search and filtering
 * - Professional table interface with sorting
 * - Quick actions (view, export, schedule, delete)
 * - Report status tracking and management
 * - Responsive design with professional UI
 * - Real-time updates and notifications
 * - Export history and tracking
 *
 * @param {Object} props - Component props
 * @param {Array} props.reports - List of reports
 * @param {Object} props.reportsData - Reports data with pagination
 * @param {Object} props.reportsFilter - Current filter state
 * @param {boolean} props.isLoading - Loading state
 * @param {string} props.error - Error message
 * @param {Object} props.reportStatistics - Report statistics
 * @param {Function} props.onCreateReport - Create report handler
 * @param {Function} props.onViewReport - View report handler
 * @param {Function} props.onExportReport - Export report handler
 * @param {Function} props.onScheduleReport - Schedule report handler
 * @param {Function} props.onDeleteReport - Delete report handler
 * @param {Function} props.onFilterReports - Filter reports handler
 * @param {Function} props.onSortReports - Sort reports handler
 * @param {Function} props.onChangePage - Change page handler
 * @returns {React.ReactElement} The ReportList component
 */

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Calendar,
  Trash2,
  RefreshCw,
  TrendingUp,
  Users,
  Shield,
  BarChart3,
  Clock,
  CheckCircle,
  AlertTriangle,
  X,
  ChevronDown,
  MoreVertical,
  ExternalLink,
} from 'lucide-react';

const ReportList = ({
  reports = [],
  reportsData = { data: [], pagination: {}, summary: {} },
  reportsFilter = {},
  isLoading = false,
  error = null,
  reportStatistics = null,
  onCreateReport,
  onViewReport,
  onExportReport,
  onScheduleReport,
  onDeleteReport,
  onFilterReports,
  onSortReports,
  onChangePage,
}) => {
  // ===============================================
  // STATE MANAGEMENT
  // ===============================================

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState(reportsFilter.type || 'all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedReports, setSelectedReports] = useState(new Set());
  const [expandedReport, setExpandedReport] = useState(null);

  // ===============================================
  // COMPUTED VALUES
  // ===============================================

  /**
   * Get report type icon and color
   */
  const getReportTypeInfo = (type) => {
    const typeMap = {
      user_activity: {
        icon: Users,
        color: 'text-purple-400',
        bg: 'bg-purple-500/10',
      },
      system_audit: {
        icon: Shield,
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
      },
      performance: {
        icon: TrendingUp,
        color: 'text-green-400',
        bg: 'bg-green-500/10',
      },
      compliance: {
        icon: FileText,
        color: 'text-orange-400',
        bg: 'bg-orange-500/10',
      },
      custom: {
        icon: BarChart3,
        color: 'text-brand-primary',
        bg: 'bg-brand-primary/10',
      },
    };
    return typeMap[type] || typeMap.custom;
  };

  /**
   * Get status indicator
   */
  const getStatusInfo = (status) => {
    const statusMap = {
      completed: {
        icon: CheckCircle,
        color: 'text-green-400',
        label: 'Completed',
      },
      processing: { icon: Clock, color: 'text-amber-400', label: 'Processing' },
      failed: { icon: AlertTriangle, color: 'text-red-400', label: 'Failed' },
      scheduled: { icon: Calendar, color: 'text-blue-400', label: 'Scheduled' },
    };
    return statusMap[status] || statusMap.completed;
  };

  /**
   * Format file size
   */
  const formatFileSize = (sizeInKB) => {
    if (sizeInKB < 1024) return `${sizeInKB} KB`;
    if (sizeInKB < 1024 * 1024) return `${(sizeInKB / 1024).toFixed(1)} MB`;
    return `${(sizeInKB / (1024 * 1024)).toFixed(1)} GB`;
  };

  /**
   * Format relative time
   */
  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 24 * 60)
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 7 * 24 * 60)
      return `${Math.floor(diffInMinutes / (24 * 60))}d ago`;
    return date.toLocaleDateString();
  };

  /**
   * Filter reports based on search and filters
   */
  const filteredReports = useMemo(() => {
    let filtered = reports;

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (report) =>
          report.name.toLowerCase().includes(searchLower) ||
          report.type.toLowerCase().includes(searchLower) ||
          report.createdBy.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter((report) => report.status === selectedStatus);
    }

    return filtered;
  }, [reports, searchTerm, selectedStatus]);

  // ===============================================
  // EVENT HANDLERS
  // ===============================================

  /**
   * Handle search input change
   */
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  /**
   * Handle type filter change
   */
  const handleTypeFilter = (type) => {
    setSelectedType(type);
    if (onFilterReports) {
      onFilterReports(type === 'all' ? null : type);
    }
  };

  /**
   * Handle report selection
   */
  const handleReportSelect = (reportId) => {
    setSelectedReports((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(reportId)) {
        newSet.delete(reportId);
      } else {
        newSet.add(reportId);
      }
      return newSet;
    });
  };

  /**
   * Handle select all reports
   */
  const handleSelectAll = () => {
    if (selectedReports.size === filteredReports.length) {
      setSelectedReports(new Set());
    } else {
      setSelectedReports(new Set(filteredReports.map((r) => r.id)));
    }
  };

  /**
   * Handle sort change
   */
  const handleSort = (sortBy) => {
    const currentOrder = reportsFilter.sortOrder || 'desc';
    const newOrder =
      reportsFilter.sortBy === sortBy && currentOrder === 'desc'
        ? 'asc'
        : 'desc';

    if (onSortReports) {
      onSortReports(sortBy, newOrder);
    }
  };

  // ===============================================
  // RENDER METHODS
  // ===============================================

  /**
   * Render statistics cards
   */
  const renderStatistics = () => {
    if (!reportStatistics) return null;

    const stats = [
      {
        label: 'Total Reports',
        value: reportStatistics.totalReports,
        icon: FileText,
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
      },
      {
        label: 'This Month',
        value: reportStatistics.reportsThisMonth,
        icon: TrendingUp,
        color: 'text-green-400',
        bg: 'bg-green-500/10',
      },
      {
        label: 'Scheduled',
        value: reportStatistics.scheduledReports,
        icon: Calendar,
        color: 'text-purple-400',
        bg: 'bg-purple-500/10',
      },
      {
        label: 'Total Exports',
        value: reportStatistics.totalExports,
        icon: Download,
        color: 'text-orange-400',
        bg: 'bg-orange-500/10',
      },
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-surface-elevated rounded-lg border border-border-secondary p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption text-sm">{stat.label}</p>
                  <p className="text-heading text-2xl font-bold">
                    {stat.value?.toLocaleString() || 0}
                  </p>
                </div>
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  /**
   * Render search and filters
   */
  const renderSearchAndFilters = () => (
    <div className="bg-surface-elevated rounded-lg border border-border-secondary p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-heading font-medium">Reports Management</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-200 ${
              showFilters
                ? 'bg-brand-primary text-white'
                : 'bg-surface-secondary hover:bg-surface-secondary/80 text-heading'
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>

          <button
            onClick={onCreateReport}
            className="flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-brand-primary-dark text-white rounded-lg transition-colors duration-200"
          >
            <Plus className="h-4 w-4" />
            Create Report
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted" />
        <input
          type="text"
          value={searchTerm}
          onChange={handleSearchChange}
          placeholder="Search reports by name, type, or creator..."
          className="w-full pl-10 pr-4 py-2 bg-surface-secondary border border-border-secondary rounded-lg text-heading placeholder-muted focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
        />
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border-secondary">
          {/* Type Filter */}
          <div>
            <label className="block text-heading text-sm font-medium mb-2">
              Report Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => handleTypeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-surface-secondary border border-border-secondary rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="user_activity">User Activity</option>
              <option value="system_audit">System Audit</option>
              <option value="performance">Performance</option>
              <option value="compliance">Compliance</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-heading text-sm font-medium mb-2">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-surface-secondary border border-border-secondary rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-heading text-sm font-medium mb-2">
              Date Range
            </label>
            <select className="w-full px-3 py-2 bg-surface-secondary border border-border-secondary rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent">
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );

  /**
   * Render reports table
   */
  const renderReportsTable = () => (
    <div className="bg-surface-elevated rounded-lg border border-border-secondary overflow-hidden">
      {/* Table Header */}
      <div className="px-6 py-4 border-b border-border-secondary">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={
                selectedReports.size === filteredReports.length &&
                filteredReports.length > 0
              }
              onChange={handleSelectAll}
              className="rounded border-border-secondary text-brand-primary focus:ring-brand-primary"
            />
            <span className="text-heading font-medium">
              {selectedReports.size > 0
                ? `${selectedReports.size} selected`
                : 'Reports'}
            </span>
          </div>

          {selectedReports.size > 0 && (
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-sm hover:bg-blue-500/30 transition-colors duration-200">
                <Download className="h-3 w-3" />
                Export
              </button>
              <button className="flex items-center gap-2 px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors duration-200">
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface-secondary">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-caption uppercase tracking-wider">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-1 hover:text-heading transition-colors duration-200"
                >
                  Report
                  <ChevronDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-caption uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-caption uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-caption uppercase tracking-wider">
                <button
                  onClick={() => handleSort('generatedAt')}
                  className="flex items-center gap-1 hover:text-heading transition-colors duration-200"
                >
                  Generated
                  <ChevronDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-caption uppercase tracking-wider">
                Size
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-caption uppercase tracking-wider">
                Creator
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-caption uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-secondary">
            {isLoading ? (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-brand-primary" />
                    <span className="text-heading">Loading reports...</span>
                  </div>
                </td>
              </tr>
            ) : filteredReports.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-8 w-8 text-muted" />
                    <p className="text-heading font-medium">No reports found</p>
                    <p className="text-caption text-sm">
                      {searchTerm
                        ? 'Try adjusting your search criteria'
                        : 'Create your first report to get started'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredReports.map((report) => {
                const typeInfo = getReportTypeInfo(report.type);
                const statusInfo = getStatusInfo(report.status);
                const TypeIcon = typeInfo.icon;
                const StatusIcon = statusInfo.icon;

                return (
                  <tr
                    key={report.id}
                    className="hover:bg-surface-secondary/50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedReports.has(report.id)}
                          onChange={() => handleReportSelect(report.id)}
                          className="rounded border-border-secondary text-brand-primary focus:ring-brand-primary"
                        />
                        <div className={`p-2 rounded-lg ${typeInfo.bg}`}>
                          <TypeIcon className={`h-4 w-4 ${typeInfo.color}`} />
                        </div>
                        <div>
                          <p className="text-heading font-medium">
                            {report.name}
                          </p>
                          <p className="text-caption text-sm">
                            {report.recordCount?.toLocaleString()} records
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="capitalize text-heading text-sm">
                        {report.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
                        <span className={`text-sm ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-heading text-sm">
                          {formatRelativeTime(report.generatedAt)}
                        </p>
                        <p className="text-caption text-xs">
                          {new Date(report.generatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-heading text-sm">
                        {formatFileSize(report.size)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-heading text-sm">
                        {report.createdBy}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onViewReport(report)}
                          className="p-1 text-muted hover:text-brand-primary transition-colors duration-200"
                          title="View Report"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {report.status === 'completed' && (
                          <button
                            onClick={() => onExportReport(report.id, 'pdf')}
                            className="p-1 text-muted hover:text-green-400 transition-colors duration-200"
                            title="Export Report"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        )}

                        <button
                          onClick={() =>
                            setExpandedReport(
                              expandedReport === report.id ? null : report.id
                            )
                          }
                          className="p-1 text-muted hover:text-heading transition-colors duration-200"
                          title="More Actions"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Expanded Actions */}
                      {expandedReport === report.id && (
                        <div className="absolute right-6 mt-2 w-48 bg-surface-elevated border border-border-secondary rounded-lg shadow-lg z-10">
                          <div className="py-2">
                            <button
                              onClick={() => onViewReport(report)}
                              className="flex items-center gap-2 w-full px-4 py-2 text-left text-heading hover:bg-surface-secondary transition-colors duration-200"
                            >
                              <ExternalLink className="h-4 w-4" />
                              View Details
                            </button>

                            {report.status === 'completed' && (
                              <>
                                <button
                                  onClick={() =>
                                    onExportReport(report.id, 'csv')
                                  }
                                  className="flex items-center gap-2 w-full px-4 py-2 text-left text-heading hover:bg-surface-secondary transition-colors duration-200"
                                >
                                  <Download className="h-4 w-4" />
                                  Export as CSV
                                </button>
                                <button
                                  onClick={() => onScheduleReport(report)}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-left text-heading hover:bg-surface-secondary transition-colors duration-200"
                                >
                                  <Calendar className="h-4 w-4" />
                                  Schedule
                                </button>
                              </>
                            )}

                            <button
                              onClick={() => onDeleteReport(report.id)}
                              className="flex items-center gap-2 w-full px-4 py-2 text-left text-red-400 hover:bg-red-500/10 transition-colors duration-200"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {reportsData.pagination && reportsData.pagination.totalPages > 1 && (
        <div className="px-6 py-4 border-t border-border-secondary">
          <div className="flex items-center justify-between">
            <div className="text-caption text-sm">
              Showing{' '}
              {(reportsData.pagination.page - 1) *
                reportsData.pagination.limit +
                1}{' '}
              to{' '}
              {Math.min(
                reportsData.pagination.page * reportsData.pagination.limit,
                reportsData.pagination.total
              )}{' '}
              of {reportsData.pagination.total} reports
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onChangePage(reportsData.pagination.page - 1)}
                disabled={reportsData.pagination.page === 1}
                className="px-3 py-2 bg-surface-secondary border border-border-secondary rounded-lg text-heading disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-secondary/80 transition-colors duration-200"
              >
                Previous
              </button>

              <div className="flex items-center gap-1">
                {[...Array(Math.min(5, reportsData.pagination.totalPages))].map(
                  (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => onChangePage(page)}
                        className={`px-3 py-2 rounded-lg transition-colors duration-200 ${
                          page === reportsData.pagination.page
                            ? 'bg-brand-primary text-white'
                            : 'bg-surface-secondary text-heading hover:bg-surface-secondary/80'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  }
                )}
              </div>

              <button
                onClick={() => onChangePage(reportsData.pagination.page + 1)}
                disabled={!reportsData.pagination.hasMore}
                className="px-3 py-2 bg-surface-secondary border border-border-secondary rounded-lg text-heading disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-secondary/80 transition-colors duration-200"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ===============================================
  // MAIN RENDER
  // ===============================================

  // Close expanded actions when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => setExpandedReport(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <p className="text-red-400 font-medium">Error</p>
          </div>
          <p className="text-red-400 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Statistics */}
      {renderStatistics()}

      {/* Search and Filters */}
      {renderSearchAndFilters()}

      {/* Reports Table */}
      {renderReportsTable()}
    </div>
  );
};

export default ReportList;
