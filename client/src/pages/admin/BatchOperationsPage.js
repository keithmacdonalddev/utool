import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings2,
  Users,
  Activity,
  BarChart3,
  ChevronRight,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertTriangle,
  Zap,
  Database,
  HardDrive,
  Archive,
  Trash2,
  Download,
  Upload,
  Shield,
  TrendingUp,
  Info,
} from 'lucide-react';

import useBatchOperations from '../../hooks/useBatchOperations';
import { useUsers } from '../../hooks/useUsers';
import BatchActionsPanel from '../../components/admin/batch/BatchActionsPanel';
import MaintenanceToolsPanel from '../../components/admin/maintenance/MaintenanceToolsPanel';

/**
 * BatchOperationsPage Component
 *
 * Comprehensive admin interface for batch operations and system maintenance.
 * Provides unified access to user bulk operations, system maintenance tools,
 * and operation monitoring with real-time progress tracking.
 *
 * Part of Milestone 4: Batch Operations & User Management
 *
 * Features:
 * - User bulk operations (roles, status, verification, import/export, delete)
 * - System maintenance tools (cleanup, caching, archiving)
 * - Real-time operation progress tracking
 * - System statistics and monitoring
 * - Operation history and reporting
 *
 * @returns {React.ReactElement} The BatchOperationsPage component
 */
const BatchOperationsPage = () => {
  const navigate = useNavigate();

  // Initialize batch operations hook with configuration
  const batchOps = useBatchOperations({
    autoRefresh: true,
    refreshInterval: 5, // 5 seconds
    enableNotifications: true,
  });

  // Get users data for batch operations context
  const {
    users,
    loading: usersLoading,
    error: usersError,
    refetch: refetchUsers,
  } = useUsers();

  // Page state management
  const [activeTab, setActiveTab] = useState('user-operations'); // 'user-operations' | 'maintenance' | 'monitoring'
  const [pageLoading, setPageLoading] = useState(true);

  // Initialize page data
  useEffect(() => {
    const initializePage = async () => {
      setPageLoading(true);
      try {
        // Fetch initial data
        await Promise.all([
          batchOps.fetchActiveOperations(),
          batchOps.fetchSystemStats(),
          refetchUsers(),
        ]);
      } catch (error) {
        console.error('Failed to initialize batch operations page:', error);
      } finally {
        setPageLoading(false);
      }
    };

    initializePage();
  }, []);

  /**
   * Handle refresh of all data
   */
  const handleRefreshAll = async () => {
    try {
      await Promise.all([batchOps.refreshAll(), refetchUsers()]);
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  };

  /**
   * Get tab configuration
   */
  const tabs = [
    {
      id: 'user-operations',
      label: 'User Operations',
      icon: Users,
      description: 'Bulk user management and operations',
      badge: batchOps.selectedCount > 0 ? batchOps.selectedCount : null,
    },
    {
      id: 'maintenance',
      label: 'System Maintenance',
      icon: Settings2,
      description: 'System cleanup and optimization tools',
      badge:
        batchOps.activeOperations.filter((op) =>
          ['dataCleanup', 'cacheClear', 'archiveOldData'].includes(op.type)
        ).length || null,
    },
    {
      id: 'monitoring',
      label: 'Operation Monitoring',
      icon: Activity,
      description: 'Track and monitor all operations',
      badge: batchOps.hasActiveOperations
        ? batchOps.activeOperations.length
        : null,
    },
  ];

  /**
   * Get system health indicator
   */
  const getSystemHealthStatus = () => {
    if (!batchOps.systemStats) return { status: 'unknown', color: 'gray' };

    const { performance, storage, data } = batchOps.systemStats;
    const responseTime = parseInt(performance?.averageResponseTime) || 0;
    const cacheHitRatio = parseFloat(performance?.cacheHitRatio) || 0;
    const orphanedFiles = data?.orphanedFiles || 0;

    if (responseTime > 200 || cacheHitRatio < 85 || orphanedFiles > 20) {
      return { status: 'warning', color: 'yellow' };
    } else if (responseTime > 150 || cacheHitRatio < 90 || orphanedFiles > 10) {
      return { status: 'caution', color: 'orange' };
    } else {
      return { status: 'healthy', color: 'green' };
    }
  };

  const systemHealth = getSystemHealthStatus();

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-surface-primary">
        <div className="flex items-center justify-center h-96">
          <div className="flex items-center space-x-3">
            <RefreshCw className="h-6 w-6 text-brand-primary animate-spin" />
            <span className="text-heading text-lg">
              Loading batch operations...
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-primary">
      {/* Header Section */}
      <div className="bg-surface-elevated border-b border-border-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center space-x-2 py-3 text-sm">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="text-caption hover:text-brand-primary transition-colors duration-200"
            >
              Admin Dashboard
            </button>
            <ChevronRight size={16} className="text-border-primary" />
            <span className="text-heading font-medium">Batch Operations</span>
          </div>

          {/* Page Header */}
          <div className="py-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-brand-primary/10 rounded-lg">
                    <Settings2 className="h-6 w-6 text-brand-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-heading">
                      Batch Operations & Maintenance
                    </h1>
                    <p className="text-caption mt-1">
                      Comprehensive tools for bulk user operations and system
                      maintenance
                    </p>
                  </div>
                </div>

                {/* System Health Indicator */}
                <div className="flex items-center mt-4 space-x-4">
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-3 h-3 rounded-full bg-${systemHealth.color}-400`}
                    />
                    <span className="text-caption text-sm">
                      System Health:{' '}
                      <span className="capitalize text-heading">
                        {systemHealth.status}
                      </span>
                    </span>
                  </div>

                  {batchOps.systemStats && (
                    <>
                      <span className="text-border-primary">•</span>
                      <span className="text-caption text-sm">
                        {batchOps.systemStats.users?.total || 0} total users
                      </span>
                      <span className="text-border-primary">•</span>
                      <span className="text-caption text-sm">
                        {batchOps.systemStats.storage?.totalSize || 'N/A'}{' '}
                        storage used
                      </span>
                      <span className="text-border-primary">•</span>
                      <span className="text-caption text-sm">
                        {batchOps.systemStats.performance
                          ?.averageResponseTime || 'N/A'}{' '}
                        avg response
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Header Actions */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleRefreshAll}
                  disabled={batchOps.isLoading}
                  className="flex items-center px-3 py-2 bg-surface-secondary hover:bg-surface-secondary/80 text-heading rounded-lg transition-colors duration-200 disabled:opacity-50"
                >
                  <RefreshCw
                    size={16}
                    className={`mr-2 ${
                      batchOps.isLoading ? 'animate-spin' : ''
                    }`}
                  />
                  Refresh
                </button>

                <button
                  onClick={() => navigate('/admin/analytics')}
                  className="flex items-center px-3 py-2 bg-brand-primary hover:bg-brand-primary-dark text-white rounded-lg transition-colors duration-200"
                >
                  <BarChart3 size={16} className="mr-2" />
                  View Analytics
                </button>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 pb-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center px-4 py-3 rounded-lg transition-colors duration-200 ${
                    isActive
                      ? 'bg-brand-primary text-white'
                      : 'bg-surface-secondary hover:bg-surface-secondary/80 text-heading'
                  }`}
                >
                  <Icon size={18} className="mr-2" />
                  <span className="font-medium">{tab.label}</span>

                  {tab.badge && (
                    <span
                      className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-brand-primary text-white'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Active Operations Alert */}
        {batchOps.hasActiveOperations && (
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-400/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Activity className="h-5 w-5 text-blue-400" />
                <div>
                  <h3 className="text-heading font-medium">
                    Active Operations Running
                  </h3>
                  <p className="text-caption text-sm">
                    {batchOps.activeOperations.length} operation
                    {batchOps.activeOperations.length !== 1 ? 's' : ''}{' '}
                    currently in progress
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('monitoring')}
                className="text-blue-400 hover:text-blue-300 text-sm font-medium"
              >
                View Details →
              </button>
            </div>
          </div>
        )}

        {/* Error States */}
        {(usersError || batchOps.hasErrors) && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-400/20 rounded-lg">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div>
                <h3 className="text-heading font-medium">Errors Detected</h3>
                <div className="text-caption text-sm space-y-1">
                  {usersError && <p>Failed to load users: {usersError}</p>}
                  {Object.entries(batchOps.errors).map(
                    ([key, error]) =>
                      error && (
                        <p key={key}>
                          Operation error ({key}): {error}
                        </p>
                      )
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="space-y-6">
          {/* User Operations Tab */}
          {activeTab === 'user-operations' && (
            <div className="space-y-6">
              <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-heading text-xl font-semibold">
                      User Bulk Operations
                    </h2>
                    <p className="text-caption text-sm mt-1">
                      Select users and perform bulk actions like role updates,
                      status changes, and data export
                    </p>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-caption">
                      Total Users:{' '}
                      <span className="text-heading font-medium">
                        {users?.length || 0}
                      </span>
                    </span>
                    {batchOps.selectionMode && (
                      <span className="text-brand-primary font-medium">
                        Selection Mode Active
                      </span>
                    )}
                  </div>
                </div>

                <BatchActionsPanel
                  selectedItems={batchOps.selectedItems}
                  selectedCount={batchOps.selectedCount}
                  selectionMode={batchOps.selectionMode}
                  onToggleSelectionMode={batchOps.toggleSelectionMode}
                  onSelectAll={() => batchOps.selectAllItems(users || [])}
                  onClearSelection={batchOps.clearSelection}
                  userOperations={batchOps.userOperations}
                  activeOperations={batchOps.activeOperations.filter((op) =>
                    [
                      'updateUserRole',
                      'updateUserStatus',
                      'updateUserVerification',
                      'deleteUsers',
                      'importUsers',
                    ].includes(op.type)
                  )}
                  onCancelOperation={batchOps.cancelOperation}
                  allUsers={users || []}
                />
              </div>

              {/* User List with Selection */}
              {batchOps.selectionMode && (
                <div className="bg-surface-elevated rounded-lg border border-border-secondary">
                  <div className="p-4 border-b border-border-secondary">
                    <h3 className="text-heading text-lg font-semibold">
                      Select Users
                    </h3>
                    <p className="text-caption text-sm mt-1">
                      Click on users to select them for batch operations
                    </p>
                  </div>

                  <div className="p-4">
                    {usersLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw className="h-5 w-5 text-brand-primary animate-spin mr-2" />
                        <span className="text-caption">Loading users...</span>
                      </div>
                    ) : users && users.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                        {users.map((user) => (
                          <div
                            key={user._id || user.id}
                            onClick={() =>
                              batchOps.toggleSelection(user._id || user.id)
                            }
                            className={`p-3 border rounded-lg cursor-pointer transition-colors duration-200 ${
                              batchOps.isSelected(user._id || user.id)
                                ? 'border-brand-primary bg-brand-primary/10'
                                : 'border-border-secondary hover:border-border-primary'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-heading text-sm font-medium truncate">
                                  {user.firstName
                                    ? `${user.firstName} ${
                                        user.lastName || ''
                                      }`.trim()
                                    : user.username || 'Unknown User'}
                                </p>
                                <p className="text-caption text-xs truncate">
                                  {user.email}
                                </p>
                                <div className="flex items-center space-x-2 mt-1">
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs ${
                                      user.role === 'Admin'
                                        ? 'bg-purple-500/10 text-purple-400'
                                        : user.role === 'Pro User'
                                        ? 'bg-blue-500/10 text-blue-400'
                                        : 'bg-gray-500/10 text-gray-400'
                                    }`}
                                  >
                                    {user.role || 'User'}
                                  </span>
                                  <span
                                    className={`w-2 h-2 rounded-full ${
                                      user.isActive
                                        ? 'bg-green-400'
                                        : 'bg-red-400'
                                    }`}
                                  />
                                </div>
                              </div>

                              {batchOps.isSelected(user._id || user.id) && (
                                <CheckCircle
                                  size={16}
                                  className="text-brand-primary ml-2"
                                />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 text-border-primary mx-auto mb-3" />
                        <p className="text-caption">No users found</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Maintenance Tab */}
          {activeTab === 'maintenance' && (
            <div className="space-y-6">
              <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-heading text-xl font-semibold">
                      System Maintenance
                    </h2>
                    <p className="text-caption text-sm mt-1">
                      Optimize system performance with data cleanup, cache
                      management, and archiving tools
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-3 h-3 rounded-full bg-${systemHealth.color}-400`}
                    />
                    <span className="text-caption text-sm capitalize">
                      {systemHealth.status}
                    </span>
                  </div>
                </div>

                <MaintenanceToolsPanel
                  maintenanceOperations={batchOps.maintenanceOperations}
                  systemStats={batchOps.systemStats}
                  activeOperations={batchOps.activeOperations.filter((op) =>
                    ['dataCleanup', 'cacheClear', 'archiveOldData'].includes(
                      op.type
                    )
                  )}
                  onCancelOperation={batchOps.cancelOperation}
                  loading={batchOps.loading.systemStats}
                />
              </div>
            </div>
          )}

          {/* Monitoring Tab */}
          {activeTab === 'monitoring' && (
            <div className="space-y-6">
              {/* Active Operations */}
              <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6">
                <h2 className="text-heading text-xl font-semibold mb-4">
                  Active Operations
                </h2>

                {batchOps.activeOperations.length > 0 ? (
                  <div className="space-y-4">
                    {batchOps.activeOperations.map((operation) => (
                      <div
                        key={operation.operationId}
                        className="p-4 bg-surface-secondary rounded-lg border border-border-primary"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              {operation.status === 'completed' && (
                                <CheckCircle
                                  size={20}
                                  className="text-green-400"
                                />
                              )}
                              {operation.status === 'in_progress' && (
                                <Clock
                                  size={20}
                                  className="text-blue-400 animate-spin"
                                />
                              )}
                              {operation.status === 'failed' && (
                                <AlertTriangle
                                  size={20}
                                  className="text-red-400"
                                />
                              )}
                            </div>
                            <div>
                              <h3 className="text-heading font-medium">
                                {operation.type
                                  .replace(/([A-Z])/g, ' $1')
                                  .trim()}
                              </h3>
                              <p className="text-caption text-sm">
                                Started:{' '}
                                {new Date(operation.startTime).toLocaleString()}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-heading font-medium">
                              {operation.progress || 0}%
                            </div>
                            <div className="text-caption text-sm">
                              {operation.processedItems || 0} /{' '}
                              {operation.totalItems || 0}
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-surface-primary rounded-full h-2 mb-3">
                          <div
                            className="bg-brand-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${operation.progress || 0}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-caption">
                            {operation.status === 'in_progress' &&
                            operation.estimatedTimeRemaining
                              ? `${Math.round(
                                  operation.estimatedTimeRemaining / 1000
                                )}s remaining`
                              : `Status: ${operation.status}`}
                          </span>

                          {operation.status === 'in_progress' && (
                            <button
                              onClick={() =>
                                batchOps.cancelOperation(operation.operationId)
                              }
                              className="text-red-400 hover:text-red-300 font-medium"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Activity className="h-12 w-12 text-border-primary mx-auto mb-3" />
                    <p className="text-caption">No active operations</p>
                    <p className="text-caption text-sm mt-1">
                      Start a batch operation to see progress here
                    </p>
                  </div>
                )}
              </div>

              {/* System Overview */}
              {batchOps.systemStats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-surface-elevated p-4 rounded-lg border border-border-secondary">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-heading text-sm font-medium">
                        Total Users
                      </h3>
                      <Database size={16} className="text-blue-400" />
                    </div>
                    <div className="text-heading text-2xl font-bold">
                      {batchOps.systemStats.users?.total?.toLocaleString() ||
                        '0'}
                    </div>
                    <div className="text-caption text-xs mt-1">
                      {batchOps.systemStats.users?.active || 0} active
                    </div>
                  </div>

                  <div className="bg-surface-elevated p-4 rounded-lg border border-border-secondary">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-heading text-sm font-medium">
                        Storage Used
                      </h3>
                      <HardDrive size={16} className="text-purple-400" />
                    </div>
                    <div className="text-heading text-2xl font-bold">
                      {batchOps.systemStats.storage?.totalSize || 'N/A'}
                    </div>
                    <div className="text-caption text-xs mt-1">
                      {batchOps.systemStats.storage?.cacheSize || '0'} cache
                    </div>
                  </div>

                  <div className="bg-surface-elevated p-4 rounded-lg border border-border-secondary">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-heading text-sm font-medium">
                        Performance
                      </h3>
                      <Zap size={16} className="text-yellow-400" />
                    </div>
                    <div className="text-heading text-2xl font-bold">
                      {batchOps.systemStats.performance?.averageResponseTime ||
                        'N/A'}
                    </div>
                    <div className="text-caption text-xs mt-1">
                      {batchOps.systemStats.performance?.cacheHitRatio || '0%'}{' '}
                      hit ratio
                    </div>
                  </div>

                  <div className="bg-surface-elevated p-4 rounded-lg border border-border-secondary">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-heading text-sm font-medium">
                        Data Health
                      </h3>
                      <TrendingUp size={16} className="text-green-400" />
                    </div>
                    <div className="text-heading text-2xl font-bold">
                      {batchOps.systemStats.data?.orphanedFiles || 0}
                    </div>
                    <div className="text-caption text-xs mt-1">
                      orphaned files
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchOperationsPage;
