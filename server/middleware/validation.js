const { body, param, query, validationResult } = require('express-validator');

/**
 * Admin API Validation Middleware
 *
 * This middleware provides comprehensive validation for admin endpoints
 * as part of Milestone 0 - Backend Dependencies & Validation.
 *
 * All admin endpoints use these validators to ensure:
 * - Data integrity and security
 * - Consistent error handling
 * - Protection against injection attacks
 * - Proper input sanitization
 */

/**
 * Central error handler for validation results
 * Extracts validation errors and formats them consistently
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((error) => ({
        field: error.path,
        message: error.msg,
        value: error.value,
      })),
    });
  }
  next();
};

// ═══════════════════════════════════════════════════════════════
// ADMIN DASHBOARD VALIDATION
// ═══════════════════════════════════════════════════════════════

/**
 * Validates admin dashboard data requests
 * Used by: Dashboard API endpoints, metrics queries
 */
const validateAdminDashboard = [
  query('timeRange')
    .optional()
    .isIn(['24h', '7d', '30d', '90d'])
    .withMessage('Time range must be one of: 24h, 7d, 30d, 90d'),

  query('includeDetails')
    .optional()
    .isBoolean()
    .withMessage('Include details must be a boolean value'),

  query('refreshCache')
    .optional()
    .isBoolean()
    .withMessage('Refresh cache must be a boolean value'),

  handleValidationErrors,
];

// ═══════════════════════════════════════════════════════════════
// USER MANAGEMENT VALIDATION
// ═══════════════════════════════════════════════════════════════

/**
 * Validates user query parameters for admin user management
 * Used by: User list endpoints, user search, filtering
 */
const validateUserQuery = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page must be between 1 and 1000'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('search')
    .optional()
    .isLength({ max: 100 })
    .trim()
    .escape()
    .withMessage('Search term must be less than 100 characters'),

  query('role')
    .optional()
    .isIn(['Admin', 'Pro User', 'Regular User', ''])
    .withMessage('Role must be Admin, Pro User, Regular User, or empty'),

  query('status')
    .optional()
    .isIn(['active', 'inactive', ''])
    .withMessage('Status must be active, inactive, or empty'),

  query('sortBy')
    .optional()
    .isIn(['name', 'email', 'role', 'createdAt', 'lastActive'])
    .withMessage(
      'Sort field must be name, email, role, createdAt, or lastActive'
    ),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),

  handleValidationErrors,
];

/**
 * Validates user update operations by admin
 * Used by: User edit endpoints, role changes, status updates
 */
const validateUserUpdate = [
  param('userId')
    .isMongoId()
    .withMessage('User ID must be a valid MongoDB ObjectId'),

  body('name')
    .optional()
    .isLength({ min: 1, max: 100 })
    .trim()
    .escape()
    .withMessage('Name must be between 1 and 100 characters'),

  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email must be a valid email address'),

  body('role')
    .optional()
    .isIn(['Admin', 'Pro User', 'Regular User'])
    .withMessage('Role must be Admin, Pro User, or Regular User'),

  body('isVerified')
    .optional()
    .isBoolean()
    .withMessage('Verification status must be a boolean'),

  body('bio')
    .optional()
    .isLength({ max: 500 })
    .trim()
    .escape()
    .withMessage('Bio cannot be longer than 500 characters'),

  body('country')
    .optional()
    .isLength({ max: 100 })
    .trim()
    .escape()
    .withMessage('Country cannot be longer than 100 characters'),

  body('city')
    .optional()
    .isLength({ max: 100 })
    .trim()
    .escape()
    .withMessage('City cannot be longer than 100 characters'),

  body('website')
    .optional()
    .isURL({ protocols: ['http', 'https'] })
    .withMessage('Website must be a valid HTTP or HTTPS URL'),

  body('jobTitle')
    .optional()
    .isLength({ max: 100 })
    .trim()
    .escape()
    .withMessage('Job title cannot be longer than 100 characters'),

  handleValidationErrors,
];

/**
 * Validates bulk user operations
 * Used by: Bulk user updates, bulk role changes, batch operations
 */
const validateBulkUserOperation = [
  body('userIds')
    .isArray({ min: 1, max: 100 })
    .withMessage('User IDs must be an array with 1-100 items'),

  body('userIds.*')
    .isMongoId()
    .withMessage('Each user ID must be a valid MongoDB ObjectId'),

  body('operation')
    .isIn(['updateRole', 'updateStatus', 'delete'])
    .withMessage('Operation must be updateRole, updateStatus, or delete'),

  body('updates')
    .optional()
    .isObject()
    .withMessage('Updates must be an object'),

  body('updates.role')
    .optional()
    .isIn(['Admin', 'Pro User', 'Regular User'])
    .withMessage('Role must be Admin, Pro User, or Regular User'),

  body('updates.isActive')
    .optional()
    .isBoolean()
    .withMessage('Active status must be a boolean'),

  handleValidationErrors,
];

// ═══════════════════════════════════════════════════════════════
// AUDIT LOG VALIDATION
// ═══════════════════════════════════════════════════════════════

/**
 * Validates audit log query parameters
 * Used by: Audit log endpoints, security monitoring, compliance reporting
 */
const validateAuditLogQuery = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page must be between 1 and 1000'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('search')
    .optional()
    .isLength({ max: 200 })
    .trim()
    .escape()
    .withMessage('Search term must be less than 200 characters'),

  query('severity')
    .optional()
    .isIn(['info', 'warning', 'critical', ''])
    .withMessage('Severity must be info, warning, critical, or empty'),

  query('action')
    .optional()
    .isLength({ max: 50 })
    .trim()
    .escape()
    .withMessage('Action must be less than 50 characters'),

  query('userId')
    .optional()
    .isMongoId()
    .withMessage('User ID must be a valid MongoDB ObjectId'),

  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),

  query('eventCategory')
    .optional()
    .isIn([
      'authentication',
      'data_access',
      'data_modification',
      'configuration',
      'permission',
      'security',
      'system',
      'user_management',
      '',
    ])
    .withMessage('Event category must be a valid category or empty'),

  query('status')
    .optional()
    .isIn(['success', 'failed', 'pending', ''])
    .withMessage('Status must be success, failed, pending, or empty'),

  handleValidationErrors,
];

/**
 * Validates audit log export parameters
 * Used by: Audit log export functionality, compliance reporting
 */
const validateAuditLogExport = [
  body('format')
    .isIn(['csv', 'json', 'pdf'])
    .withMessage('Export format must be csv, json, or pdf'),

  body('dateRange').isObject().withMessage('Date range must be an object'),

  body('dateRange.start')
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),

  body('dateRange.end')
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),

  body('filters')
    .optional()
    .isObject()
    .withMessage('Filters must be an object'),

  body('includePersonalData')
    .optional()
    .isBoolean()
    .withMessage('Include personal data must be a boolean'),

  handleValidationErrors,
];

// ═══════════════════════════════════════════════════════════════
// SYSTEM HEALTH VALIDATION
// ═══════════════════════════════════════════════════════════════

/**
 * Validates system health monitoring requests
 * Used by: System health endpoints, monitoring dashboards
 */
const validateSystemHealthQuery = [
  query('includeHistory')
    .optional()
    .isBoolean()
    .withMessage('Include history must be a boolean'),

  query('timeWindow')
    .optional()
    .isIn(['1h', '6h', '24h', '7d'])
    .withMessage('Time window must be 1h, 6h, 24h, or 7d'),

  query('components')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        const validComponents = [
          'database',
          'memory',
          'cpu',
          'network',
          'storage',
        ];
        const requestedComponents = value.split(',');
        return requestedComponents.every((comp) =>
          validComponents.includes(comp.trim())
        );
      }
      return true;
    })
    .withMessage(
      'Components must be a comma-separated list of: database, memory, cpu, network, storage'
    ),

  handleValidationErrors,
];

// ═══════════════════════════════════════════════════════════════
// ADMIN SETTINGS VALIDATION
// ═══════════════════════════════════════════════════════════════

/**
 * Validates admin configuration updates
 * Used by: Admin settings endpoints, configuration management
 */
const validateAdminSettings = [
  body('maintenanceMode')
    .optional()
    .isBoolean()
    .withMessage('Maintenance mode must be a boolean'),

  body('registrationEnabled')
    .optional()
    .isBoolean()
    .withMessage('Registration enabled must be a boolean'),

  body('maxUsersPerRole')
    .optional()
    .isObject()
    .withMessage('Max users per role must be an object'),

  body('maxUsersPerRole.Admin')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Max admin users must be between 1 and 100'),

  body('maxUsersPerRole.Pro User')
    .optional()
    .isInt({ min: 0, max: 10000 })
    .withMessage('Max pro users must be between 0 and 10000'),

  body('maxUsersPerRole.Regular User')
    .optional()
    .isInt({ min: 0, max: 100000 })
    .withMessage('Max regular users must be between 0 and 100000'),

  body('securitySettings')
    .optional()
    .isObject()
    .withMessage('Security settings must be an object'),

  body('securitySettings.sessionTimeout')
    .optional()
    .isInt({ min: 300, max: 86400 }) // 5 minutes to 24 hours
    .withMessage('Session timeout must be between 300 and 86400 seconds'),

  body('securitySettings.maxLoginAttempts')
    .optional()
    .isInt({ min: 3, max: 10 })
    .withMessage('Max login attempts must be between 3 and 10'),

  body('securitySettings.lockoutDuration')
    .optional()
    .isInt({ min: 300, max: 3600 }) // 5 minutes to 1 hour
    .withMessage('Lockout duration must be between 300 and 3600 seconds'),

  handleValidationErrors,
];

// ═══════════════════════════════════════════════════════════════
// CUSTOM VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Custom validator for date ranges
 * Ensures start date is before end date
 */
const validateDateRange = (req, res, next) => {
  const { startDate, endDate } = req.query;

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be before end date',
      });
    }

    // Check if date range is not too large (max 1 year)
    const maxRange = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
    if (end - start > maxRange) {
      return res.status(400).json({
        success: false,
        message: 'Date range cannot exceed 1 year',
      });
    }
  }

  next();
};

/**
 * Validation for admin-only operations
 * Additional security layer for sensitive operations
 */
const validateAdminOperation = [
  body('confirmAction')
    .equals('CONFIRM')
    .withMessage('Admin operations require confirmation with CONFIRM value'),

  body('reason')
    .optional()
    .isLength({ min: 10, max: 500 })
    .trim()
    .escape()
    .withMessage('Reason must be between 10 and 500 characters if provided'),

  handleValidationErrors,
];

module.exports = {
  // Core validation
  handleValidationErrors,

  // Dashboard validation
  validateAdminDashboard,

  // User management validation
  validateUserQuery,
  validateUserUpdate,
  validateBulkUserOperation,

  // Audit log validation
  validateAuditLogQuery,
  validateAuditLogExport,

  // System health validation
  validateSystemHealthQuery,

  // Admin settings validation
  validateAdminSettings,

  // Custom validators
  validateDateRange,
  validateAdminOperation,
};
