import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import { cn } from '../../../utils/cn';
import { TaskBadge } from '../atoms/TaskBadge';
import { UserAvatar } from '../atoms/UserAvatar';
import {
  Calendar,
  Clock,
  MessageSquare,
  Paperclip,
  MoreVertical,
  Users,
  CheckSquare,
  AlertTriangle,
  Play,
  Pause,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

/**
 * TaskCard - Molecule component for displaying task information in a card format
 * Supports drag-and-drop for Kanban boards and click actions
 */
export const TaskCard = ({
  task,
  isDragging = false,
  onTaskClick,
  onMenuClick,
  onStatusChange,
  onTimeToggle,
  activeTaskMenu,
  onTaskAction,
  className,
  ...dragProps
}) => {
  const dispatch = useDispatch();
  const [isTimeTracking, setIsTimeTracking] = useState(
    task.timeTracking?.isActive || false
  );

  /**
   * Handle card click to open task details
   */
  const handleCardClick = (e) => {
    // Prevent navigation when clicking interactive elements
    if (e.target.closest('button') || e.target.closest('[role="button"]')) {
      return;
    }
    if (onTaskClick) {
      onTaskClick(task);
    }
  };

  /**
   * Handle time tracking toggle
   */
  const handleTimeToggle = (e) => {
    e.stopPropagation();
    setIsTimeTracking(!isTimeTracking);
    if (onTimeToggle) {
      onTimeToggle(task._id, !isTimeTracking);
    }
  };

  /**
   * Handle menu button click
   */
  const handleMenuClick = (e) => {
    e.stopPropagation();
    if (onMenuClick) {
      onMenuClick(task, e);
    }
  };

  /**
   * Get priority indicator
   */
  const getPriorityIndicator = () => {
    if (task.priority === 'urgent') {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    if (task.priority === 'high') {
      return <div className="h-2 w-2 bg-orange-500 rounded-full" />;
    }
    return null;
  };

  /**
   * Calculate task progress for subtasks
   */
  const getProgress = () => {
    if (!task.subtasks || task.subtasks.length === 0) return null;

    const completed = task.subtasks.filter((st) => st.status === 'done').length;
    const total = task.subtasks.length;
    const percentage = Math.round((completed / total) * 100);

    return { completed, total, percentage };
  };

  const progress = getProgress();

  return (
    <div
      {...dragProps}
      className={cn(
        'bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer',
        'p-4 mb-3',
        isDragging && 'opacity-50 rotate-2 shadow-lg',
        className
      )}
      onClick={handleCardClick}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {getPriorityIndicator()}
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
              {task.title}
            </h4>
            {task.description && (
              <p className="text-xs text-gray-600 line-clamp-2">
                {task.description}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 ml-2">
          {/* Time Tracking Button */}
          {task.timeTracking?.enabled && (
            <button
              onClick={handleTimeToggle}
              className={cn(
                'p-1 rounded hover:bg-gray-100 transition-colors',
                isTimeTracking && 'text-blue-600 bg-blue-50'
              )}
              title={
                isTimeTracking ? 'Stop time tracking' : 'Start time tracking'
              }
            >
              {isTimeTracking ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </button>
          )}

          {/* Menu Button */}
          <div className="relative">
            <button
              onClick={handleMenuClick}
              className="p-1 rounded hover:bg-gray-100"
              title="Task options"
            >
              <MoreVertical className="h-4 w-4 text-gray-400" />
            </button>

            {/* Task Menu Dropdown */}
            {activeTaskMenu === task._id && (
              <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 z-30">
                <div className="p-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTaskAction?.(task._id, 'view');
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2"
                  >
                    <div className="h-3 w-3 bg-blue-500 rounded-full" />
                    View
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTaskAction?.(task._id, 'edit');
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2"
                  >
                    <div className="h-3 w-3 bg-green-500 rounded-full" />
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTaskAction?.(task._id, 'duplicate');
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2"
                  >
                    <div className="h-3 w-3 bg-yellow-500 rounded-full" />
                    Duplicate
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTaskAction?.(task._id, 'delete');
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded flex items-center gap-2"
                  >
                    <div className="h-3 w-3 bg-red-500 rounded-full" />
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task Badges */}
      <div className="flex flex-wrap gap-1 mb-3">
        <TaskBadge variant="status" value={task.status} size="sm" />
        {task.priority !== 'medium' && (
          <TaskBadge variant="priority" value={task.priority} size="sm" />
        )}
        {task.type && task.type !== 'task' && (
          <TaskBadge variant="type" value={task.type} size="sm" />
        )}
      </div>

      {/* Progress Bar (for tasks with subtasks) */}
      {progress && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-600">
              {progress.completed}/{progress.total} subtasks
            </span>
            <span className="font-medium">{progress.percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Task Metadata */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-3">
          {/* Due Date */}
          {task.dueDate && (
            <div
              className={cn(
                'flex items-center gap-1',
                new Date(task.dueDate) < new Date() &&
                  task.status !== 'done' &&
                  'text-red-600'
              )}
            >
              <Calendar className="h-3 w-3" />
              <span>
                {formatDistanceToNow(new Date(task.dueDate), {
                  addSuffix: true,
                })}
              </span>
            </div>
          )}

          {/* Time Tracking */}
          {task.timeTracking?.totalTime > 0 && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{Math.round(task.timeTracking.totalTime / 60)}h</span>
            </div>
          )}

          {/* Comments Count */}
          {task.commentsCount > 0 && (
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              <span>{task.commentsCount}</span>
            </div>
          )}

          {/* Attachments Count */}
          {task.attachments?.length > 0 && (
            <div className="flex items-center gap-1">
              <Paperclip className="h-3 w-3" />
              <span>{task.attachments.length}</span>
            </div>
          )}

          {/* Subtasks Count */}
          {task.subtasks?.length > 0 && (
            <div className="flex items-center gap-1">
              <CheckSquare className="h-3 w-3" />
              <span>{task.subtasks.length}</span>
            </div>
          )}

          {/* Dependencies Indicator */}
          {task.dependencies?.length > 0 && (
            <div className="flex items-center gap-1" title="Has dependencies">
              <Users className="h-3 w-3" />
              <span>{task.dependencies.length}</span>
            </div>
          )}
        </div>

        {/* Assignee */}
        {task.assignee && <UserAvatar user={task.assignee} size="sm" />}
      </div>

      {/* Blocked Indicator */}
      {task.status === 'blocked' && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          <div className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            <span className="font-medium">Blocked</span>
          </div>
          {task.blockReason && <p className="mt-1">{task.blockReason}</p>}
        </div>
      )}

      {/* Time Tracking Active Indicator */}
      {isTimeTracking && (
        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="font-medium">Time tracking active</span>
          </div>
        </div>
      )}
    </div>
  );
};

TaskCard.propTypes = {
  /** Task object containing all task information */
  task: PropTypes.shape({
    /** Unique task identifier */
    _id: PropTypes.string.isRequired,
    /** Task title */
    title: PropTypes.string.isRequired,
    /** Task description */
    description: PropTypes.string,
    /** Task status (todo, in-progress, done, etc.) */
    status: PropTypes.string.isRequired,
    /** Task priority (low, medium, high, urgent) */
    priority: PropTypes.oneOf(['low', 'medium', 'high', 'urgent']),
    /** Task type (task, bug, feature, epic) */
    type: PropTypes.oneOf(['task', 'bug', 'feature', 'epic']),
    /** Due date for the task */
    dueDate: PropTypes.string,
    /** Assigned user object */
    assignee: PropTypes.shape({
      name: PropTypes.string.isRequired,
      email: PropTypes.string,
      avatar: PropTypes.string,
    }),
    /** Array of subtasks */
    subtasks: PropTypes.arrayOf(
      PropTypes.shape({
        _id: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        status: PropTypes.string.isRequired,
      })
    ),
    /** Array of task attachments */
    attachments: PropTypes.arrayOf(
      PropTypes.shape({
        _id: PropTypes.string,
        filename: PropTypes.string,
        url: PropTypes.string,
      })
    ),
    /** Array of task dependencies */
    dependencies: PropTypes.arrayOf(PropTypes.string),
    /** Comments count */
    commentsCount: PropTypes.number,
    /** Block reason if task is blocked */
    blockReason: PropTypes.string,
    /** Time tracking information */
    timeTracking: PropTypes.shape({
      /** Whether time tracking is enabled for this task */
      enabled: PropTypes.bool,
      /** Whether time tracking is currently active */
      isActive: PropTypes.bool,
      /** Total time tracked in minutes */
      totalTime: PropTypes.number,
    }),
  }).isRequired,
  /** Whether the card is currently being dragged */
  isDragging: PropTypes.bool,
  /** Callback when the task card is clicked */
  onTaskClick: PropTypes.func,
  /** Callback when the task menu button is clicked */
  onMenuClick: PropTypes.func,
  /** Callback when task status changes */
  onStatusChange: PropTypes.func,
  /** Callback when time tracking is toggled */
  onTimeToggle: PropTypes.func,
  /** Active task menu ID */
  activeTaskMenu: PropTypes.string,
  /** Callback when a task action is performed */
  onTaskAction: PropTypes.func,
  /** Additional CSS classes */
  className: PropTypes.string,
};

TaskCard.defaultProps = {
  isDragging: false,
  onTaskClick: null,
  onMenuClick: null,
  onStatusChange: null,
  onTimeToggle: null,
  activeTaskMenu: null,
  onTaskAction: null,
  className: '',
};
