import React, { useState, useCallback, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { cn } from '../../../utils/cn';
import { TaskColumn } from '../molecules/TaskColumn';
import { TaskCard } from '../molecules/TaskCard';
import {
  updateTaskStatus,
  reorderTasks,
  startTimeTracking,
  stopTimeTracking,
  selectFilteredTasks,
  selectBoardColumns,
} from '../../../features/tasks/taskSlice';
import { Settings, Filter, Search, Plus, MoreVertical } from 'lucide-react';

/**
 * TaskBoard - Main Kanban board component with drag-and-drop functionality
 * Supports task management, filtering, and real-time updates
 */
export const TaskBoard = ({
  projectId,
  tasks: propTasks,
  onTaskClick,
  onAddTask,
  className,
}) => {
  const dispatch = useDispatch();

  // Redux state with fallback to prop tasks
  const selectTasks = useMemo(() => (state) => state.tasks, []);
  const reduxTasks = useSelector(selectFilteredTasks);
  const tasks = propTasks || reduxTasks;
  const reduxBoardColumns = useSelector(selectBoardColumns);
  const { isLoading, error } = useSelector(selectTasks);

  // Default board columns if Redux doesn't have them
  const defaultBoardColumns = [
    { id: 'todo', title: 'To Do', color: '#6B7280' },
    { id: 'in-progress', title: 'In Progress', color: '#F59E0B' },
    { id: 'review', title: 'Review', color: '#8B5CF6' },
    { id: 'done', title: 'Done', color: '#10B981' },
  ];

  const boardColumns =
    reduxBoardColumns && reduxBoardColumns.length > 0
      ? reduxBoardColumns
      : defaultBoardColumns;

  // Local state
  const [activeTask, setActiveTask] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTaskMenu, setActiveTaskMenu] = useState(null);
  const [activeColumnMenu, setActiveColumnMenu] = useState(null);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  /**
   * Group tasks by status/column
   */
  const tasksByColumn = useMemo(() => {
    const grouped = {};

    // Initialize all columns
    boardColumns.forEach((column) => {
      grouped[column.id] = [];
    });

    // Debug: Log task status values
    console.log('🔍 TaskBoard Debug - Tasks:', tasks);
    console.log(
      '🔍 TaskBoard Debug - Board Columns:',
      boardColumns.map((col) => col.id)
    );

    // Group tasks by their status with status mapping
    tasks.forEach((task) => {
      // Map task status to board column ID
      let columnId = task.status || 'todo';

      // Handle common status value mappings
      const statusMappings = {
        'Not Started': 'todo',
        'To Do': 'todo',
        'In Progress': 'in-progress',
        'In-Progress': 'in-progress',
        'Under Review': 'review',
        Review: 'review',
        Complete: 'done',
        Completed: 'done',
        Done: 'done',
      };

      // Apply mapping if it exists
      if (statusMappings[columnId]) {
        columnId = statusMappings[columnId];
      }

      console.log(
        `🔍 Task "${task.title}" has status "${task.status}" -> column "${columnId}"`
      );
      if (grouped[columnId]) {
        grouped[columnId].push(task);
      } else {
        console.warn(
          `⚠️ No column found for status "${columnId}" - task will not appear`
        );
        // As fallback, put unmapped tasks in 'todo' column
        if (grouped['todo']) {
          grouped['todo'].push(task);
          console.log(`📌 Fallback: Added task to 'todo' column`);
        }
      }
    });

    console.log('🔍 TaskBoard Debug - Tasks by Column:', grouped);
    return grouped;
  }, [tasks, boardColumns]);

  /**
   * Handle drag start
   */
  const handleDragStart = useCallback((event) => {
    const { active } = event;

    if (active.data.current?.type === 'task') {
      setActiveTask(active.data.current.task);
    }
  }, []);

  /**
   * Handle drag end - task movement between columns
   */
  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      setActiveTask(null); // Reset the visual for the dragged task overlay

      if (!over) {
        // Dropped outside of any valid droppable area
        return;
      }

      const activeId = active.id; // ID of the dragged task (task._id)
      // It's important to get the most current task data, especially if other operations could modify tasks
      const currentActiveTask = tasks.find((t) => t._id === activeId);

      if (!currentActiveTask) {
        console.warn(
          'DragEnd: Active task data not found in current tasks list.'
        );
        return;
      }

      // Determine the source and target column IDs
      const sourceColumnId = active.data.current?.sortable?.containerId;
      // targetColumnId can be from a sortable item's container or the droppable column itself
      const targetColumnId =
        over.data.current?.sortable?.containerId || over.id;

      if (!sourceColumnId || !targetColumnId) {
        console.warn(
          'DragEnd: Could not determine source or target column ID.'
        );
        return;
      }

      // Check if the task was moved to a different column
      if (sourceColumnId !== targetColumnId) {
        // Inter-column move: Dispatch updateTaskStatus
        dispatch(
          updateTaskStatus({
            taskId: activeId, // activeId is currentActiveTask._id
            status: targetColumnId, // The ID of the new column is the new status
          })
        );
      } else {
        // Intra-column reorder: Task moved within the same column
        const oldIndex = active.data.current?.sortable?.index;
        const newIndex = over.data.current?.sortable?.index;

        // Ensure oldIndex and newIndex are valid numbers and are different
        if (
          typeof oldIndex === 'number' &&
          typeof newIndex === 'number' &&
          oldIndex !== newIndex
        ) {
          // Get all tasks in this column and reorder them
          const columnTasks = tasksByColumn[sourceColumnId] || [];
          const reorderedTasks = arrayMove(columnTasks, oldIndex, newIndex);

          // Create taskOrders array with new order values
          const taskOrders = reorderedTasks.map((task, index) => ({
            taskId: task._id,
            order: index,
          }));

          // Dispatch reorderTasks action with correct format
          dispatch(
            reorderTasks({
              projectId, // projectId is required for the API call
              taskOrders,
            })
          );
        }
      }
    },
    [dispatch, tasks, tasksByColumn, projectId] // Added projectId and tasksByColumn to dependency array
  );

  /**
   * Handle task reordering within the same column
   */
  const handleDragOver = useCallback((event) => {
    const { active, over } = event;

    if (!over) return;

    const activeTask = active.data.current?.task;
    const overColumn = over.data.current?.column;

    if (!activeTask || !overColumn) return;

    // Additional logic for reordering within columns can be added here
    // For now, we'll handle it in handleDragEnd
  }, []);

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
   * Handle task menu actions
   */
  const handleTaskMenu = useCallback(
    (task, event) => {
      event?.stopPropagation();
      setActiveTaskMenu(activeTaskMenu === task._id ? null : task._id);
      setActiveColumnMenu(null); // Close column menu if open
    },
    [activeTaskMenu]
  );

  /**
   * Handle adding new task to specific column
   */
  const handleAddTaskToColumn = useCallback(
    (columnId) => {
      if (onAddTask) {
        onAddTask(columnId);
      }
    },
    [onAddTask]
  );

  /**
   * Handle column menu actions
   */
  const handleColumnAction = useCallback(
    (columnId, action) => {
      switch (action) {
        case 'add-task':
          handleAddTaskToColumn(columnId);
          break;
        case 'clear-done':
          // Clear all done tasks from this column
          const doneTasks =
            tasksByColumn[columnId]?.filter((task) => task.status === 'done') ||
            [];
          if (
            doneTasks.length > 0 &&
            window.confirm(
              `Clear ${doneTasks.length} completed task(s) from this column?`
            )
          ) {
            doneTasks.forEach((task) => {
              dispatch(
                updateTaskStatus({
                  taskId: task._id,
                  status: 'archived',
                })
              );
            });
          }
          break;
        case 'settings':
          console.log('Column settings for:', columnId);
          break;
        default:
          console.log('Unknown column action:', action);
      }
      setActiveColumnMenu(null);
    },
    [handleAddTaskToColumn, tasksByColumn, dispatch]
  );

  /**
   * Handle task actions from menu
   */
  const handleTaskAction = useCallback(
    (taskId, action) => {
      const task = tasks.find((t) => t._id === taskId);
      if (!task) return;

      switch (action) {
        case 'view':
          onTaskClick?.(task);
          break;
        case 'edit':
          onTaskClick?.(task);
          break;
        case 'delete':
          if (
            window.confirm(
              'Are you sure you want to delete this task? This action cannot be undone.'
            )
          ) {
            dispatch(
              updateTaskStatus({
                taskId,
                status: 'deleted',
              })
            );
          }
          break;
        case 'duplicate':
          // For now, just log - in a real app this would create a copy
          console.log('Duplicate task:', task);
          break;
        default:
          console.log('Unknown task action:', action);
      }
      setActiveTaskMenu(null);
    },
    [tasks, onTaskClick, dispatch]
  );

  /**
   * Handle search query change
   */
  const handleSearchChange = useCallback((e) => {
    setSearchQuery(e.target.value);
    // Implement search filtering logic here
  }, []);

  /**
   * Handle column menu click
   */
  const handleColumnMenu = useCallback(
    (column, event) => {
      event?.stopPropagation();
      setActiveColumnMenu(activeColumnMenu === column.id ? null : column.id);
      setActiveTaskMenu(null); // Close task menu if open
    },
    [activeColumnMenu]
  );

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.relative')) {
        setActiveTaskMenu(null);
        setActiveColumnMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <p>Error loading tasks: {error}</p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Board Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Task Board</h2>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
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

          {/* Settings Button */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Board settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-4">
            <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">All Assignees</option>
              {/* Add assignee options here */}
            </select>

            <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>

            <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">All Types</option>
              <option value="task">Task</option>
              <option value="bug">Bug</option>
              <option value="feature">Feature</option>
              <option value="epic">Epic</option>
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

      {/* Board Content */}
      <div className="flex-1 overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="h-full overflow-x-auto">
            <div className="flex h-full min-w-max">
              {boardColumns.map((column) => (
                <div
                  key={column.id}
                  className="w-80 flex-shrink-0 border-r border-gray-200 last:border-r-0"
                >
                  <TaskColumn
                    column={column}
                    tasks={tasksByColumn[column.id] || []}
                    onTaskClick={onTaskClick}
                    onTaskMenuClick={handleTaskMenu}
                    onTimeToggle={handleTimeToggle}
                    onAddTask={handleAddTaskToColumn}
                    onColumnMenuClick={handleColumnMenu}
                    activeTaskMenu={activeTaskMenu}
                    activeColumnMenu={activeColumnMenu}
                    onTaskAction={handleTaskAction}
                    onColumnAction={handleColumnAction}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeTask && (
              <TaskCard
                task={activeTask}
                isDragging={true}
                className="transform rotate-2 shadow-2xl"
              />
            )}
          </DragOverlay>
        </DndContext>
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

      {/* Empty State */}
      {!isLoading && tasks.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No tasks yet
            </h3>
            <p className="text-gray-600 mb-4">
              Get started by creating your first task
            </p>
            <button
              onClick={() => onAddTask?.()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Task
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

TaskBoard.propTypes = {
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

TaskBoard.defaultProps = {
  tasks: [],
  onTaskClick: null,
  onAddTask: null,
  className: '',
};
