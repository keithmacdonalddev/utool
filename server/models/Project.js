import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Enhanced Project Schema for Enterprise-Level Project Management
 *
 * This schema extends the basic project model to support:
 * - Granular member permissions
 * - Project lifecycle tracking
 * - Advanced categorization and discovery
 * - Template support
 * - Activity logging
 * - Custom metadata
 *
 * BACKWARD COMPATIBILITY:
 * - All existing fields preserved (name, description, members, owner, status, priority, etc.)
 * - Existing data will be migrated with intelligent defaults
 * - API endpoints continue to work with existing client code
 */
const projectSchema = new Schema(
  {
    // ===== CORE INFORMATION (BACKWARD COMPATIBLE) =====
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: [100, 'Project name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      default: '',
    },

    // ===== OWNERSHIP & ACCESS CONTROL (ENHANCED) =====
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // ENHANCED: Granular member permissions (backward compatible)
    members: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        role: {
          type: String,
          enum: ['admin', 'editor', 'contributor', 'viewer'],
          default: 'contributor',
        },
        // Granular permissions that can override default role permissions
        permissions: {
          canEditProject: { type: Boolean, default: false },
          canDeleteProject: { type: Boolean, default: false },
          canManageMembers: { type: Boolean, default: false },
          canManageTasks: { type: Boolean, default: true },
          canViewAnalytics: { type: Boolean, default: false },
          canExportData: { type: Boolean, default: false },
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        invitedBy: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],

    // ===== PROJECT STATE & PROGRESS (ENHANCED) =====
    status: {
      type: String,
      enum: ['planning', 'active', 'on-hold', 'completed', 'archived'], // Standardized lowercase-hyphen format
      default: 'planning',
    },

    priority: {
      type: String,
      enum: ['low', 'medium', 'high'], // Standardized lowercase format
      default: 'medium',
    },

    // NEW: Enhanced progress tracking
    progress: {
      percentage: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      // These metrics will be updated via aggregation or task updates
      metrics: {
        totalTasks: { type: Number, default: 0 },
        completedTasks: { type: Number, default: 0 },
        overdueTasks: { type: Number, default: 0 },
        inProgressTasks: { type: Number, default: 0 },
      },
      lastCalculated: Date,
    },

    // ===== TIMELINE & SCHEDULING (ENHANCED) =====
    timeline: {
      startDate: {
        type: Date,
        // Removed index: true - consider compound index if needed
      },
      targetEndDate: {
        type: Date,
        // Removed index: true - consider compound index if needed
      },
      actualEndDate: Date,
      milestones: [
        {
          name: String,
          description: String,
          targetDate: Date,
          completedDate: Date,
          status: {
            type: String,
            enum: ['pending', 'in-progress', 'completed', 'missed'],
            default: 'pending',
          },
        },
      ],
    },

    // ===== FEATURE CONFIGURATION (NEW) =====
    features: {
      tasks: {
        enabled: { type: Boolean, default: true },
        settings: {
          defaultView: {
            type: String,
            enum: ['list', 'board', 'calendar', 'gantt'],
            default: 'list',
          },
          customStatuses: [String],
        },
      },
      documents: {
        enabled: { type: Boolean, default: true },
        settings: {},
      },
      budget: {
        enabled: { type: Boolean, default: false },
        settings: {
          currency: { type: String, default: 'USD' },
          budget: Number,
        },
      },
    },

    // ===== ORGANIZATION & DISCOVERY (NEW) =====
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },

    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],

    category: {
      type: String,
      enum: [
        'development',
        'marketing',
        'design',
        'research',
        'operations',
        'other',
      ],
      default: 'other',
    },

    visibility: {
      type: String,
      enum: ['private', 'team', 'organization', 'public'],
      default: 'team',
    },

    // ===== TEMPLATE INFORMATION (NEW) =====
    isTemplate: {
      type: Boolean,
      default: false,
    },

    templateSource: {
      type: Schema.Types.ObjectId,
      ref: 'ProjectTemplate',
    },

    // ===== ACTIVITY & ENGAGEMENT (NEW) =====
    activity: {
      lastActivityAt: {
        type: Date,
        default: Date.now,
        // Removed index: true - consider compound index if needed
      },
      totalActivities: {
        type: Number,
        default: 0,
      },
    },

    // ===== PROJECT-SPECIFIC SETTINGS (NEW) =====
    settings: {
      defaultView: {
        type: String,
        enum: ['overview', 'tasks', 'calendar', 'files', 'analytics'],
        default: 'overview',
      },
      notifications: {
        emailDigest: {
          type: String,
          enum: ['none', 'daily', 'weekly'],
          default: 'weekly',
        },
        taskReminders: { type: Boolean, default: true },
        memberUpdates: { type: Boolean, default: true },
      },
      kanbanColumns: [
        {
          id: String,
          name: String,
          color: String,
          order: Number,
          wipLimit: Number, // Work in progress limit
        },
      ],
      color: {
        type: String,
        default: '#3B82F6', // Default blue
      },
      icon: {
        type: String,
        default: 'folder', // Lucide icon name
      },
    },

    // ===== METADATA (NEW) =====
    metadata: {
      version: {
        type: Number,
        default: 1,
      },
      source: {
        type: String,
        enum: ['web', 'api', 'import', 'template'],
        default: 'web',
      },
      customFields: {
        type: Map,
        of: Schema.Types.Mixed,
      },
    },

    // ===== BACKWARD COMPATIBILITY FIELDS =====
    // Keep existing timestamp fields for compatibility
    startDate: {
      type: Date,
      // This will map to timeline.startDate in migration
    },
    endDate: {
      type: Date,
      // This will map to timeline.targetEndDate in migration
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ===== INDEXES FOR PERFORMANCE =====
// Compound indexes for common query patterns
projectSchema.index({ owner: 1, status: 1 });
projectSchema.index({ 'members.user': 1, status: 1 });
projectSchema.index({ organization: 1, status: 1 });
projectSchema.index({ tags: 1 });
projectSchema.index({ '$**': 'text' }); // Full-text search on all string fields

// ===== VIRTUAL FIELDS =====
/**
 * Virtual field to calculate the total number of active members
 * Includes the owner plus all members
 */
projectSchema.virtual('activeMembersCount').get(function () {
  // Check if members exists and is an array before calling filter
  const members = this.members || [];
  return members.filter((m) => m && m.role !== 'viewer').length + 1; // +1 for owner
});

/**
 * Virtual field to determine if project is overdue
 */
projectSchema.virtual('isOverdue').get(function () {
  return (
    this.timeline.targetEndDate &&
    this.timeline.targetEndDate < new Date() &&
    this.status === 'Active'
  );
});

// ===== INSTANCE METHODS =====
/**
 * Calculate and update project progress based on task completion
 * This method should be called whenever tasks are updated
 *
 * @returns {Promise<number>} The calculated progress percentage
 */
projectSchema.methods.calculateProgress = async function () {
  // This will be implemented to aggregate task data
  // For now, return the stored progress
  // In production, this would query the Task collection
  // and calculate based on completed vs total tasks

  const Task = mongoose.model('Task');
  const tasks = await Task.find({
    project: this._id,
    archived: { $ne: true },
  }).select('status');

  if (tasks.length === 0) {
    this.progress.percentage = 0;
    this.progress.metrics = {
      totalTasks: 0,
      completedTasks: 0,
      overdueTasks: 0,
      inProgressTasks: 0,
    };
  } else {
    const metrics = tasks.reduce(
      (acc, task) => {
        acc.totalTasks++;
        if (task.status === 'Completed') acc.completedTasks++;
        else if (task.status === 'In Progress') acc.inProgressTasks++;
        // Overdue calculation would require task due dates
        return acc;
      },
      {
        totalTasks: 0,
        completedTasks: 0,
        overdueTasks: 0,
        inProgressTasks: 0,
      }
    );

    this.progress.metrics = metrics;
    this.progress.percentage = Math.round(
      (metrics.completedTasks / metrics.totalTasks) * 100
    );
  }

  this.progress.lastCalculated = new Date();
  await this.save();

  return this.progress.percentage;
};

/**
 * Add an activity log entry and update lastActivityAt
 *
 * @param {String} type - Type of activity (e.g., 'task_created', 'member_added')
 * @param {ObjectId} userId - User who performed the activity
 * @param {Object} details - Additional activity details
 */
projectSchema.methods.addActivity = async function (type, userId, details) {
  // Update activity timestamp
  this.activity.lastActivityAt = new Date();
  this.activity.totalActivities += 1;

  // In a full implementation, this would also create an Activity document
  // For now, just update the project
  await this.save();

  // Here you would typically:
  // 1. Create an Activity document in a separate collection
  // 2. Emit a Socket.IO event for real-time updates
  // 3. Trigger any necessary notifications
};

/**
 * Check if a user has a specific permission on this project
 *
 * @param {ObjectId} userId - User ID to check
 * @param {String} permission - Permission name (e.g., 'canEditProject')
 * @returns {Boolean} Whether the user has the permission
 */
projectSchema.methods.userHasPermission = function (userId, permission) {
  // Validate userId parameter
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return false;
  }

  // Owner has all permissions
  if (this.owner.toString() === userId.toString()) {
    return true;
  }

  // Check member permissions
  const member = this.members.find(
    (m) => m.user.toString() === userId.toString()
  );
  if (!member) return false;

  // Check specific permission override
  if (member.permissions[permission] !== undefined) {
    return member.permissions[permission];
  }

  // Fall back to role-based permissions
  const rolePermissions = {
    admin: [
      'canEditProject',
      'canDeleteProject',
      'canManageMembers',
      'canManageTasks',
      'canViewAnalytics',
      'canExportData',
    ],
    editor: ['canEditProject', 'canManageTasks', 'canViewAnalytics'],
    contributor: ['canManageTasks'],
    viewer: [],
  };

  return rolePermissions[member.role]?.includes(permission) || false;
};

// ===== STATIC METHODS =====
/**
 * Find projects accessible to a user
 * Includes owned projects and projects where user is a member
 *
 * @param {ObjectId} userId - User ID
 * @param {Object} filters - Additional filters
 * @returns {Query} Mongoose query object
 */
projectSchema.statics.findAccessible = function (userId, filters = {}) {
  return this.find({
    $and: [
      {
        $or: [{ owner: userId }, { 'members.user': userId }],
      },
      filters,
    ],
  });
};

// ===== MIDDLEWARE =====
/**
 * Pre-save middleware to update activity timestamp
 */
projectSchema.pre('save', function (next) {
  if (this.isModified() && !this.isNew) {
    this.activity.lastActivityAt = new Date();
  }

  // Ensure owner is automatically added to members on creation (backward compatibility)
  if (
    this.isNew &&
    !this.members.find(
      (m) => m.user && m.user.toString() === this.owner.toString()
    )
  ) {
    this.members.push({
      user: this.owner,
      role: 'admin',
      permissions: {
        canEditProject: true,
        canDeleteProject: true,
        canManageMembers: true,
        canManageTasks: true,
        canViewAnalytics: true,
        canExportData: true,
      },
      joinedAt: new Date(),
    });
  }

  next();
});

/**
 * Pre-save middleware to update `updatedAt` field (backward compatibility)
 */
projectSchema.pre('save', function (next) {
  if (this.isModified()) {
    this.updatedAt = Date.now();
  }
  next();
});

/**
 * Post-save middleware to handle related updates
 */
projectSchema.post('save', async function (doc) {
  // Here you would typically:
  // 1. Update user's project count if this is a new project
  // 2. Update organization's project metrics
  // 3. Trigger any necessary background jobs
});

const Project = mongoose.model('Project', projectSchema);

export default Project;
