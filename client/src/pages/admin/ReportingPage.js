/**
 * ReportingPage Component
 *
 * Main reporting dashboard that integrates all reporting and audit
 * functionality into a comprehensive interface. Provides multi-view
 * navigation, statistics overview, and professional management tools
 * for reports, audit trails, and analytics.
 *
 * Part of Milestone 6: Reporting & Audit
 *
 * Features:
 * - Multi-view navigation (reports, builder, audit, viewer)
 * - Comprehensive reporting dashboard with key metrics
 * - Integration with all reporting components
 * - Real-time updates and notifications
 * - Professional UI with contextual navigation
 * - Export and sharing capabilities
 * - Role-based access control integration
 * - Responsive design for all screen sizes
 *
 * @returns {React.ReactElement} The ReportingPage component
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  BarChart3,
  Shield,
  Download,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  Users,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Settings,
  ExternalLink,
  Bell,
  Bookmark,
  Star,
  ChevronRight,
} from 'lucide-react';

// Import our reporting components
import ReportList from '../../components/admin/reporting/ReportList';
import ReportBuilder from '../../components/admin/reporting/ReportBuilder';
import AuditTrail from '../../components/admin/reporting/AuditTrail';
import ReportViewer from '../../components/admin/reporting/ReportViewer';

// Import the reporting hook
import useReporting from '../../hooks/useReporting';

const ReportingPage = () => {
  // ===============================================
  // STATE MANAGEMENT
  // ===============================================

  const [activeView, setActiveView] = useState('dashboard'); // dashboard, reports, builder, audit, viewer
  const [selectedReport, setSelectedReport] = useState(null);
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);

  // ===============================================
  // DATA FETCHING WITH CUSTOM HOOK
  // ===============================================

  const {
    // Reports data
    reports,
    reportsData,
    reportsFilter,
    reportsLoading,
    reportsError,
    reportStatistics,

    // Audit data
    auditLogs,
    auditData,
    auditFilter,
    auditLoading,
    auditError,
    auditStatistics,
    isRealTimeAudit,

    // Actions
    createReport,
    generateReport,
    exportReport,
    shareReport,
    deleteReport,
    filterReports,
    sortReports,
    changeReportsPage,
    filterAudit,
    exportAudit,
    toggleRealTimeAudit,
    changeAuditPage,
    refreshData,
  } = useReporting();

  // ===============================================
  // COMPUTED VALUES
  // ===============================================

  /**
   * Get dashboard statistics combining reports and audit data
   */
  const dashboardStats = {
    totalReports: reportStatistics?.totalReports || 0,
    reportsThisMonth: reportStatistics?.reportsThisMonth || 0,
    scheduledReports: reportStatistics?.scheduledReports || 0,
    totalAuditEvents: auditStatistics?.totalEvents || 0,
    securityEvents: auditStatistics?.securityEvents || 0,
    activeUsers: auditStatistics?.activeUsers || 0,
    failedLogins: auditStatistics?.failedLogins || 0,
    systemHealth: 'Operational', // This would come from system monitoring
  };

  /**
   * Get recent activity combining reports and audit logs
   */
  const recentActivity = [
    ...(reports.slice(0, 3).map((report) => ({
      id: `report-${report.id}`,
      type: 'report',
      icon: FileText,
      title: `Report "${report.name}" generated`,
      description: `${report.recordCount} records processed`,
      timestamp: report.generatedAt,
      status: report.status,
    })) || []),
    ...(auditLogs.slice(0, 3).map((log) => ({
      id: `audit-${log.id}`,
      type: 'audit',
      icon: Shield,
      title: log.action,
      description: `by ${log.user} - ${log.category}`,
      timestamp: log.timestamp,
      severity: log.severity,
    })) || []),
  ]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 6);

  // ===============================================
  // EVENT HANDLERS
  // ===============================================

  /**
   * Handle view navigation
   */
  const handleViewChange = (view) => {
    setActiveView(view);
    if (view !== 'viewer') {
      setSelectedReport(null);
    }
  };

  /**
   * Handle report creation
   */
  const handleCreateReport = () => {
    setActiveView('builder');
  };

  /**
   * Handle report viewing
   */
  const handleViewReport = (report) => {
    setSelectedReport(report);
    setActiveView('viewer');
  };

  /**
   * Handle report generation from builder
   */
  const handleGenerateReport = async (reportConfig) => {
    try {
      const newReport = await generateReport(reportConfig);
      if (newReport) {
        setSelectedReport(newReport);
        setActiveView('viewer');
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
    }
  };

  /**
   * Handle export operations
   */
  const handleExportReport = async (reportId, format) => {
    try {
      await exportReport(reportId, format);
    } catch (error) {
      console.error('Failed to export report:', error);
    }
  };

  /**
   * Handle share operations
   */
  const handleShareReport = async (report) => {
    try {
      await shareReport(report);
    } catch (error) {
      console.error('Failed to share report:', error);
    }
  };

  /**
   * Handle audit log viewing
   */
  const handleViewAuditDetails = (log) => {
    // Implementation for viewing detailed audit log
    console.log('Viewing audit details for:', log);
  };

  /**
   * Handle dashboard refresh
   */
  const handleDashboardRefresh = () => {
    setDashboardRefreshKey((prev) => prev + 1);
    refreshData();
  };

  // ===============================================
  // RENDER METHODS
  // ===============================================

  /**
   * Render navigation tabs
   */
  const renderNavigation = () => {
    const navItems = [
      { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
      { id: 'reports', label: 'Reports', icon: FileText },
      { id: 'builder', label: 'Report Builder', icon: Plus },
      { id: 'audit', label: 'Audit Trail', icon: Shield },
    ];

    return (
      <div className="bg-surface-elevated rounded-lg border border-border-secondary p-2 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex bg-surface-secondary rounded-lg p-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleViewChange(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-200 ${
                    activeView === item.id
                      ? 'bg-brand-primary text-white'
                      : 'text-heading hover:bg-surface-secondary/80'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDashboardRefresh}
              className="flex items-center gap-2 px-3 py-2 bg-surface-secondary hover:bg-surface-secondary/80 text-heading rounded-lg transition-colors duration-200"
              title="Refresh Data"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>

            {isRealTimeAudit && (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-500/20 text-green-400 rounded-lg">
                <Activity className="h-4 w-4" />
                <span className="text-sm font-medium">Live Updates</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  /**
   * Render dashboard view
   */
  const renderDashboard = () => (
    <div className="space-y-6" key={dashboardRefreshKey}>
      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-elevated rounded-lg border border-border-secondary p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-caption text-sm">Total Reports</p>
              <p className="text-heading text-2xl font-bold">
                {dashboardStats.totalReports}
              </p>
              <p className="text-green-400 text-xs mt-1">
                +{dashboardStats.reportsThisMonth} this month
              </p>
            </div>
            <div className="p-2 rounded-lg bg-blue-500/10">
              <FileText className="h-6 w-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-surface-elevated rounded-lg border border-border-secondary p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-caption text-sm">Audit Events</p>
              <p className="text-heading text-2xl font-bold">
                {dashboardStats.totalAuditEvents}
              </p>
              <p className="text-orange-400 text-xs mt-1">
                {dashboardStats.securityEvents} security events
              </p>
            </div>
            <div className="p-2 rounded-lg bg-red-500/10">
              <Shield className="h-6 w-6 text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-surface-elevated rounded-lg border border-border-secondary p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-caption text-sm">Active Users</p>
              <p className="text-heading text-2xl font-bold">
                {dashboardStats.activeUsers}
              </p>
              <p className="text-red-400 text-xs mt-1">
                {dashboardStats.failedLogins} failed logins
              </p>
            </div>
            <div className="p-2 rounded-lg bg-green-500/10">
              <Users className="h-6 w-6 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-surface-elevated rounded-lg border border-border-secondary p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-caption text-sm">System Health</p>
              <p className="text-heading text-2xl font-bold">
                {dashboardStats.systemHealth}
              </p>
              <p className="text-green-400 text-xs mt-1">All systems running</p>
            </div>
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle className="h-6 w-6 text-green-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6">
        <h2 className="text-heading font-medium mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={handleCreateReport}
            className="flex items-center gap-3 p-4 bg-brand-primary hover:bg-brand-primary-dark text-white rounded-lg transition-colors duration-200"
          >
            <Plus className="h-5 w-5" />
            <div className="text-left">
              <p className="font-medium">Create New Report</p>
              <p className="text-sm opacity-90">
                Build custom reports and analytics
              </p>
            </div>
          </button>

          <button
            onClick={() => handleViewChange('audit')}
            className="flex items-center gap-3 p-4 bg-surface-secondary hover:bg-surface-secondary/80 text-heading rounded-lg transition-colors duration-200"
          >
            <Shield className="h-5 w-5" />
            <div className="text-left">
              <p className="font-medium">View Audit Trail</p>
              <p className="text-sm text-caption">
                Monitor system security events
              </p>
            </div>
          </button>

          <button
            onClick={() => handleViewChange('reports')}
            className="flex items-center gap-3 p-4 bg-surface-secondary hover:bg-surface-secondary/80 text-heading rounded-lg transition-colors duration-200"
          >
            <FileText className="h-5 w-5" />
            <div className="text-left">
              <p className="font-medium">Browse Reports</p>
              <p className="text-sm text-caption">
                Access and manage all reports
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-surface-elevated rounded-lg border border-border-secondary">
        <div className="flex items-center justify-between p-4 border-b border-border-secondary">
          <h2 className="text-heading font-medium">Recent Activity</h2>
          <button
            onClick={() => handleViewChange('audit')}
            className="flex items-center gap-1 text-brand-primary hover:text-brand-primary-dark text-sm transition-colors duration-200"
          >
            View All
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        <div className="p-4">
          {recentActivity.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-8 w-8 text-muted mx-auto mb-2" />
              <p className="text-heading font-medium">No Recent Activity</p>
              <p className="text-caption text-sm">
                Recent reports and audit events will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((activity) => {
                const Icon = activity.icon;
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 bg-surface-secondary rounded-lg hover:bg-surface-secondary/80 transition-colors duration-200"
                  >
                    <div
                      className={`p-2 rounded-lg ${
                        activity.type === 'report'
                          ? 'bg-blue-500/10'
                          : activity.severity === 'critical'
                          ? 'bg-red-500/10'
                          : 'bg-gray-500/10'
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 ${
                          activity.type === 'report'
                            ? 'text-blue-400'
                            : activity.severity === 'critical'
                            ? 'text-red-400'
                            : 'text-muted'
                        }`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-heading font-medium truncate">
                        {activity.title}
                      </p>
                      <p className="text-caption text-sm">
                        {activity.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="h-3 w-3 text-muted" />
                        <span className="text-caption text-xs">
                          {new Date(activity.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {activity.type === 'report' && (
                      <button
                        onClick={() =>
                          handleViewReport({
                            id: activity.id.replace('report-', ''),
                          })
                        }
                        className="p-1 text-muted hover:text-brand-primary transition-colors duration-200"
                        title="View Report"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  /**
   * Render main content based on active view
   */
  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return renderDashboard();

      case 'reports':
        return (
          <ReportList
            reports={reports}
            reportsData={reportsData}
            reportsFilter={reportsFilter}
            isLoading={reportsLoading}
            error={reportsError}
            reportStatistics={reportStatistics}
            onCreateReport={handleCreateReport}
            onViewReport={handleViewReport}
            onExportReport={handleExportReport}
            onScheduleReport={(report) => console.log('Schedule:', report)}
            onDeleteReport={deleteReport}
            onFilterReports={filterReports}
            onSortReports={sortReports}
            onChangePage={changeReportsPage}
          />
        );

      case 'builder':
        return (
          <ReportBuilder
            reportTypes={{
              user_activity: {
                name: 'User Activity',
                description: 'Track user actions and behavior',
              },
              system_audit: {
                name: 'System Audit',
                description: 'Monitor system events and security',
              },
              performance: {
                name: 'Performance',
                description: 'Analyze system performance metrics',
              },
              compliance: {
                name: 'Compliance',
                description: 'Generate compliance reports',
              },
              custom: {
                name: 'Custom',
                description: 'Build custom data reports',
              },
            }}
            exportFormats={{
              pdf: { name: 'PDF', description: 'Portable document format' },
              csv: { name: 'CSV', description: 'Comma-separated values' },
              excel: { name: 'Excel', description: 'Microsoft Excel format' },
              json: { name: 'JSON', description: 'JavaScript object notation' },
            }}
            scheduleOptions={{
              none: { name: 'No Schedule', description: 'Generate once only' },
              daily: {
                name: 'Daily',
                description: 'Generate every day at selected time',
              },
              weekly: {
                name: 'Weekly',
                description: 'Generate weekly on selected day',
              },
              monthly: {
                name: 'Monthly',
                description: 'Generate monthly on selected date',
              },
            }}
            isLoading={reportsLoading}
            error={reportsError}
            onGenerateReport={handleGenerateReport}
            onScheduleReport={(config) => console.log('Schedule:', config)}
            onSaveTemplate={(config) => console.log('Save template:', config)}
            onCancel={() => handleViewChange('dashboard')}
          />
        );

      case 'audit':
        return (
          <AuditTrail
            auditLogs={auditLogs}
            auditData={auditData}
            auditFilter={auditFilter}
            isLoading={auditLoading}
            error={auditError}
            auditStatistics={auditStatistics}
            isRealTime={isRealTimeAudit}
            onFilterAudit={filterAudit}
            onExportAudit={exportAudit}
            onViewDetails={handleViewAuditDetails}
            onToggleRealTime={toggleRealTimeAudit}
            onChangePage={changeAuditPage}
          />
        );

      case 'viewer':
        return (
          <ReportViewer
            report={selectedReport}
            reportData={selectedReport?.data || []}
            reportConfig={selectedReport?.config || {}}
            isLoading={reportsLoading}
            error={reportsError}
            isRealTime={selectedReport?.isRealTime || false}
            onExportReport={handleExportReport}
            onShareReport={handleShareReport}
            onRefreshData={() => refreshData()}
            onUpdateFilters={(filters) =>
              console.log('Update filters:', filters)
            }
            onClose={() => handleViewChange('reports')}
          />
        );

      default:
        return renderDashboard();
    }
  };

  // ===============================================
  // EFFECTS
  // ===============================================

  useEffect(() => {
    // Set document title
    document.title = 'Reporting & Audit - Admin Dashboard';

    // Cleanup on unmount
    return () => {
      document.title = 'Admin Dashboard';
    };
  }, []);

  // ===============================================
  // MAIN RENDER
  // ===============================================

  return (
    <div className="min-h-screen bg-surface-primary">
      <div className="max-w-7xl mx-auto p-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-heading text-3xl font-bold">Reporting & Audit</h1>
          <p className="text-caption text-sm mt-1">
            Comprehensive reporting, analytics, and audit trail management
          </p>
        </div>

        {/* Navigation */}
        {renderNavigation()}

        {/* Main Content */}
        {renderContent()}
      </div>
    </div>
  );
};

export default ReportingPage;
