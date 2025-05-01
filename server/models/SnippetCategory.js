/**
 * SnippetCategory.js - Mongoose model for code snippet categories
 *
 * This model defines the schema for organizing code snippets into categories.
 * Categories help users organize and quickly find their code snippets based on
 * programming language, technology, or any other custom categorization.
 *
 * @module models/SnippetCategory
 */

import mongoose from 'mongoose';

/**
 * Snippet Category Schema
 *
 * @typedef {Object} SnippetCategory
 * @property {string} name - The display name of the category (required)
 * @property {string} description - Optional description of what belongs in this category
 * @property {string} color - Optional color code to visually distinguish the category in UI
 * @property {string} icon - Optional icon name to visually represent the category
 * @property {mongoose.Types.ObjectId} user - Reference to the user who created this category
 * @property {Date} createdAt - Timestamp when the category was created
 * @property {Date} updatedAt - Timestamp when the category was last updated
 */
const SnippetCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: [50, 'Category name cannot be more than 50 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Description cannot be more than 200 characters'],
    },
    color: {
      type: String,
      default: '#607D8B', // Default to a neutral blue-gray color
    },
    icon: {
      type: String,
      default: 'code', // Default to a generic code icon
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/**
 * Add virtual field for snippets count
 * This allows us to get the number of snippets in a category without a separate query
 */
SnippetCategorySchema.virtual('snippetsCount', {
  ref: 'Snippet',
  localField: '_id',
  foreignField: 'category',
  count: true,
});

/**
 * Pre-remove hook to handle deletion of associated snippets
 * When a category is deleted, we can choose to either:
 * 1. Delete all snippets in that category
 * 2. Set their category to null (implemented here)
 */
SnippetCategorySchema.pre('remove', async function (next) {
  // Update all snippets that use this category to have no category
  await this.model('Snippet').updateMany(
    { category: this._id },
    { category: null }
  );
  next();
});

export default mongoose.model('SnippetCategory', SnippetCategorySchema);
