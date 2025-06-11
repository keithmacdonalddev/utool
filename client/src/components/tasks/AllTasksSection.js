// components/tasks/AllTasksSection.js - Enhanced Advanced Task Management Section
//
// This component provides a unified interface for viewing and managing tasks
// with multiple view modes: Board (Kanban), List (Table), and Calendar.
// It integrates the sophisticated task management features that exist in the Redux slice
// but weren't previously exposed in the UI.

import React, { useState, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  PlusCircle,
  LayoutGrid,
  List,
  Calendar,
  Filter,
  Search,
  MoreVertical,
  Timer,
  Play,
  Pause,
  Square,
  CheckSquare,
  Clock,
  Users,
  BarChart3,
  Settings,
  Eye,
  EyeOff,
} from 'lucide-react';
import { FaSpinner, FaTriangleExclamation } from 'react-icons/fa6';

// Import the advanced task components
import { TaskBoard } from '../projects/organisms/TaskBoard';
import { TaskListView } from '../projects/organisms/TaskListView';
import { TaskDetail } from '../projects/organisms/TaskDetail';

// Import the new molecular components we created
import {
  TaskFilters,
  BulkTaskActions,
  QuickAddTask,
} from '../projects/molecules';
import { ProgressBar } from '../projects/atoms';

// Import existing components that are still needed
import TagFilter from './TagFilter';

// Import task slice actions - ENHANCED with advanced features
import {
  setTaskView,
  setTaskFilters,
  selectFilteredTasks,
  selectTaskView,
  selectTaskFilters,
  selectSelectedTasks,
  selectActiveTimeEntries,
  selectBulkOperations,
  toggleTaskSelection,
  clearTaskSelection,
  startTimeTracking,
  stopTimeTracking,
  bulkUpdateTasks,
  // Add more advanced selectors
  selectTasksByStatus,
  selectOverdueTasks,
  selectTaskMetrics,
} from '../../features/tasks/taskSlice';

/**
 * AllTasksSection Component - Enhanced Advanced Task Management Interface
 * Now surfaces the sophisticated task management features that exist in the Redux slice
 * including bulk operations, time tracking, advanced filtering, and analytics.
 *
 * @param {Object} props - Component props.
 * @param {Array<Object>} props.tasks - The full list of tasks
 * @param {Array<Object>} props.filteredTasks - The list of tasks after applying filters
 * @param {boolean} props.tasksLoading - Loading state for tasks
 * @param {Object|string|null} props.tasksError - Error object or message for tasks
 * @param {Array<string>} props.selectedTags - Currently selected tags for filtering
 * @param {Function} props.onTaskClick - Callback when a task is clicked
 * @param {Function} props.onAddTaskClick - Callback to trigger adding a new task
 * @param {Function} props.onTagSelect - Callback when a tag is selected
 * @param {Function} props.onTagDeselect - Callback when a tag is deselected
 * @param {Function} props.onClearAllTags - Callback to clear all tag filters
 * @param {Function} props.onRetryTasks - Callback to retry fetching tasks
 * @param {Object} props.backgroundRefreshState - Background refresh state information
 * @param {string} props.projectId - Current project ID
 * @param {Array} props.teamMembers - Project team members for filtering and assignment
 */
const AllTasksSection = ({
  tasks,
  filteredTasks,
  tasksLoading,
  tasksError,
  selectedTags,
  onTaskClick,
  onAddTaskClick,
  onTagSelect,
  onTagDeselect,
  onClearAllTags,
  onRetryTasks,
  backgroundRefreshState,
  projectId,
  teamMembers = [],
}) => {
  const dispatch = useDispatch();

  // Redux state for advanced task management
  const currentView = useSelector(selectTaskView) || 'list';
  const taskFilters = useSelector(selectTaskFilters);
  const selectedTasks = useSelector(selectSelectedTasks);
  const activeTimeEntries = useSelector(selectActiveTimeEntries);
  const bulkOperations = useSelector(selectBulkOperations);
  const taskMetrics = useSelector(selectTaskMetrics);

  // Advanced selectors for analytics
  const tasksByStatus = useSelector((state) =>
    selectTasksByStatus(state, projectId)
  );
  const overdueTasks = useSelector((state) =>
    selectOverdueTasks(state, projectId)
  );

  // Local state - enhanced
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showTaskAnalytics, setShowTaskAnalytics] = useState(false);
  const [layoutMode, setLayoutMode] = useState('full'); // 'full', 'compact', 'analytics'

  /**
   * Enhanced task statistics calculation
   */
  const taskStats = useMemo(() => {
    if (!tasks || tasks.length === 0) {
      return {
        total: 0,
        completed: 0,
        inProgress: 0,
        overdue: 0,
        activeTimers: 0,
      };
    }

    const now = new Date();
    const completed = tasks.filter((task) => task.status === 'done').length;
    const inProgress = tasks.filter((task) =>
      ['in-progress', 'in-review'].includes(task.status)
    ).length;
    const overdue = tasks.filter(
      (task) =>
        task.dueDate && new Date(task.dueDate) < now && task.status !== 'done'
    ).length;
    const activeTimers = Object.keys(activeTimeEntries || {}).length;

    return {
      total: tasks.length,
      completed,
      inProgress,
      overdue,
      activeTimers,
      completionRate:
        tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0,
    };
  }, [tasks, activeTimeEntries]);

  /**
   * Handle view change (Board, List, Calendar)
   */
  const handleViewChange = useCallback(
    (view) => {
      dispatch(setTaskView(view));
    },
    [dispatch]
  );

  /**
   * Handle advanced filter changes
   */
  const handleAdvancedFilterChange = useCallback(
    (newFilters) => {
      dispatch(setTaskFilters(newFilters));
    },
    [dispatch]
  );

  /**
   * Handle task selection for bulk operations
   */
  const handleTaskSelection = useCallback(
    (taskId) => {
      dispatch(toggleTaskSelection(taskId));
    },
    [dispatch]
  );

  /**
   * Handle bulk operations
   */
  const handleBulkAction = useCallback(
    async (actionData) => {
      const { action, taskIds, data } = actionData;

      try {
        switch (action) {
          case 'update_status':
            await dispatch(
              bulkUpdateTasks({
                taskIds,
                updates: { status: data.status },
                projectId,
              })
            ).unwrap();
            break;
          case 'update_priority':
            await dispatch(
              bulkUpdateTasks({
                taskIds,
                updates: { priority: data.priority },
                projectId,
              })
            ).unwrap();
            break;
          case 'update_assignee':
            await dispatch(
              bulkUpdateTasks({
                taskIds,
                updates: { assignee: data.assignee },
                projectId,
              })
            ).unwrap();
            break;
          case 'archive':
            await dispatch(
              bulkUpdateTasks({
                taskIds,
                updates: { archived: true },
                projectId,
              })
            ).unwrap();
            break;
          default:
            console.warn('Unknown bulk action:', action);
        }
      } catch (error) {
        console.error('Bulk action failed:', error);
      }
    },
    [dispatch, projectId]
  );

  /**
   * Handle time tracking toggle
   */
  const handleTimeTrackingToggle = useCallback(
    (taskId) => {
      if (activeTimeEntries[taskId]) {
        dispatch(stopTimeTracking({ taskId, projectId }));
      } else {
        dispatch(startTimeTracking({ taskId, projectId }));
      }
    },
    [dispatch, activeTimeEntries, projectId]
  );

  /**
   * Handle task click with enhanced task detail
   */
  const handleTaskClick = useCallback(
    (task) => {
      setSelectedTask(task);
      setShowTaskDetail(true);
      if (onTaskClick) {
        onTaskClick(null, task._id);
      }
    },
    [onTaskClick]
  );

  /**
   * Handle task detail close
   */
  const handleTaskDetailClose = useCallback(() => {
    setSelectedTask(null);
    setShowTaskDetail(false);
  }, []);

  /**
   * Handle quick add task
   */
  const handleQuickAddTask = useCallback(
    (taskData) => {
      setShowQuickAdd(false);
      // The QuickAddTask component will handle the actual creation
      if (onAddTaskClick) {
        onAddTaskClick(taskData);
      }
    },
    [onAddTaskClick]
  );

  /**
   * Memoized project object for task components
   */
  const projectObject = useMemo(
    () => ({
      _id: projectId,
      members: teamMembers,
      settings: {
        kanbanColumns: [
          { id: 'todo', title: 'To Do', color: 'gray', order: 0 },
          { id: 'in-progress', title: 'In Progress', color: 'blue', order: 1 },
          { id: 'in-review', title: 'In Review', color: 'yellow', order: 2 },
          { id: 'blocked', title: 'Blocked', color: 'red', order: 3 },
          { id: 'done', title: 'Done', color: 'green', order: 4 },
        ],
      },
    }),
    [projectId, teamMembers]
  );

  // View mode options with enhanced icons
  const viewModes = [
    {
      id: 'board',
      label: 'Board',
      icon: LayoutGrid,
      description: 'Kanban board view',
    },
    {
      id: 'list',
      label: 'List',
      icon: List,
      description: 'Detailed list view',
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: Calendar,
      description: 'Calendar timeline',
    },
  ];

  // Loading state
  if (tasksLoading) {
    return (
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 relative">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4 sm:gap-0">
          <h2 className="text-xl font-semibold text-gray-900">Tasks</h2>
        </div>
        <div className="text-center p-8" role="status" aria-live="polite">
          <FaSpinner className="animate-spin h-8 w-8 text-blue-600 mx-auto" />
          <p className="mt-2 text-gray-600 text-sm">
            Loading advanced task management...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (tasksError && !tasksLoading) {
    return (
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 relative">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4 sm:gap-0">
          <h2 className="text-xl font-semibold text-gray-900">Tasks</h2>
        </div>
        <div
          className="text-center p-8 text-red-600 bg-red-50 rounded-lg border border-red-200"
          role="alert"
        >
          <FaTriangleExclamation className="inline mr-2 mb-1 h-5 w-5" />
          <p className="inline">
            Error loading tasks:{' '}
            {typeof tasksError === 'string'
              ? tasksError
              : tasksError.message || 'An unknown error occurred.'}
          </p>
          {onRetryTasks && (
            <button
              onClick={onRetryTasks}
              className="mt-3 ml-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  // Determine if tasks exist
  const hasTasks = tasks && tasks.length > 0;
  const hasFilteredTasks = filteredTasks && filteredTasks.length > 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 relative">
      {/* Enhanced Header with Analytics */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900">Tasks</h2>

            {/* Task Analytics Summary */}
            {hasTasks && (
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-green-600" />
                  <span className="text-gray-600">
                    {taskStats.completed}/{taskStats.total}
                  </span>
                </div>
                {taskStats.overdue > 0 && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-red-600" />
                    <span className="text-red-600">
                      {taskStats.overdue} overdue
                    </span>
                  </div>
                )}
                {taskStats.activeTimers > 0 && (
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-orange-600" />
                    <span className="text-orange-600">
                      {taskStats.activeTimers} active
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Layout Mode Toggle */}
            <button
              onClick={() => setShowTaskAnalytics(!showTaskAnalytics)}
              className={`p-2 rounded-md transition-colors ${
                showTaskAnalytics
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              title="Toggle analytics"
            >
              <BarChart3 className="h-4 w-4" />
            </button>

            {/* Advanced Filters Toggle */}
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`p-2 rounded-md transition-colors ${
                showAdvancedFilters
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              title="Advanced filters"
            >
              <Filter className="h-4 w-4" />
            </button>

            {/* Quick Add Task */}
            <button
              onClick={() => setShowQuickAdd(!showQuickAdd)}
              className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
            >
              <PlusCircle className="h-4 w-4" />
              Add Task
            </button>

            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {viewModes.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => handleViewChange(id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentView === id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  title={viewModes.find((v) => v.id === id)?.description}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {hasTasks && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Project Progress</span>
              <span>{taskStats.completionRate}% Complete</span>
            </div>
            <ProgressBar
              value={taskStats.completionRate}
              size="medium"
              className="w-full"
            />
          </div>
        )}
      </div>

      {/* Quick Add Task Section */}
      {showQuickAdd && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <QuickAddTask
            projectId={projectId}
            onTaskCreate={handleQuickAddTask}
            onCancel={() => setShowQuickAdd(false)}
          />
        </div>
      )}

      {/* Advanced Task Analytics */}
      {showTaskAnalytics && hasTasks && (
        <div className="p-4 border-b border-gray-200 bg-blue-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {taskStats.total}
              </div>
              <div className="text-sm text-gray-600">Total Tasks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {taskStats.completed}
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {taskStats.inProgress}
              </div>
              <div className="text-sm text-gray-600">In Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {taskStats.overdue}
              </div>
              <div className="text-sm text-gray-600">Overdue</div>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div className="p-4 border-b border-gray-200">
          <TaskFilters
            filters={taskFilters}
            onFiltersChange={handleAdvancedFilterChange}
            teamMembers={teamMembers}
            showAdvanced={true}
            size="sm"
          />
        </div>
      )}

      {/* Bulk Actions */}
      {selectedTasks.length > 0 && (
        <div className="p-4 border-b border-gray-200">
          <BulkTaskActions
            selectedTasks={selectedTasks}
            allTasks={filteredTasks || tasks}
            onBulkAction={handleBulkAction}
            onClearSelection={() => dispatch(clearTaskSelection())}
            teamMembers={teamMembers}
            isLoading={bulkOperations.isProcessing}
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className="p-4">
        {!hasTasks ? (
          // Empty state
          <div className="text-center p-8">
            <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No tasks yet
            </h3>
            <p className="text-gray-500 mb-4">
              Get started by creating your first task for this project.
            </p>
            <button
              onClick={() => setShowQuickAdd(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <PlusCircle className="h-4 w-4" />
              Create First Task
            </button>
          </div>
        ) : (
          // Task View Component
          <div className="min-h-0">
            {currentView === 'board' && (
              <TaskBoard
                project={projectObject}
                projectId={projectId}
                tasks={filteredTasks || tasks}
                onTaskClick={handleTaskClick}
                onTaskSelection={handleTaskSelection}
                onTimeTrackingToggle={handleTimeTrackingToggle}
                selectedTasks={selectedTasks}
                activeTimeEntries={activeTimeEntries}
                className="h-full"
              />
            )}

            {currentView === 'list' && (
              <TaskListView
                project={projectObject}
                projectId={projectId}
                tasks={filteredTasks || tasks}
                onTaskClick={handleTaskClick}
                onTaskSelection={handleTaskSelection}
                onTimeTrackingToggle={handleTimeTrackingToggle}
                selectedTasks={selectedTasks}
                activeTimeEntries={activeTimeEntries}
                className="h-full"
              />
            )}

            {currentView === 'calendar' && (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Calendar View
                </h3>
                <p className="text-gray-500">
                  Calendar view is coming soon. Use Board or List view for now.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Legacy Tag Filter (for backward compatibility) */}
        {hasTasks && selectedTags && selectedTags.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <TagFilter
              selectedTags={selectedTags}
              onTagSelect={onTagSelect}
              onTagDeselect={onTagDeselect}
              onClearAllTags={onClearAllTags}
            />
          </div>
        )}
      </div>

      {/* Enhanced Task Detail Modal */}
      {selectedTask && showTaskDetail && (
        <TaskDetail
          task={selectedTask}
          isOpen={showTaskDetail}
          onClose={handleTaskDetailClose}
          onTimeTrackingToggle={handleTimeTrackingToggle}
          activeTimeEntries={activeTimeEntries}
          projectId={projectId}
          teamMembers={teamMembers}
        />
      )}

      {/* Background refresh indicator */}
      {backgroundRefreshState?.backgroundRefreshingRecent && (
        <div className="absolute top-2 right-2 flex items-center text-xs text-blue-600">
          <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse mr-1"></div>
          <span>Syncing tasks...</span>
        </div>
      )}
    </div>
  );
};

export default AllTasksSection;
