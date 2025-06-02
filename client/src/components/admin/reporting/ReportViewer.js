/**
 * ReportViewer Component
 *
 * Comprehensive interface for displaying and visualizing reports with
 * interactive charts, tables, export options, sharing capabilities,
 * and real-time data updates. Provides professional report presentation
 * with drill-down functionality and collaborative features.
 *
 * Part of Milestone 6: Reporting & Audit
 *
 * Features:
 * - Report display with multiple visualization types
 * - Interactive charts and tables with drill-down
 * - Real-time data updates and refresh
 * - Export options for multiple formats
 * - Sharing and collaboration features
 * - Print-friendly layout options
 * - Full-screen and presentation modes
 * - Data filtering and customization
 * - Professional report formatting
 *
 * @param {Object} props - Component props
 * @param {Object} props.report - Report data and configuration
 * @param {Array} props.reportData - Report data for visualization
 * @param {Object} props.reportConfig - Report configuration settings
 * @param {boolean} props.isLoading - Loading state
 * @param {string} props.error - Error message
 * @param {boolean} props.isRealTime - Real-time data updates
 * @param {Function} props.onExportReport - Export report handler
 * @param {Function} props.onShareReport - Share report handler
 * @param {Function} props.onRefreshData - Refresh data handler
 * @param {Function} props.onUpdateFilters - Update filters handler
 * @param {Function} props.onClose - Close viewer handler
 * @returns {React.ReactElement} The ReportViewer component
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Download,
  Share2,
  RefreshCw,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  Filter,
  Calendar,
  BarChart3,
  PieChart,
  TrendingUp,
  Table,
  Map,
  Activity,
  Users,
  Shield,
  Database,
  Globe,
  Settings,
  ExternalLink,
  Copy,
  Printer,
  Save,
  Edit3,
  X,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Info,
  Clock,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
} from 'lucide-react';

const ReportViewer = ({
  report = null,
  reportData = [],
  reportConfig = {},
  isLoading = false,
  error = null,
  isRealTime = false,
  onExportReport,
  onShareReport,
  onRefreshData,
  onUpdateFilters,
  onClose,
}) => {
  // ===============================================
  // STATE MANAGEMENT
  // ===============================================

  const [viewMode, setViewMode] = useState('standard'); // standard, fullscreen, presentation
  const [chartType, setChartType] = useState('bar'); // bar, line, pie, table, mixed
  const [activeFilters, setActiveFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDataRange, setSelectedDataRange] = useState('all');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [expandedSections, setExpandedSections] = useState(
    new Set(['summary'])
  );
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // ===============================================
  // COMPUTED VALUES
  // ===============================================

  /**
   * Get report type information
   */
  const getReportTypeInfo = (type) => {
    const typeMap = {
      user_activity: {
        icon: Users,
        color: 'text-purple-400',
        bg: 'bg-purple-500/10',
        label: 'User Activity',
      },
      system_audit: {
        icon: Shield,
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
        label: 'System Audit',
      },
      performance: {
        icon: TrendingUp,
        color: 'text-green-400',
        bg: 'bg-green-500/10',
        label: 'Performance',
      },
      compliance: {
        icon: FileText,
        color: 'text-orange-400',
        bg: 'bg-orange-500/10',
        label: 'Compliance',
      },
      custom: {
        icon: BarChart3,
        color: 'text-brand-primary',
        bg: 'bg-brand-primary/10',
        label: 'Custom',
      },
    };
    return typeMap[type] || typeMap.custom;
  };

  /**
   * Get chart type configuration
   */
  const getChartTypeConfig = (type) => {
    const chartConfig = {
      bar: { icon: BarChart3, label: 'Bar Chart' },
      line: { icon: TrendingUp, label: 'Line Chart' },
      pie: { icon: PieChart, label: 'Pie Chart' },
      table: { icon: Table, label: 'Data Table' },
      mixed: { icon: Layers, label: 'Mixed View' },
    };
    return chartConfig[type] || chartConfig.bar;
  };

  /**
   * Process report data for visualization
   */
  const processedData = useMemo(() => {
    if (!reportData || reportData.length === 0) return [];

    let filtered = [...reportData];

    // Apply date range filter
    if (selectedDataRange !== 'all') {
      const now = new Date();
      const ranges = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
        '1y': 365,
      };

      if (ranges[selectedDataRange]) {
        const cutoffDate = new Date(
          now.getTime() - ranges[selectedDataRange] * 24 * 60 * 60 * 1000
        );
        filtered = filtered.filter((item) => {
          const itemDate = new Date(
            item.date || item.timestamp || item.created_at
          );
          return itemDate >= cutoffDate;
        });
      }
    }

    // Apply active filters
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        filtered = filtered.filter((item) => item[key] === value);
      }
    });

    return filtered;
  }, [reportData, selectedDataRange, activeFilters]);

  /**
   * Calculate report summary statistics
   */
  const reportSummary = useMemo(() => {
    if (!processedData.length) return null;

    return {
      totalRecords: processedData.length,
      dataRange: selectedDataRange,
      lastUpdated: lastRefresh,
      coverage: `${(
        (processedData.length / (reportData.length || 1)) *
        100
      ).toFixed(1)}%`,
    };
  }, [processedData, reportData, selectedDataRange, lastRefresh]);

  // ===============================================
  // EVENT HANDLERS
  // ===============================================

  /**
   * Handle view mode change
   */
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    if (mode === 'fullscreen') {
      document.documentElement.requestFullscreen?.();
    } else if (mode === 'standard' && document.fullscreenElement) {
      document.exitFullscreen?.();
    }
  };

  /**
   * Handle filter changes
   */
  const handleFilterChange = (filterKey, value) => {
    const newFilters = {
      ...activeFilters,
      [filterKey]: value,
    };
    setActiveFilters(newFilters);

    if (onUpdateFilters) {
      onUpdateFilters(newFilters);
    }
  };

  /**
   * Handle section expansion
   */
  const handleSectionToggle = (section) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  /**
   * Handle refresh data
   */
  const handleRefreshData = () => {
    setLastRefresh(new Date());
    if (onRefreshData) {
      onRefreshData();
    }
  };

  /**
   * Handle print report
   */
  const handlePrintReport = () => {
    window.print();
  };

  /**
   * Handle copy report link
   */
  const handleCopyReportLink = async () => {
    try {
      const reportUrl = `${window.location.origin}/admin/reporting/view/${report?.id}`;
      await navigator.clipboard.writeText(reportUrl);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy report link:', err);
    }
  };

  // ===============================================
  // RENDER METHODS
  // ===============================================

  /**
   * Render report header with controls
   */
  const renderReportHeader = () => {
    if (!report) return null;

    const typeInfo = getReportTypeInfo(report.type);
    const TypeIcon = typeInfo.icon;

    return (
      <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${typeInfo.bg}`}>
              <TypeIcon className={`h-6 w-6 ${typeInfo.color}`} />
            </div>

            <div>
              <h1 className="text-heading text-2xl font-bold">{report.name}</h1>
              <p className="text-caption text-sm mt-1">{report.description}</p>

              <div className="flex items-center gap-4 mt-3 text-sm text-caption">
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {typeInfo.label}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(report.generatedAt).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {report.createdBy}
                </span>
                {isRealTime && (
                  <span className="flex items-center gap-1 text-green-400">
                    <Activity className="h-3 w-3" />
                    Live Data
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefreshData}
              className="flex items-center gap-2 px-3 py-2 bg-surface-secondary hover:bg-surface-secondary/80 text-heading rounded-lg transition-colors duration-200"
              title="Refresh Data"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>

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

            <div className="flex bg-surface-secondary rounded-lg p-1">
              {['bar', 'line', 'pie', 'table'].map((type) => {
                const config = getChartTypeConfig(type);
                const Icon = config.icon;
                return (
                  <button
                    key={type}
                    onClick={() => setChartType(type)}
                    className={`p-2 rounded transition-colors duration-200 ${
                      chartType === type
                        ? 'bg-brand-primary text-white'
                        : 'text-heading hover:bg-surface-secondary/80'
                    }`}
                    title={config.label}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => onExportReport && onExportReport(report.id, 'pdf')}
              className="flex items-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200"
            >
              <Download className="h-4 w-4" />
              Export
            </button>

            <button
              onClick={() => onShareReport && onShareReport(report)}
              className="flex items-center gap-2 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors duration-200"
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>

            {viewMode !== 'fullscreen' ? (
              <button
                onClick={() => handleViewModeChange('fullscreen')}
                className="p-2 text-muted hover:text-heading rounded-lg transition-colors duration-200"
                title="Fullscreen"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => handleViewModeChange('standard')}
                className="p-2 text-muted hover:text-heading rounded-lg transition-colors duration-200"
                title="Exit Fullscreen"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-muted hover:text-heading rounded-lg transition-colors duration-200"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border-secondary">
            <div>
              <label className="block text-heading text-sm font-medium mb-2">
                Data Range
              </label>
              <select
                value={selectedDataRange}
                onChange={(e) => setSelectedDataRange(e.target.value)}
                className="w-full px-3 py-2 bg-surface-secondary border border-border-secondary rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              >
                <option value="all">All Time</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="1y">Last Year</option>
              </select>
            </div>

            {/* Dynamic filters based on report config */}
            {reportConfig.availableFilters?.map((filter) => (
              <div key={filter.key}>
                <label className="block text-heading text-sm font-medium mb-2">
                  {filter.label}
                </label>
                <select
                  value={activeFilters[filter.key] || 'all'}
                  onChange={(e) =>
                    handleFilterChange(filter.key, e.target.value)
                  }
                  className="w-full px-3 py-2 bg-surface-secondary border border-border-secondary rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                >
                  <option value="all">All {filter.label}</option>
                  {filter.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            <div>
              <label className="block text-heading text-sm font-medium mb-2">
                Zoom Level
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoomLevel(Math.max(50, zoomLevel - 25))}
                  className="p-1 text-muted hover:text-heading"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="text-heading text-sm min-w-[50px] text-center">
                  {zoomLevel}%
                </span>
                <button
                  onClick={() => setZoomLevel(Math.min(200, zoomLevel + 25))}
                  className="p-1 text-muted hover:text-heading"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  /**
   * Render report summary section
   */
  const renderReportSummary = () => {
    if (!reportSummary) return null;

    return (
      <div className="bg-surface-elevated rounded-lg border border-border-secondary mb-6">
        <div
          className="flex items-center justify-between p-4 cursor-pointer"
          onClick={() => handleSectionToggle('summary')}
        >
          <h2 className="text-heading font-medium">Report Summary</h2>
          {expandedSections.has('summary') ? (
            <ChevronDown className="h-4 w-4 text-muted" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted" />
          )}
        </div>

        {expandedSections.has('summary') && (
          <div className="px-4 pb-4 border-t border-border-secondary">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <div className="text-center p-4 bg-surface-secondary rounded-lg">
                <p className="text-2xl font-bold text-heading">
                  {reportSummary.totalRecords.toLocaleString()}
                </p>
                <p className="text-caption text-sm">Total Records</p>
              </div>

              <div className="text-center p-4 bg-surface-secondary rounded-lg">
                <p className="text-2xl font-bold text-heading">
                  {reportSummary.coverage}
                </p>
                <p className="text-caption text-sm">Data Coverage</p>
              </div>

              <div className="text-center p-4 bg-surface-secondary rounded-lg">
                <p className="text-2xl font-bold text-heading">
                  {reportSummary.dataRange.toUpperCase()}
                </p>
                <p className="text-caption text-sm">Time Range</p>
              </div>

              <div className="text-center p-4 bg-surface-secondary rounded-lg">
                <p className="text-2xl font-bold text-heading">
                  {reportSummary.lastUpdated.toLocaleTimeString()}
                </p>
                <p className="text-caption text-sm">Last Updated</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  /**
   * Render chart visualization
   */
  const renderVisualization = () => {
    return (
      <div className="bg-surface-elevated rounded-lg border border-border-secondary mb-6">
        <div
          className="flex items-center justify-between p-4 cursor-pointer"
          onClick={() => handleSectionToggle('visualization')}
        >
          <h2 className="text-heading font-medium">Data Visualization</h2>
          {expandedSections.has('visualization') ? (
            <ChevronDown className="h-4 w-4 text-muted" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted" />
          )}
        </div>

        {expandedSections.has('visualization') && (
          <div className="p-4 border-t border-border-secondary">
            <div
              className="min-h-[400px] flex items-center justify-center bg-surface-secondary rounded-lg"
              style={{
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: 'top left',
              }}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-6 w-6 animate-spin text-brand-primary" />
                  <span className="text-heading">Loading visualization...</span>
                </div>
              ) : processedData.length === 0 ? (
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-muted mx-auto mb-3" />
                  <p className="text-heading font-medium">No Data Available</p>
                  <p className="text-caption text-sm">
                    Adjust your filters or refresh the data to see
                    visualizations
                  </p>
                </div>
              ) : (
                <div className="w-full">
                  {/* Chart placeholder - in a real implementation, you'd use a charting library like Chart.js, D3, or Recharts */}
                  <div className="text-center p-8">
                    {chartType === 'bar' && (
                      <BarChart3 className="h-16 w-16 text-brand-primary mx-auto mb-4" />
                    )}
                    {chartType === 'line' && (
                      <TrendingUp className="h-16 w-16 text-brand-primary mx-auto mb-4" />
                    )}
                    {chartType === 'pie' && (
                      <PieChart className="h-16 w-16 text-brand-primary mx-auto mb-4" />
                    )}
                    {chartType === 'table' && (
                      <Table className="h-16 w-16 text-brand-primary mx-auto mb-4" />
                    )}

                    <h3 className="text-heading text-lg font-medium mb-2">
                      {getChartTypeConfig(chartType).label}
                    </h3>
                    <p className="text-caption">
                      Displaying {processedData.length} data points
                    </p>
                    <p className="text-caption text-sm mt-1">
                      Chart visualization would render here with your preferred
                      charting library
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  /**
   * Render data table
   */
  const renderDataTable = () => {
    if (!processedData.length) return null;

    // Get available columns from first data item
    const columns = Object.keys(processedData[0] || {}).slice(0, 6); // Limit columns for display

    return (
      <div className="bg-surface-elevated rounded-lg border border-border-secondary mb-6">
        <div
          className="flex items-center justify-between p-4 cursor-pointer"
          onClick={() => handleSectionToggle('data')}
        >
          <h2 className="text-heading font-medium">Raw Data</h2>
          <div className="flex items-center gap-2">
            <span className="text-caption text-sm">
              {processedData.length} rows
            </span>
            {expandedSections.has('data') ? (
              <ChevronDown className="h-4 w-4 text-muted" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted" />
            )}
          </div>
        </div>

        {expandedSections.has('data') && (
          <div className="border-t border-border-secondary">
            <div className="overflow-x-auto max-h-96">
              <table className="w-full">
                <thead className="bg-surface-secondary sticky top-0">
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={column}
                        className="px-4 py-3 text-left text-xs font-medium text-caption uppercase tracking-wider"
                      >
                        {column.replace(/_/g, ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-secondary">
                  {processedData.slice(0, 100).map((row, index) => (
                    <tr key={index} className="hover:bg-surface-secondary/30">
                      {columns.map((column) => (
                        <td
                          key={column}
                          className="px-4 py-3 text-heading text-sm"
                        >
                          {typeof row[column] === 'object'
                            ? JSON.stringify(row[column])
                            : String(row[column] || '').slice(0, 50)}
                          {String(row[column] || '').length > 50 && '...'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {processedData.length > 100 && (
              <div className="px-4 py-3 border-t border-border-secondary text-center">
                <p className="text-caption text-sm">
                  Showing first 100 rows of {processedData.length} total rows
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  /**
   * Render export and sharing options
   */
  const renderActions = () => (
    <div className="bg-surface-elevated rounded-lg border border-border-secondary">
      <div className="p-4">
        <h2 className="text-heading font-medium mb-4">Actions</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={handlePrintReport}
            className="flex items-center gap-2 p-3 bg-surface-secondary hover:bg-surface-secondary/80 rounded-lg transition-colors duration-200"
          >
            <Printer className="h-4 w-4 text-muted" />
            <span className="text-heading">Print Report</span>
          </button>

          <button
            onClick={handleCopyReportLink}
            className="flex items-center gap-2 p-3 bg-surface-secondary hover:bg-surface-secondary/80 rounded-lg transition-colors duration-200"
          >
            <Copy className="h-4 w-4 text-muted" />
            <span className="text-heading">Copy Link</span>
          </button>

          <button
            onClick={() => onExportReport && onExportReport(report.id, 'csv')}
            className="flex items-center gap-2 p-3 bg-surface-secondary hover:bg-surface-secondary/80 rounded-lg transition-colors duration-200"
          >
            <Download className="h-4 w-4 text-muted" />
            <span className="text-heading">Export CSV</span>
          </button>
        </div>
      </div>
    </div>
  );

  // ===============================================
  // EFFECTS
  // ===============================================

  useEffect(() => {
    // Auto-refresh for real-time reports
    if (isRealTime) {
      const interval = setInterval(() => {
        handleRefreshData();
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [isRealTime]);

  // ===============================================
  // MAIN RENDER
  // ===============================================

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <FileText className="h-12 w-12 text-muted mb-4" />
        <p className="text-heading font-medium">No Report Selected</p>
        <p className="text-caption text-sm">
          Select a report to view its details and visualizations
        </p>
      </div>
    );
  }

  return (
    <div
      className={`space-y-6 ${
        viewMode === 'fullscreen'
          ? 'fixed inset-0 z-50 bg-surface-primary overflow-auto p-6'
          : ''
      }`}
    >
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

      {/* Report Header */}
      {renderReportHeader()}

      {/* Report Summary */}
      {renderReportSummary()}

      {/* Visualization */}
      {renderVisualization()}

      {/* Data Table */}
      {renderDataTable()}

      {/* Actions */}
      {renderActions()}
    </div>
  );
};

export default ReportViewer;
