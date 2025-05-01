/**
 * Event Description Formatter Utility
 *
 * This utility transforms technical event codes and audit log entries into natural language
 * descriptions that are easier for non-technical users to understand. It uses a combination
 * of templates and context-aware formatting to generate human-readable descriptions.
 *
 * Features:
 * - Maps technical event codes to natural language templates
 * - Dynamically populates templates with event metadata
 * - Provides different verbosity levels (brief, standard, detailed)
 * - Supports context-awareness based on user roles and permissions
 */

import { createLogger } from './clientLogger';

// Create a namespaced logger for event description formatting
const logger = createLogger('EVENT-FORMATTER');

/**
 * Maps action types to natural language templates
 * Each template can use placeholders like {user}, {target}, etc. that will be
 * filled with actual values from the event data
 */
const EVENT_TEMPLATES = {
  // Authentication events
  login: {
    brief: 'Logged in',
    standard: '{user} logged in',
    detailed: '{user} logged in to the system from {ipAddress}',
  },
  logout: {
    brief: 'Logged out',
    standard: '{user} logged out',
    detailed: '{user} logged out of the system',
  },
  password_change: {
    brief: 'Changed password',
    standard: '{user} changed their password',
    detailed: '{user} successfully changed their account password',
  },
  email_verification: {
    brief: 'Verified email',
    standard: '{user} verified their email',
    detailed: '{user} completed email verification process',
  },
  account_lock: {
    brief: 'Account locked',
    standard: 'Account was locked',
    detailed:
      "{user}'s account was locked after multiple failed login attempts",
  },

  // User profile events
  profile_update: {
    brief: 'Updated profile',
    standard: '{user} updated profile',
    detailed: '{user} updated their profile information',
  },
  role_change: {
    brief: 'Role changed',
    standard: "{user}'s role was changed",
    detailed: "{user}'s role was changed from {oldRole} to {newRole}",
  },
  permission_change: {
    brief: 'Permissions changed',
    standard: "{user}'s permissions were modified",
    detailed: "{user}'s permissions were updated by an administrator",
  },

  // Content events
  content_create: {
    brief: 'Created content',
    standard: '{user} created new content',
    detailed: '{user} created new {contentType}: {contentName}',
  },
  content_update: {
    brief: 'Updated content',
    standard: '{user} updated content',
    detailed: '{user} updated {contentType}: {contentName}',
  },
  content_delete: {
    brief: 'Deleted content',
    standard: '{user} deleted content',
    detailed: '{user} deleted {contentType}: {contentName}',
  },

  // Project events
  project_create: {
    brief: 'Created project',
    standard: '{user} created a new project',
    detailed: '{user} created a new project: {projectName}',
  },
  project_update: {
    brief: 'Updated project',
    standard: '{user} updated project details',
    detailed: '{user} updated project: {projectName}',
  },
  project_delete: {
    brief: 'Deleted project',
    standard: '{user} deleted a project',
    detailed: '{user} deleted project: {projectName}',
  },

  // Task events
  task_create: {
    brief: 'Created task',
    standard: '{user} created a new task',
    detailed: '{user} created a new task: {taskName} in project {projectName}',
  },
  task_update: {
    brief: 'Updated task',
    standard: '{user} updated a task',
    detailed: '{user} updated task: {taskName}',
  },
  task_delete: {
    brief: 'Deleted task',
    standard: '{user} deleted a task',
    detailed: '{user} deleted task: {taskName} from project {projectName}',
  },
  task_status_change: {
    brief: 'Updated task status',
    standard: '{user} changed task status',
    detailed:
      '{user} changed status of task: {taskName} from {oldStatus} to {newStatus}',
  },

  // Knowledge base events
  kb_create: {
    brief: 'Created KB article',
    standard: '{user} created a new knowledge base article',
    detailed: '{user} created a new knowledge base article: {articleTitle}',
  },
  kb_update: {
    brief: 'Updated KB article',
    standard: '{user} updated a knowledge base article',
    detailed: '{user} updated knowledge base article: {articleTitle}',
  },
  kb_delete: {
    brief: 'Deleted KB article',
    standard: '{user} deleted a knowledge base article',
    detailed: '{user} deleted knowledge base article: {articleTitle}',
  },

  // Note events
  note_create: {
    brief: 'Created note',
    standard: '{user} created a new note',
    detailed: '{user} created a new note: {noteTitle}',
  },
  note_update: {
    brief: 'Updated note',
    standard: '{user} updated a note',
    detailed: '{user} updated note: {noteTitle}',
  },
  note_delete: {
    brief: 'Deleted note',
    standard: '{user} deleted a note',
    detailed: '{user} deleted note: {noteTitle}',
  },

  // Admin actions
  admin_action: {
    brief: 'Admin action',
    standard: 'Admin performed system action',
    detailed: 'Administrator {user} performed action: {actionDetails}',
  },
};

/**
 * Maps event categories to descriptive text
 */
const CATEGORY_DESCRIPTIONS = {
  authentication: 'User authentication activity',
  data_access: 'Data access and retrieval',
  data_modification: 'Data creation, update, or deletion',
  permission: 'Permission and access control changes',
  security: 'Security-related events',
  system: 'System operations and maintenance',
  user_management: 'User account management',
};

/**
 * Maps severity levels to user-friendly descriptions
 */
const SEVERITY_DESCRIPTIONS = {
  info: 'Informational: Normal system operation',
  warning: 'Warning: Potential issue that may require attention',
  critical: 'Critical: Urgent issue requiring immediate attention',
};

/**
 * Formats event metadata into a natural language description
 *
 * @param {Object} event - The audit log event object
 * @param {string} verbosity - The level of detail ('brief', 'standard', 'detailed')
 * @returns {string} A human-readable description of the event
 */
export const formatEventDescription = (event, verbosity = 'standard') => {
  try {
    // If no event or action, return default message
    if (!event || !event.action) {
      return 'Unknown system event';
    }

    // Get the template for this action
    const templates = EVENT_TEMPLATES[event.action];
    if (!templates) {
      // If we don't have a specific template, create a generalized description
      return `${event.action.replace(/_/g, ' ')}`;
    }

    // Get the template based on verbosity level
    let template = templates[verbosity] || templates.standard;

    // Create a context object with replaceable values
    const context = {
      user: getUserDisplay(event),
      ipAddress: event.ipAddress || 'unknown location',
      status: event.status || 'unknown status',
      contentType: getContentTypeFromMetadata(event),
      contentName: getContentNameFromMetadata(event),
      ...extractContextFromMetadata(event),
    };

    // Replace placeholders in the template
    let description = template;
    for (const [key, value] of Object.entries(context)) {
      description = description.replace(new RegExp(`{${key}}`, 'g'), value);
    }

    return description;
  } catch (error) {
    logger(`Error formatting event description: ${error.message}`);
    return event.action.replace(/_/g, ' ');
  }
};

/**
 * Get a display-friendly user string from the event
 *
 * @param {Object} event - The audit log event
 * @returns {string} A user-friendly display string
 */
const getUserDisplay = (event) => {
  if (!event.userId) {
    return 'Anonymous user';
  }

  if (typeof event.userId === 'object') {
    return event.userId.name || 'Unknown user';
  }

  return 'A user';
};

/**
 * Extract content type information from event metadata
 *
 * @param {Object} event - The audit log event
 * @returns {string} The content type
 */
const getContentTypeFromMetadata = (event) => {
  if (!event.metadata) return 'content';

  // Try to determine content type from the action or metadata
  if (event.action.includes('project')) return 'project';
  if (event.action.includes('task')) return 'task';
  if (event.action.includes('note')) return 'note';
  if (event.action.includes('kb')) return 'knowledge base article';

  // Check metadata for content type
  if (event.metadata.contentType) return event.metadata.contentType;
  if (event.metadata.type) return event.metadata.type;

  // Default fallback
  return 'content';
};

/**
 * Extract content name information from event metadata
 *
 * @param {Object} event - The audit log event
 * @returns {string} The content name
 */
const getContentNameFromMetadata = (event) => {
  if (!event.metadata) return '';

  // Try to find a name in the metadata
  if (event.metadata.title) return event.metadata.title;
  if (event.metadata.name) return event.metadata.name;
  if (event.metadata.projectName) return event.metadata.projectName;
  if (event.metadata.taskName) return event.metadata.taskName;
  if (event.metadata.noteName) return event.metadata.noteName;

  // Default fallback
  return 'item';
};

/**
 * Extract additional context information from event metadata
 * This extracts key information like project names, task statuses, etc.
 *
 * @param {Object} event - The audit log event
 * @returns {Object} Additional context parameters
 */
const extractContextFromMetadata = (event) => {
  if (!event.metadata) return {};

  const context = {};

  // Extract commonly used fields
  if (event.metadata.projectName)
    context.projectName = event.metadata.projectName;
  if (event.metadata.taskName) context.taskName = event.metadata.taskName;
  if (event.metadata.articleTitle)
    context.articleTitle = event.metadata.articleTitle;
  if (event.metadata.noteTitle) context.noteTitle = event.metadata.noteTitle;

  // Extract status change information
  if (event.metadata.oldStatus && event.metadata.newStatus) {
    context.oldStatus = event.metadata.oldStatus;
    context.newStatus = event.metadata.newStatus;
  }

  // Extract role change information
  if (event.metadata.oldRole && event.metadata.newRole) {
    context.oldRole = event.metadata.oldRole;
    context.newRole = event.metadata.newRole;
  }

  // Details for admin actions
  if (event.metadata.actionDetails) {
    context.actionDetails = event.metadata.actionDetails;
  }

  return context;
};

/**
 * Gets a user-friendly description of an event category
 *
 * @param {string} category - The technical category name
 * @returns {string} A human-readable category description
 */
export const getCategoryDescription = (category) => {
  if (!category) return 'Uncategorized event';
  return CATEGORY_DESCRIPTIONS[category] || category.replace(/_/g, ' ');
};

/**
 * Gets a user-friendly description of a severity level
 *
 * @param {string} severity - The technical severity level
 * @returns {string} A human-readable severity description
 */
export const getSeverityDescription = (severity) => {
  if (!severity) return 'Unknown severity';
  return SEVERITY_DESCRIPTIONS[severity] || severity;
};

/**
 * Gets a context-aware description for an event based on user role
 *
 * @param {Object} event - The audit log event
 * @param {string} userRole - The current user's role (admin, user, etc.)
 * @returns {string} A role-appropriate description
 */
export const getContextAwareDescription = (event, userRole = 'user') => {
  // Adjust verbosity based on user role
  const verbosity = userRole === 'admin' ? 'detailed' : 'standard';
  return formatEventDescription(event, verbosity);
};

/**
 * Creates a summary of multiple related events
 *
 * @param {Array} events - Array of related audit log events
 * @returns {string} A summary description of the event sequence
 */
export const createEventsSummary = (events) => {
  if (!events || !events.length) return 'No events to summarize';

  // Get the predominant action type
  const actionCounts = events.reduce((counts, event) => {
    counts[event.action] = (counts[event.action] || 0) + 1;
    return counts;
  }, {});

  const mainAction = Object.keys(actionCounts).reduce((a, b) =>
    actionCounts[a] > actionCounts[b] ? a : b
  );

  // Get the main user if consistent
  const users = new Set(
    events.map((e) =>
      e.userId && typeof e.userId === 'object' ? e.userId.name : 'Anonymous'
    )
  );
  const userStr =
    users.size === 1 ? users.values().next().value : 'Multiple users';

  // Create a summary based on action type
  if (mainAction.includes('login') || mainAction.includes('logout')) {
    return `${userStr} session activity (${events.length} events)`;
  }

  if (mainAction.includes('project')) {
    return `${userStr} project management activity (${events.length} events)`;
  }

  if (mainAction.includes('task')) {
    return `${userStr} task management activity (${events.length} events)`;
  }

  // Generic fallback
  return `${userStr} performed ${
    events.length
  } activities related to ${mainAction.replace(/_/g, ' ')}`;
};

// Default export for convenience
export default {
  formatEventDescription,
  getCategoryDescription,
  getSeverityDescription,
  getContextAwareDescription,
  createEventsSummary,
};
