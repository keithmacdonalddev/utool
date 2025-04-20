import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'note_reminder',
        'task_reminder',
        'system',
        'friend_request',
        'comment',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    relatedItem: {
      // Can point to a note, task, etc.
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'itemModel',
    },
    itemModel: {
      // Determines which model the relatedItem refers to
      type: String,
      enum: ['Note', 'Task', 'KnowledgeBaseArticle', 'User', 'Project'],
    },
    url: {
      // Optional link to navigate to when notification is clicked
      type: String,
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    isSent: {
      // Track if notification has been sent via socket already
      type: Boolean,
      default: false,
    },
    scheduledFor: {
      // For scheduled notifications like reminders
      type: Date,
      default: null,
    },
    expireAt: {
      // Optional: auto-delete old notifications
      type: Date,
      default: () => {
        const date = new Date();
        date.setDate(date.getDate() + 30); // Default 30 days TTL
        return date;
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index for finding unread notifications efficiently
NotificationSchema.index({ user: 1, isRead: 1 });

// Index for finding unsent notifications efficiently
NotificationSchema.index({ user: 1, isSent: 1 });

// Index for finding scheduled notifications
NotificationSchema.index({ scheduledFor: 1, isSent: 1 });

// Create TTL index to automatically remove old notifications
NotificationSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('Notification', NotificationSchema);
