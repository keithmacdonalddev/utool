// Task.js - MongoDB/Mongoose data model for tasks
// This file defines the schema (structure) for task documents in MongoDB

import mongoose from 'mongoose'; // Import Mongoose ODM library
const { Schema } = mongoose;

/**
 * Enhanced Task Schema for Advanced Task Management System
 *
 * This schema supports all advanced features including:
 * - Hierarchical task structure (parent/child relationships)
 * - Task dependencies and blocking
 * - Time tracking with entries
 * - File attachments and comments
 * - Recurring task patterns
 * - Custom fields and metadata
 * - Activity tracking and analytics
 */
const taskSchema = new Schema(
  {
    // ===== CORE INFORMATION =====
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxLength: [500, 'Title cannot exceed 500 characters'],
      index: true,
    },
    description: {
      type: String,
      maxLength: [5000, 'Description cannot exceed 5000 characters'],
      trim: true,
    },

    // ===== PROJECT & ORGANIZATION =====
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project association is required'],
      index: true,
    },
    parentTask: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      default: null, // null means it's a top-level task
      index: true,
    },
    subtasks: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Task',
      },
    ],

    // ===== ASSIGNMENT & OWNERSHIP =====
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required'],
      index: true,
    },
    assignee: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    assignedAt: { type: Date },

    // ===== STATUS & PROGRESS =====
    status: {
      type: String,
      enum: [
        'todo',
        'in-progress',
        'in-review',
        'blocked',
        'done',
        'cancelled',
      ],
      default: 'todo',
      index: true,
    },
    progress: {
      percentage: { type: Number, default: 0, min: 0, max: 100 },
      automatic: { type: Boolean, default: true }, // Auto-calculate from subtasks
      lastUpdated: { type: Date, default: Date.now },
    },
    completedAt: { type: Date },
    completedBy: { type: Schema.Types.ObjectId, ref: 'User' },

    // ===== PRIORITY & CATEGORIZATION =====
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true,
    },
    category: {
      type: String,
      default: 'General',
      index: true,
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],

    // ===== TIME MANAGEMENT =====
    dueDate: {
      type: Date,
      index: true,
    },
    startDate: { type: Date },
    estimatedHours: { type: Number, min: 0 },
    actualHours: { type: Number, default: 0, min: 0 },

    // ===== TIME TRACKING =====
    timeEntries: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        startTime: { type: Date, required: true },
        endTime: { type: Date },
        duration: { type: Number }, // in minutes
        description: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // ===== DEPENDENCIES =====
    dependencies: {
      blockedBy: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
      blocks: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
    },

    // ===== ATTACHMENTS & COMMENTS =====
    attachments: [
      {
        filename: { type: String, required: true },
        originalName: { type: String, required: true },
        mimetype: { type: String, required: true },
        size: { type: Number, required: true },
        uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        uploadedAt: { type: Date, default: Date.now },
        url: { type: String, required: true },
      },
    ],

    commentsCount: { type: Number, default: 0 },

    // ===== RECURRING TASK SETTINGS =====
    recurring: {
      enabled: { type: Boolean, default: false },
      pattern: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'custom'],
      },
      interval: { type: Number, default: 1 },
      daysOfWeek: [{ type: Number, min: 0, max: 6 }], // 0 = Sunday
      dayOfMonth: { type: Number, min: 1, max: 31 },
      endDate: { type: Date },
      nextDueDate: { type: Date },
    },

    // ===== ACTIVITY & ENGAGEMENT =====
    activity: {
      lastActivityAt: { type: Date, default: Date.now },
      lastActivityBy: { type: Schema.Types.ObjectId, ref: 'User' },
      viewCount: { type: Number, default: 0 },
      updateCount: { type: Number, default: 0 },
    },

    // ===== CUSTOM FIELDS =====
    customFields: {
      type: Map,
      of: Schema.Types.Mixed,
    },

    // ===== METADATA =====
    order: { type: Number, default: 0 }, // For manual sorting
    archived: { type: Boolean, default: false },
    archivedAt: { type: Date },
    archivedBy: { type: Schema.Types.ObjectId, ref: 'User' },

    // Legacy fields for backward compatibility
    notes: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'Note',
      },
    ],
    estimatedTime: { type: Number, min: 0 }, // Alias for estimatedHours
    reminderSent: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/**
 * Database Indexes
 *
 * Indexes improve query performance for frequently accessed fields
 * Without indexes, MongoDB must scan all documents to find matches
 * With indexes, MongoDB can quickly locate matching documents
 *
 * Trade-off: Indexes speed up reads but slightly slow down writes
 * and take up storage space
 */

// ===== INDEXES FOR PERFORMANCE =====
taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ assignee: 1, status: 1 });
taskSchema.index({ dueDate: 1, status: 1 });
taskSchema.index({ parentTask: 1 });
taskSchema.index({ 'dependencies.blockedBy': 1 });
taskSchema.index({ 'dependencies.blocks': 1 });
taskSchema.index({ project: 1, createdAt: -1 });
taskSchema.index({ '$**': 'text' }); // Full-text search

// ===== VIRTUAL FIELDS =====
/**
 * Virtual field to determine if task is overdue
 */
taskSchema.virtual('isOverdue').get(function () {
  return (
    this.dueDate &&
    new Date(this.dueDate) < new Date() &&
    !['done', 'cancelled'].includes(this.status)
  );
});

/**
 * Virtual field to determine if task is blocked
 */
taskSchema.virtual('isBlocked').get(function () {
  return this.dependencies.blockedBy.length > 0 || this.status === 'blocked';
});

/**
 * Virtual field for subtask count
 */
taskSchema.virtual('subtaskCount').get(function () {
  return this.subtasks ? this.subtasks.length : 0;
});

/**
 * Virtual field for completion percentage based on status
 */
taskSchema.virtual('statusProgress').get(function () {
  const statusProgress = {
    todo: 0,
    'in-progress': 50,
    'in-review': 75,
    blocked: this.progress.percentage,
    done: 100,
    cancelled: this.progress.percentage,
  };
  return statusProgress[this.status] ?? this.progress.percentage;
});

// ===== INSTANCE METHODS =====
/**
 * Calculate task progress based on subtasks
 * If task has subtasks, progress = average of subtask progress
 * Otherwise, progress is manually set or based on status
 */
taskSchema.methods.calculateProgress = async function () {
  if (!this.progress.automatic) return this.progress.percentage;

  if (this.subtasks.length > 0) {
    const subtasks = await this.model('Task').find({
      _id: { $in: this.subtasks },
    });
    const totalProgress = subtasks.reduce(
      (sum, task) => sum + task.progress.percentage,
      0
    );
    this.progress.percentage = Math.round(totalProgress / subtasks.length);
  } else {
    // Status-based progress for tasks without subtasks
    const statusProgress = {
      todo: 0,
      'in-progress': 50,
      'in-review': 75,
      blocked: this.progress.percentage, // Keep current
      done: 100,
      cancelled: this.progress.percentage, // Keep current
    };
    this.progress.percentage =
      statusProgress[this.status] ?? this.progress.percentage;
  }

  this.progress.lastUpdated = new Date();
  return this.progress.percentage;
};

/**
 * Add a time tracking entry to the task
 */
taskSchema.methods.addTimeEntry = async function (
  userId,
  startTime,
  endTime,
  description
) {
  const duration = endTime ? Math.round((endTime - startTime) / 60000) : 0; // Convert to minutes

  this.timeEntries.push({
    user: userId,
    startTime,
    endTime,
    duration,
    description,
  });

  // Update actual hours
  this.actualHours = this.timeEntries.reduce((total, entry) => {
    return total + (entry.duration || 0) / 60;
  }, 0);

  await this.save();
  return this.timeEntries[this.timeEntries.length - 1];
};

/**
 * Check if task has circular dependencies
 */
taskSchema.methods.hasCircularDependency = async function (targetTaskId) {
  const visited = new Set();
  const stack = [this._id.toString()];

  while (stack.length > 0) {
    const currentId = stack.pop();

    if (currentId === targetTaskId.toString()) {
      return true; // Circular dependency found
    }

    if (visited.has(currentId)) {
      continue; // Already checked this task
    }

    visited.add(currentId);

    // Get tasks that this task blocks
    const task = await this.model('Task')
      .findById(currentId)
      .select('dependencies.blocks');
    if (task && task.dependencies.blocks) {
      task.dependencies.blocks.forEach((blockedTaskId) => {
        stack.push(blockedTaskId.toString());
      });
    }
  }

  return false; // No circular dependency
};

/**
 * Update activity timestamp and count
 */
taskSchema.methods.updateActivity = function (userId) {
  this.activity.lastActivityAt = new Date();
  this.activity.lastActivityBy = userId;
  this.activity.updateCount += 1;
};

// ===== MIDDLEWARE =====
/**
 * Pre-save middleware to handle subtask relationships
 */
taskSchema.pre('save', async function (next) {
  try {
    // Handle parent-child relationship
    if (this.isModified('parentTask') && this.parentTask) {
      // Add this task to parent's subtasks array
      await this.model('Task').findByIdAndUpdate(this.parentTask, {
        $addToSet: { subtasks: this._id },
      });
    }

    // Validate project exists (existing logic)
    if (this.isModified('project') && this.project) {
      const Project = mongoose.model('Project');
      const project = await Project.findById(this.project);
      if (!project) {
        throw new Error(`Project with ID ${this.project} does not exist`);
      }
    }

    // Update progress if automatic
    if (this.progress.automatic && this.isModified('status')) {
      await this.calculateProgress();
    }

    // Set completion timestamp
    if (
      this.isModified('status') &&
      this.status === 'done' &&
      !this.completedAt
    ) {
      this.completedAt = new Date();
    }

    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Post-save middleware to update parent task progress
 */
taskSchema.post('save', async function () {
  if (this.parentTask) {
    const parent = await this.model('Task').findById(this.parentTask);
    if (parent && parent.progress.automatic) {
      await parent.calculateProgress();
      await parent.save();
    }
  }
});

// Add pre-save middleware to validate project exists
taskSchema.pre('save', async function (next) {
  try {
    // Skip validation if project field is not modified
    if (!this.isModified('project')) {
      return next();
    }

    // Check if project field is provided
    if (!this.project) {
      throw new Error('Project is required for all tasks');
    }

    // Verify that the project exists
    const Project = mongoose.model('Project');
    const project = await Project.findById(this.project);

    if (!project) {
      throw new Error(`Project with ID ${this.project} does not exist`);
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Create and export the model
// 'Task' is the name of the model/collection (MongoDB will store as 'tasks')
// taskSchema defines the structure of documents in that collection
export default mongoose.model('Task', taskSchema);
