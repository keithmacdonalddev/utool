import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        // Auth-related actions
        'login',
        'logout',
        'password_change',
        'email_verification',
        'account_lock',

        // User profile actions
        'profile_update',
        'role_change',
        'permission_change',

        // Content management actions
        'content_create',
        'content_update',
        'content_delete',

        // Project specific actions
        'project_create',
        'project_update',
        'project_delete',

        // Task specific actions
        'task_create',
        'task_update',
        'task_delete',
        'task_status_change',
        'task_retrieve',

        // Knowledge Base actions
        'kb_create',
        'kb_update',
        'kb_delete',

        // Note actions
        'note_create',
        'note_update',
        'note_delete',

        // Admin actions
        'admin_action',
      ],
    },
    status: {
      type: String,
      required: true,
      enum: ['success', 'failed', 'pending'],
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Add text index for search
AuditLogSchema.index({
  action: 'text',
  status: 'text',
  ipAddress: 'text',
});

export default mongoose.model('AuditLog', AuditLogSchema);
