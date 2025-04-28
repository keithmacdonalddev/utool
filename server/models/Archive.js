import mongoose from 'mongoose';

/**
 * Archive Schema
 *
 * This model represents archived completed items from across the application.
 * It uses a generic structure to store different types of items (tasks, projects, notes)
 * and includes metadata for analysis and productivity tracking.
 */
const ArchiveSchema = new mongoose.Schema(
  {
    // The user who completed the item
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Type of item archived (task, project, note, etc.)
    itemType: {
      type: String,
      required: true,
      enum: ['task', 'project', 'note', 'bookmark', 'snippet'],
      index: true,
    },
    // Original ID from the source collection
    originalId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    // Title or name of the item
    title: {
      type: String,
      required: true,
    },
    // Optional description
    description: {
      type: String,
      default: '',
    },
    // Original creation date of the item
    createdAt: {
      type: Date,
      required: true,
    },
    // When the item was marked as completed
    completedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    // Time it took to complete (in milliseconds)
    completionTime: {
      type: Number,
    },
    // Associated project (if applicable)
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      index: true,
    },
    // Priority level of the task/project (if applicable)
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
    },
    // Additional metadata about the archived item (flexible structure)
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true, // Adds updatedAt field
  }
);

// Compound indices for querying common patterns
ArchiveSchema.index({ user: 1, itemType: 1, completedAt: -1 });
ArchiveSchema.index({ user: 1, completedAt: -1 });

export default mongoose.model('Archive', ArchiveSchema);
