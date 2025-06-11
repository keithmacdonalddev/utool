import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const CommentSchema = new Schema({
  content: {
    type: String,
    required: [true, 'Comment content cannot be empty.'],
    trim: true,
    maxlength: [2000, 'Comment cannot exceed 2000 characters'],
  },

  // Reference to what is being commented on - flexible design for multiple entity types
  targetType: {
    type: String,
    enum: ['KnowledgeBaseArticle', 'Project', 'Task'],
    required: true,
  },
  targetId: {
    type: Schema.Types.ObjectId,
    required: true,
    refPath: 'targetType',
    index: true, // Index for faster querying of comments per target
  },

  // Backward compatibility for existing KB article comments
  article: {
    type: Schema.Types.ObjectId,
    ref: 'KnowledgeBaseArticle',
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

  // Handle backward compatibility for existing KB article comments
  if (this.article && !this.targetType) {
    this.targetType = 'KnowledgeBaseArticle';
    this.targetId = this.article;
  }

  // Ensure targetType and targetId are set for new comments
  if (!this.targetType || !this.targetId) {
    if (this.article) {
      this.targetType = 'KnowledgeBaseArticle';
      this.targetId = this.article;
    } else {
      return next(
        new Error('Either article or targetType/targetId must be specified')
      );
    }
  }

  next();
});

export default mongoose.model('Comment', CommentSchema);
