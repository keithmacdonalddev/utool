import mongoose from 'mongoose';

const KnowledgeBaseArticleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  tags: [String],
  categories: [String],
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to the User model
    required: true,
  },
  views: {
    type: Number,
    default: 0, // Start with zero views
  },
  versions: [
    // For versioning
    {
      versionNumber: {
        type: Number,
        default: 1,
      },
      title: String,
      content: String,
      updatedAt: {
        type: Date,
        default: Date.now,
      },
      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  // Add other fields as needed, e.g., collaborators, etc.
});

// Add pre-save middleware to handle versioning
KnowledgeBaseArticleSchema.pre('save', async function (next) {
  if (this.isModified('title') || this.isModified('content')) {
    // Increment version number and save the current version
    this.versions.push({
      versionNumber: this.versions.length + 1,
      title: this.title,
      content: this.content,
      updatedAt: Date.now(),
      updatedBy: this.author, // Assuming author is the user who updated
    });
    this.updatedAt = Date.now();
  }
  next();
});

export default mongoose.model(
  'KnowledgeBaseArticle',
  KnowledgeBaseArticleSchema
);
