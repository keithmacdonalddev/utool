import React, { useState } from 'react';
import {
  Settings2,
  Database,
  HardDrive,
  RotateCcw,
  Archive,
  Trash2,
  Zap,
  Clock,
  Shield,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  RefreshCw,
  FileText,
  Filter,
  Calendar,
  Info,
  Play,
  Pause,
  X,
} from 'lucide-react';

/**
 * MaintenanceToolsPanel Component
 *
 * Comprehensive system maintenance interface providing administrators with
 * powerful tools for data cleanup, cache management, archiving, and system
 * optimization. Features safety checks, progress tracking, and detailed
 * system statistics.
 *
 * Part of Milestone 4: Batch Operations & User Management
 *
 * @param {Object} props - Component props
 * @param {Object} props.maintenanceOperations - Maintenance operation functions
 * @param {Object} props.systemStats - Current system statistics
 * @param {Array} props.activeOperations - Currently running operations
 * @param {Function} props.onCancelOperation - Cancel operation function
 * @param {boolean} props.loading - Loading state
 * @returns {React.ReactElement} The MaintenanceToolsPanel component
 */
const MaintenanceToolsPanel = ({
  maintenanceOperations = {},
  systemStats = null,
  activeOperations = [],
  onCancelOperation,
  loading = false,
}) => {
  // Modal states for different maintenance operations
  const [showDataCleanupModal, setShowDataCleanupModal] = useState(false);
  const [showCacheClearModal, setShowCacheClearModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);

  // Form states for cleanup operations
  const [cleanupOptions, setCleanupOptions] = useState({
    cleanupSessions: true,
    cleanupTempFiles: true,
    cleanupOldLogs: true,
    olderThanDays: 30,
  });

  const [cacheOptions, setCacheOptions] = useState({
    clearUserCache: true,
    clearSessionCache: true,
    clearApplicationCache: true,
  });

  const [archiveOptions, setArchiveOptions] = useState({
    olderThanMonths: 12,
    includeInactiveUsers: true,
    includeOldProjects: true,
    includeOldNotes: true,
  });

  // Operation loading states
  const [operationLoading, setOperationLoading] = useState({});

  /**
   * Handle data cleanup operation
   */
  const handleDataCleanup = async () => {
    setOperationLoading({ ...operationLoading, cleanup: true });

    try {
      await maintenanceOperations.cleanupOrphanedData(cleanupOptions);
      setShowDataCleanupModal(false);
    } catch (error) {
      console.error('Data cleanup failed:', error);
    } finally {
      setOperationLoading({ ...operationLoading, cleanup: false });
    }
  };

  /**
   * Handle cache clearing operation
   */
  const handleCacheClear = async () => {
    setOperationLoading({ ...operationLoading, cache: true });

    try {
      await maintenanceOperations.clearCaches(cacheOptions);
      setShowCacheClearModal(false);
    } catch (error) {
      console.error('Cache clear failed:', error);
    } finally {
      setOperationLoading({ ...operationLoading, cache: false });
    }
  };

  /**
   * Handle data archiving operation
   */
  const handleArchive = async () => {
    setOperationLoading({ ...operationLoading, archive: true });

    try {
      await maintenanceOperations.archiveOldData(archiveOptions);
      setShowArchiveModal(false);
    } catch (error) {
      console.error('Data archiving failed:', error);
    } finally {
      setOperationLoading({ ...operationLoading, archive: false });
    }
  };

  /**
   * Format file size for display
   */
  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  };

  /**
   * Format number with commas
   */
  const formatNumber = (num) => {
    return num ? num.toLocaleString() : '0';
  };

  /**
   * Get operation status icon
   */
  const getOperationStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} className="text-green-400" />;
      case 'in_progress':
        return <Clock size={16} className="text-blue-400 animate-spin" />;
      case 'failed':
        return <AlertTriangle size={16} className="text-red-400" />;
      case 'cancelled':
        return <X size={16} className="text-gray-400" />;
      case 'partial_success':
        return <AlertTriangle size={16} className="text-yellow-400" />;
      default:
        return <Clock size={16} className="text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Users Summary */}
        <div className="bg-surface-elevated p-4 rounded-lg border border-border-secondary">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-heading text-sm font-medium">Users</h3>
            <Database size={16} className="text-blue-400" />
          </div>
          <div className="space-y-1">
            <div className="text-heading text-lg font-semibold">
              {formatNumber(systemStats?.users?.total)}
            </div>
            <div className="text-caption text-xs">
              {formatNumber(systemStats?.users?.active)} active •{' '}
              {formatNumber(systemStats?.users?.inactive)} inactive
            </div>
          </div>
        </div>

        {/* Data Summary */}
        <div className="bg-surface-elevated p-4 rounded-lg border border-border-secondary">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-heading text-sm font-medium">Data</h3>
            <FileText size={16} className="text-green-400" />
          </div>
          <div className="space-y-1">
            <div className="text-heading text-lg font-semibold">
              {formatNumber(
                systemStats?.data?.totalProjects +
                  systemStats?.data?.totalNotes +
                  systemStats?.data?.totalTasks
              )}
            </div>
            <div className="text-caption text-xs">
              {formatNumber(systemStats?.data?.orphanedFiles)} orphaned files
            </div>
          </div>
        </div>

        {/* Storage Summary */}
        <div className="bg-surface-elevated p-4 rounded-lg border border-border-secondary">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-heading text-sm font-medium">Storage</h3>
            <HardDrive size={16} className="text-purple-400" />
          </div>
          <div className="space-y-1">
            <div className="text-heading text-lg font-semibold">
              {systemStats?.storage?.totalSize}
            </div>
            <div className="text-caption text-xs">
              {systemStats?.storage?.cacheSize} cache •{' '}
              {systemStats?.storage?.tempSize} temp
            </div>
          </div>
        </div>

        {/* Performance Summary */}
        <div className="bg-surface-elevated p-4 rounded-lg border border-border-secondary">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-heading text-sm font-medium">Performance</h3>
            <Zap size={16} className="text-yellow-400" />
          </div>
          <div className="space-y-1">
            <div className="text-heading text-lg font-semibold">
              {systemStats?.performance?.averageResponseTime}
            </div>
            <div className="text-caption text-xs">
              {systemStats?.performance?.cacheHitRatio} cache hit ratio
            </div>
          </div>
        </div>
      </div>

      {/* Maintenance Tools Grid */}
      <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-heading text-xl font-semibold">
              Maintenance Tools
            </h2>
            <p className="text-caption text-sm mt-1">
              System maintenance and optimization utilities
            </p>
          </div>
          <button
            onClick={() => setShowStatsModal(true)}
            className="flex items-center px-3 py-2 bg-surface-secondary hover:bg-surface-secondary/80 text-heading rounded-lg transition-colors duration-200"
          >
            <BarChart3 size={16} className="mr-2" />
            View Details
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Data Cleanup Tool */}
          <div className="p-4 bg-surface-secondary rounded-lg border border-border-primary">
            <div className="flex items-center mb-3">
              <Trash2 size={20} className="text-red-400 mr-3" />
              <div>
                <h3 className="text-heading text-sm font-semibold">
                  Data Cleanup
                </h3>
                <p className="text-caption text-xs">
                  Remove orphaned data and old files
                </p>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-xs">
                <span className="text-caption">Orphaned Files:</span>
                <span className="text-heading">
                  {systemStats?.data?.orphanedFiles || 0}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-caption">Old Sessions:</span>
                <span className="text-heading">
                  {systemStats?.data?.oldSessions || 0}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-caption">Temp Files:</span>
                <span className="text-heading">
                  {systemStats?.data?.tempFiles || 0}
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowDataCleanupModal(true)}
              className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 py-2 rounded-lg transition-colors duration-200 text-sm font-medium"
            >
              Start Cleanup
            </button>
          </div>

          {/* Cache Management Tool */}
          <div className="p-4 bg-surface-secondary rounded-lg border border-border-primary">
            <div className="flex items-center mb-3">
              <RotateCcw size={20} className="text-blue-400 mr-3" />
              <div>
                <h3 className="text-heading text-sm font-semibold">
                  Cache Management
                </h3>
                <p className="text-caption text-xs">Clear application caches</p>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-xs">
                <span className="text-caption">Cache Size:</span>
                <span className="text-heading">
                  {systemStats?.storage?.cacheSize}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-caption">Hit Ratio:</span>
                <span className="text-heading">
                  {systemStats?.performance?.cacheHitRatio}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-caption">Connections:</span>
                <span className="text-heading">
                  {systemStats?.performance?.activeConnections}
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowCacheClearModal(true)}
              className="w-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 py-2 rounded-lg transition-colors duration-200 text-sm font-medium"
            >
              Clear Caches
            </button>
          </div>

          {/* Data Archiving Tool */}
          <div className="p-4 bg-surface-secondary rounded-lg border border-border-primary">
            <div className="flex items-center mb-3">
              <Archive size={20} className="text-purple-400 mr-3" />
              <div>
                <h3 className="text-heading text-sm font-semibold">
                  Data Archiving
                </h3>
                <p className="text-caption text-xs">
                  Archive old data for optimization
                </p>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-xs">
                <span className="text-caption">Inactive Users:</span>
                <span className="text-heading">
                  {systemStats?.users?.inactive || 0}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-caption">Total Projects:</span>
                <span className="text-heading">
                  {formatNumber(systemStats?.data?.totalProjects)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-caption">Total Notes:</span>
                <span className="text-heading">
                  {formatNumber(systemStats?.data?.totalNotes)}
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowArchiveModal(true)}
              className="w-full bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 py-2 rounded-lg transition-colors duration-200 text-sm font-medium"
            >
              Start Archive
            </button>
          </div>
        </div>
      </div>

      {/* Active Maintenance Operations */}
      {activeOperations.filter((op) =>
        ['dataCleanup', 'cacheClear', 'archiveOldData'].includes(op.type)
      ).length > 0 && (
        <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6">
          <h3 className="text-heading text-lg font-semibold mb-4">
            Active Maintenance Operations
          </h3>

          <div className="space-y-3">
            {activeOperations
              .filter((op) =>
                ['dataCleanup', 'cacheClear', 'archiveOldData'].includes(
                  op.type
                )
              )
              .map((operation) => (
                <div
                  key={operation.operationId}
                  className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {getOperationStatusIcon(operation.status)}
                    <div>
                      <div className="text-heading text-sm font-medium">
                        {operation.type === 'dataCleanup' && 'Data Cleanup'}
                        {operation.type === 'cacheClear' && 'Cache Clear'}
                        {operation.type === 'archiveOldData' &&
                          'Data Archiving'}
                      </div>
                      <div className="text-caption text-xs">
                        {operation.processedItems || 0} of{' '}
                        {operation.totalItems || 0} items processed
                        {operation.estimatedTimeRemaining && (
                          <span className="ml-2">
                            •{' '}
                            {Math.round(
                              operation.estimatedTimeRemaining / 1000
                            )}
                            s remaining
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* Progress Bar */}
                    <div className="w-32 bg-surface-primary rounded-full h-2">
                      <div
                        className="bg-brand-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${operation.progress || 0}%` }}
                      />
                    </div>

                    <span className="text-caption text-xs font-medium w-10 text-right">
                      {operation.progress || 0}%
                    </span>

                    {/* Cancel Button */}
                    {operation.status === 'in_progress' && (
                      <button
                        onClick={() => onCancelOperation(operation.operationId)}
                        className="text-red-400 hover:text-red-300 transition-colors duration-200"
                        title="Cancel Operation"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Data Cleanup Modal */}
      {showDataCleanupModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <Trash2 className="mr-2 h-5 w-5 text-red-400" />
              <h3 className="text-heading text-lg font-semibold">
                Data Cleanup
              </h3>
            </div>

            <p className="text-caption mb-4">
              Select the types of data to clean up. This will remove orphaned
              and temporary files.
            </p>

            <div className="space-y-3 mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={cleanupOptions.cleanupSessions}
                  onChange={(e) =>
                    setCleanupOptions({
                      ...cleanupOptions,
                      cleanupSessions: e.target.checked,
                    })
                  }
                  className="mr-2"
                />
                <span className="text-heading text-sm">
                  Clean up old sessions
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={cleanupOptions.cleanupTempFiles}
                  onChange={(e) =>
                    setCleanupOptions({
                      ...cleanupOptions,
                      cleanupTempFiles: e.target.checked,
                    })
                  }
                  className="mr-2"
                />
                <span className="text-heading text-sm">
                  Remove temporary files
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={cleanupOptions.cleanupOldLogs}
                  onChange={(e) =>
                    setCleanupOptions({
                      ...cleanupOptions,
                      cleanupOldLogs: e.target.checked,
                    })
                  }
                  className="mr-2"
                />
                <span className="text-heading text-sm">
                  Clean up old log files
                </span>
              </label>

              <div>
                <label className="block text-heading text-sm font-medium mb-2">
                  Clean items older than (days)
                </label>
                <input
                  type="number"
                  value={cleanupOptions.olderThanDays}
                  onChange={(e) =>
                    setCleanupOptions({
                      ...cleanupOptions,
                      olderThanDays: parseInt(e.target.value) || 30,
                    })
                  }
                  className="w-full px-3 py-2 bg-surface-secondary border border-border-secondary rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  min="1"
                  max="365"
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleDataCleanup}
                disabled={operationLoading.cleanup}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {operationLoading.cleanup ? 'Starting...' : 'Start Cleanup'}
              </button>
              <button
                onClick={() => setShowDataCleanupModal(false)}
                className="flex-1 bg-surface-secondary hover:bg-surface-secondary/80 text-heading px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cache Clear Modal */}
      {showCacheClearModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <RotateCcw className="mr-2 h-5 w-5 text-blue-400" />
              <h3 className="text-heading text-lg font-semibold">
                Clear Caches
              </h3>
            </div>

            <p className="text-caption mb-4">
              Select which caches to clear. This will improve performance but
              may temporarily slow down the application.
            </p>

            <div className="space-y-3 mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={cacheOptions.clearUserCache}
                  onChange={(e) =>
                    setCacheOptions({
                      ...cacheOptions,
                      clearUserCache: e.target.checked,
                    })
                  }
                  className="mr-2"
                />
                <span className="text-heading text-sm">
                  User cache (2.4 MB)
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={cacheOptions.clearSessionCache}
                  onChange={(e) =>
                    setCacheOptions({
                      ...cacheOptions,
                      clearSessionCache: e.target.checked,
                    })
                  }
                  className="mr-2"
                />
                <span className="text-heading text-sm">
                  Session cache (1.8 MB)
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={cacheOptions.clearApplicationCache}
                  onChange={(e) =>
                    setCacheOptions({
                      ...cacheOptions,
                      clearApplicationCache: e.target.checked,
                    })
                  }
                  className="mr-2"
                />
                <span className="text-heading text-sm">
                  Application cache (5.2 MB)
                </span>
              </label>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleCacheClear}
                disabled={operationLoading.cache}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {operationLoading.cache ? 'Clearing...' : 'Clear Caches'}
              </button>
              <button
                onClick={() => setShowCacheClearModal(false)}
                className="flex-1 bg-surface-secondary hover:bg-surface-secondary/80 text-heading px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <Archive className="mr-2 h-5 w-5 text-purple-400" />
              <h3 className="text-heading text-lg font-semibold">
                Archive Old Data
              </h3>
            </div>

            <p className="text-caption mb-4">
              Archive old data to improve system performance. Archived data can
              be restored if needed.
            </p>

            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-heading text-sm font-medium mb-2">
                  Archive data older than (months)
                </label>
                <input
                  type="number"
                  value={archiveOptions.olderThanMonths}
                  onChange={(e) =>
                    setArchiveOptions({
                      ...archiveOptions,
                      olderThanMonths: parseInt(e.target.value) || 12,
                    })
                  }
                  className="w-full px-3 py-2 bg-surface-secondary border border-border-secondary rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  min="1"
                  max="60"
                />
              </div>

              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={archiveOptions.includeInactiveUsers}
                    onChange={(e) =>
                      setArchiveOptions({
                        ...archiveOptions,
                        includeInactiveUsers: e.target.checked,
                      })
                    }
                    className="mr-2"
                  />
                  <span className="text-heading text-sm">
                    Include inactive users
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={archiveOptions.includeOldProjects}
                    onChange={(e) =>
                      setArchiveOptions({
                        ...archiveOptions,
                        includeOldProjects: e.target.checked,
                      })
                    }
                    className="mr-2"
                  />
                  <span className="text-heading text-sm">
                    Include old projects
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={archiveOptions.includeOldNotes}
                    onChange={(e) =>
                      setArchiveOptions({
                        ...archiveOptions,
                        includeOldNotes: e.target.checked,
                      })
                    }
                    className="mr-2"
                  />
                  <span className="text-heading text-sm">
                    Include old notes
                  </span>
                </label>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleArchive}
                disabled={operationLoading.archive}
                className="flex-1 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {operationLoading.archive ? 'Starting...' : 'Start Archive'}
              </button>
              <button
                onClick={() => setShowArchiveModal(false)}
                className="flex-1 bg-surface-secondary hover:bg-surface-secondary/80 text-heading px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Stats Modal */}
      {showStatsModal && systemStats && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <BarChart3 className="mr-2 h-5 w-5 text-blue-400" />
                <h3 className="text-heading text-lg font-semibold">
                  System Statistics
                </h3>
              </div>
              <button
                onClick={() => setShowStatsModal(false)}
                className="text-caption hover:text-heading transition-colors duration-200"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Users Statistics */}
              <div className="space-y-4">
                <h4 className="text-heading font-semibold">Users</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-caption">Total Users:</span>
                    <span className="text-heading font-medium">
                      {formatNumber(systemStats.users.total)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-caption">Active Users:</span>
                    <span className="text-green-400 font-medium">
                      {formatNumber(systemStats.users.active)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-caption">Inactive Users:</span>
                    <span className="text-red-400 font-medium">
                      {formatNumber(systemStats.users.inactive)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-caption">Unverified Users:</span>
                    <span className="text-yellow-400 font-medium">
                      {formatNumber(systemStats.users.unverified)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-caption">Admin Users:</span>
                    <span className="text-purple-400 font-medium">
                      {formatNumber(systemStats.users.adminUsers)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-caption">Pro Users:</span>
                    <span className="text-blue-400 font-medium">
                      {formatNumber(systemStats.users.proUsers)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-caption">Regular Users:</span>
                    <span className="text-caption font-medium">
                      {formatNumber(systemStats.users.regularUsers)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Data Statistics */}
              <div className="space-y-4">
                <h4 className="text-heading font-semibold">Data</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-caption">Total Projects:</span>
                    <span className="text-heading font-medium">
                      {formatNumber(systemStats.data.totalProjects)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-caption">Total Notes:</span>
                    <span className="text-heading font-medium">
                      {formatNumber(systemStats.data.totalNotes)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-caption">Total Tasks:</span>
                    <span className="text-heading font-medium">
                      {formatNumber(systemStats.data.totalTasks)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-caption">
                      Knowledge Base Articles:
                    </span>
                    <span className="text-heading font-medium">
                      {formatNumber(
                        systemStats.data.totalKnowledgeBaseArticles
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-caption">Orphaned Files:</span>
                    <span className="text-red-400 font-medium">
                      {formatNumber(systemStats.data.orphanedFiles)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-caption">Old Sessions:</span>
                    <span className="text-yellow-400 font-medium">
                      {formatNumber(systemStats.data.oldSessions)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-caption">Temp Files:</span>
                    <span className="text-yellow-400 font-medium">
                      {formatNumber(systemStats.data.tempFiles)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Storage Statistics */}
              <div className="space-y-4">
                <h4 className="text-heading font-semibold">Storage</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-caption">Total Size:</span>
                    <span className="text-heading font-medium">
                      {systemStats.storage.totalSize}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-caption">User Data Size:</span>
                    <span className="text-heading font-medium">
                      {systemStats.storage.userDataSize}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-caption">System Data Size:</span>
                    <span className="text-heading font-medium">
                      {systemStats.storage.systemDataSize}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-caption">Cache Size:</span>
                    <span className="text-blue-400 font-medium">
                      {systemStats.storage.cacheSize}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-caption">Temp Size:</span>
                    <span className="text-yellow-400 font-medium">
                      {systemStats.storage.tempSize}
                    </span>
                  </div>
                </div>
              </div>

              {/* Performance Statistics */}
              <div className="space-y-4">
                <h4 className="text-heading font-semibold">Performance</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-caption">Average Response Time:</span>
                    <span className="text-heading font-medium">
                      {systemStats.performance.averageResponseTime}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-caption">Cache Hit Ratio:</span>
                    <span className="text-green-400 font-medium">
                      {systemStats.performance.cacheHitRatio}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-caption">Active Connections:</span>
                    <span className="text-heading font-medium">
                      {formatNumber(systemStats.performance.activeConnections)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-caption">Last Optimized:</span>
                    <span className="text-caption font-medium">
                      {new Date(
                        systemStats.performance.lastOptimized
                      ).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border-secondary">
              <button
                onClick={() => setShowStatsModal(false)}
                className="w-full bg-surface-secondary hover:bg-surface-secondary/80 text-heading px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceToolsPanel;
