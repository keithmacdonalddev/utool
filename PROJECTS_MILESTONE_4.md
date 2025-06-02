# PROJECTS FEATURE REORGANIZATION - MILESTONE 4

## Project Templates & Automation (Week 9-10)

**Risk:** Low | **Value:** High Productivity Gains
**Status:** Planning Phase

---

### Overview

This milestone introduces powerful template and automation features that transform how teams create and manage projects. By providing pre-built templates, customizable workflows, and intelligent automation, we'll dramatically reduce setup time and ensure consistency across projects.

### Integration with Existing Codebase

**Existing Files to Enhance/Modify:**

- `server/models/Project.js` - Add template-related fields
- `server/models/Task.js` - Support template tasks
- `client/src/pages/CreateProjectPage.js` - Current project creation
- `server/controllers/projectController.js` - Project creation logic
- `client/src/features/projects/projectsSlice.js` - Redux state

**New Components to Create:**

- Template management system
- Automation rule builder
- Workflow engine
- Template marketplace UI
- Automation dashboard

**Patterns We'll Maintain:**

- MongoDB for template storage
- Redux for state management
- Existing API patterns
- Tailwind CSS styling
- Lucide React icons

---

## 📊 DELIVERABLES

### 1. Project Template Schema

**File: `server/models/ProjectTemplate.js`**

```javascript
import mongoose from 'mongoose';

/**
 * ProjectTemplate Schema
 *
 * Stores reusable project templates that can be used to quickly
 * create new projects with predefined structure, tasks, and settings.
 *
 * Templates can be:
 * - System templates (provided by the platform)
 * - Organization templates (created by organizations)
 * - Personal templates (created by individual users)
 * - Community templates (shared publicly)
 */
const projectTemplateSchema = new mongoose.Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: true,
      trim: true,
      maxLength: 100,
      index: true,
    },

    description: {
      type: String,
      maxLength: 1000,
    },

    // Template Category
    category: {
      type: String,
      required: true,
      enum: [
        'software-development',
        'marketing',
        'design',
        'business',
        'education',
        'personal',
        'research',
        'event-planning',
        'content-creation',
        'consulting',
        'other',
      ],
      index: true,
    },

    // Template Type and Ownership
    type: {
      type: String,
      enum: ['system', 'organization', 'personal', 'community'],
      required: true,
      index: true,
    },

    // Template Ownership and Access Control
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },

    // Visibility and Access
    visibility: {
      type: String,
      enum: ['private', 'organization', 'public'],
      default: 'private',
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Template Structure Configuration
    projectConfiguration: {
      // Basic project settings template
      title: {
        type: String,
        default: '{{templateName}} Project',
      },
      description: {
        type: String,
        default: '',
      },
      type: {
        type: String,
        enum: [
          'development',
          'marketing',
          'event',
          'personal',
          'vacation',
          'renovation',
          'tax',
          'other',
        ],
        default: 'development',
      },
      priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium',
      },

      // Feature toggles for created projects
      features: {
        tasks: { type: Boolean, default: true },
        notes: { type: Boolean, default: true },
        files: { type: Boolean, default: true },
        calendar: { type: Boolean, default: true },
        gantt: { type: Boolean, default: false },
        kanban: { type: Boolean, default: true },
        ideas: { type: Boolean, default: true },
        analytics: { type: Boolean, default: false },
      },

      // Default member roles and permissions
      defaultMemberRole: {
        type: String,
        enum: ['admin', 'member', 'viewer'],
        default: 'member',
      },

      // Template variables for customization
      variables: [
        {
          name: { type: String, required: true },
          label: { type: String, required: true },
          type: {
            type: String,
            enum: ['text', 'number', 'date', 'boolean', 'select'],
            required: true,
          },
          defaultValue: mongoose.Schema.Types.Mixed,
          options: [String], // For select type
          required: { type: Boolean, default: false },
          description: String,
        },
      ],
    },

    // Task Template Structure
    taskTemplates: [
      {
        title: { type: String, required: true },
        description: String,
        priority: {
          type: String,
          enum: ['low', 'medium', 'high', 'critical'],
          default: 'medium',
        },
        estimatedHours: Number,

        // Task dependencies within template
        dependsOn: [String], // References to other task template IDs within this template

        // Assignment configuration
        assignmentRule: {
          type: String,
          enum: ['creator', 'manager', 'unassigned', 'variable'],
          default: 'unassigned',
        },
        assignmentVariable: String, // If assignmentRule is 'variable'

        // Due date configuration
        dueDateRule: {
          type: String,
          enum: [
            'none',
            'project_start',
            'project_end',
            'relative',
            'variable',
          ],
          default: 'none',
        },
        dueDateOffset: Number, // Days offset from rule base date
        dueDateVariable: String, // If dueDateRule is 'variable'

        // Template-specific task ID for referencing
        templateTaskId: {
          type: String,
          required: true,
          unique: false, // Unique within template only
        },

        // Task creation order
        order: {
          type: Number,
          default: 0,
        },

        // Checklist items for tasks
        checklist: [
          {
            text: { type: String, required: true },
            completed: { type: Boolean, default: false },
          },
        ],
      },
    ],

    // Automation Rules Configuration
    automationRules: [
      {
        name: { type: String, required: true },
        description: String,
        enabled: { type: Boolean, default: true },

        // Trigger configuration
        trigger: {
          type: {
            type: String,
            enum: [
              'project_created',
              'task_completed',
              'deadline_approaching',
              'status_changed',
              'manual',
            ],
            required: true,
          },
          conditions: [
            {
              field: String,
              operator: String,
              value: mongoose.Schema.Types.Mixed,
            },
          ],
        },

        // Action configuration (NO AI-POWERED ACTIONS)
        actions: [
          {
            type: {
              type: String,
              enum: [
                'create_task',
                'update_status',
                'send_notification',
                'assign_user',
                'set_due_date',
                'add_comment',
                'move_to_stage',
                'update_priority',
                'create_subtask',
                'schedule_reminder',
              ],
              required: true,
            },
            configuration: mongoose.Schema.Types.Mixed,
          },
        ],

        // Execution settings
        executionSettings: {
          delay: { type: Number, default: 0 }, // Delay in minutes
          maxExecutions: { type: Number, default: null }, // Null for unlimited
          executedCount: { type: Number, default: 0 },
        },
      },
    ],

    // **ENHANCED SECURITY CONFIGURATION FOR SCRIPT EXECUTION**
    securityConfiguration: {
      // Script execution security settings
      allowScriptExecution: {
        type: Boolean,
        default: false, // Scripts disabled by default for security
      },

      // Approved script types and their security levels
      allowedScriptTypes: [
        {
          type: String,
          enum: ['webhook', 'data_transformation', 'notification_formatting'],
          securityLevel: {
            type: String,
            enum: ['safe', 'restricted', 'admin_only'],
            default: 'restricted',
          },
        },
      ],

      // Script execution sandbox configuration
      sandboxConfiguration: {
        timeoutSeconds: { type: Number, default: 30, max: 300 }, // Max 5 minutes
        memoryLimitMB: { type: Number, default: 64, max: 256 }, // Max 256MB
        networkAccess: { type: Boolean, default: false },
        fileSystemAccess: { type: Boolean, default: false },
        allowedDomains: [String], // Whitelist for network access
      },

      // Security audit trail
      securityAuditLog: [
        {
          action: String,
          userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          timestamp: { type: Date, default: Date.now },
          details: mongoose.Schema.Types.Mixed,
          riskLevel: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
          },
        },
      ],

      // Content security policies
      contentSecurityPolicy: {
        allowExternalResources: { type: Boolean, default: false },
        allowedResourceDomains: [String],
        sanitizeUserInput: { type: Boolean, default: true },
        validateTemplateContent: { type: Boolean, default: true },
      },
    },

    // **TEMPLATE VERSIONING STRATEGY**
    versioningConfiguration: {
      // Current version information
      currentVersion: {
        major: { type: Number, default: 1 },
        minor: { type: Number, default: 0 },
        patch: { type: Number, default: 0 },
      },

      // Version history tracking
      versionHistory: [
        {
          version: {
            major: Number,
            minor: Number,
            patch: Number,
          },
          releaseDate: { type: Date, default: Date.now },
          releasedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          changeLog: String,
          changeType: {
            type: String,
            enum: ['major', 'minor', 'patch', 'hotfix'],
            required: true,
          },

          // Snapshot of template at this version
          templateSnapshot: {
            projectConfiguration: mongoose.Schema.Types.Mixed,
            taskTemplates: mongoose.Schema.Types.Mixed,
            automationRules: mongoose.Schema.Types.Mixed,
          },

          // Migration instructions for upgrading from previous versions
          migrationInstructions: [
            {
              fromVersion: String,
              instructions: String,
              automaticMigration: { type: Boolean, default: false },
              migrationScript: String, // Safe, sandboxed migration script
            },
          ],
        },
      ],

      // Version compatibility and deprecation
      compatibilityMatrix: [
        {
          platformVersion: String,
          supportStatus: {
            type: String,
            enum: [
              'fully_supported',
              'limited_support',
              'deprecated',
              'unsupported',
            ],
            default: 'fully_supported',
          },
          deprecationDate: Date,
          endOfLifeDate: Date,
        },
      ],

      // Automatic versioning rules
      versioningRules: {
        autoIncrementPatch: { type: Boolean, default: true },
        requireApprovalForMajor: { type: Boolean, default: true },
        maximumVersionHistory: { type: Number, default: 50 },
        allowRollback: { type: Boolean, default: true },
        rollbackWindowDays: { type: Number, default: 30 },
      },
    },

    // Usage Statistics and Analytics
    usage: {
      totalUses: { type: Number, default: 0 },
      lastUsed: Date,

      // Rating and feedback system
      ratings: [
        {
          userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          rating: { type: Number, min: 1, max: 5 },
          comment: String,
          date: { type: Date, default: Date.now },
        },
      ],

      averageRating: { type: Number, default: 0 },
      totalRatings: { type: Number, default: 0 },

      // Success metrics
      successMetrics: {
        projectCompletionRate: Number,
        averageProjectDuration: Number,
        userSatisfactionScore: Number,
      },
    },

    // Template Marketplace Information
    marketplace: {
      isPremium: { type: Boolean, default: false },
      price: { type: Number, default: 0 },
      tags: [String],

      // SEO and discoverability
      searchKeywords: [String],
      featuredTemplate: { type: Boolean, default: false },

      // Support and documentation
      documentationUrl: String,
      supportContactInfo: String,
      changelogUrl: String,
    },

    // Template Lifecycle Management
    lifecycle: {
      status: {
        type: String,
        enum: ['draft', 'review', 'active', 'deprecated', 'archived'],
        default: 'draft',
        index: true,
      },

      submittedForReview: Date,
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reviewedAt: Date,
      reviewNotes: String,

      publishedAt: Date,
      lastModified: { type: Date, default: Date.now },

      // Deprecation and archival
      deprecatedAt: Date,
      deprecationReason: String,
      replacementTemplateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProjectTemplate',
      },

      archivedAt: Date,
      archivalReason: String,
    },

    // Internationalization Support
    localization: {
      defaultLanguage: { type: String, default: 'en' },

      translations: [
        {
          language: String,
          name: String,
          description: String,
          taskTitles: Map, // Map of templateTaskId to translated title
          taskDescriptions: Map, // Map of templateTaskId to translated description
          translatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          translatedAt: { type: Date, default: Date.now },
        },
      ],
    },

    // Timestamps
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// **ENHANCED SECURITY MIDDLEWARE FOR TEMPLATE OPERATIONS**

// Pre-save middleware for security validation
projectTemplateSchema.pre('save', async function (next) {
  try {
    // Validate template content for security issues
    if (
      this.isModified('taskTemplates') ||
      this.isModified('automationRules')
    ) {
      await this.validateTemplateContentSecurity();
    }

    // Update version information if template structure changed
    if (
      this.isModified('projectConfiguration') ||
      this.isModified('taskTemplates') ||
      this.isModified('automationRules')
    ) {
      await this.incrementVersion('patch');
    }

    // Sanitize user input in template content
    if (this.securityConfiguration.contentSecurityPolicy.sanitizeUserInput) {
      await this.sanitizeTemplateContent();
    }

    next();
  } catch (error) {
    next(error);
  }
});

// **SECURITY VALIDATION METHODS**

projectTemplateSchema.methods.validateTemplateContentSecurity =
  async function () {
    const securityIssues = [];

    // Check for potentially dangerous script content
    const dangerousPatterns = [
      /eval\s*\(/,
      /Function\s*\(/,
      /setTimeout\s*\(/,
      /setInterval\s*\(/,
      /<script/i,
      /javascript:/i,
      /document\./,
      /window\./,
      /process\./,
      /require\s*\(/,
      /import\s+/,
    ];

    // Validate automation rules for security issues
    if (this.automationRules) {
      this.automationRules.forEach((rule, index) => {
        rule.actions.forEach((action, actionIndex) => {
          const actionConfig = JSON.stringify(action.configuration || {});

          dangerousPatterns.forEach((pattern) => {
            if (pattern.test(actionConfig)) {
              securityIssues.push({
                type: 'dangerous_script_pattern',
                location: `automationRules[${index}].actions[${actionIndex}]`,
                pattern: pattern.toString(),
                riskLevel: 'high',
              });
            }
          });
        });
      });
    }

    // Validate task templates for XSS vulnerabilities
    if (this.taskTemplates) {
      this.taskTemplates.forEach((task, index) => {
        const taskContent = `${task.title} ${task.description}`;

        dangerousPatterns.forEach((pattern) => {
          if (pattern.test(taskContent)) {
            securityIssues.push({
              type: 'xss_vulnerability',
              location: `taskTemplates[${index}]`,
              pattern: pattern.toString(),
              riskLevel: 'medium',
            });
          }
        });
      });
    }

    // Log security issues for audit purposes
    if (securityIssues.length > 0) {
      this.securityConfiguration.securityAuditLog.push({
        action: 'security_validation_failed',
        timestamp: new Date(),
        details: { securityIssues },
        riskLevel: securityIssues.some((issue) => issue.riskLevel === 'high')
          ? 'high'
          : 'medium',
      });

      throw new Error(
        `Template security validation failed: ${securityIssues.length} issues found`
      );
    }

    return true;
  };

projectTemplateSchema.methods.sanitizeTemplateContent = async function () {
  const DOMPurify = require('isomorphic-dompurify');

  // Sanitize task template content
  if (this.taskTemplates) {
    this.taskTemplates.forEach((task) => {
      if (task.title) {
        task.title = DOMPurify.sanitize(task.title, { ALLOWED_TAGS: [] });
      }
      if (task.description) {
        task.description = DOMPurify.sanitize(task.description, {
          ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
          ALLOWED_ATTR: [],
        });
      }
    });
  }

  // Sanitize project configuration content
  if (this.projectConfiguration) {
    if (this.projectConfiguration.title) {
      this.projectConfiguration.title = DOMPurify.sanitize(
        this.projectConfiguration.title,
        { ALLOWED_TAGS: [] }
      );
    }
    if (this.projectConfiguration.description) {
      this.projectConfiguration.description = DOMPurify.sanitize(
        this.projectConfiguration.description,
        {
          ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
          ALLOWED_ATTR: [],
        }
      );
    }
  }
};

// **VERSIONING METHODS**

projectTemplateSchema.methods.incrementVersion = async function (
  type = 'patch'
) {
  const currentVersion = this.versioningConfiguration.currentVersion;
  const newVersion = { ...currentVersion };

  // Create version history entry before incrementing
  const versionSnapshot = {
    version: { ...currentVersion },
    releaseDate: new Date(),
    releasedBy: this._updateUser || null,
    changeType: type,
    templateSnapshot: {
      projectConfiguration: this.projectConfiguration,
      taskTemplates: this.taskTemplates,
      automationRules: this.automationRules,
    },
  };

  // Increment version based on type
  switch (type) {
    case 'major':
      newVersion.major += 1;
      newVersion.minor = 0;
      newVersion.patch = 0;
      break;
    case 'minor':
      newVersion.minor += 1;
      newVersion.patch = 0;
      break;
    case 'patch':
    case 'hotfix':
    default:
      newVersion.patch += 1;
      break;
  }

  this.versioningConfiguration.currentVersion = newVersion;
  this.versioningConfiguration.versionHistory.push(versionSnapshot);

  // Maintain version history limit
  const maxHistory =
    this.versioningConfiguration.versioningRules.maximumVersionHistory || 50;
  if (this.versioningConfiguration.versionHistory.length > maxHistory) {
    this.versioningConfiguration.versionHistory =
      this.versioningConfiguration.versionHistory.slice(-maxHistory);
  }
};

projectTemplateSchema.methods.rollbackToVersion = async function (
  targetVersion
) {
  const versionHistory = this.versioningConfiguration.versionHistory;
  const targetSnapshot = versionHistory.find(
    (v) =>
      v.version.major === targetVersion.major &&
      v.version.minor === targetVersion.minor &&
      v.version.patch === targetVersion.patch
  );

  if (!targetSnapshot) {
    throw new Error('Target version not found in version history');
  }

  // Check rollback window
  const rollbackWindowDays =
    this.versioningConfiguration.versioningRules.rollbackWindowDays || 30;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - rollbackWindowDays);

  if (targetSnapshot.releaseDate < cutoffDate) {
    throw new Error(
      `Rollback window expired. Cannot rollback to versions older than ${rollbackWindowDays} days`
    );
  }

  // Restore template from snapshot
  this.projectConfiguration =
    targetSnapshot.templateSnapshot.projectConfiguration;
  this.taskTemplates = targetSnapshot.templateSnapshot.taskTemplates;
  this.automationRules = targetSnapshot.templateSnapshot.automationRules;
  this.versioningConfiguration.currentVersion = { ...targetSnapshot.version };

  // Log rollback action
  this.securityConfiguration.securityAuditLog.push({
    action: 'template_rollback',
    timestamp: new Date(),
    details: {
      fromVersion: this.versioningConfiguration.currentVersion,
      toVersion: targetVersion,
    },
    riskLevel: 'medium',
  });
};

// **INDEXES FOR PERFORMANCE**
projectTemplateSchema.index({
  name: 'text',
  description: 'text',
  'marketplace.searchKeywords': 'text',
});
projectTemplateSchema.index({ category: 1, type: 1, 'lifecycle.status': 1 });
projectTemplateSchema.index({ creator: 1, 'lifecycle.status': 1 });
projectTemplateSchema.index({ organization: 1, visibility: 1 });
projectTemplateSchema.index({
  'usage.averageRating': -1,
  'usage.totalUses': -1,
});
projectTemplateSchema.index({
  'marketplace.featuredTemplate': 1,
  'marketplace.isPremium': 1,
});

// **VIRTUAL FIELDS**
projectTemplateSchema.virtual('versionString').get(function () {
  const v = this.versioningConfiguration.currentVersion;
  return `${v.major}.${v.minor}.${v.patch}`;
});

projectTemplateSchema.virtual('isDeprecated').get(function () {
  return this.lifecycle.status === 'deprecated' || this.lifecycle.deprecatedAt;
});

projectTemplateSchema.virtual('securityScore').get(function () {
  // Calculate security score based on configuration
  let score = 100;

  if (this.securityConfiguration.allowScriptExecution) score -= 30;
  if (this.securityConfiguration.sandboxConfiguration.networkAccess)
    score -= 20;
  if (this.securityConfiguration.sandboxConfiguration.fileSystemAccess)
    score -= 25;
  if (!this.securityConfiguration.contentSecurityPolicy.sanitizeUserInput)
    score -= 15;
  if (!this.securityConfiguration.contentSecurityPolicy.validateTemplateContent)
    score -= 10;

  return Math.max(0, score);
});

const ProjectTemplate = mongoose.model(
  'ProjectTemplate',
  projectTemplateSchema
);

export default ProjectTemplate;
```

### 2. Automation Rule Schema

**File: `server/models/AutomationRule.js`**

```javascript
import mongoose from 'mongoose';

/**
 * AutomationRule Schema
 *
 * Defines automated workflows that trigger based on events
 * and conditions, then execute specified actions.
 *
 * This enables teams to automate repetitive tasks and
 * maintain consistency across their projects.
 */
const automationRuleSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true,
    maxLength: 100,
  },

  description: {
    type: String,
    maxLength: 500,
  },

  // Rule Ownership
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true,
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // Rule Status
  enabled: {
    type: Boolean,
    default: true,
  },

  // Trigger Configuration
  trigger: {
    type: {
      type: String,
      required: true,
      enum: [
        'task.created',
        'task.updated',
        'task.status_changed',
        'task.assigned',
        'task.completed',
        'task.overdue',
        'project.member_added',
        'project.member_removed',
        'comment.created',
        'comment.mentioned',
        'file.uploaded',
        'time.scheduled',
        'webhook.received',
      ],
    },

    // Additional trigger configuration
    config: {
      // For status_changed triggers
      fromStatus: String,
      toStatus: String,

      // For scheduled triggers
      schedule: {
        frequency: {
          type: String,
          enum: ['once', 'daily', 'weekly', 'monthly'],
        },
        time: String, // HH:mm format
        dayOfWeek: Number, // 0-6 for weekly
        dayOfMonth: Number, // 1-31 for monthly
        timezone: String,
      },

      // For webhook triggers
      webhookUrl: String,
      webhookSecret: String,
    },
  },

  // Conditions (ALL must be true for rule to execute)
  conditions: [
    {
      type: {
        type: String,
        enum: [
          'field_equals',
          'field_not_equals',
          'field_contains',
          'field_greater_than',
          'field_less_than',
          'user_in_role',
          'date_is',
          'time_between',
        ],
      },

      // Field to check (dot notation supported)
      field: String,

      // Comparison operator and value
      operator: {
        type: String,
        enum: [
          'eq',
          'ne',
          'gt',
          'lt',
          'gte',
          'lte',
          'in',
          'nin',
          'contains',
          'regex',
        ],
      },

      value: mongoose.Schema.Types.Mixed,

      // For complex conditions
      config: {
        caseSensitive: Boolean,
        dateFormat: String,
      },
    },
  ],

  // Actions to execute when triggered and conditions met
  actions: [
    {
      type: {
        type: String,
        enum: [
          'update_field',
          'assign_task',
          'create_task',
          'send_notification',
          'send_email',
          'add_comment',
          'add_label',
          'remove_label',
          'move_to_status',
          'create_subtask',
          'webhook_call',
          'run_script',
        ],
      },

      // Action configuration
      config: {
        // For update_field
        field: String,
        value: mongoose.Schema.Types.Mixed,

        // For assign_task
        assignTo: {
          type: String,
          enum: ['specific_user', 'role', 'round_robin', 'least_loaded'],
        },
        userId: mongoose.Schema.Types.ObjectId,
        role: String,

        // For create_task
        taskTemplate: {
          title: String,
          description: String,
          priority: String,
          tags: [String],
          assignTo: String,
        },

        // For notifications/emails
        recipient: {
          type: String,
          enum: [
            'trigger_user',
            'assignee',
            'project_members',
            'specific_users',
          ],
        },
        recipientIds: [mongoose.Schema.Types.ObjectId],
        subject: String,
        message: String,

        // For webhook calls
        url: String,
        method: String,
        headers: Map,
        body: mongoose.Schema.Types.Mixed,

        // For scripts (sandboxed)
        script: String,
      },
    },
  ],

  // Execution History
  executions: [
    {
      triggeredAt: {
        type: Date,
        default: Date.now,
      },
      triggeredBy: mongoose.Schema.Types.ObjectId,
      triggerData: Map,
      conditionsResult: Boolean,
      actionsExecuted: [
        {
          action: String,
          success: Boolean,
          error: String,
          result: mongoose.Schema.Types.Mixed,
        },
      ],
      duration: Number, // milliseconds
    },
  ],

  // Performance Metrics
  metrics: {
    totalExecutions: {
      type: Number,
      default: 0,
    },
    successfulExecutions: {
      type: Number,
      default: 0,
    },
    failedExecutions: {
      type: Number,
      default: 0,
    },
    averageExecutionTime: {
      type: Number,
      default: 0,
    },
    lastExecutedAt: Date,
  },

  // Rate Limiting
  rateLimiting: {
    enabled: {
      type: Boolean,
      default: false,
    },
    maxExecutionsPerHour: {
      type: Number,
      default: 100,
    },
    maxExecutionsPerDay: {
      type: Number,
      default: 1000,
    },
  },

  // Error Handling
  errorHandling: {
    retryOnFailure: {
      type: Boolean,
      default: false,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
    retryDelay: {
      type: Number,
      default: 60000, // 1 minute
    },
    notifyOnFailure: {
      type: Boolean,
      default: true,
    },
  },

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes
automationRuleSchema.index({ project: 1, enabled: 1 });
automationRuleSchema.index({ 'trigger.type': 1, enabled: 1 });
automationRuleSchema.index({ createdBy: 1 });

// Methods
automationRuleSchema.methods.execute = async function (triggerData) {
  const execution = {
    triggeredAt: new Date(),
    triggeredBy: triggerData.userId,
    triggerData: new Map(Object.entries(triggerData)),
    conditionsResult: false,
    actionsExecuted: [],
    duration: 0,
  };

  const startTime = Date.now();

  try {
    // Check conditions
    execution.conditionsResult = await this.checkConditions(triggerData);

    if (execution.conditionsResult) {
      // Execute actions
      for (const action of this.actions) {
        const actionResult = await this.executeAction(action, triggerData);
        execution.actionsExecuted.push(actionResult);
      }
    }

    // Update metrics
    this.metrics.totalExecutions += 1;
    this.metrics.successfulExecutions += 1;
    this.metrics.lastExecutedAt = new Date();
  } catch (error) {
    this.metrics.totalExecutions += 1;
    this.metrics.failedExecutions += 1;
    execution.error = error.message;
  }

  execution.duration = Date.now() - startTime;

  // Update average execution time
  this.metrics.averageExecutionTime =
    (this.metrics.averageExecutionTime * (this.metrics.totalExecutions - 1) +
      execution.duration) /
    this.metrics.totalExecutions;

  // Add to history (keep last 100)
  this.executions.unshift(execution);
  if (this.executions.length > 100) {
    this.executions = this.executions.slice(0, 100);
  }

  await this.save();

  return execution;
};

automationRuleSchema.methods.checkConditions = async function (data) {
  // Implementation would check all conditions
  // This is a placeholder
  return true;
};

automationRuleSchema.methods.executeAction = async function (action, data) {
  // Implementation would execute the specific action
  // This is a placeholder
  return {
    action: action.type,
    success: true,
    result: {},
  };
};

const AutomationRule = mongoose.model('AutomationRule', automationRuleSchema);

export default AutomationRule;
```

### 3. Template Gallery Component

**File: `client/src/components/projects/organisms/TemplateGallery.js`**

```javascript
import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Grid3x3,
  List,
  Search,
  Filter,
  Star,
  Users,
  Clock,
  TrendingUp,
  Download,
  Eye,
  Heart,
  Copy,
  Edit,
  Trash2,
  MoreVertical,
  Package,
  Zap,
  Award,
} from 'lucide-react';
import { TemplateCard } from '../molecules/TemplateCard';
import { TemplateFilters } from '../molecules/TemplateFilters';
import { TemplatePreviewModal } from '../molecules/TemplatePreviewModal';
import { CreateTemplateModal } from '../molecules/CreateTemplateModal';
import { cn } from '../../../utils/cn';
import {
  fetchTemplates,
  selectFilteredTemplates,
  setTemplateFilters,
} from '../../../features/templates/templatesSlice';

/**
 * TemplateGallery Component
 *
 * A comprehensive template browsing and selection interface that allows
 * users to discover, preview, and use project templates. Features include:
 *
 * - Grid/List view toggle
 * - Advanced filtering by category, type, rating, etc.
 * - Template preview with full details
 * - Usage statistics and ratings
 * - Template creation and management
 * - Search functionality
 *
 * The component integrates with Redux for state management and provides
 * a smooth user experience for template discovery and selection.
 */
export const TemplateGallery = ({
  onSelectTemplate,
  showCreateButton = true,
  className,
}) => {
  const dispatch = useDispatch();

  // Local state
  const [view, setView] = useState('grid'); // 'grid' | 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Redux state
  const { templates, loading, filters } = useSelector(
    (state) => state.templates
  );
  const currentUser = useSelector((state) => state.auth.user);
  const filteredTemplates = useSelector(selectFilteredTemplates);

  // Debounced search
  const debouncedSearch = useDebounce(searchQuery, 300);

  /**
   * Load templates on mount and when filters change
   */
  useEffect(() => {
    dispatch(
      fetchTemplates({
        ...filters,
        search: debouncedSearch,
      })
    );
  }, [dispatch, filters, debouncedSearch]);

  /**
   * Group templates by category for better organization
   */
  const groupedTemplates = useMemo(() => {
    const groups = filteredTemplates.reduce((acc, template) => {
      const category = template.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(template);
      return acc;
    }, {});

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredTemplates]);

  /**
   * Get template statistics
   */
  const stats = useMemo(() => {
    return {
      total: filteredTemplates.length,
      system: filteredTemplates.filter((t) => t.type === 'system').length,
      community: filteredTemplates.filter((t) => t.type === 'community').length,
      personal: filteredTemplates.filter((t) => t.type === 'personal').length,
      mostUsed: filteredTemplates.sort(
        (a, b) => b.usage.count - a.usage.count
      )[0],
      topRated: filteredTemplates.sort(
        (a, b) => b.usage.averageRating - a.usage.averageRating
      )[0],
    };
  }, [filteredTemplates]);

  /**
   * Handle template selection
   */
  const handleSelectTemplate = (template) => {
    if (onSelectTemplate) {
      onSelectTemplate(template);
    } else {
      setSelectedTemplate(template);
      setShowPreview(true);
    }
  };

  /**
   * Handle template actions (edit, delete, duplicate)
   */
  const handleTemplateAction = async (action, template) => {
    switch (action) {
      case 'edit':
        // Open edit modal
        break;
      case 'delete':
        if (window.confirm('Are you sure you want to delete this template?')) {
          await dispatch(deleteTemplate(template._id));
        }
        break;
      case 'duplicate':
        await dispatch(duplicateTemplate(template._id));
        break;
      default:
        break;
    }
  };

  /**
   * Render template stats card
   */
  const renderStatsCard = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Total Templates</p>
            <p className="text-2xl font-semibold">{stats.total}</p>
          </div>
          <Package className="w-8 h-8 text-blue-500" />
        </div>
      </div>

      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Community</p>
            <p className="text-2xl font-semibold">{stats.community}</p>
          </div>
          <Users className="w-8 h-8 text-green-500" />
        </div>
      </div>

      {stats.mostUsed && (
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Most Used</p>
              <p className="text-sm font-medium truncate">
                {stats.mostUsed.name}
              </p>
              <p className="text-xs text-gray-400">
                {stats.mostUsed.formattedUsageCount} uses
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      )}

      {stats.topRated && (
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Top Rated</p>
              <p className="text-sm font-medium truncate">
                {stats.topRated.name}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <Star className="w-3 h-3 text-yellow-500 fill-current" />
                <span className="text-xs">
                  {stats.topRated.usage.averageRating.toFixed(1)}
                </span>
              </div>
            </div>
            <Award className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Project Templates</h2>

          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setView('grid')}
                className={cn(
                  'p-2 rounded transition-colors',
                  view === 'grid'
                    ? 'bg-white text-blue-600 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView('list')}
                className={cn(
                  'p-2 rounded transition-colors',
                  view === 'list'
                    ? 'bg-white text-blue-600 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Create Template Button */}
            {showCreateButton && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create Template</span>
              </button>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors',
              showFilters
                ? 'bg-blue-50 text-blue-600 border-blue-200'
                : 'text-gray-700 border-gray-300 hover:bg-gray-50'
            )}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {Object.keys(filters).length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                {Object.keys(filters).length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {renderStatsCard()}

      {/* Filters Panel */}
      {showFilters && (
        <TemplateFilters
          filters={filters}
          onChange={(newFilters) => dispatch(setTemplateFilters(newFilters))}
          className="mb-6"
        />
      )}

      {/* Templates Grid/List */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Package className="w-16 h-16 mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No templates found</p>
            <p className="text-sm">
              Try adjusting your filters or search query
            </p>
          </div>
        ) : view === 'grid' ? (
          <div className="space-y-8">
            {groupedTemplates.map(([category, templates]) => (
              <div key={category}>
                <h3 className="text-lg font-medium text-gray-900 mb-4 capitalize">
                  {category.replace('-', ' ')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {templates.map((template) => (
                    <TemplateCard
                      key={template._id}
                      template={template}
                      onClick={() => handleSelectTemplate(template)}
                      onAction={(action) =>
                        handleTemplateAction(action, template)
                      }
                      isOwner={template.owner === currentUser?._id}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTemplates.map((template) => (
              <TemplateListItem
                key={template._id}
                template={template}
                onClick={() => handleSelectTemplate(template)}
                onAction={(action) => handleTemplateAction(action, template)}
                isOwner={template.owner === currentUser?._id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && selectedTemplate && (
        <TemplatePreviewModal
          template={selectedTemplate}
          onClose={() => {
            setShowPreview(false);
            setSelectedTemplate(null);
          }}
          onUse={() => {
            onSelectTemplate?.(selectedTemplate);
            setShowPreview(false);
          }}
        />
      )}

      {/* Create Template Modal */}
      {showCreateModal && (
        <CreateTemplateModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={(newTemplate) => {
            setShowCreateModal(false);
            // Refresh templates
            dispatch(fetchTemplates(filters));
          }}
        />
      )}
    </div>
  );
};
```

### 4. Automation Builder Component

**File: `client/src/components/projects/organisms/AutomationBuilder.js`**

```javascript
import React, { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import {
  Zap,
  Plus,
  Play,
  Pause,
  Settings,
  Clock,
  Filter,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronRight,
  Save,
  Trash2,
  Copy,
  HelpCircle,
  TestTube,
} from 'lucide-react';
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { TriggerSelector } from '../molecules/TriggerSelector';
import { ConditionBuilder } from '../molecules/ConditionBuilder';
import { ActionBuilder } from '../molecules/ActionBuilder';
import { AutomationTimeline } from '../molecules/AutomationTimeline';
import { cn } from '../../../utils/cn';
import {
  createAutomation,
  updateAutomation,
  testAutomation,
} from '../../../features/automations/automationsSlice';

/**
 * AutomationBuilder Component
 *
 * A visual workflow builder that allows users to create powerful
 * automation rules using a trigger-condition-action model.
 *
 * Features:
 * - Drag-and-drop interface for building workflows
 * - Visual representation of automation flow
 * - Real-time validation and testing
 * - Template suggestions
 * - Performance metrics
 *
 * The builder follows a three-step process:
 * 1. Select a trigger event
 * 2. Define conditions (optional)
 * 3. Configure actions to execute
 */
export const AutomationBuilder = ({
  automation = null,
  projectId,
  onSave,
  onCancel,
  className,
}) => {
  const dispatch = useDispatch();

  // State for the automation being built/edited
  const [rule, setRule] = useState({
    name: automation?.name || '',
    description: automation?.description || '',
    enabled: automation?.enabled ?? true,
    trigger: automation?.trigger || null,
    conditions: automation?.conditions || [],
    actions: automation?.actions || [],
  });

  // UI state
  const [activeStep, setActiveStep] = useState('trigger'); // 'trigger' | 'conditions' | 'actions'
  const [isTestMode, setIsTestMode] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [errors, setErrors] = useState({});
  const [showHelp, setShowHelp] = useState(false);

  /**
   * Validate the current rule configuration
   */
  const validateRule = useCallback(() => {
    const newErrors = {};

    if (!rule.name.trim()) {
      newErrors.name = 'Automation name is required';
    }

    if (!rule.trigger) {
      newErrors.trigger = 'Please select a trigger event';
    }

    if (rule.actions.length === 0) {
      newErrors.actions = 'At least one action is required';
    }

    // Validate individual actions
    rule.actions.forEach((action, index) => {
      if (!action.type) {
        newErrors[`action_${index}`] = 'Action type is required';
      }
      // Additional validation based on action type
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [rule]);

  /**
   * Handle saving the automation
   */
  const handleSave = async () => {
    if (!validateRule()) {
      return;
    }

    try {
      const automationData = {
        ...rule,
        project: projectId,
      };

      if (automation?._id) {
        await dispatch(
          updateAutomation({
            id: automation._id,
            updates: automationData,
          })
        ).unwrap();
      } else {
        await dispatch(createAutomation(automationData)).unwrap();
      }

      onSave?.(automationData);
    } catch (error) {
      console.error('Failed to save automation:', error);
    }
  };

  /**
   * Test the automation with sample data
   */
  const handleTest = async () => {
    if (!validateRule()) {
      return;
    }

    setIsTestMode(true);
    setTestResults(null);

    try {
      const results = await dispatch(
        testAutomation({
          rule,
          projectId,
        })
      ).unwrap();

      setTestResults(results);
    } catch (error) {
      setTestResults({
        success: false,
        error: error.message,
      });
    } finally {
      setIsTestMode(false);
    }
  };

  /**
   * Handle trigger selection
   */
  const handleTriggerSelect = (trigger) => {
    setRule((prev) => ({
      ...prev,
      trigger,
      // Reset conditions and actions if trigger type changes significantly
      conditions: prev.trigger?.type !== trigger.type ? [] : prev.conditions,
      actions: prev.trigger?.type !== trigger.type ? [] : prev.actions,
    }));
    setActiveStep('conditions');
  };

  /**
   * Handle condition changes
   */
  const handleConditionsChange = (conditions) => {
    setRule((prev) => ({ ...prev, conditions }));
  };

  /**
   * Handle action changes
   */
  const handleActionsChange = (actions) => {
    setRule((prev) => ({ ...prev, actions }));
  };

  /**
   * Render step indicator
   */
  const renderStepIndicator = () => {
    const steps = [
      { id: 'trigger', label: 'Trigger', icon: Zap },
      { id: 'conditions', label: 'Conditions', icon: Filter },
      { id: 'actions', label: 'Actions', icon: Activity },
    ];

    return (
      <div className="flex items-center justify-between mb-6">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = activeStep === step.id;
          const isComplete =
            (step.id === 'trigger' && rule.trigger) ||
            (step.id === 'conditions' && activeStep !== 'trigger') ||
            (step.id === 'actions' && rule.actions.length > 0);

          return (
            <React.Fragment key={step.id}>
              <button
                onClick={() => setActiveStep(step.id)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : isComplete
                    ? 'bg-green-50 text-green-600 hover:bg-green-100'
                    : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                )}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center',
                    isActive
                      ? 'bg-blue-600 text-white'
                      : isComplete
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-300 text-white'
                  )}
                >
                  {isComplete && !isActive ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <div className="text-left">
                  <p className="font-medium">{step.label}</p>
                  <p className="text-sm opacity-75">
                    {step.id === 'trigger' && rule.trigger
                      ? rule.trigger.type.replace('_', ' ')
                      : step.id === 'conditions'
                      ? `${rule.conditions.length} condition(s)`
                      : step.id === 'actions'
                      ? `${rule.actions.length} action(s)`
                      : 'Not configured'}
                  </p>
                </div>
              </button>

              {index < steps.length - 1 && (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  /**
   * Render the active step content
   */
  const renderStepContent = () => {
    switch (activeStep) {
      case 'trigger':
        return (
          <TriggerSelector
            selected={rule.trigger}
            onChange={handleTriggerSelect}
            projectId={projectId}
            error={errors.trigger}
          />
        );

      case 'conditions':
        return (
          <ConditionBuilder
            trigger={rule.trigger}
            conditions={rule.conditions}
            onChange={handleConditionsChange}
            projectId={projectId}
          />
        );

      case 'actions':
        return (
          <ActionBuilder
            trigger={rule.trigger}
            conditions={rule.conditions}
            actions={rule.actions}
            onChange={handleActionsChange}
            projectId={projectId}
            error={errors.actions}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn('max-w-6xl mx-auto', className)}>
      {/* Header */}
      <div className="bg-white rounded-lg border p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <input
              type="text"
              value={rule.name}
              onChange={(e) =>
                setRule((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Automation name..."
              className={cn(
                'text-2xl font-semibold bg-transparent border-none outline-none w-full mb-2',
                errors.name && 'text-red-600'
              )}
            />
            {errors.name && (
              <p className="text-sm text-red-600 mb-2">{errors.name}</p>
            )}

            <textarea
              value={rule.description}
              onChange={(e) =>
                setRule((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Description (optional)..."
              className="w-full bg-transparent border-none outline-none resize-none text-gray-600"
              rows={2}
            />
          </div>

          <div className="flex items-center gap-2 ml-4">
            {/* Enable/Disable Toggle */}
            <button
              onClick={() =>
                setRule((prev) => ({ ...prev, enabled: !prev.enabled }))
              }
              className={cn(
                'px-4 py-2 rounded-lg font-medium transition-colors',
                rule.enabled
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {rule.enabled ? (
                <>
                  <Play className="w-4 h-4 inline mr-2" />
                  Enabled
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4 inline mr-2" />
                  Disabled
                </>
              )}
            </button>

            {/* Help Button */}
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Main Content */}
      <div className="bg-white rounded-lg border p-6 mb-6">
        {renderStepContent()}
      </div>

      {/* Automation Flow Visualization */}
      {rule.trigger && (
        <div className="bg-white rounded-lg border p-6 mb-6">
          <h3 className="text-lg font-medium mb-4">Automation Flow</h3>
          <AutomationTimeline
            trigger={rule.trigger}
            conditions={rule.conditions}
            actions={rule.actions}
          />
        </div>
      )}

      {/* Test Results */}
      {testResults && (
        <div
          className={cn(
            'rounded-lg border p-6 mb-6',
            testResults.success
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          )}
        >
          <div className="flex items-start gap-3">
            {testResults.success ? (
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
            )}
            <div className="flex-1">
              <h4
                className={cn(
                  'font-medium mb-1',
                  testResults.success ? 'text-green-900' : 'text-red-900'
                )}
              >
                {testResults.success ? 'Test Passed' : 'Test Failed'}
              </h4>
              <p
                className={cn(
                  'text-sm',
                  testResults.success ? 'text-green-700' : 'text-red-700'
                )}
              >
                {testResults.message || testResults.error}
              </p>

              {testResults.details && (
                <details className="mt-3">
                  <summary className="text-sm font-medium cursor-pointer">
                    View Details
                  </summary>
                  <pre className="mt-2 p-3 bg-white rounded text-xs overflow-auto">
                    {JSON.stringify(testResults.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onCancel}
          className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Cancel
        </button>

        <div className="flex items-center gap-3">
          {/* Test Button */}
          <button
            onClick={handleTest}
            disabled={!rule.trigger || rule.actions.length === 0 || isTestMode}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
              !rule.trigger || rule.actions.length === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            <TestTube className="w-4 h-4" />
            {isTestMode ? 'Testing...' : 'Test'}
          </button>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={Object.keys(errors).length > 0}
            className={cn(
              'inline-flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors',
              Object.keys(errors).length > 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            )}
          >
            <Save className="w-4 h-4" />
            {automation ? 'Update' : 'Create'} Automation
          </button>
        </div>
      </div>

      {/* Help Panel */}
      {showHelp && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl border-l z-50 overflow-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Automation Help</h3>
              <button
                onClick={() => setShowHelp(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="font-medium mb-2">What are automations?</h4>
                <p className="text-sm text-gray-600">
                  Automations help you save time by automatically performing
                  actions when certain events occur in your project.
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">How it works</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                  <li>
                    Choose a trigger event (e.g., "When a task is created")
                  </li>
                  <li>
                    Add conditions to filter when the automation runs (optional)
                  </li>
                  <li>
                    Define actions to perform (e.g., "Assign to team member")
                  </li>
                </ol>
              </div>

              <div>
                <h4 className="font-medium mb-2">Common use cases</h4>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                    <span>Auto-assign tasks based on labels or priority</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                    <span>Send notifications when tasks are overdue</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                    <span>Move completed tasks to "Done" status</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                    <span>Create follow-up tasks automatically</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
```

### 5. Template Controller

**File: `server/controllers/templateController.js`**

```javascript
import ProjectTemplate from '../models/ProjectTemplate.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import AutomationRule from '../models/AutomationRule.js';
import { uploadFile } from '../utils/fileUpload.js';

/**
 * Template Controller
 *
 * Handles all template-related operations including:
 * - Template CRUD operations
 * - Template usage and application
 * - Template sharing and publishing
 * - Template ratings and analytics
 */
export const templateController = {
  /**
   * Get templates with filtering and pagination
   */
  async getTemplates(req, res) {
    try {
      const {
        category,
        type,
        search,
        tags,
        minRating,
        sortBy = 'usage.count',
        sortOrder = 'desc',
        page = 1,
        limit = 20,
      } = req.query;

      // Build query
      const query = {};

      // Filter by category
      if (category) {
        query.category = category;
      }

      // Filter by type and access control
      if (type) {
        query.type = type;
      } else {
        // Default: show templates user has access to
        query.$or = [
          { type: 'system' },
          { type: 'community', published: true },
          { type: 'personal', owner: req.user.id },
          { type: 'organization', organization: req.user.organization },
          { sharedWith: req.user.id },
        ];
      }

      // Text search
      if (search) {
        query.$text = { $search: search };
      }

      // Tag filter
      if (tags) {
        const tagArray = Array.isArray(tags) ? tags : tags.split(',');
        query.tags = { $in: tagArray };
      }

      // Rating filter
      if (minRating) {
        query['usage.averageRating'] = { $gte: parseFloat(minRating) };
      }

      // Execute query
      const templates = await ProjectTemplate.find(query)
        .populate('owner', 'name avatar')
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();

      // Get total count for pagination
      const totalCount = await ProjectTemplate.countDocuments(query);

      // Get category counts for filters
      const categoryCounts = await ProjectTemplate.aggregate([
        { $match: query },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]);

      res.json({
        templates,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
        filters: {
          categories: categoryCounts,
        },
      });
    } catch (error) {
      console.error('Error fetching templates:', error);
      res.status(500).json({ error: 'Failed to fetch templates' });
    }
  },

  /**
   * Get single template with full details
   */
  async getTemplate(req, res) {
    try {
      const { templateId } = req.params;

      const template = await ProjectTemplate.findById(templateId)
        .populate('owner', 'name avatar')
        .populate('usage.ratings.user', 'name avatar');

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      // Check access permissions
      const hasAccess =
        template.type === 'system' ||
        (template.type === 'community' && template.published) ||
        template.owner._id.toString() === req.user.id ||
        template.sharedWith.includes(req.user.id);

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json({ template });
    } catch (error) {
      console.error('Error fetching template:', error);
      res.status(500).json({ error: 'Failed to fetch template' });
    }
  },

  /**
   * Create a new template
   */
  async createTemplate(req, res) {
    try {
      const {
        name,
        description,
        category,
        type = 'personal',
        structure,
        tags,
        thumbnail,
      } = req.body;

      // Validate template data
      if (!name || !category || !structure) {
        return res.status(400).json({
          error: 'Name, category, and structure are required',
        });
      }

      // Create template
      const template = new ProjectTemplate({
        name,
        description,
        category,
        type,
        owner: req.user.id,
        organization:
          type === 'organization' ? req.user.organization : undefined,
        structure,
        tags: tags || [],
        thumbnail,
      });

      await template.save();

      // Populate owner data
      await template.populate('owner', 'name avatar');

      res.status(201).json({
        message: 'Template created successfully',
        template,
      });
    } catch (error) {
      console.error('Error creating template:', error);
      res.status(500).json({ error: 'Failed to create template' });
    }
  },

  /**
   * Create a template from an existing project
   */
  async createFromProject(req, res) {
    try {
      const { projectId } = req.params;
      const { name, description, category, includeOptions } = req.body;

      // Get the source project
      const project = await Project.findById(projectId)
        .populate('tasks')
        .populate('members.user', 'name');

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check if user has access to the project
      const hasAccess =
        project.owner.toString() === req.user.id ||
        project.members.some((m) => m.user._id.toString() === req.user.id);

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Build template structure from project
      const structure = {
        projectDefaults: {
          visibility: project.visibility,
          features: project.features,
          settings: project.settings,
        },
        tasks: [],
        milestones: [],
        teamStructure: [],
        automationRules: [],
      };

      // Include tasks if requested
      if (includeOptions.tasks) {
        const tasks = await Task.find({ project: projectId }).sort({
          order: 1,
        });

        // Create task templates with relative dates
        const projectStartDate = new Date(project.createdAt);
        const taskMap = new Map();

        structure.tasks = tasks.map((task) => {
          const taskTemplate = {
            title: task.title,
            description: task.description,
            priority: task.priority,
            estimatedHours: task.estimatedHours,
            tags: task.tags,
            subtasks: task.subtasks.map((st) => ({
              title: st.title,
              description: st.description,
              estimatedHours: st.estimatedHours,
            })),
          };

          // Calculate relative dates
          if (task.startDate) {
            taskTemplate.startDateOffset = Math.floor(
              (task.startDate - projectStartDate) / (1000 * 60 * 60 * 24)
            );
          }

          if (task.dueDate) {
            taskTemplate.dueDateOffset = Math.floor(
              (task.dueDate - projectStartDate) / (1000 * 60 * 60 * 24)
            );
          }

          // Store mapping for dependencies
          taskMap.set(task._id.toString(), taskTemplate);

          return taskTemplate;
        });

        // Add dependencies
        tasks.forEach((task, index) => {
          if (task.dependencies?.blockedBy?.length > 0) {
            structure.tasks[index].dependencies = task.dependencies.blockedBy
              .map((depId) => {
                const depIndex = tasks.findIndex(
                  (t) => t._id.toString() === depId.toString()
                );
                return depIndex >= 0
                  ? {
                      type: `task_${depIndex}`,
                      dependencyType: 'blockedBy',
                    }
                  : null;
              })
              .filter(Boolean);
          }
        });
      }

      // Include team structure if requested
      if (includeOptions.teamStructure) {
        structure.teamStructure = project.members.map((member) => ({
          role: member.role,
          title: member.title || member.role,
          responsibilities: member.responsibilities || '',
        }));
      }

      // Include automation rules if requested
      if (includeOptions.automations) {
        const automations = await AutomationRule.find({
          project: projectId,
          enabled: true,
        });

        structure.automationRules = automations.map((rule) => ({
          name: rule.name,
          trigger: rule.trigger,
          conditions: rule.conditions,
          actions: rule.actions,
        }));
      }

      // Create the template
      const template = new ProjectTemplate({
        name: name || `${project.name} Template`,
        description: description || project.description,
        category,
        type: 'personal',
        owner: req.user.id,
        structure,
        tags: includeOptions.tags || [],
      });

      await template.save();

      res.status(201).json({
        message: 'Template created from project',
        template,
      });
    } catch (error) {
      console.error('Error creating template from project:', error);
      res.status(500).json({ error: 'Failed to create template' });
    }
  },

  /**
   * Apply template to create a new project
   */
  async applyTemplate(req, res) {
    try {
      const { templateId } = req.params;
      const { projectName, projectDescription, options } = req.body;

      // Get the template
      const template = await ProjectTemplate.findById(templateId);

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      // Record template usage
      await template.recordUsage();

      // Create project from template
      const projectData = {
        name: projectName || template.name,
        description: projectDescription || template.description,
        owner: req.user.id,
        ...template.structure.projectDefaults,
        createdFromTemplate: templateId,
      };

      const project = new Project(projectData);
      await project.save();

      // Create tasks from template
      if (options.includeTasks && template.structure.tasks.length > 0) {
        const taskIdMap = new Map();
        const createdTasks = [];

        // First pass: create all tasks
        for (const taskTemplate of template.structure.tasks) {
          const taskData = {
            ...taskTemplate,
            project: project._id,
            createdBy: 'automation',
            createdAt: new Date(),
          };

          // Convert relative dates to actual dates
          if (taskTemplate.startDateOffset !== undefined) {
            taskData.startDate = new Date();
            taskData.startDate.setDate(
              taskData.startDate.getDate() + taskTemplate.startDateOffset
            );
          }

          if (taskTemplate.dueDateOffset !== undefined) {
            taskData.dueDate = new Date();
            taskData.dueDate.setDate(
              taskData.dueDate.getDate() + taskTemplate.dueDateOffset
            );
          }

          // Handle assignment
          if (taskTemplate.assignToRole === 'owner') {
            taskData.assignee = req.user.id;
          }

          const task = new Task(taskData);
          await task.save();

          createdTasks.push(task);
          taskIdMap.set(`task_${createdTasks.length - 1}`, task._id);
        }

        // Second pass: set up dependencies
        for (let i = 0; i < template.structure.tasks.length; i++) {
          const taskTemplate = template.structure.tasks[i];
          if (taskTemplate.dependencies?.length > 0) {
            const task = createdTasks[i];

            for (const dep of taskTemplate.dependencies) {
              const depTaskId = taskIdMap.get(dep.type);
              if (depTaskId) {
                if (dep.dependencyType === 'blockedBy') {
                  task.dependencies.blockedBy.push(depTaskId);
                } else {
                  task.dependencies.blocks.push(depTaskId);
                }
              }
            }

            await task.save();
          }
        }
      }

      // Create automation rules from template
      if (
        options.includeAutomations &&
        template.structure.automationRules.length > 0
      ) {
        for (const ruleTemplate of template.structure.automationRules) {
          const rule = new AutomationRule({
            ...ruleTemplate,
            project: project._id,
            createdBy: req.user.id,
          });

          await rule.save();
        }
      }

      res.status(201).json({
        message: 'Project created from template',
        project,
        templateUsed: {
          id: template._id,
          name: template.name,
        },
      });
    } catch (error) {
      console.error('Error applying template:', error);
      res.status(500).json({ error: 'Failed to apply template' });
    }
  },

  /**
   * Rate a template
   */
  async rateTemplate(req, res) {
    try {
      const { templateId } = req.params;
      const { rating, comment } = req.body;

      if (!rating || rating < 1 || rating > 5) {
        return res
          .status(400)
          .json({ error: 'Rating must be between 1 and 5' });
      }

      const template = await ProjectTemplate.findById(templateId);

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      // Check if user has already rated
      const existingRating = template.usage.ratings.find(
        (r) => r.user.toString() === req.user.id
      );

      if (existingRating) {
        // Update existing rating
        existingRating.rating = rating;
        existingRating.comment = comment;
        existingRating.createdAt = new Date();
      } else {
        // Add new rating
        template.usage.ratings.push({
          user: req.user.id,
          rating,
          comment,
        });
      }

      // Update average rating
      template.updateAverageRating();
      await template.save();

      res.json({
        message: 'Rating submitted successfully',
        averageRating: template.usage.averageRating,
      });
    } catch (error) {
      console.error('Error rating template:', error);
      res.status(500).json({ error: 'Failed to rate template' });
    }
  },

  /**
   * Publish template to community
   */
  async publishTemplate(req, res) {
    try {
      const { templateId } = req.params;

      const template = await ProjectTemplate.findById(templateId);

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      // Check ownership
      if (template.owner.toString() !== req.user.id) {
        return res
          .status(403)
          .json({ error: 'Only template owner can publish' });
      }

      // Update template
      template.type = 'community';
      template.published = true;
      template.publishedAt = new Date();

      await template.save();

      res.json({
        message: 'Template published successfully',
        template,
      });
    } catch (error) {
      console.error('Error publishing template:', error);
      res.status(500).json({ error: 'Failed to publish template' });
    }
  },
};
```

### 6. Automation Engine

**File: `server/services/automationEngine.js`**

```javascript
import AutomationRule from '../models/AutomationRule.js';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import { sendNotification } from './notificationService.js';
import { sendEmail } from './emailService.js';
import axios from 'axios';
import vm from 'vm';

/**
 * Automation Engine
 *
 * Processes automation rules by:
 * - Listening to system events
 * - Evaluating conditions
 * - Executing actions
 * - Managing rule execution history
 * - Handling errors and retries
 */
class AutomationEngine {
  constructor() {
    this.eventHandlers = new Map();
    this.runningExecutions = new Map();
    this.initializeEventHandlers();
  }

  /**
   * Initialize event handlers for all trigger types
   */
  initializeEventHandlers() {
    // Task events
    this.registerEventHandler(
      'task.created',
      this.handleTaskCreated.bind(this)
    );
    this.registerEventHandler(
      'task.updated',
      this.handleTaskUpdated.bind(this)
    );
    this.registerEventHandler(
      'task.status_changed',
      this.handleTaskStatusChanged.bind(this)
    );
    this.registerEventHandler(
      'task.assigned',
      this.handleTaskAssigned.bind(this)
    );
    this.registerEventHandler(
      'task.completed',
      this.handleTaskCompleted.bind(this)
    );

    // Project events
    this.registerEventHandler(
      'project.member_added',
      this.handleMemberAdded.bind(this)
    );
    this.registerEventHandler(
      'project.member_removed',
      this.handleMemberRemoved.bind(this)
    );

    // Comment events
    this.registerEventHandler(
      'comment.created',
      this.handleCommentCreated.bind(this)
    );
    this.registerEventHandler(
      'comment.mentioned',
      this.handleCommentMentioned.bind(this)
    );

    // File events
    this.registerEventHandler(
      'file.uploaded',
      this.handleFileUploaded.bind(this)
    );

    // Scheduled events
    this.initializeScheduler();
  }

  /**
   * Register an event handler
   */
  registerEventHandler(eventType, handler) {
    this.eventHandlers.set(eventType, handler);
  }

  /**
   * Emit an event to trigger automations
   */
  async emit(eventType, eventData) {
    const handler = this.eventHandlers.get(eventType);
    if (handler) {
      await handler(eventData);
    }
  }

  /**
   * Process rules for a specific event
   */
  async processRulesForEvent(eventType, eventData) {
    try {
      // Find all enabled rules for this event type
      const rules = await AutomationRule.find({
        'trigger.type': eventType,
        enabled: true,
        project: eventData.projectId,
      });

      // Execute rules in parallel with rate limiting
      const executions = rules.map((rule) => this.executeRule(rule, eventData));
      await Promise.allSettled(executions);
    } catch (error) {
      console.error(`Error processing rules for event ${eventType}:`, error);
    }
  }

  /**
   * Execute a single automation rule
   */
  async executeRule(rule, triggerData) {
    // Check rate limiting
    if (!this.checkRateLimit(rule)) {
      console.log(`Rate limit exceeded for rule ${rule._id}`);
      return;
    }

    const executionId = `${rule._id}_${Date.now()}`;
    this.runningExecutions.set(executionId, true);

    try {
      // Check conditions
      const conditionsMet = await this.evaluateConditions(
        rule.conditions,
        triggerData
      );

      if (!conditionsMet) {
        return;
      }

      // Execute actions
      const results = [];
      for (const action of rule.actions) {
        try {
          const result = await this.executeAction(action, triggerData, rule);
          results.push({
            action: action.type,
            success: true,
            result,
          });
        } catch (error) {
          results.push({
            action: action.type,
            success: false,
            error: error.message,
          });

          // Handle retry logic
          if (rule.errorHandling.retryOnFailure) {
            this.scheduleRetry(rule, action, triggerData);
          }
        }
      }

      // Record execution
      await rule.execute({
        ...triggerData,
        userId: triggerData.userId || 'system',
      });
    } catch (error) {
      console.error(`Error executing rule ${rule._id}:`, error);

      // Notify on failure if configured
      if (rule.errorHandling.notifyOnFailure) {
        await this.notifyRuleFailure(rule, error);
      }
    } finally {
      this.runningExecutions.delete(executionId);
    }
  }

  /**
   * Evaluate rule conditions
   */
  async evaluateConditions(conditions, data) {
    if (!conditions || conditions.length === 0) {
      return true;
    }

    for (const condition of conditions) {
      const met = await this.evaluateCondition(condition, data);
      if (!met) {
        return false; // ALL conditions must be true
      }
    }

    return true;
  }

  /**
   * Evaluate a single condition
   */
  async evaluateCondition(condition, data) {
    const { type, field, operator, value, config } = condition;

    // Get the field value from data
    const fieldValue = this.getFieldValue(data, field);

    switch (type) {
      case 'field_equals':
        return fieldValue === value;

      case 'field_not_equals':
        return fieldValue !== value;

      case 'field_contains':
        return String(fieldValue).includes(value);

      case 'field_greater_than':
        return Number(fieldValue) > Number(value);

      case 'field_less_than':
        return Number(fieldValue) < Number(value);

      case 'user_in_role':
        return await this.checkUserRole(data.userId, value, data.projectId);

      case 'date_is':
        return this.compareDates(fieldValue, value, operator);

      case 'time_between':
        return this.checkTimeBetween(new Date(), value.start, value.end);

      default:
        return false;
    }
  }

  /**
   * Execute an action
   */
  async executeAction(action, data, rule) {
    const { type, config } = action;

    switch (type) {
      case 'update_field':
        return await this.actionUpdateField(config, data);

      case 'assign_task':
        return await this.actionAssignTask(config, data);

      case 'create_task':
        return await this.actionCreateTask(config, data);

      case 'send_notification':
        return await this.actionSendNotification(config, data);

      case 'send_email':
        return await this.actionSendEmail(config, data);

      case 'add_comment':
        return await this.actionAddComment(config, data);

      case 'add_label':
        return await this.actionAddLabel(config, data);

      case 'remove_label':
        return await this.actionRemoveLabel(config, data);

      case 'move_to_status':
        return await this.actionMoveToStatus(config, data);

      case 'create_subtask':
        return await this.actionCreateSubtask(config, data);

      case 'webhook_call':
        return await this.actionWebhookCall(config, data);

      case 'run_script':
        return await this.actionRunScript(config, data);

      default:
        throw new Error(`Unknown action type: ${type}`);
    }
  }

  /**
   * Action: Update field
   */
  async actionUpdateField(config, data) {
    const { field, value } = config;
    const entity = await this.getEntity(data);

    if (!entity) {
      throw new Error('Entity not found');
    }

    entity[field] = this.resolveValue(value, data);
    await entity.save();

    return { updated: true, field, value: entity[field] };
  }

  /**
   * Action: Assign task
   */
  async actionAssignTask(config, data) {
    const task = await Task.findById(data.taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    let assigneeId;

    switch (config.assignTo) {
      case 'specific_user':
        assigneeId = config.userId;
        break;

      case 'role':
        assigneeId = await this.getUserByRole(config.role, data.projectId);
        break;

      case 'round_robin':
        assigneeId = await this.getRoundRobinUser(data.projectId);
        break;

      case 'least_loaded':
        assigneeId = await this.getLeastLoadedUser(data.projectId);
        break;
    }

    if (assigneeId) {
      task.assignee = assigneeId;
      task.assignedBy = 'automation';
      task.assignedAt = new Date();
      await task.save();

      // Send notification
      await sendNotification({
        recipients: assigneeId,
        type: 'task_assigned',
        title: 'Task Assigned by Automation',
        message: `You have been assigned to "${task.title}"`,
        data: { taskId: task._id, projectId: data.projectId },
      });
    }

    return { assigned: true, assigneeId };
  }

  /**
   * Action: Create task
   */
  async actionCreateTask(config, data) {
    const { taskTemplate } = config;

    const task = new Task({
      ...taskTemplate,
      project: data.projectId,
      createdBy: 'automation',
      createdAt: new Date(),
    });

    // Resolve dynamic values
    task.title = this.resolveValue(taskTemplate.title, data);
    task.description = this.resolveValue(taskTemplate.description, data);

    await task.save();

    return { created: true, taskId: task._id };
  }

  /**
   * Action: Send notification
   */
  async actionSendNotification(config, data) {
    const recipients = await this.resolveRecipients(
      config.recipient,
      config.recipientIds,
      data
    );

    await sendNotification({
      recipients,
      type: 'automation',
      title: this.resolveValue(config.subject, data),
      message: this.resolveValue(config.message, data),
      data: { automationData: data },
    });

    return { sent: true, recipientCount: recipients.length };
  }

  /**
   * Action: Webhook call
   */
  async actionWebhookCall(config, data) {
    const { url, method = 'POST', headers = {}, body } = config;

    const response = await axios({
      method,
      url: this.resolveValue(url, data),
      headers: this.resolveHeaders(headers, data),
      data: this.resolveValue(body, data),
    });

    return {
      success: true,
      status: response.status,
      data: response.data,
    };
  }

  /**
   * Action: Run script (sandboxed)
   */
  async actionRunScript(config, data) {
    const { script } = config;

    // Create a sandboxed context
    const sandbox = {
      data,
      console: {
        log: (...args) => console.log('[Script]', ...args),
      },
      result: null,
    };

    // Run script in sandbox with timeout
    const scriptWrapper = `
      (function() {
        ${script}
      })();
    `;

    const vmScript = new vm.Script(scriptWrapper);
    const context = vm.createContext(sandbox);

    vmScript.runInContext(context, {
      timeout: 5000, // 5 second timeout
    });

    return { executed: true, result: sandbox.result };
  }

  /**
   * Helper: Get field value using dot notation
   */
  getFieldValue(data, field) {
    const parts = field.split('.');
    let value = data;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Helper: Resolve dynamic values
   */
  resolveValue(template, data) {
    if (typeof template !== 'string') {
      return template;
    }

    // Replace variables like {{task.title}}
    return template.replace(/\{\{([^}]+)\}\}/g, (match, field) => {
      return this.getFieldValue(data, field) || match;
    });
  }

  /**
   * Helper: Check rate limiting
   */
  checkRateLimit(rule) {
    if (!rule.rateLimiting.enabled) {
      return true;
    }

    // Implementation would check execution count against limits
    // This is a simplified version
    const recentExecutions = rule.executions.filter((e) => {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      return e.triggeredAt > hourAgo;
    }).length;

    return recentExecutions < rule.rateLimiting.maxExecutionsPerHour;
  }

  /**
   * Initialize scheduled event handling
   */
  initializeScheduler() {
    // Run every minute to check for scheduled automations
    setInterval(async () => {
      await this.processScheduledAutomations();
    }, 60 * 1000);
  }

  /**
   * Process scheduled automations
   */
  async processScheduledAutomations() {
    const now = new Date();

    try {
      const scheduledRules = await AutomationRule.find({
        'trigger.type': 'time.scheduled',
        enabled: true,
      });

      for (const rule of scheduledRules) {
        if (this.shouldRunScheduledRule(rule, now)) {
          await this.executeRule(rule, {
            triggeredAt: now,
            triggeredBy: 'scheduler',
          });
        }
      }
    } catch (error) {
      console.error('Error processing scheduled automations:', error);
    }
  }

  /**
   * Event Handlers
   */
  async handleTaskCreated(data) {
    await this.processRulesForEvent('task.created', data);
  }

  async handleTaskUpdated(data) {
    await this.processRulesForEvent('task.updated', data);
  }

  async handleTaskStatusChanged(data) {
    await this.processRulesForEvent('task.status_changed', data);
  }

  async handleTaskAssigned(data) {
    await this.processRulesForEvent('task.assigned', data);
  }

  async handleTaskCompleted(data) {
    await this.processRulesForEvent('task.completed', data);
  }

  async handleMemberAdded(data) {
    await this.processRulesForEvent('project.member_added', data);
  }

  async handleMemberRemoved(data) {
    await this.processRulesForEvent('project.member_removed', data);
  }

  async handleCommentCreated(data) {
    await this.processRulesForEvent('comment.created', data);
  }

  async handleCommentMentioned(data) {
    await this.processRulesForEvent('comment.mentioned', data);
  }

  async handleFileUploaded(data) {
    await this.processRulesForEvent('file.uploaded', data);
  }
}

// Export singleton instance
export default new AutomationEngine();
```

---

## 🔧 SUPPORTING COMPONENTS

### Templates Redux Slice

**File: `client/src/features/templates/templatesSlice.js`**

```javascript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

/**
 * Redux slice for template management
 */

// Async thunks
export const fetchTemplates = createAsyncThunk(
  'templates/fetchTemplates',
  async (params) => {
    const response = await api.get('/templates', { params });
    return response.data;
  }
);

export const createTemplate = createAsyncThunk(
  'templates/createTemplate',
  async (templateData) => {
    const response = await api.post('/templates', templateData);
    return response.data.template;
  }
);

export const applyTemplate = createAsyncThunk(
  'templates/applyTemplate',
  async ({ templateId, projectData }) => {
    const response = await api.post(
      `/templates/${templateId}/apply`,
      projectData
    );
    return response.data;
  }
);

export const rateTemplate = createAsyncThunk(
  'templates/rateTemplate',
  async ({ templateId, rating, comment }) => {
    const response = await api.post(`/templates/${templateId}/rate`, {
      rating,
      comment,
    });
    return { templateId, ...response.data };
  }
);

// Initial state
const initialState = {
  templates: [],
  currentTemplate: null,
  filters: {},
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
  },
};

// Slice
const templatesSlice = createSlice({
  name: 'templates',
  initialState,
  reducers: {
    setTemplateFilters: (state, action) => {
      state.filters = action.payload;
    },
    setCurrentTemplate: (state, action) => {
      state.currentTemplate = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch templates
      .addCase(fetchTemplates.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTemplates.fulfilled, (state, action) => {
        state.templates = action.payload.templates;
        state.pagination = action.payload.pagination;
        state.loading = false;
      })
      .addCase(fetchTemplates.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      // Create template
      .addCase(createTemplate.fulfilled, (state, action) => {
        state.templates.unshift(action.payload);
      })

      // Rate template
      .addCase(rateTemplate.fulfilled, (state, action) => {
        const template = state.templates.find(
          (t) => t._id === action.payload.templateId
        );
        if (template) {
          template.usage.averageRating = action.payload.averageRating;
        }
      });
  },
});

// Selectors
export const selectFilteredTemplates = (state) => {
  let templates = state.templates.templates;
  const filters = state.templates.filters;

  if (filters.category) {
    templates = templates.filter((t) => t.category === filters.category);
  }

  if (filters.type) {
    templates = templates.filter((t) => t.type === filters.type);
  }

  if (filters.minRating) {
    templates = templates.filter(
      (t) => t.usage.averageRating >= filters.minRating
    );
  }

  return templates;
};

export const { setTemplateFilters, setCurrentTemplate } =
  templatesSlice.actions;

export default templatesSlice.reducer;
```

---

## 📋 IMPLEMENTATION CHECKLIST

### Backend Tasks

- [ ] Create ProjectTemplate model
- [ ] Create AutomationRule model
- [ ] Implement template controller
- [ ] Build automation engine service
- [ ] Add template API routes
- [ ] Create automation API routes
- [ ] Set up scheduled job processing
- [ ] Implement template versioning

### Frontend Tasks

- [ ] Build TemplateGallery component
- [ ] Create AutomationBuilder interface
- [ ] Implement template preview modal
- [ ] Add template creation flow
- [ ] Build automation rule list
- [ ] Create trigger/condition/action selectors
- [ ] Add automation testing UI
- [ ] Implement template rating system

### Integration Tasks

- [ ] Connect automation engine to event system
- [ ] Set up template usage tracking
- [ ] Implement project creation from templates
- [ ] Add automation execution logging
- [ ] Create notification integration
- [ ] Set up webhook handling
- [ ] Add script sandboxing

### Testing Requirements

- [ ] Unit tests for automation engine
- [ ] Integration tests for template application
- [ ] E2E tests for template creation flow
- [ ] Performance tests for rule execution
- [ ] Security tests for script execution

---

## 🎯 SUCCESS METRICS

### Usage Metrics

- Template usage rate > 60% for new projects
- Average time saved per project > 2 hours
- Automation rule adoption > 40%
- Template rating participation > 30%

### Performance Targets

- Template application < 3 seconds
- Automation execution < 500ms
- Rule evaluation < 100ms
- Scheduled job processing < 1 minute lag

### Quality Metrics

- Template error rate < 1%
- Automation success rate > 95%
- User satisfaction score > 4.2/5
- Support ticket reduction > 25%

---

## 🚀 DEPLOYMENT CONSIDERATIONS

### Database Optimization

```javascript
// Indexes for performance
db.projecttemplates.createIndex({ category: 1, type: 1 });
db.projecttemplates.createIndex({ tags: 1 });
db.projecttemplates.createIndex({ 'usage.averageRating': -1 });
db.automationrules.createIndex({ project: 1, 'trigger.type': 1, enabled: 1 });
```

### Scaling Considerations

- Use job queue for automation processing
- Cache popular templates
- Implement rate limiting per project
- Consider separate automation workers

### Security Measures

- Sandbox script execution
- Validate webhook URLs
- Rate limit automation executions
- Audit automation actions
- Encrypt sensitive automation data

---

## End of Milestone 4

This completes the Project Templates & Automation milestone. The implementation provides powerful productivity tools that dramatically reduce project setup time and automate repetitive tasks, making project management more efficient and consistent.
