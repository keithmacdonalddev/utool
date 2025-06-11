// taskSlice.js - Enhanced Redux Toolkit slice for advanced task management
//
// KEY CONCEPTS:
// 1. Redux Toolkit: Uses modern Redux patterns with createSlice and createAsyncThunk
// 2. Thunks: Handles async operations like API calls
// 3. Immutable State Management: Updates state following immutability principles
// 4. Action Creators: Automatically generated from the slice definition
// 5. Reducers: Handle state changes based on actions
// 6. State Normalization: Organizes related data efficiently
// 7. Advanced Features: Subtasks, dependencies, time tracking, progress management

import {
  createSlice,
  createAsyncThunk,
  createSelector,
} from '@reduxjs/toolkit';
import api from '../../utils/api';
import {
  hasCollectionChanged,
  deepCompareObjects,
} from '../../utils/objectUtils';
// Import actions from guestSandboxSlice
import {
  addItem as addGuestItem,
  updateItem as updateGuestItem,
  deleteItem as deleteGuestItem,
  setItems as setGuestItems,
} from '../guestSandbox/guestSandboxSlice';

// Default cache timeout (5 minutes in milliseconds)
const CACHE_TIMEOUT = 5 * 60 * 1000;

/**
 * Enhanced initial state for advanced task management
 */
const initialState = {
  // Core task data
  tasks: [],
  currentTask: null,
  currentProjectId: null,

  // Hierarchical data
  subtasks: {}, // Nested subtasks by parent task ID
  taskDependencies: {}, // Dependencies mapping

  // Time tracking
  activeTimeEntries: {}, // Active time tracking sessions
  timeEntries: {}, // Time entries by task ID

  // UI state
  isError: false,
  isSuccess: false,
  isLoading: false,
  message: '',

  // Advanced UI states
  draggedTask: null,
  selectedTasks: [],
  taskFilters: {
    status: 'all',
    assignee: 'all',
    priority: 'all',
    tags: [],
    search: '',
    hasSubtasks: false,
    isBlocked: false,
    isOverdue: false,
  },

  // View states
  viewMode: 'list', // 'list', 'board', 'calendar', 'gantt'
  boardColumns: [
    { id: 'backlog', name: 'Backlog', color: '#6B7280', order: 0 },
    { id: 'todo', name: 'To Do', color: '#3B82F6', order: 1 },
    { id: 'in-progress', name: 'In Progress', color: '#F59E0B', order: 2 },
    { id: 'review', name: 'Review', color: '#8B5CF6', order: 3 },
    { id: 'done', name: 'Done', color: '#10B981', order: 4 },
  ],

  // Cache management
  lastFetched: null,
  tasksByProject: {},
  projectTasksTimestamps: {},
  backgroundRefreshingRecent: false,

  // Analytics
  projectAnalytics: null,
  taskMetrics: {},

  // Advanced features state
  bulkOperations: {
    isProcessing: false,
    selectedCount: 0,
    results: null,
  },

  // Recurring tasks
  recurringTasks: {},

  // Custom fields
  customFields: {},

  // Progress tracking
  progressUpdating: {},
};

// ===== EXISTING THUNKS (ENHANCED) =====

export const createTask = createAsyncThunk(
  'tasks/create',
  async (taskData, thunkAPI) => {
    const { getState, dispatch } = thunkAPI;
    const { auth } = getState();
    const {
      projectId,
      title,
      description,
      status,
      priority,
      dueDate,
      tags,
      parentTask,
    } = taskData;

    if (auth.user && auth.isGuest) {
      const guestTaskData = {
        title,
        projectId,
        description,
        status,
        priority,
        dueDate,
        tags,
        parentTask,
      };
      dispatch(
        addGuestItem({ entityType: 'tasks', itemData: { data: guestTaskData } })
      );
      return {
        ...guestTaskData,
        _isGuestCreation: true,
        id: 'guest-' + Date.now(),
      };
    } else {
      try {
        if (!projectId) {
          return thunkAPI.rejectWithValue(
            'Project ID is required for task creation'
          );
        }

        const endpoint = parentTask
          ? `/projects/${projectId}/tasks/${parentTask}/subtasks`
          : `/projects/${projectId}/tasks`;

        const response = await api.post(endpoint, {
          title,
          description,
          status,
          priority,
          dueDate,
          tags,
        });
        return response.data.data;
      } catch (error) {
        const message =
          (error.response &&
            error.response.data &&
            error.response.data.message) ||
          error.message ||
          error.toString();
        return thunkAPI.rejectWithValue(message);
      }
    }
  }
);

export const getTasksForProject = createAsyncThunk(
  'tasks/getForProject',
  async (payload, thunkAPI) => {
    const { getState, dispatch } = thunkAPI;
    const { auth } = getState();

    const projectId = typeof payload === 'string' ? payload : payload.projectId;
    const options = typeof payload === 'object' ? payload : {};
    const { forceRefresh = false, cacheTimeout = CACHE_TIMEOUT } = options;

    if (auth.user && auth.isGuest) {
      const guestTasksForProject = getState().guestSandbox.tasks.filter(
        (task) => task.data.projectId === projectId
      );
      return {
        tasks: guestTasksForProject.map((gt) => ({
          ...gt.data,
          id: gt.id,
          _id: gt.id,
        })),
        projectId,
        fromCache: true,
        isGuestFetch: true,
      };
    }

    if (!projectId) {
      return thunkAPI.rejectWithValue('Project ID is required to fetch tasks');
    }

    const state = getState().tasks;
    const now = Date.now();
    const projectTimestamp = state.projectTasksTimestamps[projectId];
    const cachedTasks = state.tasksByProject[projectId];
    const cacheIsValid =
      projectTimestamp &&
      now - projectTimestamp < cacheTimeout &&
      cachedTasks &&
      cachedTasks.length > 0;

    if (cacheIsValid && !forceRefresh) {
      return {
        tasks: cachedTasks,
        projectId,
        fromCache: true,
      };
    }

    try {
      const response = await api.get(`/projects/${projectId}/tasks`);
      return {
        tasks: response.data.data,
        projectId,
        fromCache: false,
      };
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// ===== NEW ADVANCED THUNKS =====

/**
 * Create subtask under a parent task
 */
export const createSubtask = createAsyncThunk(
  'tasks/createSubtask',
  async ({ parentTaskId, subtaskData }, thunkAPI) => {
    try {
      const response = await api.post(
        `/projects/tasks/${parentTaskId}/subtasks`,
        subtaskData
      );
      return {
        subtask: response.data.data,
        parentTaskId,
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

/**
 * Get subtasks for a parent task
 */
export const getSubtasks = createAsyncThunk(
  'tasks/getSubtasks',
  async (parentTaskId, thunkAPI) => {
    try {
      const response = await api.get(
        `/projects/tasks/${parentTaskId}/subtasks`
      );
      return {
        subtasks: response.data.data,
        parentTaskId,
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

/**
 * Add task dependency
 */
export const addTaskDependency = createAsyncThunk(
  'tasks/addDependency',
  async ({ taskId, dependsOnTaskId }, thunkAPI) => {
    try {
      const response = await api.post(
        `/projects/tasks/${taskId}/dependencies`,
        {
          dependsOnTaskId,
        }
      );
      return {
        taskId,
        dependsOnTaskId,
        data: response.data.data,
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

/**
 * Remove task dependency
 */
export const removeTaskDependency = createAsyncThunk(
  'tasks/removeDependency',
  async ({ taskId, dependencyId }, thunkAPI) => {
    try {
      await api.delete(
        `/projects/tasks/${taskId}/dependencies/${dependencyId}`
      );
      return { taskId, dependencyId };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

/**
 * Start time tracking for a task
 */
export const startTimeTracking = createAsyncThunk(
  'tasks/startTimeTracking',
  async ({ taskId, description }, thunkAPI) => {
    try {
      const response = await api.post(`/projects/tasks/${taskId}/time/start`, {
        description,
      });
      return {
        taskId,
        timeEntry: response.data.data,
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

/**
 * Stop time tracking for a task
 */
export const stopTimeTracking = createAsyncThunk(
  'tasks/stopTimeTracking',
  async ({ taskId, description }, thunkAPI) => {
    try {
      const response = await api.put(`/projects/tasks/${taskId}/time/stop`, {
        description,
      });
      return {
        taskId,
        timeEntry: response.data.data,
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

/**
 * Get time entries for a task
 */
export const getTimeEntries = createAsyncThunk(
  'tasks/getTimeEntries',
  async (taskId, thunkAPI) => {
    try {
      const response = await api.get(`/projects/tasks/${taskId}/time`);
      return {
        taskId,
        data: response.data.data,
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

/**
 * Update task progress
 */
export const updateTaskProgress = createAsyncThunk(
  'tasks/updateProgress',
  async ({ taskId, percentage, automatic }, thunkAPI) => {
    try {
      const response = await api.put(`/projects/tasks/${taskId}/progress`, {
        percentage,
        automatic,
      });
      return {
        taskId,
        progress: response.data.data.progress,
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

/**
 * Reorder tasks in a project
 */
export const reorderTasks = createAsyncThunk(
  'tasks/reorder',
  async ({ projectId, taskOrders }, thunkAPI) => {
    try {
      await api.put(`/projects/${projectId}/tasks/reorder`, { taskOrders });
      return { projectId, taskOrders };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

/**
 * Get task analytics for a project
 */
export const getTaskAnalytics = createAsyncThunk(
  'tasks/getAnalytics',
  async (projectId, thunkAPI) => {
    try {
      const response = await api.get(`/projects/${projectId}/tasks/analytics`);
      return {
        projectId,
        analytics: response.data.data,
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

/**
 * Update task (comprehensive update)
 */
export const updateTask = createAsyncThunk(
  'tasks/update',
  async ({ taskId, updates }, thunkAPI) => {
    try {
      const response = await api.put(`/projects/tasks/${taskId}`, updates);
      return response.data.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

/**
 * Delete task
 */
export const deleteTask = createAsyncThunk(
  'tasks/delete',
  async (taskId, thunkAPI) => {
    try {
      await api.delete(`/projects/tasks/${taskId}`);
      return taskId;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

/**
 * Bulk operations on multiple tasks
 */
export const bulkUpdateTasks = createAsyncThunk(
  'tasks/bulkUpdate',
  async ({ taskIds, updates }, thunkAPI) => {
    try {
      const response = await api.put('/projects/tasks/bulk', {
        taskIds,
        updates,
      });
      return response.data.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

/**
 * Get task by ID with full details
 */
export const getTaskById = createAsyncThunk(
  'tasks/getById',
  async (taskId, thunkAPI) => {
    try {
      const response = await api.get(`/projects/tasks/${taskId}`);
      return response.data.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

/**
 * Get recent tasks across all projects
 */
export const getRecentTasks = createAsyncThunk(
  'tasks/getRecent',
  async (payload = {}, thunkAPI) => {
    const { getState } = thunkAPI;
    const { auth } = getState();

    const {
      limit = 10,
      forceRefresh = false,
      cacheTimeout = CACHE_TIMEOUT,
    } = payload;

    // Handle guest users
    if (auth.user && auth.isGuest) {
      const guestTasks = getState().guestSandbox.tasks || [];
      return {
        tasks: guestTasks
          .map((gt) => ({
            ...gt.data,
            id: gt.id,
            _id: gt.id,
            createdAt: gt.createdAt,
            updatedAt: gt.updatedAt,
          }))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, limit),
        fromCache: true,
        isGuestFetch: true,
      };
    }

    try {
      const response = await api.get('/tasks/recent', {
        params: { limit },
      });
      return {
        tasks: response.data.data || response.data.tasks || [],
        fromCache: false,
        lastFetched: Date.now(),
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

/**
 * Update task status (enhanced for drag & drop)
 */
export const updateTaskStatus = createAsyncThunk(
  'tasks/updateStatus',
  async ({ taskId, status, order }, thunkAPI) => {
    try {
      const updateData = { status };
      if (order !== undefined) {
        updateData.order = order;
      }

      const response = await api.put(`/projects/tasks/${taskId}`, updateData);
      return response.data.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

// ===== ENHANCED SLICE =====
const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    // UI state management
    setViewMode: (state, action) => {
      state.viewMode = action.payload;
    },

    setTaskView: (state, action) => {
      state.viewMode = action.payload;
    },

    setTaskFilters: (state, action) => {
      state.taskFilters = { ...state.taskFilters, ...action.payload };
    },

    clearTaskFilters: (state) => {
      state.taskFilters = initialState.taskFilters;
    },

    setSelectedTasks: (state, action) => {
      state.selectedTasks = action.payload;
    },

    toggleTaskSelection: (state, action) => {
      const taskId = action.payload;
      const index = state.selectedTasks.indexOf(taskId);
      if (index > -1) {
        state.selectedTasks.splice(index, 1);
      } else {
        state.selectedTasks.push(taskId);
      }
    },

    clearTaskSelection: (state) => {
      state.selectedTasks = [];
    },

    setDraggedTask: (state, action) => {
      state.draggedTask = action.payload;
    },

    clearDraggedTask: (state) => {
      state.draggedTask = null;
    },

    // Current task management
    setCurrentTask: (state, action) => {
      state.currentTask = action.payload;
    },

    clearCurrentTask: (state) => {
      state.currentTask = null;
    },

    // Project context
    setCurrentProjectId: (state, action) => {
      state.currentProjectId = action.payload;
    },

    // Real-time updates
    taskUpdated: (state, action) => {
      const updatedTask = action.payload;
      const index = state.tasks.findIndex(
        (task) => task._id === updatedTask._id
      );
      if (index !== -1) {
        state.tasks[index] = updatedTask;
      }

      // Update in cache
      if (
        state.currentProjectId &&
        state.tasksByProject[state.currentProjectId]
      ) {
        const cacheIndex = state.tasksByProject[
          state.currentProjectId
        ].findIndex((task) => task._id === updatedTask._id);
        if (cacheIndex !== -1) {
          state.tasksByProject[state.currentProjectId][cacheIndex] =
            updatedTask;
        }
      }
    },

    taskDeleted: (state, action) => {
      const taskId = action.payload;
      state.tasks = state.tasks.filter((task) => task._id !== taskId);

      // Remove from cache
      if (
        state.currentProjectId &&
        state.tasksByProject[state.currentProjectId]
      ) {
        state.tasksByProject[state.currentProjectId] = state.tasksByProject[
          state.currentProjectId
        ].filter((task) => task._id !== taskId);
      }

      // Remove from selected tasks
      state.selectedTasks = state.selectedTasks.filter((id) => id !== taskId);
    },

    // Error handling
    clearError: (state) => {
      state.isError = false;
      state.message = '';
    },

    clearSuccess: (state) => {
      state.isSuccess = false;
      state.message = '';
    },

    // Bulk operations
    setBulkSelection: (state, action) => {
      state.selectedTasks = action.payload;
      state.bulkOperations.selectedCount = action.payload.length;
    },

    clearBulkOperations: (state) => {
      state.bulkOperations = initialState.bulkOperations;
      state.selectedTasks = [];
    },

    // Board management
    setBoardColumns: (state, action) => {
      state.boardColumns = action.payload;
    },

    updateBoardColumn: (state, action) => {
      const { columnId, updates } = action.payload;
      const columnIndex = state.boardColumns.findIndex(
        (col) => col.id === columnId
      );
      if (columnIndex !== -1) {
        state.boardColumns[columnIndex] = {
          ...state.boardColumns[columnIndex],
          ...updates,
        };
      }
    },

    // Real-time dependency updates
    dependencyUpdated: (state, action) => {
      const { taskId, dependencies } = action.payload;
      state.taskDependencies[taskId] = dependencies;
    },

    // Subtask management
    subtaskUpdated: (state, action) => {
      const { parentTaskId, subtask } = action.payload;
      if (state.subtasks[parentTaskId]) {
        const index = state.subtasks[parentTaskId].findIndex(
          (st) => st._id === subtask._id
        );
        if (index !== -1) {
          state.subtasks[parentTaskId][index] = subtask;
        }
      }
    },

    // Progress tracking
    setProgressUpdating: (state, action) => {
      const { taskId, isUpdating } = action.payload;
      if (isUpdating) {
        state.progressUpdating[taskId] = true;
      } else {
        delete state.progressUpdating[taskId];
      }
    },
  },

  extraReducers: (builder) => {
    // ===== EXISTING TASK OPERATIONS =====

    // Create task
    builder
      .addCase(createTask.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;

        if (!action.payload._isGuestCreation) {
          state.tasks.unshift(action.payload);

          // Add to cache if current project
          if (
            state.currentProjectId &&
            state.tasksByProject[state.currentProjectId]
          ) {
            state.tasksByProject[state.currentProjectId].unshift(
              action.payload
            );
          }
        }

        state.message = 'Task created successfully';
      })
      .addCase(createTask.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      });

    // Get tasks for project
    builder
      .addCase(getTasksForProject.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
      })
      .addCase(getTasksForProject.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;

        const { tasks, projectId, fromCache } = action.payload;

        state.tasks = tasks;
        state.currentProjectId = projectId;

        // Update cache
        state.tasksByProject[projectId] = tasks;
        state.projectTasksTimestamps[projectId] = Date.now();

        if (!fromCache) {
          state.lastFetched = Date.now();
        }
      })
      .addCase(getTasksForProject.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      });

    // ===== SUBTASK OPERATIONS =====

    builder
      .addCase(createSubtask.fulfilled, (state, action) => {
        const { subtask, parentTaskId } = action.payload;

        // Add subtask to tasks list
        state.tasks.push(subtask);

        // Update subtasks mapping
        if (!state.subtasks[parentTaskId]) {
          state.subtasks[parentTaskId] = [];
        }
        state.subtasks[parentTaskId].push(subtask);

        state.message = 'Subtask created successfully';
      })
      .addCase(createSubtask.rejected, (state, action) => {
        state.isError = true;
        state.message = action.payload;
      });

    builder.addCase(getSubtasks.fulfilled, (state, action) => {
      const { subtasks, parentTaskId } = action.payload;
      state.subtasks[parentTaskId] = subtasks;
    });

    // ===== DEPENDENCY OPERATIONS =====

    builder
      .addCase(addTaskDependency.fulfilled, (state, action) => {
        const { taskId, dependsOnTaskId } = action.payload;

        if (!state.taskDependencies[taskId]) {
          state.taskDependencies[taskId] = { blockedBy: [], blocks: [] };
        }

        if (
          !state.taskDependencies[taskId].blockedBy.includes(dependsOnTaskId)
        ) {
          state.taskDependencies[taskId].blockedBy.push(dependsOnTaskId);
        }

        state.message = 'Task dependency added';
      })
      .addCase(addTaskDependency.rejected, (state, action) => {
        state.isError = true;
        state.message = action.payload;
      });

    builder.addCase(removeTaskDependency.fulfilled, (state, action) => {
      const { taskId, dependencyId } = action.payload;

      if (state.taskDependencies[taskId]) {
        state.taskDependencies[taskId].blockedBy = state.taskDependencies[
          taskId
        ].blockedBy.filter((id) => id !== dependencyId);
      }

      state.message = 'Task dependency removed';
    });

    // ===== TIME TRACKING OPERATIONS =====

    builder
      .addCase(startTimeTracking.fulfilled, (state, action) => {
        const { taskId, timeEntry } = action.payload;
        state.activeTimeEntries[taskId] = timeEntry;
        state.message = 'Time tracking started';
      })
      .addCase(startTimeTracking.rejected, (state, action) => {
        state.isError = true;
        state.message = action.payload;
      });

    builder
      .addCase(stopTimeTracking.fulfilled, (state, action) => {
        const { taskId, timeEntry } = action.payload;

        // Remove from active entries
        delete state.activeTimeEntries[taskId];

        // Add to time entries
        if (!state.timeEntries[taskId]) {
          state.timeEntries[taskId] = [];
        }
        state.timeEntries[taskId].push(timeEntry);

        state.message = 'Time tracking stopped';
      })
      .addCase(stopTimeTracking.rejected, (state, action) => {
        state.isError = true;
        state.message = action.payload;
      });

    builder.addCase(getTimeEntries.fulfilled, (state, action) => {
      const { taskId, data } = action.payload;
      state.timeEntries[taskId] = data.timeEntries;
    });

    // ===== PROGRESS OPERATIONS =====

    builder.addCase(updateTaskProgress.fulfilled, (state, action) => {
      const { taskId, progress } = action.payload;

      // Update task in tasks array
      const taskIndex = state.tasks.findIndex((task) => task._id === taskId);
      if (taskIndex !== -1) {
        state.tasks[taskIndex].progress = progress;
      }

      state.message = 'Task progress updated';
    });

    // ===== REORDERING OPERATIONS =====

    builder.addCase(reorderTasks.fulfilled, (state, action) => {
      const { taskOrders } = action.payload;

      // Update order for each task
      taskOrders.forEach(({ taskId, order }) => {
        const taskIndex = state.tasks.findIndex((task) => task._id === taskId);
        if (taskIndex !== -1) {
          state.tasks[taskIndex].order = order;
        }
      });

      // Re-sort tasks by order
      state.tasks.sort((a, b) => (a.order || 0) - (b.order || 0));

      state.message = 'Tasks reordered successfully';
    });

    // ===== ANALYTICS OPERATIONS =====

    builder.addCase(getTaskAnalytics.fulfilled, (state, action) => {
      const { projectId, analytics } = action.payload;
      state.projectAnalytics = analytics;
    });

    // ===== STATUS UPDATE OPERATIONS =====

    builder.addCase(updateTaskStatus.fulfilled, (state, action) => {
      const updatedTask = action.payload;
      const taskIndex = state.tasks.findIndex(
        (task) => task._id === updatedTask._id
      );

      if (taskIndex !== -1) {
        state.tasks[taskIndex] = updatedTask;
      }

      state.message = 'Task status updated';
    });

    // ===== TASK UPDATE OPERATIONS =====

    builder
      .addCase(updateTask.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        state.isLoading = false;
        const updatedTask = action.payload;
        const taskIndex = state.tasks.findIndex(
          (task) => task._id === updatedTask._id
        );

        if (taskIndex !== -1) {
          state.tasks[taskIndex] = updatedTask;
        }

        // Update current task if it's the one being updated
        if (state.currentTask?._id === updatedTask._id) {
          state.currentTask = updatedTask;
        }

        state.message = 'Task updated successfully';
      })
      .addCase(updateTask.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      });

    // ===== TASK DELETE OPERATIONS =====

    builder
      .addCase(deleteTask.fulfilled, (state, action) => {
        const taskId = action.payload;

        // Remove from tasks array
        state.tasks = state.tasks.filter((task) => task._id !== taskId);

        // Remove from cache
        Object.keys(state.tasksByProject).forEach((projectId) => {
          state.tasksByProject[projectId] = state.tasksByProject[
            projectId
          ].filter((task) => task._id !== taskId);
        });

        // Remove from selected tasks
        state.selectedTasks = state.selectedTasks.filter((id) => id !== taskId);

        // Clear current task if it was deleted
        if (state.currentTask?._id === taskId) {
          state.currentTask = null;
        }

        // Remove from subtasks mapping
        delete state.subtasks[taskId];

        // Remove from dependencies
        delete state.taskDependencies[taskId];

        // Remove from time tracking
        delete state.activeTimeEntries[taskId];
        delete state.timeEntries[taskId];

        state.message = 'Task deleted successfully';
      })
      .addCase(deleteTask.rejected, (state, action) => {
        state.isError = true;
        state.message = action.payload;
      });

    // ===== BULK OPERATIONS =====

    builder
      .addCase(bulkUpdateTasks.pending, (state) => {
        state.bulkOperations.isProcessing = true;
      })
      .addCase(bulkUpdateTasks.fulfilled, (state, action) => {
        state.bulkOperations.isProcessing = false;
        const updatedTasks = action.payload;

        // Update each task in the array
        updatedTasks.forEach((updatedTask) => {
          const taskIndex = state.tasks.findIndex(
            (task) => task._id === updatedTask._id
          );
          if (taskIndex !== -1) {
            state.tasks[taskIndex] = updatedTask;
          }
        });

        state.bulkOperations.results = {
          success: true,
          updatedCount: updatedTasks.length,
        };

        state.message = `${updatedTasks.length} tasks updated successfully`;
      })
      .addCase(bulkUpdateTasks.rejected, (state, action) => {
        state.bulkOperations.isProcessing = false;
        state.bulkOperations.results = {
          success: false,
          error: action.payload,
        };
        state.isError = true;
        state.message = action.payload;
      });

    // ===== GET TASK BY ID =====

    builder.addCase(getTaskById.fulfilled, (state, action) => {
      const task = action.payload;

      // Update or add task to tasks array
      const taskIndex = state.tasks.findIndex((t) => t._id === task._id);
      if (taskIndex !== -1) {
        state.tasks[taskIndex] = task;
      } else {
        state.tasks.push(task);
      }

      // Set as current task
      state.currentTask = task;
    });

    // ===== RECENT TASKS OPERATIONS =====

    builder
      .addCase(getRecentTasks.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
      })
      .addCase(getRecentTasks.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;

        const { tasks, fromCache, lastFetched } = action.payload;

        // For recent tasks, we merge with existing tasks rather than replace
        // This prevents losing current project context
        tasks.forEach((task) => {
          const existingIndex = state.tasks.findIndex(
            (t) => t._id === task._id
          );
          if (existingIndex !== -1) {
            state.tasks[existingIndex] = task;
          } else {
            state.tasks.push(task);
          }
        });

        if (!fromCache && lastFetched) {
          state.lastFetched = lastFetched;
        }
      })
      .addCase(getRecentTasks.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      });
  },
});

// Export actions
export const {
  setViewMode,
  setTaskView,
  setTaskFilters,
  clearTaskFilters,
  setSelectedTasks,
  toggleTaskSelection,
  clearTaskSelection,
  setDraggedTask,
  clearDraggedTask,
  setCurrentTask,
  clearCurrentTask,
  setCurrentProjectId,
  taskUpdated,
  taskDeleted,
  clearError,
  clearSuccess,
  setBulkSelection,
  clearBulkOperations,
  setBoardColumns,
  updateBoardColumn,
  dependencyUpdated,
  subtaskUpdated,
  setProgressUpdating,
} = tasksSlice.actions;

// ===== SELECTORS =====

// Basic selectors
export const selectAllTasks = (state) => state.tasks.tasks;
export const selectCurrentTask = (state) => state.tasks.currentTask;
export const selectTasksLoading = (state) => state.tasks.isLoading;
export const selectTasksError = (state) => state.tasks.isError;
export const selectTasksMessage = (state) => state.tasks.message;

// View selectors
export const selectViewMode = (state) => state.tasks.viewMode;
export const selectTaskView = (state) => state.tasks.viewMode;
export const selectTaskFilters = (state) => state.tasks.taskFilters;
export const selectSelectedTasks = (state) => state.tasks.selectedTasks;
export const selectDraggedTask = (state) => state.tasks.draggedTask;

// Advanced selectors
export const selectSubtasks = (state) => state.tasks.subtasks;
export const selectTaskDependencies = (state) => state.tasks.taskDependencies;
export const selectActiveTimeEntries = (state) => state.tasks.activeTimeEntries;
export const selectTimeEntries = (state) => state.tasks.timeEntries;
export const selectProjectAnalytics = (state) => state.tasks.projectAnalytics;

// Computed selectors (memoized with createSelector)
export const selectFilteredTasks = createSelector(
  [
    (state) => state.tasks.tasks,
    (state) => state.tasks.taskFilters,
    (state) => state.tasks.subtasks,
    (state) => state.tasks.taskDependencies,
  ],
  (tasks, filters, subtasks, dependencies) => {
    return tasks.filter((task) => {
      // Status filter
      if (filters.status !== 'all' && task.status !== filters.status) {
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

      // Tags filter
      if (filters.tags.length > 0) {
        const taskTags = task.tags || [];
        const hasMatchingTag = filters.tags.some((tag) =>
          taskTags.includes(tag)
        );
        if (!hasMatchingTag) {
          return false;
        }
      }

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const titleMatch = task.title?.toLowerCase().includes(searchLower);
        const descMatch = task.description?.toLowerCase().includes(searchLower);
        if (!titleMatch && !descMatch) {
          return false;
        }
      }

      // Has subtasks filter
      if (filters.hasSubtasks) {
        const taskSubtasks = subtasks[task._id];
        if (!taskSubtasks || taskSubtasks.length === 0) {
          return false;
        }
      }

      // Is blocked filter
      if (filters.isBlocked) {
        const taskDeps = dependencies[task._id];
        if (!taskDeps || !taskDeps.blockedBy.length) {
          return false;
        }

        // Check if actually blocked (has uncompleted dependencies)
        const isBlocked = taskDeps.blockedBy.some((depId) => {
          const depTask = tasks.find((t) => t._id === depId);
          return depTask && depTask.status !== 'done';
        });

        if (!isBlocked) {
          return false;
        }
      }

      // Is overdue filter
      if (filters.isOverdue) {
        const now = new Date();
        const isOverdue =
          task.dueDate &&
          new Date(task.dueDate) < now &&
          task.status !== 'done';
        if (!isOverdue) {
          return false;
        }
      }

      return true;
    });
  }
);

export const selectTasksByStatus = createSelector(
  [selectFilteredTasks],
  (tasks) => {
    return tasks.reduce((acc, task) => {
      const status = task.status || 'todo';
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push(task);
      return acc;
    }, {});
  }
);

export const selectTaskMetrics = createSelector(
  [(state) => state.tasks.tasks],
  (tasks) => {
    return {
      total: tasks.length,
      completed: tasks.filter((t) => t.status === 'done').length,
      inProgress: tasks.filter((t) => t.status === 'in-progress').length,
      blocked: tasks.filter((t) => t.status === 'blocked').length,
      overdue: tasks.filter((t) => t.isOverdue).length,
    };
  }
);

// Additional advanced selectors
export const selectBulkOperations = (state) => state.tasks.bulkOperations;
export const selectBoardColumns = (state) => state.tasks.boardColumns;
export const selectProgressUpdating = (state) => state.tasks.progressUpdating;

export const selectTasksWithSubtasks = createSelector(
  [(state) => state.tasks.tasks, (state) => state.tasks.subtasks],
  (tasks, subtasks) => {
    return tasks.filter((task) => {
      const taskSubtasks = subtasks[task._id];
      return taskSubtasks && taskSubtasks.length > 0;
    });
  }
);

export const selectBlockedTasks = createSelector(
  [(state) => state.tasks.tasks, (state) => state.tasks.taskDependencies],
  (tasks, dependencies) => {
    return tasks.filter((task) => {
      const taskDeps = dependencies[task._id];
      if (!taskDeps || !taskDeps.blockedBy.length) return false;

      // Check if any dependencies are not completed
      return taskDeps.blockedBy.some((depId) => {
        const depTask = tasks.find((t) => t._id === depId);
        return depTask && depTask.status !== 'done';
      });
    });
  }
);

export const selectOverdueTasks = createSelector(
  [(state) => state.tasks.tasks],
  (tasks) => {
    const now = new Date();
    return tasks.filter((task) => {
      return (
        task.dueDate && new Date(task.dueDate) < now && task.status !== 'done'
      );
    });
  }
);

export const selectTasksByAssignee = createSelector(
  [selectFilteredTasks],
  (tasks) => {
    return tasks.reduce((acc, task) => {
      const assigneeId = task.assignee?._id || 'unassigned';
      const assigneeName = task.assignee?.name || 'Unassigned';

      if (!acc[assigneeId]) {
        acc[assigneeId] = {
          assignee: task.assignee || { name: 'Unassigned' },
          tasks: [],
        };
      }
      acc[assigneeId].tasks.push(task);
      return acc;
    }, {});
  }
);

export const selectTaskProgress = createSelector(
  [(state) => state.tasks.tasks],
  (tasks) => {
    if (tasks.length === 0) return 0;

    const completedTasks = tasks.filter((t) => t.status === 'done').length;
    return Math.round((completedTasks / tasks.length) * 100);
  }
);

export const selectTimeTrackingSummary = createSelector(
  [
    (state) => state.tasks.timeEntries,
    (state) => state.tasks.activeTimeEntries,
  ],
  (timeEntries, activeEntries) => {
    let totalTracked = 0;
    let activeCount = 0;

    // Sum all completed time entries
    Object.values(timeEntries).forEach((entries) => {
      entries.forEach((entry) => {
        totalTracked += entry.duration || 0;
      });
    });

    // Count active time tracking sessions
    activeCount = Object.keys(activeEntries).length;

    return {
      totalTrackedHours: Math.round((totalTracked / 3600) * 100) / 100, // Convert to hours
      activeTimeTrackingSessions: activeCount,
      totalSessions: Object.values(timeEntries).reduce(
        (sum, entries) => sum + entries.length,
        0
      ),
    };
  }
);

// Export reducer
export default tasksSlice.reducer;
