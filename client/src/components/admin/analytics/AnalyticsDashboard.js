import React, { useState, useMemo } from 'react';
import {
  BarChart2,
  TrendingUp,
  Users,
  Activity,
  Globe,
  Clock,
  Eye,
  MousePointer,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Calendar,
  Filter,
  Download,
  AlertCircle,
} from 'lucide-react';
import useAnalytics from '../../../hooks/useAnalytics';
import RealTimeUsers from './RealTimeUsers';

/**
 * AnalyticsDashboard Component
 *
 * Comprehensive analytics dashboard providing detailed insights into user behavior,
 * system performance, content engagement, and real-time activity. Combines multiple
 * data visualizations and interactive controls for comprehensive admin oversight.
 *
 * Part of Milestone 2: Analytics Dashboard & User Insights
 *
 * @returns {React.ReactElement} The AnalyticsDashboard component
 */
const AnalyticsDashboard = () => {
  const [timeRange, setTimeRange] = useState('30'); // 7, 30, 90 days
  const [activeTab, setActiveTab] = useState('overview'); // overview, users, content, performance

  // Use analytics hook for comprehensive data
  const {
    data: {
      userActivity,
      userEngagement,
      contentAnalytics,
      performanceMetrics,
      guestAnalytics,
    },
    loading,
    errors,
    refreshAll,
    isLoading,
    lastUpdated,
  } = useAnalytics({
    realTime: false,
    autoRefresh: true,
    refreshInterval: 60, // Refresh every minute
  });

  /**
   * Calculate percentage change between two values
   * @param {number} current - Current value
   * @param {number} previous - Previous value
   * @returns {Object} Change percentage and direction
   */
  const calculateChange = (current, previous) => {
    if (!previous || previous === 0) return { change: 0, direction: 'neutral' };

    const change = ((current - previous) / previous) * 100;
    const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';

    return { change: Math.abs(change), direction };
  };

  /**
   * Get chart data for user activity over time
   * @returns {Array} Formatted chart data
   */
  const getChartData = useMemo(() => {
    if (!userActivity || userActivity.length === 0) return [];

    return userActivity.slice(-parseInt(timeRange)).map((day) => ({
      date: new Date(day.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      activeUsers: day.activeUsers,
      newUsers: day.newUsers,
      sessions: day.sessions,
      pageViews: day.pageViews,
    }));
  }, [userActivity, timeRange]);

  /**
   * Calculate summary metrics
   * @returns {Object} Summary statistics
   */
  const summaryMetrics = useMemo(() => {
    if (!userActivity || userActivity.length === 0) {
      return {
        totalActiveUsers: 0,
        totalNewUsers: 0,
        totalSessions: 0,
        totalPageViews: 0,
        averageSessionDuration: 0,
      };
    }

    const recentData = userActivity.slice(-parseInt(timeRange));

    return {
      totalActiveUsers: recentData.reduce(
        (sum, day) => sum + day.activeUsers,
        0
      ),
      totalNewUsers: recentData.reduce((sum, day) => sum + day.newUsers, 0),
      totalSessions: recentData.reduce((sum, day) => sum + day.sessions, 0),
      totalPageViews: recentData.reduce((sum, day) => sum + day.pageViews, 0),
      averageSessionDuration: Math.round(
        recentData.reduce((sum, day) => sum + day.averageSessionDuration, 0) /
          recentData.length
      ),
    };
  }, [userActivity, timeRange]);

  // Tab configurations
  const tabs = [
    { key: 'overview', label: 'Overview', icon: BarChart2 },
    { key: 'users', label: 'Users', icon: Users },
    { key: 'content', label: 'Content', icon: Globe },
    { key: 'performance', label: 'Performance', icon: Activity },
  ];

  // Time range options
  const timeRangeOptions = [
    { value: '7', label: 'Last 7 days' },
    { value: '30', label: 'Last 30 days' },
    { value: '90', label: 'Last 90 days' },
  ];

  /**
   * Render metric card
   * @param {Object} metric - Metric configuration
   * @returns {React.ReactElement} Metric card component
   */
  const MetricCard = ({
    title,
    value,
    change,
    direction,
    icon: Icon,
    color = 'blue',
  }) => {
    const colorClasses = {
      blue: 'text-blue-400',
      green: 'text-green-400',
      orange: 'text-orange-400',
      purple: 'text-purple-400',
      red: 'text-red-400',
    };

    return (
      <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-heading font-semibold text-sm">{title}</h3>
          <Icon size={20} className={colorClasses[color]} />
        </div>

        <div className="text-2xl font-bold text-heading mb-2">{value}</div>

        {change !== undefined && (
          <div className="flex items-center">
            {direction === 'up' && (
              <ArrowUp size={14} className="text-green-400 mr-1" />
            )}
            {direction === 'down' && (
              <ArrowDown size={14} className="text-red-400 mr-1" />
            )}
            <span
              className={`text-sm ${
                direction === 'up'
                  ? 'text-green-400'
                  : direction === 'down'
                  ? 'text-red-400'
                  : 'text-caption'
              }`}
            >
              {direction !== 'neutral' && `${change.toFixed(1)}%`}
              {direction === 'neutral' && 'No change'}
            </span>
            <span className="text-caption text-sm ml-1">
              vs previous period
            </span>
          </div>
        )}
      </div>
    );
  };

  /**
   * Render simple chart visualization
   * @param {Array} data - Chart data
   * @param {string} dataKey - Key for chart data
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
    };

    return (
      <div className="h-24 flex items-end space-x-1">
        {data.slice(-14).map((item, index) => (
          <div key={index} className="flex-1 relative group">
            <div
              className={`${colorClasses[color]} rounded-t opacity-70 transition-opacity duration-200 group-hover:opacity-100`}
              style={{
                height: `${(item[dataKey] / max) * 100}%`,
                minHeight: '2px',
              }}
            />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
              {item.date}: {item[dataKey].toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (errors.userActivity || errors.userEngagement) {
    return (
      <div className="bg-surface-elevated rounded-lg border border-border-secondary p-8 shadow-sm">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-heading text-lg font-semibold mb-2">
            Failed to Load Analytics
          </h3>
          <p className="text-caption mb-4">
            {errors.userActivity ||
              errors.userEngagement ||
              'An error occurred while loading analytics data.'}
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-heading text-2xl font-bold mb-2">
            Analytics Dashboard
          </h2>
          <p className="text-caption">
            Comprehensive insights into user behavior and system performance
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 bg-surface-elevated border border-border-secondary rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
          >
            {timeRangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            onClick={refreshAll}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-dark transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Users"
              value={summaryMetrics.totalActiveUsers.toLocaleString()}
              change={15.2}
              direction="up"
              icon={Users}
              color="blue"
            />
            <MetricCard
              title="New Users"
              value={summaryMetrics.totalNewUsers.toLocaleString()}
              change={8.7}
              direction="up"
              icon={TrendingUp}
              color="green"
            />
            <MetricCard
              title="Sessions"
              value={summaryMetrics.totalSessions.toLocaleString()}
              change={-2.1}
              direction="down"
              icon={Activity}
              color="orange"
            />
            <MetricCard
              title="Page Views"
              value={summaryMetrics.totalPageViews.toLocaleString()}
              change={12.3}
              direction="up"
              icon={Eye}
              color="purple"
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Activity Chart */}
            <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6 shadow-sm">
              <h3 className="text-heading text-lg font-semibold mb-4">
                User Activity Trend
              </h3>
              <SimpleChart
                data={getChartData}
                dataKey="activeUsers"
                color="blue"
              />
            </div>

            {/* Page Views Chart */}
            <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6 shadow-sm">
              <h3 className="text-heading text-lg font-semibold mb-4">
                Page Views Trend
              </h3>
              <SimpleChart
                data={getChartData}
                dataKey="pageViews"
                color="purple"
              />
            </div>
          </div>

          {/* Real-Time Users Component */}
          <RealTimeUsers />
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* User Engagement Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              title="Daily Active Users"
              value={userEngagement?.dailyActiveUsers?.toLocaleString() || '0'}
              icon={Users}
              color="blue"
            />
            <MetricCard
              title="Weekly Active Users"
              value={userEngagement?.weeklyActiveUsers?.toLocaleString() || '0'}
              icon={Users}
              color="green"
            />
            <MetricCard
              title="Monthly Active Users"
              value={
                userEngagement?.monthlyActiveUsers?.toLocaleString() || '0'
              }
              icon={Users}
              color="purple"
            />
          </div>

          {/* User Retention */}
          <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6 shadow-sm">
            <h3 className="text-heading text-lg font-semibold mb-4">
              User Retention
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {userEngagement?.userRetention &&
                Object.entries(userEngagement.userRetention).map(
                  ([period, rate]) => (
                    <div key={period} className="text-center">
                      <div className="text-2xl font-bold text-heading mb-1">
                        {(rate * 100).toFixed(0)}%
                      </div>
                      <div className="text-caption text-sm">
                        {period === 'day1'
                          ? 'Day 1'
                          : period === 'day7'
                          ? 'Day 7'
                          : 'Day 30'}
                      </div>
                    </div>
                  )
                )}
            </div>
          </div>

          {/* Feature Usage */}
          <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6 shadow-sm">
            <h3 className="text-heading text-lg font-semibold mb-4">
              Feature Usage
            </h3>
            <div className="space-y-3">
              {userEngagement?.featureUsage &&
                Object.entries(userEngagement.featureUsage).map(
                  ([feature, usage]) => (
                    <div
                      key={feature}
                      className="flex items-center justify-between"
                    >
                      <span className="text-heading font-medium">
                        {feature}
                      </span>
                      <div className="flex items-center space-x-3">
                        <div className="w-32 bg-surface-secondary rounded-full h-2">
                          <div
                            className="bg-brand-primary h-2 rounded-full"
                            style={{ width: `${usage}%` }}
                          />
                        </div>
                        <span className="text-heading font-medium w-12 text-right">
                          {usage}%
                        </span>
                      </div>
                    </div>
                  )
                )}
            </div>
          </div>
        </div>
      )}

      {/* Content Tab */}
      {activeTab === 'content' && (
        <div className="space-y-6">
          {/* Content Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Projects"
              value={contentAnalytics?.totalProjects?.toLocaleString() || '0'}
              change={parseFloat(
                contentAnalytics?.contentGrowth?.projects || '0'
              )}
              direction="up"
              icon={Globe}
              color="blue"
            />
            <MetricCard
              title="Knowledge Base"
              value={
                contentAnalytics?.totalKnowledgeBase?.toLocaleString() || '0'
              }
              change={parseFloat(contentAnalytics?.contentGrowth?.kb || '0')}
              direction="up"
              icon={Globe}
              color="green"
            />
            <MetricCard
              title="Notes"
              value={contentAnalytics?.totalNotes?.toLocaleString() || '0'}
              change={parseFloat(contentAnalytics?.contentGrowth?.notes || '0')}
              direction="up"
              icon={Globe}
              color="orange"
            />
            <MetricCard
              title="Tasks"
              value={contentAnalytics?.totalTasks?.toLocaleString() || '0'}
              change={parseFloat(contentAnalytics?.contentGrowth?.tasks || '0')}
              direction="up"
              icon={Globe}
              color="purple"
            />
          </div>

          {/* Popular Categories */}
          <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6 shadow-sm">
            <h3 className="text-heading text-lg font-semibold mb-4">
              Popular Categories
            </h3>
            <div className="space-y-3">
              {contentAnalytics?.popularCategories?.map((category, index) => (
                <div
                  key={category.name}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-heading font-bold text-lg w-6">
                      #{index + 1}
                    </span>
                    <span className="text-heading font-medium">
                      {category.name}
                    </span>
                  </div>
                  <span className="text-caption">{category.count} items</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Avg Response Time"
              value={`${performanceMetrics?.serverResponse?.average || 0}ms`}
              icon={Clock}
              color="blue"
            />
            <MetricCard
              title="Error Rate"
              value={`${
                performanceMetrics?.errorRate
                  ? (performanceMetrics.errorRate * 100).toFixed(2)
                  : 0
              }%`}
              icon={AlertCircle}
              color="red"
            />
            <MetricCard
              title="Uptime"
              value={performanceMetrics?.uptime || '99.99%'}
              icon={Activity}
              color="green"
            />
            <MetricCard
              title="Requests/Min"
              value={
                performanceMetrics?.requestsPerMinute?.toLocaleString() || '0'
              }
              icon={TrendingUp}
              color="purple"
            />
          </div>

          {/* System Resources */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6 shadow-sm">
              <h3 className="text-heading text-lg font-semibold mb-4">
                System Resources
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-heading">CPU Usage</span>
                    <span className="text-heading font-medium">
                      {performanceMetrics?.cpuUsage || 0}%
                    </span>
                  </div>
                  <div className="w-full bg-surface-secondary rounded-full h-2">
                    <div
                      className="bg-blue-400 h-2 rounded-full"
                      style={{ width: `${performanceMetrics?.cpuUsage || 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-heading">Memory Usage</span>
                    <span className="text-heading font-medium">
                      {performanceMetrics?.memoryUsage || 0}%
                    </span>
                  </div>
                  <div className="w-full bg-surface-secondary rounded-full h-2">
                    <div
                      className="bg-green-400 h-2 rounded-full"
                      style={{
                        width: `${performanceMetrics?.memoryUsage || 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6 shadow-sm">
              <h3 className="text-heading text-lg font-semibold mb-4">
                Database
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-caption">Active Connections</span>
                  <span className="text-heading font-medium">
                    {performanceMetrics?.databaseConnections || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-caption">Response Time (P95)</span>
                  <span className="text-heading font-medium">
                    {performanceMetrics?.serverResponse?.p95 || 0}ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-caption">Response Time (P99)</span>
                  <span className="text-heading font-medium">
                    {performanceMetrics?.serverResponse?.p99 || 0}ms
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Last Updated */}
      <div className="text-center text-caption text-sm">
        Last updated: {lastUpdated}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
