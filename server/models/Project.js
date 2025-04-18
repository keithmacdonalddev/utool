const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a project name'],
    trim: true,
    maxlength: [100, 'Project name cannot be more than 100 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot be more than 1000 characters'],
  },
  // Users involved in the project (owner, members)
  members: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
  ],
  owner: {
    // User who created/owns the project
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  // Tasks associated with this project (derived via Task model's project field)
  // We don't necessarily need to store an array of tasks here,
  // but can query Tasks based on project ID when needed.

  // Optional: Status, Start/End Dates
  status: {
    type: String,
    enum: ['Planning', 'Active', 'On Hold', 'Completed', 'Archived'],
    default: 'Planning',
  },
  startDate: Date,
  endDate: Date, // Target end date

  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium',
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Middleware to update `updatedAt` field on save
ProjectSchema.pre('save', function (next) {
  if (this.isModified()) {
    this.updatedAt = Date.now();
  }
  next();
});

// Ensure owner is automatically added to members on creation
ProjectSchema.pre('save', function (next) {
  if (this.isNew && !this.members.includes(this.owner)) {
    this.members.push(this.owner);
  }
  next();
});

// Index for faster querying by owner or members
ProjectSchema.index({ owner: 1 });
ProjectSchema.index({ members: 1 });

module.exports = mongoose.model('Project', ProjectSchema);
