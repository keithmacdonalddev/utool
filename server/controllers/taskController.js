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

    const tasks = await Task.find({ project: req.params.projectId })
      .sort({ createdAt: -1 })
      .populate('assignee', 'name email');

    logger.info('Successfully retrieved tasks for project', {
      userId: req.user.id,
      projectId: req.params.projectId,
      tasksCount: tasks.length,
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
    task = await Task.findByIdAndUpdate(taskId, req.body, {
      new: true,
      runValidators: true,
    });

    logger.logUpdate('Task updated', {
      userId: req.user.id,
      taskId,
      projectId,
      oldData: oldTask,
      newData: task,
    });

    const { auditLog } = await import('../middleware/auditLogMiddleware.js');
    await auditLog(req, 'task_update', 'success', {
      taskId,
      projectId,
      changes: req.body,
      oldData: oldTask,
      newData: task,
    });

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
