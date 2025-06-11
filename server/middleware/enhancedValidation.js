/**
 * @fileoverview Enhanced validation middleware for comprehensive input validation,
 * data sanitization, and business rule enforcement.
 */

const Joi = require('joi');
const xss = require('xss');
const validator = require('validator');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

/**
 * XSS Protection Configuration
 */
const xssOptions = {
  whiteList: {
    // Allow basic formatting in content fields
    b: [],
    i: [],
    u: [],
    strong: [],
    em: [],
    br: [],
    p: [],
  },
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script'],
};

/**
 * Common validation schemas using Joi
 */
const commonSchemas = {
  // MongoDB ObjectId validation
  objectId: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .message('Invalid ObjectId format'),

  // Email validation
  email: Joi.string().email().lowercase().trim().max(254),

  // Password validation (strong password requirements)
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .message(
      'Password must contain at least 8 characters, including uppercase, lowercase, number, and special character'
    ),

  // Username validation
  username: Joi.string().alphanum().min(3).max(30).trim(),

  // URL validation
  url: Joi.string().uri().max(2000),

  // Phone number validation
  phone: Joi.string()
    .pattern(/^\+?[\d\s\-\(\)]+$/)
    .min(10)
    .max(20),

  // Date validation
  date: Joi.date().iso(),

  // Pagination
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),

  // Sort validation
  sort: Joi.string()
    .valid('asc', 'desc', 'ascending', 'descending')
    .default('desc'),

  // Generic text fields
  shortText: Joi.string().trim().max(255),
  mediumText: Joi.string().trim().max(1000),
  longText: Joi.string().trim().max(10000),

  // File validation
  filename: Joi.string()
    .pattern(/^[a-zA-Z0-9._-]+$/)
    .max(255),
  fileSize: Joi.number()
    .integer()
    .min(1)
    .max(50 * 1024 * 1024), // 50MB max

  // Project-specific validations
  priority: Joi.string()
    .valid('low', 'medium', 'high', 'critical')
    .default('medium'),
  status: Joi.string()
    .valid('todo', 'in-progress', 'review', 'done', 'blocked')
    .default('todo'),

  // Array validations
  tags: Joi.array().items(Joi.string().trim().max(50)).max(20).unique(),

  // Boolean with string conversion
  booleanString: Joi.alternatives().try(
    Joi.boolean(),
    Joi.string()
      .valid('true', 'false')
      .custom((value) => value === 'true')
  ),
};

/**
 * Project-specific validation schemas
 */
const projectSchemas = {
  createProject: Joi.object({
    name: commonSchemas.shortText.required(),
    description: commonSchemas.mediumText.optional(),
    visibility: Joi.string()
      .valid('private', 'public', 'team')
      .default('private'),
    tags: commonSchemas.tags.optional(),
    dueDate: commonSchemas.date.optional(),
    priority: commonSchemas.priority.optional(),
    teamMembers: Joi.array().items(commonSchemas.objectId).max(50).optional(),
  }),

  updateProject: Joi.object({
    name: commonSchemas.shortText.optional(),
    description: commonSchemas.mediumText.optional(),
    visibility: Joi.string().valid('private', 'public', 'team').optional(),
    tags: commonSchemas.tags.optional(),
    dueDate: commonSchemas.date.optional(),
    priority: commonSchemas.priority.optional(),
    status: Joi.string().valid('active', 'archived', 'completed').optional(),
    teamMembers: Joi.array().items(commonSchemas.objectId).max(50).optional(),
  }).min(1),

  createTask: Joi.object({
    title: commonSchemas.shortText.required(),
    description: commonSchemas.longText.optional(),
    priority: commonSchemas.priority.optional(),
    status: commonSchemas.status.optional(),
    dueDate: commonSchemas.date.optional(),
    estimatedHours: Joi.number().min(0.1).max(1000).optional(),
    assignee: commonSchemas.objectId.optional(),
    tags: commonSchemas.tags.optional(),
    dependencies: Joi.array().items(commonSchemas.objectId).max(20).optional(),
    parentTask: commonSchemas.objectId.optional(),
  }),

  updateTask: Joi.object({
    title: commonSchemas.shortText.optional(),
    description: commonSchemas.longText.optional(),
    priority: commonSchemas.priority.optional(),
    status: commonSchemas.status.optional(),
    dueDate: commonSchemas.date.optional(),
    estimatedHours: Joi.number().min(0.1).max(1000).optional(),
    assignee: commonSchemas.objectId.optional(),
    tags: commonSchemas.tags.optional(),
    dependencies: Joi.array().items(commonSchemas.objectId).max(20).optional(),
    progress: Joi.object({
      percentage: Joi.number().min(0).max(100),
      notes: commonSchemas.mediumText.optional(),
    }).optional(),
  }).min(1),

  createComment: Joi.object({
    content: commonSchemas.mediumText.required(),
    parentComment: commonSchemas.objectId.optional(),
    mentions: Joi.array().items(commonSchemas.objectId).max(10).optional(),
  }),

  bulkTaskUpdate: Joi.object({
    taskIds: Joi.array()
      .items(commonSchemas.objectId)
      .min(1)
      .max(100)
      .required(),
    updates: Joi.object({
      status: commonSchemas.status.optional(),
      priority: commonSchemas.priority.optional(),
      assignee: commonSchemas.objectId.optional(),
      tags: commonSchemas.tags.optional(),
      dueDate: commonSchemas.date.optional(),
    })
      .min(1)
      .required(),
  }),

  timeEntry: Joi.object({
    startTime: commonSchemas.date.required(),
    endTime: commonSchemas.date.optional(),
    duration: Joi.number()
      .min(1)
      .max(24 * 60 * 60)
      .optional(), // Max 24 hours in seconds
    description: commonSchemas.mediumText.optional(),
    taskId: commonSchemas.objectId.required(),
  }),
};

/**
 * Query parameter validation schemas
 */
const querySchemas = {
  pagination: Joi.object({
    page: commonSchemas.page,
    limit: commonSchemas.limit,
    sort: commonSchemas.sort,
    sortBy: Joi.string()
      .valid(
        'createdAt',
        'updatedAt',
        'name',
        'title',
        'priority',
        'dueDate',
        'status'
      )
      .default('updatedAt'),
  }),

  projectFilters: Joi.object({
    status: Joi.string().valid('active', 'archived', 'completed').optional(),
    priority: commonSchemas.priority.optional(),
    visibility: Joi.string().valid('private', 'public', 'team').optional(),
    tags: Joi.string().optional(), // Comma-separated tags
    search: commonSchemas.shortText.optional(),
    assignee: commonSchemas.objectId.optional(),
    dateFrom: commonSchemas.date.optional(),
    dateTo: commonSchemas.date.optional(),
  }),

  taskFilters: Joi.object({
    status: commonSchemas.status.optional(),
    priority: commonSchemas.priority.optional(),
    assignee: commonSchemas.objectId.optional(),
    tags: Joi.string().optional(), // Comma-separated tags
    search: commonSchemas.shortText.optional(),
    isOverdue: commonSchemas.booleanString.optional(),
    hasAttachments: commonSchemas.booleanString.optional(),
    dueDateFrom: commonSchemas.date.optional(),
    dueDateTo: commonSchemas.date.optional(),
  }),
};

/**
 * Sanitize input data to prevent XSS and injection attacks
 */
const sanitizeInput = (data) => {
  if (typeof data === 'string') {
    // Remove dangerous characters and sanitize HTML
    let sanitized = xss(data, xssOptions);
    sanitized = validator.escape(sanitized); // Additional HTML entity encoding
    return sanitized.trim();
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeInput(item));
  }

  if (data && typeof data === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      // Sanitize keys to prevent prototype pollution
      const sanitizedKey = validator.escape(key).replace(/[^a-zA-Z0-9_-]/g, '');
      if (sanitizedKey) {
        sanitized[sanitizedKey] = sanitizeInput(value);
      }
    }
    return sanitized;
  }

  return data;
};

/**
 * Business rule validation
 */
const businessRules = {
  /**
   * Validate task dependencies don't create cycles
   */
  validateTaskDependencies: async (taskId, dependencies, Task) => {
    if (!dependencies || dependencies.length === 0) return true;

    const checkCycles = async (currentId, visited = new Set()) => {
      if (visited.has(currentId)) {
        throw new Error('Circular dependency detected in task dependencies');
      }

      visited.add(currentId);

      const task = await Task.findById(currentId).select('dependencies');
      if (task && task.dependencies) {
        for (const depId of task.dependencies) {
          await checkCycles(depId.toString(), new Set(visited));
        }
      }
    };

    // Check each dependency for cycles
    for (const depId of dependencies) {
      if (depId === taskId) {
        throw new Error('Task cannot depend on itself');
      }
      await checkCycles(depId.toString());
    }

    return true;
  },

  /**
   * Validate project permissions
   */
  validateProjectAccess: async (userId, projectId, requiredRole = 'member') => {
    // Implementation would check user's role in the project
    // This is a placeholder for the actual permission logic
    return true;
  },

  /**
   * Validate file upload constraints
   */
  validateFileUpload: (file) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/json',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error('File type not allowed');
    }

    if (file.size > 50 * 1024 * 1024) {
      // 50MB
      throw new Error('File size exceeds maximum limit');
    }

    return true;
  },

  /**
   * Validate time entry constraints
   */
  validateTimeEntry: (timeEntry) => {
    const { startTime, endTime, duration } = timeEntry;

    if (endTime && startTime >= endTime) {
      throw new Error('End time must be after start time');
    }

    if (duration && duration > 24 * 60 * 60) {
      // 24 hours in seconds
      throw new Error('Duration cannot exceed 24 hours');
    }

    if (startTime > new Date()) {
      throw new Error('Start time cannot be in the future');
    }

    return true;
  },
};

/**
 * Create validation middleware
 */
const validateSchema = (schema, source = 'body') => {
  return async (req, res, next) => {
    try {
      let data = req[source];

      // Apply MongoDB sanitization
      data = mongoSanitize.sanitize(data);

      // Apply XSS sanitization
      data = sanitizeInput(data);

      // Validate with Joi
      const { error, value } = schema.validate(data, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });

      if (error) {
        const errorMessages = error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
        }));

        return res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid input data',
          details: errorMessages,
        });
      }

      // Replace original data with validated and sanitized data
      req[source] = value;
      next();
    } catch (err) {
      console.error('Validation middleware error:', err);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Validation processing failed',
      });
    }
  };
};

/**
 * Create business rule validation middleware
 */
const validateBusinessRules = (rules) => {
  return async (req, res, next) => {
    try {
      for (const rule of rules) {
        await rule(req, res);
      }
      next();
    } catch (error) {
      res.status(400).json({
        error: 'Business Rule Violation',
        message: error.message,
      });
    }
  };
};

/**
 * Rate limiting for validation-heavy endpoints
 */
const validationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    error: 'Rate Limit Exceeded',
    message: 'Too many validation requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Comprehensive input validation middleware
 */
const comprehensiveValidation = (options = {}) => {
  const {
    bodySchema,
    querySchema,
    paramsSchema,
    businessRules: rules = [],
    skipSanitization = false,
  } = options;

  return [
    validationRateLimit,
    ...(bodySchema ? [validateSchema(bodySchema, 'body')] : []),
    ...(querySchema ? [validateSchema(querySchema, 'query')] : []),
    ...(paramsSchema ? [validateSchema(paramsSchema, 'params')] : []),
    ...(rules.length > 0 ? [validateBusinessRules(rules)] : []),
  ];
};

/**
 * Export validation middleware and schemas
 */
module.exports = {
  // Schemas
  commonSchemas,
  projectSchemas,
  querySchemas,

  // Middleware functions
  validateSchema,
  validateBusinessRules,
  comprehensiveValidation,

  // Utility functions
  sanitizeInput,
  businessRules,

  // Rate limiting
  validationRateLimit,

  // Pre-configured middleware for common use cases
  middleware: {
    // Project endpoints
    createProject: comprehensiveValidation({
      bodySchema: projectSchemas.createProject,
      querySchema: querySchemas.pagination,
    }),

    updateProject: comprehensiveValidation({
      bodySchema: projectSchemas.updateProject,
      paramsSchema: Joi.object({ id: commonSchemas.objectId.required() }),
    }),

    getProjects: comprehensiveValidation({
      querySchema: querySchemas.pagination.concat(querySchemas.projectFilters),
    }),

    // Task endpoints
    createTask: comprehensiveValidation({
      bodySchema: projectSchemas.createTask,
      paramsSchema: Joi.object({
        projectId: commonSchemas.objectId.required(),
      }),
      businessRules: [
        async (req) => {
          if (req.body.dependencies) {
            await businessRules.validateTaskDependencies(
              null, // New task, no ID yet
              req.body.dependencies,
              req.app.get('models').Task
            );
          }
        },
      ],
    }),

    updateTask: comprehensiveValidation({
      bodySchema: projectSchemas.updateTask,
      paramsSchema: Joi.object({
        projectId: commonSchemas.objectId.required(),
        taskId: commonSchemas.objectId.required(),
      }),
      businessRules: [
        async (req) => {
          if (req.body.dependencies) {
            await businessRules.validateTaskDependencies(
              req.params.taskId,
              req.body.dependencies,
              req.app.get('models').Task
            );
          }
        },
      ],
    }),

    getTasks: comprehensiveValidation({
      querySchema: querySchemas.pagination.concat(querySchemas.taskFilters),
      paramsSchema: Joi.object({
        projectId: commonSchemas.objectId.required(),
      }),
    }),

    bulkUpdateTasks: comprehensiveValidation({
      bodySchema: projectSchemas.bulkTaskUpdate,
      paramsSchema: Joi.object({
        projectId: commonSchemas.objectId.required(),
      }),
    }),

    // Comment endpoints
    createComment: comprehensiveValidation({
      bodySchema: projectSchemas.createComment,
    }),

    // Time tracking endpoints
    createTimeEntry: comprehensiveValidation({
      bodySchema: projectSchemas.timeEntry,
      businessRules: [
        async (req) => {
          businessRules.validateTimeEntry(req.body);
        },
      ],
    }),
  },
};

// Error handling for unhandled validation errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection in validation middleware:', reason);
});
