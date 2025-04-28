import Project from '../models/Project.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import { logger } from '../utils/logger.js';
import mongoose from 'mongoose';

// @desc    Get projects for logged-in user (member or owner)
// @route   GET /api/v1/projects
// @access  Private
export const getProjects = async (req, res, next) => {
  try {
    logger.info(`Attempting to fetch projects for user`, {
      userId: req.user.id,
      action: 'get_projects',
    });

    // Use MongoDB aggregation pipeline for better performance in a single query
    // This avoids multiple separate database calls that were causing slowness
    const projectsWithProgress = await Project.aggregate([
      // Match projects where the user is a member
      { $match: { members: mongoose.Types.ObjectId(req.user.id) } },

      // Look up project owner details
      {
        $lookup: {
          from: 'users',
          localField: 'owner',
          foreignField: '_id',
          as: 'ownerDetails',
        },
      },
      { $unwind: '$ownerDetails' },

      // Look up tasks for this project
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
                  $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] },
                },
              },
            },
          ],
          as: 'taskStats',
        },
      },

      // Calculate progress
      {
        $addFields: {
          taskStats: {
            $ifNull: [
              { $arrayElemAt: ['$taskStats', 0] },
              { total: 0, completed: 0 },
            ],
          },
          progress: {
            $cond: {
              if: {
                $gt: [
                  { $ifNull: [{ $arrayElemAt: ['$taskStats.total', 0] }, 0] },
                  0,
                ],
              },
              then: {
                $multiply: [
                  {
                    $divide: [
                      {
                        $ifNull: [
                          { $arrayElemAt: ['$taskStats.completed', 0] },
                          0,
                        ],
                      },
                      {
                        $ifNull: [{ $arrayElemAt: ['$taskStats.total', 0] }, 1],
                      },
                    ],
                  },
                  100,
                ],
              },
              else: 0,
            },
          },

          // Format the owner object to match the previous structure
          owner: {
            _id: '$ownerDetails._id',
            name: '$ownerDetails.name',
            email: '$ownerDetails.email',
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
          progress: { $round: ['$progress', 0] }, // Round to integer
        },
      },

      // Sort by most recent first
      { $sort: { createdAt: -1 } },
    ]);

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
      error: err,
      userId: req.user.id,
    });

    res
      .status(500)
      .json({ success: false, message: 'Server Error fetching projects' });
  }
};

// @desc    Create new project
// @route   POST /api/v1/projects
// @access  Private
export const createProject = async (req, res, next) => {
  try {
    logger.info(`Attempting to create new project`, {
      userId: req.user.id,
      action: 'create_project',
    });

    // Add logged-in user as the owner
    req.body.owner = req.user.id;
    // The owner is automatically added to members by pre-save hook in model

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

    const projectData = {
      name,
      owner: req.user.id,
      ...(description && { description }),
      ...(status && { status }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
      ...(priority && { priority }), // Add priority
      // If members are provided in request, ensure owner is included
      members: members
        ? [...new Set([req.user.id.toString(), ...members])]
        : [req.user.id],
    };

    const project = await Project.create(projectData);

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

    res.status(201).json({
      success: true,
      data: project,
      message: `Project "${project.name}" created successfully`,
      notificationType: 'success',
    });
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

// --- Implementation of remaining CRUD operations ---

// @desc    Get single project
// @route   GET /api/v1/projects/:id
// @access  Private
export const getProject = async (req, res, next) => {
  try {
    logger.verbose(`Attempting to fetch project with ID ${req.params.id}`, {
      userId: req.user.id,
      action: 'get_project',
      projectId: req.params.id,
    });

    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('members', 'name email'); // Populate details

    if (!project) {
      logger.warn(`Project not found with ID ${req.params.id}`, {
        userId: req.user.id,
        projectId: req.params.id,
      });

      return res.status(404).json({
        success: false,
        message: `Project not found with id of ${req.params.id}`,
      });
    }

    // Check if the logged-in user is a member of the project
    const isMember = project.members.some((member) =>
      member._id.equals(req.user.id)
    );
    if (!isMember) {
      logger.warn(`Unauthorized project access attempt`, {
        userId: req.user.id,
        projectId: req.params.id,
      });

      return res.status(403).json({
        success: false,
        message: 'User not authorized to access this project',
      });
    }

    // Compute progress for this project
    const totalTasks = await Task.countDocuments({ project: project._id });
    const completedTasks = await Task.countDocuments({
      project: project._id,
      status: 'Completed',
    });
    project._doc.progress =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    logger.info(`Successfully fetched project data`, {
      userId: req.user.id,
      projectId: project._id,
      projectName: project.name,
    });

    res.status(200).json({ success: true, data: project });
  } catch (err) {
    logger.error('Failed to fetch project', {
      error: err,
      userId: req.user.id,
      projectId: req.params.id,
    });

    // Handle invalid ObjectId format
    if (err.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: `Project not found with id of ${req.params.id}`,
      });
    }
    res
      .status(500)
      .json({ success: false, message: 'Server Error fetching project' });
  }
};

// @desc    Update project
// @route   PUT /api/v1/projects/:id
// @access  Private
export const updateProject = async (req, res, next) => {
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
export const deleteProject = async (req, res, next) => {
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
