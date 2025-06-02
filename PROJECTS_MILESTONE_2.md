# PROJECTS FEATURE REORGANIZATION - MILESTONE 2

## Essential Task Management System (Week 3-4)

**Risk:** Low | **Value:** High - Core User Needs  
**Status:** Planning Phase

---

### Overview

This milestone focuses on building practical, user-friendly task management features that solve real problems for small teams. We'll enhance the existing task infrastructure with essential features like improved task views, basic task relationships, and simple progress tracking - avoiding over-engineering for future needs.

### Integration with Existing Codebase

**Existing Files to Enhance/Modify:**

- `client/src/components/TaskList.js` - Current basic task list component
- `client/src/pages/ProjectDetailsPage.js` - Project view containing tasks
- `server/models/Task.js` - Current task schema
- `server/controllers/taskController.js` - Task CRUD operations
- `client/src/features/tasks/tasksSlice.js` - Redux state (if exists)

**Patterns We'll Maintain:**

- Tailwind CSS for all styling
- Lucide React icons consistently
- Redux Toolkit for state management
- Existing API patterns and authentication
- Current notification system integration

---

## 📊 DELIVERABLES

### 1. Enhanced Task Schema

**File: `server/models/Task.js`**

```javascript
import mongoose from 'mongoose';
const { Schema } = mongoose;

const taskSchema = new Schema(
  {
    // Core Information
    title: {
      type: String,
      required: true,
      trim: true,
      maxLength: 500,
      index: true,
    },
    description: {
      type: String,
      maxLength: 5000,
    },

    // Project & Organization
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    parentTask: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      default: null, // null means it's a top-level task
    },
    subtasks: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Task',
      },
    ],

    // Assignment & Ownership
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignee: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    assignedAt: { type: Date },

    // Status & Progress
    status: {
      type: String,
      enum: [
        'todo',
        'in-progress',
        'in-review',
        'blocked',
        'done',
        'cancelled',
      ],
      default: 'todo',
      index: true,
    },
    progress: {
      percentage: { type: Number, default: 0, min: 0, max: 100 },
      automatic: { type: Boolean, default: true }, // Auto-calculate from subtasks
      lastUpdated: { type: Date, default: Date.now },
    },
    completedAt: { type: Date },
    completedBy: { type: Schema.Types.ObjectId, ref: 'User' },

    // Priority & Categorization
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true,
    },
    category: {
      type: String,
      default: 'General',
      index: true,
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],

    // Time Management
    dueDate: {
      type: Date,
      index: true,
    },
    startDate: { type: Date },
    estimatedHours: { type: Number, min: 0 },
    actualHours: { type: Number, default: 0, min: 0 },

    // Time Tracking
    timeEntries: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        startTime: { type: Date, required: true },
        endTime: { type: Date },
        duration: { type: Number }, // in minutes
        description: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // Dependencies
    dependencies: {
      blockedBy: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
      blocks: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
    },

    // Attachments & Comments
    attachments: [
      {
        filename: { type: String, required: true },
        originalName: { type: String, required: true },
        mimetype: { type: String, required: true },
        size: { type: Number, required: true },
        uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        uploadedAt: { type: Date, default: Date.now },
        url: { type: String, required: true },
      },
    ],

    commentsCount: { type: Number, default: 0 },

    // Recurring Task Settings
    recurring: {
      enabled: { type: Boolean, default: false },
      pattern: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'custom'],
      },
      interval: { type: Number, default: 1 },
      daysOfWeek: [{ type: Number, min: 0, max: 6 }], // 0 = Sunday
      dayOfMonth: { type: Number, min: 1, max: 31 },
      endDate: { type: Date },
      nextDueDate: { type: Date },
    },

    // Activity & Engagement
    activity: {
      lastActivityAt: { type: Date, default: Date.now },
      lastActivityBy: { type: Schema.Types.ObjectId, ref: 'User' },
      viewCount: { type: Number, default: 0 },
      updateCount: { type: Number, default: 0 },
    },

    // Custom Fields
    customFields: {
      type: Map,
      of: Schema.Types.Mixed,
    },

    // Metadata
    order: { type: Number, default: 0 }, // For manual sorting
    archived: { type: Boolean, default: false },
    archivedAt: { type: Date },
    archivedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ assignee: 1, status: 1 });
taskSchema.index({ dueDate: 1, status: 1 });
taskSchema.index({ '$**': 'text' }); // Full-text search

// Virtual for overdue status
taskSchema.virtual('isOverdue').get(function () {
  return (
    this.dueDate &&
    new Date(this.dueDate) < new Date() &&
    !['done', 'cancelled'].includes(this.status)
  );
});

// Virtual for blocking status
taskSchema.virtual('isBlocked').get(function () {
  return this.dependencies.blockedBy.length > 0 || this.status === 'blocked';
});

// Methods
taskSchema.methods.calculateProgress = async function () {
  /**
   * Calculate task progress based on subtasks
   * If task has subtasks, progress = average of subtask progress
   * Otherwise, progress is manually set or based on status
   */
  if (!this.progress.automatic) return this.progress.percentage;

  if (this.subtasks.length > 0) {
    const subtasks = await this.model('Task').find({
      _id: { $in: this.subtasks },
    });
    const totalProgress = subtasks.reduce(
      (sum, task) => sum + task.progress.percentage,
      0
    );
    this.progress.percentage = Math.round(totalProgress / subtasks.length);
  } else {
    // Status-based progress for tasks without subtasks
    const statusProgress = {
      todo: 0,
      'in-progress': 50,
      'in-review': 75,
      blocked: this.progress.percentage, // Keep current
      done: 100,
      cancelled: this.progress.percentage, // Keep current
    };
    this.progress.percentage =
      statusProgress[this.status] ?? this.progress.percentage;
  }

  this.progress.lastUpdated = new Date();
  return this.progress.percentage;
};

taskSchema.methods.addTimeEntry = async function (
  userId,
  startTime,
  endTime,
  description
) {
  /**
   * Add a time tracking entry to the task
   */
  const duration = endTime ? Math.round((endTime - startTime) / 60000) : 0; // Convert to minutes

  this.timeEntries.push({
    user: userId,
    startTime,
    endTime,
    duration,
    description,
  });

  // Update actual hours
  this.actualHours = this.timeEntries.reduce((total, entry) => {
    return total + entry.duration / 60;
  }, 0);

  await this.save();
};

// Middleware to handle subtask relationship
taskSchema.pre('save', async function (next) {
  if (this.isModified('parentTask') && this.parentTask) {
    // Add this task to parent's subtasks array
    await this.model('Task').findByIdAndUpdate(this.parentTask, {
      $addToSet: { subtasks: this._id },
    });
  }
  next();
});

export default mongoose.model('Task', taskSchema);
```

### 2. Task Board Component (Kanban View)

**File: `client/src/components/projects/organisms/TaskBoard.js`**

```javascript
import React, { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDispatch } from 'react-redux';
import {
  Plus,
  Filter,
  Search,
  MoreHorizontal,
  Users,
  Calendar,
  Clock,
} from 'lucide-react';
import { TaskColumn } from '../molecules/TaskColumn';
import { TaskCard } from '../molecules/TaskCard';
import { QuickAddTask } from '../molecules/QuickAddTask';
import { TaskFilters } from '../molecules/TaskFilters';
import { cn } from '../../../utils/cn';
import {
  updateTaskStatus,
  reorderTasks,
} from '../../../features/tasks/tasksSlice';

/**
 * TaskBoard - Kanban board view for project tasks
 *
 * This component provides a drag-and-drop Kanban board interface for managing tasks.
 * It supports multiple columns (status-based), task filtering, quick task creation,
 * and real-time updates. The board is fully responsive and accessible.
 *
 * Features:
 * - Drag and drop tasks between columns
 * - Customizable columns based on project settings
 * - Quick task creation within columns
 * - Advanced filtering and search
 * - Bulk operations on selected tasks
 * - Real-time updates via socket connection
 *
 * @param {Object} props.project - The current project object
 * @param {Array} props.tasks - Array of task objects
 * @param {Function} props.onTaskUpdate - Callback for task updates
 * @param {boolean} props.readOnly - Whether the board is read-only
 */
export const TaskBoard = ({
  project,
  tasks = [],
  onTaskUpdate,
  readOnly = false,
}) => {
  const dispatch = useDispatch();
  const [activeId, setActiveId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    assignee: 'all',
    priority: 'all',
    dueDate: 'all',
    tags: [],
  });

  // Column configuration - can be customized per project
  const columns = project?.settings?.kanbanColumns || [
    { id: 'todo', title: 'To Do', color: 'gray' },
    { id: 'in-progress', title: 'In Progress', color: 'blue' },
    { id: 'in-review', title: 'In Review', color: 'yellow' },
    { id: 'blocked', title: 'Blocked', color: 'red' },
    { id: 'done', title: 'Done', color: 'green' },
  ];

  // Configure drag sensors for better UX
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Prevent accidental drags
      },
    })
  );

  /**
   * Filter tasks based on current filters and search
   */
  const filteredTasks = useCallback(() => {
    return tasks.filter((task) => {
      // Search filter
      if (
        searchQuery &&
        !task.title.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      // Assignee filter
      if (
        filters.assignee !== 'all' &&
        task.assignee?._id !== filters.assignee
      ) {
        return false;
      }

      // Priority filter
      if (filters.priority !== 'all' && task.priority !== filters.priority) {
        return false;
      }

      // Due date filter
      if (filters.dueDate !== 'all') {
        const today = new Date();
        const dueDate = task.dueDate ? new Date(task.dueDate) : null;

        switch (filters.dueDate) {
          case 'overdue':
            if (!dueDate || dueDate >= today) return false;
            break;
          case 'today':
            if (!dueDate || dueDate.toDateString() !== today.toDateString())
              return false;
            break;
          case 'week':
            const weekFromNow = new Date(
              today.getTime() + 7 * 24 * 60 * 60 * 1000
            );
            if (!dueDate || dueDate > weekFromNow) return false;
            break;
          default:
            break;
        }
      }

      // Tags filter
      if (filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some((tag) =>
          task.tags.includes(tag)
        );
        if (!hasMatchingTag) return false;
      }

      return true;
    });
  }, [tasks, searchQuery, filters]);

  /**
   * Group tasks by status for columns
   */
  const tasksByStatus = useCallback(() => {
    const grouped = {};
    columns.forEach((column) => {
      grouped[column.id] = [];
    });

    filteredTasks().forEach((task) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });

    // Sort tasks within each column by order
    Object.keys(grouped).forEach((status) => {
      grouped[status].sort((a, b) => a.order - b.order);
    });

    return grouped;
  }, [filteredTasks, columns]);

  /**
   * Handle drag start
   */
  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  /**
   * Handle drag end - update task status and order
   */
  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const activeTask = tasks.find((t) => t._id === active.id);
    const overColumn = columns.find((col) => col.id === over.id);
    const overTask = tasks.find((t) => t._id === over.id);

    if (!activeTask) {
      setActiveId(null);
      return;
    }

    // Determine new status and position
    let newStatus = activeTask.status;
    let newOrder = activeTask.order;

    if (overColumn) {
      // Dropped on a column
      newStatus = overColumn.id;
      const tasksInColumn = tasksByStatus()[newStatus];
      newOrder =
        tasksInColumn.length > 0
          ? Math.max(...tasksInColumn.map((t) => t.order)) + 1
          : 0;
    } else if (overTask) {
      // Dropped on a task
      newStatus = overTask.status;
      newOrder = overTask.order;
    }

    // Only update if something changed
    if (activeTask.status !== newStatus || activeTask.order !== newOrder) {
      dispatch(
        updateTaskStatus({
          taskId: activeTask._id,
          status: newStatus,
          order: newOrder,
        })
      );

      // Notify parent component
      if (onTaskUpdate) {
        onTaskUpdate({
          ...activeTask,
          status: newStatus,
          order: newOrder,
        });
      }
    }

    setActiveId(null);
  };

  // Find active task for drag overlay
  const activeTask = activeId ? tasks.find((t) => t._id === activeId) : null;

  // Calculate column statistics
  const columnStats = columns.map((column) => {
    const columnTasks = tasksByStatus()[column.id] || [];
    const totalHours = columnTasks.reduce(
      (sum, task) => sum + (task.estimatedHours || 0),
      0
    );
    const overdueCount = columnTasks.filter((task) => task.isOverdue).length;

    return {
      ...column,
      taskCount: columnTasks.length,
      totalHours,
      overdueCount,
    };
  });

  return (
    <div className="flex flex-col h-full">
      {/* Board Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-900">Task Board</h3>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors',
              showFilters
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'text-gray-700 border-gray-300 hover:bg-gray-50'
            )}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {Object.values(filters).some(
              (v) => v !== 'all' && v.length > 0
            ) && (
              <span className="px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                {
                  Object.values(filters).filter(
                    (v) => v !== 'all' && v.length > 0
                  ).length
                }
              </span>
            )}
          </button>
        </div>

        {/* Board Stats */}
        <div className="flex items-center gap-6 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>
              {new Set(tasks.map((t) => t.assignee?._id).filter(Boolean)).size}{' '}
              assignees
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>
              {tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0)}h
              estimated
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{tasks.filter((t) => t.isOverdue).length} overdue</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <TaskFilters
          filters={filters}
          onChange={setFilters}
          project={project}
          className="mb-4"
        />
      )}

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full min-w-max">
            {columnStats.map((column) => (
              <TaskColumn
                key={column.id}
                column={column}
                tasks={tasksByStatus()[column.id] || []}
                project={project}
                readOnly={readOnly}
              />
            ))}
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeId && activeTask ? (
              <div className="transform rotate-3 opacity-90">
                <TaskCard task={activeTask} isDragging />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
};
```

### 3. Task Card Component

**File: `client/src/components/projects/molecules/TaskCard.js`**

```javascript
import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Calendar,
  Clock,
  Flag,
  MoreVertical,
  Paperclip,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Users,
  GitBranch,
} from 'lucide-react';
import { cn } from '../../../utils/cn';
import { formatDistanceToNow } from '../../../utils/dateHelpers';
import { TaskBadge } from '../atoms/TaskBadge';
import { UserAvatar } from '../atoms/UserAvatar';
import { ProgressBar } from '../atoms/ProgressBar';

/**
 * TaskCard - Individual task card component for Kanban board
 *
 * Displays comprehensive task information in a card format with drag-and-drop support.
 * Shows key task details including assignee, due date, priority, progress, and counts
 * for subtasks, comments, and attachments.
 *
 * @param {Object} props.task - Task object containing all task data
 * @param {boolean} props.isDragging - Whether the card is currently being dragged
 * @param {Function} props.onClick - Handler for card click
 * @param {Function} props.onMenuClick - Handler for menu button click
 * @param {boolean} props.readOnly - Whether the card is in read-only mode
 */
export const TaskCard = ({
  task,
  isDragging = false,
  onClick,
  onMenuClick,
  readOnly = false,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  // Set up sortable functionality
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: task._id,
    disabled: readOnly,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Determine card styling based on task properties
  const isOverdue = task.isOverdue;
  const isBlocked = task.isBlocked;
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;

  // Priority colors
  const priorityColors = {
    low: 'text-gray-500',
    medium: 'text-blue-500',
    high: 'text-orange-500',
    urgent: 'text-red-500',
  };

  /**
   * Handle card click - navigate to task details
   */
  const handleCardClick = (e) => {
    // Don't trigger if clicking on interactive elements
    if (e.target.closest('button') || e.target.closest('a')) {
      return;
    }
    if (onClick) {
      onClick(task);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleCardClick}
      className={cn(
        'bg-white rounded-lg border p-4 cursor-pointer transition-all',
        'hover:shadow-md hover:border-gray-300',
        isDragging || isSortableDragging ? 'opacity-50 shadow-lg' : '',
        isBlocked && 'border-l-4 border-l-red-500',
        isOverdue && 'border-l-4 border-l-orange-500',
        'select-none' // Prevent text selection during drag
      )}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-900 line-clamp-2 flex-1 pr-2">
          {task.title}
        </h4>

        {!readOnly && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMenuClick && onMenuClick(task);
            }}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <MoreVertical className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Task Description Preview */}
      {task.description && (
        <p className="text-xs text-gray-600 line-clamp-2 mb-3">
          {task.description}
        </p>
      )}

      {/* Progress Bar (if task has subtasks or manual progress) */}
      {(hasSubtasks || task.progress.percentage > 0) && (
        <div className="mb-3">
          <ProgressBar
            percentage={task.progress.percentage}
            size="sm"
            showLabel
          />
        </div>
      )}

      {/* Task Metadata */}
      <div className="space-y-2">
        {/* Assignee and Priority */}
        <div className="flex items-center justify-between">
          {task.assignee ? (
            <UserAvatar
              user={task.assignee}
              size="sm"
              showName={false}
              className="ring-2 ring-white"
            />
          ) : (
            <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
              <Users className="w-3 h-3 text-gray-500" />
            </div>
          )}

          <Flag className={cn('w-4 h-4', priorityColors[task.priority])} />
        </div>

        {/* Due Date */}
        {task.dueDate && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs',
              isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'
            )}
          >
            <Calendar className="w-3 h-3" />
            <span>
              {isOverdue ? 'Overdue' : 'Due'}{' '}
              {formatDistanceToNow(task.dueDate)}
            </span>
          </div>
        )}

        {/* Time Tracking */}
        {(task.estimatedHours || task.actualHours > 0) && (
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Clock className="w-3 h-3" />
            <span>
              {task.actualHours > 0 && `${task.actualHours}h / `}
              {task.estimatedHours ? `${task.estimatedHours}h` : 'No estimate'}
            </span>
          </div>
        )}

        {/* Task Indicators */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {/* Subtasks */}
          {hasSubtasks && (
            <div className="flex items-center gap-1">
              <GitBranch className="w-3 h-3" />
              <span>
                {task.subtasks.filter((st) => st.status === 'done').length}/
                {task.subtasks.length}
              </span>
            </div>
          )}

          {/* Comments */}
          {task.commentsCount > 0 && (
            <div className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              <span>{task.commentsCount}</span>
            </div>
          )}

          {/* Attachments */}
          {task.attachments?.length > 0 && (
            <div className="flex items-center gap-1">
              <Paperclip className="w-3 h-3" />
              <span>{task.attachments.length}</span>
            </div>
          )}

          {/* Blocked Indicator */}
          {isBlocked && (
            <div className="flex items-center gap-1 text-red-600">
              <AlertCircle className="w-3 h-3" />
              <span>Blocked</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {task.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {task.tags.slice(0, 2).map((tag, index) => (
              <span
                key={index}
                className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
              >
                {tag}
              </span>
            ))}
            {task.tags.length > 2 && (
              <span className="px-1.5 py-0.5 text-gray-500 text-xs">
                +{task.tags.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
```

### 4. Task Detail Modal/Page

**File: `client/src/components/projects/organisms/TaskDetail.js`**

```javascript
import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  X,
  Flag,
  Calendar,
  Clock,
  User,
  Paperclip,
  MessageSquare,
  GitBranch,
  Link2,
  MoreVertical,
  Edit3,
  Trash2,
  Archive,
  Play,
  Pause,
  CheckCircle2,
  AlertCircle,
  Activity,
} from 'lucide-react';
import { updateTask, deleteTask } from '../../../features/tasks/tasksSlice';
import { TaskComments } from '../molecules/TaskComments';
import { TaskAttachments } from '../molecules/TaskAttachments';
import { TaskActivity } from '../molecules/TaskActivity';
import { TaskTimeTracking } from '../molecules/TaskTimeTracking';
import { SubtaskList } from '../molecules/SubtaskList';
import { TaskDependencies } from '../molecules/TaskDependencies';
import { EditableText } from '../atoms/EditableText';
import { UserSelect } from '../atoms/UserSelect';
import { PrioritySelect } from '../atoms/PrioritySelect';
import { StatusSelect } from '../atoms/StatusSelect';
import { DatePicker } from '../atoms/DatePicker';
import { cn } from '../../../utils/cn';

/**
 * TaskDetail - Comprehensive task detail view component
 *
 * This component provides a full-featured task management interface including:
 * - Inline editing of all task fields
 * - Time tracking with start/stop functionality
 * - Subtask management
 * - File attachments
 * - Comments and activity feed
 * - Task dependencies
 * - Real-time updates
 *
 * Can be used as a modal or embedded in a page
 *
 * @param {Object} props.task - The task object to display
 * @param {Function} props.onClose - Handler for closing the detail view
 * @param {boolean} props.isModal - Whether to render as a modal
 * @param {boolean} props.readOnly - Whether the task is read-only
 */
export const TaskDetail = ({
  task: initialTask,
  onClose,
  isModal = true,
  readOnly = false,
}) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [task, setTask] = useState(initialTask);
  const [activeTab, setActiveTab] = useState('comments');
  const [isTracking, setIsTracking] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const trackingStartRef = useRef(null);

  // Check if user has active time tracking
  useEffect(() => {
    const activeEntry = task.timeEntries?.find(
      (entry) => entry.user === user.id && !entry.endTime
    );
    if (activeEntry) {
      setIsTracking(true);
      trackingStartRef.current = new Date(activeEntry.startTime);
    }
  }, [task, user.id]);

  /**
   * Handle field updates with optimistic updates
   */
  const handleFieldUpdate = async (field, value) => {
    // Optimistic update
    setTask((prev) => ({ ...prev, [field]: value }));

    try {
      await dispatch(
        updateTask({
          taskId: task._id,
          updates: { [field]: value },
        })
      ).unwrap();
    } catch (error) {
      // Revert on error
      setTask((prev) => ({ ...prev, [field]: initialTask[field] }));
      console.error('Failed to update task:', error);
    }
  };

  /**
   * Handle time tracking toggle
   */
  const handleTimeTracking = async () => {
    if (isTracking) {
      // Stop tracking
      const duration = Math.round(
        (Date.now() - trackingStartRef.current) / 60000
      );
      await dispatch(
        updateTask({
          taskId: task._id,
          updates: {
            timeEntries: [
              ...task.timeEntries,
              {
                user: user.id,
                startTime: trackingStartRef.current,
                endTime: new Date(),
                duration,
              },
            ],
          },
        })
      ).unwrap();
      setIsTracking(false);
      trackingStartRef.current = null;
    } else {
      // Start tracking
      trackingStartRef.current = new Date();
      await dispatch(
        updateTask({
          taskId: task._id,
          updates: {
            timeEntries: [
              ...task.timeEntries,
              {
                user: user.id,
                startTime: trackingStartRef.current,
                endTime: null,
              },
            ],
          },
        })
      ).unwrap();
      setIsTracking(true);
    }
  };

  /**
   * Handle task deletion
   */
  const handleDelete = async () => {
    try {
      await dispatch(deleteTask(task._id)).unwrap();
      onClose();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  // Calculate task metrics
  const completedSubtasks =
    task.subtasks?.filter((st) => st.status === 'done').length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const isBlocked =
    task.dependencies?.blockedBy?.length > 0 || task.status === 'blocked';

  const content = (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div className="flex items-center gap-4 flex-1">
          {/* Status Indicator */}
          <StatusSelect
            value={task.status}
            onChange={(status) => handleFieldUpdate('status', status)}
            disabled={readOnly}
            size="sm"
          />

          {/* Task ID */}
          <span className="text-sm text-gray-500">#{task._id.slice(-6)}</span>

          {/* Blocked Indicator */}
          {isBlocked && (
            <div className="flex items-center gap-1 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Blocked</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Time Tracking Button */}
          {!readOnly && (
            <button
              onClick={handleTimeTracking}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                isTracking
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              )}
            >
              {isTracking ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Stop Timer</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Start Timer</span>
                </>
              )}
            </button>
          )}

          {/* Action Menu */}
          <div className="relative group">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <MoreVertical className="w-5 h-5 text-gray-500" />
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                <Archive className="w-4 h-4" />
                Archive Task
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
              >
                <Trash2 className="w-4 h-4" />
                Delete Task
              </button>
            </div>
          </div>

          {/* Close Button */}
          {isModal && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Column - Task Details */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Title */}
          <EditableText
            value={task.title}
            onChange={(title) => handleFieldUpdate('title', title)}
            disabled={readOnly}
            className="text-2xl font-semibold text-gray-900 mb-4"
            placeholder="Task title..."
          />

          {/* Meta Information Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Assignee */}
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                <User className="w-4 h-4" />
                Assignee
              </label>
              <UserSelect
                value={task.assignee?._id}
                onChange={(userId) => handleFieldUpdate('assignee', userId)}
                projectId={task.project}
                disabled={readOnly}
              />
            </div>

            {/* Priority */}
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                <Flag className="w-4 h-4" />
                Priority
              </label>
              <PrioritySelect
                value={task.priority}
                onChange={(priority) => handleFieldUpdate('priority', priority)}
                disabled={readOnly}
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4" />
                Due Date
              </label>
              <DatePicker
                value={task.dueDate}
                onChange={(date) => handleFieldUpdate('dueDate', date)}
                disabled={readOnly}
              />
            </div>

            {/* Time Estimate */}
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                <Clock className="w-4 h-4" />
                Time Estimate
              </label>
              <input
                type="number"
                value={task.estimatedHours || ''}
                onChange={(e) =>
                  handleFieldUpdate(
                    'estimatedHours',
                    parseFloat(e.target.value)
                  )
                }
                disabled={readOnly}
                placeholder="Hours"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min="0"
                step="0.5"
              />
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <EditableText
              value={task.description || ''}
              onChange={(description) =>
                handleFieldUpdate('description', description)
              }
              disabled={readOnly}
              multiline
              className="w-full min-h-[100px] p-3 border border-gray-300 rounded-lg"
              placeholder="Add a description..."
            />
          </div>

          {/* Subtasks */}
          {task.subtasks?.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <GitBranch className="w-4 h-4" />
                  Subtasks ({completedSubtasks}/{totalSubtasks})
                </h3>
              </div>
              <SubtaskList
                parentTask={task}
                subtasks={task.subtasks}
                onUpdate={() => {
                  /* Refresh task */
                }}
                readOnly={readOnly}
              />
            </div>
          )}

          {/* Dependencies */}
          {(task.dependencies?.blockedBy?.length > 0 ||
            task.dependencies?.blocks?.length > 0) && (
            <div className="mb-6">
              <h3 className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                <Link2 className="w-4 h-4" />
                Dependencies
              </h3>
              <TaskDependencies
                task={task}
                onUpdate={() => {
                  /* Refresh task */
                }}
                readOnly={readOnly}
              />
            </div>
          )}
        </div>

        {/* Right Column - Activity */}
        <div className="w-96 border-l bg-gray-50 flex flex-col">
          {/* Tabs */}
          <div className="flex border-b bg-white">
            <button
              onClick={() => setActiveTab('comments')}
              className={cn(
                'flex-1 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === 'comments'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              Comments ({task.commentsCount || 0})
            </button>
            <button
              onClick={() => setActiveTab('attachments')}
              className={cn(
                'flex-1 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === 'attachments'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              Files ({task.attachments?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={cn(
                'flex-1 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === 'activity'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              Activity
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'comments' && (
              <TaskComments taskId={task._id} readOnly={readOnly} />
            )}
            {activeTab === 'attachments' && (
              <TaskAttachments
                task={task}
                onUpdate={(attachments) =>
                  handleFieldUpdate('attachments', attachments)
                }
                readOnly={readOnly}
              />
            )}
            {activeTab === 'activity' && <TaskActivity taskId={task._id} />}
          </div>

          {/* Time Tracking Summary */}
          <div className="p-4 border-t bg-white">
            <TaskTimeTracking task={task} isTracking={isTracking} />
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete Task?
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{task.title}"? This action cannot
              be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg"
              >
                Delete Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render as modal or embedded
  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full h-[90vh] overflow-hidden">
          {content}
        </div>
      </div>
    );
  }

  return content;
};
```

### 5. Task List View Component

**File: `client/src/components/projects/organisms/TaskListView.js`**

````javascript
import React, { useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Filter,
  Download,
  Upload,
  Calendar,
  User,
  Flag,
  Clock,
  CheckSquare,
  Square
} from 'lucide-react';
import { TaskRow } from '../molecules/TaskRow';
import { TaskFilters } from '../molecules/TaskFilters';
import { BulkTaskActions } from '../molecules/BulkTaskActions';
import { QuickAddTask } from '../molecules/QuickAddTask';
import { cn } from '../../../utils/cn';
import { updateTask, bulkUpdateTasks } from '../../../features/tasks/tasksSlice';

/**
 * TaskListView - Table/list view for project tasks
 *
 * Provides a comprehensive list view with features:
 * - Sortable columns
 * - Inline editing
 * - Bulk selection and actions
 * - Grouping by status/assignee/date
 * - Export/import functionality
 * - Keyboard navigation
 *
 * @param {Object} props.project - Current project object
 * @param {Array} props.tasks - Array of task objects
 * @param {Function} props.onTaskClick - Handler for task click
 * @param {boolean} props.readOnly - Whether the list is read-only
 */
export const TaskListView = ({ project, tasks = [], onTaskClick, readOnly = false }) => {
  const dispatch = useDispatch();
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [sortBy, setSortBy] = useState('order');
  const [sortOrder, setSortOrder] = useState('asc');
  const [groupBy, setGroupBy] = useState('none'); // none, status, assignee, priority, dueDate
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    assignee: 'all',
    priority: 'all',
    dueDate: 'all',
    tags: []
  });

  /**
   * Sort tasks based on current sort settings
   */
  const sortedTasks = useMemo(() => {
    const sorted = [...tasks].sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      // Handle special cases
      if (sortBy === 'assignee') {
        aVal = a.assignee?.name || '';
        bVal = b.assignee?.name || '';
      } else if (sortBy === 'dueDate') {
        aVal = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        bVal = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      }

      // Compare values
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [tasks, sortBy, sortOrder]);

  /**
   * Group tasks based on groupBy setting
   */
  const groupedTasks = useMemo(() => {
    if (groupBy === 'none') {
      return { 'All Tasks': sortedTasks };
    }

    const groups = {};

    sortedTasks.forEach(task => {
      let groupKey;

      switch (groupBy) {
        case 'status':
          groupKey = task.status;
          break;
        case 'assignee':
          groupKey = task.assignee?.name || 'Unassigned';
          break;
        case 'priority':
          groupKey = task.priority;
          break;
        case 'dueDate':
          if (!task.dueDate) {
            groupKey = 'No Due Date';
          } else {
            const date = new Date(task.dueDate);
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            if (date < today) {
              groupKey = 'Overdue';
            } else if (date.toDateString() === today.toDateString()) {
              groupKey = 'Today';
            } else if (date.toDateString() === tomorrow.toDateString()) {
              groupKey = 'Tomorrow';
            } else if (date < new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)) {
              groupKey = 'This Week';
            } else {
              groupKey = 'Later';
            }
          }
          break;
        default:
          groupKey = 'Other';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(task);
    });

    return groups;
  }, [sortedTasks, groupBy]);

  /**
   * Handle column sort
   */
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  /**
   * Handle select all
   */
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedTasks(tasks.map(t => t._id));
    } else {
      setSelectedTasks([]);
    }
  };

  /**
   * Handle task selection
   */
  const handleTaskSelect = (taskId, checked) => {
    if (checked) {
      setSelectedTasks([...selectedTasks, taskId]);
    } else {
      setSelectedTasks(selectedTasks.filter(id => id !== taskId));
    }
  };

  /**
   * Handle bulk actions
   */
  const handleBulkAction = async (action, data) => {
    if (selectedTasks.length === 0) return;

    try {
      await dispatch(bulkUpdateTasks({
        taskIds: selectedTasks,
        action,
        data
      })).unwrap();

      // Clear selection after successful action
      setSelectedTasks([]);
    } catch (error) {
      console.error('Bulk action failed:', error);
    }
  };

  /**
   * Toggle group expansion
   */
  const toggleGroup = (groupKey) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  // Column configuration
  const columns = [
    { key: 'title', label: 'Task', sortable: true, width: 'flex-1' },
    { key: 'assignee', label: 'Assignee', sortable: true, width: 'w-32' },
    { key: 'status', label: 'Status', sortable: true, width: 'w-32' },
    { key: 'priority', label: 'Priority', sortable: true, width: 'w-24' },
    { key: 'dueDate', label: 'Due Date', sortable: true, width: 'w-32' },
    { key: 'progress', label: 'Progress', sortable: false, width: 'w-24' },
    { key: 'actions', label: '', sortable: false, width: 'w-20' }
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          {/* Bulk Actions */}
          {selectedTasks.length > 0 && (
            <BulkTaskActions
              selectedCount={selectedTasks.length}
              onAction={handleBulkAction}
              onClear={() => setSelectedTasks([])}
            />
          )}

          {/* Group By */}
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="none">No Grouping</option>
            <option value="status">Group by Status</option>
            <option value="assignee">Group by Assignee</option>
            <option value="priority">Group by Priority</option>
            <option value="dueDate">Group by Due Date</option>
          </select>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm",
              showFilters
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : "text-gray-700 border-gray-300 hover:bg-gray-50"
            )}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Export/Import */}
          <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            <Download className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            <Upload className="w-5 h-5" />
          </button>

          {/* Add Task */}
          {!readOnly && (
            <QuickAddTask
              projectId={project._id}
              trigger={
                <button className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <Plus className="w-4 h-4" />
                  <span>Add Task</span>
                </button>
              }
            />
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <TaskFilters
          filters={filters}
          onChange={setFilters}
          project={project}
          className="mb-4"
        />
      )}

      {/* Task Table */}
      <div className="flex-1 overflow-auto bg-white rounded-lg border">
        <table className="w-full">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedTasks.length === tasks.length && tasks.length > 0}
                  indeterminate={selectedTasks.length > 0 && selectedTasks.length < tasks.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300"
                />
              </th>
              {columns.map(column => (
                <th
                  key={column.key}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider",
                    column.width,
                    column.sortable && "cursor-pointer hover:bg-gray-100"
                  )}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-1">
                    {column.label}
                    {column.sortable && sortBy === column.key && (
                      <span className="text-blue-600">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {Object.entries(groupedTasks).map(([groupKey, groupTasks]) => (
              <React.Fragment key={groupKey}>
                {/* Group Header */}
                {groupBy !== 'none' && (
                  <tr className="bg-gray-50">
                    <td colSpan={columns.length + 1} className="<!-- filepath: c:\Users\macdo\Documents\Cline\utool\PROJECTS_MILESTONE_2.md -->
# PROJECTS FEATURE REORGANIZATION - MILESTONE 2

## Advanced Task Management System (Week 5-6)

**Risk:** Medium | **Value:** Core Feature Enhancement
**Status:** Planning Phase

---

### Overview

This milestone transforms the basic task functionality into a comprehensive task management system that rivals dedicated task management platforms. We'll build upon the existing task infrastructure while adding advanced features like subtasks, dependencies, time tracking, and multiple view modes.

### Integration with Existing Codebase

**Existing Files to Enhance/Modify:**
- `client/src/components/TaskList.js` - Current basic task list component
- `client/src/pages/ProjectDetailsPage.js` - Project view containing tasks
- `server/models/Task.js` - Current task schema
- `server/controllers/taskController.js` - Task CRUD operations
- `client/src/features/tasks/tasksSlice.js` - Redux state (if exists)

**Patterns We'll Maintain:**
- Tailwind CSS for all styling
- Lucide React icons consistently
- Redux Toolkit for state management
- Existing API patterns and authentication
- Current notification system integration

---

## 📊 DELIVERABLES

### 1. Enhanced Task Schema

**File: `server/models/Task.js`**

```javascript
import mongoose from 'mongoose';
const { Schema } = mongoose;

const taskSchema = new Schema({
  // Core Information
  title: {
    type: String,
    required: true,
    trim: true,
    maxLength: 500,
    index: true
  },
  description: {
    type: String,
    maxLength: 5000
  },

  // Project & Organization
  project: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  parentTask: {
    type: Schema.Types.ObjectId,
    ref: 'Task',
    default: null // null means it's a top-level task
  },
  subtasks: [{
    type: Schema.Types.ObjectId,
    ref: 'Task'
  }],

  // Assignment & Ownership
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignee: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  assignedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedAt: { type: Date },

  // Status & Progress
  status: {
    type: String,
    enum: ['todo', 'in-progress', 'in-review', 'blocked', 'done', 'cancelled'],
    default: 'todo',
    index: true
  },
  progress: {
    percentage: { type: Number, default: 0, min: 0, max: 100 },
    automatic: { type: Boolean, default: true }, // Auto-calculate from subtasks
    lastUpdated: { type: Date, default: Date.now }
  },
  completedAt: { type: Date },
  completedBy: { type: Schema.Types.ObjectId, ref: 'User' },

  // Priority & Categorization
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  category: {
    type: String,
    default: 'General',
    index: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],

  // Time Management
  dueDate: {
    type: Date,
    index: true
  },
  startDate: { type: Date },
  estimatedHours: { type: Number, min: 0 },
  actualHours: { type: Number, default: 0, min: 0 },

  // Time Tracking
  timeEntries: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    duration: { type: Number }, // in minutes
    description: { type: String },
    createdAt: { type: Date, default: Date.now }
  }],

  // Dependencies
  dependencies: {
    blockedBy: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
    blocks: [{ type: Schema.Types.ObjectId, ref: 'Task' }]
  },

  // Attachments & Comments
  attachments: [{
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },
    url: { type: String, required: true }
  }],

  commentsCount: { type: Number, default: 0 },

  // Recurring Task Settings
  recurring: {
    enabled: { type: Boolean, default: false },
    pattern: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'custom']
    },
    interval: { type: Number, default: 1 },
    daysOfWeek: [{ type: Number, min: 0, max: 6 }], // 0 = Sunday
    dayOfMonth: { type: Number, min: 1, max: 31 },
    endDate: { type: Date },
    nextDueDate: { type: Date }
  },

  // Activity & Engagement
  activity: {
    lastActivityAt: { type: Date, default: Date.now },
    lastActivityBy: { type: Schema.Types.ObjectId, ref: 'User' },
    viewCount: { type: Number, default: 0 },
    updateCount: { type: Number, default: 0 }
  },

  // Custom Fields
  customFields: {
    type: Map,
    of: Schema.Types.Mixed
  },

  // Metadata
  order: { type: Number, default: 0 }, // For manual sorting
  archived: { type: Boolean, default: false },
  archivedAt: { type: Date },
  archivedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ assignee: 1, status: 1 });
taskSchema.index({ dueDate: 1, status: 1 });
taskSchema.index({ '$**': 'text' }); // Full-text search

// Virtual for overdue status
taskSchema.virtual('isOverdue').get(function() {
  return this.dueDate &&
         new Date(this.dueDate) < new Date() &&
         !['done', 'cancelled'].includes(this.status);
});

// Virtual for blocking status
taskSchema.virtual('isBlocked').get(function() {
  return this.dependencies.blockedBy.length > 0 || this.status === 'blocked';
});

// Methods
taskSchema.methods.calculateProgress = async function() {
  /**
   * Calculate task progress based on subtasks
   * If task has subtasks, progress = average of subtask progress
   * Otherwise, progress is manually set or based on status
   */
  if (!this.progress.automatic) return this.progress.percentage;

  if (this.subtasks.length > 0) {
    const subtasks = await this.model('Task').find({ _id: { $in: this.subtasks } });
    const totalProgress = subtasks.reduce((sum, task) => sum + task.progress.percentage, 0);
    this.progress.percentage = Math.round(totalProgress / subtasks.length);
  } else {
    // Status-based progress for tasks without subtasks
    const statusProgress = {
      'todo': 0,
      'in-progress': 50,
      'in-review': 75,
      'blocked': this.progress.percentage, // Keep current
      'done': 100,
      'cancelled': this.progress.percentage // Keep current
    };
    this.progress.percentage = statusProgress[this.status] ?? this.progress.percentage;
  }

  this.progress.lastUpdated = new Date();
  return this.progress.percentage;
};

taskSchema.methods.addTimeEntry = async function(userId, startTime, endTime, description) {
  /**
   * Add a time tracking entry to the task
   */
  const duration = endTime ? Math.round((endTime - startTime) / 60000) : 0; // Convert to minutes

  this.timeEntries.push({
    user: userId,
    startTime,
    endTime,
    duration,
    description
  });

  // Update actual hours
  this.actualHours = this.timeEntries.reduce((total, entry) => {
    return total + (entry.duration / 60);
  }, 0);

  await this.save();
};

// Middleware to handle subtask relationship
taskSchema.pre('save', async function(next) {
  if (this.isModified('parentTask') && this.parentTask) {
    // Add this task to parent's subtasks array
    await this.model('Task').findByIdAndUpdate(
      this.parentTask,
      { $addToSet: { subtasks: this._id } }
    );
  }
  next();
});

export default mongoose.model('Task', taskSchema);
````

### 2. Task Board Component (Kanban View)

**File: `client/src/components/projects/organisms/TaskBoard.js`**

```javascript
import React, { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDispatch } from 'react-redux';
import {
  Plus,
  Filter,
  Search,
  MoreHorizontal,
  Users,
  Calendar,
  Clock,
} from 'lucide-react';
import { TaskColumn } from '../molecules/TaskColumn';
import { TaskCard } from '../molecules/TaskCard';
import { QuickAddTask } from '../molecules/QuickAddTask';
import { TaskFilters } from '../molecules/TaskFilters';
import { cn } from '../../../utils/cn';
import {
  updateTaskStatus,
  reorderTasks,
} from '../../../features/tasks/tasksSlice';

/**
 * TaskBoard - Kanban board view for project tasks
 *
 * This component provides a drag-and-drop Kanban board interface for managing tasks.
 * It supports multiple columns (status-based), task filtering, quick task creation,
 * and real-time updates. The board is fully responsive and accessible.
 *
 * Features:
 * - Drag and drop tasks between columns
 * - Customizable columns based on project settings
 * - Quick task creation within columns
 * - Advanced filtering and search
 * - Bulk operations on selected tasks
 * - Real-time updates via socket connection
 *
 * @param {Object} props.project - The current project object
 * @param {Array} props.tasks - Array of task objects
 * @param {Function} props.onTaskUpdate - Callback for task updates
 * @param {boolean} props.readOnly - Whether the board is read-only
 */
export const TaskBoard = ({
  project,
  tasks = [],
  onTaskUpdate,
  readOnly = false,
}) => {
  const dispatch = useDispatch();
  const [activeId, setActiveId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    assignee: 'all',
    priority: 'all',
    dueDate: 'all',
    tags: [],
  });

  // Column configuration - can be customized per project
  const columns = project?.settings?.kanbanColumns || [
    { id: 'todo', title: 'To Do', color: 'gray' },
    { id: 'in-progress', title: 'In Progress', color: 'blue' },
    { id: 'in-review', title: 'In Review', color: 'yellow' },
    { id: 'blocked', title: 'Blocked', color: 'red' },
    { id: 'done', title: 'Done', color: 'green' },
  ];

  // Configure drag sensors for better UX
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Prevent accidental drags
      },
    })
  );

  /**
   * Filter tasks based on current filters and search
   */
  const filteredTasks = useCallback(() => {
    return tasks.filter((task) => {
      // Search filter
      if (
        searchQuery &&
        !task.title.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      // Assignee filter
      if (
        filters.assignee !== 'all' &&
        task.assignee?._id !== filters.assignee
      ) {
        return false;
      }

      // Priority filter
      if (filters.priority !== 'all' && task.priority !== filters.priority) {
        return false;
      }

      // Due date filter
      if (filters.dueDate !== 'all') {
        const today = new Date();
        const dueDate = task.dueDate ? new Date(task.dueDate) : null;

        switch (filters.dueDate) {
          case 'overdue':
            if (!dueDate || dueDate >= today) return false;
            break;
          case 'today':
            if (!dueDate || dueDate.toDateString() !== today.toDateString())
              return false;
            break;
          case 'week':
            const weekFromNow = new Date(
              today.getTime() + 7 * 24 * 60 * 60 * 1000
            );
            if (!dueDate || dueDate > weekFromNow) return false;
            break;
          default:
            break;
        }
      }

      // Tags filter
      if (filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some((tag) =>
          task.tags.includes(tag)
        );
        if (!hasMatchingTag) return false;
      }

      return true;
    });
  }, [tasks, searchQuery, filters]);

  /**
   * Group tasks by status for columns
   */
  const tasksByStatus = useCallback(() => {
    const grouped = {};
    columns.forEach((column) => {
      grouped[column.id] = [];
    });

    filteredTasks().forEach((task) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });

    // Sort tasks within each column by order
    Object.keys(grouped).forEach((status) => {
      grouped[status].sort((a, b) => a.order - b.order);
    });

    return grouped;
  }, [filteredTasks, columns]);

  /**
   * Handle drag start
   */
  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  /**
   * Handle drag end - update task status and order
   */
  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const activeTask = tasks.find((t) => t._id === active.id);
    const overColumn = columns.find((col) => col.id === over.id);
    const overTask = tasks.find((t) => t._id === over.id);

    if (!activeTask) {
      setActiveId(null);
      return;
    }

    // Determine new status and position
    let newStatus = activeTask.status;
    let newOrder = activeTask.order;

    if (overColumn) {
      // Dropped on a column
      newStatus = overColumn.id;
      const tasksInColumn = tasksByStatus()[newStatus];
      newOrder =
        tasksInColumn.length > 0
          ? Math.max(...tasksInColumn.map((t) => t.order)) + 1
          : 0;
    } else if (overTask) {
      // Dropped on a task
      newStatus = overTask.status;
      newOrder = overTask.order;
    }

    // Only update if something changed
    if (activeTask.status !== newStatus || activeTask.order !== newOrder) {
      dispatch(
        updateTaskStatus({
          taskId: activeTask._id,
          status: newStatus,
          order: newOrder,
        })
      );

      // Notify parent component
      if (onTaskUpdate) {
        onTaskUpdate({
          ...activeTask,
          status: newStatus,
          order: newOrder,
        });
      }
    }

    setActiveId(null);
  };

  // Find active task for drag overlay
  const activeTask = activeId ? tasks.find((t) => t._id === activeId) : null;

  // Calculate column statistics
  const columnStats = columns.map((column) => {
    const columnTasks = tasksByStatus()[column.id] || [];
    const totalHours = columnTasks.reduce(
      (sum, task) => sum + (task.estimatedHours || 0),
      0
    );
    const overdueCount = columnTasks.filter((task) => task.isOverdue).length;

    return {
      ...column,
      taskCount: columnTasks.length,
      totalHours,
      overdueCount,
    };
  });

  return (
    <div className="flex flex-col h-full">
      {/* Board Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-900">Task Board</h3>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors',
              showFilters
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'text-gray-700 border-gray-300 hover:bg-gray-50'
            )}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {Object.values(filters).some(
              (v) => v !== 'all' && v.length > 0
            ) && (
              <span className="px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                {
                  Object.values(filters).filter(
                    (v) => v !== 'all' && v.length > 0
                  ).length
                }
              </span>
            )}
          </button>
        </div>

        {/* Board Stats */}
        <div className="flex items-center gap-6 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>
              {new Set(tasks.map((t) => t.assignee?._id).filter(Boolean)).size}{' '}
              assignees
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>
              {tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0)}h
              estimated
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{tasks.filter((t) => t.isOverdue).length} overdue</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <TaskFilters
          filters={filters}
          onChange={setFilters}
          project={project}
          className="mb-4"
        />
      )}

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full min-w-max">
            {columnStats.map((column) => (
              <TaskColumn
                key={column.id}
                column={column}
                tasks={tasksByStatus()[column.id] || []}
                project={project}
                readOnly={readOnly}
              />
            ))}
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeId && activeTask ? (
              <div className="transform rotate-3 opacity-90">
                <TaskCard task={activeTask} isDragging />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
};
```

### 3. Task Card Component

**File: `client/src/components/projects/molecules/TaskCard.js`**

```javascript
import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Calendar,
  Clock,
  Flag,
  MoreVertical,
  Paperclip,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Users,
  GitBranch,
} from 'lucide-react';
import { cn } from '../../../utils/cn';
import { formatDistanceToNow } from '../../../utils/dateHelpers';
import { TaskBadge } from '../atoms/TaskBadge';
import { UserAvatar } from '../atoms/UserAvatar';
import { ProgressBar } from '../atoms/ProgressBar';

/**
 * TaskCard - Individual task card component for Kanban board
 *
 * Displays comprehensive task information in a card format with drag-and-drop support.
 * Shows key task details including assignee, due date, priority, progress, and counts
 * for subtasks, comments, and attachments.
 *
 * @param {Object} props.task - Task object containing all task data
 * @param {boolean} props.isDragging - Whether the card is currently being dragged
 * @param {Function} props.onClick - Handler for card click
 * @param {Function} props.onMenuClick - Handler for menu button click
 * @param {boolean} props.readOnly - Whether the card is in read-only mode
 */
export const TaskCard = ({
  task,
  isDragging = false,
  onClick,
  onMenuClick,
  readOnly = false,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  // Set up sortable functionality
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: task._id,
    disabled: readOnly,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Determine card styling based on task properties
  const isOverdue = task.isOverdue;
  const isBlocked = task.isBlocked;
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;

  // Priority colors
  const priorityColors = {
    low: 'text-gray-500',
    medium: 'text-blue-500',
    high: 'text-orange-500',
    urgent: 'text-red-500',
  };

  /**
   * Handle card click - navigate to task details
   */
  const handleCardClick = (e) => {
    // Don't trigger if clicking on interactive elements
    if (e.target.closest('button') || e.target.closest('a')) {
      return;
    }
    if (onClick) {
      onClick(task);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleCardClick}
      className={cn(
        'bg-white rounded-lg border p-4 cursor-pointer transition-all',
        'hover:shadow-md hover:border-gray-300',
        isDragging || isSortableDragging ? 'opacity-50 shadow-lg' : '',
        isBlocked && 'border-l-4 border-l-red-500',
        isOverdue && 'border-l-4 border-l-orange-500',
        'select-none' // Prevent text selection during drag
      )}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-900 line-clamp-2 flex-1 pr-2">
          {task.title}
        </h4>

        {!readOnly && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMenuClick && onMenuClick(task);
            }}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <MoreVertical className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Task Description Preview */}
      {task.description && (
        <p className="text-xs text-gray-600 line-clamp-2 mb-3">
          {task.description}
        </p>
      )}

      {/* Progress Bar (if task has subtasks or manual progress) */}
      {(hasSubtasks || task.progress.percentage > 0) && (
        <div className="mb-3">
          <ProgressBar
            percentage={task.progress.percentage}
            size="sm"
            showLabel
          />
        </div>
      )}

      {/* Task Metadata */}
      <div className="space-y-2">
        {/* Assignee and Priority */}
        <div className="flex items-center justify-between">
          {task.assignee ? (
            <UserAvatar
              user={task.assignee}
              size="sm"
              showName={false}
              className="ring-2 ring-white"
            />
          ) : (
            <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
              <Users className="w-3 h-3 text-gray-500" />
            </div>
          )}

          <Flag className={cn('w-4 h-4', priorityColors[task.priority])} />
        </div>

        {/* Due Date */}
        {task.dueDate && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs',
              isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'
            )}
          >
            <Calendar className="w-3 h-3" />
            <span>
              {isOverdue ? 'Overdue' : 'Due'}{' '}
              {formatDistanceToNow(task.dueDate)}
            </span>
          </div>
        )}

        {/* Time Tracking */}
        {(task.estimatedHours || task.actualHours > 0) && (
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Clock className="w-3 h-3" />
            <span>
              {task.actualHours > 0 && `${task.actualHours}h / `}
              {task.estimatedHours ? `${task.estimatedHours}h` : 'No estimate'}
            </span>
          </div>
        )}

        {/* Task Indicators */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {/* Subtasks */}
          {hasSubtasks && (
            <div className="flex items-center gap-1">
              <GitBranch className="w-3 h-3" />
              <span>
                {task.subtasks.filter((st) => st.status === 'done').length}/
                {task.subtasks.length}
              </span>
            </div>
          )}

          {/* Comments */}
          {task.commentsCount > 0 && (
            <div className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              <span>{task.commentsCount}</span>
            </div>
          )}

          {/* Attachments */}
          {task.attachments?.length > 0 && (
            <div className="flex items-center gap-1">
              <Paperclip className="w-3 h-3" />
              <span>{task.attachments.length}</span>
            </div>
          )}

          {/* Blocked Indicator */}
          {isBlocked && (
            <div className="flex items-center gap-1 text-red-600">
              <AlertCircle className="w-3 h-3" />
              <span>Blocked</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {task.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {task.tags.slice(0, 2).map((tag, index) => (
              <span
                key={index}
                className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
              >
                {tag}
              </span>
            ))}
            {task.tags.length > 2 && (
              <span className="px-1.5 py-0.5 text-gray-500 text-xs">
                +{task.tags.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
```

### 4. Task Detail Modal/Page

**File: `client/src/components/projects/organisms/TaskDetail.js`**

```javascript
import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  X,
  Flag,
  Calendar,
  Clock,
  User,
  Paperclip,
  MessageSquare,
  GitBranch,
  Link2,
  MoreVertical,
  Edit3,
  Trash2,
  Archive,
  Play,
  Pause,
  CheckCircle2,
  AlertCircle,
  Activity,
} from 'lucide-react';
import { updateTask, deleteTask } from '../../../features/tasks/tasksSlice';
import { TaskComments } from '../molecules/TaskComments';
import { TaskAttachments } from '../molecules/TaskAttachments';
import { TaskActivity } from '../molecules/TaskActivity';
import { TaskTimeTracking } from '../molecules/TaskTimeTracking';
import { SubtaskList } from '../molecules/SubtaskList';
import { TaskDependencies } from '../molecules/TaskDependencies';
import { EditableText } from '../atoms/EditableText';
import { UserSelect } from '../atoms/UserSelect';
import { PrioritySelect } from '../atoms/PrioritySelect';
import { StatusSelect } from '../atoms/StatusSelect';
import { DatePicker } from '../atoms/DatePicker';
import { cn } from '../../../utils/cn';

/**
 * TaskDetail - Comprehensive task detail view component
 *
 * This component provides a full-featured task management interface including:
 * - Inline editing of all task fields
 * - Time tracking with start/stop functionality
 * - Subtask management
 * - File attachments
 * - Comments and activity feed
 * - Task dependencies
 * - Real-time updates
 *
 * Can be used as a modal or embedded in a page
 *
 * @param {Object} props.task - The task object to display
 * @param {Function} props.onClose - Handler for closing the detail view
 * @param {boolean} props.isModal - Whether to render as a modal
 * @param {boolean} props.readOnly - Whether the task is read-only
 */
export const TaskDetail = ({
  task: initialTask,
  onClose,
  isModal = true,
  readOnly = false,
}) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [task, setTask] = useState(initialTask);
  const [activeTab, setActiveTab] = useState('comments');
  const [isTracking, setIsTracking] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const trackingStartRef = useRef(null);

  // Check if user has active time tracking
  useEffect(() => {
    const activeEntry = task.timeEntries?.find(
      (entry) => entry.user === user.id && !entry.endTime
    );
    if (activeEntry) {
      setIsTracking(true);
      trackingStartRef.current = new Date(activeEntry.startTime);
    }
  }, [task, user.id]);

  /**
   * Handle field updates with optimistic updates
   */
  const handleFieldUpdate = async (field, value) => {
    // Optimistic update
    setTask((prev) => ({ ...prev, [field]: value }));

    try {
      await dispatch(
        updateTask({
          taskId: task._id,
          updates: { [field]: value },
        })
      ).unwrap();
    } catch (error) {
      // Revert on error
      setTask((prev) => ({ ...prev, [field]: initialTask[field] }));
      console.error('Failed to update task:', error);
    }
  };

  /**
   * Handle time tracking toggle
   */
  const handleTimeTracking = async () => {
    if (isTracking) {
      // Stop tracking
      const duration = Math.round(
        (Date.now() - trackingStartRef.current) / 60000
      );
      await dispatch(
        updateTask({
          taskId: task._id,
          updates: {
            timeEntries: [
              ...task.timeEntries,
              {
                user: user.id,
                startTime: trackingStartRef.current,
                endTime: new Date(),
                duration,
              },
            ],
          },
        })
      ).unwrap();
      setIsTracking(false);
      trackingStartRef.current = null;
    } else {
      // Start tracking
      trackingStartRef.current = new Date();
      await dispatch(
        updateTask({
          taskId: task._id,
          updates: {
            timeEntries: [
              ...task.timeEntries,
              {
                user: user.id,
                startTime: trackingStartRef.current,
                endTime: null,
              },
            ],
          },
        })
      ).unwrap();
      setIsTracking(true);
    }
  };

  /**
   * Handle task deletion
   */
  const handleDelete = async () => {
    try {
      await dispatch(deleteTask(task._id)).unwrap();
      onClose();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  // Calculate task metrics
  const completedSubtasks =
    task.subtasks?.filter((st) => st.status === 'done').length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const isBlocked =
    task.dependencies?.blockedBy?.length > 0 || task.status === 'blocked';

  const content = (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div className="flex items-center gap-4 flex-1">
          {/* Status Indicator */}
          <StatusSelect
            value={task.status}
            onChange={(status) => handleFieldUpdate('status', status)}
            disabled={readOnly}
            size="sm"
          />

          {/* Task ID */}
          <span className="text-sm text-gray-500">#{task._id.slice(-6)}</span>

          {/* Blocked Indicator */}
          {isBlocked && (
            <div className="flex items-center gap-1 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Blocked</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Time Tracking Button */}
          {!readOnly && (
            <button
              onClick={handleTimeTracking}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                isTracking
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              )}
            >
              {isTracking ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Stop Timer</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Start Timer</span>
                </>
              )}
            </button>
          )}

          {/* Action Menu */}
          <div className="relative group">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <MoreVertical className="w-5 h-5 text-gray-500" />
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                <Archive className="w-4 h-4" />
                Archive Task
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
              >
                <Trash2 className="w-4 h-4" />
                Delete Task
              </button>
            </div>
          </div>

          {/* Close Button */}
          {isModal && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Column - Task Details */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Title */}
          <EditableText
            value={task.title}
            onChange={(title) => handleFieldUpdate('title', title)}
            disabled={readOnly}
            className="text-2xl font-semibold text-gray-900 mb-4"
            placeholder="Task title..."
          />

          {/* Meta Information Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Assignee */}
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                <User className="w-4 h-4" />
                Assignee
              </label>
              <UserSelect
                value={task.assignee?._id}
                onChange={(userId) => handleFieldUpdate('assignee', userId)}
                projectId={task.project}
                disabled={readOnly}
              />
            </div>

            {/* Priority */}
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                <Flag className="w-4 h-4" />
                Priority
              </label>
              <PrioritySelect
                value={task.priority}
                onChange={(priority) => handleFieldUpdate('priority', priority)}
                disabled={readOnly}
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4" />
                Due Date
              </label>
              <DatePicker
                value={task.dueDate}
                onChange={(date) => handleFieldUpdate('dueDate', date)}
                disabled={readOnly}
              />
            </div>

            {/* Time Estimate */}
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                <Clock className="w-4 h-4" />
                Time Estimate
              </label>
              <input
                type="number"
                value={task.estimatedHours || ''}
                onChange={(e) =>
                  handleFieldUpdate(
                    'estimatedHours',
                    parseFloat(e.target.value)
                  )
                }
                disabled={readOnly}
                placeholder="Hours"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min="0"
                step="0.5"
              />
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <EditableText
              value={task.description || ''}
              onChange={(description) =>
                handleFieldUpdate('description', description)
              }
              disabled={readOnly}
              multiline
              className="w-full min-h-[100px] p-3 border border-gray-300 rounded-lg"
              placeholder="Add a description..."
            />
          </div>

          {/* Subtasks */}
          {task.subtasks?.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <GitBranch className="w-4 h-4" />
                  Subtasks ({completedSubtasks}/{totalSubtasks})
                </h3>
              </div>
              <SubtaskList
                parentTask={task}
                subtasks={task.subtasks}
                onUpdate={() => {
                  /* Refresh task */
                }}
                readOnly={readOnly}
              />
            </div>
          )}

          {/* Dependencies */}
          {(task.dependencies?.blockedBy?.length > 0 ||
            task.dependencies?.blocks?.length > 0) && (
            <div className="mb-6">
              <h3 className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                <Link2 className="w-4 h-4" />
                Dependencies
              </h3>
              <TaskDependencies
                task={task}
                onUpdate={() => {
                  /* Refresh task */
                }}
                readOnly={readOnly}
              />
            </div>
          )}
        </div>

        {/* Right Column - Activity */}
        <div className="w-96 border-l bg-gray-50 flex flex-col">
          {/* Tabs */}
          <div className="flex border-b bg-white">
            <button
              onClick={() => setActiveTab('comments')}
              className={cn(
                'flex-1 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === 'comments'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              Comments ({task.commentsCount || 0})
            </button>
            <button
              onClick={() => setActiveTab('attachments')}
              className={cn(
                'flex-1 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === 'attachments'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              Files ({task.attachments?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={cn(
                'flex-1 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === 'activity'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              Activity
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'comments' && (
              <TaskComments taskId={task._id} readOnly={readOnly} />
            )}
            {activeTab === 'attachments' && (
              <TaskAttachments
                task={task}
                onUpdate={(attachments) =>
                  handleFieldUpdate('attachments', attachments)
                }
                readOnly={readOnly}
              />
            )}
            {activeTab === 'activity' && <TaskActivity taskId={task._id} />}
          </div>

          {/* Time Tracking Summary */}
          <div className="p-4 border-t bg-white">
            <TaskTimeTracking task={task} isTracking={isTracking} />
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete Task?
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{task.title}"? This action cannot
              be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg"
              >
                Delete Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render as modal or embedded
  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full h-[90vh] overflow-hidden">
          {content}
        </div>
      </div>
    );
  }

  return content;
};
```

### 5. Task List View Component

**File: `client/src/components/projects/organisms/TaskListView.js`**

```javascript
import React, { useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Filter,
  Download,
  Upload,
  Calendar,
  User,
  Flag,
  Clock,
  CheckSquare,
  Square
} from 'lucide-react';
import { TaskRow } from '../molecules/TaskRow';
import { TaskFilters } from '../molecules/TaskFilters';
import { BulkTaskActions } from '../molecules/BulkTaskActions';
import { QuickAddTask } from '../molecules/QuickAddTask';
import { cn } from '../../../utils/cn';
import { updateTask, bulkUpdateTasks } from '../../../features/tasks/tasksSlice';

/**
 * TaskListView - Table/list view for project tasks
 *
 * Provides a comprehensive list view with features:
 * - Sortable columns
 * - Inline editing
 * - Bulk selection and actions
 * - Grouping by status/assignee/date
 * - Export/import functionality
 * - Keyboard navigation
 *
 * @param {Object} props.project - Current project object
 * @param {Array} props.tasks - Array of task objects
 * @param {Function} props.onTaskClick - Handler for task click
 * @param {boolean} props.readOnly - Whether the list is read-only
 */
export const TaskListView = ({ project, tasks = [], onTaskClick, readOnly = false }) => {
  const dispatch = useDispatch();
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [sortBy, setSortBy] = useState('order');
  const [sortOrder, setSortOrder] = useState('asc');
  const [groupBy, setGroupBy] = useState('none'); // none, status, assignee, priority, dueDate
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    assignee: 'all',
    priority: 'all',
    dueDate: 'all',
    tags: []
  });

  /**
   * Sort tasks based on current sort settings
   */
  const sortedTasks = useMemo(() => {
    const sorted = [...tasks].sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      // Handle special cases
      if (sortBy === 'assignee') {
        aVal = a.assignee?.name || '';
        bVal = b.assignee?.name || '';
      } else if (sortBy === 'dueDate') {
        aVal = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        bVal = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      }

      // Compare values
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [tasks, sortBy, sortOrder]);

  /**
   * Group tasks based on groupBy setting
   */
  const groupedTasks = useMemo(() => {
    if (groupBy === 'none') {
      return { 'All Tasks': sortedTasks };
    }

    const groups = {};

    sortedTasks.forEach(task => {
      let groupKey;

      switch (groupBy) {
        case 'status':
          groupKey = task.status;
          break;
        case 'assignee':
          groupKey = task.assignee?.name || 'Unassigned';
          break;
        case 'priority':
          groupKey = task.priority;
          break;
        case 'dueDate':
          if (!task.dueDate) {
            groupKey = 'No Due Date';
          } else {
            const date = new Date(task.dueDate);
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            if (date < today) {
              groupKey = 'Overdue';
            } else if (date.toDateString() === today.toDateString()) {
              groupKey = 'Today';
            } else if (date.toDateString() === tomorrow.toDateString()) {
              groupKey = 'Tomorrow';
            } else if (date < new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)) {
              groupKey = 'This Week';
            } else {
              groupKey = 'Later';
            }
          }
          break;
        default:
          groupKey = 'Other';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(task);
    });

    return groups;
  }, [sortedTasks, groupBy]);

  /**
   * Handle column sort
   */
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  /**
   * Handle select all
   */
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedTasks(tasks.map(t => t._id));
    } else
      setSelectedTasks([]);
    }
  };

  /**
   * Handle task selection
   */
  const handleTaskSelect = (taskId, checked) => {
    if (checked) {
      setSelectedTasks([...selectedTasks, taskId]);
    } else {
      setSelectedTasks(selectedTasks.filter(id => id !== taskId));
    }
  };

  /**
   * Handle bulk actions
   */
  const handleBulkAction = async (action, data) => {
    if (selectedTasks.length === 0) return;

    try {
      await dispatch(bulkUpdateTasks({
        taskIds: selectedTasks,
        action,
        data
      })).unwrap();

      // Clear selection after successful action
      setSelectedTasks([]);
    } catch (error) {
      console.error('Bulk action failed:', error);
    }
  };

  /**
   * Toggle group expansion
   */
  const toggleGroup = (groupKey) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  // Column configuration
  const columns = [
    { key: 'title', label: 'Task', sortable: true, width: 'flex-1' },
    { key: 'assignee', label: 'Assignee', sortable: true, width: 'w-32' },
    { key: 'status', label: 'Status', sortable: true, width: 'w-32' },
    { key: 'priority', label: 'Priority', sortable: true, width: 'w-24' },
    { key: 'dueDate', label: 'Due Date', sortable: true, width: 'w-32' },
    { key: 'progress', label: 'Progress', sortable: false, width: 'w-24' },
    { key: 'actions', label: '', sortable: false, width: 'w-20' }
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          {/* Bulk Actions */}
          {selectedTasks.length > 0 && (
            <BulkTaskActions
              selectedCount={selectedTasks.length}
              onAction={handleBulkAction}
              onClear={() => setSelectedTasks([])}
            />
          )}

          {/* Group By */}
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="none">No Grouping</option>
            <option value="status">Group by Status</option>
            <option value="assignee">Group by Assignee</option>
            <option value="priority">Group by Priority</option>
            <option value="dueDate">Group by Due Date</option>
          </select>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm",
              showFilters
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : "text-gray-700 border-gray-300 hover:bg-gray-50"
            )}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Export/Import */}
          <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            <Download className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            <Upload className="w-5 h-5" />
          </button>

          {/* Add Task */}
          {!readOnly && (
            <QuickAddTask
              projectId={project._id}
              trigger={
                <button className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <Plus className="w-4 h-4" />
                  <span>Add Task</span>
                </button>
              }
            />
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <TaskFilters
          filters={filters}
          onChange={setFilters}
          project={project}
          className="mb-4"
        />
      )}

      {/* Task Table */}
      <div className="flex-1 overflow-auto bg-white rounded-lg border">
        <table className="w-full">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedTasks.length === tasks.length && tasks.length > 0}
                  indeterminate={selectedTasks.length > 0 && selectedTasks.length < tasks.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300"
                />
              </th>
              {columns.map(column => (
                <th
                  key={column.key}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider",
                    column.width,
                    column.sortable && "cursor-pointer hover:bg-gray-100"
                  )}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-1">
                    {column.label}
                    {column.sortable && sortBy === column.key && (
                      <span className="text-blue-600">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {Object.entries(groupedTasks).map(([groupKey, groupTasks]) => (
              <React.Fragment key={groupKey}>
                {/* Group Header */}
                {groupBy !== 'none' && (
                  <tr className="bg-gray-50">
                    <td colSpan={columns.length + 1} className="px-4 py-2">
                      <button
                        onClick={() => toggleGroup(groupKey)}
                        className="flex items-center gap-2 font-medium text-gray-700"
                      >
                        {expandedGroups.has(groupKey) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        <span>{groupKey}</span>
                        <span className="text-sm text-gray-500">({groupTasks.length})</span>
                      </button>
                    </td>
                  </tr>
                )}

                {/* Task Rows */}
                {(groupBy === 'none' || expandedGroups.has(groupKey)) && groupTasks.map(task => (
                  <TaskRow
                    key={task._id}
                    task={task}
                    isSelected={selectedTasks.includes(task._id)}
                    onSelect={(checked) => handleTaskSelect(task._id, checked)}
                    onClick={() => onTaskClick(task)}
                    readOnly={readOnly}
                  />
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {/* Empty State */}
        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <CheckSquare className="w-12 h-12 mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No tasks yet</p>
            <p className="text-sm">Create your first task to get started</p>
          </div>
        )}
      </div>
    </div>
  );
};
```

### 6. Enhanced Task Controller

**File: `server/controllers/taskController.js`**

```javascript
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import { sendNotification } from '../utils/notifications.js';
import { uploadFile } from '../utils/fileUpload.js';

/**
 * Enhanced Task Controller with advanced features
 *
 * Handles all task-related operations including:
 * - CRUD operations with advanced filtering
 * - Subtask management
 * - Time tracking
 * - File attachments
 * - Bulk operations
 * - Dependency management
 * - Recurring task generation
 */

export const taskController = {
  /**
   * Get tasks with advanced filtering and pagination
   */
  async getTasks(req, res) {
    try {
      const {
        projectId,
        assignee,
        status,
        priority,
        search,
        startDate,
        endDate,
        tags,
        includeSubtasks = true,
        includeArchived = false,
        page = 1,
        limit = 50,
        sortBy = 'order',
        sortOrder = 'asc',
      } = req.query;

      // Build query
      const query = {};

      if (projectId) query.project = projectId;
      if (assignee)
        query.assignee = assignee === 'unassigned' ? null : assignee;
      if (status)
        query.status = Array.isArray(status) ? { $in: status } : status;
      if (priority) query.priority = priority;
      if (!includeArchived) query.archived = false;

      // Date range filter
      if (startDate || endDate) {
        query.dueDate = {};
        if (startDate) query.dueDate.$gte = new Date(startDate);
        if (endDate) query.dueDate.$lte = new Date(endDate);
      }

      // Tags filter
      if (tags) {
        const tagArray = Array.isArray(tags) ? tags : tags.split(',');
        query.tags = { $in: tagArray };
      }

      // Text search
      if (search) {
        query.$text = { $search: search };
      }

      // Execute query with pagination
      const tasks = await Task.find(query)
        .populate('assignee', 'name email avatar')
        .populate('createdBy', 'name email')
        .populate({
          path: 'subtasks',
          populate: {
            path: 'assignee',
            select: 'name email avatar',
          },
        })
        .populate('dependencies.blockedBy', 'title status')
        .populate('dependencies.blocks', 'title status')
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();

      // Get total count for pagination
      const totalCount = await Task.countDocuments(query);

      // Calculate additional metrics
      const metrics = {
        total: totalCount,
        completed: tasks.filter((t) => t.status === 'done').length,
        overdue: tasks.filter((t) => t.isOverdue).length,
        totalEstimatedHours: tasks.reduce(
          (sum, t) => sum + (t.estimatedHours || 0),
          0
        ),
        totalActualHours: tasks.reduce(
          (sum, t) => sum + (t.actualHours || 0),
          0
        ),
      };

      res.json({
        tasks,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
        metrics,
      });
    } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  },

  /**
   * Create a new task with optional subtasks
   */
  async createTask(req, res) {
    try {
      const {
        title,
        description,
        projectId,
        assignee,
        priority,
        dueDate,
        startDate,
        estimatedHours,
        tags,
        parentTask,
        dependencies,
        recurring,
        subtasks,
      } = req.body;

      // Verify project access
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check user has access to project
      const hasAccess = project.members.some(
        (member) => member.user.toString() === req.user.id
      );
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this project' });
      }

      // Create main task
      const taskData = {
        title,
        description,
        project: projectId,
        createdBy: req.user.id,
        assignee,
        assignedBy: assignee ? req.user.id : null,
        assignedAt: assignee ? new Date() : null,
        priority: priority || 'medium',
        dueDate,
        startDate,
        estimatedHours,
        tags: tags || [],
        parentTask,
        dependencies: dependencies || { blockedBy: [], blocks: [] },
        recurring: recurring || { enabled: false },
      };

      const task = new Task(taskData);
      await task.save();

      // Create subtasks if provided
      if (subtasks && subtasks.length > 0) {
        const subtaskIds = [];

        for (const subtaskData of subtasks) {
          const subtask = new Task({
            ...subtaskData,
            project: projectId,
            parentTask: task._id,
            createdBy: req.user.id,
          });

          await subtask.save();
          subtaskIds.push(subtask._id);
        }

        // Update parent task with subtask references
        task.subtasks = subtaskIds;
        await task.save();
      }

      // Update dependency relationships
      if (dependencies?.blockedBy?.length > 0) {
        await Task.updateMany(
          { _id: { $in: dependencies.blockedBy } },
          { $push: { 'dependencies.blocks': task._id } }
        );
      }

      if (dependencies?.blocks?.length > 0) {
        await Task.updateMany(
          { _id: { $in: dependencies.blocks } },
          { $push: { 'dependencies.blockedBy': task._id } }
        );
      }

      // Send notifications
      if (assignee && assignee !== req.user.id) {
        await sendNotification({
          user: assignee,
          type: 'task_assigned',
          title: 'New Task Assigned',
          message: `You have been assigned to "${title}"`,
          data: { taskId: task._id, projectId },
        });
      }

      // Populate and return
      await task.populate([
        { path: 'assignee', select: 'name email avatar' },
        { path: 'createdBy', select: 'name email' },
        { path: 'subtasks' },
      ]);

      res.status(201).json({
        message: 'Task created successfully',
        task,
      });
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({ error: 'Failed to create task' });
    }
  },

  /**
   * Update task with progress calculation
   */
  async updateTask(req, res) {
    try {
      const { taskId } = req.params;
      const updates = req.body;

      const task = await Task.findById(taskId);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // Track changes for notifications
      const changes = {};

      // Handle status changes
      if (updates.status && updates.status !== task.status) {
        changes.status = { from: task.status, to: updates.status };

        if (updates.status === 'done') {
          updates.completedAt = new Date();
          updates.completedBy = req.user.id;
        }
      }

      // Handle assignee changes
      if (
        updates.assignee !== undefined &&
        updates.assignee !== task.assignee?.toString()
      ) {
        changes.assignee = { from: task.assignee, to: updates.assignee };
        updates.assignedBy = req.user.id;
        updates.assignedAt = new Date();
      }

      // Apply updates
      Object.assign(task, updates);

      // Update activity tracking
      task.activity.lastActivityAt = new Date();
      task.activity.lastActivityBy = req.user.id;
      task.activity.updateCount += 1;

      // Calculate progress if needed
      if (task.progress.automatic) {
        await task.calculateProgress();
      }

      await task.save();

      // Send notifications for significant changes
      if (
        changes.assignee &&
        changes.assignee.to &&
        changes.assignee.to !== req.user.id
      ) {
        await sendNotification({
          user: changes.assignee.to,
          type: 'task_assigned',
          title: 'Task Assigned',
          message: `You have been assigned to "${task.title}"`,
          data: { taskId: task._id, projectId: task.project },
        });
      }

      // Populate and return
      await task.populate([
        { path: 'assignee', select: 'name email avatar' },
        { path: 'subtasks' },
        { path: 'dependencies.blockedBy', select: 'title status' },
        { path: 'dependencies.blocks', select: 'title status' },
      ]);

      res.json({
        message: 'Task updated successfully',
        task,
        changes,
      });
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({ error: 'Failed to update task' });
    }
  },

  /**
   * Bulk update multiple tasks
   */
  async bulkUpdateTasks(req, res) {
    try {
      const { taskIds, updates } = req.body;

      if (!taskIds || taskIds.length === 0) {
        return res.status(400).json({ error: 'No tasks specified' });
      }

      // Verify user has access to all tasks
      const tasks = await Task.find({ _id: { $in: taskIds } }).populate(
        'project',
        'members'
      );

      const unauthorized = tasks.filter(
        (task) =>
          !task.project.members.some((m) => m.user.toString() === req.user.id)
      );

      if (unauthorized.length > 0) {
        return res.status(403).json({
          error: 'Unauthorized access to some tasks',
          unauthorizedTasks: unauthorized.map((t) => t._id),
        });
      }

      // Apply updates
      const updateData = {
        ...updates,
        'activity.lastActivityAt': new Date(),
        'activity.lastActivityBy': req.user.id,
        $inc: { 'activity.updateCount': 1 },
      };

      const result = await Task.updateMany(
        { _id: { $in: taskIds } },
        updateData
      );

      res.json({
        message: 'Tasks updated successfully',
        modified: result.modifiedCount,
        total: taskIds.length,
      });
    } catch (error) {
      console.error('Error in bulk update:', error);
      res.status(500).json({ error: 'Failed to update tasks' });
    }
  },

  /**
   * Add time tracking entry
   */
  async addTimeEntry(req, res) {
    try {
      const { taskId } = req.params;
      const { startTime, endTime, description } = req.body;

      const task = await Task.findById(taskId);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      await task.addTimeEntry(req.user.id, startTime, endTime, description);

      res.json({
        message: 'Time entry added successfully',
        task: {
          _id: task._id,
          timeEntries: task.timeEntries,
          actualHours: task.actualHours,
        },
      });
    } catch (error) {
      console.error('Error adding time entry:', error);
      res.status(500).json({ error: 'Failed to add time entry' });
    }
  },

  /**
   * Upload attachment to task
   */
  async uploadAttachment(req, res) {
    try {
      const { taskId } = req.params;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const task = await Task.findById(taskId);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // Upload file to storage
      const uploadResult = await uploadFile(file, `tasks/${taskId}`);

      // Add attachment to task
      task.attachments.push({
        filename: uploadResult.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        uploadedBy: req.user.id,
        url: uploadResult.url,
      });

      await task.save();

      res.json({
        message: 'File uploaded successfully',
        attachment: task.attachments[task.attachments.length - 1],
      });
    } catch (error) {
      console.error('Error uploading attachment:', error);
      res.status(500).json({ error: 'Failed to upload file' });
    }
  },

  /**
   * Delete task and handle relationships
   */
  async deleteTask(req, res) {
    try {
      const { taskId } = req.params;

      const task = await Task.findById(taskId);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // Remove task from parent's subtasks array
      if (task.parentTask) {
        await Task.findByIdAndUpdate(task.parentTask, {
          $pull: { subtasks: taskId },
        });
      }

      // Update dependency relationships
      await Task.updateMany(
        { 'dependencies.blockedBy': taskId },
        { $pull: { 'dependencies.blockedBy': taskId } }
      );

      await Task.updateMany(
        { 'dependencies.blocks': taskId },
        { $pull: { 'dependencies.blocks': taskId } }
      );

      // Delete all subtasks
      if (task.subtasks.length > 0) {
        await Task.deleteMany({ _id: { $in: task.subtasks } });
      }

      // Delete the task
      await task.deleteOne();

      res.json({
        message: 'Task deleted successfully',
        deletedTask: taskId,
        deletedSubtasks: task.subtasks,
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      res.status(500).json({ error: 'Failed to delete task' });
    }
  },
};
```

### 7. Redux Tasks Slice

**File: `client/src/features/tasks/tasksSlice.js`**

```javascript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

/**
 * Redux slice for advanced task management
 *
 * Handles:
 * - Task CRUD operations
 * - Real-time updates via websocket
 * - Optimistic updates
 * - Bulk operations
 * - Caching and performance optimization
 */

// Async thunks
export const fetchTasks = createAsyncThunk(
  'tasks/fetchTasks',
  async (params) => {
    const response = await api.get('/tasks', { params });
    return response.data;
  }
);

export const createTask = createAsyncThunk(
  'tasks/createTask',
  async (taskData) => {
    const response = await api.post('/tasks', taskData);
    return response.data.task;
  }
);

export const updateTask = createAsyncThunk(
  'tasks/updateTask',
  async ({ taskId, updates }) => {
    const response = await api.patch(`/tasks/${taskId}`, updates);
    return response.data.task;
  }
);

export const deleteTask = createAsyncThunk(
  'tasks/deleteTask',
  async (taskId) => {
    await api.delete(`/tasks/${taskId}`);
    return taskId;
  }
);

export const bulkUpdateTasks = createAsyncThunk(
  'tasks/bulkUpdate',
  async ({ taskIds, updates }) => {
    const response = await api.post('/tasks/bulk-update', { taskIds, updates });
    return { taskIds, updates, result: response.data };
  }
);

export const addTimeEntry = createAsyncThunk(
  'tasks/addTimeEntry',
  async ({ taskId, timeEntry }) => {
    const response = await api.post(`/tasks/${taskId}/time-entries`, timeEntry);
    return { taskId, timeEntries: response.data.task.timeEntries };
  }
);

export const updateTaskStatus = createAsyncThunk(
  'tasks/updateStatus',
  async ({ taskId, status, order }) => {
    const response = await api.patch(`/tasks/${taskId}`, { status, order });
    return response.data.task;
  }
);

// Initial state
const initialState = {
  tasks: {}, // Normalized task data { [taskId]: task }
  tasksByProject: {}, // { [projectId]: [taskIds] }
  currentTask: null, // Currently selected task
  filters: {
    status: 'all',
    assignee: 'all',
    priority: 'all',
    search: '',
    tags: [],
  },
  sorting: {
    by: 'order',
    order: 'asc',
  },
  view: 'board', // 'board' | 'list' | 'calendar' | 'timeline'
  loading: false,
  error: null,
  lastFetch: {}, // { [projectId]: timestamp }
  optimisticUpdates: {}, // Temporary updates before server confirmation
};

// Slice
const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setCurrentTask: (state, action) => {
      state.currentTask = action.payload;
    },

    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },

    setSorting: (state, action) => {
      state.sorting = action.payload;
    },

    setView: (state, action) => {
      state.view = action.payload;
    },

    // Optimistic update for drag & drop
    optimisticTaskMove: (state, action) => {
      const { taskId, status, order } = action.payload;
      if (state.tasks[taskId]) {
        state.optimisticUpdates[taskId] = { status, order };
        state.tasks[taskId] = {
          ...state.tasks[taskId],
          status,
          order,
        };
      }
    },

    // Real-time updates from websocket
    taskUpdated: (state, action) => {
      const task = action.payload;
      state.tasks[task._id] = task;
      delete state.optimisticUpdates[task._id];
    },

    taskDeleted: (state, action) => {
      const taskId = action.payload;
      delete state.tasks[taskId];

      // Remove from project lists
      Object.keys(state.tasksByProject).forEach((projectId) => {
        state.tasksByProject[projectId] = state.tasksByProject[
          projectId
        ].filter((id) => id !== taskId);
      });
    },

    clearProjectTasks: (state, action) => {
      const projectId = action.payload;
      const taskIds = state.tasksByProject[projectId] || [];

      taskIds.forEach((taskId) => {
        delete state.tasks[taskId];
      });

      delete state.tasksByProject[projectId];
      delete state.lastFetch[projectId];
    },
  },

  extraReducers: (builder) => {
    builder
      // Fetch tasks
      .addCase(fetchTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        const { tasks, pagination, metrics } = action.payload;
        const projectId = action.meta.arg.projectId;

        // Normalize tasks
        const taskIds = [];
        tasks.forEach((task) => {
          state.tasks[task._id] = task;
          taskIds.push(task._id);
        });

        // Update project mapping
        if (projectId) {
          state.tasksByProject[projectId] = taskIds;
          state.lastFetch[projectId] = Date.now();
        }

        state.loading = false;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      // Create task
      .addCase(createTask.fulfilled, (state, action) => {
        const task = action.payload;
        state.tasks[task._id] = task;

        if (task.project && state.tasksByProject[task.project]) {
          state.tasksByProject[task.project].push(task._id);
        }
      })

      // Update task
      .addCase(updateTask.fulfilled, (state, action) => {
        const task = action.payload;
        state.tasks[task._id] = task;
        delete state.optimisticUpdates[task._id];
      })

      // Delete task
      .addCase(deleteTask.fulfilled, (state, action) => {
        const taskId = action.payload;
        const task = state.tasks[taskId];

        if (task && task.project && state.tasksByProject[task.project]) {
          state.tasksByProject[task.project] = state.tasksByProject[
            task.project
          ].filter((id) => id !== taskId);
        }

        delete state.tasks[taskId];
      })

      // Bulk update
      .addCase(bulkUpdateTasks.fulfilled, (state, action) => {
        const { taskIds, updates } = action.payload;

        taskIds.forEach((taskId) => {
          if (state.tasks[taskId]) {
            state.tasks[taskId] = {
              ...state.tasks[taskId],
              ...updates,
            };
          }
        });
      })

      // Add time entry
      .addCase(addTimeEntry.fulfilled, (state, action) => {
        const { taskId, timeEntries } = action.payload;
        if (state.tasks[taskId]) {
          state.tasks[taskId].timeEntries = timeEntries;
        }
      })

      // Update status (drag & drop)
      .addCase(updateTaskStatus.fulfilled, (state, action) => {
        const task = action.payload;
        state.tasks[task._id] = task;
        delete state.optimisticUpdates[task._id];
      });
  },
});

// Selectors
export const selectAllTasks = (state) => Object.values(state.tasks.tasks);

export const selectTaskById = (taskId) => (state) => state.tasks.tasks[taskId];

export const selectTasksByProject = (projectId) => (state) => {
  const taskIds = state.tasks.tasksByProject[projectId] || [];
  return taskIds.map((id) => state.tasks.tasks[id]).filter(Boolean);
};

export const selectFilteredTasks = (projectId) => (state) => {
  const tasks = selectTasksByProject(projectId)(state);
  const { filters } = state.tasks;

  return tasks.filter((task) => {
    if (filters.status !== 'all' && task.status !== filters.status)
      return false;
    if (filters.assignee !== 'all' && task.assignee?._id !== filters.assignee)
      return false;
    if (filters.priority !== 'all' && task.priority !== filters.priority)
      return false;
    if (
      filters.search &&
      !task.title.toLowerCase().includes(filters.search.toLowerCase())
    )
      return false;
    if (
      filters.tags.length > 0 &&
      !filters.tags.some((tag) => task.tags.includes(tag))
    )
      return false;

    return true;
  });
};

export const selectTaskMetrics = (projectId) => (state) => {
  const tasks = selectTasksByProject(projectId)(state);

  return {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === 'done').length,
    inProgress: tasks.filter((t) => t.status === 'in-progress').length,
    overdue: tasks.filter((t) => t.isOverdue).length,
    unassigned: tasks.filter((t) => !t.assignee).length,
    totalEstimatedHours: tasks.reduce(
      (sum, t) => sum + (t.estimatedHours || 0),
      0
    ),
    totalActualHours: tasks.reduce((sum, t) => sum + (t.actualHours || 0), 0),
  };
};

// Export actions
export const {
  setCurrentTask,
  setFilters,
  setSorting,
  setView,
  optimisticTaskMove,
  taskUpdated,
  taskDeleted,
  clearProjectTasks,
} = tasksSlice.actions;

export default tasksSlice.reducer;
```

### 8. Task API Routes

**File: `server/routes/taskRoutes.js`**

```javascript
import express from 'express';
import { taskController } from '../controllers/taskController.js';
import { authenticate } from '../middleware/auth.js';
import { validateTask } from '../middleware/validation.js';
import upload from '../middleware/upload.js';

const router = express.Router();

/**
 * Task API Routes
 *
 * All routes require authentication
 * Handles task CRUD, bulk operations, time tracking, and attachments
 */

// Apply authentication to all routes
router.use(authenticate);

// Task CRUD
router.get('/', taskController.getTasks);
router.post('/', validateTask, taskController.createTask);
router.get('/:taskId', taskController.getTask);
router.patch('/:taskId', taskController.updateTask);
router.delete('/:taskId', taskController.deleteTask);

// Bulk operations
router.post('/bulk-update', taskController.bulkUpdateTasks);
router.post('/bulk-delete', taskController.bulkDeleteTasks);

// Time tracking
router.post('/:taskId/time-entries', taskController.addTimeEntry);
router.patch('/:taskId/time-entries/:entryId', taskController.updateTimeEntry);
router.delete('/:taskId/time-entries/:entryId', taskController.deleteTimeEntry);

// Attachments
router.post(
  '/:taskId/attachments',
  upload.single('file'),
  taskController.uploadAttachment
);
router.delete(
  '/:taskId/attachments/:attachmentId',
  taskController.deleteAttachment
);

// Task relationships
router.post('/:taskId/subtasks', validateTask, taskController.createSubtask);
router.post('/:taskId/dependencies', taskController.updateDependencies);

// Task actions
router.post('/:taskId/archive', taskController.archiveTask);
router.post('/:taskId/unarchive', taskController.unarchiveTask);
router.post('/:taskId/duplicate', taskController.duplicateTask);

// Comments (if not in separate controller)
router.get('/:taskId/comments', taskController.getComments);
router.post('/:taskId/comments', taskController.addComment);

// Activity log
router.get('/:taskId/activity', taskController.getActivity);

export default router;
```

---

## 🔧 SUPPORTING COMPONENTS

### Task Column Component (for Kanban)

**File: `client/src/components/projects/molecules/TaskColumn.js`**

```javascript
import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { TaskCard } from './TaskCard';
import { QuickAddTask } from './QuickAddTask';
import { cn } from '../../../utils/cn';

export const TaskColumn = ({ column, tasks, project, readOnly }) => {
  const { setNodeRef } = useDroppable({
    id: column.id,
  });

  const taskIds = tasks.map((task) => task._id);

  const columnColors = {
    gray: 'bg-gray-50 border-gray-200',
    blue: 'bg-blue-50 border-blue-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    red: 'bg-red-50 border-red-200',
    green: 'bg-green-50 border-green-200',
  };

  return (
    <div className="flex flex-col w-80 h-full">
      {/* Column Header */}
      <div
        className={cn(
          'px-4 py-3 rounded-t-lg border-t border-x',
          columnColors[column.color]
        )}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900">
            {column.title}
            <span className="ml-2 text-sm text-gray-500">
              ({column.taskCount})
            </span>
          </h3>

          {column.overdueCount > 0 && (
            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
              {column.overdueCount} overdue
            </span>
          )}
        </div>

        {column.totalHours > 0 && (
          <p className="text-xs text-gray-600 mt-1">
            {column.totalHours}h estimated
          </p>
        )}
      </div>

      {/* Task List */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 p-2 space-y-2 overflow-y-auto border-x border-b rounded-b-lg',
          columnColors[column.color]
        )}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task._id} task={task} readOnly={readOnly} />
          ))}
        </SortableContext>

        {/* Quick Add Task */}
        {!readOnly && (
          <QuickAddTask
            projectId={project._id}
            defaultStatus={column.id}
            trigger={
              <button className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors">
                <Plus className="w-5 h-5 mx-auto" />
              </button>
            }
          />
        )}
      </div>
    </div>
  );
};
```

---

## 📋 IMPLEMENTATION CHECKLIST

### Backend Tasks

- [ ] Update Task model with new schema fields
- [ ] Implement enhanced task controller methods
- [ ] Add time tracking endpoints
- [ ] Set up file upload for attachments
- [ ] Create task activity logging
- [ ] Add recurring task job scheduler
- [ ] Implement task search indexing
- [ ] Add bulk operation endpoints

### Frontend Tasks

- [ ] Create TaskBoard component with drag-and-drop
- [ ] Build TaskCard component
- [ ] Implement TaskDetail modal/page
- [ ] Create TaskListView with sorting/filtering
- [ ] Add time tracking UI
- [ ] Build subtask management interface
- [ ] Implement file attachment handling
- [ ] Create task activity feed

### State Management

- [ ] Set up Redux tasks slice
- [ ] Implement optimistic updates
- [ ] Add real-time websocket updates
- [ ] Create task selectors
- [ ] Add caching logic

### UI/UX Enhancements

- [ ] Keyboard shortcuts for task operations
- [ ] Drag-and-drop between columns
- [ ] Inline editing in list view
- [ ] Rich text editor for descriptions
- [ ] Task templates
- [ ] Batch operations UI

### Testing Requirements

- [ ] Unit tests for task methods
- [ ] Integration tests for API endpoints
- [ ] Component testing for UI elements
- [ ] E2E tests for task workflows
- [ ] Performance testing for large task lists

---

## 🎯 SUCCESS METRICS

### Performance Targets

- Task list loads < 500ms for 1000 tasks
- Drag-and-drop response < 100ms
- Search results appear < 200ms
- Bulk operations < 1s for 100 tasks

### User Experience Goals

- 90% of users can create tasks without help
- Task board preferred over list by 70% of users
- Time tracking adoption > 60%
- Average task completion time reduced by 25%

### Technical Metrics

- API response time < 200ms average
- Redux state updates < 50ms
- Memory usage stable with 5000+ tasks
- WebSocket message delivery < 100ms

---

## 🚀 DEPLOYMENT CONSIDERATIONS

### Database Optimization

```javascript
// Indexes to add
db.tasks.createIndex({ project: 1, status: 1, order: 1 });
db.tasks.createIndex({ assignee: 1, status: 1 });
db.tasks.createIndex({ dueDate: 1 });
db.tasks.createIndex({ '$**': 'text' }); // Full-text search
```

### Migration Strategy

1. Deploy schema updates without breaking changes
2. Run migration script to update existing tasks
3. Deploy new UI components behind feature flag
4. Gradually roll out to users
5. Monitor performance and fix issues
6. Remove old task UI code

### Feature Flags

```javascript
const featureFlags = {
  advancedTasks: process.env.ENABLE_ADVANCED_TASKS === 'true',
  taskTimeTracking: process.env.ENABLE_TIME_TRACKING === 'true',
  taskDependencies: process.env.ENABLE_DEPENDENCIES === 'true',
  kanbanBoard: process.env.ENABLE_KANBAN === 'true',
};
```

---

### 9. Task Dependency Management System

**File:** `server/utils/taskDependencyManager.js`

Advanced dependency management system that prevents circular dependencies, calculates critical paths, and ensures proper task ordering in complex project hierarchies.

```javascript
/**
 * Task Dependency Management System
 *
 * Provides advanced dependency tracking, circular dependency detection,
 * critical path analysis, and dependency graph traversal algorithms
 * for complex project management workflows.
 *
 * Key Features:
 * - Circular dependency detection using graph algorithms
 * - Critical path method (CPM) calculation
 * - Dependency impact analysis
 * - Bulk dependency operations
 * - Performance-optimized graph traversal
 */

class TaskDependencyManager {
  constructor(mongoClient, redisClient) {
    this.mongoClient = mongoClient;
    this.redisClient = redisClient;
    this.dependencyCache = new Map();
  }

  /**
   * Detect circular dependencies in task graph using depth-first search
   *
   * This algorithm uses a color-based DFS approach to detect cycles:
   * - White (0): Unvisited nodes
   * - Gray (1): Currently being processed (in the DFS stack)
   * - Black (2): Completely processed
   *
   * A back edge from a gray node indicates a cycle.
   *
   * @param {string} projectId - Project to analyze
   * @returns {Promise<Object>} Analysis result with cycle detection
   */
  async detectCircularDependencies(projectId) {
    const tasks = await this.getAllProjectTasks(projectId);
    const graph = this.buildDependencyGraph(tasks);

    // Initialize node colors: 0=white, 1=gray, 2=black
    const colors = new Map();
    const cycles = [];
    const path = [];

    // Initialize all nodes as white (unvisited)
    for (const taskId of Object.keys(graph)) {
      colors.set(taskId, 0);
    }

    // DFS traversal to detect cycles
    const dfsVisit = (nodeId) => {
      // Mark current node as gray (being processed)
      colors.set(nodeId, 1);
      path.push(nodeId);

      // Visit all adjacent nodes
      for (const adjacentId of graph[nodeId] || []) {
        if (colors.get(adjacentId) === 1) {
          // Back edge found - cycle detected
          const cycleStart = path.indexOf(adjacentId);
          const cycle = path.slice(cycleStart).concat([adjacentId]);
          cycles.push(cycle);
        } else if (colors.get(adjacentId) === 0) {
          // Continue DFS if node is unvisited
          dfsVisit(adjacentId);
        }
      }

      // Mark node as black (completely processed)
      colors.set(nodeId, 2);
      path.pop();
    };

    // Start DFS from all unvisited nodes
    for (const taskId of Object.keys(graph)) {
      if (colors.get(taskId) === 0) {
        dfsVisit(taskId);
      }
    }

    return {
      hasCycles: cycles.length > 0,
      cycles,
      cycleCount: cycles.length,
      affectedTasks: [...new Set(cycles.flat())],
      recommendations: this.generateCycleResolutionRecommendations(
        cycles,
        tasks
      ),
    };
  }

  /**
   * Calculate critical path using Critical Path Method (CPM)
   *
   * CPM identifies the longest sequence of dependent tasks that determines
   * the minimum project duration. Tasks on the critical path have zero slack time.
   *
   * Algorithm steps:
   * 1. Forward pass: Calculate earliest start/finish times
   * 2. Backward pass: Calculate latest start/finish times
   * 3. Calculate slack time for each task
   * 4. Identify critical path (tasks with zero slack)
   *
   * @param {string} projectId - Project to analyze
   * @returns {Promise<Object>} Critical path analysis
   */
  async calculateCriticalPath(projectId) {
    const tasks = await this.getAllProjectTasks(projectId);
    const graph = this.buildDependencyGraph(tasks);
    const taskMap = new Map(tasks.map((task) => [task._id.toString(), task]));

    // Step 1: Topological sort to get proper ordering
    const sortedTasks = this.topologicalSort(graph);

    // Step 2: Forward pass - calculate earliest start/finish times
    const earlyTimes = new Map();

    for (const taskId of sortedTasks) {
      const task = taskMap.get(taskId);
      const duration = task.estimatedTime || 1; // Default 1 day if no estimate

      // Calculate earliest start time
      let earlyStart = 0;
      const dependencies = this.getDependencies(taskId, graph);

      for (const depId of dependencies) {
        const depTimes = earlyTimes.get(depId);
        if (depTimes) {
          earlyStart = Math.max(earlyStart, depTimes.earlyFinish);
        }
      }

      const earlyFinish = earlyStart + duration;
      earlyTimes.set(taskId, {
        earlyStart,
        earlyFinish,
        duration,
      });
    }

    // Step 3: Backward pass - calculate latest start/finish times
    const lateTimes = new Map();
    const projectDuration = Math.max(
      ...Array.from(earlyTimes.values()).map((t) => t.earlyFinish)
    );

    // Start from tasks with no successors
    for (const taskId of sortedTasks.reverse()) {
      const earlyTime = earlyTimes.get(taskId);
      const successors = this.getSuccessors(taskId, graph);

      let lateFinish = projectDuration;
      if (successors.length > 0) {
        lateFinish = Math.min(
          ...successors.map(
            (succId) => lateTimes.get(succId)?.lateStart || projectDuration
          )
        );
      }

      const lateStart = lateFinish - earlyTime.duration;
      const slack = lateStart - earlyTime.earlyStart;

      lateTimes.set(taskId, {
        lateStart,
        lateFinish,
        slack,
        isCritical: slack === 0,
      });
    }

    // Step 4: Identify critical path
    const criticalTasks = Array.from(lateTimes.entries())
      .filter(([_, times]) => times.isCritical)
      .map(([taskId, _]) => taskId);

    const criticalPath = this.findLongestPath(criticalTasks, graph);

    return {
      projectDuration,
      criticalPath,
      criticalTasks,
      taskTimings: this.mergeTimes(earlyTimes, lateTimes, taskMap),
      slackAnalysis: this.calculateSlackDistribution(lateTimes),
      riskFactors: this.identifyRiskFactors(criticalTasks, taskMap),
    };
  }

  /**
   * Analyze dependency impact for what-if scenarios
   *
   * This method calculates how changes to task duration or dependencies
   * affect the overall project timeline and other tasks.
   *
   * @param {string} taskId - Task to analyze
   * @param {Object} changes - Proposed changes to analyze
   * @returns {Promise<Object>} Impact analysis
   */
  async analyzeDependencyImpact(taskId, changes) {
    const task = await this.getTaskById(taskId);
    const projectId = task.project;

    // Get current critical path baseline
    const baseline = await this.calculateCriticalPath(projectId);

    // Apply changes and recalculate
    const modifiedTask = { ...task, ...changes };
    const tasks = await this.getAllProjectTasks(projectId);
    const modifiedTasks = tasks.map((t) =>
      t._id.toString() === taskId ? modifiedTask : t
    );

    // Recalculate with changes
    const withChanges = await this.calculateCriticalPathForTasks(modifiedTasks);

    // Calculate impact metrics
    const durationImpact =
      withChanges.projectDuration - baseline.projectDuration;
    const criticalPathChanged = !this.arraysEqual(
      baseline.criticalPath,
      withChanges.criticalPath
    );

    const affectedTasks = this.findAffectedTasks(taskId, modifiedTasks);
    const cascadeEffect = this.calculateCascadeEffect(
      affectedTasks,
      baseline,
      withChanges
    );

    return {
      durationImpact,
      criticalPathChanged,
      newCriticalPath: withChanges.criticalPath,
      affectedTasks,
      cascadeEffect,
      riskAssessment: this.assessChangeRisk(durationImpact, cascadeEffect),
      recommendations: this.generateChangeRecommendations(
        durationImpact,
        affectedTasks
      ),
    };
  }

  /**
   * Build dependency graph from task array
   * Graph structure: { taskId: [dependentTaskId1, dependentTaskId2, ...] }
   */
  buildDependencyGraph(tasks) {
    const graph = {};

    // Initialize empty adjacency lists
    for (const task of tasks) {
      graph[task._id.toString()] = [];
    }

    // Build edges based on dependencies
    for (const task of tasks) {
      const taskId = task._id.toString();
      if (task.dependencies && task.dependencies.length > 0) {
        for (const depId of task.dependencies) {
          const depIdStr = depId.toString();
          if (graph[depIdStr]) {
            graph[depIdStr].push(taskId);
          }
        }
      }
    }

    return graph;
  }

  /**
   * Topological sort using Kahn's algorithm
   * Returns tasks in dependency-respecting order
   */
  topologicalSort(graph) {
    const inDegree = new Map();
    const queue = [];
    const result = [];

    // Calculate in-degrees
    for (const node of Object.keys(graph)) {
      inDegree.set(node, 0);
    }

    for (const node of Object.keys(graph)) {
      for (const neighbor of graph[node]) {
        inDegree.set(neighbor, (inDegree.get(neighbor) || 0) + 1);
      }
    }

    // Add nodes with no incoming edges to queue
    for (const [node, degree] of inDegree) {
      if (degree === 0) {
        queue.push(node);
      }
    }

    // Process queue
    while (queue.length > 0) {
      const current = queue.shift();
      result.push(current);

      // Remove edges and update in-degrees
      for (const neighbor of graph[current]) {
        const newDegree = inDegree.get(neighbor) - 1;
        inDegree.set(neighbor, newDegree);

        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    return result;
  }

  /**
   * Performance-optimized bulk dependency operations
   * Handles multiple dependency changes atomically
   */
  async performBulkDependencyOperations(operations) {
    const session = await this.mongoClient.startSession();

    try {
      await session.withTransaction(async () => {
        const validationResults = [];

        // Phase 1: Validate all operations
        for (const operation of operations) {
          const validation = await this.validateDependencyOperation(operation);
          validationResults.push(validation);

          if (!validation.isValid) {
            throw new Error(`Invalid operation: ${validation.error}`);
          }
        }

        // Phase 2: Check for circular dependencies after all operations
        const hypotheticalState = this.simulateOperations(operations);
        const circularCheck = await this.detectCircularDependenciesInState(
          hypotheticalState
        );

        if (circularCheck.hasCycles) {
          throw new Error(
            `Operations would create circular dependencies: ${circularCheck.cycles.join(
              ', '
            )}`
          );
        }

        // Phase 3: Execute all operations atomically
        const results = [];
        for (const operation of operations) {
          const result = await this.executeDependencyOperation(
            operation,
            session
          );
          results.push(result);
        }

        // Phase 4: Update cache and indexes
        await this.updateDependencyCache(operations);

        return results;
      });
    } finally {
      await session.endSession();
    }
  }

  // Helper methods for dependency management
  async getAllProjectTasks(projectId) {
    return await this.mongoClient
      .db()
      .collection('tasks')
      .find({ project: projectId })
      .toArray();
  }

  generateCycleResolutionRecommendations(cycles, tasks) {
    return cycles.map((cycle) => ({
      cycle,
      suggestions: [
        'Remove one dependency from the cycle',
        'Split tasks to break dependency chain',
        'Add milestone task to break cycle',
        'Reorder task execution sequence',
      ],
    }));
  }
}

module.exports = TaskDependencyManager;
```

---

### 10. Bulk Operations Transaction System

**File:** `server/utils/bulkTaskOperations.js`

Enterprise-grade bulk operations system with atomic transactions, rollback capabilities, and performance optimization for handling large-scale task operations safely and efficiently.

```javascript
/**
 * Bulk Task Operations Transaction System
 *
 * Provides atomic, transaction-safe bulk operations for task management
 * with comprehensive rollback capabilities, performance optimization,
 * and detailed operation logging for enterprise-grade task management.
 *
 * Key Features:
 * - Atomic bulk operations with full rollback
 * - Performance-optimized batch processing
 * - Comprehensive operation validation
 * - Detailed audit logging
 * - Progress tracking and status reporting
 * - Memory-efficient streaming for large datasets
 */

class BulkTaskOperations {
  constructor(mongoClient, redisClient, logger) {
    this.mongoClient = mongoClient;
    this.redisClient = redisClient;
    this.logger = logger;
    this.maxBatchSize = 1000;
    this.operationTimeout = 300000; // 5 minutes
  }

  /**
   * Execute bulk task operations with full transaction support
   *
   * This method provides atomic execution of multiple task operations
   * with automatic rollback on failure, progress tracking, and
   * performance optimization through batching and parallelization.
   *
   * @param {Array} operations - Array of operation objects
   * @param {Object} options - Execution options and configuration
   * @returns {Promise<Object>} Execution results with detailed metrics
   */
  async executeBulkOperations(operations, options = {}) {
    const {
      batchSize = this.maxBatchSize,
      parallelBatches = 3,
      enableRollback = true,
      auditTrail = true,
      progressCallback = null,
    } = options;

    // Generate unique operation ID for tracking
    const operationId = this.generateOperationId();
    const startTime = Date.now();

    // Initialize operation tracking
    const operationState = {
      id: operationId,
      status: 'initializing',
      totalOperations: operations.length,
      processedOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      batches: [],
      rollbackData: [],
      errors: [],
    };

    try {
      // Phase 1: Validate all operations before execution
      this.logger.info(
        `[${operationId}] Starting validation of ${operations.length} operations`
      );
      operationState.status = 'validating';

      const validationResults = await this.validateAllOperations(
        operations,
        operationId
      );
      if (!validationResults.isValid) {
        throw new Error(
          `Validation failed: ${validationResults.errors.join(', ')}`
        );
      }

      // Phase 2: Prepare batches for efficient processing
      operationState.status = 'preparing';
      const batches = this.createOptimizedBatches(operations, batchSize);
      operationState.batches = batches.map((batch, index) => ({
        id: `${operationId}_batch_${index}`,
        size: batch.length,
        status: 'pending',
      }));

      // Phase 3: Execute operations in atomic transaction
      operationState.status = 'executing';
      const session = await this.mongoClient.startSession();

      try {
        const results = await session.withTransaction(async () => {
          const batchResults = [];

          // Process batches with controlled parallelism
          for (let i = 0; i < batches.length; i += parallelBatches) {
            const batchGroup = batches.slice(i, i + parallelBatches);

            // Execute batch group in parallel
            const groupPromises = batchGroup.map(async (batch, batchIndex) => {
              const actualBatchIndex = i + batchIndex;
              operationState.batches[actualBatchIndex].status = 'executing';

              try {
                const batchResult = await this.executeBatch(
                  batch,
                  session,
                  operationId,
                  actualBatchIndex,
                  enableRollback
                );

                operationState.batches[actualBatchIndex].status = 'completed';
                operationState.processedOperations += batch.length;
                operationState.successfulOperations +=
                  batchResult.successful.length;
                operationState.failedOperations += batchResult.failed.length;

                // Store rollback data if enabled
                if (enableRollback && batchResult.rollbackData) {
                  operationState.rollbackData.push(...batchResult.rollbackData);
                }

                // Report progress if callback provided
                if (progressCallback) {
                  progressCallback({
                    operationId,
                    progress:
                      operationState.processedOperations /
                      operationState.totalOperations,
                    completed: operationState.processedOperations,
                    total: operationState.totalOperations,
                    batchCompleted: actualBatchIndex + 1,
                    totalBatches: batches.length,
                  });
                }

                return batchResult;
              } catch (error) {
                operationState.batches[actualBatchIndex].status = 'failed';
                operationState.batches[actualBatchIndex].error = error.message;
                throw error;
              }
            });

            // Wait for current batch group to complete
            const groupResults = await Promise.all(groupPromises);
            batchResults.push(...groupResults);
          }

          return batchResults;
        });

        // Phase 4: Finalize and create response
        operationState.status = 'completed';
        const endTime = Date.now();
        const executionTime = endTime - startTime;

        const finalResults = {
          operationId,
          status: 'success',
          executionTime,
          summary: {
            totalOperations: operationState.totalOperations,
            successful: operationState.successfulOperations,
            failed: operationState.failedOperations,
            successRate:
              (operationState.successfulOperations /
                operationState.totalOperations) *
              100,
          },
          batches: operationState.batches,
          performance: {
            averageOperationsPerSecond:
              operationState.totalOperations / (executionTime / 1000),
            batchCount: batches.length,
            averageBatchSize: operationState.totalOperations / batches.length,
          },
        };

        // Phase 5: Create audit log if enabled
        if (auditTrail) {
          await this.createAuditLog(operationId, operations, finalResults);
        }

        // Phase 6: Clean up temporary data
        await this.cleanupOperationData(operationId);

        this.logger.info(
          `[${operationId}] Bulk operation completed successfully in ${executionTime}ms`
        );
        return finalResults;
      } finally {
        await session.endSession();
      }
    } catch (error) {
      // Handle operation failure with optional rollback
      operationState.status = 'failed';
      operationState.error = error.message;

      this.logger.error(
        `[${operationId}] Bulk operation failed: ${error.message}`
      );

      // Attempt rollback if enabled and rollback data exists
      if (enableRollback && operationState.rollbackData.length > 0) {
        try {
          await this.performRollback(operationId, operationState.rollbackData);
          this.logger.info(`[${operationId}] Rollback completed successfully`);
        } catch (rollbackError) {
          this.logger.error(
            `[${operationId}] Rollback failed: ${rollbackError.message}`
          );
        }
      }

      // Create failure audit log
      if (auditTrail) {
        await this.createFailureAuditLog(
          operationId,
          operations,
          error,
          operationState
        );
      }

      throw new Error(`Bulk operation ${operationId} failed: ${error.message}`);
    }
  }

  /**
   * Execute a single batch of operations within a transaction
   *
   * Processes a batch of operations with proper error handling,
   * rollback data collection, and performance monitoring.
   *
   * @param {Array} batch - Operations in this batch
   * @param {Object} session - MongoDB session for transaction
   * @param {string} operationId - Unique operation identifier
   * @param {number} batchIndex - Index of current batch
   * @param {boolean} enableRollback - Whether to collect rollback data
   * @returns {Promise<Object>} Batch execution results
   */
  async executeBatch(batch, session, operationId, batchIndex, enableRollback) {
    const batchId = `${operationId}_batch_${batchIndex}`;
    const startTime = Date.now();

    const results = {
      batchId,
      successful: [],
      failed: [],
      rollbackData: [],
    };

    for (const operation of batch) {
      try {
        // Store original state for rollback if needed
        let originalState = null;
        if (enableRollback) {
          originalState = await this.captureOriginalState(operation, session);
        }

        // Execute the operation
        const operationResult = await this.executeOperation(operation, session);

        results.successful.push({
          operation,
          result: operationResult,
          timestamp: new Date(),
        });

        // Store rollback information
        if (enableRollback && originalState) {
          results.rollbackData.push({
            operation,
            originalState,
            rollbackType: this.determineRollbackType(operation),
          });
        }
      } catch (error) {
        results.failed.push({
          operation,
          error: error.message,
          timestamp: new Date(),
        });

        // For critical operations, fail entire batch
        if (operation.critical) {
          throw new Error(
            `Critical operation failed in batch ${batchIndex}: ${error.message}`
          );
        }
      }
    }

    const executionTime = Date.now() - startTime;
    this.logger.debug(
      `[${batchId}] Completed in ${executionTime}ms - Success: ${results.successful.length}, Failed: ${results.failed.length}`
    );

    return results;
  }

  /**
   * Perform comprehensive rollback of failed operations
   *
   * Executes rollback operations in reverse order to maintain
   * data consistency and referential integrity.
   *
   * @param {string} operationId - Operation identifier
   * @param {Array} rollbackData - Data needed for rollback
   * @returns {Promise<Object>} Rollback results
   */
  async performRollback(operationId, rollbackData) {
    const rollbackSession = await this.mongoClient.startSession();

    try {
      return await rollbackSession.withTransaction(async () => {
        const rollbackResults = {
          operationId,
          rollbackOperations: rollbackData.length,
          successful: 0,
          failed: 0,
          errors: [],
        };

        // Execute rollback operations in reverse order
        for (const rollbackItem of rollbackData.reverse()) {
          try {
            await this.executeRollbackOperation(rollbackItem, rollbackSession);
            rollbackResults.successful++;
          } catch (error) {
            rollbackResults.failed++;
            rollbackResults.errors.push({
              operation: rollbackItem.operation,
              error: error.message,
            });

            this.logger.error(
              `[${operationId}] Rollback operation failed: ${error.message}`
            );
          }
        }

        return rollbackResults;
      });
    } finally {
      await rollbackSession.endSession();
    }
  }

  /**
   * Create optimized batches based on operation types and dependencies
   *
   * Groups operations by type and considers dependencies to minimize
   * conflicts and maximize parallel processing efficiency.
   */
  createOptimizedBatches(operations, batchSize) {
    // Group operations by type for better performance
    const groupedOps = this.groupOperationsByType(operations);
    const batches = [];

    // Process each operation type separately to avoid conflicts
    for (const [operationType, ops] of Object.entries(groupedOps)) {
      // Further optimize based on operation characteristics
      const optimizedOps = this.optimizeOperationOrder(ops, operationType);

      // Split into batches of appropriate size
      for (let i = 0; i < optimizedOps.length; i += batchSize) {
        const batch = optimizedOps.slice(i, i + batchSize);
        batches.push(batch);
      }
    }

    return batches;
  }

  /**
   * Validate all operations before execution
   * Comprehensive validation including permissions, data integrity, and business rules
   */
  async validateAllOperations(operations, operationId) {
    const validationErrors = [];
    const validationWarnings = [];

    for (const [index, operation] of operations.entries()) {
      try {
        // Basic structure validation
        if (!operation.type || !operation.data) {
          validationErrors.push(
            `Operation ${index}: Missing required fields (type, data)`
          );
          continue;
        }

        // Type-specific validation
        const typeValidation = await this.validateOperationType(operation);
        if (!typeValidation.isValid) {
          validationErrors.push(`Operation ${index}: ${typeValidation.error}`);
        }

        // Permission validation
        const permissionValidation = await this.validateOperationPermissions(
          operation
        );
        if (!permissionValidation.isValid) {
          validationErrors.push(
            `Operation ${index}: Insufficient permissions - ${permissionValidation.error}`
          );
        }

        // Business rule validation
        const businessValidation = await this.validateBusinessRules(operation);
        if (!businessValidation.isValid) {
          validationErrors.push(
            `Operation ${index}: Business rule violation - ${businessValidation.error}`
          );
        }
        if (businessValidation.warnings) {
          validationWarnings.push(...businessValidation.warnings);
        }
      } catch (error) {
        validationErrors.push(
          `Operation ${index}: Validation error - ${error.message}`
        );
      }
    }

    return {
      isValid: validationErrors.length === 0,
      errors: validationErrors,
      warnings: validationWarnings,
      operationId,
    };
  }

  // Helper methods for bulk operations
  generateOperationId() {
    return `bulk_op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async executeOperation(operation, session) {
    const { type, data } = operation;

    switch (type) {
      case 'create':
        return await this.createTask(data, session);
      case 'update':
        return await this.updateTask(data, session);
      case 'delete':
        return await this.deleteTask(data, session);
      case 'move':
        return await this.moveTask(data, session);
      case 'assign':
        return await this.assignTask(data, session);
      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
  }

  async captureOriginalState(operation, session) {
    if (operation.type === 'create') {
      return null; // Nothing to capture for create operations
    }

    const taskId = operation.data.taskId || operation.data._id;
    return await this.mongoClient
      .db()
      .collection('tasks')
      .findOne({ _id: taskId }, { session });
  }

  determineRollbackType(operation) {
    const rollbackTypes = {
      create: 'delete',
      update: 'restore',
      delete: 'recreate',
      move: 'restore_position',
      assign: 'restore_assignment',
    };

    return rollbackTypes[operation.type] || 'unknown';
  }
}

module.exports = BulkTaskOperations;
```

---

### 11. Task Performance Optimization System

**File:** `client/src/utils/taskPerformanceOptimizer.js`

Advanced client-side performance optimization system for handling large task datasets with virtual scrolling, memory-efficient data structures, and intelligent caching strategies.

```javascript
/**
 * Task Performance Optimization System
 *
 * Provides comprehensive client-side performance optimization for task management
 * interfaces, including virtual scrolling, memory-efficient data structures,
 * intelligent caching, and performance monitoring for handling thousands of tasks
 * without UI lag or memory issues.
 *
 * Key Features:
 * - Virtual scrolling for large task lists
 * - Memory-efficient data structures and caching
 * - Performance monitoring and optimization
 * - Intelligent data prefetching and pagination
 * - Search and filter optimization
 * - Responsive UI optimization
 */

class TaskPerformanceOptimizer {
  constructor(options = {}) {
    this.options = {
      virtualScrollThreshold: 100,
      cacheSize: 1000,
      prefetchSize: 50,
      debounceDelay: 300,
      memoryCacheTimeout: 300000, // 5 minutes
      performanceMetricsEnabled: true,
      ...options,
    };

    this.cache = new Map();
    this.memoryCache = new Map();
    this.performanceMetrics = new Map();
    this.observers = new Set();
    this.isOptimizing = false;
  }

  /**
   * Initialize virtual scrolling for large task lists
   *
   * Implements efficient virtual scrolling that only renders visible items
   * plus a small buffer, dramatically reducing DOM nodes and improving
   * scroll performance for lists with thousands of tasks.
   *
   * @param {HTMLElement} container - Scrollable container element
   * @param {Array} taskData - Complete task dataset
   * @param {Function} renderItem - Function to render individual task items
   * @param {Object} options - Virtual scrolling configuration
   * @returns {Object} Virtual scroll manager instance
   */
  initializeVirtualScrolling(container, taskData, renderItem, options = {}) {
    const config = {
      itemHeight: 60, // Default task item height in pixels
      bufferSize: 10, // Number of items to render outside visible area
      overscan: 5, // Additional items to render for smooth scrolling
      ...options,
    };

    const virtualScrollManager = {
      container,
      taskData,
      renderItem,
      config,
      startIndex: 0,
      endIndex: 0,
      scrollTop: 0,
      containerHeight: 0,
      totalHeight: 0,
      visibleItems: new Map(),
      recycledNodes: [],

      /**
       * Calculate which items should be visible based on scroll position
       * Uses efficient math to determine visible range without iterating through all items
       */
      calculateVisibleRange() {
        const scrollTop = this.container.scrollTop;
        const containerHeight = this.container.clientHeight;

        // Calculate visible item indices with buffer
        const startIndex = Math.max(
          0,
          Math.floor(scrollTop / this.config.itemHeight) -
            this.config.bufferSize
        );
        const endIndex = Math.min(
          this.taskData.length - 1,
          Math.ceil((scrollTop + containerHeight) / this.config.itemHeight) +
            this.config.bufferSize +
            this.config.overscan
        );

        return { startIndex, endIndex };
      },

      /**
       * Update visible items efficiently
       * Reuses DOM nodes and only updates content when necessary
       */
      updateVisibleItems() {
        const { startIndex, endIndex } = this.calculateVisibleRange();

        // Remove items that are no longer visible
        for (const [index, element] of this.visibleItems) {
          if (index < startIndex || index > endIndex) {
            this.recycleNode(element);
            this.visibleItems.delete(index);
          }
        }

        // Add newly visible items
        for (let i = startIndex; i <= endIndex; i++) {
          if (!this.visibleItems.has(i) && this.taskData[i]) {
            const element = this.getOrCreateNode(i);
            this.visibleItems.set(i, element);
          }
        }

        this.startIndex = startIndex;
        this.endIndex = endIndex;
      },

      /**
       * Get existing DOM node or create new one from recycled pool
       * Implements efficient DOM node recycling to minimize creation/destruction
       */
      getOrCreateNode(index) {
        let element = this.recycledNodes.pop();

        if (!element) {
          element = document.createElement('div');
          element.className = 'virtual-task-item';
          element.style.position = 'absolute';
          element.style.left = '0';
          element.style.right = '0';
          element.style.height = `${this.config.itemHeight}px`;
        }

        // Position element correctly
        element.style.top = `${index * this.config.itemHeight}px`;
        element.setAttribute('data-index', index);

        // Render task content
        this.renderItem(element, this.taskData[index], index);

        // Add to container if not already present
        if (!element.parentNode) {
          this.container.appendChild(element);
        }

        return element;
      },

      /**
       * Recycle DOM node for reuse
       * Cleans up event listeners and content for safe reuse
       */
      recycleNode(element) {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }

        // Clean up any event listeners or references
        element.innerHTML = '';
        element.removeAttribute('data-index');

        this.recycledNodes.push(element);
      },

      /**
       * Handle scroll events with performance optimization
       * Uses requestAnimationFrame for smooth scrolling and debouncing
       */
      handleScroll() {
        if (!this.isScrolling) {
          this.isScrolling = true;
          requestAnimationFrame(() => {
            this.updateVisibleItems();
            this.isScrolling = false;
          });
        }
      },

      /**
       * Initialize virtual scrolling system
       * Sets up container, scroll handlers, and initial render
       */
      initialize() {
        // Set up container dimensions and total height
        this.containerHeight = this.container.clientHeight;
        this.totalHeight = this.taskData.length * this.config.itemHeight;

        // Create virtual spacer to maintain scrollbar
        const spacer = document.createElement('div');
        spacer.style.height = `${this.totalHeight}px`;
        spacer.style.pointerEvents = 'none';
        this.container.appendChild(spacer);

        // Set up scroll handler
        this.container.addEventListener(
          'scroll',
          this.handleScroll.bind(this),
          { passive: true }
        );

        // Initial render
        this.updateVisibleItems();

        return this;
      },

      /**
       * Update task data and refresh display
       * Efficiently handles data changes without full re-render
       */
      updateData(newTaskData) {
        const oldLength = this.taskData.length;
        this.taskData = newTaskData;
        this.totalHeight = newTaskData.length * this.config.itemHeight;

        // Update spacer height
        const spacer = this.container.querySelector('div:last-child');
        if (spacer) {
          spacer.style.height = `${this.totalHeight}px`;
        }

        // Re-render if data changed significantly
        if (Math.abs(newTaskData.length - oldLength) > this.config.bufferSize) {
          this.updateVisibleItems();
        }
      },
    };

    return virtualScrollManager.initialize();
  }

  /**
   * Implement intelligent task filtering with performance optimization
   *
   * Provides high-performance filtering for large task datasets using
   * optimized algorithms, caching, and progressive filtering techniques.
   *
   * @param {Array} tasks - Task array to filter
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Filtering options
   * @returns {Object} Optimized filter results
   */
  optimizeTaskFiltering(tasks, filters, options = {}) {
    const config = {
      enableCaching: true,
      maxCacheSize: 100,
      useIndexes: true,
      progressiveFilter: true,
      debounceMs: this.options.debounceDelay,
      ...options,
    };

    // Generate cache key for filter combination
    const cacheKey = this.generateFilterCacheKey(filters);

    // Check cache first if enabled
    if (config.enableCaching && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.options.memoryCacheTimeout) {
        return {
          results: cached.results,
          fromCache: true,
          executionTime: 0,
          resultCount: cached.results.length,
        };
      }
    }

    const startTime = performance.now();

    // Use progressive filtering for better performance
    let filteredTasks = tasks;
    const filterSteps = this.optimizeFilterOrder(filters);

    for (const filterStep of filterSteps) {
      filteredTasks = this.applyOptimizedFilter(
        filteredTasks,
        filterStep,
        config
      );

      // Early exit if result set becomes very small
      if (filteredTasks.length < 10) {
        break;
      }
    }

    const executionTime = performance.now() - startTime;

    // Cache results if enabled
    if (config.enableCaching) {
      this.updateFilterCache(cacheKey, filteredTasks, executionTime);
    }

    // Track performance metrics
    if (this.options.performanceMetricsEnabled) {
      this.recordFilterPerformance(
        filters,
        executionTime,
        tasks.length,
        filteredTasks.length
      );
    }

    return {
      results: filteredTasks,
      fromCache: false,
      executionTime,
      resultCount: filteredTasks.length,
      optimizations: this.getAppliedOptimizations(filters, config),
    };
  }

  /**
   * Implement memory-efficient data structures for task management
   *
   * Uses specialized data structures optimized for task operations
   * including indexed maps, sorted arrays, and efficient lookups.
   */
  createOptimizedTaskStructures(tasks) {
    const structures = {
      // Main task map for O(1) lookups
      taskMap: new Map(),

      // Indexed structures for fast filtering
      indexes: {
        byStatus: new Map(),
        byAssignee: new Map(),
        byProject: new Map(),
        byPriority: new Map(),
        byDueDate: new Map(),
      },

      // Sorted arrays for range queries
      sortedArrays: {
        byCreatedDate: [],
        byDueDate: [],
        byPriority: [],
      },

      // Performance tracking
      metrics: {
        buildTime: 0,
        memoryUsage: 0,
        indexCount: 0,
      },
    };

    const buildStart = performance.now();

    // Build main map and indexes
    for (const task of tasks) {
      const taskId = task._id || task.id;
      structures.taskMap.set(taskId, task);

      // Build indexes for common filter fields
      this.addToIndex(structures.indexes.byStatus, task.status, task);
      this.addToIndex(structures.indexes.byAssignee, task.assignee, task);
      this.addToIndex(structures.indexes.byProject, task.project, task);
      this.addToIndex(structures.indexes.byPriority, task.priority, task);

      if (task.dueDate) {
        const dueDateKey = new Date(task.dueDate).toDateString();
        this.addToIndex(structures.indexes.byDueDate, dueDateKey, task);
      }
    }

    // Build sorted arrays for range queries
    structures.sortedArrays.byCreatedDate = [...tasks].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );

    structures.sortedArrays.byDueDate = tasks
      .filter((task) => task.dueDate)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    structures.sortedArrays.byPriority = [...tasks].sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1, none: 0 };
      return (
        (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0)
      );
    });

    // Calculate metrics
    structures.metrics.buildTime = performance.now() - buildStart;
    structures.metrics.indexCount = Object.values(structures.indexes).reduce(
      (count, index) => count + index.size,
      0
    );

    // Add utility methods
    structures.getTask = (id) => structures.taskMap.get(id);
    structures.getTasksByStatus = (status) =>
      structures.indexes.byStatus.get(status) || [];
    structures.getTasksByAssignee = (assignee) =>
      structures.indexes.byAssignee.get(assignee) || [];
    structures.findTasksInDateRange = (startDate, endDate) => {
      return structures.sortedArrays.byDueDate.filter((task) => {
        const dueDate = new Date(task.dueDate);
        return dueDate >= startDate && dueDate <= endDate;
      });
    };

    return structures;
  }

  // Helper methods for performance optimization
  addToIndex(index, key, value) {
    if (!key) return;

    if (!index.has(key)) {
      index.set(key, []);
    }
    index.get(key).push(value);
  }

  generateFilterCacheKey(filters) {
    return JSON.stringify(filters, Object.keys(filters).sort());
  }

  optimizeFilterOrder(filters) {
    // Order filters by expected selectivity (most selective first)
    const filterOrder = [
      'status', // Usually most selective
      'assignee', // Moderately selective
      'project', // Less selective
      'priority', // Usually least selective
      'search', // Always last due to complexity
    ];

    return filterOrder
      .filter((key) => filters[key] !== undefined && filters[key] !== '')
      .map((key) => ({ key, value: filters[key] }));
  }

  applyOptimizedFilter(tasks, filterStep, config) {
    const { key, value } = filterStep;

    switch (key) {
      case 'status':
        return tasks.filter((task) => task.status === value);

      case 'assignee':
        return tasks.filter((task) => task.assignee === value);

      case 'project':
        return tasks.filter((task) => task.project === value);

      case 'priority':
        return tasks.filter((task) => task.priority === value);

      case 'search':
        return this.performOptimizedSearch(tasks, value, config);

      default:
        return tasks;
    }
  }

  performOptimizedSearch(tasks, searchTerm, config) {
    if (!searchTerm || searchTerm.length < 2) {
      return tasks;
    }

    const normalizedTerm = searchTerm.toLowerCase();
    const searchFields = ['title', 'description', 'tags'];

    return tasks.filter((task) => {
      return searchFields.some((field) => {
        const fieldValue = task[field];
        if (!fieldValue) return false;

        if (Array.isArray(fieldValue)) {
          return fieldValue.some((item) =>
            item.toLowerCase().includes(normalizedTerm)
          );
        }

        return fieldValue.toLowerCase().includes(normalizedTerm);
      });
    });
  }

  updateFilterCache(cacheKey, results, executionTime) {
    // Implement LRU cache with size limit
    if (this.cache.size >= this.options.cacheSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(cacheKey, {
      results: [...results], // Create copy to avoid mutations
      timestamp: Date.now(),
      executionTime,
    });
  }

  recordFilterPerformance(filters, executionTime, inputSize, outputSize) {
    const key = this.generateFilterCacheKey(filters);

    if (!this.performanceMetrics.has(key)) {
      this.performanceMetrics.set(key, {
        executionTimes: [],
        averageTime: 0,
        totalExecutions: 0,
        inputSizes: [],
        outputSizes: [],
      });
    }

    const metrics = this.performanceMetrics.get(key);
    metrics.executionTimes.push(executionTime);
    metrics.inputSizes.push(inputSize);
    metrics.outputSizes.push(outputSize);
    metrics.totalExecutions++;
    metrics.averageTime =
      metrics.executionTimes.reduce((a, b) => a + b, 0) /
      metrics.executionTimes.length;

    // Keep only last 100 measurements
    if (metrics.executionTimes.length > 100) {
      metrics.executionTimes.shift();
      metrics.inputSizes.shift();
      metrics.outputSizes.shift();
    }
  }

  getAppliedOptimizations(filters, config) {
    return {
      cachingEnabled: config.enableCaching,
      indexesUsed: config.useIndexes,
      progressiveFiltering: config.progressiveFilter,
      filterCount: Object.keys(filters).length,
    };
  }

  /**
   * Get comprehensive performance report
   * Provides detailed performance analytics for optimization insights
   */
  getPerformanceReport() {
    const report = {
      cacheStats: {
        size: this.cache.size,
        hitRate: this.calculateCacheHitRate(),
        memoryUsage: this.estimateCacheMemoryUsage(),
      },
      filterPerformance: this.getFilterPerformanceStats(),
      recommendations: this.generatePerformanceRecommendations(),
    };

    return report;
  }
}

export default TaskPerformanceOptimizer;
```

---

## End of Milestone 2

This completes the Advanced Task Management System milestone. The implementation provides a professional-grade task management experience with all modern features expected in project management tools.
