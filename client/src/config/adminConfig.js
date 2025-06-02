/**
 * Admin Panel Configuration
 *
 * Central configuration for admin features, routes, and feature flags.
 * Provides safe rollout controls for new admin functionality during the
 * Admin Tool Reorganization implementation phases.
 *
 * @module adminConfig
 */

/**
 * Feature flags for admin functionality rollout control
 *
 * These flags allow safe, gradual deployment of new admin features
 * during the reorganization phases. Set to false to disable features
 * that are under development or testing.
 */
export const ADMIN_FEATURES = {
  // Milestone 1 Features
  FLYOUT_NAVIGATION: true, // Professional admin flyout menu
  DASHBOARD_V2: true, // Enhanced admin dashboard
  COMING_SOON_PAGES: true, // Placeholder pages for future features

  // Milestone 2 Features (COMPLETE)
  ANALYTICS_DASHBOARD: true, // Advanced analytics (Milestone 2)
  USER_ACTIVITY_LOGS: true, // Real-time user tracking (Milestone 2)
  PUBLIC_SETTINGS: true, // Public content management (Milestone 2)

  // Milestone 3 Features (COMPLETE)
  SYSTEM_MONITORING: true, // Live system health (Milestone 3)

  // Milestone 4 Features (COMPLETE)
  BATCH_OPERATIONS: true, // Bulk user operations (Milestone 4)

  // Milestone 5 Features (COMPLETE)
  ROLE_MANAGEMENT: true, // Advanced role system (Milestone 5)

  // Milestone 6 Features (NOW ACTIVE)
  AUDIT_REPORTS: true, // Comprehensive reporting (Milestone 6)

  // Milestone 7+ Features (Future)
  ADVANCED_WORKFLOWS: false, // Workflow automation (Future)
};

/**
 * Admin navigation structure for the flyout menu
 *
 * Organizes admin tools into logical sections with proper hierarchy,
 * icons, and routing information. This structure drives both the
 * flyout menu rendering and route validation.
 */
export const ADMIN_NAVIGATION = {
  // Main dashboard entry point
  dashboard: {
    title: 'Dashboard',
    path: '/admin/dashboard',
    icon: 'Gauge',
    description: 'Admin overview and key metrics',
    available: ADMIN_FEATURES.DASHBOARD_V2,
  },

  // User Management Section
  userManagement: {
    title: 'User Management',
    section: true,
    items: {
      allUsers: {
        title: 'All Users',
        path: '/admin/users',
        icon: 'Users',
        description: 'Manage user accounts and permissions',
        available: true, // Existing functionality
      },
      batchOperations: {
        title: 'Batch Operations',
        path: '/admin/batch-operations',
        icon: 'Settings2',
        description: 'Bulk user operations and system maintenance',
        available: ADMIN_FEATURES.BATCH_OPERATIONS,
        comingSoon: !ADMIN_FEATURES.BATCH_OPERATIONS,
      },
      rolesPermissions: {
        title: 'Roles & Permissions',
        path: '/admin/roles',
        icon: 'Users2',
        description: 'Configure user roles and access controls',
        available: ADMIN_FEATURES.ROLE_MANAGEMENT,
        comingSoon: !ADMIN_FEATURES.ROLE_MANAGEMENT,
      },
    },
  },

  // Security & Monitoring Section
  securityMonitoring: {
    title: 'Security & Monitoring',
    section: true,
    items: {
      auditLogs: {
        title: 'Audit Logs',
        path: '/admin/audit-logs',
        icon: 'History',
        description: 'View system and user activity logs',
        available: true, // Existing functionality
      },
      reporting: {
        title: 'Reporting & Audit',
        path: '/admin/reporting',
        icon: 'FileText',
        description: 'Generate reports and audit trails',
        available: ADMIN_FEATURES.AUDIT_REPORTS,
        comingSoon: !ADMIN_FEATURES.AUDIT_REPORTS,
      },
      systemHealth: {
        title: 'System Health',
        path: '/admin/system-health',
        icon: 'Activity',
        description: 'Monitor server performance and health',
        available: ADMIN_FEATURES.SYSTEM_MONITORING,
        comingSoon: !ADMIN_FEATURES.SYSTEM_MONITORING,
      },
    },
  },

  // Content Management Section
  contentManagement: {
    title: 'Content Management',
    section: true,
    items: {
      guestAnalytics: {
        title: 'Guest Analytics',
        path: '/admin/analytics/guest',
        icon: 'BarChart2',
        description: 'Track guest user behavior and usage',
        available: true, // Existing functionality
      },
      analytics: {
        title: 'Analytics Dashboard',
        path: '/admin/analytics',
        icon: 'BarChart2',
        description: 'Comprehensive analytics and insights',
        available: ADMIN_FEATURES.ANALYTICS_DASHBOARD,
      },
      publicSettings: {
        title: 'Public Settings',
        path: '/admin/public-settings',
        icon: 'Globe',
        description: 'Configure public-facing features',
        available: ADMIN_FEATURES.PUBLIC_SETTINGS,
        comingSoon: !ADMIN_FEATURES.PUBLIC_SETTINGS,
      },
    },
  },

  // System Administration Section
  systemAdministration: {
    title: 'System Administration',
    section: true,
    items: {
      applicationSettings: {
        title: 'Application Settings',
        path: '/admin/settings',
        icon: 'Settings',
        description: 'Configure application-wide settings',
        available: true, // Existing functionality
      },
      maintenanceTools: {
        title: 'Maintenance Tools',
        path: '/admin/maintenance',
        icon: 'Settings2',
        description: 'Database cleanup and system maintenance',
        available: ADMIN_FEATURES.BATCH_OPERATIONS,
        comingSoon: !ADMIN_FEATURES.BATCH_OPERATIONS,
      },
    },
  },
};

/**
 * Get available admin navigation items
 *
 * Filters the navigation structure to only include items that are
 * currently available based on feature flags. This ensures the UI
 * only shows features that are ready for use.
 *
 * @returns {Object} Filtered navigation structure
 */
export const getAvailableAdminNavigation = () => {
  const available = {};

  Object.entries(ADMIN_NAVIGATION).forEach(([key, section]) => {
    if (section.section && section.items) {
      // Section with items
      const availableItems = {};
      Object.entries(section.items).forEach(([itemKey, item]) => {
        if (
          item.available ||
          (ADMIN_FEATURES.COMING_SOON_PAGES && item.comingSoon)
        ) {
          availableItems[itemKey] = item;
        }
      });

      if (Object.keys(availableItems).length > 0) {
        available[key] = {
          ...section,
          items: availableItems,
        };
      }
    } else if (section.available) {
      // Single item
      available[key] = section;
    }
  });

  return available;
};

/**
 * Check if admin flyout navigation should be enabled
 *
 * @returns {boolean} True if flyout navigation is available
 */
export const isAdminFlyoutEnabled = () => {
  return ADMIN_FEATURES.FLYOUT_NAVIGATION;
};

/**
 * Get admin route validation list
 *
 * Returns all valid admin routes for use in route protection
 * and navigation validation.
 *
 * @returns {string[]} Array of valid admin route paths
 */
export const getAdminRoutes = () => {
  const routes = [];

  Object.values(ADMIN_NAVIGATION).forEach((section) => {
    if (section.section && section.items) {
      Object.values(section.items).forEach((item) => {
        if (item.path && (item.available || item.comingSoon)) {
          routes.push(item.path);
        }
      });
    } else if (section.path && section.available) {
      routes.push(section.path);
    }
  });

  return routes;
};

/**
 * Default admin configuration export
 */
export default {
  ADMIN_FEATURES,
  ADMIN_NAVIGATION,
  getAvailableAdminNavigation,
  isAdminFlyoutEnabled,
  getAdminRoutes,
};
