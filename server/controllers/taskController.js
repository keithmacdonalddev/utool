const Task = require('../models/Task');
const Project = require('../models/Project'); // Need Project model
const User = require('../models/User');

// @desc    Get tasks for logged-in user
// @route   GET /api/v1/tasks
// @access  Private
exports.getTasks = async (req, res, next) => {
  try {
    // Find tasks where the assignee is the logged-in user
    // req.user is attached by the 'protect' middleware
    const tasks = await Task.find({ assignee: req.user.id }).sort({
      createdAt: -1,
    }); // Sort by newest first

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (err) {
    console.error('Get Tasks Error:', err);
    res
      .status(500)
      .json({ success: false, message: 'Server Error fetching tasks' });
  }
};

// @desc    Create new task
// @route   POST /api/v1/tasks
// @access  Private
exports.createTask = async (req, res, next) => {
  try {
    // Add logged-in user as the assignee
    req.body.assignee = req.user.id;

    // Extract only allowed fields from req.body to prevent unwanted data injection
    const {
      title,
      description,
      status,
      priority,
      dueDate,
      estimatedTime,
      project: projectId,
    } = req.body;

    // Validate project ID
    if (!projectId) {
      return res
        .status(400)
        .json({ success: false, message: 'Project ID is required' });
    }

    // Check if the project exists and the user is a member
    const project = await Project.findById(projectId);
    if (!project) {
      return res
        .status(404)
        .json({
          success: false,
          message: `Project not found with id ${projectId}`,
        });
    }
    if (!project.members.includes(req.user.id)) {
      return res
        .status(403)
        .json({
          success: false,
          message: 'Not authorized to add tasks to this project',
        });
    }

    const taskData = {
      title,
      assignee: req.user.id, // Ensure assignee is set correctly
      project: projectId, // Set the project ID
      ...(description && { description }),
      ...(status && { status }),
      ...(priority && { priority }),
      ...(dueDate && { dueDate }),
      ...(estimatedTime && { estimatedTime }),
    };

    const task = await Task.create(taskData);

    // Add audit log for task creation
    const { auditLog } = require('../middleware/auditLogMiddleware');
    await auditLog(req, 'task_create', 'success', {
      taskId: task._id,
      taskTitle: task.title,
      projectId: task.project,
      priority: task.priority,
      status: task.status,
    });

    res.status(201).json({
      success: true,
      data: task,
    });
  } catch (err) {
    console.error('Create Task Error:', err);

    // Add audit log for failed task creation
    const { auditLog } = require('../middleware/auditLogMiddleware');
    await auditLog(req, 'task_create', 'failed', {
      error: err.message,
      taskTitle: req.body.title,
      projectId: req.body.project,
    });

    // Handle Mongoose validation errors specifically
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((val) => val.message);
      return res
        .status(400)
        .json({ success: false, message: messages.join(', ') });
    }
    res
      .status(500)
      .json({ success: false, message: 'Server Error creating task' });
  }
};

// @desc    Get tasks for a specific project
// @route   GET /api/v1/projects/:projectId/tasks
// @access  Private
exports.getTasksForProject = async (req, res, next) => {
  try {
    const projectId = req.params.projectId;

    // Optional: Check if project exists and user is a member first
    const project = await Project.findById(projectId);
    if (!project) {
      return res
        .status(404)
        .json({
          success: false,
          message: `Project not found with id ${projectId}`,
        });
    }
    if (!project.members.includes(req.user.id)) {
      return res
        .status(403)
        .json({
          success: false,
          message: 'Not authorized to view tasks for this project',
        });
    }

    // Find tasks belonging to the specified project
    // Optionally filter further (e.g., only tasks assigned to the current user within that project)
    const tasks = await Task.find({ project: projectId })
      .populate('assignee', 'name email') // Populate assignee details
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (err) {
    console.error('Get Tasks for Project Error:', err);
    res
      .status(500)
      .json({ success: false, message: 'Server Error fetching project tasks' });
  }
};

// --- Placeholder functions for later ---

// @desc    Get single task
// @route   GET /api/v1/tasks/:id
// @access  Private
exports.getTask = async (req, res, next) => {
  res
    .status(501)
    .json({ success: false, message: 'Get single task not implemented yet' });
};

// @desc    Update task
// @route   PUT /api/v1/tasks/:id
// @access  Private
exports.updateTask = async (req, res, next) => {
  try {
    let task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: `Task not found with id of ${req.params.id}`,
      });
    }

    // Check if user is the assignee or project owner
    if (task.assignee.toString() !== req.user.id) {
      // If not assignee, check if user is project owner
      const project = await Project.findById(task.project);
      if (!project || project.owner.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this task',
        });
      }
    }

    // Keep track of original values for audit log
    const originalTask = {
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignee: task.assignee,
      dueDate: task.dueDate,
      estimatedTime: task.estimatedTime,
    };

    // Extract allowed fields for update
    const {
      title,
      description,
      status,
      priority,
      assignee,
      dueDate,
      estimatedTime,
    } = req.body;

    const updateData = {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(status !== undefined && { status }),
      ...(priority !== undefined && { priority }),
      ...(assignee !== undefined && { assignee }),
      ...(dueDate !== undefined && { dueDate }),
      ...(estimatedTime !== undefined && { estimatedTime }),
    };

    // Perform update
    task = await Task.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    // Check if status has changed for specific logging
    let hasStatusChanged = originalTask.status !== task.status;

    // Add audit log for task update
    const { auditLog } = require('../middleware/auditLogMiddleware');

    // Log status change separately if it occurred
    if (hasStatusChanged) {
      await auditLog(req, 'task_status_change', 'success', {
        taskId: task._id,
        taskTitle: task.title,
        oldStatus: originalTask.status,
        newStatus: task.status,
        projectId: task.project,
      });
    }

    // Log general task update
    await auditLog(req, 'task_update', 'success', {
      taskId: task._id,
      taskTitle: task.title,
      projectId: task.project,
      changedFields: Object.keys(updateData),
      originalValues: originalTask,
    });

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (err) {
    console.error('Update Task Error:', err);

    // Add audit log for failed task update
    const { auditLog } = require('../middleware/auditLogMiddleware');
    await auditLog(req, 'task_update', 'failed', {
      taskId: req.params.id,
      error: err.message,
    });

    if (err.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: `Task not found with id of ${req.params.id}`,
      });
    }

    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', '),
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server Error updating task',
    });
  }
};

// @desc    Delete task
// @route   DELETE /api/v1/tasks/:id
// @access  Private
exports.deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: `Task not found with id of ${req.params.id}`,
      });
    }

    // Check if user is the assignee or project owner
    if (task.assignee.toString() !== req.user.id) {
      // If not assignee, check if user is project owner
      const project = await Project.findById(task.project);
      if (!project || project.owner.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this task',
        });
      }
    }

    // Save task info for audit log before deletion
    const taskInfo = {
      id: task._id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      assignee: task.assignee,
      project: task.project,
    };

    await task.deleteOne();

    // Add audit log for task deletion
    const { auditLog } = require('../middleware/auditLogMiddleware');
    await auditLog(req, 'task_delete', 'success', {
      taskId: taskInfo.id,
      taskTitle: taskInfo.title,
      projectId: taskInfo.project,
      taskInfo: taskInfo,
    });

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    console.error('Delete Task Error:', err);

    // Add audit log for failed task deletion
    const { auditLog } = require('../middleware/auditLogMiddleware');
    await auditLog(req, 'task_delete', 'failed', {
      taskId: req.params.id,
      error: err.message,
    });

    if (err.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: `Task not found with id of ${req.params.id}`,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server Error deleting task',
    });
  }
};

// @desc    Get all tasks for a specific user (Admin only)
// @route   GET /api/v1/admin/users/:userId/tasks
// @access  Private/Admin
exports.getUserTasks = async (req, res, next) => {
  try {
    const targetUserId = req.params.userId;

    // Optional: Check if user exists
    const targetUserExists = await User.findById(targetUserId);
    if (!targetUserExists) {
      return res
        .status(404)
        .json({
          success: false,
          message: `User not found with id ${targetUserId}`,
        });
    }

    // Find tasks assigned to the target user
    const tasks = await Task.find({ assignee: targetUserId })
      .populate('project', 'name') // Populate project name
      .sort({ createdAt: -1 });

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
