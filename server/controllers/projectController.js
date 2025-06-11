import Project from '../models/Project.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import { logger } from '../utils/logger.js';
import mongoose from 'mongoose';
import { logGuestWriteAttempt } from '../middleware/analyticsMiddleware.js';
import projectService from '../services/projectService.js';
import ErrorResponse from '../utils/errorResponse.js';

// @desc    Get projects for logged-in user (member or owner)
// @route   GET /api/v1/projects
// @access  Private
export const getProjects = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    logger.info(`Attempting to fetch projects for user`, {
      userId: req.user.id,
      action: 'get_projects',
    });

    // Use MongoDB aggregation pipeline for better performance in a single query
    // This avoids multiple separate database calls that were causing slowness
    const projectsWithProgress = await Project.aggregate([
      // Match projects where the user is owner OR a member (backward compatible with both old and new member structures)
      {
        $match: {
          $or: [
            { owner: userId },
            { members: userId }, // Old format: members array contains ObjectId directly
            { 'members.user': userId }, // New format: members array contains objects with user field
          ],
        },
      },

      // Look up project owner details with error handling
      {
        $lookup: {
          from: 'users',
          localField: 'owner',
          foreignField: '_id',
          as: 'ownerDetails',
        },
      },

      // Add conditional unwind to handle missing owner
      {
        $addFields: {
          ownerDetails: {
            $cond: {
              if: { $gt: [{ $size: '$ownerDetails' }, 0] },
              then: { $arrayElemAt: ['$ownerDetails', 0] },
              else: {
                _id: '$owner',
                name: 'Unknown User',
                email: 'unknown@example.com',
              },
            },
          },
        },
      },

      // Look up tasks for this project with better error handling
      {
        $lookup: {
          from: 'tasks',
          let: { projectId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$project', '$$projectId'] } } },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                completed: {
                  $sum: {
                    $cond: [
                      {
                        $in: ['$status', ['done', 'completed', 'Completed']],
                      },
                      1,
                      0,
                    ],
                  },
                },
                inProgress: {
                  $sum: {
                    $cond: [
                      {
                        $in: ['$status', ['in-progress', 'In Progress']],
                      },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ],
          as: 'taskStats',
        },
      },

      // Calculate progress with better error handling
      {
        $addFields: {
          // First, extract the taskStats object from the array
          taskStatsObj: {
            $ifNull: [
              { $arrayElemAt: ['$taskStats', 0] },
              { total: 0, completed: 0, inProgress: 0 },
            ],
          },
        },
      },
      {
        $addFields: {
          // Then calculate progress using the extracted object
          progress: {
            $cond: {
              if: {
                $and: [
                  { $gt: ['$taskStatsObj.total', 0] },
                  { $gte: ['$taskStatsObj.completed', 0] },
                ],
              },
              then: {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          '$taskStatsObj.completed',
                          '$taskStatsObj.total',
                        ],
                      },
                      100,
                    ],
                  },
                  0,
                ],
              },
              else: 0,
            },
          },

          // Format the owner object to match the previous structure
          owner: {
            _id: '$ownerDetails._id',
            name: { $ifNull: ['$ownerDetails.name', 'Unknown User'] },
            email: { $ifNull: ['$ownerDetails.email', 'unknown@example.com'] },
          },
        },
      },

      // Project final fields and shape the response
      {
        $project: {
          _id: 1,
          name: 1,
          description: 1,
          status: 1,
          priority: 1,
          startDate: 1,
          endDate: 1,
          createdAt: 1,
          updatedAt: 1,
          owner: 1,
          members: 1,
          progress: {
            percentage: '$progress',
            metrics: {
              totalTasks: { $ifNull: ['$taskStatsObj.total', 0] },
              completedTasks: { $ifNull: ['$taskStatsObj.completed', 0] },
              inProgressTasks: { $ifNull: ['$taskStatsObj.inProgress', 0] },
              overdueTasks: { $literal: 0 },
            },
          },
        },
      },

      // Sort by most recent first
      { $sort: { createdAt: -1 } },
    ]);

    logger.logDbOperation(
      'aggregate',
      'Project',
      projectsWithProgress.length > 0,
      null,
      {
        userId: req.user.id,
        projectCount: projectsWithProgress.length,
      }
    );

    logger.info(
      `Successfully fetched ${projectsWithProgress.length} projects using optimized query`,
      {
        userId: req.user.id,
        action: 'get_projects_success',
        count: projectsWithProgress.length,
      }
    );

    res.status(200).json({
      success: true,
      count: projectsWithProgress.length,
      data: projectsWithProgress,
    });
  } catch (err) {
    logger.error('Failed to fetch projects', {
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack,
        code: err.code,
      },
      userId: req.user.id,
      errorType: typeof err,
      errorConstructor: err.constructor.name,
    });

    // Provide more specific error information in development
    const errorMessage =
      process.env.NODE_ENV === 'development'
        ? `Server Error fetching projects: ${err.message}`
        : 'Server Error fetching projects';

    res.status(500).json({
      success: false,
      message: errorMessage,
      ...(process.env.NODE_ENV === 'development' && {
        details: err.message,
        stack: err.stack,
      }),
    });
  }
};

// @desc    Create new project
// @route   POST /api/v1/projects
// @access  Private
export const createProject = async (req, res, next) => {
  // Check if the user is a guest
  if (req.user && req.user.isGuest) {
    logger.warn('Guest user attempt to create project', {
      userId: req.user._id, // Guest ID
      action: 'create_project_denied_guest',
    });

    // Log this write attempt in analytics for tracking guest behavior
    await logGuestWriteAttempt(req, 'project_creation');

    return res.status(403).json({
      success: false,
      message:
        'Guests are not allowed to create projects. Please log in or sign up.',
      notificationType: 'warning',
    });
  }

  try {
    logger.info(`Attempting to create new project`, {
      userId: req.user.id,
      action: 'create_project',
    });

    // Extract allowed fields
    const { name, description, status, startDate, endDate, priority, members } =
      req.body;

    // Basic validation
    if (!name) {
      logger.warn('Project creation attempt without name', {
        userId: req.user.id,
      });
      return res.status(400).json({
        success: false,
        message: 'Project name is required',
        notificationType: 'error',
      });
    }

    const transformedMembers =
      members && members.length > 0
        ? members.map((memberId) => ({
            user: memberId,
            role: 'contributor', // Default role for invited members
            permissions: {
              canEditProject: false,
              canDeleteProject: false,
              canManageMembers: false,
              canManageTasks: true,
              canViewAnalytics: false,
              canExportData: false,
            },
            joinedAt: new Date(),
            invitedBy: req.user.id,
          }))
        : [];

    const projectData = {
      name,
      ...(description && { description }),
      ...(status && { status }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
      ...(priority && { priority }),
      // Transform members from plain IDs to proper member objects
      members: transformedMembers,
    };

    // Use projectService to create the project with real-time notifications
    const project = await projectService.createProject(
      projectData,
      req.user.id,
      req
    );

    logger.logCreate('project', project._id, req.user.id, {
      projectName: project.name,
      memberCount: project.members.length,
      status: project.status,
      priority: project.priority,
      hasEndDate: !!project.endDate,
    });

    // Add audit log for project creation
    const { auditLog } = await import('../middleware/auditLogMiddleware.js');
    await auditLog(req, 'project_create', 'success', {
      projectId: project._id,
      projectName: project.name,
      memberCount: project.members.length,
    });

    const responseData = {
      success: true,
      data: project,
      message: `Project "${project.name}" created successfully`,
      notificationType: 'success',
    };

    res.status(201).json(responseData);
  } catch (err) {
    logger.error('Failed to create project', {
      error: err,
      userId: req.user.id,
      projectName: req.body.name,
    });

    // Add audit log for failed project creation
    const { auditLog } = await import('../middleware/auditLogMiddleware.js');
    await auditLog(req, 'project_create', 'failed', {
      error: err.message,
      projectName: req.body.name,
    });

    // Handle Mongoose validation errors specifically
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((val) => val.message);
      logger.warn('Project validation error', {
        messages,
        userId: req.user.id,
        projectName: req.body.name,
      });

      return res.status(400).json({
        success: false,
        message: messages.join(', '),
        notificationType: 'error',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server Error creating project',
      notificationType: 'error',
    });
  }
};

// @desc    Get single project
// @route   GET /api/v1/projects/:id
// @access  Private
export const getProject = async (req, res, next) => {
  try {
    const projectIdParam = req.params.id;
    logger.info(
      `[GETPROJECT_CTRL] Attempting to find project with ID: ${projectIdParam}`,
      { userId: req.user.id }
    );

    const project = await projectService.findProjectById(projectIdParam);

    if (!project) {
      logger.warn(
        `[GETPROJECT_CTRL] Project not found in database with ID: ${projectIdParam}`
      );
      return next(
        new ErrorResponse(`Project not found with id of ${projectIdParam}`, 404)
      );
    }

    // DEBUG: Log the exact structure of the project object to understand the data format
    logger.info(
      `[GETPROJECT_CTRL] Project found. Analyzing structure for ID: ${projectIdParam}`
    );
    console.log('----------------------------------------------------');
    console.log('[DEBUG] SERVER getProject - Project Object Details:');
    console.log(
      '[DEBUG] Project ID from DB:',
      project._id ? project._id.toString() : 'N/A'
    );
    console.log(
      '[DEBUG] project.owner (type):',
      typeof project.owner,
      'Value:',
      project.owner
    );
    if (project.owner) {
      console.log('[DEBUG] project.owner._id (if exists):', project.owner._id);
      console.log(
        '[DEBUG] project.owner.toString() (if method exists):',
        typeof project.owner.toString === 'function'
          ? project.owner.toString()
          : 'N/A'
      );
    }
    console.log(
      '[DEBUG] project.members (type):',
      typeof project.members,
      'Is Array:',
      Array.isArray(project.members)
    );
    if (
      project.members &&
      Array.isArray(project.members) &&
      project.members.length > 0
    ) {
      console.log(
        '[DEBUG] First member (project.members[0]):',
        project.members[0]
      );
      if (project.members[0] && project.members[0].user) {
        console.log(
          "[DEBUG] First member's user (project.members[0].user) (type):",
          typeof project.members[0].user,
          'Value:',
          project.members[0].user
        );
        console.log(
          "[DEBUG] First member's user._id (if exists):",
          project.members[0].user._id
        );
      }
    }
    console.log(
      '[DEBUG] req.user.id (type):',
      typeof req.user.id,
      'Value:',
      req.user.id
    );
    console.log('----------------------------------------------------');

    // Safe permission checks that handle both populated and non-populated data
    const currentUserIdString = req.user.id.toString();
    let isOwner = false;
    let isMember = false;

    logger.info(
      `[GETPROJECT_CTRL] Performing permission checks for user: ${currentUserIdString} on project: ${project._id}`
    );

    // Check for Owner - handle multiple data structure possibilities
    try {
      if (project.owner) {
        if (typeof project.owner === 'object' && project.owner._id) {
          // Case 1: project.owner is a populated object (e.g., from .populate('owner'))
          isOwner = project.owner._id.toString() === currentUserIdString;
          logger.info(
            `[GETPROJECT_CTRL] Owner check (populated object): ${project.owner._id.toString()} vs ${currentUserIdString}. Is Owner: ${isOwner}`
          );
        } else if (project.owner.toString) {
          // Case 2: project.owner is an ObjectId or a string that can be converted
          isOwner = project.owner.toString() === currentUserIdString;
          logger.info(
            `[GETPROJECT_CTRL] Owner check (ObjectId/string): ${project.owner.toString()} vs ${currentUserIdString}. Is Owner: ${isOwner}`
          );
        } else {
          logger.warn(
            `[GETPROJECT_CTRL] project.owner exists but is not an object with _id nor an ObjectId/string. Owner value: ${project.owner}`
          );
        }
      } else {
        logger.warn(`[GETPROJECT_CTRL] project.owner is null or undefined.`);
      }
    } catch (ownerCheckError) {
      logger.error(`[GETPROJECT_CTRL] Error during owner permission check:`, {
        error: ownerCheckError.message,
        projectId: projectIdParam,
        userId: currentUserIdString,
        ownerValue: project.owner,
      });
    }

    // Check for Member - handle multiple member structure possibilities
    try {
      if (project.members && Array.isArray(project.members)) {
        isMember = project.members.some((member) => {
          if (member && member.user) {
            if (typeof member.user === 'object' && member.user._id) {
              // Case 1: member.user is a populated object
              return member.user._id.toString() === currentUserIdString;
            } else if (member.user.toString) {
              // Case 2: member.user is an ObjectId or a string
              return member.user.toString() === currentUserIdString;
            }
          } else if (member && (typeof member === 'string' || member._id)) {
            // Case 3: Old structure where member is directly the user ObjectId
            const memberId = member._id || member;
            return memberId.toString() === currentUserIdString;
          }
          return false;
        });
        logger.info(
          `[GETPROJECT_CTRL] Member check completed. Is Member: ${isMember}`
        );
      } else {
        logger.info(
          `[GETPROJECT_CTRL] project.members is null, undefined, or not an array.`
        );
      }
    } catch (memberCheckError) {
      logger.error(`[GETPROJECT_CTRL] Error during member permission check:`, {
        error: memberCheckError.message,
        projectId: projectIdParam,
        userId: currentUserIdString,
        membersValue: project.members,
      });
    }

    if (!isOwner && !isMember) {
      logger.warn(
        `[GETPROJECT_CTRL] Authorization failed for user ${currentUserIdString} to access project ${project._id}. isOwner: ${isOwner}, isMember: ${isMember}.`
      );
      return next(
        new ErrorResponse(
          `User ${req.user.id} is not authorized to access this project`,
          403
        )
      );
    }

    logger.info(
      `[GETPROJECT_CTRL] User ${currentUserIdString} authorized. Sending project data for ${project._id}.`
    );
    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (err) {
    logger.error(`Error in getProject for id: ${req.params.id}`, {
      error: { message: err.message, stack: err.stack, name: err.name },
      userId: req.user.id,
    });
    next(err);
  }
};

// @desc    Update project
// @route   PUT /api/v1/projects/:id
// @access  Private
export const updateProject = async (req, res, next) => {
  // Check if the user is a guest
  if (req.user && req.user.isGuest) {
    logger.warn('Guest user attempt to update project', {
      userId: req.user._id, // Guest ID
      projectId: req.params.id,
      action: 'update_project_denied_guest',
    });

    // Log this write attempt in analytics for tracking guest behavior
    await logGuestWriteAttempt(req, 'project_update');

    return res.status(403).json({
      success: false,
      message:
        'Guests are not allowed to update projects. Please log in or sign up.',
      notificationType: 'warning',
    });
  }

  try {
    logger.info(`Attempting to update project with ID: ${req.params.id}`, {
      userId: req.user.id,
      action: 'update_project',
      projectId: req.params.id,
    });

    let project = await Project.findById(req.params.id);

    logger.logDbOperation('findById', 'Project', !!project, null, {
      projectId: req.params.id,
      userId: req.user.id,
    });

    if (!project) {
      logger.warn(`Project not found for update: ${req.params.id}`, {
        userId: req.user.id,
      });

      return res.status(404).json({
        success: false,
        message: `Project not found with id of ${req.params.id}`,
        notificationType: 'error',
      });
    }

    // Check if the logged-in user is the owner (or has specific update permissions later)
    if (project.owner.toString() !== req.user.id) {
      logger.warn(`Unauthorized project update attempt`, {
        userId: req.user.id,
        projectId: req.params.id,
        projectOwner: project.owner,
      });

      // TODO: Add more granular permission checks later (e.g., allow members to update certain fields)
      return res.status(403).json({
        success: false,
        message: 'User not authorized to update this project',
        notificationType: 'error',
      });
    }

    // Keep track of original values for audit log
    const originalProject = {
      name: project.name,
      description: project.description,
      status: project.status,
      startDate: project.startDate,
      endDate: project.endDate,
      priority: project.priority,
      memberCount: project.members ? project.members.length : 0,
    };

    // Check if the status is being changed to 'Completed'
    const isMarkingAsCompleted =
      req.body.status === 'Completed' && project.status !== 'Completed';

    // Extract only allowed fields for update
    const { name, description, status, startDate, endDate, priority, members } =
      req.body;
    const updateData = {
      ...(name && { name }),
      ...(description && { description }),
      ...(status && { status }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
      ...(priority && { priority }),
      // Ensure owner remains a member if members array is updated
      ...(members && {
        members: [...new Set([project.owner.toString(), ...members])],
      }),
    };

    project = await Project.findByIdAndUpdate(req.params.id, updateData, {
      new: true, // Return the modified document
      runValidators: true, // Run schema validators on update
    });

    logger.logUpdate('project', project._id, req.user.id, {
      projectName: project.name,
      changedFields: Object.keys(updateData),
      originalValues: originalProject,
      newValues: {
        name: project.name,
        status: project.status,
        priority: project.priority,
        memberCount: project.members ? project.members.length : 0,
      },
    });

    // Add audit log for project update
    const { auditLog } = await import('../middleware/auditLogMiddleware.js');
    await auditLog(req, 'project_update', 'success', {
      projectId: project._id,
      projectName: project.name,
      changedFields: Object.keys(updateData),
      originalValues: originalProject,
      newMemberCount: project.members ? project.members.length : 0,
    });

    // Archive project if it's now marked as completed
    if (isMarkingAsCompleted) {
      try {
        // Import the archive controller functions
        const archiveController = await import('./archiveController.js');

        // Create archive entry for the project
        await archiveController.default.archiveItem(
          {
            body: {
              itemType: 'project',
              itemId: project._id,
            },
            user: req.user,
          },
          {
            status: () => ({
              json: () => {
                logger.info(
                  'Project archived after being marked as completed',
                  {
                    projectId: project._id,
                    userId: req.user.id,
                  }
                );
              },
            }),
          },
          () => {}
        );
      } catch (archiveErr) {
        logger.error('Failed to archive completed project', {
          error: archiveErr,
          projectId: project._id,
          userId: req.user.id,
        });
        // We don't want to fail the project update if archiving fails,
        // so we just log the error and continue
      }
    }

    res.status(200).json({
      success: true,
      data: project,
      message: `Project "${project.name}" updated successfully`,
      notificationType: 'success',
    });
  } catch (err) {
    logger.error('Failed to update project', {
      error: err,
      projectId: req.params.id,
      userId: req.user.id,
    });

    // Add audit log for failed project update
    const { auditLog } = await import('../middleware/auditLogMiddleware.js');
    await auditLog(req, 'project_update', 'failed', {
      projectId: req.params.id,
      error: err.message,
    });

    if (err.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: `Project not found with id of ${req.params.id}`,
        notificationType: 'error',
      });
    }
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((val) => val.message);
      logger.warn('Project validation error', {
        messages,
        userId: req.user.id,
        projectId: req.params.id,
      });

      return res.status(400).json({
        success: false,
        message: messages.join(', '),
        notificationType: 'error',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server Error updating project',
      notificationType: 'error',
    });
  }
};

// @desc    Delete project
// @route   DELETE /api/v1/projects/:id
// @access  Private
// @desc    Add member to project
// @route   POST /api/v1/projects/:id/members
// @access  Private
export const addProjectMember = async (req, res, next) => {
  try {
    const { user, role = 'contributor', permissions = {} } = req.body;
    const projectId = req.params.id;
    const invitedBy = req.user.id;

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    // Validate user exists
    const userExists = await User.findById(user);
    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const project = await projectService.addMember(
      projectId,
      { user, role, permissions },
      invitedBy,
      req
    );

    logger.info(`Member added to project`, {
      projectId,
      newMember: user,
      role,
      invitedBy,
    });

    res.status(200).json({
      success: true,
      message: 'Member added successfully',
      data: project,
    });
  } catch (error) {
    logger.error('Error adding project member:', error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Remove member from project
// @route   DELETE /api/v1/projects/:id/members/:userId
// @access  Private
export const removeProjectMember = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const userIdToRemove = req.params.userId;
    const removedBy = req.user.id;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Check permissions
    if (!projectService.hasPermission(project, removedBy, 'canManageMembers')) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to manage members',
      });
    }

    // Cannot remove the owner
    if (project.owner.toString() === userIdToRemove) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove project owner',
      });
    }

    // Remove the member
    project.members = project.members.filter(
      (member) => member.user.toString() !== userIdToRemove
    );

    await project.save();

    logger.info(`Member removed from project`, {
      projectId,
      removedMember: userIdToRemove,
      removedBy,
    });

    res.status(200).json({
      success: true,
      message: 'Member removed successfully',
      data: project,
    });
  } catch (error) {
    logger.error('Error removing project member:', error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get project statistics and analytics
// @route   GET /api/v1/projects/:id/stats
// @access  Private
export const getProjectStats = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.id;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Check if user has access to view project
    if (!projectService.hasPermission(project, userId, 'canViewAnalytics')) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to view project statistics',
      });
    }

    const stats = await projectService.getProjectStats(projectId);

    logger.info(`Project stats retrieved`, {
      projectId,
      requestedBy: userId,
    });

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Error getting project stats:', error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get project activity feed
// @route   GET /api/v1/projects/:id/activities
// @access  Private
export const getProjectActivities = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.id;
    const { limit = 20, offset = 0, type } = req.query;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Check if user has access to view project
    if (!projectService.hasPermission(project, userId, 'canViewAnalytics')) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to view project activities',
      });
    }

    // Build activity query
    const query = {
      'data.projectId': projectId,
      ...(type && { type }),
    };

    // For now, return basic activity structure
    // In a full implementation, this would query an Activity/AuditLog collection
    const activities = [
      {
        _id: `activity_${Date.now()}`,
        type: 'project_created',
        title: 'Project Created',
        description: `Project "${project.name}" was created`,
        user: project.owner,
        timestamp: project.createdAt,
        data: {
          projectId: project._id,
          projectName: project.name,
        },
      },
    ];

    logger.info(`Project activities retrieved`, {
      projectId,
      activityCount: activities.length,
      requestedBy: userId,
    });

    res.status(200).json({
      success: true,
      count: activities.length,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: activities.length,
      },
      data: activities,
    });
  } catch (error) {
    logger.error('Error getting project activities:', error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteProject = async (req, res, next) => {
  // Check if the user is a guest
  if (req.user && req.user.isGuest) {
    logger.warn('Guest user attempt to delete project', {
      userId: req.user._id, // Guest ID
      projectId: req.params.id,
      action: 'delete_project_denied_guest',
    });
    return res.status(403).json({
      success: false,
      message:
        'Guests are not allowed to delete projects. Please log in or sign up.',
      notificationType: 'warning',
    });
  }

  try {
    logger.info(`Attempting to delete project with ID: ${req.params.id}`, {
      userId: req.user.id,
      action: 'delete_project',
      projectId: req.params.id,
    });

    const project = await Project.findById(req.params.id);

    logger.logDbOperation('findById', 'Project', !!project, null, {
      projectId: req.params.id,
      userId: req.user.id,
    });

    if (!project) {
      logger.warn(`Project not found for deletion: ${req.params.id}`, {
        userId: req.user.id,
      });

      return res.status(404).json({
        success: false,
        message: `Project not found with id of ${req.params.id}`,
        notificationType: 'error',
      });
    }

    // Check if the logged-in user is the owner
    if (project.owner.toString() !== req.user.id) {
      logger.warn(`Unauthorized project deletion attempt`, {
        userId: req.user.id,
        projectId: req.params.id,
        projectOwner: project.owner,
      });

      return res.status(403).json({
        success: false,
        message: 'User not authorized to delete this project',
        notificationType: 'error',
      });
    }

    // Save project info for audit log before deletion
    const projectInfo = {
      id: project._id,
      name: project.name,
      memberCount: project.members ? project.members.length : 0,
      status: project.status,
      createdAt: project.createdAt,
    };

    // TODO: Decide on cascading delete behavior for associated Tasks/Notes.
    // For now, just delete the project document.
    // Option 1: Delete associated tasks/notes (requires importing models and deleting)
    // await Task.deleteMany({ project: project._id });
    // await Note.deleteMany({ task: { $in: tasks_associated_with_project } }); // More complex query needed

    // Option 2: Leave tasks/notes orphaned (simpler for now)

    await project.deleteOne(); // Use deleteOne() on the document instance

    // Log project deletion with enhanced logger
    logger.logDelete('project', projectInfo.id, req.user.id, {
      projectName: projectInfo.name,
      memberCount: projectInfo.memberCount,
      status: projectInfo.status,
      lifespanDays: Math.floor(
        (Date.now() - new Date(projectInfo.createdAt).getTime()) /
          (1000 * 60 * 60 * 24)
      ),
    });

    // Add audit log for project deletion (keep existing implementation)
    const { auditLog } = await import('../middleware/auditLogMiddleware.js');
    await auditLog(req, 'project_delete', 'success', {
      projectId: projectInfo.id,
      projectName: projectInfo.name,
      projectInfo: projectInfo,
    });

    res.status(200).json({
      success: true,
      data: {},
      message: `Project "${projectInfo.name}" deleted successfully`,
      notificationType: 'success',
    });
  } catch (err) {
    logger.error('Failed to delete project', {
      error: err,
      projectId: req.params.id,
      userId: req.user.id,
    });

    // Add audit log for failed project deletion
    const { auditLog } = await import('../middleware/auditLogMiddleware.js');
    await auditLog(req, 'project_delete', 'failed', {
      projectId: req.params.id,
      error: err.message,
    });

    if (err.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: `Project not found with id of ${req.params.id}`,
        notificationType: 'error',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server Error deleting project',
      notificationType: 'error',
    });
  }
};
