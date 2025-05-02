import mongoose from 'mongoose';

const SnippetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Please add a title'],
      trim: true,
      maxlength: [100, 'Title cannot be more than 100 characters'],
    },
    content: {
      type: String,
      required: [true, 'Please add snippet content'],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SnippetCategory',
    },
    tags: [String],
    favorite: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Snippet', SnippetSchema);
