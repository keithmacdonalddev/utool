/**
 * snippetCategoryController.js - Controller handling CRUD operations for code snippet categories
 *
 * This controller provides methods to create, read, update, and delete snippet categories.
 * It separates business logic from route definitions and handles database operations
 * through the SnippetCategory model.
 *
 * @module controllers/snippetCategoryController
 */

import SnippetCategory from '../models/SnippetCategory.js';
import ErrorResponse from '../utils/errorResponse.js';
import asyncHandler from '../middleware/async.js';

/**
 * Get all snippet categories for the current user
 *
 * @route GET /api/v1/snippets/categories
 * @access Private
 * @returns {Array} Array of snippet category objects with snippetsCount populated
 */
export const getCategories = asyncHandler(async (req, res, next) => {
  // Find categories belonging to current user and populate the snippetsCount virtual
  const categories = await SnippetCategory.find({ user: req.user.id })
    .populate('snippetsCount')
    .sort({ name: 1 });

  res.status(200).json({
    success: true,
    count: categories.length,
    data: categories,
  });
});

/**
 * Get a single snippet category by ID
 *
 * @route GET /api/v1/snippets/categories/:id
 * @access Private
 * @param {string} req.params.id - The ID of the category to retrieve
 * @returns {Object} Snippet category object with snippetsCount populated
 */
export const getCategory = asyncHandler(async (req, res, next) => {
  const category = await SnippetCategory.findById(req.params.id).populate(
    'snippetsCount'
  );

  // Check if category exists
  if (!category) {
    return next(
      new ErrorResponse(`Category not found with id of ${req.params.id}`, 404)
    );
  }

  // Verify ownership
  if (category.user.toString() !== req.user.id) {
    return next(
      new ErrorResponse(`User not authorized to access this category`, 401)
    );
  }

  res.status(200).json({
    success: true,
    data: category,
  });
});

/**
 * Create a new snippet category
 *
 * @route POST /api/v1/snippets/categories
 * @access Private
 * @param {Object} req.body - Category data (name, description, color, icon)
 * @returns {Object} Newly created snippet category object
 */
export const createCategory = asyncHandler(async (req, res, next) => {
  // Add user ID to request body
  req.body.user = req.user.id;

  // Create category
  const category = await SnippetCategory.create(req.body);

  res.status(201).json({
    success: true,
    data: category,
  });
});

/**
 * Update a snippet category
 *
 * @route PUT /api/v1/snippets/categories/:id
 * @access Private
 * @param {string} req.params.id - The ID of the category to update
 * @param {Object} req.body - Updated category data
 * @returns {Object} Updated snippet category object
 */
export const updateCategory = asyncHandler(async (req, res, next) => {
  let category = await SnippetCategory.findById(req.params.id);

  // Check if category exists
  if (!category) {
    return next(
      new ErrorResponse(`Category not found with id of ${req.params.id}`, 404)
    );
  }

  // Verify ownership
  if (category.user.toString() !== req.user.id) {
    return next(
      new ErrorResponse(`User not authorized to update this category`, 401)
    );
  }

  // Update category
  category = await SnippetCategory.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: category,
  });
});

/**
 * Delete a snippet category
 *
 * @route DELETE /api/v1/snippets/categories/:id
 * @access Private
 * @param {string} req.params.id - The ID of the category to delete
 * @returns {Object} Success message
 */
export const deleteCategory = asyncHandler(async (req, res, next) => {
  const category = await SnippetCategory.findById(req.params.id);

  // Check if category exists
  if (!category) {
    return next(
      new ErrorResponse(`Category not found with id of ${req.params.id}`, 404)
    );
  }

  // Verify ownership
  if (category.user.toString() !== req.user.id) {
    return next(
      new ErrorResponse(`User not authorized to delete this category`, 401)
    );
  }

  // Remove category (this will trigger pre-remove middleware)
  await category.remove();

  res.status(200).json({
    success: true,
    data: {},
  });
});
