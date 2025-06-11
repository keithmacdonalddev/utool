import React, { useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Clock,
  User,
  Calendar,
  Flag,
  MessageCircle,
  Paperclip,
  Play,
  Pause,
  Square,
  MoreVertical,
  CheckSquare,
  Edit3,
  Tag,
  AlertTriangle,
  Timer,
  Eye,
} from 'lucide-react';
import { cn } from '../../../utils/cn';

// Import atomic components
import {
  StatusSelect,
  PrioritySelect,
  EditableText,
  ProgressBar,
} from '../atoms';

/**
 * @component TaskRow
 * @description Molecular component for displaying tasks in list/table view.
 * Provides comprehensive task information in a compact row format with
 * inline editing, time tracking, and selection capabilities.
 *
 * @param {Object} task - Task object with all properties
 * @param {boolean} isSelected - Whether the task is selected for bulk operations
 * @param {boolean} isTimeTracking - Whether time tracking is active for this task
 * @param {Object} activeTimeEntry - Active time entry details
 * @param {function} onTaskClick - Callback when task is clicked
 * @param {function} onTaskSelection - Callback when task selection changes
 * @param {function} onTimeTrackingToggle - Callback to toggle time tracking
 * @param {function} onStatusChange - Callback when status changes
 * @param {function} onPriorityChange - Callback when priority changes
 * @param {function} onTitleUpdate - Callback when title is updated
 * @param {Array} teamMembers - Available team members
 * @param {boolean} showSelection - Whether to show selection checkbox
 * @param {boolean} showTimeTracking - Whether to show time tracking controls
 * @param {boolean} compact - Whether to use compact display mode
 * @param {string} className - Additional CSS classes
 */
const TaskRow = ({
  task,
  isSelected = false,
  isTimeTracking = false,
  activeTimeEntry = null,
  onTaskClick,
  onTaskSelection,
  onTimeTrackingToggle,
  onStatusChange,
  onPriorityChange,
  onTitleUpdate,
  teamMembers = [],
  showSelection = false,
  showTimeTracking = true,
  compact = false,
  className = '',
  ...props
}) => {
  const [showActions, setShowActions] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  // Extract task properties with defaults
  const {
    _id: taskId,
    title = 'Untitled Task',
    description = '',
    status = 'todo',
    priority = 'medium',
    dueDate,
    assignee,
    tags = [],
    progress = { percentage: 0 },
    comments = [],
    attachments = [],
    timeEntries = [],
    isBlocked = false,
    subtasks = [],
    createdAt,
    updatedAt,
  } = task;

  // Priority configuration
  const priorityConfig = {
    low: {
      color: 'text-green-600',
      bg: 'bg-green-100',
      icon: 'text-green-500',
    },
    medium: {
      color: 'text-yellow-600',
      bg: 'bg-yellow-100',
      icon: 'text-yellow-500',
    },
    high: {
      color: 'text-orange-600',
      bg: 'bg-orange-100',
      icon: 'text-orange-500',
    },
    critical: { color: 'text-red-600', bg: 'bg-red-100', icon: 'text-red-500' },
  };

  // Status configuration
  const statusConfig = {
    todo: { color: 'text-gray-600', bg: 'bg-gray-100' },
    'in-progress': { color: 'text-blue-600', bg: 'bg-blue-100' },
    review: { color: 'text-purple-600', bg: 'bg-purple-100' },
    done: { color: 'text-green-600', bg: 'bg-green-100' },
    blocked: { color: 'text-red-600', bg: 'bg-red-100' },
  };

  // Calculate time tracking information
  const totalTimeSpent = useMemo(() => {
    if (!timeEntries || timeEntries.length === 0) return 0;
    return timeEntries.reduce(
      (total, entry) => total + (entry.duration || 0),
      0
    );
  }, [timeEntries]);

  const currentActiveTime = useMemo(() => {
    if (!isTimeTracking || !activeTimeEntry) return 0;
    const start = new Date(activeTimeEntry.startTime);
    const now = new Date();
    return Math.floor((now - start) / 1000 / 60); // minutes
  }, [isTimeTracking, activeTimeEntry]);

  // Check if task is overdue
  const isOverdue = useMemo(() => {
    if (!dueDate || status === 'done') return false;
    return new Date(dueDate) < new Date();
  }, [dueDate, status]);

  // Format date display
  const formatDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    const today = new Date();
    const diffDays = Math.ceil((d - today) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 0 && diffDays <= 7) return `${diffDays} days`;
    if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;

    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // Format time duration
  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Handle task click
  const handleTaskClick = useCallback(
    (e) => {
      if (
        e.target.closest('button') ||
        e.target.closest('input') ||
        e.target.closest('select')
      ) {
        return; // Don't trigger if clicking interactive elements
      }
      if (onTaskClick) {
        onTaskClick(task);
      }
    },
    [task, onTaskClick]
  );

  // Handle selection change
  const handleSelectionChange = useCallback(
    (e) => {
      e.stopPropagation();
      if (onTaskSelection) {
        onTaskSelection(taskId);
      }
    },
    [taskId, onTaskSelection]
  );

  // Handle time tracking toggle
  const handleTimeTrackingToggle = useCallback(
    (e) => {
      e.stopPropagation();
      if (onTimeTrackingToggle) {
        onTimeTrackingToggle(taskId);
      }
    },
    [taskId, onTimeTrackingToggle]
  );

  // Handle title update
  const handleTitleUpdate = useCallback(
    async (newTitle) => {
      if (onTitleUpdate) {
        await onTitleUpdate(taskId, newTitle);
      }
    },
    [taskId, onTitleUpdate]
  );

  // Handle status change
  const handleStatusChange = useCallback(
    (newStatus) => {
      if (onStatusChange) {
        onStatusChange(taskId, newStatus);
      }
    },
    [taskId, onStatusChange]
  );

  // Handle priority change
  const handlePriorityChange = useCallback(
    (newPriority) => {
      if (onPriorityChange) {
        onPriorityChange(taskId, newPriority);
      }
    },
    [taskId, onPriorityChange]
  );

  // Get assignee display name
  const getAssigneeName = () => {
    if (!assignee) return 'Unassigned';
    if (typeof assignee === 'string') return assignee;
    return assignee.name || assignee.username || 'Unknown';
  };

  return (
    <div
      className={cn(
        'group border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer',
        isSelected && 'bg-blue-50 border-blue-200',
        isOverdue && 'border-l-4 border-l-red-400',
        isBlocked && 'border-l-4 border-l-orange-400',
        className
      )}
      onClick={handleTaskClick}
      {...props}
    >
      <div
        className={cn('flex items-center gap-3 py-3 px-4', compact && 'py-2')}
      >
        {/* Selection Checkbox */}
        {showSelection && (
          <div className="flex-shrink-0">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={handleSelectionChange}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* Priority Indicator */}
        <div className="flex-shrink-0">
          <Flag className={cn('h-4 w-4', priorityConfig[priority]?.icon)} />
        </div>

        {/* Task Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {/* Task Title */}
            <div className="flex-1 min-w-0">
              <EditableText
                value={title}
                onSave={handleTitleUpdate}
                variant="text"
                size={compact ? 'sm' : 'md'}
                className={cn(
                  'font-medium',
                  status === 'done' && 'line-through text-gray-500'
                )}
                disabled={status === 'done'}
              />
            </div>

            {/* Task Badges */}
            <div className="flex items-center gap-1">
              {isBlocked && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                  <AlertTriangle className="h-3 w-3" />
                  Blocked
                </span>
              )}

              {subtasks.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                  <CheckSquare className="h-3 w-3" />
                  {subtasks.filter((st) => st.status === 'done').length}/
                  {subtasks.length}
                </span>
              )}
            </div>
          </div>

          {/* Task Metadata */}
          {!compact && (
            <div className="flex items-center gap-4 text-xs text-gray-500">
              {/* Description Preview */}
              {description && (
                <span className="truncate max-w-xs">
                  {description.slice(0, 60)}
                  {description.length > 60 ? '...' : ''}
                </span>
              )}

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  <span>{tags.slice(0, 2).join(', ')}</span>
                  {tags.length > 2 && <span>+{tags.length - 2}</span>}
                </div>
              )}

              {/* Comments */}
              {comments.length > 0 && (
                <div className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  <span>{comments.length}</span>
                </div>
              )}

              {/* Attachments */}
              {attachments.length > 0 && (
                <div className="flex items-center gap-1">
                  <Paperclip className="h-3 w-3" />
                  <span>{attachments.length}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status */}
        <div className="flex-shrink-0 w-24">
          <StatusSelect
            value={status}
            onChange={handleStatusChange}
            size="sm"
            options={[
              { value: 'todo', label: 'To Do', color: 'gray' },
              { value: 'in-progress', label: 'In Progress', color: 'blue' },
              { value: 'review', label: 'Review', color: 'purple' },
              { value: 'done', label: 'Done', color: 'green' },
              { value: 'blocked', label: 'Blocked', color: 'red' },
            ]}
          />
        </div>

        {/* Priority */}
        <div className="flex-shrink-0 w-20">
          <PrioritySelect
            value={priority}
            onChange={handlePriorityChange}
            size="sm"
          />
        </div>

        {/* Assignee */}
        <div className="flex-shrink-0 w-24">
          <div className="flex items-center gap-2">
            <User className="h-3 w-3 text-gray-400" />
            <span className="text-sm text-gray-600 truncate">
              {getAssigneeName()}
            </span>
          </div>
        </div>

        {/* Due Date */}
        <div className="flex-shrink-0 w-20">
          {dueDate && (
            <div
              className={cn(
                'flex items-center gap-1 text-sm',
                isOverdue ? 'text-red-600' : 'text-gray-600'
              )}
            >
              <Calendar className="h-3 w-3" />
              <span>{formatDate(dueDate)}</span>
            </div>
          )}
        </div>

        {/* Progress */}
        {!compact && progress.percentage > 0 && (
          <div className="flex-shrink-0 w-16">
            <ProgressBar
              progress={progress.percentage}
              size="sm"
              showLabel={false}
            />
          </div>
        )}

        {/* Time Tracking */}
        {showTimeTracking && (
          <div className="flex-shrink-0 w-20">
            <div className="flex items-center gap-1">
              <button
                onClick={handleTimeTrackingToggle}
                className={cn(
                  'p-1 rounded hover:bg-gray-200 transition-colors',
                  isTimeTracking && 'text-green-600 bg-green-100'
                )}
                title={isTimeTracking ? 'Stop timer' : 'Start timer'}
              >
                {isTimeTracking ? (
                  <Pause className="h-3 w-3" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
              </button>

              <div className="text-xs text-gray-600">
                {isTimeTracking && currentActiveTime > 0 ? (
                  <span className="text-green-600 font-medium">
                    {formatDuration(currentActiveTime)}
                  </span>
                ) : totalTimeSpent > 0 ? (
                  formatDuration(totalTimeSpent)
                ) : (
                  '0m'
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowActions(!showActions);
            }}
            className="p-1 rounded hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Actions Dropdown */}
      {showActions && (
        <div className="absolute right-4 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
          <div className="py-1">
            <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-50">
              <Eye className="h-4 w-4" />
              View Details
            </button>
            <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-50">
              <Edit3 className="h-4 w-4" />
              Edit Task
            </button>
            <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-50">
              <Timer className="h-4 w-4" />
              Time Entries
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

TaskRow.propTypes = {
  task: PropTypes.object.isRequired,
  isSelected: PropTypes.bool,
  isTimeTracking: PropTypes.bool,
  activeTimeEntry: PropTypes.object,
  onTaskClick: PropTypes.func,
  onTaskSelection: PropTypes.func,
  onTimeTrackingToggle: PropTypes.func,
  onStatusChange: PropTypes.func,
  onPriorityChange: PropTypes.func,
  onTitleUpdate: PropTypes.func,
  teamMembers: PropTypes.array,
  showSelection: PropTypes.bool,
  showTimeTracking: PropTypes.bool,
  compact: PropTypes.bool,
  className: PropTypes.string,
};

export default TaskRow;
