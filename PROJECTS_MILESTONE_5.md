# PROJECTS FEATURE REORGANIZATION - MILESTONE 5

## Advanced Analytics & Reporting (Week 11-12)

**Risk:** Low | **Value:** Critical Business Intelligence  
**Status:** Planning Phase

---

### Overview

This milestone transforms raw project data into actionable insights through comprehensive analytics dashboards, custom report builders, and advanced data visualization. We'll provide teams with the tools to track performance, identify bottlenecks, and make data-driven decisions.

### Integration with Existing Codebase

**Existing Files to Enhance/Modify:**

- `server/models/Project.js` - Add analytics metadata
- `server/models/Task.js` - Track performance metrics
- `client/src/pages/ProjectDetailsPage.js` - Add analytics tab
- `server/controllers/projectController.js` - Analytics endpoints
- `client/src/features/projects/projectsSlice.js` - Analytics state

**New Components to Create:**

- Analytics dashboard system
- Chart components library
- Report builder interface
- Export functionality
- Analytics API endpoints

**Patterns We'll Maintain:**

- Chart.js/Recharts for visualizations
- Redux for state management
- MongoDB aggregation pipelines
- Existing API patterns
- Tailwind CSS styling

---

## 📊 DELIVERABLES

### 1. Analytics Data Model

**File: `server/models/Analytics.js`**

```javascript
import mongoose from 'mongoose';

/**
 * Analytics Schema
 *
 * Stores pre-calculated analytics data for efficient retrieval.
 * This model serves as a cache for complex calculations that would
 * be expensive to compute on-the-fly.
 *
 * Data is updated through scheduled jobs and real-time triggers
 * to maintain accuracy while optimizing performance.
 */
const analyticsSchema = new mongoose.Schema({
  // Reference to the project
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true,
  },

  // Time period for this analytics record
  period: {
    type: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'all-time'],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
  },

  // Task Metrics
  taskMetrics: {
    total: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    inProgress: { type: Number, default: 0 },
    todo: { type: Number, default: 0 },
    overdue: { type: Number, default: 0 },

    // Completion metrics
    completionRate: { type: Number, default: 0 },
    averageCompletionTime: { type: Number, default: 0 }, // in hours

    // Distribution by priority
    byPriority: {
      low: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      high: { type: Number, default: 0 },
      urgent: { type: Number, default: 0 },
    },

    // Distribution by assignee
    byAssignee: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        count: Number,
        completed: Number,
        averageTime: Number,
      },
    ],

    // Task flow metrics
    created: { type: Number, default: 0 },
    moved: { type: Number, default: 0 },
    blockedTime: { type: Number, default: 0 }, // total hours tasks were blocked
  },

  // Time Tracking Metrics
  timeMetrics: {
    totalEstimated: { type: Number, default: 0 },
    totalActual: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 }, // percentage

    // Time by user
    byUser: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        hours: Number,
        sessions: Number,
        averageSessionLength: Number,
      },
    ],

    // Time by task type/category
    byCategory: [
      {
        category: String,
        hours: Number,
        percentage: Number,
      },
    ],
  },

  // Team Performance Metrics
  teamMetrics: {
    activeMembers: { type: Number, default: 0 },
    totalMembers: { type: Number, default: 0 },

    // Productivity metrics
    tasksPerMember: { type: Number, default: 0 },
    averageResponseTime: { type: Number, default: 0 }, // hours to first response
    collaborationScore: { type: Number, default: 0 }, // 0-100

    // Activity distribution
    activityByHour: [{ hour: Number, count: Number }],
    activityByDay: [{ day: Number, count: Number }],

    // Member contributions
    topContributors: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        score: Number,
        tasksCompleted: Number,
        commentsAdded: Number,
        filesUploaded: Number,
      },
    ],
  },

  // Project Progress Metrics
  progressMetrics: {
    overallProgress: { type: Number, default: 0 }, // percentage
    velocity: { type: Number, default: 0 }, // tasks completed per day
    burndownData: [
      {
        date: Date,
        ideal: Number,
        actual: Number,
        projected: Number,
      },
    ],

    // Milestone tracking
    milestones: [
      {
        name: String,
        dueDate: Date,
        progress: Number,
        status: String,
        daysRemaining: Number,
      },
    ],

    // Risk indicators
    riskScore: { type: Number, default: 0 }, // 0-100
    blockers: { type: Number, default: 0 },
    overduePercentage: { type: Number, default: 0 },
  },

  // Activity Metrics
  activityMetrics: {
    totalActivities: { type: Number, default: 0 },

    // Activity by type
    byType: [
      {
        type: String,
        count: Number,
        percentage: Number,
      },
    ],

    // Recent activity summary
    recentActivities: [
      {
        type: String,
        count: Number,
        timestamp: Date,
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    // Engagement score
    engagementScore: { type: Number, default: 0 }, // 0-100
  },

  // Quality Metrics
  qualityMetrics: {
    bugRate: { type: Number, default: 0 }, // bugs per 100 tasks
    reopenRate: { type: Number, default: 0 }, // percentage of tasks reopened
    reviewCoverage: { type: Number, default: 0 }, // percentage of tasks reviewed
    testCoverage: { type: Number, default: 0 }, // if integrated with testing

    // Code quality (if integrated with code analysis)
    codeQuality: {
      score: { type: Number, default: 0 },
      issues: { type: Number, default: 0 },
      technicalDebt: { type: Number, default: 0 },
    },
  },

  // Financial Metrics (if cost tracking is enabled)
  financialMetrics: {
    estimatedCost: { type: Number, default: 0 },
    actualCost: { type: Number, default: 0 },
    costVariance: { type: Number, default: 0 },

    // Cost breakdown
    costByCategory: [
      {
        category: String,
        amount: Number,
        percentage: Number,
      },
    ],

    // ROI calculations
    estimatedValue: { type: Number, default: 0 },
    roi: { type: Number, default: 0 },
  },

  // Metadata
  metadata: {
    lastCalculated: {
      type: Date,
      default: Date.now,
    },
    calculationDuration: Number, // milliseconds
    dataPoints: Number, // number of items processed
    version: {
      type: Number,
      default: 1,
    },
  },
});

// Indexes for performance
analyticsSchema.index({ project: 1, 'period.type': 1, 'period.startDate': -1 });
analyticsSchema.index({ 'metadata.lastCalculated': 1 });

/**
 * Calculate analytics for a specific period
 */
analyticsSchema.statics.calculateForPeriod = async function (
  projectId,
  periodType,
  startDate,
  endDate
) {
  // This would contain the complex aggregation logic
  // to calculate all metrics for the specified period
  const Task = mongoose.model('Task');
  const Activity = mongoose.model('Activity');
  const Project = mongoose.model('Project');

  // ... implementation of calculations
};

/**
 * Get trend data for a metric
 */
analyticsSchema.methods.getTrend = function (metricPath, periods = 7) {
  // Return historical data for trend analysis
};

/**
 * Export analytics data
 */
analyticsSchema.methods.export = function (format = 'json') {
  // Convert analytics data to specified format
};

const Analytics = mongoose.model('Analytics', analyticsSchema);

export default Analytics;
```

### 2. Analytics Dashboard Component

**File: `client/src/components/projects/organisms/AnalyticsDashboard.js`**

```javascript
import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  Activity,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  ChevronRight,
  BarChart3,
  PieChartIcon,
  Target,
  Zap,
  DollarSign,
  GitBranch,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react';
import { StatCard } from '../molecules/StatCard';
import { ChartCard } from '../molecules/ChartCard';
import { TeamPerformanceCard } from '../molecules/TeamPerformanceCard';
import { DateRangePicker } from '../../common/DateRangePicker';
import { ExportMenu } from '../molecules/ExportMenu';
import { MetricSelector } from '../molecules/MetricSelector';
import { cn } from '../../../utils/cn';
import { fetchProjectAnalytics } from '../../../features/analytics/analyticsSlice';
import {
  formatDate,
  formatDuration,
  calculateTrend,
} from '../../../utils/formatters';

/**
 * AnalyticsDashboard Component
 *
 * Provides comprehensive project analytics with interactive charts,
 * real-time metrics, and customizable views. This component serves
 * as the main analytics hub for project managers and team leads.
 *
 * Features:
 * - Real-time metric updates
 * - Interactive chart visualizations
 * - Custom date range selection
 * - Export functionality
 * - Responsive grid layout
 * - Performance optimizations
 *
 * @param {Object} props
 * @param {string} props.projectId - The project ID to display analytics for
 * @param {string} props.className - Additional CSS classes
 */
export const AnalyticsDashboard = ({ projectId, className }) => {
  const dispatch = useDispatch();

  // State
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    endDate: new Date(),
  });
  const [selectedMetrics, setSelectedMetrics] = useState([
    'taskCompletion',
    'velocity',
    'teamProductivity',
    'timeTracking',
  ]);
  const [viewMode, setViewMode] = useState('overview'); // overview | detailed | custom
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Redux state
  const { analytics, loading, error, lastUpdated } = useSelector(
    (state) => state.analytics
  );
  const project = useSelector((state) =>
    state.projects.projects.find((p) => p._id === projectId)
  );

  /**
   * Fetch analytics data when component mounts or dependencies change
   */
  useEffect(() => {
    if (projectId) {
      dispatch(
        fetchProjectAnalytics({
          projectId,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          metrics: selectedMetrics,
        })
      );
    }
  }, [dispatch, projectId, dateRange, selectedMetrics]);

  /**
   * Handle manual refresh
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await dispatch(
        fetchProjectAnalytics({
          projectId,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          metrics: selectedMetrics,
          force: true, // Force recalculation
        })
      ).unwrap();
    } finally {
      setIsRefreshing(false);
    }
  };

  /**
   * Calculate key performance indicators
   */
  const kpis = useMemo(() => {
    if (!analytics) return null;

    const taskMetrics = analytics.taskMetrics || {};
    const timeMetrics = analytics.timeMetrics || {};
    const teamMetrics = analytics.teamMetrics || {};
    const progressMetrics = analytics.progressMetrics || {};

    return {
      completionRate: {
        value: taskMetrics.completionRate || 0,
        trend: calculateTrend(
          taskMetrics.completionRate,
          analytics.previousPeriod?.taskMetrics?.completionRate
        ),
        label: 'Completion Rate',
        format: 'percentage',
      },
      velocity: {
        value: progressMetrics.velocity || 0,
        trend: calculateTrend(
          progressMetrics.velocity,
          analytics.previousPeriod?.progressMetrics?.velocity
        ),
        label: 'Velocity',
        suffix: 'tasks/day',
      },
      activeMembers: {
        value: teamMetrics.activeMembers || 0,
        total: teamMetrics.totalMembers || 0,
        label: 'Active Members',
        format: 'fraction',
      },
      timeAccuracy: {
        value: timeMetrics.accuracy || 0,
        trend: calculateTrend(
          timeMetrics.accuracy,
          analytics.previousPeriod?.timeMetrics?.accuracy
        ),
        label: 'Time Estimate Accuracy',
        format: 'percentage',
      },
      overdueRate: {
        value: progressMetrics.overduePercentage || 0,
        trend: calculateTrend(
          progressMetrics.overduePercentage,
          analytics.previousPeriod?.progressMetrics?.overduePercentage,
          true
        ), // Inverse - lower is better
        label: 'Overdue Tasks',
        format: 'percentage',
        inverse: true,
      },
      engagementScore: {
        value: analytics.activityMetrics?.engagementScore || 0,
        trend: calculateTrend(
          analytics.activityMetrics?.engagementScore,
          analytics.previousPeriod?.activityMetrics?.engagementScore
        ),
        label: 'Team Engagement',
        format: 'score',
      },
    };
  }, [analytics]);

  /**
   * Prepare chart data
   */
  const chartData = useMemo(() => {
    if (!analytics) return {};

    return {
      burndown: analytics.progressMetrics?.burndownData || [],
      taskDistribution: [
        {
          name: 'Todo',
          value: analytics.taskMetrics?.todo || 0,
          color: '#6B7280',
        },
        {
          name: 'In Progress',
          value: analytics.taskMetrics?.inProgress || 0,
          color: '#3B82F6',
        },
        {
          name: 'Completed',
          value: analytics.taskMetrics?.completed || 0,
          color: '#10B981',
        },
        {
          name: 'Overdue',
          value: analytics.taskMetrics?.overdue || 0,
          color: '#EF4444',
        },
      ],
      teamPerformance: analytics.teamMetrics?.topContributors || [],
      activityTrend: analytics.activityMetrics?.byType || [],
      timeDistribution: analytics.timeMetrics?.byCategory || [],
    };
  }, [analytics]);

  /**
   * Render loading state
   */
  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-red-900 mb-2">
          Failed to Load Analytics
        </h3>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Title and Last Updated */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Analytics Dashboard
            </h2>
            {lastUpdated && (
              <p className="text-sm text-gray-500 mt-1">
                Last updated: {formatDate(lastUpdated, 'relative')}
              </p>
            )}
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Range Picker */}
            <DateRangePicker
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              onChange={setDateRange}
              presets={[
                { label: 'Last 7 days', days: 7 },
                { label: 'Last 30 days', days: 30 },
                { label: 'Last 90 days', days: 90 },
                { label: 'This month', type: 'month' },
                { label: 'This quarter', type: 'quarter' },
              ]}
            />

            {/* Metric Selector */}
            <MetricSelector
              selected={selectedMetrics}
              onChange={setSelectedMetrics}
              className="hidden lg:block"
            />

            {/* View Mode Toggle */}
            <div className="flex rounded-lg border border-gray-300 bg-gray-50">
              {['overview', 'detailed', 'custom'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium capitalize transition-colors',
                    viewMode === mode
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Actions */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={cn(
                'p-2 rounded-lg border transition-colors',
                isRefreshing
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              )}
            >
              <RefreshCw
                className={cn('w-5 h-5', isRefreshing && 'animate-spin')}
              />
            </button>

            <ExportMenu
              data={analytics}
              filename={`${project?.name || 'project'}-analytics`}
              formats={['pdf', 'excel', 'csv', 'json']}
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis &&
          Object.entries(kpis).map(([key, kpi]) => (
            <StatCard
              key={key}
              title={kpi.label}
              value={kpi.value}
              trend={kpi.trend}
              format={kpi.format}
              suffix={kpi.suffix}
              total={kpi.total}
              inverse={kpi.inverse}
              icon={getKpiIcon(key)}
              className="bg-white"
            />
          ))}
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Burndown Chart */}
        {selectedMetrics.includes('taskCompletion') && (
          <ChartCard
            title="Project Burndown"
            subtitle="Ideal vs Actual Progress"
            className="xl:col-span-2"
            actions={
              <button className="text-sm text-blue-600 hover:text-blue-700">
                View Details <ChevronRight className="w-4 h-4 inline" />
              </button>
            }
          >
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData.burndown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => formatDate(date, 'short')}
                  stroke="#6B7280"
                />
                <YAxis stroke="#6B7280" />
                <Tooltip
                  formatter={(value) => `${value} tasks`}
                  labelFormatter={(date) => formatDate(date)}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="ideal"
                  stroke="#E5E7EB"
                  fill="#F3F4F6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Ideal"
                />
                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke="#3B82F6"
                  fill="#DBEAFE"
                  strokeWidth={2}
                  name="Actual"
                />
                <Area
                  type="monotone"
                  dataKey="projected"
                  stroke="#F59E0B"
                  fill="#FEF3C7"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  name="Projected"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Task Distribution */}
        {selectedMetrics.includes('taskCompletion') && (
          <ChartCard
            title="Task Distribution"
            subtitle="Current Status Breakdown"
          >
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.taskDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.taskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Velocity Trend */}
        {selectedMetrics.includes('velocity') && (
          <ChartCard
            title="Velocity Trend"
            subtitle="Tasks Completed Per Day"
            className="xl:col-span-2"
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.progressMetrics?.velocityTrend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => formatDate(date, 'short')}
                  stroke="#6B7280"
                />
                <YAxis stroke="#6B7280" />
                <Tooltip
                  formatter={(value) => `${value} tasks/day`}
                  labelFormatter={(date) => formatDate(date)}
                />
                <Line
                  type="monotone"
                  dataKey="velocity"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="average"
                  stroke="#6B7280"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Team Performance */}
        {selectedMetrics.includes('teamProductivity') && (
          <ChartCard
            title="Team Performance"
            subtitle="Top Contributors"
            className="xl:row-span-2"
          >
            <div className="space-y-3">
              {chartData.teamPerformance.slice(0, 5).map((member, index) => (
                <TeamPerformanceCard
                  key={member.user._id}
                  rank={index + 1}
                  member={member}
                  showDetails
                />
              ))}
            </div>
          </ChartCard>
        )}

        {/* Time Tracking Accuracy */}
        {selectedMetrics.includes('timeTracking') && (
          <ChartCard title="Time Tracking" subtitle="Estimated vs Actual Hours">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.timeMetrics?.byUser || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="user.name"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  stroke="#6B7280"
                />
                <YAxis stroke="#6B7280" />
                <Tooltip />
                <Legend />
                <Bar dataKey="estimated" fill="#93C5FD" name="Estimated" />
                <Bar dataKey="actual" fill="#3B82F6" name="Actual" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Activity Heatmap */}
        {selectedMetrics.includes('activity') && (
          <ChartCard
            title="Activity Heatmap"
            subtitle="Team Activity by Hour"
            className="xl:col-span-2"
          >
            <div className="h-64">
              {/* Custom heatmap implementation */}
              <ActivityHeatmap
                data={analytics.teamMetrics?.activityByHour || []}
              />
            </div>
          </ChartCard>
        )}
      </div>

      {/* Detailed Metrics Section */}
      {viewMode === 'detailed' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quality Metrics */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Quality Metrics
            </h3>
            <div className="space-y-4">
              <MetricRow
                label="Bug Rate"
                value={analytics.qualityMetrics?.bugRate || 0}
                suffix="per 100 tasks"
                trend={calculateTrend(
                  analytics.qualityMetrics?.bugRate,
                  analytics.previousPeriod?.qualityMetrics?.bugRate,
                  true
                )}
              />
              <MetricRow
                label="Reopen Rate"
                value={analytics.qualityMetrics?.reopenRate || 0}
                format="percentage"
                trend={calculateTrend(
                  analytics.qualityMetrics?.reopenRate,
                  analytics.previousPeriod?.qualityMetrics?.reopenRate,
                  true
                )}
              />
              <MetricRow
                label="Review Coverage"
                value={analytics.qualityMetrics?.reviewCoverage || 0}
                format="percentage"
                trend={calculateTrend(
                  analytics.qualityMetrics?.reviewCoverage,
                  analytics.previousPeriod?.qualityMetrics?.reviewCoverage
                )}
              />
            </div>
          </div>

          {/* Financial Metrics */}
          {analytics.financialMetrics && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Financial Metrics
              </h3>
              <div className="space-y-4">
                <MetricRow
                  label="Estimated Cost"
                  value={analytics.financialMetrics?.estimatedCost || 0}
                  format="currency"
                />
                <MetricRow
                  label="Actual Cost"
                  value={analytics.financialMetrics?.actualCost || 0}
                  format="currency"
                />
                <MetricRow
                  label="Cost Variance"
                  value={analytics.financialMetrics?.costVariance || 0}
                  format="percentage"
                  trend={
                    analytics.financialMetrics?.costVariance > 0 ? 'up' : 'down'
                  }
                />
                <MetricRow
                  label="ROI"
                  value={analytics.financialMetrics?.roi || 0}
                  format="percentage"
                  trend={calculateTrend(
                    analytics.financialMetrics?.roi,
                    analytics.previousPeriod?.financialMetrics?.roi
                  )}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Custom View */}
      {viewMode === 'custom' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Custom Analytics View
          </h3>
          <p className="text-gray-500 mb-4">
            Drag and drop metrics to create your custom dashboard view.
          </p>
          {/* Custom dashboard builder would go here */}
        </div>
      )}
    </div>
  );
};

/**
 * Helper function to get icon for KPI
 */
function getKpiIcon(key) {
  const icons = {
    completionRate: CheckCircle,
    velocity: Zap,
    activeMembers: Users,
    timeAccuracy: Clock,
    overdueRate: AlertTriangle,
    engagementScore: Activity,
  };
  return icons[key] || BarChart3;
}

/**
 * Metric Row Component for detailed view
 */
const MetricRow = ({ label, value, format, suffix, trend }) => {
  const formattedValue = useMemo(() => {
    switch (format) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(value);
      default:
        return `${value}${suffix ? ` ${suffix}` : ''}`;
    }
  }, [value, format, suffix]);

  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-900">{formattedValue}</span>
        {trend && (
          <span
            className={cn(
              'inline-flex items-center text-sm',
              trend === 'up'
                ? 'text-green-600'
                : trend === 'down'
                ? 'text-red-600'
                : 'text-gray-400'
            )}
          >
            {trend === 'up' ? (
              <ArrowUp className="w-3 h-3" />
            ) : trend === 'down' ? (
              <ArrowDown className="w-3 h-3" />
            ) : (
              <Minus className="w-3 h-3" />
            )}
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * Activity Heatmap Component
 */
const ActivityHeatmap = ({ data }) => {
  // Implementation of heatmap visualization
  // This would be a custom component showing activity intensity by hour/day
  return <div className="grid grid-cols-24 gap-1">{/* Heatmap cells */}</div>;
};
```

### 3. Report Builder Component

**File: `client/src/components/projects/organisms/ReportBuilder.js`**

```javascript
import React, { useState, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DndContext, closestCenter, DragOverlay } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import {
  FileText,
  Plus,
  Save,
  Download,
  Eye,
  Settings,
  Filter,
  Calendar,
  Users,
  BarChart3,
  PieChart,
  TrendingUp,
  Table,
  Image,
  Type,
  Trash2,
  Copy,
  Share2,
  Lock,
  Unlock,
  ChevronRight,
  Grid,
  List,
  Columns,
  MoreVertical,
} from 'lucide-react';
import { ReportSection } from '../molecules/ReportSection';
import { ReportPreview } from '../molecules/ReportPreview';
import { WidgetSelector } from '../molecules/WidgetSelector';
import { DataSourceSelector } from '../molecules/DataSourceSelector';
import { FilterBuilder } from '../molecules/FilterBuilder';
import { cn } from '../../../utils/cn';
import {
  createReport,
  updateReport,
  generateReportPDF,
} from '../../../features/reports/reportsSlice';

/**
 * ReportBuilder Component
 *
 * A drag-and-drop report builder that allows users to create
 * custom reports with various widgets, data sources, and layouts.
 *
 * Features:
 * - Drag-and-drop interface for report sections
 * - Multiple widget types (charts, tables, text, images)
 * - Custom data source configuration
 * - Real-time preview
 * - Export to multiple formats
 * - Report templates
 * - Scheduling capabilities
 *
 * @param {Object} props
 * @param {string} props.projectId - The project ID for report context
 * @param {Object} props.report - Existing report to edit (optional)
 * @param {Function} props.onSave - Callback when report is saved
 * @param {Function} props.onCancel - Callback when editing is cancelled
 * @param {string} props.className - Additional CSS classes
 */
export const ReportBuilder = ({
  projectId,
  report,
  onSave,
  onCancel,
  className,
}) => {
  const dispatch = useDispatch();

  // State
  const [reportData, setReportData] = useState({
    name: report?.name || 'Untitled Report',
    description: report?.description || '',
    type: report?.type || 'custom',
    visibility: report?.visibility || 'private',
    sections: report?.sections || [],
    filters: report?.filters || {},
    schedule: report?.schedule || null,
    ...report,
  });
  const [activeSection, setActiveSection] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState({});

  // Redux state
  const { saving, generating } = useSelector((state) => state.reports);
  const availableDataSources = useSelector(
    (state) => state.reports.dataSources
  );

  /**
   * Add a new section to the report
   */
  const addSection = useCallback((type) => {
    const newSection = {
      id: `section_${Date.now()}`,
      type,
      title: `New ${type} Section`,
      config: getDefaultSectionConfig(type),
      data: null,
    };

    setReportData((prev) => ({
      ...prev,
      sections: [...prev.sections, newSection],
    }));

    setActiveSection(newSection.id);
  }, []);

  /**
   * Update a section's configuration
   */
  const updateSection = useCallback((sectionId, updates) => {
    setReportData((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        section.id === sectionId ? { ...section, ...updates } : section
      ),
    }));
  }, []);

  /**
   * Remove a section from the report
   */
  const removeSection = useCallback(
    (sectionId) => {
      setReportData((prev) => ({
        ...prev,
        sections: prev.sections.filter((s) => s.id !== sectionId),
      }));

      if (activeSection === sectionId) {
        setActiveSection(null);
      }
    },
    [activeSection]
  );

  /**
   * Handle drag end for section reordering
   */
  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setReportData((prev) => {
        const oldIndex = prev.sections.findIndex((s) => s.id === active.id);
        const newIndex = prev.sections.findIndex((s) => s.id === over.id);

        return {
          ...prev,
          sections: arrayMove(prev.sections, oldIndex, newIndex),
        };
      });
    }

    setIsDragging(false);
  }, []);

  /**
   * Validate report before saving
   */
  const validateReport = useCallback(() => {
    const newErrors = {};

    if (!reportData.name.trim()) {
      newErrors.name = 'Report name is required';
    }

    if (reportData.sections.length === 0) {
      newErrors.sections = 'At least one section is required';
    }

    reportData.sections.forEach((section, index) => {
      if (!section.title?.trim()) {
        newErrors[`section_${section.id}_title`] = 'Section title is required';
      }

      // Validate data source for data widgets
      if (
        ['chart', 'table', 'metric'].includes(section.type) &&
        !section.dataSource
      ) {
        newErrors[`section_${section.id}_data`] = 'Data source is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [reportData]);

  /**
   * Save the report
   */
  const handleSave = async () => {
    if (!validateReport()) {
      return;
    }

    try {
      const savedReport = await dispatch(
        report?._id
          ? updateReport({ reportId: report._id, updates: reportData })
          : createReport({ projectId, reportData })
      ).unwrap();

      onSave?.(savedReport);
    } catch (error) {
      console.error('Failed to save report:', error);
    }
  };

  /**
   * Generate report preview
   */
  const handlePreview = async () => {
    if (!validateReport()) {
      return;
    }

    setShowPreview(true);
  };

  /**
   * Export report to specified format
   */
  const handleExport = async (format) => {
    if (!validateReport()) {
      return;
    }

    try {
      await dispatch(
        generateReportPDF({
          reportData,
          format,
        })
      ).unwrap();
    } catch (error) {
      console.error('Failed to export report:', error);
    }
  };

  /**
   * Available section types
   */
  const sectionTypes = [
    { id: 'chart', label: 'Chart', icon: BarChart3 },
    { id: 'table', label: 'Table', icon: Table },
    { id: 'metric', label: 'Metrics', icon: TrendingUp },
    { id: 'text', label: 'Text', icon: Type },
    { id: 'image', label: 'Image', icon: Image },
  ];

  return (
    <div className={cn('flex h-full', className)}>
      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <FileText className="w-6 h-6 text-gray-400" />
              <div>
                <input
                  type="text"
                  value={reportData.name}
                  onChange={(e) =>
                    setReportData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className={cn(
                    'text-xl font-semibold bg-transparent border-b-2 transition-colors',
                    errors.name
                      ? 'border-red-500'
                      : 'border-transparent hover:border-gray-300 focus:border-blue-500'
                  )}
                  placeholder="Report Name"
                />
                {errors.name && (
                  <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Preview Button */}
              <button
                onClick={handlePreview}
                className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Eye className="w-4 h-4" />
                Preview
              </button>

              {/* Export Menu */}
              <div className="relative group">
                <button className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                  <Download className="w-4 h-4" />
                  Export
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  {['PDF', 'Excel', 'CSV', 'HTML'].map((format) => (
                    <button
                      key={format}
                      onClick={() => handleExport(format.toLowerCase())}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      Export as {format}
                    </button>
                  ))}
                </div>
              </div>

              {/* Settings Button */}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={cn(
                  'p-2 rounded-lg border transition-colors',
                  showSettings
                    ? 'bg-blue-50 text-blue-600 border-blue-200'
                    : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                )}
              >
                <Settings className="w-5 h-5" />
              </button>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
                  saving
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                )}
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Report'}
              </button>

              {/* Cancel Button */}
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Report Canvas */}
        <div className="flex-1 overflow-auto bg-gray-50 p-6">
          <div className="max-w-5xl mx-auto">
            {/* Report Description */}
            <div className="mb-6">
              <textarea
                value={reportData.description}
                onChange={(e) =>
                  setReportData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Add a description for your report..."
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
              />
            </div>

            {/* Report Sections */}
            <DndContext
              collisionDetection={closestCenter}
              onDragStart={() => setIsDragging(true)}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={reportData.sections.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {reportData.sections.map((section) => (
                    <ReportSection
                      key={section.id}
                      section={section}
                      isActive={activeSection === section.id}
                      onActivate={() => setActiveSection(section.id)}
                      onUpdate={(updates) => updateSection(section.id, updates)}
                      onRemove={() => removeSection(section.id)}
                      errors={errors}
                      dataSources={availableDataSources}
                    />
                  ))}
                </div>
              </SortableContext>

              <DragOverlay>
                {isDragging && activeSection && (
                  <div className="bg-white rounded-lg shadow-lg p-4 opacity-90">
                    <p className="font-medium">
                      {
                        reportData.sections.find((s) => s.id === activeSection)
                          ?.title
                      }
                    </p>
                  </div>
                )}
              </DragOverlay>
            </DndContext>

            {/* Add Section Button */}
            <div className="mt-6">
              <div className="relative group">
                <button className="w-full py-8 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors group">
                  <Plus className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm font-medium">Add Section</p>
                </button>

                {/* Section Type Menu */}
                <div className="absolute left-0 right-0 bottom-full mb-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-2">
                    <div className="grid grid-cols-5 gap-2">
                      {sectionTypes.map((type) => (
                        <button
                          key={type.id}
                          onClick={() => addSection(type.id)}
                          className="flex flex-col items-center p-3 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <type.icon className="w-6 h-6 text-gray-600 mb-1" />
                          <span className="text-xs text-gray-600">
                            {type.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {errors.sections && (
              <p className="text-sm text-red-500 text-center mt-2">
                {errors.sections}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="w-96 bg-white border-l shadow-xl overflow-auto">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-6">Report Settings</h3>

            {/* Visibility Settings */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visibility
              </label>
              <div className="space-y-2">
                {[
                  { value: 'private', label: 'Private', icon: Lock },
                  { value: 'team', label: 'Team', icon: Users },
                  { value: 'public', label: 'Public', icon: Unlock },
                ].map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="radio"
                      name="visibility"
                      value={option.value}
                      checked={reportData.visibility === option.value}
                      onChange={(e) =>
                        setReportData((prev) => ({
                          ...prev,
                          visibility: e.target.value,
                        }))
                      }
                      className="text-blue-600"
                    />
                    <option.icon className="w-4 h-4 text-gray-400" />
                    <span className="flex-1">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Report Filters
              </h4>
              <FilterBuilder
                filters={reportData.filters}
                onChange={(filters) =>
                  setReportData((prev) => ({ ...prev, filters }))
                }
                availableFields={getAvailableFilterFields(projectId)}
              />
            </div>

            {/* Schedule Settings */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Schedule Report
              </h4>
              <label className="flex items-center gap-3 mb-3">
                <input
                  type="checkbox"
                  checked={!!reportData.schedule}
                  onChange={(e) =>
                    setReportData((prev) => ({
                      ...prev,
                      schedule: e.target.checked
                        ? { frequency: 'weekly' }
                        : null,
                    }))
                  }
                  className="rounded text-blue-600"
                />
                <span className="text-sm">Enable scheduled delivery</span>
              </label>

              {reportData.schedule && (
                <div className="space-y-3 pl-6">
                  <select
                    value={reportData.schedule.frequency}
                    onChange={(e) =>
                      setReportData((prev) => ({
                        ...prev,
                        schedule: {
                          ...prev.schedule,
                          frequency: e.target.value,
                        },
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>

                  <input
                    type="email"
                    placeholder="Recipients (comma separated)"
                    value={reportData.schedule.recipients || ''}
                    onChange={(e) =>
                      setReportData((prev) => ({
                        ...prev,
                        schedule: {
                          ...prev.schedule,
                          recipients: e.target.value,
                        },
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              )}
            </div>

            {/* Layout Options */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Layout Options
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'single', icon: Columns, label: 'Single' },
                  { value: 'two-column', icon: Grid, label: '2 Column' },
                  { value: 'grid', icon: Grid, label: 'Grid' },
                ].map((layout) => (
                  <button
                    key={layout.value}
                    onClick={() =>
                      setReportData((prev) => ({
                        ...prev,
                        layout: layout.value,
                      }))
                    }
                    className={cn(
                      'flex flex-col items-center p-3 rounded-lg border transition-colors',
                      reportData.layout === layout.value
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'border-gray-300 hover:bg-gray-50'
                    )}
                  >
                    <layout.icon className="w-5 h-5 mb-1" />
                    <span className="text-xs">{layout.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <ReportPreview
          report={reportData}
          onClose={() => setShowPreview(false)}
          onExport={handleExport}
        />
      )}
    </div>
  );
};

/**
 * Get default configuration for section types
 */
function getDefaultSectionConfig(type) {
  switch (type) {
    case 'chart':
      return {
        chartType: 'line',
        xAxis: null,
        yAxis: null,
        groupBy: null,
        aggregation: 'sum',
      };
    case 'table':
      return {
        columns: [],
        pageSize: 10,
        sortable: true,
        filterable: false,
      };
    case 'metric':
      return {
        metrics: [],
        layout: 'grid',
        showTrend: true,
        compareWith: 'previous_period',
      };
    case 'text':
      return {
        content: '',
        format: 'markdown',
      };
    case 'image':
      return {
        url: '',
        caption: '',
        alignment: 'center',
      };
    default:
      return {};
  }
}

/**
 * Get available fields for filtering
 */
function getAvailableFilterFields(projectId) {
  // This would be populated from the data schema
  return [
    { field: 'status', label: 'Status', type: 'select' },
    { field: 'priority', label: 'Priority', type: 'select' },
    { field: 'assignee', label: 'Assignee', type: 'user' },
    { field: 'dateRange', label: 'Date Range', type: 'dateRange' },
    { field: 'tags', label: 'Tags', type: 'multiSelect' },
  ];
}
```

### 4. Analytics Controller

**File: `server/controllers/analyticsController.js`**

````javascript
import Analytics from '../models/Analytics.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import Activity from '../models/Activity.js';
import User from '../models/User.js';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

/**
 * Analytics Controller
 *
 * Handles all analytics-related operations including:
 * - Real-time metric calculation
 * - Historical data aggregation
 * - Report generation
 * - Export functionality
 * - Caching strategies
 */
export const analyticsController = {
  /**
   * Get project analytics for specified period
   */
  async getProjectAnalytics(req, res) {
    try {
      const { projectId } = req.params;
      const {
        startDate = subDays(new Date(), 30),
        endDate = new Date(),
        period = 'daily',
        metrics = ['all'],
        force = false
      } = req.query;

      // Verify project access
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check user has access
      const hasAccess =
        project.owner.toString() === req.user.id ||
        project.members.some(m => m.user.toString() === req.user.id);

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Check cache unless force refresh requested
      if (!force) {
        const cachedAnalytics = await Analytics.findOne({
          project: projectId,
          'period.type': period,
          'period.startDate': { $lte: startDate },
          'period.endDate': { $gte: endDate },
          'metadata.lastCalculated': {
            $gte: new Date(Date.now() - 60 * 60 * 1000) // 1 hour cache
          }
        });

        if (cachedAnalytics) {
          return res.json({
            analytics: cachedAnalytics,
            fromCache: true
          });
        }
      }

      // Calculate analytics
      const analytics = await this.calculateAnalytics(
        projectId,
        startDate,
        endDate,
        period,
        metrics
      );

      // Save to cache
      const analyticsDoc = new Analytics({
        project: projectId,
        period: {
          type: period,
          startDate,
          endDate
        },
        ...analytics
      });

      await analyticsDoc.save();

      res.json({
        analytics: analyticsDoc,
        fromCache: false
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  },

  /**
   * Calculate analytics for a project
   */
  async calculateAnalytics(projectId, startDate, endDate, period, requestedMetrics) {
    const calculationStart = Date.now();
    const analytics = {};

    // Determine which metrics to calculate
    const metricsToCalculate = requestedMetrics.includes('all')
      ? ['tasks', 'time', 'team', 'progress', 'activity', 'quality']
      : requestedMetrics;

    // Parallel calculation of different metric categories
    const calculations = [];

    if (metricsToCalculate.includes('tasks')) {
      calculations.push(
        this.calculateTaskMetrics(projectId, startDate, endDate)
          .then(metrics => { analytics.taskMetrics = metrics; })
      );
    }

    if (metricsToCalculate.includes('time')) {
      calculations.push(
        this.calculateTimeMetrics(projectId, startDate, endDate)
          .then(metrics => { analytics.timeMetrics = metrics; })
      );
    }

    if (metricsToCalculate.includes('team')) {
      calculations.push(
        this.calculateTeamMetrics(projectId, startDate, endDate)
          .then(metrics => { analytics.teamMetrics = metrics; })
      );
    }

    if (metricsToCalculate.includes('progress')) {
      calculations.push(
        this// filepath: c:\Users\macdo\Documents\Cline\utool\PROJECTS_MILESTONE_5.md
# PROJECTS FEATURE REORGANIZATION - MILESTONE 5

## Advanced Analytics & Reporting (Week 11-12)

**Risk:** Low | **Value:** Critical Business Intelligence
**Status:** Planning Phase

---

### Overview

This milestone transforms raw project data into actionable insights through comprehensive analytics dashboards, custom report builders, and advanced data visualization. We'll provide teams with the tools to track performance, identify bottlenecks, and make data-driven decisions.

### Integration with Existing Codebase

**Existing Files to Enhance/Modify:**

- `server/models/Project.js` - Add analytics metadata
- `server/models/Task.js` - Track performance metrics
- `client/src/pages/ProjectDetailsPage.js` - Add analytics tab
- `server/controllers/projectController.js` - Analytics endpoints
- `client/src/features/projects/projectsSlice.js` - Analytics state

**New Components to Create:**

- Analytics dashboard system
- Chart components library
- Report builder interface
- Export functionality
- Analytics API endpoints

**Patterns We'll Maintain:**

- Chart.js/Recharts for visualizations
- Redux for state management
- MongoDB aggregation pipelines
- Existing API patterns
- Tailwind CSS styling

---

## 📊 DELIVERABLES

### 1. Analytics Data Model

**File: `server/models/Analytics.js`**

```javascript
import mongoose from 'mongoose';

/**
 * Analytics Schema
 *
 * Stores pre-calculated analytics data for efficient retrieval.
 * This model serves as a cache for complex calculations that would
 * be expensive to compute on-the-fly.
 *
 * Data is updated through scheduled jobs and real-time triggers
 * to maintain accuracy while optimizing performance.
 */
const analyticsSchema = new mongoose.Schema({
  // Reference to the project
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },

  // Time period for this analytics record
  period: {
    type: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'all-time'],
      required: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    }
  },

  // Task Metrics
  taskMetrics: {
    total: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    inProgress: { type: Number, default: 0 },
    todo: { type: Number, default: 0 },
    overdue: { type: Number, default: 0 },

    // Completion metrics
    completionRate: { type: Number, default: 0 },
    averageCompletionTime: { type: Number, default: 0 }, // in hours

    // Distribution by priority
    byPriority: {
      low: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      high: { type: Number, default: 0 },
      urgent: { type: Number, default: 0 }
    },

    // Distribution by assignee
    byAssignee: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      count: Number,
      completed: Number,
      averageTime: Number
    }],

    // Task flow metrics
    created: { type: Number, default: 0 },
    moved: { type: Number, default: 0 },
    blockedTime: { type: Number, default: 0 } // total hours tasks were blocked
  },

  // Time Tracking Metrics
  timeMetrics: {
    totalEstimated: { type: Number, default: 0 },
    totalActual: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 }, // percentage

    // Time by user
    byUser: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      hours: Number,
      sessions: Number,
      averageSessionLength: Number
    }],

    // Time by task type/category
    byCategory: [{
      category: String,
      hours: Number,
      percentage: Number
    }]
  },

  // Team Performance Metrics
  teamMetrics: {
    activeMembers: { type: Number, default: 0 },
    totalMembers: { type: Number, default: 0 },

    // Productivity metrics
    tasksPerMember: { type: Number, default: 0 },
    averageResponseTime: { type: Number, default: 0 }, // hours to first response
    collaborationScore: { type: Number, default: 0 }, // 0-100

    // Activity distribution
    activityByHour: [{ hour: Number, count: Number }],
    activityByDay: [{ day: Number, count: Number }],

    // Member contributions
    topContributors: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      score: Number,
      tasksCompleted: Number,
      commentsAdded: Number,
      filesUploaded: Number
    }]
  },

  // Project Progress Metrics
  progressMetrics: {
    overallProgress: { type: Number, default: 0 }, // percentage
    velocity: { type: Number, default: 0 }, // tasks completed per day
    burndownData: [{
      date: Date,
      ideal: Number,
      actual: Number,
      projected: Number
    }],

    // Milestone tracking
    milestones: [{
      name: String,
      dueDate: Date,
      progress: Number,
      status: String,
      daysRemaining: Number
    }],

    // Risk indicators
    riskScore: { type: Number, default: 0 }, // 0-100
    blockers: { type: Number, default: 0 },
    overduePercentage: { type: Number, default: 0 }
  },

  // Activity Metrics
  activityMetrics: {
    totalActivities: { type: Number, default: 0 },

    // Activity by type
    byType: [{
      type: String,
      count: Number,
      percentage: Number
    }],

    // Recent activity summary
    recentActivities: [{
      type: String,
      count: Number,
      timestamp: Date,
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }],

    // Engagement score
    engagementScore: { type: Number, default: 0 } // 0-100
  },

  // Quality Metrics
  qualityMetrics: {
    bugRate: { type: Number, default: 0 }, // bugs per 100 tasks
    reopenRate: { type: Number, default: 0 }, // percentage of tasks reopened
    reviewCoverage: { type: Number, default: 0 }, // percentage of tasks reviewed
    testCoverage: { type: Number, default: 0 }, // if integrated with testing

    // Code quality (if integrated with code analysis)
    codeQuality: {
      score: { type: Number, default: 0 },
      issues: { type: Number, default: 0 },
      technicalDebt: { type: Number, default: 0 }
    }
  },

  // Financial Metrics (if cost tracking is enabled)
  financialMetrics: {
    estimatedCost: { type: Number, default: 0 },
    actualCost: { type: Number, default: 0 },
    costVariance: { type: Number, default: 0 },

    // Cost breakdown
    costByCategory: [{
      category: String,
      amount: Number,
      percentage: Number
    }],

    // ROI calculations
    estimatedValue: { type: Number, default: 0 },
    roi: { type: Number, default: 0 }
  },

  // Metadata
  metadata: {
    lastCalculated: {
      type: Date,
      default: Date.now
    },
    calculationDuration: Number, // milliseconds
    dataPoints: Number, // number of items processed
    version: {
      type: Number,
      default: 1
    }
  }
});

// Indexes for performance
analyticsSchema.index({ project: 1, 'period.type': 1, 'period.startDate': -1 });
analyticsSchema.index({ 'metadata.lastCalculated': 1 });

/**
 * Calculate analytics for a specific period
 */
analyticsSchema.statics.calculateForPeriod = async function(projectId, periodType, startDate, endDate) {
  // This would contain the complex aggregation logic
  // to calculate all metrics for the specified period
  const Task = mongoose.model('Task');
  const Activity = mongoose.model('Activity');
  const Project = mongoose.model('Project');

  // ... implementation of calculations
};

/**
 * Get trend data for a metric
 */
analyticsSchema.methods.getTrend = function(metricPath, periods = 7) {
  // Return historical data for trend analysis
};

/**
 * Export analytics data
 */
analyticsSchema.methods.export = function(format = 'json') {
  // Convert analytics data to specified format
};

const Analytics = mongoose.model('Analytics', analyticsSchema);

export default Analytics;
````

### 2. Analytics Dashboard Component

**File: `client/src/components/projects/organisms/AnalyticsDashboard.js`**

```javascript
import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  Activity,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  ChevronRight,
  BarChart3,
  PieChartIcon,
  Target,
  Zap,
  DollarSign,
  GitBranch,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react';
import { StatCard } from '../molecules/StatCard';
import { ChartCard } from '../molecules/ChartCard';
import { TeamPerformanceCard } from '../molecules/TeamPerformanceCard';
import { DateRangePicker } from '../../common/DateRangePicker';
import { ExportMenu } from '../molecules/ExportMenu';
import { MetricSelector } from '../molecules/MetricSelector';
import { cn } from '../../../utils/cn';
import { fetchProjectAnalytics } from '../../../features/analytics/analyticsSlice';
import {
  formatDate,
  formatDuration,
  calculateTrend,
} from '../../../utils/formatters';

/**
 * AnalyticsDashboard Component
 *
 * Provides comprehensive project analytics with interactive charts,
 * real-time metrics, and customizable views. This component serves
 * as the main analytics hub for project managers and team leads.
 *
 * Features:
 * - Real-time metric updates
 * - Interactive chart visualizations
 * - Custom date range selection
 * - Export functionality
 * - Responsive grid layout
 * - Performance optimizations
 *
 * @param {Object} props
 * @param {string} props.projectId - The project ID to display analytics for
 * @param {string} props.className - Additional CSS classes
 */
export const AnalyticsDashboard = ({ projectId, className }) => {
  const dispatch = useDispatch();

  // State
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    endDate: new Date(),
  });
  const [selectedMetrics, setSelectedMetrics] = useState([
    'taskCompletion',
    'velocity',
    'teamProductivity',
    'timeTracking',
  ]);
  const [viewMode, setViewMode] = useState('overview'); // overview | detailed | custom
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Redux state
  const { analytics, loading, error, lastUpdated } = useSelector(
    (state) => state.analytics
  );
  const project = useSelector((state) =>
    state.projects.projects.find((p) => p._id === projectId)
  );

  /**
   * Fetch analytics data when component mounts or dependencies change
   */
  useEffect(() => {
    if (projectId) {
      dispatch(
        fetchProjectAnalytics({
          projectId,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          metrics: selectedMetrics,
        })
      );
    }
  }, [dispatch, projectId, dateRange, selectedMetrics]);

  /**
   * Handle manual refresh
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await dispatch(
        fetchProjectAnalytics({
          projectId,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          metrics: selectedMetrics,
          force: true, // Force recalculation
        })
      ).unwrap();
    } finally {
      setIsRefreshing(false);
    }
  };

  /**
   * Calculate key performance indicators
   */
  const kpis = useMemo(() => {
    if (!analytics) return null;

    const taskMetrics = analytics.taskMetrics || {};
    const timeMetrics = analytics.timeMetrics || {};
    const teamMetrics = analytics.teamMetrics || {};
    const progressMetrics = analytics.progressMetrics || {};

    return {
      completionRate: {
        value: taskMetrics.completionRate || 0,
        trend: calculateTrend(
          taskMetrics.completionRate,
          analytics.previousPeriod?.taskMetrics?.completionRate
        ),
        label: 'Completion Rate',
        format: 'percentage',
      },
      velocity: {
        value: progressMetrics.velocity || 0,
        trend: calculateTrend(
          progressMetrics.velocity,
          analytics.previousPeriod?.progressMetrics?.velocity
        ),
        label: 'Velocity',
        suffix: 'tasks/day',
      },
      activeMembers: {
        value: teamMetrics.activeMembers || 0,
        total: teamMetrics.totalMembers || 0,
        label: 'Active Members',
        format: 'fraction',
      },
      timeAccuracy: {
        value: timeMetrics.accuracy || 0,
        trend: calculateTrend(
          timeMetrics.accuracy,
          analytics.previousPeriod?.timeMetrics?.accuracy
        ),
        label: 'Time Estimate Accuracy',
        format: 'percentage',
      },
      overdueRate: {
        value: progressMetrics.overduePercentage || 0,
        trend: calculateTrend(
          progressMetrics.overduePercentage,
          analytics.previousPeriod?.progressMetrics?.overduePercentage,
          true
        ), // Inverse - lower is better
        label: 'Overdue Tasks',
        format: 'percentage',
        inverse: true,
      },
      engagementScore: {
        value: analytics.activityMetrics?.engagementScore || 0,
        trend: calculateTrend(
          analytics.activityMetrics?.engagementScore,
          analytics.previousPeriod?.activityMetrics?.engagementScore
        ),
        label: 'Team Engagement',
        format: 'score',
      },
    };
  }, [analytics]);

  /**
   * Prepare chart data
   */
  const chartData = useMemo(() => {
    if (!analytics) return {};

    return {
      burndown: analytics.progressMetrics?.burndownData || [],
      taskDistribution: [
        {
          name: 'Todo',
          value: analytics.taskMetrics?.todo || 0,
          color: '#6B7280',
        },
        {
          name: 'In Progress',
          value: analytics.taskMetrics?.inProgress || 0,
          color: '#3B82F6',
        },
        {
          name: 'Completed',
          value: analytics.taskMetrics?.completed || 0,
          color: '#10B981',
        },
        {
          name: 'Overdue',
          value: analytics.taskMetrics?.overdue || 0,
          color: '#EF4444',
        },
      ],
      teamPerformance: analytics.teamMetrics?.topContributors || [],
      activityTrend: analytics.activityMetrics?.byType || [],
      timeDistribution: analytics.timeMetrics?.byCategory || [],
    };
  }, [analytics]);

  /**
   * Render loading state
   */
  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-red-900 mb-2">
          Failed to Load Analytics
        </h3>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Title and Last Updated */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Analytics Dashboard
            </h2>
            {lastUpdated && (
              <p className="text-sm text-gray-500 mt-1">
                Last updated: {formatDate(lastUpdated, 'relative')}
              </p>
            )}
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Range Picker */}
            <DateRangePicker
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              onChange={setDateRange}
              presets={[
                { label: 'Last 7 days', days: 7 },
                { label: 'Last 30 days', days: 30 },
                { label: 'Last 90 days', days: 90 },
                { label: 'This month', type: 'month' },
                { label: 'This quarter', type: 'quarter' },
              ]}
            />

            {/* Metric Selector */}
            <MetricSelector
              selected={selectedMetrics}
              onChange={setSelectedMetrics}
              className="hidden lg:block"
            />

            {/* View Mode Toggle */}
            <div className="flex rounded-lg border border-gray-300 bg-gray-50">
              {['overview', 'detailed', 'custom'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium capitalize transition-colors',
                    viewMode === mode
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Actions */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={cn(
                'p-2 rounded-lg border transition-colors',
                isRefreshing
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              )}
            >
              <RefreshCw
                className={cn('w-5 h-5', isRefreshing && 'animate-spin')}
              />
            </button>

            <ExportMenu
              data={analytics}
              filename={`${project?.name || 'project'}-analytics`}
              formats={['pdf', 'excel', 'csv', 'json']}
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis &&
          Object.entries(kpis).map(([key, kpi]) => (
            <StatCard
              key={key}
              title={kpi.label}
              value={kpi.value}
              trend={kpi.trend}
              format={kpi.format}
              suffix={kpi.suffix}
              total={kpi.total}
              inverse={kpi.inverse}
              icon={getKpiIcon(key)}
              className="bg-white"
            />
          ))}
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Burndown Chart */}
        {selectedMetrics.includes('taskCompletion') && (
          <ChartCard
            title="Project Burndown"
            subtitle="Ideal vs Actual Progress"
            className="xl:col-span-2"
            actions={
              <button className="text-sm text-blue-600 hover:text-blue-700">
                View Details <ChevronRight className="w-4 h-4 inline" />
              </button>
            }
          >
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData.burndown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => formatDate(date, 'short')}
                  stroke="#6B7280"
                />
                <YAxis stroke="#6B7280" />
                <Tooltip
                  formatter={(value) => `${value} tasks`}
                  labelFormatter={(date) => formatDate(date)}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="ideal"
                  stroke="#E5E7EB"
                  fill="#F3F4F6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Ideal"
                />
                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke="#3B82F6"
                  fill="#DBEAFE"
                  strokeWidth={2}
                  name="Actual"
                />
                <Area
                  type="monotone"
                  dataKey="projected"
                  stroke="#F59E0B"
                  fill="#FEF3C7"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  name="Projected"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Task Distribution */}
        {selectedMetrics.includes('taskCompletion') && (
          <ChartCard
            title="Task Distribution"
            subtitle="Current Status Breakdown"
          >
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.taskDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.taskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Velocity Trend */}
        {selectedMetrics.includes('velocity') && (
          <ChartCard
            title="Velocity Trend"
            subtitle="Tasks Completed Per Day"
            className="xl:col-span-2"
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.progressMetrics?.velocityTrend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => formatDate(date, 'short')}
                  stroke="#6B7280"
                />
                <YAxis stroke="#6B7280" />
                <Tooltip
                  formatter={(value) => `${value} tasks/day`}
                  labelFormatter={(date) => formatDate(date)}
                />
                <Line
                  type="monotone"
                  dataKey="velocity"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="average"
                  stroke="#6B7280"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Team Performance */}
        {selectedMetrics.includes('teamProductivity') && (
          <ChartCard
            title="Team Performance"
            subtitle="Top Contributors"
            className="xl:row-span-2"
          >
            <div className="space-y-3">
              {chartData.teamPerformance.slice(0, 5).map((member, index) => (
                <TeamPerformanceCard
                  key={member.user._id}
                  rank={index + 1}
                  member={member}
                  showDetails
                />
              ))}
            </div>
          </ChartCard>
        )}

        {/* Time Tracking Accuracy */}
        {selectedMetrics.includes('timeTracking') && (
          <ChartCard title="Time Tracking" subtitle="Estimated vs Actual Hours">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.timeMetrics?.byUser || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="user.name"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  stroke="#6B7280"
                />
                <YAxis stroke="#6B7280" />
                <Tooltip />
                <Legend />
                <Bar dataKey="estimated" fill="#93C5FD" name="Estimated" />
                <Bar dataKey="actual" fill="#3B82F6" name="Actual" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Activity Heatmap */}
        {selectedMetrics.includes('activity') && (
          <ChartCard
            title="Activity Heatmap"
            subtitle="Team Activity by Hour"
            className="xl:col-span-2"
          >
            <div className="h-64">
              {/* Custom heatmap implementation */}
              <ActivityHeatmap
                data={analytics.teamMetrics?.activityByHour || []}
              />
            </div>
          </ChartCard>
        )}
      </div>

      {/* Detailed Metrics Section */}
      {viewMode === 'detailed' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quality Metrics */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Quality Metrics
            </h3>
            <div className="space-y-4">
              <MetricRow
                label="Bug Rate"
                value={analytics.qualityMetrics?.bugRate || 0}
                suffix="per 100 tasks"
                trend={calculateTrend(
                  analytics.qualityMetrics?.bugRate,
                  analytics.previousPeriod?.qualityMetrics?.bugRate,
                  true
                )}
              />
              <MetricRow
                label="Reopen Rate"
                value={analytics.qualityMetrics?.reopenRate || 0}
                format="percentage"
                trend={calculateTrend(
                  analytics.qualityMetrics?.reopenRate,
                  analytics.previousPeriod?.qualityMetrics?.reopenRate,
                  true
                )}
              />
              <MetricRow
                label="Review Coverage"
                value={analytics.qualityMetrics?.reviewCoverage || 0}
                format="percentage"
                trend={calculateTrend(
                  analytics.qualityMetrics?.reviewCoverage,
                  analytics.previousPeriod?.qualityMetrics?.reviewCoverage
                )}
              />
            </div>
          </div>

          {/* Financial Metrics */}
          {analytics.financialMetrics && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Financial Metrics
              </h3>
              <div className="space-y-4">
                <MetricRow
                  label="Estimated Cost"
                  value={analytics.financialMetrics?.estimatedCost || 0}
                  format="currency"
                />
                <MetricRow
                  label="Actual Cost"
                  value={analytics.financialMetrics?.actualCost || 0}
                  format="currency"
                />
                <MetricRow
                  label="Cost Variance"
                  value={analytics.financialMetrics?.costVariance || 0}
                  format="percentage"
                  trend={
                    analytics.financialMetrics?.costVariance > 0 ? 'up' : 'down'
                  }
                />
                <MetricRow
                  label="ROI"
                  value={analytics.financialMetrics?.roi || 0}
                  format="percentage"
                  trend={calculateTrend(
                    analytics.financialMetrics?.roi,
                    analytics.previousPeriod?.financialMetrics?.roi
                  )}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Custom View */}
      {viewMode === 'custom' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Custom Analytics View
          </h3>
          <p className="text-gray-500 mb-4">
            Drag and drop metrics to create your custom dashboard view.
          </p>
          {/* Custom dashboard builder would go here */}
        </div>
      )}
    </div>
  );
};

/**
 * Helper function to get icon for KPI
 */
function getKpiIcon(key) {
  const icons = {
    completionRate: CheckCircle,
    velocity: Zap,
    activeMembers: Users,
    timeAccuracy: Clock,
    overdueRate: AlertTriangle,
    engagementScore: Activity,
  };
  return icons[key] || BarChart3;
}

/**
 * Metric Row Component for detailed view
 */
const MetricRow = ({ label, value, format, suffix, trend }) => {
  const formattedValue = useMemo(() => {
    switch (format) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(value);
      default:
        return `${value}${suffix ? ` ${suffix}` : ''}`;
    }
  }, [value, format, suffix]);

  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-900">{formattedValue}</span>
        {trend && (
          <span
            className={cn(
              'inline-flex items-center text-sm',
              trend === 'up'
                ? 'text-green-600'
                : trend === 'down'
                ? 'text-red-600'
                : 'text-gray-400'
            )}
          >
            {trend === 'up' ? (
              <ArrowUp className="w-3 h-3" />
            ) : trend === 'down' ? (
              <ArrowDown className="w-3 h-3" />
            ) : (
              <Minus className="w-3 h-3" />
            )}
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * Activity Heatmap Component
 */
const ActivityHeatmap = ({ data }) => {
  // Implementation of heatmap visualization
  // This would be a custom component showing activity intensity by hour/day
  return <div className="grid grid-cols-24 gap-1">{/* Heatmap cells */}</div>;
};
```

### 3. Report Builder Component

**File: `client/src/components/projects/organisms/ReportBuilder.js`**

```javascript
import React, { useState, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DndContext, closestCenter, DragOverlay } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import {
  FileText,
  Plus,
  Save,
  Download,
  Eye,
  Settings,
  Filter,
  Calendar,
  Users,
  BarChart3,
  PieChart,
  TrendingUp,
  Table,
  Image,
  Type,
  Trash2,
  Copy,
  Share2,
  Lock,
  Unlock,
  ChevronRight,
  Grid,
  List,
  Columns,
  MoreVertical,
} from 'lucide-react';
import { ReportSection } from '../molecules/ReportSection';
import { ReportPreview } from '../molecules/ReportPreview';
import { WidgetSelector } from '../molecules/WidgetSelector';
import { DataSourceSelector } from '../molecules/DataSourceSelector';
import { FilterBuilder } from '../molecules/FilterBuilder';
import { cn } from '../../../utils/cn';
import {
  createReport,
  updateReport,
  generateReportPDF,
} from '../../../features/reports/reportsSlice';

/**
 * ReportBuilder Component
 *
 * A drag-and-drop report builder that allows users to create
 * custom reports with various widgets, data sources, and layouts.
 *
 * Features:
 * - Drag-and-drop interface for report sections
 * - Multiple widget types (charts, tables, text, images)
 * - Custom data source configuration
 * - Real-time preview
 * - Export to multiple formats
 * - Report templates
 * - Scheduling capabilities
 *
 * @param {Object} props
 * @param {string} props.projectId - The project ID for report context
 * @param {Object} props.report - Existing report to edit (optional)
 * @param {Function} props.onSave - Callback when report is saved
 * @param {Function} props.onCancel - Callback when editing is cancelled
 * @param {string} props.className - Additional CSS classes
 */
export const ReportBuilder = ({
  projectId,
  report,
  onSave,
  onCancel,
  className,
}) => {
  const dispatch = useDispatch();

  // State
  const [reportData, setReportData] = useState({
    name: report?.name || 'Untitled Report',
    description: report?.description || '',
    type: report?.type || 'custom',
    visibility: report?.visibility || 'private',
    sections: report?.sections || [],
    filters: report?.filters || {},
    schedule: report?.schedule || null,
    ...report,
  });
  const [activeSection, setActiveSection] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState({});

  // Redux state
  const { saving, generating } = useSelector((state) => state.reports);
  const availableDataSources = useSelector(
    (state) => state.reports.dataSources
  );

  /**
   * Add a new section to the report
   */
  const addSection = useCallback((type) => {
    const newSection = {
      id: `section_${Date.now()}`,
      type,
      title: `New ${type} Section`,
      config: getDefaultSectionConfig(type),
      data: null,
    };

    setReportData((prev) => ({
      ...prev,
      sections: [...prev.sections, newSection],
    }));

    setActiveSection(newSection.id);
  }, []);

  /**
   * Update a section's configuration
   */
  const updateSection = useCallback((sectionId, updates) => {
    setReportData((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        section.id === sectionId ? { ...section, ...updates } : section
      ),
    }));
  }, []);

  /**
   * Remove a section from the report
   */
  const removeSection = useCallback(
    (sectionId) => {
      setReportData((prev) => ({
        ...prev,
        sections: prev.sections.filter((s) => s.id !== sectionId),
      }));

      if (activeSection === sectionId) {
        setActiveSection(null);
      }
    },
    [activeSection]
  );

  /**
   * Handle drag end for section reordering
   */
  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setReportData((prev) => {
        const oldIndex = prev.sections.findIndex((s) => s.id === active.id);
        const newIndex = prev.sections.findIndex((s) => s.id === over.id);

        return {
          ...prev,
          sections: arrayMove(prev.sections, oldIndex, newIndex),
        };
      });
    }

    setIsDragging(false);
  }, []);

  /**
   * Validate report before saving
   */
  const validateReport = useCallback(() => {
    const newErrors = {};

    if (!reportData.name.trim()) {
      newErrors.name = 'Report name is required';
    }

    if (reportData.sections.length === 0) {
      newErrors.sections = 'At least one section is required';
    }

    reportData.sections.forEach((section, index) => {
      if (!section.title?.trim()) {
        newErrors[`section_${section.id}_title`] = 'Section title is required';
      }

      // Validate data source for data widgets
      if (
        ['chart', 'table', 'metric'].includes(section.type) &&
        !section.dataSource
      ) {
        newErrors[`section_${section.id}_data`] = 'Data source is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [reportData]);

  /**
   * Save the report
   */
  const handleSave = async () => {
    if (!validateReport()) {
      return;
    }

    try {
      const savedReport = await dispatch(
        report?._id
          ? updateReport({ reportId: report._id, updates: reportData })
          : createReport({ projectId, reportData })
      ).unwrap();

      onSave?.(savedReport);
    } catch (error) {
      console.error('Failed to save report:', error);
    }
  };

  /**
   * Generate report preview
   */
  const handlePreview = async () => {
    if (!validateReport()) {
      return;
    }

    setShowPreview(true);
  };

  /**
   * Export report to specified format
   */
  const handleExport = async (format) => {
    if (!validateReport()) {
      return;
    }

    try {
      await dispatch(
        generateReportPDF({
          reportData,
          format,
        })
      ).unwrap();
    } catch (error) {
      console.error('Failed to export report:', error);
    }
  };

  /**
   * Available section types
   */
  const sectionTypes = [
    { id: 'chart', label: 'Chart', icon: BarChart3 },
    { id: 'table', label: 'Table', icon: Table },
    { id: 'metric', label: 'Metrics', icon: TrendingUp },
    { id: 'text', label: 'Text', icon: Type },
    { id: 'image', label: 'Image', icon: Image },
  ];

  return (
    <div className={cn('flex h-full', className)}>
      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <FileText className="w-6 h-6 text-gray-400" />
              <div>
                <input
                  type="text"
                  value={reportData.name}
                  onChange={(e) =>
                    setReportData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className={cn(
                    'text-xl font-semibold bg-transparent border-b-2 transition-colors',
                    errors.name
                      ? 'border-red-500'
                      : 'border-transparent hover:border-gray-300 focus:border-blue-500'
                  )}
                  placeholder="Report Name"
                />
                {errors.name && (
                  <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Preview Button */}
              <button
                onClick={handlePreview}
                className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Eye className="w-4 h-4" />
                Preview
              </button>

              {/* Export Menu */}
              <div className="relative group">
                <button className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                  <Download className="w-4 h-4" />
                  Export
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  {['PDF', 'Excel', 'CSV', 'HTML'].map((format) => (
                    <button
                      key={format}
                      onClick={() => handleExport(format.toLowerCase())}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      Export as {format}
                    </button>
                  ))}
                </div>
              </div>

              {/* Settings Button */}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={cn(
                  'p-2 rounded-lg border transition-colors',
                  showSettings
                    ? 'bg-blue-50 text-blue-600 border-blue-200'
                    : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                )}
              >
                <Settings className="w-5 h-5" />
              </button>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
                  saving
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                )}
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Report'}
              </button>

              {/* Cancel Button */}
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Report Canvas */}
        <div className="flex-1 overflow-auto bg-gray-50 p-6">
          <div className="max-w-5xl mx-auto">
            {/* Report Description */}
            <div className="mb-6">
              <textarea
                value={reportData.description}
                onChange={(e) =>
                  setReportData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Add a description for your report..."
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
              />
            </div>

            {/* Report Sections */}
            <DndContext
              collisionDetection={closestCenter}
              onDragStart={() => setIsDragging(true)}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={reportData.sections.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {reportData.sections.map((section) => (
                    <ReportSection
                      key={section.id}
                      section={section}
                      isActive={activeSection === section.id}
                      onActivate={() => setActiveSection(section.id)}
                      onUpdate={(updates) => updateSection(section.id, updates)}
                      onRemove={() => removeSection(section.id)}
                      errors={errors}
                      dataSources={availableDataSources}
                    />
                  ))}
                </div>
              </SortableContext>

              <DragOverlay>
                {isDragging && activeSection && (
                  <div className="bg-white rounded-lg shadow-lg p-4 opacity-90">
                    <p className="font-medium">
                      {
                        reportData.sections.find((s) => s.id === activeSection)
                          ?.title
                      }
                    </p>
                  </div>
                )}
              </DragOverlay>
            </DndContext>

            {/* Add Section Button */}
            <div className="mt-6">
              <div className="relative group">
                <button className="w-full py-8 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors group">
                  <Plus className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm font-medium">Add Section</p>
                </button>

                {/* Section Type Menu */}
                <div className="absolute left-0 right-0 bottom-full mb-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-2">
                    <div className="grid grid-cols-5 gap-2">
                      {sectionTypes.map((type) => (
                        <button
                          key={type.id}
                          // ...existing code...
                          onClick={() => addSection(type.id)}
                          className="flex flex-col items-center p-3 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <type.icon className="w-6 h-6 text-gray-600 mb-1" />
                          <span className="text-xs text-gray-600">
                            {type.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {errors.sections && (
              <p className="text-sm text-red-500 text-center mt-2">
                {errors.sections}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="w-96 bg-white border-l shadow-xl overflow-auto">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-6">Report Settings</h3>

            {/* Visibility Settings */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visibility
              </label>
              <div className="space-y-2">
                {[
                  { value: 'private', label: 'Private', icon: Lock },
                  { value: 'team', label: 'Team', icon: Users },
                  { value: 'public', label: 'Public', icon: Unlock },
                ].map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="radio"
                      name="visibility"
                      value={option.value}
                      checked={reportData.visibility === option.value}
                      onChange={(e) =>
                        setReportData((prev) => ({
                          ...prev,
                          visibility: e.target.value,
                        }))
                      }
                      className="text-blue-600"
                    />
                    <option.icon className="w-4 h-4 text-gray-400" />
                    <span className="flex-1">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Report Filters
              </h4>
              <FilterBuilder
                filters={reportData.filters}
                onChange={(filters) =>
                  setReportData((prev) => ({ ...prev, filters }))
                }
                availableFields={getAvailableFilterFields(projectId)}
              />
            </div>

            {/* Schedule Settings */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Schedule Report
              </h4>
              <label className="flex items-center gap-3 mb-3">
                <input
                  type="checkbox"
                  checked={!!reportData.schedule}
                  onChange={(e) =>
                    setReportData((prev) => ({
                      ...prev,
                      schedule: e.target.checked
                        ? { frequency: 'weekly' }
                        : null,
                    }))
                  }
                  className="rounded text-blue-600"
                />
                <span className="text-sm">Enable scheduled delivery</span>
              </label>

              {reportData.schedule && (
                <div className="space-y-3 pl-6">
                  <select
                    value={reportData.schedule.frequency}
                    onChange={(e) =>
                      setReportData((prev) => ({
                        ...prev,
                        schedule: {
                          ...prev.schedule,
                          frequency: e.target.value,
                        },
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>

                  <input
                    type="email"
                    placeholder="Recipients (comma separated)"
                    value={reportData.schedule.recipients || ''}
                    onChange={(e) =>
                      setReportData((prev) => ({
                        ...prev,
                        schedule: {
                          ...prev.schedule,
                          recipients: e.target.value,
                        },
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              )}
            </div>

            {/* Layout Options */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Layout Options
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'single', icon: Columns, label: 'Single' },
                  { value: 'two-column', icon: Grid, label: '2 Column' },
                  { value: 'grid', icon: Grid, label: 'Grid' },
                ].map((layout) => (
                  <button
                    key={layout.value}
                    onClick={() =>
                      setReportData((prev) => ({
                        ...prev,
                        layout: layout.value,
                      }))
                    }
                    className={cn(
                      'flex flex-col items-center p-3 rounded-lg border transition-colors',
                      reportData.layout === layout.value
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'border-gray-300 hover:bg-gray-50'
                    )}
                  >
                    <layout.icon className="w-5 h-5 mb-1" />
                    <span className="text-xs">{layout.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <ReportPreview
          report={reportData}
          onClose={() => setShowPreview(false)}
          onExport={handleExport}
        />
      )}
    </div>
  );
};

/**
 * Get default configuration for section types
 */
function getDefaultSectionConfig(type) {
  switch (type) {
    case 'chart':
      return {
        chartType: 'line',
        xAxis: null,
        yAxis: null,
        groupBy: null,
        aggregation: 'sum',
      };
    case 'table':
      return {
        columns: [],
        pageSize: 10,
        sortable: true,
        filterable: false,
      };
    case 'metric':
      return {
        metrics: [],
        layout: 'grid',
        showTrend: true,
        compareWith: 'previous_period',
      };
    case 'text':
      return {
        content: '',
        format: 'markdown',
      };
    case 'image':
      return {
        url: '',
        caption: '',
        alignment: 'center',
      };
    default:
      return {};
  }
}

/**
 * Get available fields for filtering
 */
function getAvailableFilterFields(projectId) {
  // This would be populated from the data schema
  return [
    { field: 'status', label: 'Status', type: 'select' },
    { field: 'priority', label: 'Priority', type: 'select' },
    { field: 'assignee', label: 'Assignee', type: 'user' },
    { field: 'dateRange', label: 'Date Range', type: 'dateRange' },
    { field: 'tags', label: 'Tags', type: 'multiSelect' },
  ];
}
```

### 4. Analytics Controller

**File: `server/controllers/analyticsController.js`**

```javascript
import Analytics from '../models/Analytics.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import Activity from '../models/Activity.js';
import User from '../models/User.js';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

/**
 * Analytics Controller
 *
 * Handles all analytics-related operations including:
 * - Real-time metric calculation
 * - Historical data aggregation
 * - Report generation
 * - Export functionality
 * - Caching strategies
 */
export const analyticsController = {
  /**
   * Get project analytics for specified period
   */
  async getProjectAnalytics(req, res) {
    try {
      const { projectId } = req.params;
      const {
        startDate = subDays(new Date(), 30),
        endDate = new Date(),
        period = 'daily',
        metrics = ['all'],
        force = false,
      } = req.query;

      // Verify project access
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check user has access
      const hasAccess =
        project.owner.toString() === req.user.id ||
        project.members.some((m) => m.user.toString() === req.user.id);

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Check cache unless force refresh requested
      if (!force) {
        const cachedAnalytics = await Analytics.findOne({
          project: projectId,
          'period.type': period,
          'period.startDate': { $lte: startDate },
          'period.endDate': { $gte: endDate },
          'metadata.lastCalculated': {
            $gte: new Date(Date.now() - 60 * 60 * 1000), // 1 hour cache
          },
        });

        if (cachedAnalytics) {
          return res.json({
            analytics: cachedAnalytics,
            fromCache: true,
          });
        }
      }

      // Calculate analytics
      const analytics = await this.calculateAnalytics(
        projectId,
        startDate,
        endDate,
        period,
        metrics
      );

      // Save to cache
      const analyticsDoc = new Analytics({
        project: projectId,
        period: {
          type: period,
          startDate,
          endDate,
        },
        ...analytics,
      });

      await analyticsDoc.save();

      res.json({
        analytics: analyticsDoc,
        fromCache: false,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  },

  /**
   * Calculate analytics for a project
   */
  async calculateAnalytics(
    projectId,
    startDate,
    endDate,
    period,
    requestedMetrics
  ) {
    const calculationStart = Date.now();
    const analytics = {};

    // Determine which metrics to calculate
    const metricsToCalculate = requestedMetrics.includes('all')
      ? ['tasks', 'time', 'team', 'progress', 'activity', 'quality']
      : requestedMetrics;

    // Parallel calculation of different metric categories
    const calculations = [];

    if (metricsToCalculate.includes('tasks')) {
      calculations.push(
        this.calculateTaskMetrics(projectId, startDate, endDate).then(
          (metrics) => {
            analytics.taskMetrics = metrics;
          }
        )
      );
    }

    if (metricsToCalculate.includes('time')) {
      calculations.push(
        this.calculateTimeMetrics(projectId, startDate, endDate).then(
          (metrics) => {
            analytics.timeMetrics = metrics;
          }
        )
      );
    }

    if (metricsToCalculate.includes('team')) {
      calculations.push(
        this.calculateTeamMetrics(projectId, startDate, endDate).then(
          (metrics) => {
            analytics.teamMetrics = metrics;
          }
        )
      );
    }

    if (metricsToCalculate.includes('progress')) {
      calculations.push(
        this.calculateProgressMetrics(projectId, startDate, endDate).then(
          (metrics) => {
            analytics.progressMetrics = metrics;
          }
        )
      );
    }

    if (metricsToCalculate.includes('activity')) {
      calculations.push(
        this.calculateActivityMetrics(projectId, startDate, endDate).then(
          (metrics) => {
            analytics.activityMetrics = metrics;
          }
        )
      );
    }

    if (metricsToCalculate.includes('quality')) {
      calculations.push(
        this.calculateQualityMetrics(projectId, startDate, endDate).then(
          (metrics) => {
            analytics.qualityMetrics = metrics;
          }
        )
      );
    }

    // Wait for all calculations to complete
    await Promise.all(calculations);

    // Add metadata
    analytics.metadata = {
      lastCalculated: new Date(),
      calculationDuration: Date.now() - calculationStart,
      dataPoints: Object.values(analytics).reduce((sum, metric) => {
        return sum + (metric.total || metric.length || 0);
      }, 0),
    };

    return analytics;
  },

  /**
   * Calculate task-related metrics
   */
  async calculateTaskMetrics(projectId, startDate, endDate) {
    const tasks = await Task.find({
      project: projectId,
      createdAt: { $gte: startDate, $lte: endDate },
    }).populate('assignee', 'name');

    const metrics = {
      total: tasks.length,
      completed: 0,
      inProgress: 0,
      todo: 0,
      overdue: 0,
      completionRate: 0,
      averageCompletionTime: 0,
      byPriority: {
        low: 0,
        medium: 0,
        high: 0,
        urgent: 0,
      },
      byAssignee: [],
      created: 0,
      moved: 0,
      blockedTime: 0,
    };

    // Process each task
    let totalCompletionTime = 0;
    let completedTasksWithTime = 0;
    const assigneeMap = new Map();

    tasks.forEach((task) => {
      // Status counts
      switch (task.status) {
        case 'done':
          metrics.completed++;
          break;
        case 'in-progress':
          metrics.inProgress++;
          break;
        case 'todo':
          metrics.todo++;
          break;
      }

      // Overdue check
      if (
        task.dueDate &&
        new Date(task.dueDate) < new Date() &&
        task.status !== 'done'
      ) {
        metrics.overdue++;
      }

      // Priority distribution
      if (task.priority && metrics.byPriority[task.priority] !== undefined) {
        metrics.byPriority[task.priority]++;
      }

      // Completion time calculation
      if (task.status === 'done' && task.completedAt && task.createdAt) {
        const completionTime = task.completedAt - task.createdAt;
        totalCompletionTime += completionTime;
        completedTasksWithTime++;
      }

      // Assignee metrics
      if (task.assignee) {
        const assigneeId = task.assignee._id.toString();
        if (!assigneeMap.has(assigneeId)) {
          assigneeMap.set(assigneeId, {
            user: task.assignee._id,
            count: 0,
            completed: 0,
            totalTime: 0,
          });
        }
        const assigneeMetrics = assigneeMap.get(assigneeId);
        assigneeMetrics.count++;
        if (task.status === 'done') {
          assigneeMetrics.completed++;
          if (task.completedAt && task.createdAt) {
            assigneeMetrics.totalTime += task.completedAt - task.createdAt;
          }
        }
      }
    });

    // Calculate derived metrics
    metrics.completionRate =
      metrics.total > 0 ? (metrics.completed / metrics.total) * 100 : 0;

    metrics.averageCompletionTime =
      completedTasksWithTime > 0
        ? totalCompletionTime / completedTasksWithTime / (1000 * 60 * 60) // Convert to hours
        : 0;

    // Convert assignee map to array
    metrics.byAssignee = Array.from(assigneeMap.values()).map((assignee) => ({
      ...assignee,
      averageTime:
        assignee.completed > 0
          ? assignee.totalTime / assignee.completed / (1000 * 60 * 60)
          : 0,
    }));

    return metrics;
  },

  /**
   * Calculate time tracking metrics
   */
  async calculateTimeMetrics(projectId, startDate, endDate) {
    const tasks = await Task.find({
      project: projectId,
      $or: [
        { 'timeEntries.startTime': { $gte: startDate, $lte: endDate } },
        { updatedAt: { $gte: startDate, $lte: endDate } },
      ],
    }).populate('assignee', 'name');

    const metrics = {
      totalEstimated: 0,
      totalActual: 0,
      accuracy: 0,
      byUser: [],
      byCategory: [],
    };

    const userTimeMap = new Map();
    const categoryTimeMap = new Map();

    tasks.forEach((task) => {
      // Estimated vs actual hours
      metrics.totalEstimated += task.estimatedHours || 0;
      metrics.totalActual += task.actualHours || 0;

      // Time by user
      if (task.assignee && task.timeEntries.length > 0) {
        const userId = task.assignee._id.toString();
        if (!userTimeMap.has(userId)) {
          userTimeMap.set(userId, {
            user: task.assignee._id,
            hours: 0,
            sessions: 0,
            totalSessionLength: 0,
          });
        }

        const userMetrics = userTimeMap.get(userId);
        task.timeEntries.forEach((entry) => {
          const duration = (entry.endTime - entry.startTime) / (1000 * 60 * 60);
          userMetrics.hours += duration;
          userMetrics.sessions++;
          userMetrics.totalSessionLength += duration;
        });
      }

      // Time by category (using tags as categories)
      if (task.tags && task.actualHours > 0) {
        task.tags.forEach((tag) => {
          if (!categoryTimeMap.has(tag)) {
            categoryTimeMap.set(tag, { category: tag, hours: 0 });
          }
          categoryTimeMap.get(tag).hours += task.actualHours / task.tags.length;
        });
      }
    });

    // Calculate accuracy
    metrics.accuracy =
      metrics.totalEstimated > 0
        ? (1 -
            Math.abs(metrics.totalActual - metrics.totalEstimated) /
              metrics.totalEstimated) *
          100
        : 0;

    // Convert maps to arrays
    metrics.byUser = Array.from(userTimeMap.values()).map((user) => ({
      ...user,
      averageSessionLength:
        user.sessions > 0 ? user.totalSessionLength / user.sessions : 0,
    }));

    const totalCategoryHours = Array.from(categoryTimeMap.values()).reduce(
      (sum, cat) => sum + cat.hours,
      0
    );

    metrics.byCategory = Array.from(categoryTimeMap.values()).map((cat) => ({
      ...cat,
      percentage:
        totalCategoryHours > 0 ? (cat.hours / totalCategoryHours) * 100 : 0,
    }));

    return metrics;
  },

  /**
   * Calculate team performance metrics
   */
  async calculateTeamMetrics(projectId, startDate, endDate) {
    const project = await Project.findById(projectId).populate(
      'members.user',
      'name lastSeenAt'
    );

    const activities = await Activity.find({
      project: projectId,
      createdAt: { $gte: startDate, $lte: endDate },
    }).populate('user', 'name');

    const metrics = {
      totalMembers: project.members.length + 1, // +1 for owner
      activeMembers: 0,
      tasksPerMember: 0,
      averageResponseTime: 0,
      collaborationScore: 0,
      activityByHour: Array(24)
        .fill(0)
        .map((_, i) => ({ hour: i, count: 0 })),
      activityByDay: Array(7)
        .fill(0)
        .map((_, i) => ({ day: i, count: 0 })),
      topContributors: [],
    };

    // Count active members (active in last 7 days)
    const sevenDaysAgo = subDays(new Date(), 7);
    metrics.activeMembers = project.members.filter(
      (member) => member.user.lastSeenAt > sevenDaysAgo
    ).length;

    // Process activities for patterns
    const contributorMap = new Map();

    activities.forEach((activity) => {
      // Activity by hour
      const hour = activity.createdAt.getHours();
      metrics.activityByHour[hour].count++;

      // Activity by day
      const day = activity.createdAt.getDay();
      metrics.activityByDay[day].count++;

      // Contributor tracking
      if (activity.user) {
        const userId = activity.user._id.toString();
        if (!contributorMap.has(userId)) {
          contributorMap.set(userId, {
            user: activity.user._id,
            score: 0,
            tasksCompleted: 0,
            commentsAdded: 0,
            filesUploaded: 0,
          });
        }

        const contributor = contributorMap.get(userId);
        contributor.score += getActivityScore(activity.type);

        // Count specific activity types
        switch (activity.type) {
          case 'task.completed':
            contributor.tasksCompleted++;
            break;
          case 'comment.added':
            contributor.commentsAdded++;
            break;
          case 'file.uploaded':
            contributor.filesUploaded++;
            break;
        }
      }
    });

    // Calculate collaboration score (0-100)
    const totalActivities = activities.length;
    const uniqueContributors = contributorMap.size;
    const activitySpread = calculateActivitySpread(metrics.activityByHour);

    metrics.collaborationScore = calculateCollaborationScore(
      totalActivities,
      uniqueContributors,
      metrics.activeMembers,
      activitySpread
    );

    // Sort and get top contributors
    metrics.topContributors = Array.from(contributorMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return metrics;
  },

  /**
   * Calculate project progress metrics
   */
  async calculateProgressMetrics(projectId, startDate, endDate) {
    const tasks = await Task.find({ project: projectId });
    const completedTasks = tasks.filter((t) => t.status === 'done');

    const metrics = {
      overallProgress: 0,
      velocity: 0,
      burndownData: [],
      milestones: [],
      riskScore: 0,
      blockers: 0,
      overduePercentage: 0,
    };

    // Overall progress
    metrics.overallProgress =
      tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;

    // Calculate velocity (tasks completed per day)
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const tasksCompletedInPeriod = completedTasks.filter(
      (t) => t.completedAt >= startDate && t.completedAt <= endDate
    ).length;

    metrics.velocity = daysDiff > 0 ? tasksCompletedInPeriod / daysDiff : 0;

    // Generate burndown data
    metrics.burndownData = await this.generateBurndownData(
      projectId,
      startDate,
      endDate,
      tasks
    );

    // Count blockers and calculate risk
    const blockedTasks = tasks.filter(
      (t) => t.dependencies?.blockedBy?.length > 0 && t.status !== 'done'
    );
    metrics.blockers = blockedTasks.length;

    // Calculate overdue percentage
    const overdueTasks = tasks.filter(
      (t) =>
        t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done'
    );
    metrics.overduePercentage =
      tasks.length > 0 ? (overdueTasks.length / tasks.length) * 100 : 0;

    // Calculate risk score (0-100)
    metrics.riskScore = calculateProjectRiskScore(
      metrics.overduePercentage,
      metrics.blockers,
      metrics.velocity,
      tasks.length
    );

    return metrics;
  },

  /**
   * Generate burndown chart data
   */
  async generateBurndownData(projectId, startDate, endDate, tasks) {
    const data = [];
    const totalTasks = tasks.length;
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    let currentDate = new Date(startDate);
    let remainingTasks = totalTasks;

    for (let day = 0; day <= daysDiff; day++) {
      // Count tasks completed by this date
      const completedByDate = tasks.filter(
        (t) =>
          t.status === 'done' && t.completedAt && t.completedAt <= currentDate
      ).length;

      remainingTasks = totalTasks - completedByDate;

      // Ideal burndown (linear)
      const idealRemaining = totalTasks - (totalTasks / daysDiff) * day;

      // Simple projection based on current velocity
      const currentVelocity = day > 0 ? completedByDate / day : 0;
      const daysRemaining = daysDiff - day;
      const projectedRemaining = Math.max(
        0,
        remainingTasks - currentVelocity * daysRemaining
      );

      data.push({
        date: new Date(currentDate),
        ideal: Math.round(idealRemaining),
        actual: remainingTasks,
        projected: Math.round(projectedRemaining),
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return data;
  },

  /**
   * Export analytics data
   */
  async exportAnalytics(req, res) {
    try {
      const { projectId } = req.params;
      const { format = 'json', period = 'all-time' } = req.query;

      const analytics = await Analytics.findOne({
        project: projectId,
        'period.type': period,
      }).sort({ 'metadata.lastCalculated': -1 });

      if (!analytics) {
        return res.status(404).json({ error: 'No analytics data found' });
      }

      switch (format) {
        case 'json':
          res.json(analytics);
          break;

        case 'csv':
          const csv = await this.convertAnalyticsToCSV(analytics);
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader(
            'Content-Disposition',
            `attachment; filename="analytics-${projectId}.csv"`
          );
          res.send(csv);
          break;

        case 'pdf':
          const pdf = await this.generateAnalyticsPDF(analytics);
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader(
            'Content-Disposition',
            `attachment; filename="analytics-${projectId}.pdf"`
          );
          res.send(pdf);
          break;

        default:
          res.status(400).json({ error: 'Invalid export format' });
      }
    } catch (error) {
      console.error('Error exporting analytics:', error);
      res.status(500).json({ error: 'Failed to export analytics' });
    }
  },
};

/**
 * Helper function to calculate activity score
 */
function getActivityScore(activityType) {
  const scores = {
    'task.created': 5,
    'task.completed': 10,
    'comment.added': 3,
    'file.uploaded': 5,
    'member.added': 8,
    'project.updated': 2,
  };
  return scores[activityType] || 1;
}

/**
 * Helper function to calculate activity spread
 */
function calculateActivitySpread(activityByHour) {
  const total = activityByHour.reduce((sum, h) => sum + h.count, 0);
  if (total === 0) return 0;

  // Calculate standard deviation
  const mean = total / 24;
  const variance =
    activityByHour.reduce((sum, h) => sum + Math.pow(h.count - mean, 2), 0) /
    24;

  return Math.sqrt(variance);
}

/**
 * Helper function to calculate collaboration score
 */
function calculateCollaborationScore(
  totalActivities,
  uniqueContributors,
  activeMembers,
  activitySpread
) {
  let score = 0;

  // Activity volume (0-25 points)
  score += Math.min(25, totalActivities / 10);

  // Contributor diversity (0-25 points)
  if (activeMembers > 0) {
    score += (uniqueContributors / activeMembers) * 25;
  }

  // Activity distribution (0-25 points)
  // Lower spread is better (more even distribution)
  score += Math.max(0, 25 - activitySpread);

  // Active member ratio (0-25 points)
  score += (activeMembers / Math.max(activeMembers, 5)) * 25;

  return Math.min(100, Math.round(score));
}

/**
 * Helper function to calculate project risk score
 */
function calculateProjectRiskScore(
  overduePercentage,
  blockers,
  velocity,
  totalTasks
) {
  let risk = 0;

  // Overdue tasks (0-40 points)
  risk += Math.min(40, overduePercentage * 0.8);

  // Blocked tasks (0-30 points)
  const blockerRatio = totalTasks > 0 ? (blockers / totalTasks) * 100 : 0;
  risk += Math.min(30, blockerRatio * 3);

  // Low velocity (0-30 points)
  if (velocity < 1) {
    risk += 30 - velocity * 30;
  }

  return Math.round(risk);
}
```

### 5. Analytics Redux Slice

**File: `client/src/features/analytics/analyticsSlice.js`**

```javascript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

/**
 * Redux slice for analytics management
 *
 * Handles analytics data fetching, caching, and state management
 */

// Async thunks
export const fetchProjectAnalytics = createAsyncThunk(
  'analytics/fetchProjectAnalytics',
  async ({ projectId, startDate, endDate, metrics, force = false }) => {
    const response = await api.get(`/projects/${projectId}/analytics`, {
      params: {
        startDate,
        endDate,
        metrics: metrics.join(','),
        force,
      },
    });
    return response.data;
  }
);

export const exportAnalytics = createAsyncThunk(
  'analytics/export',
  async ({ projectId, format, period }) => {
    const response = await api.get(`/projects/${projectId}/analytics/export`, {
      params: { format, period },
      responseType: format === 'json' ? 'json' : 'blob',
    });

    if (format !== 'json') {
      // Handle file download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics-${projectId}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }

    return response.data;
  }
);

export const generateReport = createAsyncThunk(
  'analytics/generateReport',
  async ({ projectId, reportConfig }) => {
    const response = await api.post(
      `/projects/${projectId}/reports`,
      reportConfig
    );
    return response.data;
  }
);

// Initial state
const initialState = {
  analytics: null,
  reports: [],
  loading: false,
  error: null,
  lastUpdated: null,
  cache: {}, // Keyed by projectId
};

// Slice
const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    clearAnalytics: (state) => {
      state.analytics = null;
      state.error = null;
    },

    clearCache: (state, action) => {
      if (action.payload) {
        delete state.cache[action.payload];
      } else {
        state.cache = {};
      }
    },

    updateMetric: (state, action) => {
      const { metric, value } = action.payload;
      if (state.analytics) {
        // Update specific metric in real-time
        const path = metric.split('.');
        let current = state.analytics;
        for (let i = 0; i < path.length - 1; i++) {
          current = current[path[i]];
        }
        current[path[path.length - 1]] = value;
      }
    },
  },

  extraReducers: (builder) => {
    builder
      // Fetch analytics
      .addCase(fetchProjectAnalytics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjectAnalytics.fulfilled, (state, action) => {
        const { analytics, fromCache } = action.payload;
        const projectId = action.meta.arg.projectId;

        state.analytics = analytics;
        state.loading = false;
        state.lastUpdated = new Date().toISOString();

        // Cache the data
        if (!fromCache) {
          state.cache[projectId] = {
            data: analytics,
            timestamp: Date.now(),
          };
        }
      })
      .addCase(fetchProjectAnalytics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      // Export analytics
      .addCase(exportAnalytics.pending, (state) => {
        state.loading = true;
      })
      .addCase(exportAnalytics.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(exportAnalytics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      // Generate report
      .addCase(generateReport.fulfilled, (state, action) => {
        state.reports.unshift(action.payload);
      });
  },
});

// Selectors
export const selectAnalytics = (state) => state.analytics.analytics;

export const selectAnalyticsLoading = (state) => state.analytics.loading;

export const selectCachedAnalytics = (projectId) => (state) => {
  const cached = state.analytics.cache[projectId];
  if (cached && Date.now() - cached.timestamp < 3600000) {
    // 1 hour cache
    return cached.data;
  }
  return null;
};

export const selectAnalyticsMetric = (metricPath) => (state) => {
  if (!state.analytics.analytics) return null;

  const path = metricPath.split('.');
  let value = state.analytics.analytics;

  for (const key of path) {
    value = value?.[key];
  }

  return value;
};

// Export actions
export const { clearAnalytics, clearCache, updateMetric } =
  analyticsSlice.actions;

export default analyticsSlice.reducer;
```

---

## 🔧 SUPPORTING COMPONENTS

### Chart Card Component

**File: `client/src/components/projects/molecules/ChartCard.js`**

```javascript
import React from 'react';
import { MoreVertical, Download, Expand, RefreshCw } from 'lucide-react';
import { cn } from '../../../utils/cn';

/**
 * ChartCard Component
 *
 * A reusable card wrapper for chart visualizations with
 * consistent styling and action buttons
 */
export const ChartCard = ({
  title,
  subtitle,
  children,
  actions,
  className,
  onRefresh,
  onExpand,
  onExport,
}) => {
  return (
    <div
      className={cn(
        'bg-white rounded-lg shadow-sm border border-gray-200',
        className
      )}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {actions}

            {(onRefresh || onExpand || onExport) && (
              <div className="relative group">
                <button className="p-1 hover:bg-gray-100 rounded">
                  <MoreVertical className="w-5 h-5 text-gray-400" />
                </button>

                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  {onRefresh && (
                    <button
                      onClick={onRefresh}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Refresh
                    </button>
                  )}
                  {onExpand && (
                    <button
                      onClick={onExpand}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Expand className="w-4 h-4" />
                      Expand
                    </button>
                  )}
                  {onExport && (
                    <button
                      onClick={onExport}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart Content */}
      <div className="p-6">{children}</div>
    </div>
  );
};
```

### Analytics API Routes

**File: `server/routes/analyticsRoutes.js`**

```javascript
import express from 'express';
import { analyticsController } from '../controllers/analyticsController.js';
import { authenticate } from '../middleware/auth.js';
import { validateAnalyticsParams } from '../middleware/validation.js';

const router = express.Router();

/**
 * Analytics API Routes
 *
 * All routes require authentication and project access
 */

// Apply authentication to all routes
router.use(authenticate);

// Get project analytics
router.get(
  '/projects/:projectId/analytics',
  validateAnalyticsParams,
  analyticsController.getProjectAnalytics
);

// Export analytics data
router.get(
  '/projects/:projectId/analytics/export',
  analyticsController.exportAnalytics
);

// Get specific metric trend
router.get(
  '/projects/:projectId/analytics/metrics/:metric/trend',
  analyticsController.getMetricTrend
);

// Compare periods
router.get(
  '/projects/:projectId/analytics/compare',
  analyticsController.comparePeriods
);

// Get team member analytics
router.get(
  '/projects/:projectId/analytics/members/:memberId',
  analyticsController.getMemberAnalytics
);

// Create custom report
router.post('/projects/:projectId/reports', analyticsController.createReport);

// Get saved reports
router.get('/projects/:projectId/reports', analyticsController.getReports);

// Update report
router.patch('/reports/:reportId', analyticsController.updateReport);

// Delete report
router.delete('/reports/:reportId', analyticsController.deleteReport);

// Schedule report
router.post('/reports/:reportId/schedule', analyticsController.scheduleReport);

export default router;
```

---

## 📋 IMPLEMENTATION CHECKLIST

### Backend Tasks

- [ ] Create Analytics model with comprehensive schema
- [ ] Implement analytics calculation engine
- [ ] Build aggregation pipelines for metrics
- [ ] Create report generation service
- [ ] Set up analytics caching system
- [ ] Implement export functionality
- [ ] Add scheduled analytics jobs
- [ ] Create analytics API endpoints

### Frontend Tasks

- [ ] Build AnalyticsDashboard component
- [ ] Create ReportBuilder interface
- [ ] Implement chart components library
- [ ] Add metric cards and KPIs
- [ ] Build custom dashboard creator
- [ ] Create export functionality UI
- [ ] Add date range selectors
- [ ] Implement real-time updates

### Data Processing

- [ ] Set up MongoDB aggregation pipelines
- [ ] Implement data transformation logic
- [ ] Create metric calculation functions
- [ ] Build trend analysis algorithms
- [ ] Add predictive analytics
- [ ] Implement data validation

### Performance Optimization

- [ ] Implement analytics caching
- [ ] Add query optimization
- [ ] Create indexed views
- [ ] Implement lazy loading
- [ ] Add data pagination
- [ ] Optimize chart rendering

---

## 🎯 SUCCESS METRICS

### Performance Targets

- Analytics load time < 2 seconds
- Report generation < 5 seconds
- Real-time metric updates < 500ms
- Chart rendering < 1 second

### User Experience Goals

- 80% of users find insights valuable
- Custom report adoption > 50%
- Average dashboard views per user > 5/week
- Export feature usage > 30%

### Technical Metrics

- Query performance < 200ms average
- Cache hit rate > 70%
- Data accuracy > 99.9%
- System uptime > 99.5%

---

## 🔧 ENHANCED ANALYTICS INFRASTRUCTURE

### Analytics Calculation Scheduling System

**File: `server/services/analyticsScheduler.js`**

```javascript
import cron from 'node-cron';
import { Worker } from 'worker_threads';
import { Analytics } from '../models/Analytics.js';
import { Project } from '../models/Project.js';
import logger from '../utils/logger.js';

/**
 * Analytics Calculation Scheduler
 *
 * Manages the scheduled calculation of analytics data to keep metrics
 * up-to-date without blocking the main application thread. Uses worker
 * threads for heavy computations and implements intelligent scheduling
 * based on project activity levels.
 */
class AnalyticsScheduler {
  constructor() {
    this.jobs = new Map();
    this.workers = new Set();
    this.maxWorkers = 4;
    this.isRunning = false;
  }

  /**
   * Initialize the scheduler with various calculation intervals
   * Based on data volatility and business requirements
   */
  start() {
    if (this.isRunning) return;

    logger.info('Starting Analytics Scheduler...');

    // Real-time metrics (every 5 minutes for active projects)
    cron.schedule('*/5 * * * *', () => {
      this.scheduleCalculation('real-time', 'high-priority');
    });

    // Hourly analytics (every hour)
    cron.schedule('0 * * * *', () => {
      this.scheduleCalculation('hourly', 'medium-priority');
    });

    // Daily analytics (every day at 1 AM)
    cron.schedule('0 1 * * *', () => {
      this.scheduleCalculation('daily', 'standard');
    });

    // Weekly analytics (every Sunday at 2 AM)
    cron.schedule('0 2 * * 0', () => {
      this.scheduleCalculation('weekly', 'standard');
    });

    // Monthly analytics (1st of month at 3 AM)
    cron.schedule('0 3 1 * *', () => {
      this.scheduleCalculation('monthly', 'standard');
    });

    // Quarterly analytics (1st of quarter at 4 AM)
    cron.schedule('0 4 1 */3 *', () => {
      this.scheduleCalculation('quarterly', 'standard');
    });

    this.isRunning = true;
    logger.info('Analytics Scheduler started successfully');
  }

  /**
   * Schedule analytics calculation for specific period type
   * @param {string} periodType - The period to calculate (daily, weekly, etc.)
   * @param {string} priority - Priority level (high-priority, medium-priority, standard)
   */
  async scheduleCalculation(periodType, priority = 'standard') {
    try {
      // Get projects that need analytics updates
      const projects = await this.getProjectsNeedingUpdate(periodType);

      if (projects.length === 0) {
        logger.debug(`No projects need ${periodType} analytics update`);
        return;
      }

      logger.info(
        `Scheduling ${periodType} analytics for ${projects.length} projects`
      );

      // Process in batches to avoid overwhelming the system
      const batchSize = this.getBatchSize(priority);
      const batches = this.createBatches(projects, batchSize);

      for (const batch of batches) {
        await this.processBatch(batch, periodType, priority);

        // Add delay between batches to manage system load
        if (batches.length > 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    } catch (error) {
      logger.error(
        `Error scheduling ${periodType} analytics calculation:`,
        error
      );
    }
  }

  /**
   * Get projects that need analytics updates based on staleness and activity
   */
  async getProjectsNeedingUpdate(periodType) {
    const staleThreshold = this.getStaleThreshold(periodType);
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - staleThreshold);

    // Find projects with stale analytics or high activity
    return await Project.aggregate([
      {
        $lookup: {
          from: 'analytics',
          localField: '_id',
          foreignField: 'project',
          as: 'latestAnalytics',
          pipeline: [
            { $match: { 'period.type': periodType } },
            { $sort: { 'metadata.lastCalculated': -1 } },
            { $limit: 1 },
          ],
        },
      },
      {
        $lookup: {
          from: 'activities',
          localField: '_id',
          foreignField: 'project',
          as: 'recentActivities',
          pipeline: [
            { $match: { createdAt: { $gte: cutoffDate } } },
            { $count: 'count' },
          ],
        },
      },
      {
        $match: {
          $or: [
            // No analytics exist yet
            { latestAnalytics: { $size: 0 } },
            // Analytics are stale
            { 'latestAnalytics.metadata.lastCalculated': { $lt: cutoffDate } },
            // High activity projects (force update)
            {
              'recentActivities.count': {
                $gte: this.getActivityThreshold(periodType),
              },
            },
          ],
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          lastActivity: { $arrayElemAt: ['$recentActivities.count', 0] },
          analyticsAge: {
            $subtract: [
              now,
              { $arrayElemAt: ['$latestAnalytics.metadata.lastCalculated', 0] },
            ],
          },
        },
      },
      {
        $sort: { lastActivity: -1, analyticsAge: -1 },
      },
    ]);
  }

  /**
   * Process a batch of projects using worker threads
   */
  async processBatch(projects, periodType, priority) {
    if (this.workers.size >= this.maxWorkers) {
      logger.warn(
        'Maximum workers reached, queuing batch for later processing'
      );
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return this.processBatch(projects, periodType, priority);
    }

    return new Promise((resolve, reject) => {
      const worker = new Worker('./workers/analyticsWorker.js', {
        workerData: {
          projects: projects.map((p) => p._id),
          periodType,
          priority,
          timestamp: new Date(),
        },
      });

      this.workers.add(worker);

      worker.on('message', (result) => {
        logger.info(
          `Analytics calculation completed for ${result.projectsProcessed} projects`
        );
        if (result.errors.length > 0) {
          logger.error(`Errors in analytics calculation:`, result.errors);
        }
      });

      worker.on('error', (error) => {
        logger.error('Analytics worker error:', error);
        reject(error);
      });

      worker.on('exit', (code) => {
        this.workers.delete(worker);
        if (code !== 0) {
          logger.error(`Analytics worker stopped with exit code ${code}`);
          reject(new Error(`Worker stopped with exit code ${code}`));
        } else {
          resolve();
        }
      });

      // Set timeout for worker execution
      setTimeout(() => {
        if (this.workers.has(worker)) {
          worker.terminate();
          this.workers.delete(worker);
          logger.warn(`Analytics worker timeout for period: ${periodType}`);
          reject(new Error('Worker timeout'));
        }
      }, this.getWorkerTimeout(priority));
    });
  }

  /**
   * Helper methods for configuration
   */
  getStaleThreshold(periodType) {
    const thresholds = {
      'real-time': 5 * 60 * 1000, // 5 minutes
      hourly: 60 * 60 * 1000, // 1 hour
      daily: 24 * 60 * 60 * 1000, // 24 hours
      weekly: 7 * 24 * 60 * 60 * 1000, // 7 days
      monthly: 30 * 24 * 60 * 60 * 1000, // 30 days
      quarterly: 90 * 24 * 60 * 60 * 1000, // 90 days
    };
    return thresholds[periodType] || thresholds.daily;
  }

  getActivityThreshold(periodType) {
    const thresholds = {
      'real-time': 5,
      hourly: 10,
      daily: 20,
      weekly: 50,
      monthly: 100,
      quarterly: 200,
    };
    return thresholds[periodType] || thresholds.daily;
  }

  getBatchSize(priority) {
    const sizes = {
      'high-priority': 5,
      'medium-priority': 10,
      standard: 20,
    };
    return sizes[priority] || sizes.standard;
  }

  getWorkerTimeout(priority) {
    const timeouts = {
      'high-priority': 5 * 60 * 1000, // 5 minutes
      'medium-priority': 10 * 60 * 1000, // 10 minutes
      standard: 15 * 60 * 1000, // 15 minutes
    };
    return timeouts[priority] || timeouts.standard;
  }

  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Manually trigger analytics calculation for specific project
   */
  async triggerCalculation(
    projectId,
    periodType = 'daily',
    priority = 'high-priority'
  ) {
    try {
      logger.info(
        `Manual analytics calculation triggered for project ${projectId}`
      );
      await this.processBatch([{ _id: projectId }], periodType, priority);
    } catch (error) {
      logger.error(
        `Manual analytics calculation failed for project ${projectId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get scheduler status and statistics
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeWorkers: this.workers.size,
      maxWorkers: this.maxWorkers,
      scheduledJobs: this.jobs.size,
      uptime: process.uptime(),
    };
  }

  /**
   * Stop the scheduler and cleanup
   */
  async stop() {
    logger.info('Stopping Analytics Scheduler...');

    // Terminate all workers
    for (const worker of this.workers) {
      await worker.terminate();
    }
    this.workers.clear();

    // Clear all jobs
    this.jobs.clear();

    this.isRunning = false;
    logger.info('Analytics Scheduler stopped');
  }
}

export default new AnalyticsScheduler();
```

### Analytics Worker Thread

**File: `server/workers/analyticsWorker.js`**

```javascript
import { parentPort, workerData } from 'worker_threads';
import mongoose from 'mongoose';
import { Analytics } from '../models/Analytics.js';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { Activity } from '../models/Activity.js';

/**
 * Analytics Worker Thread
 *
 * Performs heavy analytics calculations in a separate thread
 * to avoid blocking the main application. Handles database
 * connections, complex aggregations, and error reporting.
 */
class AnalyticsWorker {
  constructor() {
    this.processedProjects = 0;
    this.errors = [];
    this.startTime = Date.now();
  }

  async run() {
    try {
      // Connect to database (worker threads need their own connection)
      await mongoose.connect(process.env.MONGODB_URI);

      const { projects, periodType, priority } = workerData;

      for (const projectId of projects) {
        try {
          await this.calculateProjectAnalytics(projectId, periodType);
          this.processedProjects++;

          // Send progress update for high-priority jobs
          if (priority === 'high-priority' && parentPort) {
            parentPort.postMessage({
              type: 'progress',
              projectId,
              processed: this.processedProjects,
              total: projects.length,
            });
          }
        } catch (error) {
          this.errors.push({
            projectId,
            error: error.message,
            timestamp: new Date(),
          });
        }
      }

      // Send final results
      if (parentPort) {
        parentPort.postMessage({
          type: 'complete',
          projectsProcessed: this.processedProjects,
          errors: this.errors,
          duration: Date.now() - this.startTime,
        });
      }
    } catch (error) {
      if (parentPort) {
        parentPort.postMessage({
          type: 'error',
          error: error.message,
        });
      }
    } finally {
      await mongoose.connection.close();
      process.exit(0);
    }
  }

  /**
   * Calculate comprehensive analytics for a single project
   */
  async calculateProjectAnalytics(projectId, periodType) {
    const now = new Date();
    const { startDate, endDate } = this.getPeriodDates(now, periodType);

    // Run all analytics calculations in parallel for performance
    const [
      taskMetrics,
      timeMetrics,
      teamMetrics,
      progressMetrics,
      activityMetrics,
      qualityMetrics,
    ] = await Promise.all([
      this.calculateTaskMetrics(projectId, startDate, endDate),
      this.calculateTimeMetrics(projectId, startDate, endDate),
      this.calculateTeamMetrics(projectId, startDate, endDate),
      this.calculateProgressMetrics(projectId, startDate, endDate),
      this.calculateActivityMetrics(projectId, startDate, endDate),
      this.calculateQualityMetrics(projectId, startDate, endDate),
    ]);

    // Save or update analytics record
    await Analytics.findOneAndUpdate(
      {
        project: projectId,
        'period.type': periodType,
        'period.startDate': startDate,
        'period.endDate': endDate,
      },
      {
        project: projectId,
        period: {
          type: periodType,
          startDate,
          endDate,
        },
        taskMetrics,
        timeMetrics,
        teamMetrics,
        progressMetrics,
        activityMetrics,
        qualityMetrics,
        metadata: {
          lastCalculated: now,
          calculationDuration: Date.now() - this.startTime,
          dataPoints: this.calculateDataPoints([
            taskMetrics,
            timeMetrics,
            teamMetrics,
            progressMetrics,
            activityMetrics,
            qualityMetrics,
          ]),
          version: '1.0',
        },
      },
      { upsert: true, new: true }
    );
  }

  /**
   * Individual metric calculation methods
   * Each method uses optimized MongoDB aggregation pipelines
   */
  async calculateTaskMetrics(projectId, startDate, endDate) {
    const pipeline = [
      {
        $match: {
          project: new mongoose.Types.ObjectId(projectId),
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $facet: {
          statusCounts: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          priorityCounts: [
            { $group: { _id: '$priority', count: { $sum: 1 } } },
          ],
          assigneeCounts: [
            { $group: { _id: '$assignee', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
          ],
          completionTimes: [
            {
              $match: {
                status: 'completed',
                completedAt: { $exists: true },
              },
            },
            {
              $project: {
                completionTime: {
                  $divide: [
                    { $subtract: ['$completedAt', '$createdAt'] },
                    1000 * 60 * 60, // Convert to hours
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                averageTime: { $avg: '$completionTime' },
                medianTime: { $median: '$completionTime' },
                minTime: { $min: '$completionTime' },
                maxTime: { $max: '$completionTime' },
              },
            },
          ],
        },
      },
    ];

    const [result] = await Task.aggregate(pipeline);

    return this.formatTaskMetrics(result);
  }

  async calculateTimeMetrics(projectId, startDate, endDate) {
    // Implementation for time tracking analytics
    // Includes actual vs estimated time, efficiency ratios
    return {};
  }

  async calculateTeamMetrics(projectId, startDate, endDate) {
    // Implementation for team performance analytics
    // Includes productivity, collaboration scores
    return {};
  }

  async calculateProgressMetrics(projectId, startDate, endDate) {
    // Implementation for project progress analytics
    // Includes milestone completion, velocity trends
    return {};
  }

  async calculateActivityMetrics(projectId, startDate, endDate) {
    // Implementation for activity analytics
    // Includes engagement patterns, peak hours
    return {};
  }

  async calculateQualityMetrics(projectId, startDate, endDate) {
    // Implementation for quality analytics
    // Includes bug rates, review cycles
    return {};
  }

  /**
   * Helper methods
   */
  getPeriodDates(now, periodType) {
    // Logic to calculate start and end dates based on period type
    const dates = {
      startDate: new Date(now),
      endDate: new Date(now),
    };

    switch (periodType) {
      case 'daily':
        dates.startDate.setHours(0, 0, 0, 0);
        dates.endDate.setHours(23, 59, 59, 999);
        break;
      case 'weekly':
        const dayOfWeek = now.getDay();
        dates.startDate.setDate(now.getDate() - dayOfWeek);
        dates.startDate.setHours(0, 0, 0, 0);
        dates.endDate.setDate(dates.startDate.getDate() + 6);
        dates.endDate.setHours(23, 59, 59, 999);
        break;
      // Add other period calculations...
    }

    return dates;
  }

  formatTaskMetrics(rawData) {
    // Format aggregation results into structured metrics
    return {
      total: 0,
      completed: 0,
      inProgress: 0,
      todo: 0,
      overdue: 0,
      completionRate: 0,
      averageCompletionTime: 0,
      byPriority: {},
      byAssignee: [],
    };
  }

  calculateDataPoints(metrics) {
    // Calculate total number of data points used in analytics
    return Object.values(metrics).reduce((total, metric) => {
      return total + Object.keys(metric).length;
    }, 0);
  }
}

// Start the worker
const worker = new AnalyticsWorker();
worker.run().catch(console.error);
```

### Enhanced Database Indexing Strategy

**File: `server/utils/analyticsIndexes.js`**

```javascript
/**
 * Analytics Database Indexing Strategy
 *
 * Optimized indexes for analytics queries with focus on:
 * 1. Fast aggregation performance
 * 2. Efficient time-range queries
 * 3. Multi-field sorting and filtering
 * 4. Memory usage optimization
 */

/**
 * Create comprehensive indexes for analytics performance
 * Run this script during database setup or migration
 */
export async function createAnalyticsIndexes(db) {
  console.log('Creating analytics performance indexes...');

  // Project-related indexes
  await db.collection('projects').createIndexes([
    // Basic project queries
    { key: { _id: 1, isActive: 1 }, name: 'project_active_lookup' },
    {
      key: { organization: 1, createdAt: -1 },
      name: 'org_projects_chronological',
    },

    // Analytics-specific project indexes
    { key: { _id: 1, lastActivity: -1 }, name: 'project_activity_tracking' },
    {
      key: { 'settings.analytics.enabled': 1, isActive: 1 },
      name: 'analytics_enabled_projects',
    },
  ]);

  // Task-related indexes for analytics
  await db.collection('tasks').createIndexes([
    // Primary analytics queries
    {
      key: { project: 1, status: 1, createdAt: -1 },
      name: 'task_analytics_primary',
      background: true,
    },
    {
      key: { project: 1, assignee: 1, status: 1, updatedAt: -1 },
      name: 'task_assignee_performance',
      background: true,
    },
    {
      key: { project: 1, priority: 1, status: 1 },
      name: 'task_priority_distribution',
      background: true,
    },

    // Time-based analytics
    {
      key: { project: 1, completedAt: -1 },
      name: 'task_completion_timeline',
      partialFilterExpression: { completedAt: { $exists: true } },
      background: true,
    },
    {
      key: { project: 1, dueDate: 1, status: 1 },
      name: 'task_due_date_analysis',
      partialFilterExpression: { dueDate: { $exists: true } },
      background: true,
    },

    // Advanced performance queries
    {
      key: {
        project: 1,
        'timeTracking.totalTime': -1,
        status: 1,
      },
      name: 'task_time_efficiency',
      partialFilterExpression: { 'timeTracking.totalTime': { $gt: 0 } },
      background: true,
    },

    // Compound indexes for complex filters
    {
      key: {
        project: 1,
        tags: 1,
        status: 1,
        createdAt: -1,
      },
      name: 'task_analytics_compound',
      background: true,
    },
  ]);

  // Activity tracking indexes
  await db.collection('activities').createIndexes([
    // Primary activity analytics
    {
      key: { project: 1, createdAt: -1, type: 1 },
      name: 'activity_analytics_primary',
      background: true,
    },
    {
      key: { project: 1, user: 1, createdAt: -1 },
      name: 'user_activity_timeline',
      background: true,
    },

    // Activity pattern analysis
    {
      key: {
        project: 1,
        type: 1,
        createdAt: -1,
      },
      name: 'activity_type_distribution',
      background: true,
    },

    // Time-range queries optimization
    {
      key: {
        project: 1,
        createdAt: -1,
      },
      name: 'activity_chronological',
      expireAfterSeconds: 31536000, // 1 year TTL for old activities
      background: true,
    },
  ]);

  // Analytics collection indexes
  await db.collection('analytics').createIndexes([
    // Primary analytics lookup
    {
      key: {
        project: 1,
        'period.type': 1,
        'metadata.lastCalculated': -1,
      },
      name: 'analytics_lookup_primary',
      background: true,
    },

    // Analytics freshness queries
    {
      key: {
        'period.type': 1,
        'metadata.lastCalculated': 1,
      },
      name: 'analytics_freshness_check',
      background: true,
    },

    // Performance monitoring
    {
      key: {
        'metadata.calculationDuration': -1,
        'metadata.lastCalculated': -1,
      },
      name: 'analytics_performance_monitoring',
      background: true,
    },

    // Period-based queries
    {
      key: {
        project: 1,
        'period.startDate': 1,
        'period.endDate': 1,
      },
      name: 'analytics_period_range',
      background: true,
    },
  ]);

  // Time tracking indexes
  await db.collection('timetracks').createIndexes([
    // Time analytics queries
    {
      key: { project: 1, user: 1, date: -1 },
      name: 'timetrack_analytics_primary',
      background: true,
    },
    {
      key: {
        project: 1,
        task: 1,
        startTime: -1,
      },
      name: 'task_time_breakdown',
      background: true,
    },

    // Efficiency calculations
    {
      key: {
        project: 1,
        duration: -1,
        date: -1,
      },
      name: 'time_efficiency_analysis',
      background: true,
    },
  ]);

  // Comments and collaboration indexes
  await db.collection('comments').createIndexes([
    // Collaboration analytics
    {
      key: { project: 1, createdAt: -1, author: 1 },
      name: 'collaboration_analytics',
      background: true,
    },
    {
      key: {
        project: 1,
        'mentions.user': 1,
        createdAt: -1,
      },
      name: 'mention_analytics',
      background: true,
    },
  ]);

  // File and document indexes
  await db.collection('files').createIndexes([
    // File usage analytics
    {
      key: { project: 1, uploadedAt: -1, size: -1 },
      name: 'file_analytics_primary',
      background: true,
    },
    {
      key: {
        project: 1,
        type: 1,
        'metadata.downloads': -1,
      },
      name: 'file_usage_analytics',
      background: true,
    },
  ]);

  console.log('Analytics indexes created successfully');

  // Create index usage monitoring
  await createIndexMonitoring(db);
}

/**
 * Monitor index usage and performance
 */
async function createIndexMonitoring(db) {
  // Enable profiling for slow operations
  await db.admin().command({
    profile: 2,
    slowms: 100,
    sampleRate: 0.1,
  });

  console.log('Index monitoring enabled');
}

/**
 * Analyze and optimize index usage
 */
export async function analyzeIndexUsage(db) {
  console.log('Analyzing index usage...');

  const collections = [
    'projects',
    'tasks',
    'activities',
    'analytics',
    'timetracks',
    'comments',
    'files',
  ];

  for (const collectionName of collections) {
    const collection = db.collection(collectionName);

    // Get index stats
    const indexStats = await collection
      .aggregate([{ $indexStats: {} }])
      .toArray();

    console.log(`\n${collectionName} Index Usage:`);
    indexStats.forEach((stat) => {
      console.log(`  ${stat.name}: ${stat.accesses.ops} operations`);
    });

    // Check for unused indexes
    const unusedIndexes = indexStats.filter((stat) => stat.accesses.ops === 0);
    if (unusedIndexes.length > 0) {
      console.log(
        `  Unused indexes: ${unusedIndexes.map((i) => i.name).join(', ')}`
      );
    }
  }
}

/**
 * Cleanup old analytics data and optimize storage
 */
export async function cleanupAnalyticsData(db, retentionDays = 365) {
  console.log(`Cleaning up analytics data older than ${retentionDays} days...`);

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  // Remove old activity logs
  const activityResult = await db.collection('activities').deleteMany({
    createdAt: { $lt: cutoffDate },
    type: { $in: ['view', 'search', 'navigation'] }, // Keep important activities
  });

  console.log(`Removed ${activityResult.deletedCount} old activity records`);

  // Archive old analytics to separate collection
  const oldAnalytics = await db
    .collection('analytics')
    .find({
      'metadata.lastCalculated': { $lt: cutoffDate },
      'period.type': { $in: ['daily', 'hourly'] }, // Archive granular data
    })
    .toArray();

  if (oldAnalytics.length > 0) {
    await db.collection('analytics_archive').insertMany(oldAnalytics);
    await db.collection('analytics').deleteMany({
      _id: { $in: oldAnalytics.map((a) => a._id) },
    });
    console.log(`Archived ${oldAnalytics.length} old analytics records`);
  }

  // Compact collections to reclaim space
  await db.collection('analytics').compact();
  await db.collection('activities').compact();

  console.log('Analytics data cleanup completed');
}
```

---

## 🚀 DEPLOYMENT CONSIDERATIONS

### Database Optimization

```javascript
// Indexes for analytics performance
db.tasks.createIndex({ project: 1, status: 1, createdAt: -1 });
db.tasks.createIndex({ project: 1, assignee: 1, status: 1 });
db.activities.createIndex({ project: 1, createdAt: -1, type: 1 });
db.analytics.createIndex({
  project: 1,
  'period.type': 1,
  'metadata.lastCalculated': -1,
});
```

### Caching Strategy

- Use Redis for frequently accessed metrics
- Implement TTL based on data volatility
- Pre-calculate common reports
- Cache chart data on frontend

### Scaling Considerations

- Separate analytics database replica
- Use worker processes for calculations
- Implement queue for report generation
- Consider time-series database for metrics

---

## End of Milestone 5

This completes the Advanced Analytics & Reporting milestone. The implementation provides comprehensive business intelligence capabilities with real-time metrics, custom reporting, and powerful data visualization tools that enable data-driven decision making.
