import Note from '../models/Note.js';
import Task from '../models/Task.js';
import { logger } from '../utils/logger.js';
import { auditLog } from '../middleware/auditLogMiddleware.js';

// @desc    Get recent notes for logged-in user
// @route   GET /api/v1/notes/recent
// @access  Private
export const getRecentNotes = async (req, res, next) => {
  // Log attempted action
  logger.verbose('Attempting to fetch recent notes', {
    userId: req.user.id,
    req,
  });

  try {
    logger.logAccess('notes', null, req.user.id, { req });

    const notes = await Note.find({ user: req.user.id })
      .sort({ createdAt: -1 }) // Sort by newest first
      .limit(10); // Limit to recent notes (e.g., 10)

    logger.logDbOperation('find', 'Note', true, null, { count: notes.length });

    res.status(200).json({
      success: true,
      count: notes.length,
      data: notes,
    });
  } catch (err) {
    logger.error('Failed to fetch recent notes', {
      error: err,
      userId: req.user.id,
      req,
    });

    res.status(500).json({
      success: false,
      message: 'Server Error fetching recent notes',
      notificationType: 'error',
    });
  }
};

// @desc    Get notes for a specific task
// @route   GET /api/v1/tasks/:taskId/notes
// @access  Private
export const getNotesForTask = async (req, res, next) => {
  try {
    logger.logAccess('task notes', req.params.taskId, req.user.id, { req });

    // Check if the task exists and belongs to the user (or if user has access)
    const task = await Task.findById(req.params.taskId);

    logger.logDbOperation('findById', 'Task', !!task, null, {
      taskId: req.params.taskId,
    });

    if (!task) {
      logger.warn(`Task not found: ${req.params.taskId}`, {
        userId: req.user.id,
      });
      return res.status(404).json({
        success: false,
        message: 'Task not found',
        notificationType: 'error',
      });
    }

    // Ensure the logged-in user is the assignee of the task to view its notes
    if (task.assignee.toString() !== req.user.id) {
      logger.warn(`Unauthorized task notes access`, {
        userId: req.user.id,
        taskId: req.params.taskId,
        taskAssignee: task.assignee,
      });

      return res.status(403).json({
        success: false,
        message: 'User not authorized to access notes for this task',
        notificationType: 'error',
      });
    }

    // Find notes associated with the task ID
    const notes = await Note.find({ task: req.params.taskId }).sort({
      createdAt: -1,
    });

    logger.logDbOperation('find', 'Note', true, null, {
      count: notes.length,
      taskId: req.params.taskId,
    });

    res.status(200).json({
      success: true,
      count: notes.length,
      data: notes,
    });
  } catch (err) {
    logger.error('Failed to fetch task notes', {
      error: err,
      taskId: req.params.taskId,
      userId: req.user.id,
      req,
    });

    res.status(500).json({
      success: false,
      message: 'Server Error fetching notes',
      notificationType: 'error',
    });
  }
};

// @desc    Create a note for a specific task
// @route   POST /api/v1/tasks/:taskId/notes
// @access  Private
export const createNoteForTask = async (req, res, next) => {
  try {
    // Check if the task exists and belongs to the user (or if user has access)
    const task = await Task.findById(req.params.taskId);

    logger.logDbOperation('findById', 'Task', !!task, null, {
      taskId: req.params.taskId,
    });

    if (!task) {
      logger.warn(`Task not found for note creation: ${req.params.taskId}`, {
        userId: req.user.id,
      });
      return res.status(404).json({
        success: false,
        message: 'Task not found',
        notificationType: 'error',
      });
    }

    // Ensure the logged-in user is the assignee of the task to add notes
    if (task.assignee.toString() !== req.user.id) {
      logger.warn(`Unauthorized task note creation attempt`, {
        userId: req.user.id,
        taskId: req.params.taskId,
        taskAssignee: task.assignee,
      });

      return res.status(403).json({
        success: false,
        message: 'User not authorized to add notes to this task',
        notificationType: 'error',
      });
    }

    // Add user and task IDs to the request body before creating the note
    req.body.user = req.user.id;
    req.body.task = req.params.taskId;

    const { content } = req.body; // Extract allowed fields

    if (!content) {
      logger.warn('Empty note content submitted', {
        userId: req.user.id,
        taskId: req.params.taskId,
      });

      return res.status(400).json({
        success: false,
        message: 'Note content cannot be empty',
        notificationType: 'error',
      });
    }

    const noteData = {
      content,
      user: req.user.id,
      task: req.params.taskId,
    };

    const note = await Note.create(noteData);

    logger.logCreate('note', note._id, req.user.id, {
      taskId: req.params.taskId,
      contentLength: content.length,
      req,
    });

    await auditLog(req, 'note_create', 'success', { noteId: note._id });

    res.status(201).json({
      success: true,
      data: note,
      message: 'Note created successfully',
      notificationType: 'success',
    });
  } catch (err) {
    logger.error('Failed to create note', {
      error: err,
      taskId: req.params.taskId,
      userId: req.user.id,
      req,
    });

    await auditLog(req, 'note_create', 'failed', { error: err.message });

    // Handle Mongoose validation errors specifically
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((val) => val.message);

      logger.warn('Note validation error', {
        messages,
        userId: req.user.id,
        taskId: req.params.taskId,
      });

      return res.status(400).json({
        success: false,
        message: messages.join(', '),
        notificationType: 'error',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server Error creating note',
      notificationType: 'error',
    });
  }
};

// --- Placeholder functions for later ---
// exports.getNote = async (req, res, next) => { ... };
// exports.updateNote = async (req, res, next) => { ... };
// exports.deleteNote = async (req, res, next) => { ... };

// @desc    Get all notes for a specific user (Admin only)
// @route   GET /api/v1/admin/users/:userId/notes
// @access  Private/Admin
export const getUserNotes = async (req, res, next) => {
  try {
    const targetUserId = req.params.userId;

    // Optional: Check if user exists
    const targetUserExists = await User.findById(targetUserId);
    if (!targetUserExists) {
      return res.status(404).json({
        success: false,
        message: `User not found with id ${targetUserId}`,
      });
    }

    // Find notes created by the target user
    const notes = await Note.find({ user: targetUserId })
      .populate('task', 'title') // Populate task title
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: notes.length,
      data: notes,
    });
  } catch (err) {
    console.error('Get User Notes Error:', err);
    res
      .status(500)
      .json({ success: false, message: 'Server Error fetching user notes' });
  }
};

// @desc    Delete a note (move to trash)
// @route   DELETE /api/v1/notes/:id
// @access  Private
export const deleteNote = async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);

    logger.logDbOperation('findById', 'Note', !!note, null, {
      noteId: req.params.id,
    });

    if (!note) {
      logger.warn(`Note not found for deletion: ${req.params.id}`, {
        userId: req.user.id,
      });
      return res.status(404).json({
        success: false,
        message: 'Note not found',
        notificationType: 'error',
      });
    }

    // Check if user owns this note
    if (note.user.toString() !== req.user.id) {
      logger.warn(`Unauthorized note deletion attempt`, {
        userId: req.user.id,
        noteId: req.params.id,
        noteOwner: note.user,
      });

      return res.status(403).json({
        success: false,
        message: 'User not authorized to delete this note',
        notificationType: 'error',
      });
    }

    // Instead of permanently deleting, mark as deleted (soft delete)
    note.deletedAt = new Date();
    await note.save();

    logger.logUpdate('note', note._id, req.user.id, {
      action: 'trash',
      taskId: note.task,
      req,
    });

    await auditLog(req, 'note_delete', 'success', { noteId: note._id });

    res.status(200).json({
      success: true,
      data: {},
      message: 'Note moved to trash successfully',
      notificationType: 'success',
    });
  } catch (err) {
    logger.error('Failed to trash note', {
      error: err,
      noteId: req.params.id,
      userId: req.user.id,
      req,
    });

    await auditLog(req, 'note_delete', 'failed', { error: err.message });

    res.status(500).json({
      success: false,
      message: 'Server Error deleting note',
      notificationType: 'error',
    });
  }
};

// @desc    Permanently delete a note
// @route   DELETE /api/v1/notes/:id/permanent
// @access  Private
export const permanentlyDeleteNote = async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res
        .status(404)
        .json({ success: false, message: 'Note not found' });
    }

    // Check if user owns this note
    if (note.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'User not authorized to delete this note',
      });
    }

    // Permanently delete the note
    await note.deleteOne();

    await auditLog(req, 'note_delete', 'success', { noteId: note._id });

    res.status(200).json({
      success: true,
      data: {},
      message: 'Note permanently deleted',
    });
  } catch (err) {
    console.error('Permanently Delete Note Error:', err);

    await auditLog(req, 'note_delete', 'failed', { error: err.message });

    res.status(500).json({
      success: false,
      message: 'Server Error permanently deleting note',
    });
  }
};

// @desc    Restore a note from trash
// @route   PUT /api/v1/notes/:id/restore
// @access  Private
export const restoreNote = async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res
        .status(404)
        .json({ success: false, message: 'Note not found' });
    }

    // Check if user owns this note
    if (note.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'User not authorized to restore this note',
      });
    }

    // Restore by clearing deletedAt
    note.deletedAt = null;
    await note.save();

    res.status(200).json({
      success: true,
      data: note,
      message: 'Note restored successfully',
    });
  } catch (err) {
    console.error('Restore Note Error:', err);
    res
      .status(500)
      .json({ success: false, message: 'Server Error restoring note' });
  }
};

// @desc    Get all trashed notes for user
// @route   GET /api/v1/notes/trash
// @access  Private
export const getTrashedNotes = async (req, res, next) => {
  try {
    const notes = await Note.find({
      user: req.user.id,
      deletedAt: { $ne: null }, // Only get notes marked as deleted
    }).sort({ deletedAt: -1 }); // Sort by deletion date, newest first

    res.status(200).json({
      success: true,
      count: notes.length,
      data: notes,
    });
  } catch (err) {
    console.error('Get Trashed Notes Error:', err);
    res
      .status(500)
      .json({ success: false, message: 'Server Error fetching trashed notes' });
  }
};

// @desc    Empty trash (permanently delete all trashed notes)
// @route   DELETE /api/v1/notes/trash/empty
// @access  Private
export const emptyTrash = async (req, res, next) => {
  try {
    const result = await Note.deleteMany({
      user: req.user.id,
      deletedAt: { $ne: null }, // Only delete notes that are in trash
    });

    res.status(200).json({
      success: true,
      data: {
        deletedCount: result.deletedCount,
      },
      message: 'Trash emptied successfully',
    });
  } catch (err) {
    console.error('Empty Trash Error:', err);
    res
      .status(500)
      .json({ success: false, message: 'Server Error emptying trash' });
  }
};
