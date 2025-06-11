/**
 * Socket Configuration Management
 *
 * Centralizes all socket-related configuration with environment variable support
 * for easy management across development, staging, and production environments.
 */

/**
 * Parse environment variable as integer with fallback
 */
const parseIntEnv = (envVar, fallback) => {
  const value = process.env[envVar];
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
};

/**
 * Parse environment variable as boolean with fallback
 */
const parseBoolEnv = (envVar, fallback) => {
  const value = process.env[envVar];
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true';
};

/**
 * Parse environment variable as array with fallback
 */
const parseArrayEnv = (envVar, fallback, separator = ',') => {
  const value = process.env[envVar];
  if (!value) return fallback;
  return value
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);
};

/**
 * JWT and Authentication Configuration
 */
export const authConfig = {
  // JWT re-validation interval (default: 15 minutes)
  jwtRevalidationInterval: parseIntEnv(
    'JWT_REVALIDATION_INTERVAL_MS',
    15 * 60 * 1000
  ),

  // JWT token hash length for tracking (default: 16 characters)
  tokenHashLength: parseIntEnv('JWT_TOKEN_HASH_LENGTH', 16),

  // Connection timeout for authentication (default: 15 seconds)
  connectionTimeout: parseIntEnv('CONNECTION_TIMEOUT_MS', 15000),

  // Maximum authentication attempts per IP (default: 10)
  maxAuthAttemptsPerIP: parseIntEnv('MAX_AUTH_ATTEMPTS_PER_IP', 10),

  // Authentication rate limit window (default: 1 minute)
  authRateLimitWindow: parseIntEnv('AUTH_RATE_LIMIT_WINDOW_MS', 60 * 1000),
};

/**
 * Rate Limiting Configuration
 */
export const rateLimitConfig = {
  // Connection rate limiting
  connections: {
    max: parseIntEnv('RATE_LIMIT_CONNECTIONS_MAX', 10),
    window: parseIntEnv('RATE_LIMIT_CONNECTIONS_WINDOW_MS', 60 * 1000),
  },

  // Event-specific rate limits (per minute)
  events: {
    taskUpdate: {
      max: parseIntEnv('RATE_LIMIT_TASK_UPDATE_MAX', 30),
      window: parseIntEnv('RATE_LIMIT_TASK_UPDATE_WINDOW_MS', 60 * 1000),
    },
    commentAdd: {
      max: parseIntEnv('RATE_LIMIT_COMMENT_ADD_MAX', 20),
      window: parseIntEnv('RATE_LIMIT_COMMENT_ADD_WINDOW_MS', 60 * 1000),
    },
    commentTyping: {
      max: parseIntEnv('RATE_LIMIT_COMMENT_TYPING_MAX', 60),
      window: parseIntEnv('RATE_LIMIT_COMMENT_TYPING_WINDOW_MS', 60 * 1000),
    },
    fileUpload: {
      max: parseIntEnv('RATE_LIMIT_FILE_UPLOAD_MAX', 10),
      window: parseIntEnv('RATE_LIMIT_FILE_UPLOAD_WINDOW_MS', 60 * 1000),
    },
    presenceUpdate: {
      max: parseIntEnv('RATE_LIMIT_PRESENCE_UPDATE_MAX', 120),
      window: parseIntEnv('RATE_LIMIT_PRESENCE_UPDATE_WINDOW_MS', 60 * 1000),
    },
    default: {
      max: parseIntEnv('RATE_LIMIT_DEFAULT_MAX', 100),
      window: parseIntEnv('RATE_LIMIT_DEFAULT_WINDOW_MS', 60 * 1000),
    },
  },
};

/**
 * Broadcast Protection Configuration
 */
export const broadcastConfig = {
  // Storm protection threshold (events per minute)
  stormThreshold: parseIntEnv('BROADCAST_STORM_THRESHOLD', 1000),

  // Storm protection window (default: 1 minute)
  stormWindow: parseIntEnv('BROADCAST_STORM_WINDOW_MS', 60 * 1000),

  // Maximum recipients per broadcast (default: 500)
  maxRecipients: parseIntEnv('BROADCAST_MAX_RECIPIENTS', 500),

  // Broadcast queue size limit (default: 1000)
  queueSizeLimit: parseIntEnv('BROADCAST_QUEUE_SIZE_LIMIT', 1000),
};

/**
 * Input Validation Configuration
 */
export const validationConfig = {
  // String length limits
  maxStringLength: parseIntEnv('VALIDATION_MAX_STRING_LENGTH', 10000),
  maxArrayLength: parseIntEnv('VALIDATION_MAX_ARRAY_LENGTH', 1000),

  // Task-specific validation
  task: {
    maxTitleLength: parseIntEnv('VALIDATION_TASK_TITLE_MAX_LENGTH', 200),
    maxDescriptionLength: parseIntEnv(
      'VALIDATION_TASK_DESCRIPTION_MAX_LENGTH',
      5000
    ),
    allowedStatuses: parseArrayEnv('VALIDATION_TASK_ALLOWED_STATUSES', [
      'pending',
      'in-progress',
      'completed',
      'cancelled',
    ]),
    allowedPriorities: parseArrayEnv('VALIDATION_TASK_ALLOWED_PRIORITIES', [
      'low',
      'medium',
      'high',
      'critical',
    ]),
  },

  // Comment-specific validation
  comment: {
    maxContentLength: parseIntEnv(
      'VALIDATION_COMMENT_MAX_CONTENT_LENGTH',
      2000
    ),
    allowedTargetTypes: parseArrayEnv(
      'VALIDATION_COMMENT_ALLOWED_TARGET_TYPES',
      ['task', 'project', 'file']
    ),
    maxMentions: parseIntEnv('VALIDATION_COMMENT_MAX_MENTIONS', 10),
  },

  // File upload validation
  file: {
    maxFileNameLength: parseIntEnv('VALIDATION_FILE_MAX_NAME_LENGTH', 255),
    maxFileSize: parseIntEnv(
      'VALIDATION_FILE_MAX_SIZE_BYTES',
      50 * 1024 * 1024
    ), // 50MB
    allowedFileTypes: parseArrayEnv('VALIDATION_FILE_ALLOWED_TYPES', [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'text/markdown',
      'application/zip',
      'application/json',
    ]),
  },

  // Presence validation
  presence: {
    allowedStatuses: parseArrayEnv('VALIDATION_PRESENCE_ALLOWED_STATUSES', [
      'online',
      'away',
      'busy',
      'offline',
    ]),
    maxCurrentViewLength: parseIntEnv(
      'VALIDATION_PRESENCE_MAX_VIEW_LENGTH',
      100
    ),
  },
};

/**
 * Health Monitoring Configuration
 */
export const healthConfig = {
  // Health check interval (default: 30 seconds)
  checkInterval: parseIntEnv('HEALTH_CHECK_INTERVAL_MS', 30 * 1000),

  // Ping timeout (default: 5 seconds)
  pingTimeout: parseIntEnv('HEALTH_PING_TIMEOUT_MS', 5 * 1000),

  // Maximum failed health checks before marking connection unhealthy
  maxFailedChecks: parseIntEnv('HEALTH_MAX_FAILED_CHECKS', 3),

  // Health check retry interval for failed connections
  retryInterval: parseIntEnv('HEALTH_RETRY_INTERVAL_MS', 60 * 1000),
};

/**
 * Connection Management Configuration
 */
export const connectionConfig = {
  // Maximum reconnection attempts (default: 10)
  maxReconnectAttempts: parseIntEnv('CONNECTION_MAX_RECONNECT_ATTEMPTS', 10),

  // Initial reconnection delay (default: 1 second)
  initialReconnectDelay: parseIntEnv(
    'CONNECTION_INITIAL_RECONNECT_DELAY_MS',
    1000
  ),

  // Maximum reconnection delay (default: 30 seconds)
  maxReconnectDelay: parseIntEnv(
    'CONNECTION_MAX_RECONNECT_DELAY_MS',
    30 * 1000
  ),

  // Connection idle timeout (default: 5 minutes)
  idleTimeout: parseIntEnv('CONNECTION_IDLE_TIMEOUT_MS', 5 * 60 * 1000),

  // Maximum concurrent connections per user (default: 10)
  maxConnectionsPerUser: parseIntEnv('CONNECTION_MAX_PER_USER', 10),

  // Socket.IO specific configuration
  socketIO: {
    pingTimeout: parseIntEnv('SOCKETIO_PING_TIMEOUT_MS', 60 * 1000),
    pingInterval: parseIntEnv('SOCKETIO_PING_INTERVAL_MS', 25 * 1000),
    maxHttpBufferSize: parseIntEnv('SOCKETIO_MAX_HTTP_BUFFER_SIZE', 1e6), // 1MB
    transports: parseArrayEnv('SOCKETIO_TRANSPORTS', ['websocket', 'polling']),
    upgrade: parseBoolEnv('SOCKETIO_UPGRADE', true),
    rememberUpgrade: parseBoolEnv('SOCKETIO_REMEMBER_UPGRADE', true),
  },
};

/**
 * Logging and Monitoring Configuration
 */
export const loggingConfig = {
  // Log level (default: 'info' in production, 'debug' in development)
  level:
    process.env.SOCKET_LOG_LEVEL ||
    (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),

  // Enable detailed performance logging
  enablePerformanceLogging: parseBoolEnv(
    'SOCKET_ENABLE_PERFORMANCE_LOGGING',
    process.env.NODE_ENV !== 'production'
  ),

  // Enable audit logging for security events
  enableAuditLogging: parseBoolEnv('SOCKET_ENABLE_AUDIT_LOGGING', true),

  // Maximum log entry size (to prevent memory issues)
  maxLogEntrySize: parseIntEnv('SOCKET_MAX_LOG_ENTRY_SIZE', 10000),

  // Log retention settings
  maxLogEntries: parseIntEnv('SOCKET_MAX_LOG_ENTRIES', 10000),
  logRotationInterval: parseIntEnv(
    'SOCKET_LOG_ROTATION_INTERVAL_MS',
    24 * 60 * 60 * 1000
  ), // 24 hours
};

/**
 * Resource Management Configuration
 */
export const resourceConfig = {
  // Cleanup interval for expired resources (default: 5 minutes)
  cleanupInterval: parseIntEnv('RESOURCE_CLEANUP_INTERVAL_MS', 5 * 60 * 1000),

  // Maximum memory usage before triggering cleanup (in MB)
  maxMemoryUsageMB: parseIntEnv('RESOURCE_MAX_MEMORY_USAGE_MB', 512),

  // Maximum active connections before rejecting new ones
  maxActiveConnections: parseIntEnv('RESOURCE_MAX_ACTIVE_CONNECTIONS', 10000),

  // Room statistics cache TTL (default: 30 seconds)
  roomStatsCacheTTL: parseIntEnv('RESOURCE_ROOM_STATS_CACHE_TTL_MS', 30 * 1000),

  // Connection tracking cleanup threshold
  connectionTrackingCleanupThreshold: parseIntEnv(
    'RESOURCE_CONNECTION_TRACKING_CLEANUP_THRESHOLD',
    1000
  ),
};

/**
 * Development and Debugging Configuration
 */
export const debugConfig = {
  // Enable development mode features
  enableDevelopmentMode: parseBoolEnv(
    'SOCKET_ENABLE_DEVELOPMENT_MODE',
    process.env.NODE_ENV === 'development'
  ),

  // Enable detailed error stack traces
  enableDetailedErrors: parseBoolEnv(
    'SOCKET_ENABLE_DETAILED_ERRORS',
    process.env.NODE_ENV !== 'production'
  ),

  // Enable socket event tracing
  enableEventTracing: parseBoolEnv('SOCKET_ENABLE_EVENT_TRACING', false),

  // Simulate database errors for testing (development only)
  simulateDatabaseErrors:
    parseBoolEnv('SOCKET_SIMULATE_DB_ERRORS', false) &&
    process.env.NODE_ENV === 'development',

  // Database error simulation rate (0.0 to 1.0)
  databaseErrorRate: parseFloat(process.env.SOCKET_DB_ERROR_RATE || '0.02'),
};

/**
 * Security Configuration
 */
export const securityConfig = {
  // Enable CORS protection
  enableCORS: parseBoolEnv('SOCKET_ENABLE_CORS', true),

  // Allowed origins for CORS
  allowedOrigins: parseArrayEnv('SOCKET_ALLOWED_ORIGINS', [
    'http://localhost:3000',
    'http://localhost:3001',
  ]),

  // Enable rate limit bypass for admin users
  enableAdminRateLimitBypass: parseBoolEnv(
    'SOCKET_ENABLE_ADMIN_RATE_LIMIT_BYPASS',
    false
  ),

  // XSS protection patterns
  xssProtectionPatterns: parseArrayEnv('SOCKET_XSS_PROTECTION_PATTERNS', [
    '<script>',
    'javascript:',
    'data:text/html',
  ]),

  // IP whitelist for unrestricted access (comma-separated)
  ipWhitelist: parseArrayEnv('SOCKET_IP_WHITELIST', []),

  // Enable request signing for critical operations
  enableRequestSigning: parseBoolEnv('SOCKET_ENABLE_REQUEST_SIGNING', false),
};

/**
 * Performance Tuning Configuration
 */
export const performanceConfig = {
  // Database connection pool settings
  database: {
    maxConnections: parseIntEnv('DB_SOCKET_MAX_CONNECTIONS', 20),
    acquireTimeoutMs: parseIntEnv('DB_SOCKET_ACQUIRE_TIMEOUT_MS', 10000),
    idleTimeoutMs: parseIntEnv('DB_SOCKET_IDLE_TIMEOUT_MS', 30000),
  },

  // Caching configuration
  cache: {
    enableUserPermissionsCache: parseBoolEnv(
      'CACHE_ENABLE_USER_PERMISSIONS',
      true
    ),
    userPermissionsCacheTTL: parseIntEnv(
      'CACHE_USER_PERMISSIONS_TTL_MS',
      5 * 60 * 1000
    ), // 5 minutes
    enableProjectStatsCache: parseBoolEnv('CACHE_ENABLE_PROJECT_STATS', true),
    projectStatsCacheTTL: parseIntEnv('CACHE_PROJECT_STATS_TTL_MS', 30 * 1000), // 30 seconds
  },

  // Event processing optimization
  eventProcessing: {
    enableBatching: parseBoolEnv('EVENT_PROCESSING_ENABLE_BATCHING', true),
    batchSize: parseIntEnv('EVENT_PROCESSING_BATCH_SIZE', 100),
    batchTimeoutMs: parseIntEnv('EVENT_PROCESSING_BATCH_TIMEOUT_MS', 100),
  },
};

/**
 * Feature Flags Configuration
 */
export const featureFlags = {
  // Enable experimental features
  enableExperimentalFeatures: parseBoolEnv(
    'SOCKET_ENABLE_EXPERIMENTAL_FEATURES',
    false
  ),

  // Feature-specific flags
  enableAdvancedCollaboration: parseBoolEnv(
    'FEATURE_ENABLE_ADVANCED_COLLABORATION',
    true
  ),
  enableFileSharing: parseBoolEnv('FEATURE_ENABLE_FILE_SHARING', true),
  enableVoiceChat: parseBoolEnv('FEATURE_ENABLE_VOICE_CHAT', false),
  enableScreenSharing: parseBoolEnv('FEATURE_ENABLE_SCREEN_SHARING', false),
  enableCollaborativeEditing: parseBoolEnv(
    'FEATURE_ENABLE_COLLABORATIVE_EDITING',
    false
  ),

  // Analytics and telemetry
  enableTelemetry: parseBoolEnv(
    'FEATURE_ENABLE_TELEMETRY',
    process.env.NODE_ENV === 'production'
  ),
  enableUsageAnalytics: parseBoolEnv('FEATURE_ENABLE_USAGE_ANALYTICS', false),
};

/**
 * Environment-specific configuration aggregation
 */
export const getEnvironmentConfig = () => {
  const env = process.env.NODE_ENV || 'development';

  const baseConfig = {
    environment: env,
    authConfig,
    rateLimitConfig,
    broadcastConfig,
    validationConfig,
    healthConfig,
    connectionConfig,
    loggingConfig,
    resourceConfig,
    debugConfig,
    securityConfig,
    performanceConfig,
    featureFlags,
  };

  // Environment-specific overrides
  switch (env) {
    case 'production':
      return {
        ...baseConfig,
        loggingConfig: {
          ...baseConfig.loggingConfig,
          level: 'warn',
          enablePerformanceLogging: false,
        },
        debugConfig: {
          ...baseConfig.debugConfig,
          enableDevelopmentMode: false,
          enableDetailedErrors: false,
          simulateDatabaseErrors: false,
        },
        resourceConfig: {
          ...baseConfig.resourceConfig,
          maxMemoryUsageMB: 1024, // Increase for production
          maxActiveConnections: 50000,
        },
      };

    case 'staging':
      return {
        ...baseConfig,
        loggingConfig: {
          ...baseConfig.loggingConfig,
          level: 'info',
          enablePerformanceLogging: true,
        },
        debugConfig: {
          ...baseConfig.debugConfig,
          enableDetailedErrors: true,
          simulateDatabaseErrors: false,
        },
      };

    case 'development':
    default:
      return {
        ...baseConfig,
        loggingConfig: {
          ...baseConfig.loggingConfig,
          level: 'debug',
          enablePerformanceLogging: true,
        },
        debugConfig: {
          ...baseConfig.debugConfig,
          enableDevelopmentMode: true,
          enableDetailedErrors: true,
        },
      };
  }
};

/**
 * Configuration validation
 */
export const validateConfig = (config = getEnvironmentConfig()) => {
  const errors = [];

  // Validate critical configurations
  if (config.authConfig.jwtRevalidationInterval < 60000) {
    errors.push(
      'JWT revalidation interval should be at least 1 minute for security'
    );
  }

  if (config.rateLimitConfig.events.taskUpdate.max < 1) {
    errors.push('Task update rate limit must be at least 1');
  }

  if (config.broadcastConfig.stormThreshold < 100) {
    errors.push(
      'Broadcast storm threshold should be at least 100 to prevent false positives'
    );
  }

  if (config.connectionConfig.maxReconnectAttempts > 50) {
    errors.push(
      'Max reconnect attempts should not exceed 50 to prevent resource exhaustion'
    );
  }

  if (errors.length > 0) {
    console.error('Socket configuration validation errors:');
    errors.forEach((error) => console.error(`- ${error}`));
    throw new Error(
      `Socket configuration validation failed: ${errors.length} errors found`
    );
  }

  return true;
};

// Export the main configuration
export const socketConfig = getEnvironmentConfig();

// Validate configuration on module load
validateConfig(socketConfig);

// Development helper
if (process.env.NODE_ENV === 'development') {
  console.info('Socket Configuration Loaded:', {
    environment: socketConfig.environment,
    jwtRevalidationInterval: socketConfig.authConfig.jwtRevalidationInterval,
    rateLimitEnabled: Object.keys(socketConfig.rateLimitConfig.events).length,
    broadcastStormThreshold: socketConfig.broadcastConfig.stormThreshold,
    loggingLevel: socketConfig.loggingConfig.level,
    featuresEnabled: Object.entries(socketConfig.featureFlags)
      .filter(([_, enabled]) => enabled)
      .map(([feature, _]) => feature),
  });
}

export default socketConfig;
