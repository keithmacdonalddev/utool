import React, { useState, useEffect } from 'react';
import {
  Users,
  Globe,
  Activity,
  Clock,
  MapPin,
  Eye,
  TrendingUp,
  Zap,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import useAnalytics from '../../../hooks/useAnalytics';

/**
 * RealTimeUsers Component
 *
 * Displays live user activity including current users, their activities,
 * locations, and real-time metrics. Updates automatically to provide
 * administrators with immediate insights into user behavior.
 *
 * Part of Milestone 2: Analytics Dashboard & User Insights
 *
 * @returns {React.ReactElement} The RealTimeUsers component
 */
const RealTimeUsers = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all'); // all, registered, guest

  // Use analytics hook with real-time updates
  const {
    data: { realTimeData },
    loading: { realTimeData: isLoading },
    errors: { realTimeData: error },
    fetchRealTimeData,
    lastUpdated,
  } = useAnalytics({
    realTime: true,
    autoRefresh: true,
    refreshInterval: 5,
  });

  /**
   * Format session duration from seconds to human readable format
   * @param {number} seconds - Duration in seconds
   * @returns {string} Formatted duration
   */
  const formatDuration = (seconds) => {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    } else {
      return `${Math.floor(seconds / 3600)}h ${Math.floor(
        (seconds % 3600) / 60
      )}m`;
    }
  };

  /**
   * Get time ago from last action
   * @param {Date} lastAction - Last action timestamp
   * @returns {string} Time ago string
   */
  const getTimeAgo = (lastAction) => {
    const now = new Date();
    const diff = Math.floor((now - new Date(lastAction)) / 1000);

    if (diff < 60) {
      return 'Just now';
    } else if (diff < 3600) {
      return `${Math.floor(diff / 60)}m ago`;
    } else {
      return `${Math.floor(diff / 3600)}h ago`;
    }
  };

  /**
   * Filter users based on selected filter
   * @param {Array} users - Array of users to filter
   * @returns {Array} Filtered users
   */
  const getFilteredUsers = (users) => {
    if (!users) return [];

    switch (selectedFilter) {
      case 'registered':
        return users.filter((user) => user.userType === 'Registered');
      case 'guest':
        return users.filter((user) => user.userType === 'Guest');
      default:
        return users;
    }
  };

  /**
   * Get activity icon based on activity type
   * @param {string} activity - Activity description
   * @returns {React.ReactElement} Activity icon
   */
  const getActivityIcon = (activity) => {
    if (activity.includes('Dashboard'))
      return <Activity size={14} className="text-blue-400" />;
    if (activity.includes('Project'))
      return <Users size={14} className="text-green-400" />;
    if (activity.includes('Knowledge'))
      return <Globe size={14} className="text-purple-400" />;
    if (activity.includes('Task'))
      return <Clock size={14} className="text-orange-400" />;
    return <Eye size={14} className="text-gray-400" />;
  };

  if (error) {
    return (
      <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-heading text-lg font-semibold flex items-center">
            <Users className="mr-2 h-5 w-5 text-red-400" />
            Real-Time Users
          </h3>
          <button
            onClick={fetchRealTimeData}
            className="p-2 rounded-lg bg-surface-primary hover:bg-surface-secondary transition-colors duration-200"
            title="Retry"
          >
            <RefreshCw size={16} className="text-caption" />
          </button>
        </div>

        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
            <p className="text-heading font-medium mb-1">
              Failed to load real-time data
            </p>
            <p className="text-caption text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const filteredUsers = getFilteredUsers(realTimeData?.activeUsers || []);

  return (
    <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-heading text-lg font-semibold flex items-center">
          <Users className="mr-2 h-5 w-5 text-brand-primary" />
          Real-Time Users
          {isLoading && (
            <RefreshCw
              size={16}
              className="ml-2 text-brand-primary animate-spin"
            />
          )}
        </h3>

        <div className="flex items-center space-x-2">
          <span className="text-caption text-xs">
            Last updated: {lastUpdated}
          </span>
          <div
            className="w-2 h-2 bg-green-400 rounded-full animate-pulse"
            title="Live updates"
          />
        </div>
      </div>

      {/* Metrics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-heading mb-1">
            {realTimeData?.currentUsers || 0}
          </div>
          <div className="text-caption text-sm">Active Now</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-green-400 mb-1">
            {realTimeData?.pageViewsThisHour || 0}
          </div>
          <div className="text-caption text-sm">Views/Hour</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-orange-400 mb-1">
            {realTimeData?.bounceRate
              ? `${(realTimeData.bounceRate * 100).toFixed(0)}%`
              : '0%'}
          </div>
          <div className="text-caption text-sm">Bounce Rate</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-purple-400 mb-1">
            {realTimeData?.averagePageLoadTime || 0}s
          </div>
          <div className="text-caption text-sm">Avg Load</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex space-x-1">
          {[
            { key: 'all', label: 'All Users' },
            { key: 'registered', label: 'Registered' },
            { key: 'guest', label: 'Guests' },
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setSelectedFilter(filter.key)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
                selectedFilter === filter.key
                  ? 'bg-brand-primary text-white'
                  : 'bg-surface-primary text-caption hover:bg-surface-secondary'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-brand-primary hover:text-brand-primary-dark text-sm font-medium"
        >
          {isExpanded ? 'Show Less' : 'View All'}
        </button>
      </div>

      {/* User Activity List */}
      <div className="space-y-3">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-caption">No active users found</p>
          </div>
        ) : (
          filteredUsers
            .slice(0, isExpanded ? filteredUsers.length : 5)
            .map((user, index) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 bg-surface-primary rounded-lg border border-border-secondary hover:border-brand-primary/30 transition-colors duration-200"
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        user.userType === 'Registered'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}
                    >
                      {user.userType === 'Registered' ? (
                        <Users size={16} />
                      ) : (
                        <Globe size={16} />
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-surface-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      {getActivityIcon(user.activity)}
                      <span className="text-heading text-sm font-medium truncate">
                        {user.activity}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <MapPin size={12} className="text-caption" />
                      <span className="text-caption text-xs">
                        {user.location}
                      </span>
                      <span className="text-caption text-xs">•</span>
                      <span className="text-caption text-xs">
                        {user.userType}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-heading text-sm font-medium">
                    {formatDuration(user.sessionDuration)}
                  </div>
                  <div className="text-caption text-xs">
                    {getTimeAgo(user.lastAction)}
                  </div>
                </div>
              </div>
            ))
        )}
      </div>

      {/* Real-time indicator */}
      <div className="mt-4 pt-4 border-t border-border-secondary">
        <div className="flex items-center justify-center space-x-2 text-caption text-xs">
          <Zap size={12} className="text-green-400" />
          <span>Live updates every 5 seconds</span>
          <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
};

export default RealTimeUsers;
