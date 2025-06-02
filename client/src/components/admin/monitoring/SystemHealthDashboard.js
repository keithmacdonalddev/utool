import React, { useState } from 'react';
import {
  Activity,
  Server,
  Database,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  HardDrive,
  Network,
  MemoryStick,
  Zap,
  TrendingUp,
  AlertCircle,
  Wifi,
  Lock,
  RefreshCw,
  Eye,
  BarChart3,
  PieChart,
  LineChart,
} from 'lucide-react';
import useSystemHealth from '../../../hooks/useSystemHealth';

/**
 * SystemHealthDashboard Component
 *
 * Comprehensive real-time system monitoring dashboard providing detailed insights
 * into server performance, service status, database health, security metrics,
 * and automated alerting. Features live updates and interactive visualizations.
 *
 * Part of Milestone 3: System Health Monitoring
 *
 * @returns {React.ReactElement} The SystemHealthDashboard component
 */
const SystemHealthDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview'); // overview, performance, services, security, alerts

  // Use system health hook with real-time monitoring
  const {
    data: {
      systemMetrics,
      serviceStatus,
      databaseHealth,
      applicationMetrics,
      securityMetrics,
      historicalData,
      alerts,
      healthSummary,
    },
    loading,
    errors,
    refreshAll,
    isLoading,
    criticalAlerts,
    overallStatus,
    lastUpdated,
  } = useSystemHealth({
    realTime: true,
    autoRefresh: true,
    refreshInterval: 10,
    enableAlerts: true,
  });

  // Tab configurations
  const tabs = [
    { key: 'overview', label: 'Overview', icon: Activity },
    { key: 'performance', label: 'Performance', icon: Cpu },
    { key: 'services', label: 'Services', icon: Server },
    { key: 'security', label: 'Security', icon: Shield },
    { key: 'alerts', label: 'Alerts', icon: AlertTriangle },
  ];

  /**
   * Get status color class based on status
   * @param {string} status - Status value
   * @returns {string} CSS color class
   */
  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'synchronized':
      case 'active':
        return 'text-green-400';
      case 'warning':
      case 'lag':
        return 'text-yellow-400';
      case 'error':
      case 'critical':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  /**
   * Get status icon based on status
   * @param {string} status - Status value
   * @returns {React.ReactElement} Status icon
   */
  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'synchronized':
      case 'active':
        return <CheckCircle size={16} className={getStatusColor(status)} />;
      case 'warning':
      case 'lag':
        return <AlertTriangle size={16} className={getStatusColor(status)} />;
      case 'error':
      case 'critical':
        return <AlertCircle size={16} className={getStatusColor(status)} />;
      default:
        return <Clock size={16} className={getStatusColor(status)} />;
    }
  };

  /**
   * Render metric card with value, trend, and status
   * @param {Object} props - Metric card props
   * @returns {React.ReactElement} Metric card component
   */
  const MetricCard = ({
    title,
    value,
    unit,
    status,
    icon: Icon,
    trend,
    description,
    className = '',
  }) => (
    <div
      className={`bg-surface-elevated rounded-lg border border-border-secondary p-4 shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-heading font-medium text-sm">{title}</h3>
        <div className="flex items-center space-x-2">
          {Icon && <Icon size={16} className={getStatusColor(status)} />}
          {status && getStatusIcon(status)}
        </div>
      </div>

      <div className="text-2xl font-bold text-heading mb-2">
        {value}
        {unit && <span className="text-lg text-caption ml-1">{unit}</span>}
      </div>

      {description && <p className="text-caption text-xs">{description}</p>}

      {trend && (
        <div className="flex items-center mt-2">
          <TrendingUp size={12} className="text-green-400 mr-1" />
          <span className="text-green-400 text-xs">{trend}</span>
        </div>
      )}
    </div>
  );

  /**
   * Render progress bar
   * @param {Object} props - Progress bar props
   * @returns {React.ReactElement} Progress bar component
   */
  const ProgressBar = ({
    value,
    max = 100,
    color = 'blue',
    showPercentage = true,
    className = '',
  }) => {
    const percentage = Math.min((value / max) * 100, 100);
    const colorClasses = {
      blue: 'bg-blue-400',
      green: 'bg-green-400',
      yellow: 'bg-yellow-400',
      red: 'bg-red-400',
      purple: 'bg-purple-400',
    };

    const barColor =
      percentage > 90 ? 'red' : percentage > 70 ? 'yellow' : color;

    return (
      <div className={`w-full ${className}`}>
        <div className="flex justify-between items-center mb-1">
          {showPercentage && (
            <span className="text-heading text-sm font-medium">
              {percentage.toFixed(0)}%
            </span>
          )}
        </div>
        <div className="w-full bg-surface-secondary rounded-full h-2">
          <div
            className={`${colorClasses[barColor]} h-2 rounded-full transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  /**
   * Render simple chart for historical data
   * @param {Array} data - Chart data
   * @param {string} dataKey - Key for chart data
   * @param {string} color - Chart color
   * @returns {React.ReactElement} Chart component
   */
  const SimpleChart = ({ data, dataKey, color = 'blue' }) => {
    if (!data || data.length === 0) {
      return (
        <div className="h-24 flex items-center justify-center text-caption">
          No data available
        </div>
      );
    }

    const max = Math.max(...data.map((d) => d[dataKey]));
    const colorClasses = {
      blue: 'bg-blue-400',
      green: 'bg-green-400',
      orange: 'bg-orange-400',
      purple: 'bg-purple-400',
      red: 'bg-red-400',
    };

    return (
      <div className="h-24 flex items-end space-x-1">
        {data.slice(-24).map((item, index) => (
          <div key={index} className="flex-1 relative group">
            <div
              className={`${colorClasses[color]} rounded-t opacity-70 transition-opacity duration-200 group-hover:opacity-100`}
              style={{
                height: `${(item[dataKey] / max) * 100}%`,
                minHeight: '2px',
              }}
            />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
              {new Date(item.timestamp).toLocaleTimeString()}: {item[dataKey]}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (errors.healthSummary || errors.systemMetrics) {
    return (
      <div className="bg-surface-elevated rounded-lg border border-border-secondary p-8 shadow-sm">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-heading text-lg font-semibold mb-2">
            Failed to Load System Health Data
          </h3>
          <p className="text-caption mb-4">
            {errors.healthSummary ||
              errors.systemMetrics ||
              'An error occurred while loading monitoring data.'}
          </p>
          <button
            onClick={refreshAll}
            className="inline-flex items-center px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-dark transition-colors duration-200"
          >
            <RefreshCw size={16} className="mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Real-time Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <Activity className="h-6 w-6 text-brand-primary mr-2" />
            <h2 className="text-heading text-2xl font-bold">
              System Health Monitor
            </h2>
          </div>

          <div className="flex items-center space-x-2">
            <div
              className={`w-3 h-3 rounded-full animate-pulse ${
                overallStatus === 'healthy'
                  ? 'bg-green-400'
                  : overallStatus === 'warning'
                  ? 'bg-yellow-400'
                  : 'bg-red-400'
              }`}
            />
            <span className="text-heading font-medium capitalize">
              {overallStatus}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {criticalAlerts.length > 0 && (
            <div className="flex items-center text-red-400">
              <AlertTriangle size={16} className="mr-1" />
              <span className="text-sm font-medium">
                {criticalAlerts.length} Alert
                {criticalAlerts.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          <span className="text-caption text-sm">
            Last updated: {lastUpdated}
          </span>

          <button
            onClick={refreshAll}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-dark transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw
              size={16}
              className={`mr-2 ${isLoading ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border-secondary">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeTab === tab.key
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-caption hover:text-heading hover:border-gray-300'
              }`}
            >
              <tab.icon size={16} className="mr-2" />
              {tab.label}
              {tab.key === 'alerts' && criticalAlerts.length > 0 && (
                <span className="ml-2 bg-red-400 text-white text-xs rounded-full px-2 py-0.5">
                  {criticalAlerts.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Health Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Overall Health"
              value={healthSummary?.score || 0}
              unit="%"
              icon={Activity}
              status={overallStatus}
              description="System health score"
            />

            <MetricCard
              title="Services Online"
              value={`${healthSummary?.servicesUp || 0}/${
                healthSummary?.servicesTotal || 0
              }`}
              icon={Server}
              status={
                healthSummary?.servicesUp === healthSummary?.servicesTotal
                  ? 'healthy'
                  : 'warning'
              }
              description="Active services"
            />

            <MetricCard
              title="Response Time"
              value={healthSummary?.responseTime || 0}
              unit="ms"
              icon={Zap}
              status={healthSummary?.responseTime < 200 ? 'healthy' : 'warning'}
              description="Average response time"
            />

            <MetricCard
              title="Error Rate"
              value={(healthSummary?.errorRate * 100 || 0).toFixed(2)}
              unit="%"
              icon={AlertTriangle}
              status={healthSummary?.errorRate < 0.01 ? 'healthy' : 'warning'}
              description="Request error rate"
            />
          </div>

          {/* Resource Usage Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-surface-elevated rounded-lg border border-border-secondary p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-heading font-medium text-sm">CPU Usage</h3>
                <Cpu size={16} className="text-blue-400" />
              </div>
              <ProgressBar
                value={systemMetrics?.cpu?.usage || 0}
                color="blue"
                className="mb-2"
              />
              <p className="text-caption text-xs">
                {systemMetrics?.cpu?.cores || 0} cores,{' '}
                {systemMetrics?.cpu?.temperature || 0}°C
              </p>
            </div>

            <div className="bg-surface-elevated rounded-lg border border-border-secondary p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-heading font-medium text-sm">Memory</h3>
                <MemoryStick size={16} className="text-green-400" />
              </div>
              <ProgressBar
                value={systemMetrics?.memory?.usage || 0}
                color="green"
                className="mb-2"
              />
              <p className="text-caption text-xs">
                {systemMetrics?.memory?.used || 0} /{' '}
                {systemMetrics?.memory?.total || 0} MB
              </p>
            </div>

            <div className="bg-surface-elevated rounded-lg border border-border-secondary p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-heading font-medium text-sm">Disk Usage</h3>
                <HardDrive size={16} className="text-purple-400" />
              </div>
              <ProgressBar
                value={systemMetrics?.disk?.usage || 0}
                color="purple"
                className="mb-2"
              />
              <p className="text-caption text-xs">
                {systemMetrics?.disk?.used || 0} /{' '}
                {systemMetrics?.disk?.total || 0} GB
              </p>
            </div>

            <div className="bg-surface-elevated rounded-lg border border-border-secondary p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-heading font-medium text-sm">Network</h3>
                <Network size={16} className="text-orange-400" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-caption">In:</span>
                  <span className="text-heading">
                    {systemMetrics?.network?.inbound || 0} MB/s
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-caption">Out:</span>
                  <span className="text-heading">
                    {systemMetrics?.network?.outbound || 0} MB/s
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6 shadow-sm">
              <h3 className="text-heading text-lg font-semibold mb-4">
                CPU Usage Trend (24h)
              </h3>
              <SimpleChart data={historicalData} dataKey="cpu" color="blue" />
            </div>

            <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6 shadow-sm">
              <h3 className="text-heading text-lg font-semibold mb-4">
                Memory Usage Trend (24h)
              </h3>
              <SimpleChart
                data={historicalData}
                dataKey="memory"
                color="green"
              />
            </div>
          </div>
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          {/* Detailed Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <MetricCard
              title="CPU Load (1m)"
              value={systemMetrics?.cpu?.load?.oneMin || 0}
              icon={Cpu}
              status="healthy"
              description="1-minute load average"
            />

            <MetricCard
              title="Disk IOPS"
              value={systemMetrics?.disk?.iops || 0}
              icon={HardDrive}
              status="healthy"
              description="Input/output operations per second"
            />

            <MetricCard
              title="Network Connections"
              value={systemMetrics?.network?.connections || 0}
              icon={Network}
              status="healthy"
              description="Active network connections"
            />
          </div>

          {/* Performance Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6 shadow-sm">
              <h3 className="text-heading text-lg font-semibold mb-4">
                Request Volume (24h)
              </h3>
              <SimpleChart
                data={historicalData}
                dataKey="requests"
                color="purple"
              />
            </div>

            <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6 shadow-sm">
              <h3 className="text-heading text-lg font-semibold mb-4">
                Error Rate (24h)
              </h3>
              <SimpleChart data={historicalData} dataKey="errors" color="red" />
            </div>
          </div>

          {/* Application Metrics */}
          {applicationMetrics && (
            <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6 shadow-sm">
              <h3 className="text-heading text-lg font-semibold mb-4">
                Application Performance
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-heading mb-1">
                    {applicationMetrics.requests?.rate || 0}/s
                  </div>
                  <div className="text-caption text-sm">Request Rate</div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-bold text-heading mb-1">
                    {applicationMetrics.response?.p95 || 0}ms
                  </div>
                  <div className="text-caption text-sm">95th Percentile</div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-bold text-heading mb-1">
                    {applicationMetrics.users?.active || 0}
                  </div>
                  <div className="text-caption text-sm">Active Users</div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-bold text-heading mb-1">
                    {applicationMetrics.users?.concurrent || 0}
                  </div>
                  <div className="text-caption text-sm">
                    Concurrent Sessions
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Services Tab */}
      {activeTab === 'services' && (
        <div className="space-y-6">
          {/* Service Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {serviceStatus.map((service) => (
              <div
                key={service.name}
                className="bg-surface-elevated rounded-lg border border-border-secondary p-4 shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-heading font-semibold">{service.name}</h3>
                  {getStatusIcon(service.status)}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-caption">Status:</span>
                    <span
                      className={`font-medium capitalize ${getStatusColor(
                        service.status
                      )}`}
                    >
                      {service.status}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-caption">Uptime:</span>
                    <span className="text-heading">
                      {service.uptime?.toFixed(2) || 0}%
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-caption">Response:</span>
                    <span className="text-heading">
                      {service.responseTime || 0}ms
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-caption">Version:</span>
                    <span className="text-heading">
                      {service.version || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Database Health */}
          {databaseHealth && (
            <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6 shadow-sm">
              <div className="flex items-center mb-4">
                <Database className="mr-2 h-5 w-5 text-brand-primary" />
                <h3 className="text-heading text-lg font-semibold">
                  Database Health
                </h3>
                {getStatusIcon(databaseHealth.status)}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <h4 className="text-heading font-medium mb-2">Connections</h4>
                  <ProgressBar
                    value={databaseHealth.connections?.active || 0}
                    max={databaseHealth.connections?.max || 100}
                    color="blue"
                    className="mb-1"
                  />
                  <p className="text-caption text-xs">
                    {databaseHealth.connections?.active || 0} /{' '}
                    {databaseHealth.connections?.max || 0}
                  </p>
                </div>

                <div>
                  <h4 className="text-heading font-medium mb-2">Performance</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-caption">Query Time:</span>
                      <span className="text-heading">
                        {databaseHealth.performance?.queryTime || 0}ms
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-caption">Cache Hit:</span>
                      <span className="text-heading">
                        {databaseHealth.performance?.cacheHitRatio || 0}%
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-heading font-medium mb-2">Storage</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-caption">Size:</span>
                      <span className="text-heading">
                        {databaseHealth.storage?.size || 0} GB
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-caption">Growth:</span>
                      <span className="text-heading">
                        {databaseHealth.storage?.growth || 0} GB/day
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-heading font-medium mb-2">Replication</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-caption">Status:</span>
                      <span
                        className={`capitalize ${getStatusColor(
                          databaseHealth.replication?.status
                        )}`}
                      >
                        {databaseHealth.replication?.status || 'unknown'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-caption">Lag:</span>
                      <span className="text-heading">
                        {databaseHealth.replication?.lag || 0}ms
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && securityMetrics && (
        <div className="space-y-6">
          {/* Security Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Threats Blocked"
              value={securityMetrics.threats?.blocked || 0}
              icon={Shield}
              status="healthy"
              description="Today"
            />

            <MetricCard
              title="Failed Logins"
              value={securityMetrics.authentication?.failed || 0}
              icon={Lock}
              status={
                securityMetrics.authentication?.failed > 10
                  ? 'warning'
                  : 'healthy'
              }
              description="Last 24 hours"
            />

            <MetricCard
              title="SSL Grade"
              value={securityMetrics.ssl?.grade || 'N/A'}
              icon={Wifi}
              status="healthy"
              description="Certificate rating"
            />

            <MetricCard
              title="Firewall Rules"
              value={securityMetrics.firewall?.rules || 0}
              icon={Shield}
              status="active"
              description="Active rules"
            />
          </div>

          {/* Threat Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6 shadow-sm">
              <h3 className="text-heading text-lg font-semibold mb-4">
                Threat Severity
              </h3>
              <div className="space-y-3">
                {securityMetrics.threats?.severity &&
                  Object.entries(securityMetrics.threats.severity).map(
                    ([level, count]) => (
                      <div
                        key={level}
                        className="flex items-center justify-between"
                      >
                        <span className="text-heading capitalize">{level}</span>
                        <div className="flex items-center space-x-3">
                          <div className="w-24 bg-surface-secondary rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                level === 'high'
                                  ? 'bg-red-400'
                                  : level === 'medium'
                                  ? 'bg-yellow-400'
                                  : 'bg-green-400'
                              }`}
                              style={{
                                width: `${Math.min((count / 20) * 100, 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-heading font-medium w-8 text-right">
                            {count}
                          </span>
                        </div>
                      </div>
                    )
                  )}
              </div>
            </div>

            <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6 shadow-sm">
              <h3 className="text-heading text-lg font-semibold mb-4">
                Authentication Activity
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-caption">Successful Logins:</span>
                  <span className="text-heading font-medium">
                    {securityMetrics.authentication?.successful || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-caption">Failed Attempts:</span>
                  <span className="text-heading font-medium">
                    {securityMetrics.authentication?.failed || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-caption">Brute Force Attempts:</span>
                  <span className="text-heading font-medium">
                    {securityMetrics.authentication?.bruteForce || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-caption">Accounts Locked:</span>
                  <span className="text-heading font-medium">
                    {securityMetrics.authentication?.locked || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-6">
          {alerts.length === 0 ? (
            <div className="bg-surface-elevated rounded-lg border border-border-secondary p-8 shadow-sm text-center">
              <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-heading text-lg font-semibold mb-2">
                No Active Alerts
              </h3>
              <p className="text-caption">
                All systems are operating normally.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`bg-surface-elevated rounded-lg border p-4 shadow-sm ${
                    alert.severity === 'critical'
                      ? 'border-red-400 bg-red-400/5'
                      : alert.severity === 'warning'
                      ? 'border-yellow-400 bg-yellow-400/5'
                      : 'border-blue-400 bg-blue-400/5'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {alert.severity === 'critical' && (
                        <AlertCircle className="text-red-400 mt-1" size={20} />
                      )}
                      {alert.severity === 'warning' && (
                        <AlertTriangle
                          className="text-yellow-400 mt-1"
                          size={20}
                        />
                      )}
                      {alert.severity === 'info' && (
                        <AlertCircle className="text-blue-400 mt-1" size={20} />
                      )}

                      <div>
                        <h4 className="text-heading font-semibold">
                          {alert.title}
                        </h4>
                        <p className="text-caption text-sm mt-1">
                          {alert.message}
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-caption">
                          <span>Type: {alert.type}</span>
                          <span>Threshold: {alert.threshold}</span>
                          <span>Current: {alert.currentValue}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          alert.severity === 'critical'
                            ? 'bg-red-400 text-white'
                            : alert.severity === 'warning'
                            ? 'bg-yellow-400 text-gray-900'
                            : 'bg-blue-400 text-white'
                        }`}
                      >
                        {alert.severity.toUpperCase()}
                      </span>
                      <div className="text-caption text-xs mt-1">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Real-time indicator */}
      <div className="text-center text-caption text-sm">
        <div className="flex items-center justify-center space-x-2">
          <Zap size={12} className="text-green-400" />
          <span>Live monitoring • Updates every 10 seconds</span>
          <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
};

export default SystemHealthDashboard;
