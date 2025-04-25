import ProjectNote from '../models/ProjectNote.js';
import Project from '../models/Project.js';
import ErrorResponse from '../utils/errorResponse.js';
import { logger } from '../utils/logger.js';

/**
 * @desc    Get all notes for a specific project
 * @route   GET /api/v1/projects/:projectId/notes
 * @access  Private
 */
export const getProjectNotes = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    // Verify project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return next(
        new ErrorResponse(`Project not found with id of ${projectId}`, 404)
      );
    }

    // Check if user has access to this project
    const isMember = project.members.some(
      (memberId) => memberId.toString() === req.user.id
    );
    const isOwner = project.owner.toString() === req.user.id;

    if (!isOwner && !isMember) {
      return next(
        new ErrorResponse(
          `Not authorized to access notes for this project`,
          403
        )
      );
    }

    // Get all notes for this project
    const notes = await ProjectNote.find({
      project: projectId,
    }).sort({ pinned: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: notes.length,
      data: notes,
    });
  } catch (err) {
    logger.error('Error fetching project notes', {
      error: err,
      userId: req.user.id,
    });
    next(err);
  }
};

/**
 * @desc    Create a new note for a project
 * @route   POST /api/v1/projects/:projectId/notes
 * @access  Private
 */
export const createProjectNote = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    // Verify project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return next(
        new ErrorResponse(`Project not found with id of ${projectId}`, 404)
      );
    }

    // Check if user has access to this project
    const isMember = project.members.some(
      (memberId) => memberId.toString() === req.user.id
    );
    const isOwner = project.owner.toString() === req.user.id;

    if (!isOwner && !isMember) {
      return next(
        new ErrorResponse(`Not authorized to add notes to this project`, 403)
      );
    }

    // Create the note
    const note = await ProjectNote.create({
      ...req.body,
      user: req.user.id,
      project: projectId,
    });

    res.status(201).json({
      success: true,
      data: note,
    });
  } catch (err) {
    logger.error('Error creating project note', {
      error: err,
      userId: req.user.id,
    });
    next(err);
  }
};

/**
 * @desc    Get a single project note
 * @route   GET /api/v1/projects/:projectId/notes/:id
 * @access  Private
 */
export const getProjectNote = async (req, res, next) => {
  try {
    const { projectId, id } = req.params;

    // Find note and check if it exists
    const note = await ProjectNote.findOne({
      _id: id,
      project: projectId,
    });

    if (!note) {
      return next(new ErrorResponse(`Note not found with id of ${id}`, 404));
    }

    // Verify project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return next(
        new ErrorResponse(`Project not found with id of ${projectId}`, 404)
      );
    }

    // Check if user has access to this project
    const isMember = project.members.some(
      (memberId) => memberId.toString() === req.user.id
    );
    const isOwner = project.owner.toString() === req.user.id;

    if (!isOwner && !isMember) {
      return next(
        new ErrorResponse(`Not authorized to view notes for this project`, 403)
      );
    }

    res.status(200).json({
      success: true,
      data: note,
    });
  } catch (err) {
    logger.error('Error fetching project note', {
      error: err,
      userId: req.user.id,
    });
    next(err);
  }
};

/**
 * @desc    Update a project note
 * @route   PUT /api/v1/projects/:projectId/notes/:id
 * @access  Private
 */
export const updateProjectNote = async (req, res, next) => {
  try {
    const { projectId, id } = req.params;

    // Find note
    let note = await ProjectNote.findById(id);

    if (!note) {
      return next(new ErrorResponse(`Note not found with id of ${id}`, 404));
    }

    // Verify project exists and note belongs to this project
    if (note.project.toString() !== projectId) {
      return next(new ErrorResponse(`Note not found in this project`, 404));
    }

    // Check if user created this note or has project access
    const project = await Project.findById(projectId);
    const isMember = project.members.some(
      (memberId) => memberId.toString() === req.user.id
    );
    const isOwner = project.owner.toString() === req.user.id;
    const isNoteCreator = note.user.toString() === req.user.id;

    if (!isOwner && !isMember && !isNoteCreator) {
      return next(new ErrorResponse(`Not authorized to update this note`, 403));
    }

    // Update the note
    note = await ProjectNote.findByIdAndUpdate(id, req.body, {
      new: true, // Return the updated document
      runValidators: true, // Run model validators
    });

    res.status(200).json({
      success: true,
      data: note,
    });
  } catch (err) {
    logger.error('Error updating project note', {
      error: err,
      userId: req.user.id,
    });
    next(err);
  }
};

/**
 * @desc    Delete a project note
 * @route   DELETE /api/v1/projects/:projectId/notes/:id
 * @access  Private
 */
export const deleteProjectNote = async (req, res, next) => {
  try {
    const { projectId, id } = req.params;

    // Find note
    const note = await ProjectNote.findById(id);

    if (!note) {
      return next(new ErrorResponse(`Note not found with id of ${id}`, 404));
    }

    // Verify project exists and note belongs to this project
    if (note.project.toString() !== projectId) {
      return next(new ErrorResponse(`Note not found in this project`, 404));
    }

    // Check if user created this note or has project ownership
    const project = await Project.findById(projectId);
    const isOwner = project.owner.toString() === req.user.id;
    const isNoteCreator = note.user.toString() === req.user.id;

    if (!isOwner && !isNoteCreator) {
      return next(new ErrorResponse(`Not authorized to delete this note`, 403));
    }

    // Delete the note
    await note.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    logger.error('Error deleting project note', {
      error: err,
      userId: req.user.id,
    });
    next(err);
  }
};

/**
 * @desc    Toggle pin status of a project note
 * @route   PATCH /api/v1/projects/:projectId/notes/:id/toggle-pin
 * @access  Private
 */
export const togglePinProjectNote = async (req, res, next) => {
  try {
    const { projectId, id } = req.params;

    // Find note
    let note = await ProjectNote.findById(id);

    if (!note) {
      return next(new ErrorResponse(`Note not found with id of ${id}`, 404));
    }

    // Verify project exists and note belongs to this project
    if (note.project.toString() !== projectId) {
      return next(new ErrorResponse(`Note not found in this project`, 404));
    }

    // Check if user created this note or has project access
    const project = await Project.findById(projectId);
    const isMember = project.members.some(
      (memberId) => memberId.toString() === req.user.id
    );
    const isOwner = project.owner.toString() === req.user.id;
    const isNoteCreator = note.user.toString() === req.user.id;

    if (!isOwner && !isMember && !isNoteCreator) {
      return next(new ErrorResponse(`Not authorized to update this note`, 403));
    }

    // Toggle the pin status
    note = await ProjectNote.findByIdAndUpdate(
      id,
      { pinned: !note.pinned },
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      data: note,
    });
  } catch (err) {
    logger.error('Error toggling project note pin status', {
      error: err,
      userId: req.user.id,
    });
    next(err);
  }
};
