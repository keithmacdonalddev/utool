import React from 'react';
import PropTypes from 'prop-types';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '../../../utils/cn';
import { TaskCard } from './TaskCard';
import { Plus, MoreHorizontal } from 'lucide-react';

/**
 * TaskColumn - Component for Kanban board columns with drag-and-drop functionality
 */
export const TaskColumn = ({
  column,
  tasks,
  onTaskClick,
  onTaskMenuClick,
  onTimeToggle,
  onAddTask,
  onColumnMenuClick,
  activeTaskMenu,
  activeColumnMenu,
  onTaskAction,
  onColumnAction,
  className,
}) => {
  const { setNodeRef, isOver, active } = useDroppable({
    id: column.id,
    data: {
      type: 'column',
      column,
    },
  });

  // Check if we can drop the currently dragged item
  const canDrop = active?.data?.current?.type === 'task';

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Column Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3">
          {/* Column Color Indicator */}
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: column.color }}
          />

          {/* Column Title and Count */}
          <div>
            <h3 className="font-semibold text-gray-900">{column.name}</h3>
            <span className="text-sm text-gray-500">
              {tasks.length} task{tasks.length !== 1 ? 's' : ''}
              {column.wipLimit && (
                <span
                  className={cn(
                    'ml-1',
                    tasks.length > column.wipLimit && 'text-red-600 font-medium'
                  )}
                >
                  / {column.wipLimit} limit
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Column Actions */}
        <div className="flex items-center gap-1">
          {/* Add Task Button */}
          <button
            onClick={() => onAddTask?.(column.id)}
            className="p-1 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900"
            title="Add task"
          >
            <Plus className="h-4 w-4" />
          </button>

          {/* Column Menu */}
          <div className="relative">
            <button
              onClick={(e) => onColumnMenuClick?.(column, e)}
              className="p-1 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900"
              title="Column options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {/* Column Menu Dropdown */}
            {activeColumnMenu === column.id && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                <div className="p-1">
                  <button
                    onClick={() => onColumnAction?.('add-task')}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2"
                  >
                    <Plus className="h-3 w-3" />
                    Add Task
                  </button>
                  <button
                    onClick={() => onColumnAction?.('clear-done')}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2"
                  >
                    <div className="h-3 w-3 bg-green-500 rounded-full" />
                    Clear Completed
                  </button>
                  <button
                    onClick={() => onColumnAction?.('settings')}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2"
                  >
                    <MoreHorizontal className="h-3 w-3" />
                    Column Settings
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Column Content Area */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 p-4 transition-colors min-h-[200px]',
          isOver &&
            canDrop &&
            'bg-blue-50 border-2 border-blue-200 border-dashed',
          !canDrop && isOver && 'bg-red-50'
        )}
      >
        {/* WIP Limit Warning */}
        {column.wipLimit && tasks.length > column.wipLimit && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <div className="h-2 w-2 bg-red-500 rounded-full" />
              <span className="text-sm font-medium">
                WIP limit exceeded ({tasks.length}/{column.wipLimit})
              </span>
            </div>
            <p className="text-xs text-red-600 mt-1">
              Consider moving tasks to other columns or increasing the limit.
            </p>
          </div>
        )}

        {/* Tasks List */}
        <SortableContext
          items={tasks.map((task) => task._id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {tasks.map((task) => (
              <SortableTaskCard
                key={task._id}
                task={task}
                onTaskClick={onTaskClick}
                onMenuClick={onTaskMenuClick}
                onTimeToggle={onTimeToggle}
                activeTaskMenu={activeTaskMenu}
                onTaskAction={onTaskAction}
              />
            ))}
          </div>
        </SortableContext>

        {/* Empty State */}
        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Plus className="h-8 w-8" />
            </div>
            <p className="text-sm font-medium">No tasks yet</p>
            <p className="text-xs text-center mt-1">
              Drag tasks here or click the + button to add one
            </p>
          </div>
        )}

        {/* Drop Zone Indicator */}
        {isOver && canDrop && (
          <div className="absolute inset-4 border-2 border-blue-300 border-dashed rounded-lg bg-blue-50/50 flex items-center justify-center pointer-events-none">
            <div className="text-blue-600 font-medium">Drop task here</div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * SortableTaskCard - Wrapper for TaskCard with drag-and-drop functionality
 */
import { useSortable } from '@dnd-kit/sortable';

const SortableTaskCard = ({
  task,
  onTaskClick,
  onMenuClick,
  onTimeToggle,
  activeTaskMenu,
  onTaskAction,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task._id,
    data: {
      type: 'task',
      task,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard
        task={task}
        isDragging={isDragging}
        onTaskClick={onTaskClick}
        onMenuClick={onMenuClick}
        onTimeToggle={onTimeToggle}
        activeTaskMenu={activeTaskMenu}
        onTaskAction={onTaskAction}
      />
    </div>
  );
};

TaskColumn.propTypes = {
  /** Column configuration object */
  column: PropTypes.shape({
    /** Unique column identifier */
    id: PropTypes.string.isRequired,
    /** Column display name */
    name: PropTypes.string.isRequired,
    /** Column color for visual identification */
    color: PropTypes.string,
    /** Work-in-progress limit for this column */
    wipLimit: PropTypes.number,
  }).isRequired,
  /** Array of tasks to display in this column */
  tasks: PropTypes.arrayOf(
    PropTypes.shape({
      /** Unique task identifier */
      _id: PropTypes.string.isRequired,
      /** Task title */
      title: PropTypes.string.isRequired,
      /** Task status */
      status: PropTypes.string.isRequired,
      /** Additional task properties as defined in TaskCard */
    })
  ).isRequired,
  /** Callback when a task is clicked */
  onTaskClick: PropTypes.func,
  /** Callback when task menu is clicked */
  onTaskMenuClick: PropTypes.func,
  /** Callback when time tracking is toggled */
  onTimeToggle: PropTypes.func,
  /** Callback when "Add Task" is clicked for this column */
  onAddTask: PropTypes.func,
  /** Callback when column menu is clicked */
  onColumnMenuClick: PropTypes.func,
  /** Active task menu */
  activeTaskMenu: PropTypes.object,
  /** Active column menu */
  activeColumnMenu: PropTypes.object,
  /** Callback when a task action is performed */
  onTaskAction: PropTypes.func,
  /** Callback when a column action is performed */
  onColumnAction: PropTypes.func,
  /** Additional CSS classes */
  className: PropTypes.string,
};

TaskColumn.defaultProps = {
  onTaskClick: null,
  onTaskMenuClick: null,
  onTimeToggle: null,
  onAddTask: null,
  onColumnMenuClick: null,
  activeTaskMenu: null,
  activeColumnMenu: null,
  onTaskAction: null,
  onColumnAction: null,
  className: '',
};
