const Project = require('../models/Project');
const Task = require('../models/Task'); // Needed for calculating progress later
const User = require('../models/User'); // Needed for populating members/owner

// @desc    Get projects for logged-in user (member or owner)
// @route   GET /api/v1/projects
// @access  Private
exports.getProjects = async (req, res, next) => {
  try {
    // Find projects where the logged-in user is in the 'members' array
    const projects = await Project.find({ members: req.user.id })
      .populate('owner', 'name email')
      // .populate('members', 'name email') // Optional: populate all members
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: projects.length,
      data: projects,
    });
  } catch (err) {
    console.error('Get Projects Error:', err);
    res
      .status(500)
      .json({ success: false, message: 'Server Error fetching projects' });
  }
};

// @desc    Create new project
// @route   POST /api/v1/projects
// @access  Private
exports.createProject = async (req, res, next) => {
  try {
    // Add logged-in user as the owner
    req.body.owner = req.user.id;
    // The owner is automatically added to members by pre-save hook in model

    // Extract allowed fields
    const { name, description, status, startDate, endDate, members } = req.body;

    // Basic validation
    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: 'Project name is required' });
    }

    const projectData = {
      name,
      owner: req.user.id,
      ...(description && { description }),
      ...(status && { status }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
      // If members are provided in request, ensure owner is included
      members: members
        ? [...new Set([req.user.id.toString(), ...members])]
        : [req.user.id],
    };

    const project = await Project.create(projectData);

    // Add audit log for project creation
    const { auditLog } = require('../middleware/auditLogMiddleware');
    await auditLog(req, 'project_create', 'success', {
      projectId: project._id,
      projectName: project.name,
      memberCount: project.members.length,
    });

    res.status(201).json({
      success: true,
      data: project,
    });
  } catch (err) {
    console.error('Create Project Error:', err);
    // Add audit log for failed project creation
    const { auditLog } = require('../middleware/auditLogMiddleware');
    await auditLog(req, 'project_create', 'failed', {
      error: err.message,
      projectName: req.body.name,
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
      .json({ success: false, message: 'Server Error creating project' });
  }
};

// --- Implementation of remaining CRUD operations ---

// @desc    Get single project
// @route   GET /api/v1/projects/:id
// @access  Private
exports.getProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('members', 'name email'); // Populate details

    if (!project) {
      return res
        .status(404)
        .json({
          success: false,
          message: `Project not found with id of ${req.params.id}`,
        });
    }

    // Check if the logged-in user is a member of the project
    const isMember = project.members.some((member) =>
      member._id.equals(req.user.id)
    );
    if (!isMember) {
      return res
        .status(403)
        .json({
          success: false,
          message: 'User not authorized to access this project',
        });
    }

    res.status(200).json({ success: true, data: project });
  } catch (err) {
    console.error('Get Project Error:', err);
    // Handle invalid ObjectId format
    if (err.name === 'CastError') {
      return res
        .status(404)
        .json({
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
exports.updateProject = async (req, res, next) => {
  try {
    let project = await Project.findById(req.params.id);

    if (!project) {
      return res
        .status(404)
        .json({
          success: false,
          message: `Project not found with id of ${req.params.id}`,
        });
    }

    // Check if the logged-in user is the owner (or has specific update permissions later)
    if (project.owner.toString() !== req.user.id) {
      // TODO: Add more granular permission checks later (e.g., allow members to update certain fields)
      return res
        .status(403)
        .json({
          success: false,
          message: 'User not authorized to update this project',
        });
    }

    // Keep track of original values for audit log
    const originalProject = {
      name: project.name,
      description: project.description,
      status: project.status,
      startDate: project.startDate,
      endDate: project.endDate,
      memberCount: project.members ? project.members.length : 0,
    };

    // Extract only allowed fields for update
    const { name, description, status, startDate, endDate, members } = req.body;
    const updateData = {
      ...(name && { name }),
      ...(description && { description }),
      ...(status && { status }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
      // Ensure owner remains a member if members array is updated
      ...(members && {
        members: [...new Set([project.owner.toString(), ...members])],
      }),
    };

    project = await Project.findByIdAndUpdate(req.params.id, updateData, {
      new: true, // Return the modified document
      runValidators: true, // Run schema validators on update
    });

    // Add audit log for project update
    const { auditLog } = require('../middleware/auditLogMiddleware');
    await auditLog(req, 'project_update', 'success', {
      projectId: project._id,
      projectName: project.name,
      changedFields: Object.keys(updateData),
      originalValues: originalProject,
      newMemberCount: project.members ? project.members.length : 0,
    });

    res.status(200).json({ success: true, data: project });
  } catch (err) {
    console.error('Update Project Error:', err);

    // Add audit log for failed project update
    const { auditLog } = require('../middleware/auditLogMiddleware');
    await auditLog(req, 'project_update', 'failed', {
      projectId: req.params.id,
      error: err.message,
    });

    if (err.name === 'CastError') {
      return res
        .status(404)
        .json({
          success: false,
          message: `Project not found with id of ${req.params.id}`,
        });
    }
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((val) => val.message);
      return res
        .status(400)
        .json({ success: false, message: messages.join(', ') });
    }
    res
      .status(500)
      .json({ success: false, message: 'Server Error updating project' });
  }
};

// @desc    Delete project
// @route   DELETE /api/v1/projects/:id
// @access  Private
exports.deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res
        .status(404)
        .json({
          success: false,
          message: `Project not found with id of ${req.params.id}`,
        });
    }

    // Check if the logged-in user is the owner
    if (project.owner.toString() !== req.user.id) {
      return res
        .status(403)
        .json({
          success: false,
          message: 'User not authorized to delete this project',
        });
    }

    // Save project info for audit log before deletion
    const projectInfo = {
      id: project._id,
      name: project.name,
      memberCount: project.members ? project.members.length : 0,
      status: project.status,
    };

    // TODO: Decide on cascading delete behavior for associated Tasks/Notes.
    // For now, just delete the project document.
    // Option 1: Delete associated tasks/notes (requires importing models and deleting)
    // await Task.deleteMany({ project: project._id });
    // await Note.deleteMany({ task: { $in: tasks_associated_with_project } }); // More complex query needed

    // Option 2: Leave tasks/notes orphaned (simpler for now)

    await project.deleteOne(); // Use deleteOne() on the document instance

    // Add audit log for project deletion
    const { auditLog } = require('../middleware/auditLogMiddleware');
    await auditLog(req, 'project_delete', 'success', {
      projectId: projectInfo.id,
      projectName: projectInfo.name,
      projectInfo: projectInfo,
    });

    res.status(200).json({ success: true, data: {} }); // Send empty object on successful delete
  } catch (err) {
    console.error('Delete Project Error:', err);

    // Add audit log for failed project deletion
    const { auditLog } = require('../middleware/auditLogMiddleware');
    await auditLog(req, 'project_delete', 'failed', {
      projectId: req.params.id,
      error: err.message,
    });

    if (err.name === 'CastError') {
      return res
        .status(404)
        .json({
          success: false,
          message: `Project not found with id of ${req.params.id}`,
        });
    }
    res
      .status(500)
      .json({ success: false, message: 'Server Error deleting project' });
  }
};
