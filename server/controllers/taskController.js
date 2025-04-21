// taskController.js - Controller handling all task-related API endpoints
// This file implements the business logic for creating, reading, updating, and deleting tasks
//
// KEY CONCEPTS:
// 1. MVC Architecture: This controller separates business logic from models and views
// 2. REST API Design: Methods follow REST conventions (GET, POST, PUT, DELETE)
// 3. Express Middleware: Uses req/res objects passed through middleware chain
// 4. Mongoose Integration: Shows MongoDB/Mongoose patterns for CRUD operations
// 5. Error Handling: Demonstrates consistent error handling patterns
// 6. Authentication & Authorization: Checks user permissions before operations
// 7. Data Validation: Validates input before processing
// 8. Audit Logging: Records important operations for security tracking

// Import required models and utilities
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';
import ErrorResponse from '../utils/errorResponse.js'; // Add this import

/**
 * Get all tasks for the authenticated user
 *
 * EXPRESS CONTROLLER PATTERN:
 * - Function signature follows Express convention (req, res, next)
 * - Async/await pattern with try/catch for asynchronous operations
 * - Standardized JSON response format
 *
 * @desc    Get tasks for logged-in user
 * @route   GET /api/v1/tasks
 * @access  Private - requires authentication
 */
export const getTasks = async (req, res, next) => {
  // Log attempted action
  logger.verbose('Attempting to fetch tasks', {
    userId: req.user.id,
    req,
  });

  try {
    // Find tasks where the assignee is the logged-in user
    // req.user is attached by the 'protect' middleware from the auth middleware
    const tasks = await Task.find({ assignee: req.user.id })
      .populate('project', 'name status') // Populate project details (only name and status fields)
      .sort({
        createdAt: -1,
      }); // Sort by newest first for better UX

    // Log successful action
    logger.logAccess('tasks', null, req.user.id, {
      count: tasks.length,
      req,
    });

    // Return standardized response format with success flag and data
    res.status(200).json({
      success: true, // Indicates successful operation
      count: tasks.length, // Metadata useful for frontend pagination/display
      data: tasks, // Actual task objects
    });
  } catch (err) {
    // Log error
    logger.error('Failed to fetch tasks', {
      error: err,
      userId: req.user?.id,
      req,
    });

    // Return error with appropriate HTTP status code
    res
      .status(500)
      .json({ success: false, message: 'Server Error fetching tasks' });
  }
};

/**
 * Create a new task
 *
 * API SECURITY BEST PRACTICES:
 * - Data validation before processing
 * - Proper error messages that don't leak implementation details
 * - Authorization checks before database operations
 * - Error handling for all potential failure points
 * - Audit logging for security tracking
 *
 * @desc    Create new task
 * @route   POST /api/v1/tasks
 * @access  Private - requires authentication
 */
export const createTask = async (req, res, next) => {
  // Log attempted action
  logger.verbose('Attempting to create task', {
    userId: req.user.id,
    projectId: req.body.project,
    title: req.body.title,
    req,
  });

  try {
    // Add logged-in user as the assignee - ensures tasks are always assigned
    req.body.assignee = req.user.id;

    // Extract fields from req.body for validation and security
    // This is safer than passing the entire req.body to the database
    // SECURITY BEST PRACTICE: Never trust client input directly
    const {
      title,
      description,
      status,
      priority,
      dueDate,
      estimatedTime,
      project: projectId,
    } = req.body;

    // Validation: Check required fields
    // Return early with appropriate error messages for better UX
    if (!title || title.trim() === '') {
      logger.error('Task creation failed - missing title', {
        userId: req.user.id,
        req,
      });
      return res
        .status(400) // Bad Request status code
        .json({ success: false, message: 'Task title is required' });
    }

    // Validation: Ensure project ID is provided
    if (!projectId) {
      logger.error('Task creation failed - missing project ID', {
        userId: req.user.id,
        req,
      });
      return res
        .status(400)
        .json({ success: false, message: 'Project ID is required' });
    }

    // Validation: Check that project ID is valid MongoDB ObjectId format
    // This prevents database errors from invalid ID formats
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      logger.error('Task creation failed - invalid project ID format', {
        userId: req.user.id,
        projectId,
        req,
      });
      return res
        .status(400)
        .json({ success: false, message: 'Invalid project ID format' });
    }

    // Find the project to verify it exists and user has permission
    const project = await Project.findById(projectId);
    if (!project) {
      logger.error('Task creation failed - project not found', {
        userId: req.user.id,
        projectId,
        req,
      });
      return res.status(404).json({
        // Not Found status code
        success: false,
        message: `Project not found with id ${projectId}`,
      });
    }

    // Authorization check: Ensure user is a member of the project
    // This uses .some() to check if the user's ID is in the project members array
    const isMember = project.members.some(
      (memberId) => memberId.toString() === req.user.id
    );

    if (!isMember) {
      logger.error('Task creation failed - user not authorized', {
        userId: req.user.id,
        projectId,
        req,
      });
      return res.status(403).json({
        // Forbidden status code
        success: false,
        message: 'Not authorized to add tasks to this project',
      });
    }

    // Validation: Check that status is one of the allowed values
    const validStatuses = ['To Do', 'In Progress', 'In Review', 'Completed'];
    if (status && !validStatuses.includes(status)) {
      logger.error('Task creation failed - invalid status', {
        userId: req.user.id,
        status,
        req,
      });
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    // Validation: Check that priority is one of the allowed values
    const validPriorities = ['Low', 'Medium', 'High'];
    if (priority && !validPriorities.includes(priority)) {
      logger.error('Task creation failed - invalid priority', {
        userId: req.user.id,
        priority,
        req,
      });
      return res.status(400).json({
        success: false,
        message: `Invalid priority. Must be one of: ${validPriorities.join(
          ', '
        )}`,
      });
    }

    // Validation: Check that dueDate is a valid date if provided
    // The isNaN() check verifies the date is parseable
    if (dueDate && isNaN(new Date(dueDate).getTime())) {
      logger.error('Task creation failed - invalid due date format', {
        userId: req.user.id,
        dueDate,
        req,
      });
      return res.status(400).json({
        success: false,
        message: 'Invalid due date format',
      });
    }

    // Create task object with validated data
    // Uses spread operator with conditional properties for optional fields
    // JAVASCRIPT PATTERN: Conditional object property inclusion
    const taskData = {
      title,
      assignee: req.user.id,
      project: projectId,
      ...(description && { description }), // Only include if provided
      ...(status && { status }),
      ...(priority && { priority }),
      ...(dueDate && { dueDate }),
      ...(estimatedTime && { estimatedTime }),
    };

    // Save the task to the database
    // MONGOOSE PATTERN: Model.create() to create and save in one operation
    const task = await Task.create(taskData);

    // Log successful creation
    logger.logCreate('task', task._id, req.user.id, {
      task: {
        id: task._id,
        title: task.title,
        projectId: task.project,
      },
      req,
    });

    // Add audit log for task creation for tracking and accountability
    // This records who created what and when for security/auditing purposes
    // SECURITY PATTERN: Audit logging for tracking user actions
    const { auditLog } = await import('../middleware/auditLogMiddleware.js');
    await auditLog(req, 'task_create', 'success', {
      taskId: task._id,
      taskTitle: task.title,
      projectId: task.project,
    });

    // Return the created task with 201 Created status code
    // REST API PATTERN: Use 201 for resource creation
    res.status(201).json({ success: true, data: task });
  } catch (err) {
    // Log error
    logger.error('Failed to create task', {
      error: err,
      userId: req.user?.id,
      taskData: req.body,
      req,
    });

    // Log the failed attempt for auditing
    const { auditLog } = await import('../middleware/auditLogMiddleware.js');
    await auditLog(req, 'task_create', 'failed', {
      error: err.message,
      taskTitle: req.body.title,
      projectId: req.body.project,
    });

    // Handle Mongoose validation errors with specific messages
    // This provides more helpful feedback to the client
    // ERROR HANDLING PATTERN: Different responses for different error types
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((val) => val.message);
      return res
        .status(400)
        .json({ success: false, message: messages.join(', ') });
    }

    // Generic server error if not a validation error
    res
      .status(500)
      .json({ success: false, message: 'Server Error creating task' });
  }
};

/**
 * Get tasks that belong to a specific project
 *
 * MONGOOSE QUERY PATTERNS:
 * - find() for filtering documents
 * - populate() for joining related collections
 * - sort() for ordering results
 *
 * @desc    Get tasks for a specific project
 * @route   GET /api/v1/projects/:id/tasks
 * @access  Private - requires authentication and project membership
 */
export const getTasksForProject = async (req, res, next) => {
  logger.verbose('Attempting to retrieve tasks for project', {
    userId: req.user.id,
    projectId: req.params.projectId,
    req,
  });

  try {
    const tasks = await Task.find({ project: req.params.projectId })
      .sort({ createdAt: -1 })
      .populate('owner', 'name email');

    logger.info('Successfully retrieved tasks for project', {
      userId: req.user.id,
      projectId: req.params.projectId,
      tasksCount: tasks.length,
      req,
    });

    const { auditLog } = await import('../middleware/auditLogMiddleware.js');
    await auditLog(req, 'tasks_retrieve', 'success', {
      projectId: req.params.projectId,
      count: tasks.length,
    });

    res.status(200).json({ success: true, count: tasks.length, data: tasks });
  } catch (err) {
    logger.error('Failed to retrieve tasks for project', {
      error: err,
      userId: req.user.id,
      projectId: req.params.projectId,
      req,
    });

    const { auditLog } = await import('../middleware/auditLogMiddleware.js');
    await auditLog(req, 'tasks_retrieve', 'failed', {
      projectId: req.params.projectId,
      error: err.message,
    });

    return next(
      new ErrorResponse(`Error retrieving tasks: ${err.message}`, 500)
    );
  }
};

// --- Implementation of remaining operations ---

/**
 * Get a single task by ID
 *
 * @desc    Get single task
 * @route   GET /api/tasks/:id
 * @access  Private
 */
export const getTask = async (req, res, next) => {
  logger.verbose('Attempting to retrieve task', {
    userId: req.user.id,
    taskId: req.params.id,
    req,
  });

  try {
    const task = await Task.findById(req.params.id).populate(
      'owner',
      'name email'
    );

    if (!task) {
      logger.warn('Task not found', {
        userId: req.user.id,
        taskId: req.params.id,
        req,
      });
      return next(
        new ErrorResponse(`Task not found with id of ${req.params.id}`, 404)
      );
    }

    // Make sure user is task owner or has appropriate permissions
    if (task.owner.toString() !== req.user.id) {
      logger.warn('Unauthorized access attempt to task', {
        userId: req.user.id,
        taskId: req.params.id,
        taskOwnerId: task.owner.toString(),
        req,
      });
      return next(
        new ErrorResponse(
          `User ${req.user.id} is not authorized to access this task`,
          401
        )
      );
    }

    logger.info('Successfully retrieved task', {
      userId: req.user.id,
      taskId: req.params.id,
      req,
    });

    const { auditLog } = await import('../middleware/auditLogMiddleware.js');
    await auditLog(req, 'task_retrieve', 'success', {
      taskId: req.params.id,
    });

    res.status(200).json({ success: true, data: task });
  } catch (err) {
    logger.error('Failed to retrieve task', {
      error: err,
      userId: req.user.id,
      taskId: req.params.id,
      req,
    });

    const { auditLog } = await import('../middleware/auditLogMiddleware.js');
    await auditLog(req, 'task_retrieve', 'failed', {
      taskId: req.params.id,
      error: err.message,
    });

    return next(
      new ErrorResponse(`Error retrieving task: ${err.message}`, 500)
    );
  }
};

/**
 * Update an existing task
 *
 * @desc    Update task
 * @route   PUT /api/v1/tasks/:id
 * @access  Private - requires being the assignee or project owner
 */
export const updateTask = async (req, res, next) => {
  logger.verbose('Attempting to update task', {
    userId: req.user.id,
    taskId: req.params.id,
    req,
  });

  try {
    let task = await Task.findById(req.params.id);

    if (!task) {
      logger.warn('Task not found for update', {
        userId: req.user.id,
        taskId: req.params.id,
        req,
      });
      return next(
        new ErrorResponse(`Task not found with id of ${req.params.id}`, 404)
      );
    }

    // Make sure user is task owner or has appropriate permissions
    if (task.owner.toString() !== req.user.id) {
      logger.warn('Unauthorized attempt to update task', {
        userId: req.user.id,
        taskId: req.params.id,
        taskOwnerId: task.owner.toString(),
        req,
      });
      return next(
        new ErrorResponse(
          `User ${req.user.id} is not authorized to update this task`,
          401
        )
      );
    }

    const oldTask = { ...task._doc };
    task = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    logger.logUpdate('Task updated', {
      userId: req.user.id,
      taskId: req.params.id,
      oldData: oldTask,
      newData: task,
      req,
    });

    const { auditLog } = await import('../middleware/auditLogMiddleware.js');
    await auditLog(req, 'task_update', 'success', {
      taskId: req.params.id,
      changes: req.body,
      oldData: oldTask,
      newData: task,
    });

    res.status(200).json({ success: true, data: task });
  } catch (err) {
    logger.error('Failed to update task', {
      error: err,
      userId: req.user.id,
      taskId: req.params.id,
      req,
    });

    const { auditLog } = await import('../middleware/auditLogMiddleware.js');
    await auditLog(req, 'task_update', 'failed', {
      taskId: req.params.id,
      changes: req.body,
      error: err.message,
    });

    return next(new ErrorResponse(`Error updating task: ${err.message}`, 500));
  }
};

/**
 * Delete a task
 *
 * @desc    Delete task
 * @route   DELETE /api/v1/tasks/:id
 * @access  Private - requires being the assignee or project owner
 */
export const deleteTask = async (req, res, next) => {
  try {
    // Log the delete attempt for traceability
    logger.info(`Attempting to delete task with ID: ${req.params.id}`, {
      userId: req.user.id,
      action: 'delete_task',
      taskId: req.params.id,
    });

    // Find the task to delete
    const task = await Task.findById(req.params.id);

    // Log database operation result
    logger.logDbOperation('findById', 'Task', !!task, null, {
      taskId: req.params.id,
      userId: req.user.id,
    });

    // Check that task exists
    if (!task) {
      logger.warn(`Task not found for deletion: ${req.params.id}`, {
        userId: req.user.id,
      });

      return res.status(404).json({
        success: false,
        message: `Task not found with id of ${req.params.id}`,
        notificationType: 'error', // Used by frontend for toast notifications
      });
    }

    // Authorization check: Verify user is either the assignee or project owner
    if (task.assignee.toString() !== req.user.id) {
      // If not assignee, check if user is project owner
      const project = await Project.findById(task.project);

      logger.logDbOperation('findById', 'Project', !!project, null, {
        projectId: task.project,
        userId: req.user.id,
      });

      if (!project || project.owner.toString() !== req.user.id) {
        logger.warn(`Unauthorized task deletion attempt`, {
          userId: req.user.id,
          taskId: req.params.id,
          taskAssignee: task.assignee,
          projectId: task.project,
        });

        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this task',
          notificationType: 'error',
        });
      }
    }

    // Save task info for audit log before deletion
    // This preserves information about what was deleted
    const taskInfo = {
      id: task._id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      assignee: task.assignee,
      project: task.project,
      createdAt: task.createdAt,
    };

    // Delete the task from the database
    await task.deleteOne();

    // Log task deletion with enhanced logger
    logger.logDelete('task', taskInfo.id, req.user.id, {
      taskTitle: taskInfo.title,
      projectId: taskInfo.project,
      status: taskInfo.status,
      priority: taskInfo.priority,
      lifespanDays: Math.floor(
        (Date.now() - new Date(taskInfo.createdAt).getTime()) /
          (1000 * 60 * 60 * 24)
      ),
    });

    // Add audit log for task deletion
    const { auditLog } = await import('../middleware/auditLogMiddleware.js');
    await auditLog(req, 'task_delete', 'success', {
      taskId: taskInfo.id,
      taskTitle: taskInfo.title,
      projectId: taskInfo.project,
      taskInfo: taskInfo,
    });

    // Return success response with notification message for frontend
    res.status(200).json({
      success: true,
      data: {}, // Empty object as the resource was deleted
      message: `Task "${taskInfo.title}" deleted successfully`,
      notificationType: 'success', // Used by frontend for toast notifications
    });
  } catch (err) {
    // Log the error for debugging and monitoring
    logger.error('Failed to delete task', {
      error: err,
      taskId: req.params.id,
      userId: req.user.id,
    });

    // Add audit log for failed task deletion
    const { auditLog } = await import('../middleware/auditLogMiddleware.js');
    await auditLog(req, 'task_delete', 'failed', {
      taskId: req.params.id,
      error: err.message,
    });

    // Handle invalid MongoDB ObjectId format
    if (err.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: `Task not found with id of ${req.params.id}`,
        notificationType: 'error',
      });
    }

    // Generic server error
    res.status(500).json({
      success: false,
      message: 'Server Error deleting task',
      notificationType: 'error',
    });
  }
};

/**
 * Admin endpoint to get tasks for a specific user
 *
 * @desc    Get all tasks for a specific user (Admin only)
 * @route   GET /api/v1/admin/users/:userId/tasks
 * @access  Private/Admin - requires admin role
 */
export const getUserTasks = async (req, res, next) => {
  try {
    const targetUserId = req.params.userId;

    // Verify the target user exists
    const targetUserExists = await User.findById(targetUserId);
    if (!targetUserExists) {
      return res.status(404).json({
        success: false,
        message: `User not found with id ${targetUserId}`,
      });
    }

    // Find tasks assigned to the target user
    const tasks = await Task.find({ assignee: targetUserId })
      .populate('project', 'name') // Include project name
      .sort({ createdAt: -1 });

    // Return the tasks
    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (err) {
    console.error('Get User Tasks Error:', err);
    res
      .status(500)
      .json({ success: false, message: 'Server Error fetching user tasks' });
  }
};

/**
 * Bulk update multiple tasks at once
 *
 * @desc    Bulk update tasks
 * @route   PUT /api/v1/tasks/bulk-update
 * @access  Private - requires authentication
 */
export const bulkUpdateTasks = async (req, res) => {
  try {
    // Extract task IDs and update data from request
    const { taskIds, update } = req.body;

    // Validate required fields
    if (!Array.isArray(taskIds) || !update) {
      return res.status(400).json({
        success: false,
        message: 'taskIds array and update object are required',
      });
    }

    // Update multiple tasks in one database operation
    // More efficient than updating each task individually
    const result = await Task.updateMany({ _id: { $in: taskIds } }, update, {
      runValidators: true, // Apply schema validation to all updates
    });

    // Return count of modified documents
    res.status(200).json({ success: true, modifiedCount: result.nModified });
  } catch (err) {
    console.error('Bulk update error:', err);
    res
      .status(500)
      .json({ success: false, message: 'Server Error bulk updating tasks' });
  }
};
