// @desc    Bookmark controller for managing user bookmarks
import Bookmark from '../models/Bookmark.js';
import asyncHandler from '../middleware/async.js';
import ErrorResponse from '../utils/errorResponse.js';

// @desc    Get all bookmarks for a user
// @route   GET /api/v1/bookmarks
// @access  Private
export const getBookmarks = asyncHandler(async (req, res, next) => {
  // Find bookmarks for the current user
  const bookmarks = await Bookmark.find({ user: req.user.id });

  res.status(200).json({
    success: true,
    count: bookmarks.length,
    data: bookmarks,
  });
});

// @desc    Get single bookmark
// @route   GET /api/v1/bookmarks/:id
// @access  Private
export const getBookmark = asyncHandler(async (req, res, next) => {
  const bookmark = await Bookmark.findById(req.params.id);

  if (!bookmark) {
    return next(
      new ErrorResponse(`Bookmark not found with id of ${req.params.id}`, 404)
    );
  }

  // Ensure user owns the bookmark
  if (bookmark.user.toString() !== req.user.id) {
    return next(
      new ErrorResponse(`User not authorized to access this bookmark`, 401)
    );
  }

  res.status(200).json({
    success: true,
    data: bookmark,
  });
});

// @desc    Create new bookmark
// @route   POST /api/v1/bookmarks
// @access  Private
export const createBookmark = asyncHandler(async (req, res, next) => {
  // Add user ID to bookmark data
  req.body.user = req.user.id;

  const bookmark = await Bookmark.create(req.body);

  res.status(201).json({
    success: true,
    data: bookmark,
  });
});

// @desc    Update bookmark
// @route   PUT /api/v1/bookmarks/:id
// @access  Private
export const updateBookmark = asyncHandler(async (req, res, next) => {
  let bookmark = await Bookmark.findById(req.params.id);

  if (!bookmark) {
    return next(
      new ErrorResponse(`Bookmark not found with id of ${req.params.id}`, 404)
    );
  }

  // Ensure user owns the bookmark
  if (bookmark.user.toString() !== req.user.id) {
    return next(
      new ErrorResponse(`User not authorized to update this bookmark`, 401)
    );
  }

  bookmark = await Bookmark.findByIdAndUpdate(req.params.id, req.body, {
    new: true, // Return the updated document
    runValidators: true, // Run model validators
  });

  res.status(200).json({
    success: true,
    data: bookmark,
  });
});

// @desc    Delete bookmark
// @route   DELETE /api/v1/bookmarks/:id
// @access  Private
export const deleteBookmark = asyncHandler(async (req, res, next) => {
  const bookmark = await Bookmark.findById(req.params.id);

  if (!bookmark) {
    return next(
      new ErrorResponse(`Bookmark not found with id of ${req.params.id}`, 404)
    );
  }

  // Ensure user owns the bookmark
  if (bookmark.user.toString() !== req.user.id) {
    return next(
      new ErrorResponse(`User not authorized to delete this bookmark`, 401)
    );
  }

  await bookmark.deleteOne();

  res.status(200).json({
    success: true,
    data: {},
  });
});
