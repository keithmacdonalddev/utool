import React, { useState, useCallback, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { cn } from '../../../utils/cn';
import { TaskBadge } from '../atoms/TaskBadge';
import { UserAvatar } from '../atoms/UserAvatar';
import {
  ChevronUp,
  ChevronDown,
  Filter,
  Search,
  Plus,
  MoreHorizontal,
  Calendar,
  Clock,
  CheckSquare,
  Square,
  ArrowUpDown,
  Eye,
  Edit3,
  Trash2,
  Play,
  Pause,
} from 'lucide-react';
import {
  selectFilteredTasks,
  setTaskFilters,
  setBulkSelection,
  updateTaskStatus,
  startTimeTracking,
  stopTimeTracking,
  bulkUpdateTasks,
} from '../../../features/tasks/taskSlice';
import { formatDistanceToNow, format } from 'date-fns';

/**
 * TaskListView - Comprehensive table view for task management
 * Includes sorting, filtering, bulk operations, and inline editing
 */
export const TaskListView = ({
  projectId,
  tasks: propTasks,
  onTaskClick,
  onAddTask,
  className,
}) => {
  const dispatch = useDispatch();

  // Memoized selectors to prevent rerender warnings
  const selectTasksState = useMemo(() => (state) => state.tasks, []);

  // Use propTasks if provided, otherwise fall back to Redux
  const reduxTasks = useSelector(selectFilteredTasks);
  const tasks = propTasks || reduxTasks;
  const { selectedTasks, taskFilters, isLoading, error } =
    useSelector(selectTasksState);

  // Local state
  const [sortConfig, setSortConfig] = useState({
    key: 'updatedAt',
    direction: 'desc',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [activeTaskMenu, setActiveTaskMenu] = useState(null);

  /**
   * Handle sorting
   */
  const handleSort = useCallback((key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  /**
   * Sort tasks based on current sort configuration
   */
  const sortedTasks = useMemo(() => {
    if (!sortConfig.key) return tasks;

    return [...tasks].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      // Handle different data types
      if (
        sortConfig.key === 'dueDate' ||
        sortConfig.key === 'createdAt' ||
        sortConfig.key === 'updatedAt'
      ) {
        const aDate = aValue ? new Date(aValue) : null;
        const bDate = bValue ? new Date(bValue) : null;

        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;

        return sortConfig.direction === 'asc'
          ? aDate.getTime() - bDate.getTime()
          : bDate.getTime() - aDate.getTime();
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue
          .toLowerCase()
          .localeCompare(bValue.toLowerCase());
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc'
          ? aValue - bValue
          : bValue - aValue;
      }

      return 0;
    });
  }, [tasks, sortConfig]);

  /**
   * Filter tasks based on search query
   */
  const filteredTasks = useMemo(() => {
    if (!searchQuery) return sortedTasks;

    return sortedTasks.filter(
      (task) =>
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.assignee?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sortedTasks, searchQuery]);

  /**
   * Handle row selection
   */
  const handleRowSelect = useCallback((taskId, isSelected) => {
    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(taskId);
      } else {
        newSet.delete(taskId);
      }
      return newSet;
    });
  }, []);

  /**
   * Handle select all
   */
  const handleSelectAll = useCallback(
    (isSelected) => {
      if (isSelected) {
        setSelectedRows(new Set(filteredTasks.map((task) => task._id)));
      } else {
        setSelectedRows(new Set());
      }
    },
    [filteredTasks]
  );

  /**
   * Handle bulk status update
   */
  const handleBulkStatusUpdate = useCallback(
    (status) => {
      const taskIds = Array.from(selectedRows);
      dispatch(
        bulkUpdateTasks({
          taskIds,
          updates: { status },
        })
      );
      setSelectedRows(new Set());
      setShowBulkActions(false);
    },
    [dispatch, selectedRows]
  );

  /**
   * Handle bulk delete
   */
  const handleBulkDelete = useCallback(() => {
    const taskIds = Array.from(selectedRows);

    // Show confirmation dialog
    if (
      window.confirm(
        `Are you sure you want to delete ${taskIds.length} selected task(s)? This action cannot be undone.`
      )
    ) {
      // For now, we'll use bulkUpdateTasks to set status to 'deleted'
      // In a real implementation, you might want a dedicated bulkDeleteTasks action
      dispatch(
        bulkUpdateTasks({
          taskIds,
          updates: { status: 'deleted' },
        })
      );
      setSelectedRows(new Set());
      setShowBulkActions(false);
    }
  }, [dispatch, selectedRows]);

  /**
   * Handle time tracking toggle
   */
  const handleTimeToggle = useCallback(
    (taskId, isActive) => {
      if (isActive) {
        dispatch(startTimeTracking({ taskId }));
      } else {
        dispatch(stopTimeTracking({ taskId }));
      }
    },
    [dispatch]
  );

  /**
   * Handle individual task actions
   */
  const handleTaskAction = useCallback(
    (taskId, action) => {
      switch (action) {
        case 'view':
          onTaskClick?.(filteredTasks.find((t) => t._id === taskId));
          break;
        case 'edit':
          // For now, same as view - in a real app this might open an edit modal
          onTaskClick?.(filteredTasks.find((t) => t._id === taskId));
          break;
        case 'delete':
          if (
            window.confirm(
              'Are you sure you want to delete this task? This action cannot be undone.'
            )
          ) {
            dispatch(
              bulkUpdateTasks({
                taskIds: [taskId],
                updates: { status: 'deleted' },
              })
            );
          }
          break;
        default:
          console.log('Unknown action:', action);
      }
      setActiveTaskMenu(null);
    },
    [dispatch, onTaskClick, filteredTasks]
  );

  /**
   * Render sort indicator
   */
  const SortIndicator = ({ column }) => {
    if (sortConfig.key !== column) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ChevronUp className="h-4 w-4 text-blue-600" />
    ) : (
      <ChevronDown className="h-4 w-4 text-blue-600" />
    );
  };

  /**
   * Render task row
   */
  const TaskRow = ({ task }) => {
    const isSelected = selectedRows.has(task._id);
    const isTimeTracking = task.timeTracking?.isActive || false;

    return (
      <tr
        className={cn(
          'hover:bg-gray-50 transition-colors cursor-pointer',
          isSelected && 'bg-blue-50'
        )}
        onClick={() => onTaskClick?.(task)}
      >
        {/* Selection Checkbox */}
        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => handleRowSelect(task._id, e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        </td>

        {/* Task Title */}
        <td className="px-6 py-4">
          <div className="flex items-center">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {task.title}
              </p>
              {task.description && (
                <p className="text-sm text-gray-500 truncate mt-1">
                  {task.description}
                </p>
              )}
            </div>
          </div>
        </td>

        {/* Status */}
        <td className="px-6 py-4">
          <TaskBadge variant="status" value={task.status} size="sm" />
        </td>

        {/* Priority */}
        <td className="px-6 py-4">
          <TaskBadge variant="priority" value={task.priority} size="sm" />
        </td>

        {/* Assignee */}
        <td className="px-6 py-4">
          {task.assignee ? (
            <UserAvatar
              user={{
                ...task.assignee,
                name:
                  task.assignee.name ||
                  (task.assignee.firstName
                    ? `${task.assignee.firstName} ${
                        task.assignee.lastName || ''
                      }`.trim()
                    : task.assignee.username ||
                      task.assignee.email ||
                      'Unknown User'),
              }}
              size="sm"
            />
          ) : (
            <span className="text-sm text-gray-500">Unassigned</span>
          )}
        </td>

        {/* Due Date */}
        <td className="px-6 py-4">
          {task.dueDate ? (
            <div
              className={cn(
                'text-sm',
                new Date(task.dueDate) < new Date() && task.status !== 'done'
                  ? 'text-red-600 font-medium'
                  : 'text-gray-900'
              )}
            >
              {format(new Date(task.dueDate), 'MMM dd, yyyy')}
            </div>
          ) : (
            <span className="text-sm text-gray-500">No due date</span>
          )}
        </td>

        {/* Progress */}
        <td className="px-6 py-4">
          {task.subtasks && task.subtasks.length > 0 ? (
            <div className="flex items-center">
              <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{
                    width: `${Math.round(
                      (task.subtasks.filter((st) => st.status === 'done')
                        .length /
                        task.subtasks.length) *
                        100
                    )}%`,
                  }}
                />
              </div>
              <span className="text-xs text-gray-600">
                {task.subtasks.filter((st) => st.status === 'done').length}/
                {task.subtasks.length}
              </span>
            </div>
          ) : (
            <span className="text-sm text-gray-500">-</span>
          )}
        </td>

        {/* Time Tracking */}
        <td className="px-6 py-4">
          <div className="flex items-center gap-2">
            {task.timeTracking?.totalTime > 0 && (
              <span className="text-sm text-gray-700">
                {Math.round(task.timeTracking.totalTime / 60)}h
              </span>
            )}
            {isTimeTracking && (
              <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
            )}
          </div>
        </td>

        {/* Updated */}
        <td className="px-6 py-4 text-sm text-gray-500">
          {formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true })}
        </td>

        {/* Actions */}
        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1">
            {/* Time Tracking Toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleTimeToggle(task._id, !isTimeTracking);
              }}
              className={cn(
                'p-1 rounded hover:bg-gray-100 transition-colors',
                isTimeTracking && 'text-blue-600'
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

            {/* More Actions */}
            <div className="relative task-menu-container">
              <button
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                title="More actions"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTaskMenu(
                    activeTaskMenu === task._id ? null : task._id
                  );
                }}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>

              {/* Task Actions Dropdown */}
              {activeTaskMenu === task._id && (
                <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                  <div className="p-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTaskAction(task._id, 'view');
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2"
                    >
                      <Eye className="h-3 w-3" />
                      View
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTaskAction(task._id, 'edit');
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2"
                    >
                      <Edit3 className="h-3 w-3" />
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTaskAction(task._id, 'delete');
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded flex items-center gap-2"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </td>
      </tr>
    );
  };

  // Close task menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeTaskMenu && !event.target.closest('.task-menu-container')) {
        setActiveTaskMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeTaskMenu]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <p>Error loading tasks: {error}</p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Task List</h2>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Bulk Actions */}
          {selectedRows.size > 0 && (
            <div className="flex items-center gap-2 mr-4">
              <span className="text-sm text-gray-600">
                {selectedRows.size} selected
              </span>
              <button
                onClick={() => setShowBulkActions(!showBulkActions)}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Bulk Actions
              </button>
              {showBulkActions && (
                <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                  <div className="p-2">
                    <button
                      onClick={() => handleBulkStatusUpdate('todo')}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                    >
                      Mark as To Do
                    </button>
                    <button
                      onClick={() => handleBulkStatusUpdate('in-progress')}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                    >
                      Mark as In Progress
                    </button>
                    <button
                      onClick={() => handleBulkStatusUpdate('done')}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                    >
                      Mark as Done
                    </button>
                    <button
                      onClick={() => handleBulkDelete()}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                    >
                      Delete Selected
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'px-3 py-2 text-sm font-medium rounded-lg border transition-colors',
              showFilters
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            )}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </button>

          {/* Add Task Button */}
          <button
            onClick={() => onAddTask?.()}
            className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-4">
            <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">All Statuses</option>
              <option value="todo">To Do</option>
              <option value="in-progress">In Progress</option>
              <option value="in-review">In Review</option>
              <option value="blocked">Blocked</option>
              <option value="done">Done</option>
            </select>

            <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>

            <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">All Assignees</option>
              {/* Add assignee options here */}
            </select>

            <button
              onClick={() => setShowFilters(false)}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Clear filters
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={
                    selectedRows.size > 0 &&
                    selectedRows.size === filteredTasks.length
                  }
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </th>

              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('title')}
              >
                <div className="flex items-center gap-1">
                  Task
                  <SortIndicator column="title" />
                </div>
              </th>

              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center gap-1">
                  Status
                  <SortIndicator column="status" />
                </div>
              </th>

              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('priority')}
              >
                <div className="flex items-center gap-1">
                  Priority
                  <SortIndicator column="priority" />
                </div>
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assignee
              </th>

              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('dueDate')}
              >
                <div className="flex items-center gap-1">
                  Due Date
                  <SortIndicator column="dueDate" />
                </div>
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Progress
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time
              </th>

              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('updatedAt')}
              >
                <div className="flex items-center gap-1">
                  Updated
                  <SortIndicator column="updatedAt" />
                </div>
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTasks.map((task) => (
              <TaskRow key={task._id} task={task} />
            ))}
          </tbody>
        </table>

        {/* Empty State */}
        {!isLoading && filteredTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <CheckSquare className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No tasks match your search' : 'No tasks yet'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery
                ? 'Try adjusting your search terms or filters'
                : 'Get started by creating your first task'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => onAddTask?.()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Task
              </button>
            )}
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-600">Loading tasks...</span>
          </div>
        </div>
      )}
    </div>
  );
};

TaskListView.propTypes = {
  /** Project ID for filtering and organizing tasks */
  projectId: PropTypes.string.isRequired,
  /** Array of tasks to display */
  tasks: PropTypes.array,
  /** Callback when a task is clicked to open task details */
  onTaskClick: PropTypes.func,
  /** Callback when "Add Task" button is clicked */
  onAddTask: PropTypes.func,
  /** Additional CSS classes */
  className: PropTypes.string,
};

TaskListView.defaultProps = {
  tasks: [],
  onTaskClick: null,
  onAddTask: null,
  className: '',
};
