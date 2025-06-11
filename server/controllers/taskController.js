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
 * @desc    Get tasks for the authenticated user within a specific project
 * @route   GET /api/v1/projects/:projectId/tasks
 * @access  Private - requires authentication and project membership
 */
export const getTasksForProject = async (req, res, next) => {
  logger.verbose('Attempting to retrieve tasks for project', {
    userId: req.user.id,
    projectId: req.params.projectId,
    req,
  });

  try {
    // Validate project exists and user has access to it
    const project = await Project.findById(req.params.projectId);

    if (!project) {
      logger.warn('Project not found', {
        userId: req.user.id,
        projectId: req.params.projectId,
      });
      return next(
        new ErrorResponse(
          `Project not found with id of ${req.params.projectId}`,
          404
        )
      );
    }

    // Check if user is a member of the project
    if (
      !project.members.includes(req.user.id) &&
      project.owner.toString() !== req.user.id
    ) {
      logger.warn('Unauthorized access to project tasks', {
        userId: req.user.id,
        projectId: req.params.projectId,
      });
      return next(
        new ErrorResponse(
          `Not authorized to access tasks for this project`,
          403
        )
      );
    }

    // Build query object - by default exclude completed tasks
    const query = { project: req.params.projectId };

    // Allow showing completed tasks if explicitly requested
    if (req.query.includeCompleted !== 'true') {
      query.status = { $ne: 'Completed' };
    }

    // Filter by tag if specified
    if (req.query.tag) {
      query.tags = req.query.tag;
    }

    // Filter by multiple tags if specified
    if (req.query.tags) {
      const tagArray = req.query.tags.split(',');
      if (tagArray.length > 0) {
        query.tags = { $all: tagArray };
      }
    }

    const tasks = await Task.find(query)
      .sort({ createdAt: -1 })
      .populate('assignee', 'name email');

    logger.info('Successfully retrieved tasks for project', {
      userId: req.user.id,
      projectId: req.params.projectId,
      tasksCount: tasks.length,
      includeCompleted: req.query.includeCompleted === 'true',
      req,
    });

    const { auditLog } = await import('../middleware/auditLogMiddleware.js');
    await auditLog(req, 'task_retrieve', 'success', {
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
    await auditLog(req, 'task_retrieve', 'failed', {
      projectId: req.params.projectId,
      error: err.message,
    });

    return next(
      new ErrorResponse(`Error retrieving tasks: ${err.message}`, 500)
    );
  }
};

/**
 * Create a new task (must belong to a project)
 *
 * API SECURITY BEST PRACTICES:
 * - Data validation before processing
 * - Proper error messages that don't leak implementation details
 * - Authorization checks before database operations
 * - Error handling for all potential failure points
 * - Audit logging for security tracking
 *
 * @desc    Create new task within a project
 * @route   POST /api/v1/projects/:projectId/tasks
 * @access  Private - requires authentication and project membership
 */
export const createTask = async (req, res, next) => {
  // Check if the user is a guest
  if (req.user && req.user.isGuest) {
    logger.warn('Guest user attempt to create task', {
      userId: req.user._id, // Guest ID
      projectId: req.params.projectId,
      action: 'create_task_denied_guest',
    });
    return res.status(403).json({
      success: false,
      message:
        'Guests are not allowed to create tasks. Please log in or sign up.',
      notificationType: 'warning',
    });
  }

  const projectId = req.params.projectId;

  // Log attempted action - don't include the full req object
  logger.verbose('Attempting to create task', {
    userId: req.user.id,
    projectId,
    title: req.body.title,
  });

  try {
    // Validate that project ID is provided
    if (!projectId) {
      logger.error('Task creation failed - no project ID provided', {
        userId: req.user.id,
      });
      return res
        .status(400)
        .json({ success: false, message: 'Project ID is required' });
    }

    // Validate Project ID format
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      logger.error('Task creation failed - invalid project ID format', {
        userId: req.user.id,
        projectId,
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
      });
      return res.status(404).json({
        success: false,
        message: `Project not found with id ${projectId}`,
      });
    }

    // Authorization check: Ensure user is a member of the project
    const isMember = project.members.some(
      (memberId) => memberId.toString() === req.user.id
    );
    const isOwner = project.owner.toString() === req.user.id;

    if (!isMember && !isOwner) {
      logger.error('Task creation failed - user not authorized', {
        userId: req.user.id,
        projectId,
      });
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add tasks to this project',
      });
    }

    // Add logged-in user as the assignee - ensures tasks are always assigned
    req.body.assignee = req.user.id;
    req.body.project = projectId; // Ensure project is set

    // Extract fields from req.body for validation and security
    const {
      title,
      description,
      status,
      priority,
      dueDate,
      estimatedTime,
      assignee,
      tags,
    } = req.body;

    // Create basic task with required fields
    const taskData = {
      title,
      assignee,
      project: projectId, // Use projectId instead of extracting project from req.body
      ...(description && { description }),
      ...(status && { status }),
      ...(priority && { priority }),
      ...(dueDate && { dueDate }),
      ...(estimatedTime && { estimatedTime }),
      ...(tags && { tags }),
    };

    // Validation: Check required fields
    if (!title || title.trim() === '') {
      logger.error('Task creation failed - missing title', {
        userId: req.user.id,
      });
      return res
        .status(400)
        .json({ success: false, message: 'Task title is required' });
    }

    // Validation: Check that status is one of the allowed values if provided
    if (status) {
      const validStatuses = ['Not Started', 'In Progress', 'Completed'];
      if (!validStatuses.includes(status)) {
        logger.error('Task creation failed - invalid status', {
          userId: req.user.id,
          status,
        });
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(
            ', '
          )}`,
        });
      }
    }

    // Validation: Check that priority is one of the allowed values if provided
    if (priority) {
      const validPriorities = ['Low', 'Medium', 'High'];
      if (!validPriorities.includes(priority)) {
        logger.error('Task creation failed - invalid priority', {
          userId: req.user.id,
          priority,
        });
        return res.status(400).json({
          success: false,
          message: `Invalid priority. Must be one of: ${validPriorities.join(
            ', '
          )}`,
        });
      }
    }

    // Validation: Check that dueDate is a valid date if provided
    if (dueDate && isNaN(new Date(dueDate).getTime())) {
      logger.error('Task creation failed - invalid due date format', {
        userId: req.user.id,
        dueDate,
      });
      return res.status(400).json({
        success: false,
        message: 'Invalid due date format',
      });
    }

    // Save the task to the database
    const task = await Task.create(taskData);

    // Log successful creation
    logger.logCreate('task', task._id, req.user.id, {
      task: {
        id: task._id,
        title: task.title,
        projectId: task.project,
      },
    });

    // Add audit log for task creation for tracking and accountability
    const { auditLog } = await import('../middleware/auditLogMiddleware.js');
    await auditLog(req, 'task_create', 'success', {
      taskId: task._id,
      taskTitle: task.title,
      projectId: task.project,
    });

    // Return the created task with 201 Created status code
    res.status(201).json({ success: true, data: task });
  } catch (err) {
    // Log error
    logger.error('Failed to create task', {
      error: err,
      userId: req.user?.id,
      taskData: req.body,
    });

    // Log the failed attempt for auditing
    const { auditLog } = await import('../middleware/auditLogMiddleware.js');
    await auditLog(req, 'task_create', 'failed', {
      error: err.message,
      taskTitle: req.body.title,
      projectId,
    });

    // Handle Mongoose validation errors with specific messages
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
 * Get a single task by ID
 *
 * @desc    Get single task
 * @route   GET /api/projects/:projectId/tasks/:id
 * @access  Private
 */
export const getTask = async (req, res, next) => {
  const projectId = req.params.projectId;
  const taskId = req.params.id;

  logger.verbose('Attempting to retrieve task', {
    userId: req.user.id,
    taskId,
    projectId,
  });

  try {
    const task = await Task.findOne({ _id: taskId, project: projectId })
      .populate('assignee', 'name email')
      .populate('project', 'name description');

    if (!task) {
      logger.warn('Task not found', {
        userId: req.user.id,
        taskId,
        projectId,
      });
      return next(
        new ErrorResponse(
          `Task not found with id of ${taskId} in project ${projectId}`,
          404
        )
      );
    }

    // Verify project membership
    const project = await Project.findById(projectId);
    if (!project) {
      return next(
        new ErrorResponse(`Project not found with id of ${projectId}`, 404)
      );
    }

    const isMember = project.members.some(
      (memberId) => memberId.toString() === req.user.id
    );
    const isOwner = project.owner.toString() === req.user.id;
    const isAssignee = task.assignee._id.toString() === req.user.id;

    if (!isMember && !isOwner && !isAssignee) {
      logger.warn('Unauthorized access attempt to task', {
        userId: req.user.id,
        taskId,
        projectId,
      });
      return next(
        new ErrorResponse(`User is not authorized to access this task`, 403)
      );
    }

    logger.info('Successfully retrieved task', {
      userId: req.user.id,
      taskId,
      projectId,
    });

    const { auditLog } = await import('../middleware/auditLogMiddleware.js');
    await auditLog(req, 'task_retrieve', 'success', {
      taskId,
      projectId,
    });

    res.status(200).json({ success: true, data: task });
  } catch (err) {
    logger.error('Failed to retrieve task', {
      error: err,
      userId: req.user.id,
      taskId,
      projectId,
    });

    const { auditLog } = await import('../middleware/auditLogMiddleware.js');
    await auditLog(req, 'task_retrieve', 'failed', {
      taskId,
      projectId,
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
 * @route   PUT /api/v1/projects/:projectId/tasks/:id
 * @access  Private - requires being the assignee or project owner
 */
export const updateTask = async (req, res, next) => {
  // Check if the user is a guest
  if (req.user && req.user.isGuest) {
    logger.warn('Guest user attempt to update task', {
      userId: req.user._id, // Guest ID
      taskId: req.params.id,
      projectId: req.params.projectId,
      action: 'update_task_denied_guest',
    });
    return res.status(403).json({
      success: false,
      message:
        'Guests are not allowed to update tasks. Please log in or sign up.',
      notificationType: 'warning',
    });
  }

  const projectId = req.params.projectId;
  const taskId = req.params.id;

  logger.verbose('Attempting to update task', {
    userId: req.user.id,
    taskId,
    projectId,
  });

  try {
    // Find task within the specified project
    let task = await Task.findOne({ _id: taskId, project: projectId });

    if (!task) {
      logger.warn('Task not found for update', {
        userId: req.user.id,
        taskId,
        projectId,
      });
      return next(
        new ErrorResponse(
          `Task not found with id of ${taskId} in project ${projectId}`,
          404
        )
      );
    }

    // Validate project membership
    const project = await Project.findById(projectId);
    if (!project) {
      return next(
        new ErrorResponse(`Project not found with id of ${projectId}`, 404)
      );
    }

    // Check authorization - either project owner, member, or task assignee
    const isMember = project.members.some(
      (memberId) => memberId.toString() === req.user.id
    );
    const isOwner = project.owner.toString() === req.user.id;
    const isAssignee = task.assignee.toString() === req.user.id;

    if (!isMember && !isOwner && !isAssignee) {
      logger.warn('Unauthorized attempt to update task', {
        userId: req.user.id,
        taskId,
        projectId,
      });
      return next(
        new ErrorResponse(`User is not authorized to update this task`, 403)
      );
    }

    // Prevent project field from being changed
    if (req.body.project && req.body.project !== projectId) {
      logger.warn('Attempt to change task project', {
        userId: req.user.id,
        taskId,
        currentProjectId: projectId,
        newProjectId: req.body.project,
      });
      return next(
        new ErrorResponse(`Cannot change project assignment for task`, 400)
      );
    }

    // Ensure project ID is preserved
    req.body.project = projectId;

    const oldTask = { ...task._doc };

    // Check if we're changing status to Completed
    const isMarkingAsCompleted =
      req.body.status === 'Completed' && task.status !== 'Completed';

    task = await Task.findByIdAndUpdate(taskId, req.body, {
      new: true,
      runValidators: true,
    });

    // Fixed logging to ensure we're using the string ID, not an object
    logger.logUpdate('task', task._id.toString(), req.user.id, {
      taskId: task._id.toString(),
      projectId,
      title: task.title,
    });

    const { auditLog } = await import('../middleware/auditLogMiddleware.js');
    await auditLog(req, 'task_update', 'success', {
      taskId: task._id.toString(),
      projectId,
      changes: req.body,
      oldData: oldTask,
      newData: task,
    });

    // Archive task if it's now marked as completed
    if (isMarkingAsCompleted) {
      try {
        const { archiveCompletedTask } = await import('./archiveController.js');
        await archiveCompletedTask(task, req);
        logger.info('Task archived after being marked as completed', {
          taskId: task._id,
          userId: req.user.id,
        });
      } catch (archiveErr) {
        logger.error('Failed to archive completed task', {
          error: archiveErr,
          taskId: task._id,
          userId: req.user.id,
        });
        // We don't want to fail the task update if archiving fails,
        // so we just log the error and continue
      }
    }

    res.status(200).json({ success: true, data: task });
  } catch (err) {
    logger.error('Failed to update task', {
      error: err,
      userId: req.user.id,
      taskId,
      projectId,
    });

    const { auditLog } = await import('../middleware/auditLogMiddleware.js');
    await auditLog(req, 'task_update', 'failed', {
      taskId,
      projectId,
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
 * @route   DELETE /api/v1/projects/:projectId/tasks/:id
 * @access  Private - requires being the assignee or project owner
 */
export const deleteTask = async (req, res, next) => {
  // Check if the user is a guest
  if (req.user && req.user.isGuest) {
    logger.warn('Guest user attempt to delete task', {
      userId: req.user._id, // Guest ID
      taskId: req.params.id,
      projectId: req.params.projectId,
      action: 'delete_task_denied_guest',
    });
    return res.status(403).json({
      success: false,
      message:
        'Guests are not allowed to delete tasks. Please log in or sign up.',
      notificationType: 'warning',
    });
  }

  const projectId = req.params.projectId;
  const taskId = req.params.id;

  try {
    // Log the delete attempt for traceability
    logger.info(`Attempting to delete task with ID: ${taskId}`, {
      userId: req.user.id,
      action: 'delete_task',
      taskId,
      projectId,
    });

    // Find task within the specified project
    const task = await Task.findOne({ _id: taskId, project: projectId });

    // Log database operation result
    logger.logDbOperation('findById', 'Task', !!task, null, {
      taskId,
      projectId,
      userId: req.user.id,
    });

    // Check that task exists
    if (!task) {
      logger.warn(`Task not found for deletion: ${taskId}`, {
        userId: req.user.id,
        projectId,
      });

      return res.status(404).json({
        success: false,
        message: `Task not found with id of ${taskId} in project ${projectId}`,
        notificationType: 'error', // Used by frontend for toast notifications
      });
    }

    // Validate project membership
    const project = await Project.findById(projectId);
    if (!project) {
      return next(
        new ErrorResponse(`Project not found with id of ${projectId}`, 404)
      );
    }

    // Authorization check: Verify user is either the assignee or project owner/member
    const isMember = project.members.some(
      (memberId) => memberId.toString() === req.user.id
    );
    const isOwner = project.owner.toString() === req.user.id;
    const isAssignee = task.assignee.toString() === req.user.id;

    if (!isMember && !isOwner && !isAssignee) {
      logger.warn(`Unauthorized task deletion attempt`, {
        userId: req.user.id,
        taskId,
        projectId,
      });

      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this task',
        notificationType: 'error',
      });
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
      taskId,
      projectId,
      userId: req.user.id,
    });

    // Add audit log for failed task deletion
    const { auditLog } = await import('../middleware/auditLogMiddleware.js');
    await auditLog(req, 'task_delete', 'failed', {
      taskId,
      projectId,
      error: err.message,
    });

    // Handle invalid MongoDB ObjectId format
    if (err.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: `Task not found with id of ${taskId}`,
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
 * Bulk update multiple tasks at once within a project
 *
 * @desc    Bulk update tasks
 * @route   PUT /api/v1/projects/:projectId/tasks/bulk-update
 * @access  Private - requires authentication
 */
export const bulkUpdateTasks = async (req, res, next) => {
  // Check if the user is a guest
  if (req.user && req.user.isGuest) {
    logger.warn('Guest user attempt to bulk update tasks', {
      userId: req.user._id, // Guest ID
      projectId: req.params.projectId,
      taskIds: req.body.taskIds,
      action: 'bulk_update_tasks_denied_guest',
    });
    return res.status(403).json({
      success: false,
      message:
        'Guests are not allowed to update tasks. Please log in or sign up.',
      notificationType: 'warning',
    });
  }

  const projectId = req.params.projectId;

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

    // Prevent changing the project ID
    if (update.project && update.project !== projectId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change project assignment for tasks',
      });
    }

    // Ensure all tasks belong to the specified project
    const tasksInProject = await Task.countDocuments({
      _id: { $in: taskIds },
      project: projectId,
    });

    if (tasksInProject !== taskIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Some tasks do not belong to the specified project',
      });
    }

    // Update multiple tasks in one database operation
    // More efficient than updating each task individually
    const result = await Task.updateMany(
      { _id: { $in: taskIds }, project: projectId },
      update,
      { runValidators: true }
    );

    // Return count of modified documents
    res.status(200).json({
      success: true,
      modifiedCount: result.modifiedCount || result.nModified, // Depending on MongoDB version
    });
  } catch (err) {
    logger.error('Bulk update error:', {
      error: err,
      projectId,
      userId: req.user.id,
    });

    return next(
      new ErrorResponse(`Error bulk updating tasks: ${err.message}`, 500)
    );
  }
};

/**
 * Create a middleware to validate project ID and user permissions
 * This middleware can be used for any task operation requiring project context
 */
export const validateProjectAccess = async (req, res, next) => {
  const projectId = req.params.projectId;

  try {
    // Check if project ID is provided
    if (!projectId) {
      return next(
        new ErrorResponse('Project ID is required for all task operations', 400)
      );
    }

    // Check if project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return next(
        new ErrorResponse(`Project not found with id of ${projectId}`, 404)
      );
    }

    // Check if user has permission to access this project
    const isMember = project.members.some(
      (memberId) => memberId.toString() === req.user.id
    );
    const isOwner = project.owner.toString() === req.user.id;

    if (!isMember && !isOwner) {
      return next(
        new ErrorResponse(
          'Not authorized to access tasks for this project',
          403
        )
      );
    }

    // Attach project to request object for use in later middleware/controllers
    req.project = project;
    next();
  } catch (err) {
    return next(
      new ErrorResponse(`Error validating project access: ${err.message}`, 500)
    );
  }
};

/**
 * Data Migration: Create a default project for any orphaned tasks
 * Use with caution - this will modify data
 */
export const migrateOrphanedTasks = async (req, res, next) => {
  try {
    // Only allow admins to perform this operation
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can migrate tasks',
      });
    }

    // Find tasks with no project
    const orphanedTasks = await Task.find({ project: { $exists: false } });

    if (orphanedTasks.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No orphaned tasks found',
        count: 0,
      });
    }

    // Create or find a default project for orphaned tasks
    let defaultProject = await Project.findOne({ name: 'Default Project' });

    if (!defaultProject) {
      defaultProject = await Project.create({
        name: 'Default Project',
        description: 'Default project for orphaned tasks',
        owner: req.user.id,
        members: [req.user.id],
      });
    }

    // Update all orphaned tasks to belong to the default project
    const result = await Task.updateMany(
      { project: { $exists: false } },
      { project: defaultProject._id }
    );

    return res.status(200).json({
      success: true,
      message: `Migrated ${
        result.modifiedCount || result.nModified
      } orphaned tasks to Default Project`,
      defaultProject: defaultProject._id,
      count: result.modifiedCount || result.nModified,
    });
  } catch (err) {
    logger.error('Task migration error:', {
      error: err,
      userId: req.user.id,
    });

    return next(
      new ErrorResponse(`Error migrating tasks: ${err.message}`, 500)
    );
  }
};

/**
 * Get all tasks assigned to a specific user (admin route)
 * This function fetches tasks across all projects for a specific user
 *
 * @desc    Get all tasks for a specific user
 * @route   GET /api/v1/users/:userId/tasks
 * @access  Private/Admin
 */
export const getUserTasks = async (req, res, next) => {
  try {
    const userId = req.params.userId;

    // Find all projects where the user is either owner or member
    const projects = await Project.find({
      $or: [{ owner: userId }, { members: userId }],
    }).select('_id');

    // Get project IDs
    const projectIds = projects.map((project) => project._id);

    // Find all tasks within those projects where user is the assignee
    const tasks = await Task.find({
      project: { $in: projectIds },
      assignee: userId,
    }).populate('project', 'name description');

    logger.verbose(`Admin retrieved tasks for user ${userId}`, {
      adminId: req.user.id,
      userId,
      taskCount: tasks.length,
    });

    // Record this action in audit logs
    const { auditLog } = await import('../middleware/auditLogMiddleware.js');
    await auditLog(req, 'admin_task_retrieve', 'success', {
      targetUserId: userId,
      taskCount: tasks.length,
    });

    return res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (err) {
    logger.error(`Failed to retrieve tasks for user`, {
      error: err,
      adminId: req.user.id,
      userId: req.params.userId,
    });

    return next(
      new ErrorResponse(`Error retrieving user tasks: ${err.message}`, 500)
    );
  }
};

/**
 * @desc    Create a subtask under a parent task
 * @route   POST /api/v1/tasks/:taskId/subtasks
 * @access  Private
 */
export const createSubtask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const {
      title,
      description,
      priority = 'medium',
      assignee,
      dueDate,
    } = req.body;

    // Validate parent task exists and user has access
    const parentTask = await Task.findById(taskId).populate('project');
    if (!parentTask) {
      return next(new ErrorResponse('Parent task not found', 404));
    }

    // Check project access
    const project = parentTask.project;
    if (
      !project.members.includes(req.user.id) &&
      project.owner.toString() !== req.user.id
    ) {
      return next(
        new ErrorResponse(
          'Not authorized to create subtasks in this project',
          403
        )
      );
    }

    // Create subtask
    const subtaskData = {
      title,
      description,
      priority,
      assignee: assignee || req.user.id,
      dueDate,
      project: parentTask.project._id,
      parentTask: taskId,
      createdBy: req.user.id,
      status: 'todo',
    };

    const subtask = await Task.create(subtaskData);
    await subtask.populate(['assignee', 'createdBy'], 'name email');

    // Update parent task's subtasks array
    parentTask.subtasks.push(subtask._id);
    await parentTask.save();

    logger.info('Subtask created successfully', {
      userId: req.user.id,
      parentTaskId: taskId,
      subtaskId: subtask._id,
    });

    res.status(201).json({
      success: true,
      data: subtask,
    });
  } catch (error) {
    logger.error('Error creating subtask', {
      error: error.message,
      userId: req.user.id,
    });
    next(error);
  }
};

/**
 * @desc    Get all subtasks for a parent task
 * @route   GET /api/v1/tasks/:taskId/subtasks
 * @access  Private
 */
export const getSubtasks = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    // Validate parent task exists and user has access
    const parentTask = await Task.findById(taskId).populate('project');
    if (!parentTask) {
      return next(new ErrorResponse('Parent task not found', 404));
    }

    // Check project access
    const project = parentTask.project;
    if (
      !project.members.includes(req.user.id) &&
      project.owner.toString() !== req.user.id
    ) {
      return next(new ErrorResponse('Not authorized to view subtasks', 403));
    }

    const subtasks = await Task.find({ parentTask: taskId })
      .populate('assignee', 'name email')
      .populate('createdBy', 'name email')
      .sort({ order: 1, createdAt: 1 });

    res.status(200).json({
      success: true,
      count: subtasks.length,
      data: subtasks,
    });
  } catch (error) {
    logger.error('Error fetching subtasks', {
      error: error.message,
      userId: req.user.id,
    });
    next(error);
  }
};

/**
 * @desc    Add task dependency (blockedBy relationship)
 * @route   POST /api/v1/tasks/:taskId/dependencies
 * @access  Private
 */
export const addTaskDependency = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { dependsOnTaskId } = req.body;

    if (!dependsOnTaskId) {
      return next(new ErrorResponse('dependsOnTaskId is required', 400));
    }

    // Validate both tasks exist and user has access
    const [task, dependencyTask] = await Promise.all([
      Task.findById(taskId).populate('project'),
      Task.findById(dependsOnTaskId).populate('project'),
    ]);

    if (!task || !dependencyTask) {
      return next(new ErrorResponse('One or both tasks not found', 404));
    }

    // Check circular dependency
    const hasCircular = await task.hasCircularDependency(dependsOnTaskId);
    if (hasCircular) {
      return next(new ErrorResponse('Cannot create circular dependency', 400));
    }

    // Add dependency relationships
    if (!task.dependencies.blockedBy.includes(dependsOnTaskId)) {
      task.dependencies.blockedBy.push(dependsOnTaskId);
    }
    if (!dependencyTask.dependencies.blocks.includes(taskId)) {
      dependencyTask.dependencies.blocks.push(taskId);
    }

    await Promise.all([task.save(), dependencyTask.save()]);

    logger.info('Task dependency added', {
      userId: req.user.id,
      taskId,
      dependsOnTaskId,
    });

    res.status(200).json({
      success: true,
      data: {
        task: task._id,
        dependsOn: dependsOnTaskId,
      },
    });
  } catch (error) {
    logger.error('Error adding task dependency', {
      error: error.message,
      userId: req.user.id,
    });
    next(error);
  }
};

/**
 * @desc    Remove task dependency
 * @route   DELETE /api/v1/tasks/:taskId/dependencies/:dependencyId
 * @access  Private
 */
export const removeTaskDependency = async (req, res, next) => {
  try {
    const { taskId, dependencyId } = req.params;

    const [task, dependencyTask] = await Promise.all([
      Task.findById(taskId),
      Task.findById(dependencyId),
    ]);

    if (!task || !dependencyTask) {
      return next(new ErrorResponse('One or both tasks not found', 404));
    }

    // Remove dependency relationships
    task.dependencies.blockedBy = task.dependencies.blockedBy.filter(
      (id) => id.toString() !== dependencyId
    );
    dependencyTask.dependencies.blocks =
      dependencyTask.dependencies.blocks.filter(
        (id) => id.toString() !== taskId
      );

    await Promise.all([task.save(), dependencyTask.save()]);

    logger.info('Task dependency removed', {
      userId: req.user.id,
      taskId,
      dependencyId,
    });

    res.status(200).json({
      success: true,
      message: 'Dependency removed successfully',
    });
  } catch (error) {
    logger.error('Error removing task dependency', {
      error: error.message,
      userId: req.user.id,
    });
    next(error);
  }
};

/**
 * @desc    Start time tracking for a task
 * @route   POST /api/v1/tasks/:taskId/time/start
 * @access  Private
 */
export const startTimeTracking = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { description } = req.body;

    const task = await Task.findById(taskId);
    if (!task) {
      return next(new ErrorResponse('Task not found', 404));
    }

    // Check if user already has an active time entry for this task
    const activeEntry = task.timeEntries.find(
      (entry) => entry.user.toString() === req.user.id && !entry.endTime
    );

    if (activeEntry) {
      return next(
        new ErrorResponse('Time tracking already active for this task', 400)
      );
    }

    // Create new time entry
    const timeEntry = {
      user: req.user.id,
      startTime: new Date(),
      description: description || '',
    };

    task.timeEntries.push(timeEntry);
    task.updateActivity(req.user.id);
    await task.save();

    const newEntry = task.timeEntries[task.timeEntries.length - 1];

    logger.info('Time tracking started', {
      userId: req.user.id,
      taskId,
      timeEntryId: newEntry._id,
    });

    res.status(200).json({
      success: true,
      data: newEntry,
    });
  } catch (error) {
    logger.error('Error starting time tracking', {
      error: error.message,
      userId: req.user.id,
    });
    next(error);
  }
};

/**
 * @desc    Stop time tracking for a task
 * @route   PUT /api/v1/tasks/:taskId/time/stop
 * @access  Private
 */
export const stopTimeTracking = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { description } = req.body;

    const task = await Task.findById(taskId);
    if (!task) {
      return next(new ErrorResponse('Task not found', 404));
    }

    // Find active time entry
    const activeEntry = task.timeEntries.find(
      (entry) => entry.user.toString() === req.user.id && !entry.endTime
    );

    if (!activeEntry) {
      return next(
        new ErrorResponse('No active time tracking found for this task', 400)
      );
    }

    // Update time entry
    const endTime = new Date();
    activeEntry.endTime = endTime;
    activeEntry.duration = Math.round(
      (endTime - activeEntry.startTime) / 60000
    ); // in minutes
    if (description) {
      activeEntry.description = description;
    }

    // Update total actual hours
    task.actualHours = task.timeEntries.reduce((total, entry) => {
      return total + (entry.duration || 0) / 60;
    }, 0);

    task.updateActivity(req.user.id);
    await task.save();

    logger.info('Time tracking stopped', {
      userId: req.user.id,
      taskId,
      duration: activeEntry.duration,
    });

    res.status(200).json({
      success: true,
      data: activeEntry,
    });
  } catch (error) {
    logger.error('Error stopping time tracking', {
      error: error.message,
      userId: req.user.id,
    });
    next(error);
  }
};

/**
 * @desc    Get time tracking entries for a task
 * @route   GET /api/v1/tasks/:taskId/time
 * @access  Private
 */
export const getTimeEntries = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId)
      .populate('timeEntries.user', 'name email')
      .select('timeEntries actualHours estimatedHours');

    if (!task) {
      return next(new ErrorResponse('Task not found', 404));
    }

    res.status(200).json({
      success: true,
      data: {
        timeEntries: task.timeEntries,
        actualHours: task.actualHours,
        estimatedHours: task.estimatedHours,
      },
    });
  } catch (error) {
    logger.error('Error fetching time entries', {
      error: error.message,
      userId: req.user.id,
    });
    next(error);
  }
};

/**
 * @desc    Update task progress
 * @route   PUT /api/v1/tasks/:taskId/progress
 * @access  Private
 */
export const updateTaskProgress = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { percentage, automatic } = req.body;

    if (percentage !== undefined && (percentage < 0 || percentage > 100)) {
      return next(
        new ErrorResponse('Progress percentage must be between 0 and 100', 400)
      );
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return next(new ErrorResponse('Task not found', 404));
    }

    // Update progress settings
    if (percentage !== undefined) {
      task.progress.percentage = percentage;
      task.progress.automatic = false; // Manual override
    }
    if (automatic !== undefined) {
      task.progress.automatic = automatic;
    }

    // Recalculate if set to automatic
    if (task.progress.automatic) {
      await task.calculateProgress();
    }

    task.progress.lastUpdated = new Date();
    task.updateActivity(req.user.id);
    await task.save();

    logger.info('Task progress updated', {
      userId: req.user.id,
      taskId,
      percentage: task.progress.percentage,
      automatic: task.progress.automatic,
    });

    res.status(200).json({
      success: true,
      data: {
        progress: task.progress,
      },
    });
  } catch (error) {
    logger.error('Error updating task progress', {
      error: error.message,
      userId: req.user.id,
    });
    next(error);
  }
};

/**
 * @desc    Reorder tasks within a project
 * @route   PUT /api/v1/projects/:projectId/tasks/reorder
 * @access  Private
 */
export const reorderTasks = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { taskOrders } = req.body; // Array of { taskId, order }

    if (!Array.isArray(taskOrders)) {
      return next(new ErrorResponse('taskOrders must be an array', 400));
    }

    // Validate project access
    const project = await Project.findById(projectId);
    if (!project) {
      return next(new ErrorResponse('Project not found', 404));
    }

    if (
      !project.members.includes(req.user.id) &&
      project.owner.toString() !== req.user.id
    ) {
      return next(new ErrorResponse('Not authorized to reorder tasks', 403));
    }

    // Update task orders
    const bulkOps = taskOrders.map(({ taskId, order }) => ({
      updateOne: {
        filter: { _id: taskId, project: projectId },
        update: { order },
      },
    }));

    await Task.bulkWrite(bulkOps);

    logger.info('Tasks reordered', {
      userId: req.user.id,
      projectId,
      taskCount: taskOrders.length,
    });

    res.status(200).json({
      success: true,
      message: 'Tasks reordered successfully',
    });
  } catch (error) {
    logger.error('Error reordering tasks', {
      error: error.message,
      userId: req.user.id,
    });
    next(error);
  }
};

/**
 * @desc    Get task analytics for a project
 * @route   GET /api/v1/projects/:projectId/tasks/analytics
 * @access  Private
 */
export const getTaskAnalytics = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    // Validate project access
    const project = await Project.findById(projectId);
    if (!project) {
      return next(new ErrorResponse('Project not found', 404));
    }

    if (
      !project.members.includes(req.user.id) &&
      project.owner.toString() !== req.user.id
    ) {
      return next(new ErrorResponse('Not authorized to view analytics', 403));
    }

    const analytics = await Task.aggregate([
      { $match: { project: new mongoose.Types.ObjectId(projectId) } },
      {
        $group: {
          _id: null,
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] },
          },
          inProgressTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] },
          },
          blockedTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'blocked'] }, 1, 0] },
          },
          overdueTasks: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $lt: ['$dueDate', new Date()] },
                    { $not: { $in: ['$status', ['done', 'cancelled']] } },
                  ],
                },
                1,
                0,
              ],
            },
          },
          totalEstimatedHours: { $sum: '$estimatedHours' },
          totalActualHours: { $sum: '$actualHours' },
          avgProgress: { $avg: '$progress.percentage' },
        },
      },
    ]);

    const result = analytics[0] || {
      totalTasks: 0,
      completedTasks: 0,
      inProgressTasks: 0,
      blockedTasks: 0,
      overdueTasks: 0,
      totalEstimatedHours: 0,
      totalActualHours: 0,
      avgProgress: 0,
    };

    // Get priority breakdown
    const priorityBreakdown = await Task.aggregate([
      { $match: { project: new mongoose.Types.ObjectId(projectId) } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: result,
        priorityBreakdown,
      },
    });
  } catch (error) {
    logger.error('Error fetching task analytics', {
      error: error.message,
      userId: req.user.id,
    });
    next(error);
  }
};

/**
 * @desc    Get recent tasks for the authenticated user across all projects
 * @route   GET /api/v1/tasks/recent
 * @access  Private
 */
export const getRecentTasks = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const userId = new mongoose.Types.ObjectId(req.user.id);

    logger.info('Fetching recent tasks for user', {
      userId: req.user.id,
      limit,
      action: 'get_recent_tasks',
    });

    // Find all projects where the user is either owner or member
    const projects = await Project.find({
      $or: [
        { owner: userId },
        { members: userId }, // Array of ObjectIds
        { 'members.user': userId }, // Array of objects with user field (if using newer schema)
      ],
    }).select('_id');

    if (projects.length === 0) {
      logger.info('No projects found for user', { userId: req.user.id });
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
      });
    }

    // Get project IDs
    const projectIds = projects.map((project) => project._id);

    // Find recent tasks across these projects, prioritizing:
    // 1. Tasks assigned to the user
    // 2. Recently updated tasks
    // 3. Active tasks (not completed/cancelled)
    const recentTasks = await Task.find({
      project: { $in: projectIds },
      $or: [
        { assignee: userId }, // Tasks assigned to user
        { createdBy: userId }, // Tasks created by user
        { 'comments.user': userId }, // Tasks user has commented on
      ],
      status: { $nin: ['done', 'completed', 'cancelled', 'archived'] }, // Exclude finished tasks
    })
      .populate('project', 'name description')
      .populate('assignee', 'name email')
      .populate('createdBy', 'name email')
      .sort({
        updatedAt: -1, // Most recently updated first
        createdAt: -1, // Then most recently created
      })
      .limit(limit);

    logger.info('Successfully fetched recent tasks', {
      userId: req.user.id,
      taskCount: recentTasks.length,
      projectsChecked: projectIds.length,
    });

    // Record this action in audit logs for analytics using a valid enum action
    const { auditLog } = await import('../middleware/auditLogMiddleware.js');
    await auditLog(req, 'task_read', 'success', {
      taskCount: recentTasks.length,
      limit,
      operation: 'recent_tasks_fetch',
    });

    res.status(200).json({
      success: true,
      count: recentTasks.length,
      data: recentTasks,
    });
  } catch (error) {
    logger.error('Error fetching recent tasks', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      userId: req.user.id,
    });

    // Record failed attempt using valid enum action
    try {
      const { auditLog } = await import('../middleware/auditLogMiddleware.js');
      await auditLog(req, 'task_read', 'failed', {
        error: error.message,
        operation: 'recent_tasks_fetch',
      });
    } catch (auditError) {
      logger.error('Failed to create audit log', { error: auditError.message });
    }

    return next(
      new ErrorResponse(`Error fetching recent tasks: ${error.message}`, 500)
    );
  }
};
