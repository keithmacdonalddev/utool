// @desc    Snippet controller for managing reusable content snippets (text, code, prompts, etc.)
import Snippet from '../models/Snippet.js';
import asyncHandler from '../middleware/async.js';
import ErrorResponse from '../utils/errorResponse.js';

// @desc    Get all snippets for a user
// @route   GET /api/v1/snippets
// @access  Private
export const getSnippets = asyncHandler(async (req, res, next) => {
  // Find snippets for the current user
  const snippets = await Snippet.find({ user: req.user.id });

  res.status(200).json({
    success: true,
    count: snippets.length,
    data: snippets,
  });
});

// @desc    Get single snippet
// @route   GET /api/v1/snippets/:id
// @access  Private
export const getSnippet = asyncHandler(async (req, res, next) => {
  const snippet = await Snippet.findById(req.params.id);

  if (!snippet) {
    return next(
      new ErrorResponse(`Snippet not found with id of ${req.params.id}`, 404)
    );
  }

  // Ensure user owns the snippet
  if (snippet.user.toString() !== req.user.id) {
    return next(
      new ErrorResponse(`User not authorized to access this snippet`, 401)
    );
  }

  res.status(200).json({
    success: true,
    data: snippet,
  });
});

// @desc    Create new snippet
// @route   POST /api/v1/snippets
// @access  Private
export const createSnippet = asyncHandler(async (req, res, next) => {
  // Check if the user is a guest
  if (req.user && req.user.isGuest) {
    return res.status(403).json({
      success: false,
      message:
        'Guests are not allowed to create snippets. Please log in or sign up.',
      notificationType: 'warning',
    });
  }

  // Add user ID to snippet data
  req.body.user = req.user.id;

  const snippet = await Snippet.create(req.body);

  res.status(201).json({
    success: true,
    data: snippet,
  });
});

// @desc    Update snippet
// @route   PUT /api/v1/snippets/:id
// @access  Private
export const updateSnippet = asyncHandler(async (req, res, next) => {
  // Check if the user is a guest
  if (req.user && req.user.isGuest) {
    return res.status(403).json({
      success: false,
      message:
        'Guests are not allowed to update snippets. Please log in or sign up.',
      notificationType: 'warning',
    });
  }

  let snippet = await Snippet.findById(req.params.id);

  if (!snippet) {
    return next(
      new ErrorResponse(`Snippet not found with id of ${req.params.id}`, 404)
    );
  }

  // Ensure user owns the snippet
  if (snippet.user.toString() !== req.user.id) {
    return next(
      new ErrorResponse(`User not authorized to update this snippet`, 401)
    );
  }

  snippet = await Snippet.findByIdAndUpdate(req.params.id, req.body, {
    new: true, // Return the updated document
    runValidators: true, // Run model validators
  });

  res.status(200).json({
    success: true,
    data: snippet,
  });
});

// @desc    Delete snippet
// @route   DELETE /api/v1/snippets/:id
// @access  Private
export const deleteSnippet = asyncHandler(async (req, res, next) => {
  // Check if the user is a guest
  if (req.user && req.user.isGuest) {
    return res.status(403).json({
      success: false,
      message:
        'Guests are not allowed to delete snippets. Please log in or sign up.',
      notificationType: 'warning',
    });
  }

  const snippet = await Snippet.findById(req.params.id);

  if (!snippet) {
    return next(
      new ErrorResponse(`Snippet not found with id of ${req.params.id}`, 404)
    );
  }

  // Ensure user owns the snippet
  if (snippet.user.toString() !== req.user.id) {
    return next(
      new ErrorResponse(`User not authorized to delete this snippet`, 401)
    );
  }

  await snippet.deleteOne();

  res.status(200).json({
    success: true,
    data: {},
  });
});
