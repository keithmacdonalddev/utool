const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a task title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters'],
  },
  status: {
    type: String,
    enum: ['Not Started', 'In Progress', 'Completed'],
    default: 'Not Started',
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium',
  },
  project: {
    // Reference to the Project model
    type: mongoose.Schema.ObjectId,
    ref: 'Project',
    required: true, // Tasks must belong to a project
  },
  assignee: {
    // User assigned to the task
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true, // Task must be assigned to the creator initially
  },
  // Notes associated with this task (Array of Note references - Note model to be created later)
  notes: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'Note',
    },
  ],
  dueDate: {
    type: Date,
  },
  estimatedTime: {
    // Example: store time in minutes or hours
    type: Number, // Or String like '2h', '30m' - requires parsing logic
    min: 0,
  },
  // Tasks this one depends on (blockers)
  dependencies: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'Task',
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // Add createdBy if needed, though assignee might cover this initially
  // createdBy: {
  //     type: mongoose.Schema.ObjectId,
  //     ref: 'User',
  //     required: true
  // }
});

// Optional: Add indexes for frequently queried fields
TaskSchema.index({ assignee: 1, status: 1 });
TaskSchema.index({ project: 1 });

module.exports = mongoose.model('Task', TaskSchema);
