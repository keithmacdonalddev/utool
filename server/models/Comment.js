import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const CommentSchema = new Schema({
  content: {
    type: String,
    required: [true, 'Comment content cannot be empty.'],
    trim: true,
  },
  article: {
    type: Schema.Types.ObjectId,
    ref: 'KnowledgeBaseArticle',
    required: true,
    index: true, // Index for faster querying of comments per article
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  parentComment: {
    type: Schema.Types.ObjectId,
    ref: 'Comment',
    default: null, // null indicates a top-level comment
  },
  // Optional: Add fields for replies if you prefer denormalization,
  // but referencing parentComment is usually sufficient for threading.
  // replies: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],

  // Optional: Add fields for features like upvotes, edits, etc.
  // upvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  // isEdited: { type: Boolean, default: false },
  // editedAt: Date,

  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Middleware to update `updatedAt` on save (for edits)
CommentSchema.pre('save', function (next) {
  if (!this.isNew) {
    this.updatedAt = Date.now();
  }
  next();
});

export default mongoose.model('Comment', CommentSchema);
