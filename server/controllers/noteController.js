const Note = require('../models/Note');
const Task = require('../models/Task');

// @desc    Get recent notes for logged-in user
// @route   GET /api/v1/notes/recent
// @access  Private
exports.getRecentNotes = async (req, res, next) => {
  try {
    const notes = await Note.find({ user: req.user.id })
      .sort({ createdAt: -1 }) // Sort by newest first
      .limit(10); // Limit to recent notes (e.g., 10)

    res.status(200).json({
      success: true,
      count: notes.length,
      data: notes,
    });
  } catch (err) {
    console.error('Get Recent Notes Error:', err);
    res
      .status(500)
      .json({ success: false, message: 'Server Error fetching recent notes' });
  }
};

// @desc    Get notes for a specific task
// @route   GET /api/v1/tasks/:taskId/notes
// @access  Private
exports.getNotesForTask = async (req, res, next) => {
  try {
    // Check if the task exists and belongs to the user (or if user has access)
    const task = await Task.findById(req.params.taskId);

    if (!task) {
      return res
        .status(404)
        .json({ success: false, message: 'Task not found' });
    }

    // Ensure the logged-in user is the assignee of the task to view its notes
    // (Adjust authorization logic later based on roles/permissions if needed)
    if (task.assignee.toString() !== req.user.id) {
      return res
        .status(403)
        .json({
          success: false,
          message: 'User not authorized to access notes for this task',
        });
    }

    // Find notes associated with the task ID
    const notes = await Note.find({ task: req.params.taskId }).sort({
      createdAt: -1,
    }); // Sort by newest first

    res.status(200).json({
      success: true,
      count: notes.length,
      data: notes,
    });
  } catch (err) {
    console.error('Get Notes Error:', err);
    res
      .status(500)
      .json({ success: false, message: 'Server Error fetching notes' });
  }
};

// @desc    Create a note for a specific task
// @route   POST /api/v1/tasks/:taskId/notes
// @access  Private
exports.createNoteForTask = async (req, res, next) => {
  try {
    // Check if the task exists and belongs to the user (or if user has access)
    const task = await Task.findById(req.params.taskId);

    if (!task) {
      return res
        .status(404)
        .json({ success: false, message: 'Task not found' });
    }

    // Ensure the logged-in user is the assignee of the task to add notes
    // (Adjust authorization logic later based on roles/permissions if needed)
    if (task.assignee.toString() !== req.user.id) {
      return res
        .status(403)
        .json({
          success: false,
          message: 'User not authorized to add notes to this task',
        });
    }

    // Add user and task IDs to the request body before creating the note
    req.body.user = req.user.id;
    req.body.task = req.params.taskId;

    const { content } = req.body; // Extract allowed fields

    if (!content) {
      return res
        .status(400)
        .json({ success: false, message: 'Note content cannot be empty' });
    }

    const noteData = {
      content,
      user: req.user.id,
      task: req.params.taskId,
    };

    const note = await Note.create(noteData);

    // Optional: Add the note reference to the task's notes array
    // task.notes.push(note._id);
    // await task.save(); // Consider if this is necessary or handled differently

    res.status(201).json({
      success: true,
      data: note,
    });
  } catch (err) {
    console.error('Create Note Error:', err);
    // Handle Mongoose validation errors specifically
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((val) => val.message);
      return res
        .status(400)
        .json({ success: false, message: messages.join(', ') });
    }
    res
      .status(500)
      .json({ success: false, message: 'Server Error creating note' });
  }
};

// --- Placeholder functions for later ---
// exports.getNote = async (req, res, next) => { ... };
// exports.updateNote = async (req, res, next) => { ... };
// exports.deleteNote = async (req, res, next) => { ... };

// @desc    Get all notes for a specific user (Admin only)
// @route   GET /api/v1/admin/users/:userId/notes
// @access  Private/Admin
exports.getUserNotes = async (req, res, next) => {
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
exports.deleteNote = async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res
        .status(404)
        .json({ success: false, message: 'Note not found' });
    }

    // Check if user owns this note
    if (note.user.toString() !== req.user.id) {
      return res
        .status(403)
        .json({
          success: false,
          message: 'User not authorized to delete this note',
        });
    }

    // Instead of permanently deleting, mark as deleted (soft delete)
    note.deletedAt = new Date();
    await note.save();

    res.status(200).json({
      success: true,
      data: {},
      message: 'Note moved to trash successfully',
    });
  } catch (err) {
    console.error('Delete Note Error:', err);
    res
      .status(500)
      .json({ success: false, message: 'Server Error deleting note' });
  }
};

// @desc    Permanently delete a note
// @route   DELETE /api/v1/notes/:id/permanent
// @access  Private
exports.permanentlyDeleteNote = async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res
        .status(404)
        .json({ success: false, message: 'Note not found' });
    }

    // Check if user owns this note
    if (note.user.toString() !== req.user.id) {
      return res
        .status(403)
        .json({
          success: false,
          message: 'User not authorized to delete this note',
        });
    }

    // Permanently delete the note
    await note.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
      message: 'Note permanently deleted',
    });
  } catch (err) {
    console.error('Permanently Delete Note Error:', err);
    res
      .status(500)
      .json({
        success: false,
        message: 'Server Error permanently deleting note',
      });
  }
};

// @desc    Restore a note from trash
// @route   PUT /api/v1/notes/:id/restore
// @access  Private
exports.restoreNote = async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res
        .status(404)
        .json({ success: false, message: 'Note not found' });
    }

    // Check if user owns this note
    if (note.user.toString() !== req.user.id) {
      return res
        .status(403)
        .json({
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
exports.getTrashedNotes = async (req, res, next) => {
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
exports.emptyTrash = async (req, res, next) => {
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
