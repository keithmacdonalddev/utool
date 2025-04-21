import Project from '../models/Project.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import { logger } from '../utils/logger.js';

// @desc    Get projects for logged-in user (member or owner)
// @route   GET /api/v1/projects
// @access  Private
export const getProjects = async (req, res, next) => {
  try {
    logger.info(`Attempting to fetch projects for user`, {
      userId: req.user.id,
      action: 'get_projects',
    });

    // Find projects where the logged-in user is in the 'members' array
    const projects = await Project.find({ members: req.user.id })
      .populate('owner', 'name email')
      // .populate('members', 'name email') // Optional: populate all members
      .sort({ createdAt: -1 });

    // Calculate progress for each project
    const projectsWithProgress = await Promise.all(
      projects.map(async (proj) => {
        const total = await Task.countDocuments({ project: proj._id });
        const completed = await Task.countDocuments({
          project: proj._id,
          status: 'Completed',
        });
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { ...proj._doc, progress };
      })
    );

    logger.info(
      `Successfully fetched ${projectsWithProgress.length} projects`,
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
