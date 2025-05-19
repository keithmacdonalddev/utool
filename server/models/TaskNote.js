import mongoose from 'mongoose';

const NoteSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'Please add some content'],
    trim: true,
  },
  task: {
    // Reference to the Task model
    type: mongoose.Schema.ObjectId,
    ref: 'Task',
    required: true,
  },
  author: {
    // User who created the note
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
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

// Optional: Add index for faster querying by task
NoteSchema.index({ task: 1 });

export default mongoose.model('TaskNote', NoteSchema);
