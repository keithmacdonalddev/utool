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

        // Archive actions
        'archive_retrieve',
        'archive_create',
        'archive_restore',
        'productivity_metrics_retrieve',
        'productivity_comparison',

        // Admin actions
        'admin_action',
      ],
    },
    // New field: standardized event category for better filtering and analysis
    eventCategory: {
      type: String,
      required: true,
      enum: [
        'authentication', // Login, logout, password changes
        'data_access', // Read operations
        'data_modification', // Create, update, delete operations
        'configuration', // System settings changes
        'permission', // Access control changes
        'security', // Security-related events
        'system', // System-level events
        'user_management', // User-related actions
      ],
      default: 'system',
    },
    // New field: severity level for prioritizing events
    severityLevel: {
      type: String,
      required: true,
      enum: ['info', 'warning', 'critical'],
      default: 'info',
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
    // Enhanced client information for security analysis
    clientInfo: {
      browser: String,
      device: String,
      os: String,
      location: String, // IP-based geolocation
    },
    // User context at time of action
    userContext: {
      role: String,
      permissions: [String],
    },
    // Before/after state for changes
    stateChanges: {
      resourceType: String, // Type of resource being modified (user, project, task, etc.)
      resourceId: mongoose.Schema.Types.ObjectId, // ID of the resource being modified
      before: mongoose.Schema.Types.Mixed, // State before change
      after: mongoose.Schema.Types.Mixed, // State after change
      changedFields: [String], // List of fields that changed
    },
    // For grouping related events in a user journey
    journeyId: {
      type: String,
      index: true,
    },
    // Natural language description of the event
    description: {
      type: String,
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
  description: 'text', // Enable searching on natural language descriptions
  'stateChanges.resourceType': 'text',
});

// Create compound index for event filtering and journeys
AuditLogSchema.index({
  eventCategory: 1,
  severityLevel: 1,
  timestamp: -1,
});

// Create index for user journeys
AuditLogSchema.index({
  userId: 1,
  journeyId: 1,
  timestamp: 1,
});

/**
 * Generate a natural language description of the audit event based on available data
 * This helps make audit logs more understandable to non-technical users
 */
AuditLogSchema.pre('save', function (next) {
  if (!this.description) {
    try {
      let desc = '';
      const action = this.action.replace(/_/g, ' ');

      // Get user information if available
      const userPart = this.userContext?.role
        ? `${this.userContext.role} user`
        : 'User';

      // Generate description based on action type
      if (this.action.includes('create')) {
        const resource =
          this.stateChanges?.resourceType || this.action.split('_')[0];
        desc = `${userPart} created ${resource}`;
      } else if (this.action.includes('update')) {
        const resource =
          this.stateChanges?.resourceType || this.action.split('_')[0];
        desc = `${userPart} updated ${resource}`;

        // Add changed fields if available
        if (this.stateChanges?.changedFields?.length > 0) {
          desc += ` (changed: ${this.stateChanges.changedFields.join(', ')})`;
        }
      } else if (this.action.includes('delete')) {
        const resource =
          this.stateChanges?.resourceType || this.action.split('_')[0];
        desc = `${userPart} deleted ${resource}`;
      } else if (this.action === 'login') {
        desc = `${userPart} logged in`;
      } else if (this.action === 'logout') {
        desc = `${userPart} logged out`;
      } else if (this.action === 'password_change') {
        desc = `${userPart} changed password`;
      } else {
        desc = `${userPart} performed ${action}`;
      }

      // Add status information
      if (this.status === 'failed') {
        desc += ' (failed)';
      }

      this.description = desc;
    } catch (err) {
      console.error('Error generating audit log description:', err);
      this.description = `${this.action} - ${this.status}`;
    }
  }

  next();
});

export default mongoose.model('AuditLog', AuditLogSchema);
