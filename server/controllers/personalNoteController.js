const Note = require('../models/Note');
const User = require('../models/User');

// Utility: Build query for filtering, searching, sorting
function buildNotesQuery({ userId, isAdmin, filters = {}, search, sort }) {
  const query = {};
  if (!isAdmin) {
    query.user = userId;
  } else if (filters.user) {
    query.user = filters.user;
  }
  if (filters.archived !== undefined) query.archived = filters.archived;
  if (filters.pinned !== undefined) query.pinned = filters.pinned;
  if (filters.favorite !== undefined) query.favorite = filters.favorite;
  if (filters.deleted !== undefined) {
    query.deletedAt = filters.deleted ? { $ne: null } : null;
  }
  if (filters.tags) {
    query.tags = { $in: filters.tags };
  }
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } },
    ];
  }
  return query;
}

/**
 * Personal Notes Controller (robust logging added)
 */

// @desc    List notes (with filter/sort/search)
// @route   GET /api/notes
// @access  Private (user) / Admin (all)
exports.getNotes = async (req, res) => {
  console.log(`[NOTES] GET /api/v1/notes called by user ${req.user?._id} (${req.user?.email}), query:`, req.query);
  try {
    const isAdmin = req.user && req.user.role === 'admin';
    const {
      archived,
      pinned,
      favorite,
      deleted,
      tags,
      search,
      sort = '-updatedAt',
      limit = 50,
      page = 1,
    } = req.query;

    const filters = {};
    if (archived !== undefined) filters.archived = archived === 'true';
    if (pinned !== undefined) filters.pinned = pinned === 'true';
    if (favorite !== undefined) filters.favorite = favorite === 'true';
    if (deleted !== undefined) filters.deleted = deleted === 'true';
    if (tags) filters.tags = Array.isArray(tags) ? tags : [tags];

    const query = buildNotesQuery({
      userId: req.user._id,
      isAdmin,
      filters,
      search,
    });

    const notes = await Note.find(query)
      .sort(sort)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    res.json({ success: true, count: notes.length, data: notes });
  } catch (err) {
    console.error('[NOTES] Error in getNotes:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// @desc    Create new note
// @route   POST /api/notes
// @access  Private
exports.createNote = async (req, res) => {
  console.log(`[NOTES] POST /api/v1/notes called by user ${req.user?._id} (${req.user?.email}), body:`, req.body);
  try {
    const { title, content, tags, pinned, favorite, archived, reminder, color } = req.body;
    const note = await Note.create({
      title,
      content,
      tags,
      pinned,
      favorite,
      archived,
      reminder,
      color,
      user: req.user._id,
    });
    console.log(`[NOTES] Note created with id ${note._id} by user ${req.user?._id}`);
    res.status(201).json({ success: true, data: note });
  } catch (err) {
    console.error('[NOTES] Error in createNote:', err);
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc    Get single note
// @route   GET /api/notes/:id
// @access  Private (owner) / Admin
exports.getNote = async (req, res) => {
  console.log(`[NOTES] GET /api/v1/notes/${req.params.id} called by user ${req.user?._id} (${req.user?.email})`);
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      console.warn(`[NOTES] Note not found: ${req.params.id}`);
      return res.status(404).json({ success: false, message: 'Note not found' });
    }
    if (
      note.user.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      console.warn(`[NOTES] Unauthorized access attempt to note ${req.params.id} by user ${req.user?._id}`);
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    res.json({ success: true, data: note });
  } catch (err) {
    console.error('[NOTES] Error in getNote:', err);
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc    Update note
// @route   PUT /api/notes/:id
// @access  Private (owner) / Admin
exports.updateNote = async (req, res) => {
  console.log(`[NOTES] PUT /api/v1/notes/${req.params.id} called by user ${req.user?._id} (${req.user?.email}), body:`, req.body);
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      console.warn(`[NOTES] Note not found for update: ${req.params.id}`);
      return res.status(404).json({ success: false, message: 'Note not found' });
    }
    if (
      note.user.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      console.warn(`[NOTES] Unauthorized update attempt to note ${req.params.id} by user ${req.user?._id}`);
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const updatableFields = [
      'title',
      'content',
      'tags',
      'pinned',
      'favorite',
      'archived',
      'reminder',
      'color',
    ];
    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) note[field] = req.body[field];
    });
    await note.save();
    console.log(`[NOTES] Note updated: ${note._id}`);
    res.json({ success: true, data: note });
  } catch (err) {
    console.error('[NOTES] Error in updateNote:', err);
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc    Soft delete note
// @route   DELETE /api/notes/:id
// @access  Private (owner) / Admin
exports.softDeleteNote = async (req, res) => {
  console.log(`[NOTES] DELETE (soft) /api/v1/notes/${req.params.id} called by user ${req.user?._id} (${req.user?.email})`);
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      console.warn(`[NOTES] Note not found for soft delete: ${req.params.id}`);
      return res.status(404).json({ success: false, message: 'Note not found' });
    }
    if (
      note.user.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      console.warn(`[NOTES] Unauthorized soft delete attempt to note ${req.params.id} by user ${req.user?._id}`);
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    note.deletedAt = new Date();
    await note.save();
    console.log(`[NOTES] Note soft-deleted: ${note._id}`);
    res.json({ success: true, data: note });
  } catch (err) {
    console.error('[NOTES] Error in softDeleteNote:', err);
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc    Restore soft-deleted note
// @route   PATCH /api/notes/:id/restore
// @access  Private (owner) / Admin
exports.restoreNote = async (req, res) => {
  console.log(`[NOTES] PATCH /api/v1/notes/${req.params.id}/restore called by user ${req.user?._id} (${req.user?.email})`);
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      console.warn(`[NOTES] Note not found for restore: ${req.params.id}`);
      return res.status(404).json({ success: false, message: 'Note not found' });
    }
    if (
      note.user.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      console.warn(`[NOTES] Unauthorized restore attempt to note ${req.params.id} by user ${req.user?._id}`);
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    note.deletedAt = null;
    await note.save();
    console.log(`[NOTES] Note restored: ${note._id}`);
    res.json({ success: true, data: note });
  } catch (err) {
    console.error('[NOTES] Error in restoreNote:', err);
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc    Hard delete note (permanent)
// @route   DELETE /api/notes/:id/permanent
// @access  Private (owner) / Admin
exports.hardDeleteNote = async (req, res) => {
  console.log(`[NOTES] DELETE (hard) /api/v1/notes/${req.params.id}/permanent called by user ${req.user?._id} (${req.user?.email})`);
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      console.warn(`[NOTES] Note not found for hard delete: ${req.params.id}`);
      return res.status(404).json({ success: false, message: 'Note not found' });
    }
    if (
      note.user.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      console.warn(`[NOTES] Unauthorized hard delete attempt to note ${req.params.id} by user ${req.user?._id}`);
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    await note.deleteOne();
    console.log(`[NOTES] Note permanently deleted: ${note._id}`);
    res.json({ success: true, message: 'Note permanently deleted' });
  } catch (err) {
    console.error('[NOTES] Error in hardDeleteNote:', err);
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc    Admin: Get all notes (with filters)
// @route   GET /api/admin/notes
// @access  Private/Admin
exports.adminGetAllNotes = async (req, res) => {
  console.log(`[NOTES] ADMIN GET /api/admin/notes called by user ${req.user?._id} (${req.user?.email}), query:`, req.query);
  try {
    if (req.user.role !== 'admin') {
      console.warn(`[NOTES] Unauthorized admin notes access attempt by user ${req.user?._id}`);
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const {
      archived,
      pinned,
      favorite,
      deleted,
      tags,
      search,
      sort = '-updatedAt',
      limit = 50,
      page = 1,
      user,
    } = req.query;

    const filters = {};
    if (archived !== undefined) filters.archived = archived === 'true';
    if (pinned !== undefined) filters.pinned = pinned === 'true';
    if (favorite !== undefined) filters.favorite = favorite === 'true';
    if (deleted !== undefined) filters.deleted = deleted === 'true';
    if (tags) filters.tags = Array.isArray(tags) ? tags : [tags];
    if (user) filters.user = user;

    const query = buildNotesQuery({
      isAdmin: true,
      filters,
      search,
    });

    const notes = await Note.find(query)
      .sort(sort)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    console.log(`[NOTES] Admin fetched ${notes.length} notes`);
    res.json({ success: true, count: notes.length, data: notes });
  } catch (err) {
    console.error('[NOTES] Error in adminGetAllNotes:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};
