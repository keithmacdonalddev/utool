// Define permission levels constants (optional but good practice)
const ACCESS_LEVELS = {
  FULL: 'full',         // Can perform all actions (CRUD) on all items
  CREATE_EDIT: 'create_edit', // Can create new items and edit/delete *any* item (like KB for Pro)
  OWN: 'own',           // Can perform all actions (CRUD) but only on items they created/own
  READ: 'read',         // Can only view items
  NONE: 'none',         // No access
};

// Define permissions based on roles using access level strings
const permissions = {
  Admin: {
    userManagement: ACCESS_LEVELS.FULL,
    blogPosts: ACCESS_LEVELS.FULL,
    knowledgeBase: ACCESS_LEVELS.FULL,
    projects: ACCESS_LEVELS.FULL,
    tasks: ACCESS_LEVELS.FULL,
    auditLogs: ACCESS_LEVELS.FULL,
  },
  'Pro User': {
    userManagement: ACCESS_LEVELS.NONE,
    blogPosts: ACCESS_LEVELS.OWN, // Requirement: Create/Edit Own -> Maps to 'own'
    knowledgeBase: ACCESS_LEVELS.CREATE_EDIT, // Requirement: Create/Edit -> Maps to 'create_edit' (can edit others' KB)
    projects: ACCESS_LEVELS.FULL, // Requirement: Full -> Maps to 'full'
    tasks: ACCESS_LEVELS.FULL, // Requirement: Full -> Maps to 'full'
  },
  'Regular User': {
    userManagement: ACCESS_LEVELS.NONE,
    blogPosts: ACCESS_LEVELS.READ, // Requirement: Read -> Maps to 'read'
    knowledgeBase: ACCESS_LEVELS.READ, // Requirement: Read -> Maps to 'read'
    projects: ACCESS_LEVELS.OWN, // Requirement: Own Projects -> Maps to 'own'
    tasks: ACCESS_LEVELS.OWN, // Requirement: Own Tasks -> Maps to 'own'
  },
};

// Feature flags might still be useful for globally enabling/disabling entire modules
const featureFlags = {
  knowledgeBase: true,
  blogPosts: true, // Assuming blog posts are a feature to be implemented
  projects: true,
  tasks: true,
  userManagement: true, // Keep this aligned with Admin having access
  auditLogs: true,
};


// Helper function (optional) to check if a user has *at least* a certain level of access
// This simplifies checks in the authorize middleware
const hasAccess = (userLevel, requiredLevel) => {
  if (!userLevel || userLevel === ACCESS_LEVELS.NONE) {
    return false;
  }
  if (userLevel === ACCESS_LEVELS.FULL) {
    return true; // Full access grants all levels
  }
  if (userLevel === ACCESS_LEVELS.CREATE_EDIT) {
    return requiredLevel === ACCESS_LEVELS.CREATE_EDIT || requiredLevel === ACCESS_LEVELS.OWN || requiredLevel === ACCESS_LEVELS.READ;
  }
  if (userLevel === ACCESS_LEVELS.OWN) {
    // 'own' implies ability to read own, create, update own, delete own.
    // It does NOT imply ability to read others' items unless requiredLevel is specifically 'read'.
    // This logic might need refinement in the middleware based on the specific action (read vs write).
    // For simplicity here, let's assume 'own' allows 'read' and 'own' actions.
     return requiredLevel === ACCESS_LEVELS.OWN || requiredLevel === ACCESS_LEVELS.READ;
  }
  if (userLevel === ACCESS_LEVELS.READ) {
    return requiredLevel === ACCESS_LEVELS.READ;
  }
  return false;
};


module.exports = { permissions, featureFlags, ACCESS_LEVELS, hasAccess };
