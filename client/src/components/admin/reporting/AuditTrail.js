/**
 * AuditTrail Component
 *
 * Real-time audit log interface with advanced search, filtering,
 * activity timeline visualization, and comprehensive security monitoring.
 * Provides detailed tracking of user actions and system events.
 *
 * Part of Milestone 6: Reporting & Audit
 *
 * Features:
 * - Real-time audit log streaming with WebSocket support
 * - Advanced search and filtering capabilities
 * - Activity timeline with visual event representation
 * - User and system event categorization
 * - Security monitoring with threat detection
 * - Export functionality for audit reports
 * - Interactive event details with drill-down
 * - Professional security dashboard interface
 *
 * @param {Object} props - Component props
 * @param {Array} props.auditLogs - List of audit log entries
 * @param {Object} props.auditData - Audit data with pagination and summary
 * @param {Object} props.auditFilter - Current filter state
 * @param {boolean} props.isLoading - Loading state
 * @param {string} props.error - Error message
 * @param {Object} props.auditStatistics - Audit statistics
 * @param {boolean} props.isRealTime - Real-time streaming status
 * @param {Function} props.onFilterAudit - Filter audit handler
 * @param {Function} props.onExportAudit - Export audit handler
 * @param {Function} props.onViewDetails - View details handler
 * @param {Function} props.onToggleRealTime - Toggle real-time handler
 * @param {Function} props.onChangePage - Change page handler
 * @returns {React.ReactElement} The AuditTrail component
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Search,
  Filter,
  Download,
  Eye,
  Clock,
  User,
  Server,
  AlertTriangle,
  CheckCircle,
  Info,
  RefreshCw,
  Play,
  Pause,
  Calendar,
  MapPin,
  Activity,
  Database,
  Lock,
  Unlock,
  UserPlus,
  UserMinus,
  Settings,
  FileText,
  Globe,
  Wifi,
  WifiOff,
  TrendingUp,
  BarChart3,
  Users,
  ChevronDown,
  ChevronRight,
  X,
  ExternalLink,
  Copy,
  AlertCircle,
} from 'lucide-react';

const AuditTrail = ({
  auditLogs = [],
  auditData = { data: [], pagination: {}, summary: {} },
  auditFilter = {},
  isLoading = false,
  error = null,
  auditStatistics = null,
  isRealTime = false,
  onFilterAudit,
  onExportAudit,
  onViewDetails,
  onToggleRealTime,
  onChangePage,
}) => {
  // ===============================================
  // STATE MANAGEMENT
  // ===============================================

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(
    auditFilter.category || 'all'
  );
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [selectedUser, setSelectedUser] = useState('all');
  const [dateRange, setDateRange] = useState('today');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedLog, setExpandedLog] = useState(null);
  const [viewMode, setViewMode] = useState('timeline'); // timeline, table, details
  const [realtimeCount, setRealtimeCount] = useState(0);

  // ===============================================
  // COMPUTED VALUES
  // ===============================================

  /**
   * Get audit category information with icons and colors
   */
  const getCategoryInfo = (category) => {
    const categoryMap = {
      authentication: {
        icon: Lock,
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
        label: 'Authentication',
      },
      user_management: {
        icon: Users,
        color: 'text-purple-400',
        bg: 'bg-purple-500/10',
        label: 'User Management',
      },
      data_access: {
        icon: Database,
        color: 'text-green-400',
        bg: 'bg-green-500/10',
        label: 'Data Access',
      },
      system_config: {
        icon: Settings,
        color: 'text-orange-400',
        bg: 'bg-orange-500/10',
        label: 'System Config',
      },
      security: {
        icon: Shield,
        color: 'text-red-400',
        bg: 'bg-red-500/10',
        label: 'Security',
      },
      api_access: {
        icon: Globe,
        color: 'text-teal-400',
        bg: 'bg-teal-500/10',
        label: 'API Access',
      },
    };
    return categoryMap[category] || categoryMap.security;
  };

  /**
   * Get severity information with icons and colors
   */
  const getSeverityInfo = (severity) => {
    const severityMap = {
      low: { icon: Info, color: 'text-blue-400', label: 'Low' },
      medium: { icon: AlertTriangle, color: 'text-amber-400', label: 'Medium' },
      high: { icon: AlertCircle, color: 'text-orange-400', label: 'High' },
      critical: { icon: Shield, color: 'text-red-400', label: 'Critical' },
    };
    return severityMap[severity] || severityMap.low;
  };

  /**
   * Get action icon based on action type
   */
  const getActionIcon = (action) => {
    const actionMap = {
      login: Lock,
      logout: Unlock,
      create: UserPlus,
      update: Settings,
      delete: UserMinus,
      view: Eye,
      export: Download,
      access: Database,
      error: AlertTriangle,
      system: Server,
    };

    // Check for action keywords
    const actionLower = action.toLowerCase();
    for (const [key, icon] of Object.entries(actionMap)) {
      if (actionLower.includes(key)) {
        return icon;
      }
    }

    return Activity; // Default icon
  };

  /**
   * Format relative time for timeline
   */
  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 24 * 60)
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 7 * 24 * 60)
      return `${Math.floor(diffInMinutes / (24 * 60))}d ago`;
    return date.toLocaleDateString();
  };

  /**
   * Filter audit logs based on search and filters
   */
  const filteredLogs = useMemo(() => {
    let filtered = auditLogs;

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.action.toLowerCase().includes(searchLower) ||
          log.user.toLowerCase().includes(searchLower) ||
          log.resource?.toLowerCase().includes(searchLower) ||
          log.details?.toLowerCase().includes(searchLower)
      );
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((log) => log.category === selectedCategory);
    }

    // Apply severity filter
    if (selectedSeverity !== 'all') {
      filtered = filtered.filter((log) => log.severity === selectedSeverity);
    }

    // Apply user filter
    if (selectedUser !== 'all') {
      filtered = filtered.filter((log) => log.user === selectedUser);
    }

    return filtered;
  }, [auditLogs, searchTerm, selectedCategory, selectedSeverity, selectedUser]);

  // ===============================================
  // REAL-TIME EFFECTS
  // ===============================================

  useEffect(() => {
    if (isRealTime) {
      setRealtimeCount((prev) => prev + 1);
    }
  }, [auditLogs.length, isRealTime]);

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
   * Handle filter changes
   */
  const handleFilterChange = (filterType, value) => {
    switch (filterType) {
      case 'category':
        setSelectedCategory(value);
        if (onFilterAudit) {
          onFilterAudit({ category: value === 'all' ? null : value });
        }
        break;
      case 'severity':
        setSelectedSeverity(value);
        break;
      case 'user':
        setSelectedUser(value);
        break;
      case 'dateRange':
        setDateRange(value);
        break;
    }
  };

  /**
   * Handle log expansion
   */
  const handleLogExpand = (logId) => {
    setExpandedLog(expandedLog === logId ? null : logId);
  };

  /**
   * Copy log details to clipboard
   */
  const handleCopyLog = async (log) => {
    const logText = `${log.timestamp} - ${log.action} by ${log.user}
Category: ${log.category}
Severity: ${log.severity}
Resource: ${log.resource}
IP: ${log.ip_address}
Details: ${log.details}`;

    try {
      await navigator.clipboard.writeText(logText);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy log:', err);
    }
  };

  // ===============================================
  // RENDER METHODS
  // ===============================================

  /**
   * Render statistics dashboard
   */
  const renderStatistics = () => {
    if (!auditStatistics) return null;

    const stats = [
      {
        label: 'Total Events',
        value: auditStatistics.totalEvents,
        icon: Activity,
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
      },
      {
        label: 'Security Events',
        value: auditStatistics.securityEvents,
        icon: Shield,
        color: 'text-red-400',
        bg: 'bg-red-500/10',
      },
      {
        label: 'Active Users',
        value: auditStatistics.activeUsers,
        icon: Users,
        color: 'text-green-400',
        bg: 'bg-green-500/10',
      },
      {
        label: 'Failed Logins',
        value: auditStatistics.failedLogins,
        icon: AlertTriangle,
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
   * Render real-time controls and filters
   */
  const renderControlsAndFilters = () => (
    <div className="bg-surface-elevated rounded-lg border border-border-secondary p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h3 className="text-heading font-medium">Audit Trail</h3>

          {/* Real-time Status */}
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleRealTime}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-200 ${
                isRealTime
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-surface-secondary hover:bg-surface-secondary/80 text-heading'
              }`}
            >
              {isRealTime ? (
                <>
                  <Wifi className="h-4 w-4" />
                  Live
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4" />
                  Paused
                </>
              )}
            </button>

            {isRealTime && (
              <span className="text-caption text-sm">
                {realtimeCount} updates
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-surface-secondary rounded-lg p-1">
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1 rounded text-sm transition-colors duration-200 ${
                viewMode === 'timeline'
                  ? 'bg-brand-primary text-white'
                  : 'text-heading hover:bg-surface-secondary/80'
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded text-sm transition-colors duration-200 ${
                viewMode === 'table'
                  ? 'bg-brand-primary text-white'
                  : 'text-heading hover:bg-surface-secondary/80'
              }`}
            >
              Table
            </button>
          </div>

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
            onClick={() => onExportAudit(filteredLogs)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200"
          >
            <Download className="h-4 w-4" />
            Export
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
          placeholder="Search audit logs by action, user, resource, or details..."
          className="w-full pl-10 pr-4 py-2 bg-surface-secondary border border-border-secondary rounded-lg text-heading placeholder-muted focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
        />
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-border-secondary">
          {/* Category Filter */}
          <div>
            <label className="block text-heading text-sm font-medium mb-2">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="w-full px-3 py-2 bg-surface-secondary border border-border-secondary rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            >
              <option value="all">All Categories</option>
              <option value="authentication">Authentication</option>
              <option value="user_management">User Management</option>
              <option value="data_access">Data Access</option>
              <option value="system_config">System Config</option>
              <option value="security">Security</option>
              <option value="api_access">API Access</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div>
            <label className="block text-heading text-sm font-medium mb-2">
              Severity
            </label>
            <select
              value={selectedSeverity}
              onChange={(e) => handleFilterChange('severity', e.target.value)}
              className="w-full px-3 py-2 bg-surface-secondary border border-border-secondary rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            >
              <option value="all">All Severities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* User Filter */}
          <div>
            <label className="block text-heading text-sm font-medium mb-2">
              User
            </label>
            <select
              value={selectedUser}
              onChange={(e) => handleFilterChange('user', e.target.value)}
              className="w-full px-3 py-2 bg-surface-secondary border border-border-secondary rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            >
              <option value="all">All Users</option>
              <option value="system">System</option>
              {/* Dynamic user options would be populated from props */}
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-heading text-sm font-medium mb-2">
              Date Range
            </label>
            <select
              value={dateRange}
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
              className="w-full px-3 py-2 bg-surface-secondary border border-border-secondary rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );

  /**
   * Render timeline view
   */
  const renderTimelineView = () => (
    <div className="bg-surface-elevated rounded-lg border border-border-secondary overflow-hidden">
      <div className="px-6 py-4 border-b border-border-secondary">
        <h3 className="text-heading font-medium">Activity Timeline</h3>
        <p className="text-caption text-sm">
          Showing {filteredLogs.length} of {auditLogs.length} events
        </p>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-brand-primary" />
              <span className="text-heading">Loading audit logs...</span>
            </div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Activity className="h-8 w-8 text-muted" />
            <p className="text-heading font-medium mt-2">No audit logs found</p>
            <p className="text-caption text-sm">
              {searchTerm
                ? 'Try adjusting your search criteria'
                : 'No activity to display for the selected filters'}
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {filteredLogs.map((log, index) => {
              const categoryInfo = getCategoryInfo(log.category);
              const severityInfo = getSeverityInfo(log.severity);
              const ActionIcon = getActionIcon(log.action);
              const CategoryIcon = categoryInfo.icon;
              const SeverityIcon = severityInfo.icon;

              return (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-4 border border-border-secondary rounded-lg hover:bg-surface-secondary/30 transition-colors duration-200"
                >
                  {/* Timeline Line */}
                  <div className="flex flex-col items-center">
                    <div className={`p-2 rounded-lg ${categoryInfo.bg}`}>
                      <ActionIcon className={`h-4 w-4 ${categoryInfo.color}`} />
                    </div>
                    {index < filteredLogs.length - 1 && (
                      <div className="w-px h-8 bg-border-secondary mt-2" />
                    )}
                  </div>

                  {/* Event Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-heading font-medium">
                            {log.action}
                          </p>
                          <div className="flex items-center gap-1">
                            <SeverityIcon
                              className={`h-3 w-3 ${severityInfo.color}`}
                            />
                            <span className={`text-xs ${severityInfo.color}`}>
                              {severityInfo.label}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-caption">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {log.user}
                          </span>
                          <span className="flex items-center gap-1">
                            <CategoryIcon className="h-3 w-3" />
                            {categoryInfo.label}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {log.ip_address}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatRelativeTime(log.timestamp)}
                          </span>
                        </div>

                        {log.resource && (
                          <p className="text-caption text-sm mt-1">
                            Resource: {log.resource}
                          </p>
                        )}

                        {log.details && (
                          <p className="text-heading text-sm mt-1 truncate">
                            {log.details}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 ml-4">
                        <button
                          onClick={() => handleCopyLog(log)}
                          className="p-1 text-muted hover:text-heading transition-colors duration-200"
                          title="Copy Log"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleLogExpand(log.id)}
                          className="p-1 text-muted hover:text-heading transition-colors duration-200"
                          title="View Details"
                        >
                          {expandedLog === log.id ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                        </button>
                        <button
                          onClick={() => onViewDetails && onViewDetails(log)}
                          className="p-1 text-muted hover:text-brand-primary transition-colors duration-200"
                          title="Full Details"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedLog === log.id && (
                      <div className="mt-3 p-3 bg-surface-secondary rounded-lg border border-border-secondary">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-caption">Timestamp:</p>
                            <p className="text-heading font-mono">
                              {new Date(log.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-caption">Session ID:</p>
                            <p className="text-heading font-mono">
                              {log.sessionId || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-caption">User Agent:</p>
                            <p className="text-heading truncate">
                              {log.userAgent || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-caption">Request ID:</p>
                            <p className="text-heading font-mono">
                              {log.requestId || 'N/A'}
                            </p>
                          </div>
                        </div>

                        {log.metadata && (
                          <div className="mt-3">
                            <p className="text-caption mb-1">Metadata:</p>
                            <pre className="text-heading text-xs bg-surface-primary p-2 rounded border border-border-secondary overflow-x-auto">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  /**
   * Render table view
   */
  const renderTableView = () => (
    <div className="bg-surface-elevated rounded-lg border border-border-secondary overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface-secondary">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-caption uppercase tracking-wider">
                Timestamp
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-caption uppercase tracking-wider">
                Action
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-caption uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-caption uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-caption uppercase tracking-wider">
                Severity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-caption uppercase tracking-wider">
                IP Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-caption uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-secondary">
            {filteredLogs.map((log) => {
              const categoryInfo = getCategoryInfo(log.category);
              const severityInfo = getSeverityInfo(log.severity);
              const CategoryIcon = categoryInfo.icon;
              const SeverityIcon = severityInfo.icon;

              return (
                <tr
                  key={log.id}
                  className="hover:bg-surface-secondary/50 transition-colors duration-150"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="text-heading text-sm">
                        {formatRelativeTime(log.timestamp)}
                      </p>
                      <p className="text-caption text-xs">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`p-1 rounded ${categoryInfo.bg}`}>
                        <CategoryIcon
                          className={`h-3 w-3 ${categoryInfo.color}`}
                        />
                      </div>
                      <span className="text-heading text-sm">{log.action}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-heading text-sm">{log.user}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-heading text-sm capitalize">
                      {categoryInfo.label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <SeverityIcon
                        className={`h-4 w-4 ${severityInfo.color}`}
                      />
                      <span className={`text-sm ${severityInfo.color}`}>
                        {severityInfo.label}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-heading text-sm font-mono">
                      {log.ip_address}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onViewDetails && onViewDetails(log)}
                        className="p-1 text-muted hover:text-brand-primary transition-colors duration-200"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleCopyLog(log)}
                        className="p-1 text-muted hover:text-heading transition-colors duration-200"
                        title="Copy Log"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ===============================================
  // MAIN RENDER
  // ===============================================

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

      {/* Controls and Filters */}
      {renderControlsAndFilters()}

      {/* Audit Trail Content */}
      {viewMode === 'timeline' ? renderTimelineView() : renderTableView()}
    </div>
  );
};

export default AuditTrail;
