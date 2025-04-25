import mongoose from 'mongoose';

/**
 * ProjectNote Schema
 *
 * This model represents notes that are specific to projects.
 * These notes are only visible within their associated project.
 */
const ProjectNoteSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      default: '',
      trim: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    pinned: {
      type: Boolean,
      default: false,
    },
    color: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

// Compound index for faster queries by project and user
ProjectNoteSchema.index({ project: 1, user: 1 });

export default mongoose.model('ProjectNote', ProjectNoteSchema);
