import mongoose from 'mongoose';

const BookmarkFolderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Please add a folder name'],
      trim: true,
      maxlength: [50, 'Folder name cannot be more than 50 characters'],
    },
    parentId: {
      type: String,
      default: null,
    },
    expanded: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('BookmarkFolder', BookmarkFolderSchema);
