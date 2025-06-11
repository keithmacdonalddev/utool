/**
 * RealTimeCollaborationInterface Component
 *
 * Unified interface for all real-time collaboration features within projects.
 * Provides a comprehensive hub for team collaboration including presence,
 * activity feeds, and real-time updates.
 *
 * Features:
 * - Real-time user presence display
 * - Live activity feed with filtering
 * - Collaborative editing indicators
 * - Status management and team awareness
 * - Integration with existing socket infrastructure
 * - Minimizable for space-constrained layouts
 * - Performance optimized for team collaboration
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Users,
  Activity,
  Bell,
  MessageCircle,
  Edit3,
  Clock,
  AlertCircle,
  CheckCircle,
  Calendar,
  FileText,
  Settings,
  Minimize2,
  Maximize2,
  Wifi,
  WifiOff,
} from 'lucide-react';

// Import our custom hooks and components
import {
  useProjectPresence,
  useProjectPresenceDisplay,
} from '../../../hooks/useProjectPresence';
import UserPresence from './UserPresence';
import ActivityFeed from './ActivityFeed';
import { setupProjectPresence } from '../../../utils/socket';
import { createComponentLogger } from '../../../utils/logger';

const logger = createComponentLogger('RealTimeCollaborationInterface');

/**
 * Main RealTimeCollaborationInterface component
 */
const RealTimeCollaborationInterface = ({
  projectId,
  isMinimized = false,
  onToggleMinimize,
  className = '',
}) => {
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.auth.user);
  const project = useSelector((state) => state.projects.byId?.[projectId]);

  // Use our custom presence hook
  const {
    isConnected,
    onlineUsers,
    presenceStats,
    userStatus,
    setStatus,
    presenceError,
  } = useProjectPresence(projectId);

  const { getStatusColor, getStatusIcon, formatPresenceText } =
    useProjectPresenceDisplay();

  // Local state for UI management
  const [activeTab, setActiveTab] = useState('presence');
  const [showNotifications, setShowNotifications] = useState(false);
  const [activityFilter, setActivityFilter] = useState('all');
  const [recentActivity, setRecentActivity] = useState([]);
  const [collaborativeEditing, setCollaborativeEditing] = useState({});
  const [notifications, setNotifications] = useState([]);

  /**
   * Set up real-time activity listeners
   */
  useEffect(() => {
    if (!projectId) return;

    logger.info('Setting up collaboration interface for project:', projectId);

    // Listen for real-time project activities
    const handleProjectActivity = (activity) => {
      setRecentActivity((prev) => [activity, ...prev].slice(0, 50)); // Keep last 50 activities
    };

    // Listen for collaborative editing events
    const handleCollaborativeEdit = (data) => {
      setCollaborativeEditing((prev) => ({
        ...prev,
        [data.resourceId]: {
          users: data.users,
          type: data.type,
          timestamp: data.timestamp,
        },
      }));

      // Clear editing indicators after inactivity
      setTimeout(() => {
        setCollaborativeEditing((prev) => {
          const updated = { ...prev };
          delete updated[data.resourceId];
          return updated;
        });
      }, 30000); // 30 seconds
    };

    // Set up socket listeners
    const cleanup = setupProjectPresence({
      onTaskUpdate: (data) => {
        handleProjectActivity({
          id: `task_update_${Date.now()}`,
          type: 'task_updated',
          user: data.updatedBy,
          description: `updated task "${data.updates?.title || 'Task'}"`,
          timestamp: data.timestamp,
        });
      },
      onCommentAdded: (data) => {
        handleProjectActivity({
          id: `comment_${Date.now()}`,
          type: 'comment_added',
          user: data.comment.author,
          description: `commented on ${
            data.comment.targetType?.toLowerCase() || 'item'
          }`,
          timestamp: data.timestamp,
        });
      },
      onUserJoined: (data) => {
        handleProjectActivity({
          id: `user_joined_${Date.now()}`,
          type: 'member_added',
          user: { username: data.username },
          description: `joined the project`,
          timestamp: data.timestamp,
        });
      },
    });

    return cleanup;
  }, [projectId]);

  /**
   * Filter and sort recent activities based on user preferences
   */
  const filteredActivities = useMemo(() => {
    let filtered = recentActivity;

    if (activityFilter !== 'all') {
      filtered = recentActivity.filter(
        (activity) => activity.type === activityFilter
      );
    }

    return filtered.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
  }, [recentActivity, activityFilter]);

  /**
   * Handle status change for current user
   */
  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
  };
  /**
   * Render user presence indicators
   */
  const renderPresenceIndicators = () => (
    <div className="space-y-3">
      {/* Connection status */}
      <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg border border-dark-600">
        <div className="flex items-center space-x-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className="text-sm font-medium text-white">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <span className="text-sm text-gray-400">
          {formatPresenceText(presenceStats)}
        </span>
      </div>

      {/* Current user status */}
      <div className="p-3 border border-dark-600 rounded-lg bg-dark-800">
        {' '}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-white">Your Status</span>
          <div className="flex items-center space-x-2">
            <span className={`text-lg ${getStatusColor(userStatus)}`}>
              {getStatusIcon(userStatus)}
            </span>
            <span className="text-sm capitalize text-gray-300">
              {userStatus}
            </span>
          </div>
        </div>
        <div className="flex space-x-2">
          {['active', 'idle', 'away'].map((status) => (
            <button
              key={status}
              onClick={() => handleStatusChange(status)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                userStatus === status
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'border-dark-500 text-gray-300 hover:bg-dark-600'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Online users list */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-white">Team Members</h4>{' '}
        {onlineUsers.length === 0 ? (
          <p className="text-sm text-gray-400">No team members online</p>
        ) : (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {onlineUsers.map((user) => (
              <div
                key={user.userId}
                className="flex items-center space-x-3 p-2 hover:bg-dark-600 rounded"
              >
                <div className="relative">
                  <img
                    src={user.avatar || '/default-avatar.png'}
                    alt={user.username}
                    className="w-8 h-8 rounded-full"
                    onError={(e) => {
                      e.target.src = '/default-avatar.png';
                    }}
                  />
                  <div
                    className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-dark-800 ${
                      user.status === 'active'
                        ? 'bg-green-500'
                        : user.status === 'idle'
                        ? 'bg-yellow-500'
                        : 'bg-gray-500'
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {user.username}
                  </p>
                  <p className="text-xs text-gray-400 capitalize">
                    {user.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  /**
   * Render real-time activity feed
   */
  const renderActivityFeed = () => (
    <div className="space-y-3">
      {' '}
      {/* Activity filter */}
      <div className="flex space-x-2">
        <select
          value={activityFilter}
          onChange={(e) => setActivityFilter(e.target.value)}
          className="text-sm border border-dark-600 bg-dark-700 text-white rounded px-2 py-1"
        >
          <option value="all">All Activities</option>
          <option value="task_created">Tasks</option>
          <option value="comment_added">Comments</option>
          <option value="member_added">Members</option>
          <option value="file_uploaded">Files</option>
        </select>
      </div>
      {/* Activity list */}
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {filteredActivities.length === 0 ? (
          <p className="text-sm text-gray-400">No recent activity</p>
        ) : (
          filteredActivities.map((activity, index) => (
            <div
              key={`${activity.id}-${index}`}
              className="flex items-start space-x-3 p-2 hover:bg-dark-600 rounded"
            >
              <div className="flex-shrink-0 mt-1">
                {activity.type === 'task_created' && (
                  <FileText className="w-4 h-4 text-blue-500" />
                )}
                {activity.type === 'comment_added' && (
                  <MessageCircle className="w-4 h-4 text-green-500" />
                )}
                {activity.type === 'member_added' && (
                  <Users className="w-4 h-4 text-purple-500" />
                )}
                {activity.type === 'file_uploaded' && (
                  <FileText className="w-4 h-4 text-orange-500" />
                )}
                {![
                  'task_created',
                  'comment_added',
                  'member_added',
                  'file_uploaded',
                ].includes(activity.type) && (
                  <Activity className="w-4 h-4 text-gray-500" />
                )}{' '}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white">
                  <span className="font-medium">
                    {activity.user?.username || 'Someone'}
                  </span>{' '}
                  {activity.description}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(activity.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  /**
   * Render collaborative editing indicators
   */
  const renderCollaborativeEditing = () => (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-white">Active Editing</h4>
      {Object.keys(collaborativeEditing).length === 0 ? (
        <p className="text-sm text-gray-400">
          No collaborative editing in progress
        </p>
      ) : (
        <div className="space-y-2">
          {Object.entries(collaborativeEditing).map(([resourceId, data]) => (
            <div
              key={resourceId}
              className="flex items-center space-x-3 p-2 bg-yellow-900 bg-opacity-30 border border-yellow-600 rounded"
            >
              <Edit3 className="w-4 h-4 text-yellow-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">
                  {data.type} being edited
                </p>
                <p className="text-xs text-gray-300">
                  by {data.users.map((u) => u.username).join(', ')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
  // Minimized view for when space is limited
  if (isMinimized) {
    return (
      <div className="flex items-center space-x-4 p-2 bg-dark-800 border-b border-dark-600">
        {/* Connection indicator */}
        <div className="flex items-center space-x-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className="text-sm text-white">
            {presenceStats.online} online
          </span>
        </div>

        {/* Quick status indicator */}
        <div className="flex items-center space-x-1">
          <span className={`text-sm ${getStatusColor(userStatus)}`}>
            {getStatusIcon(userStatus)}
          </span>
          <span className="text-sm capitalize text-gray-300">{userStatus}</span>
        </div>

        {/* Activity indicator */}
        <div className="flex items-center space-x-1">
          <Activity className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-300">{recentActivity.length}</span>
        </div>

        {/* Expand button */}
        {onToggleMinimize && (
          <button
            onClick={onToggleMinimize}
            className="p-1 text-gray-400 hover:text-white rounded"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }
  // Full collaboration interface
  return (
    <div
      className={`bg-dark-800 border border-dark-600 rounded-lg shadow-sm ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-dark-600">
        <h3 className="text-lg font-medium text-white">Team Collaboration</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-dark-600"
          >
            <Bell className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-dark-600">
            <Settings className="w-5 h-5" />
          </button>
          {onToggleMinimize && (
            <button
              onClick={onToggleMinimize}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-dark-600"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex border-b border-dark-600">
        {' '}
        {[
          { id: 'presence', label: 'Presence', icon: Users },
          { id: 'activity', label: 'Activity', icon: Activity },
          { id: 'editing', label: 'Editing', icon: Edit3 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
            {tab.id === 'presence' && presenceStats.online > 0 && (
              <span className="bg-green-900 bg-opacity-50 text-green-300 text-xs px-2 py-1 rounded-full">
                {presenceStats.online}
              </span>
            )}
            {tab.id === 'activity' && recentActivity.length > 0 && (
              <span className="bg-blue-900 bg-opacity-50 text-blue-300 text-xs px-2 py-1 rounded-full">
                {recentActivity.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4">
        {activeTab === 'presence' && renderPresenceIndicators()}
        {activeTab === 'activity' && renderActivityFeed()}
        {activeTab === 'editing' && renderCollaborativeEditing()}
      </div>

      {/* Error display */}
      {presenceError && (
        <div className="p-4 bg-red-900 bg-opacity-30 border-t border-red-600">
          <div className="flex items-center space-x-2 text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">Connection error: {presenceError}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealTimeCollaborationInterface;
