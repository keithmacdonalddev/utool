// Task.js - MongoDB/Mongoose data model for tasks
// This file defines the schema (structure) for task documents in MongoDB

import mongoose from 'mongoose'; // Import Mongoose ODM library

/**
 * Task Schema
 *
 * Defines the structure, validation rules, and relationships for task documents
 * Each property in the schema maps to a field in the MongoDB document
 */
const TaskSchema = new mongoose.Schema({
  title: {
    type: String, // Data type for this field
    required: [true, 'Please add a task title'], // Field is mandatory with custom error message
    trim: true, // Automatically remove whitespace from beginning and end
    maxlength: [100, 'Title cannot be more than 100 characters'], // Max length with error message
  },
  description: {
    type: String,
    trim: true, // Automatically trim whitespace
    maxlength: [500, 'Description cannot be more than 500 characters'],
    // Not required - optional field
  },
  status: {
    type: String,
    enum: ['Not Started', 'In Progress', 'Completed'], // Limit values to this predefined list
    default: 'Not Started', // Default value if not provided when creating
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'], // Validation to ensure value is one of these
    default: 'Medium', // Default priority if not specified
  },
  project: {
    // MongoDB/Mongoose Reference - establishes relationship between models
    type: mongoose.Schema.ObjectId, // MongoDB ObjectId type (24-character hex string)
    ref: 'Project', // References the 'Project' model
    required: true, // Tasks must belong to a project
    // This enables the .populate() method to load the related Project data
  },
  assignee: {
    // User assigned to the task - another reference relationship
    type: mongoose.Schema.ObjectId,
    ref: 'User', // References the 'User' model
    required: true, // Task must be assigned to someone
  },
  // Array of references - one-to-many relationship
  // Task can have multiple notes (each stored in separate documents)
  notes: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'Note', // Each item in array is a reference to Note model
    },
  ],
  dueDate: {
    type: Date, // JavaScript Date object (stored as ISODate in MongoDB)
    // Optional field (not required)
  },
  estimatedTime: {
    // Stores numeric time value (minutes or hours)
    type: Number,
    min: 0, // Validation to ensure non-negative value
    // Optional field (not required)
  },
  // Task dependencies - array of references to other tasks
  // This models dependencies between tasks (e.g., "Task B can't start until Task A is done")
  dependencies: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'Task', // Self-referencing relationship
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now, // Automatically set to current date/time when document is created
  },
  // Commented out fields show alternative design options
  // createdBy: {
  //     type: mongoose.Schema.ObjectId,
  //     ref: 'User',
  //     required: true
  // }
});

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

// Compound index for querying tasks by assignee and status together
// Example query: Find all "In Progress" tasks for a specific user
TaskSchema.index({ assignee: 1, status: 1 }); // 1 means ascending order

// Index for looking up tasks by project
// Example query: Find all tasks belonging to a specific project
TaskSchema.index({ project: 1 });

// Create and export the model
// 'Task' is the name of the model/collection (MongoDB will store as 'tasks')
// TaskSchema defines the structure of documents in that collection
export default mongoose.model('Task', TaskSchema);
