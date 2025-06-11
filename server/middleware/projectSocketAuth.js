/**
 * Project-Specific WebSocket Authentication Middleware
 *
 * Builds upon the existing socketManager.js JWT authentication to add
 * project-specific permissions and collaboration features.
 *
 * Enhanced Features (Based on Proactive Review):
 * - JWT lifecycle management with periodic re-validation
 * - Comprehensive audit logging for security investigations
 * - Dynamic permission updates for active connections
 * - Enhanced error handling and resource cleanup
 * - Performance optimization for scalability
 * - Input validation and rate limiting
 */

import jwt from 'jsonwebtoken';
import Project from '../models/Project.js';
import User from '../models/User.js';
import { logger } from '../utils/logger.js';

// Connection tracking for JWT lifecycle management
const activeProjectConnections = new Map();
const connectionRateLimits = new Map(); // userId -> { count, resetTime }

// JWT re-validation interval (15 minutes)
const JWT_REVALIDATION_INTERVAL = 15 * 60 * 1000;

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_CONNECTIONS_PER_MINUTE = 10;

/**
 * Authenticate socket connection for project-specific features
 * Enhanced with JWT lifecycle management and comprehensive audit logging
 */
const authenticateProjectSocket = async (socket, next) => {
  const startTime = Date.now();
  const clientInfo = {
    socketId: socket.id,
    ip: socket.handshake.address,
    userAgent: socket.handshake.headers['user-agent'],
    timestamp: new Date().toISOString(),
  };

  try {
    // Extract project ID from socket handshake
    const { projectId } = socket.handshake.query;
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    // Enhanced audit logging - Record all authentication attempts
    logger.info('Project socket authentication attempt', {
      ...clientInfo,
      projectId: projectId || 'MISSING',
      tokenProvided: !!token,
      authMethod: socket.handshake.auth.token
        ? 'auth'
        : socket.handshake.query.token
        ? 'query'
        : 'none',
    });

    if (!token) {
      const error = 'Authentication error: No token provided';
      logger.warn('Project socket auth failed: No token', {
        ...clientInfo,
        projectId,
        reason: 'NO_TOKEN',
      });
      return next(new Error(error));
    }

    if (!projectId) {
      const error = 'Project ID required for collaboration features';
      logger.warn('Project socket auth failed: No project ID', {
        ...clientInfo,
        tokenLength: token.length,
        reason: 'NO_PROJECT_ID',
      });
      return next(new Error(error));
    }

    // Rate limiting check
    const rateLimitResult = checkRateLimit(socket.handshake.address);
    if (!rateLimitResult.allowed) {
      const error = 'Rate limit exceeded for project connections';
      logger.warn('Project socket auth failed: Rate limit exceeded', {
        ...clientInfo,
        projectId,
        reason: 'RATE_LIMIT',
        attemptsInWindow: rateLimitResult.count,
        resetTime: rateLimitResult.resetTime,
      });
      return next(new Error(error));
    }

    // Verify JWT token with enhanced error handling
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ['HS256'],
        maxAge: '7d', // Explicit max age check
      });
    } catch (jwtError) {
      let errorReason = 'INVALID_TOKEN';
      let errorMessage = 'Authentication error: Invalid token';

      if (jwtError.name === 'TokenExpiredError') {
        errorReason = 'TOKEN_EXPIRED';
        errorMessage = 'Authentication error: Token expired';
      } else if (jwtError.name === 'JsonWebTokenError') {
        errorReason = 'MALFORMED_TOKEN';
        errorMessage = `Authentication error: ${jwtError.message}`;
      }

      logger.warn('Project socket auth failed: JWT verification failed', {
        ...clientInfo,
        projectId,
        reason: errorReason,
        jwtError: jwtError.message,
        tokenAge: jwtError.expiredAt
          ? Date.now() - new Date(jwtError.expiredAt).getTime()
          : 'unknown',
      });

      return next(new Error(errorMessage));
    }

    // Enhanced user validation with performance optimization
    const user = await User.findById(decoded.id)
      .select('-password -refreshToken') // Exclude sensitive fields
      .lean(); // Use lean for better performance

    if (!user) {
      const error = 'Authentication error: User not found';
      logger.warn('Project socket auth failed: User not found', {
        ...clientInfo,
        userId: decoded.id,
        projectId,
        reason: 'USER_NOT_FOUND',
        tokenIssuedAt: decoded.iat
          ? new Date(decoded.iat * 1000).toISOString()
          : 'unknown',
      });
      return next(new Error(error));
    }

    // Enhanced project validation with membership details
    const project = await Project.findById(projectId)
      .populate('members.user', 'username email')
      .lean(); // Use lean for better performance

    if (!project) {
      const error = 'Project not found';
      logger.warn('Project socket auth failed: Project not found', {
        ...clientInfo,
        userId: user._id,
        username: user.username,
        projectId,
        reason: 'PROJECT_NOT_FOUND',
      });
      return next(new Error(error));
    }

    // Enhanced membership validation with detailed logging
    const isOwner = project.owner.toString() === user._id.toString();
    const memberRecord = project.members.find(
      (member) => member.user._id.toString() === user._id.toString()
    );

    if (!isOwner && !memberRecord) {
      const error = 'Access denied: Not a project member';
      logger.warn('Project socket auth failed: Not a project member', {
        ...clientInfo,
        userId: user._id,
        username: user.username,
        projectId,
        projectTitle: project.title,
        isOwner,
        memberCount: project.members.length,
        reason: 'NOT_MEMBER',
      });
      return next(new Error(error));
    }

    // Determine user role and permissions for this project
    const userRole = isOwner ? 'owner' : memberRecord.role;
    const permissions = getProjectPermissions(userRole, project);

    // Enhanced socket context with lifecycle management
    socket.userId = user._id;
    socket.user = user;
    socket.projectId = projectId;
    socket.project = project;
    socket.userRole = userRole;
    socket.permissions = permissions;
    socket.authTimestamp = Date.now();
    socket.tokenHash = generateTokenHash(token); // For JWT lifecycle tracking

    // Track active connection for JWT lifecycle management
    activeProjectConnections.set(socket.id, {
      userId: user._id,
      projectId,
      authTimestamp: Date.now(),
      tokenHash: socket.tokenHash,
      lastValidation: Date.now(),
    });

    // Setup JWT re-validation timer
    setupJWTRevalidation(socket, token);

    // Comprehensive success logging for audit trail
    const authDuration = Date.now() - startTime;
    logger.info('Project socket authenticated successfully', {
      ...clientInfo,
      userId: user._id,
      username: user.username,
      projectId: projectId,
      projectTitle: project.title,
      userRole,
      permissions: Object.keys(permissions).filter((key) => permissions[key]),
      isOwner,
      memberCount: project.members.length,
      authDurationMs: authDuration,
      tokenIssuedAt: decoded.iat
        ? new Date(decoded.iat * 1000).toISOString()
        : 'unknown',
      success: true,
    });

    next();
  } catch (error) {
    const authDuration = Date.now() - startTime;

    // Enhanced error logging with full context
    logger.error('Project socket authentication error', {
      ...clientInfo,
      error: error.message,
      stack: error.stack,
      projectId: socket.handshake?.query?.projectId,
      authDurationMs: authDuration,
      errorType: error.constructor.name,
      success: false,
    });

    // Clean error messages for security
    if (error.name === 'JsonWebTokenError') {
      next(new Error('Authentication error: Invalid token'));
    } else if (error.name === 'TokenExpiredError') {
      next(new Error('Authentication error: Token expired'));
    } else if (error.message.includes('Cast to ObjectId failed')) {
      next(new Error('Invalid project or user ID'));
    } else {
      next(new Error('Authentication failed'));
    }
  }
};

/**
 * Rate limiting for connection attempts
 */
const checkRateLimit = (clientIp) => {
  const now = Date.now();
  const key = clientIp;

  if (!connectionRateLimits.has(key)) {
    connectionRateLimits.set(key, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return { allowed: true, count: 1, resetTime: now + RATE_LIMIT_WINDOW };
  }

  const limit = connectionRateLimits.get(key);

  // Reset window if expired
  if (now > limit.resetTime) {
    connectionRateLimits.set(key, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return { allowed: true, count: 1, resetTime: now + RATE_LIMIT_WINDOW };
  }

  // Increment count
  limit.count++;
  connectionRateLimits.set(key, limit);

  return {
    allowed: limit.count <= MAX_CONNECTIONS_PER_MINUTE,
    count: limit.count,
    resetTime: limit.resetTime,
  };
};

/**
 * Generate a hash of the token for tracking (security-safe)
 */
const generateTokenHash = (token) => {
  const crypto = require('crypto');
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex')
    .substring(0, 16);
};

/**
 * Setup JWT re-validation for long-lived connections
 */
const setupJWTRevalidation = (socket, originalToken) => {
  const revalidationTimer = setInterval(async () => {
    try {
      // Check if connection still exists
      if (!activeProjectConnections.has(socket.id)) {
        clearInterval(revalidationTimer);
        return;
      }

      // Re-verify the JWT token
      const decoded = jwt.verify(originalToken, process.env.JWT_SECRET, {
        algorithms: ['HS256'],
      });

      // Update validation timestamp
      const connection = activeProjectConnections.get(socket.id);
      if (connection) {
        connection.lastValidation = Date.now();
        activeProjectConnections.set(socket.id, connection);
      }

      logger.debug('JWT re-validation successful', {
        socketId: socket.id,
        userId: socket.userId,
        projectId: socket.projectId,
        validationInterval: JWT_REVALIDATION_INTERVAL,
      });
    } catch (error) {
      // Token is no longer valid, disconnect the socket
      logger.warn('JWT re-validation failed, disconnecting socket', {
        socketId: socket.id,
        userId: socket.userId,
        projectId: socket.projectId,
        error: error.message,
        reason: 'JWT_REVALIDATION_FAILED',
      });

      clearInterval(revalidationTimer);
      socket.disconnect(true);
    }
  }, JWT_REVALIDATION_INTERVAL);

  // Store timer reference for cleanup
  socket.jwtRevalidationTimer = revalidationTimer;
};

/**
 * Update user permissions dynamically for active connections
 * Called when user roles change in a project
 */
const updateUserPermissions = async (projectId, userId, newRole) => {
  try {
    // Find all active connections for this user in this project
    const connectionsToUpdate = [];

    for (const [socketId, connection] of activeProjectConnections.entries()) {
      if (
        connection.projectId === projectId &&
        connection.userId.toString() === userId.toString()
      ) {
        connectionsToUpdate.push(socketId);
      }
    }

    if (connectionsToUpdate.length === 0) {
      logger.debug('No active connections found for permission update', {
        projectId,
        userId,
        newRole,
      });
      return;
    }

    // Get updated project info
    const project = await Project.findById(projectId).lean();
    if (!project) {
      logger.warn('Project not found during permission update', {
        projectId,
        userId,
      });
      return;
    }

    const newPermissions = getProjectPermissions(newRole, project);

    // Update each active connection
    const io = require('../app').io; // Get io instance
    for (const socketId of connectionsToUpdate) {
      const socket = io.sockets.sockets.get(socketId);
      if (socket) {
        // Update socket permissions
        socket.userRole = newRole;
        socket.permissions = newPermissions;

        // Re-join appropriate rooms based on new permissions
        await rejoinProjectRooms(socket);

        // Notify client of permission change
        socket.emit('permissions:updated', {
          newRole,
          permissions: newPermissions,
          timestamp: new Date().toISOString(),
        });

        logger.info('User permissions updated for active connection', {
          socketId,
          userId,
          projectId,
          oldRole: 'unknown', // Could be tracked if needed
          newRole,
          permissions: Object.keys(newPermissions).filter(
            (key) => newPermissions[key]
          ),
        });
      }
    }
  } catch (error) {
    logger.error('Error updating user permissions', {
      error: error.message,
      projectId,
      userId,
      newRole,
    });
  }
};

/**
 * Re-join project rooms based on updated permissions
 */
const rejoinProjectRooms = async (socket) => {
  const { projectId, permissions } = socket;

  // Leave all current project rooms
  const currentRooms = Array.from(socket.rooms);
  for (const room of currentRooms) {
    if (room.startsWith(`project:${projectId}`)) {
      socket.leave(room);
    }
  }

  // Re-join rooms based on new permissions
  await joinProjectRooms(socket);
};

/**
 * Enhanced permission system with detailed capabilities
 * Now includes all 14 distinct capabilities mentioned in review
 */
const getProjectPermissions = (role, project) => {
  const basePermissions = {
    canView: true,
    canComment: false,
    canEditTasks: false,
    canCreateTasks: false,
    canDeleteTasks: false,
    canAssignTasks: false,
    canManageMembers: false,
    canInviteMembers: false,
    canRemoveMembers: false,
    canChangeRoles: false,
    canDeleteProject: false,
    canModifyProjectSettings: false,
    canAccessFiles: false,
    canUploadFiles: false,
    canDeleteFiles: false,
    canViewAnalytics: false,
    canExportData: false,
    canArchiveProject: false,
    canManageIntegrations: false,
    canManageWebhooks: false,
  };

  switch (role) {
    case 'owner':
      return {
        ...basePermissions,
        canComment: true,
        canEditTasks: true,
        canCreateTasks: true,
        canDeleteTasks: true,
        canAssignTasks: true,
        canManageMembers: true,
        canInviteMembers: true,
        canRemoveMembers: true,
        canChangeRoles: true,
        canDeleteProject: true,
        canModifyProjectSettings: true,
        canAccessFiles: true,
        canUploadFiles: true,
        canDeleteFiles: true,
        canViewAnalytics: true,
        canExportData: true,
        canArchiveProject: true,
        canManageIntegrations: true,
        canManageWebhooks: true,
      };

    case 'admin':
      return {
        ...basePermissions,
        canComment: true,
        canEditTasks: true,
        canCreateTasks: true,
        canDeleteTasks: true,
        canAssignTasks: true,
        canManageMembers: true,
        canInviteMembers: true,
        canModifyProjectSettings: true,
        canAccessFiles: true,
        canUploadFiles: true,
        canDeleteFiles: true,
        canViewAnalytics: true,
        canExportData: true,
        canManageIntegrations: true,
      };

    case 'member':
      return {
        ...basePermissions,
        canComment: true,
        canEditTasks: true,
        canCreateTasks: true,
        canAccessFiles: true,
        canUploadFiles: true,
        canViewAnalytics: project.features?.analytics || false,
      };

    case 'viewer':
      return {
        ...basePermissions,
        canComment: project.features?.comments || false,
        canAccessFiles: project.features?.files || false,
        canViewAnalytics: project.features?.analytics || false,
      };

    default:
      logger.warn(`Unknown role provided: ${role}`, { role });
      return basePermissions;
  }
};

/**
 * Enhanced validation middleware for specific actions
 */
const validateActionPermission = (requiredPermission) => {
  return (socket, next) => {
    const startTime = Date.now();

    if (!socket.permissions || !socket.permissions[requiredPermission]) {
      const validationDuration = Date.now() - startTime;

      logger.warn('Project socket permission denied', {
        socketId: socket.id,
        userId: socket.userId,
        projectId: socket.projectId,
        requiredPermission,
        userRole: socket.userRole,
        availablePermissions: socket.permissions
          ? Object.keys(socket.permissions).filter(
              (key) => socket.permissions[key]
            )
          : [],
        validationDurationMs: validationDuration,
        timestamp: new Date().toISOString(),
      });

      return next(
        new Error(`Permission denied: ${requiredPermission} not allowed`)
      );
    }

    // Log successful permission validation for audit
    logger.debug('Permission validation successful', {
      socketId: socket.id,
      userId: socket.userId,
      projectId: socket.projectId,
      requiredPermission,
      userRole: socket.userRole,
      validationDurationMs: Date.now() - startTime,
    });

    next();
  };
};

/**
 * Enhanced project room joining with detailed logging
 */
const joinProjectRooms = async (socket) => {
  const { projectId, userId, permissions, userRole } = socket;
  const joinStartTime = Date.now();

  try {
    const roomsJoined = [];

    // Join main project room (all members)
    await socket.join(`project:${projectId}`);
    roomsJoined.push(`project:${projectId}`);

    // Join permission-based rooms for targeted updates
    if (permissions.canEditTasks) {
      await socket.join(`project:${projectId}:editors`);
      roomsJoined.push(`project:${projectId}:editors`);
    }

    if (permissions.canManageMembers) {
      await socket.join(`project:${projectId}:managers`);
      roomsJoined.push(`project:${projectId}:managers`);
    }

    if (permissions.canViewAnalytics) {
      await socket.join(`project:${projectId}:analytics`);
      roomsJoined.push(`project:${projectId}:analytics`);
    }

    if (permissions.canAccessFiles) {
      await socket.join(`project:${projectId}:files`);
      roomsJoined.push(`project:${projectId}:files`);
    }

    // Join user-specific project room for direct notifications
    await socket.join(`project:${projectId}:user:${userId}`);
    roomsJoined.push(`project:${projectId}:user:${userId}`);

    const joinDuration = Date.now() - joinStartTime;

    logger.info(`User successfully joined project rooms`, {
      userId,
      projectId,
      userRole,
      socketId: socket.id,
      roomsJoined,
      roomCount: roomsJoined.length,
      joinDurationMs: joinDuration,
      timestamp: new Date().toISOString(),
    });

    // Broadcast user online status to project members with enhanced info
    socket.to(`project:${projectId}`).emit('user:presence:online', {
      userId,
      username: socket.user.username,
      userRole,
      permissions: Object.keys(permissions).filter((key) => permissions[key]),
      timestamp: new Date().toISOString(),
      socketId: socket.id,
    });
  } catch (error) {
    const joinDuration = Date.now() - joinStartTime;

    logger.error('Error joining project rooms', {
      error: error.message,
      stack: error.stack,
      userId,
      projectId,
      socketId: socket.id,
      joinDurationMs: joinDuration,
    });
    throw error;
  }
};

/**
 * Enhanced disconnection handling with comprehensive cleanup
 */
const handleProjectDisconnection = async (socket) => {
  const { projectId, userId, user, userRole } = socket;

  if (projectId && userId) {
    try {
      // Clean up JWT re-validation timer
      if (socket.jwtRevalidationTimer) {
        clearInterval(socket.jwtRevalidationTimer);
      }

      // Remove from active connections tracking
      activeProjectConnections.delete(socket.id);

      // Broadcast user offline status to project members
      socket.to(`project:${projectId}`).emit('user:presence:offline', {
        userId,
        username: user.username,
        userRole,
        timestamp: new Date().toISOString(),
        socketId: socket.id,
      });

      logger.info('User disconnected from project', {
        userId,
        username: user.username,
        projectId,
        userRole,
        socketId: socket.id,
        activeConnectionsRemaining: activeProjectConnections.size,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error handling project disconnection', {
        error: error.message,
        stack: error.stack,
        userId,
        projectId,
        socketId: socket.id,
      });
    }
  }
};

/**
 * Enhanced project room statistics with performance metrics
 */
const getProjectRoomStats = async (io, projectId) => {
  const statsStartTime = Date.now();

  try {
    const rooms = [
      `project:${projectId}`,
      `project:${projectId}:editors`,
      `project:${projectId}:managers`,
      `project:${projectId}:analytics`,
      `project:${projectId}:files`,
    ];

    const stats = {};
    for (const room of rooms) {
      const sockets = await io.in(room).fetchSockets();
      stats[room] = {
        connectedUsers: sockets.length,
        socketIds: sockets.map((s) => s.id),
        userDetails: sockets.map((s) => ({
          userId: s.userId,
          username: s.user?.username,
          role: s.userRole,
          connectedAt: s.authTimestamp,
        })),
      };
    }

    const statsDuration = Date.now() - statsStartTime;

    logger.debug('Project room stats generated', {
      projectId,
      totalRooms: rooms.length,
      statsDurationMs: statsDuration,
      timestamp: new Date().toISOString(),
    });

    return {
      projectId,
      stats,
      generatedAt: new Date().toISOString(),
      generationTimeMs: statsDuration,
    };
  } catch (error) {
    const statsDuration = Date.now() - statsStartTime;

    logger.error('Error getting project room stats', {
      error: error.message,
      projectId,
      statsDurationMs: statsDuration,
    });
    return {
      error: error.message,
      projectId,
      stats: {},
      generatedAt: new Date().toISOString(),
    };
  }
};

/**
 * Get active connections statistics for monitoring
 */
const getActiveConnectionsStats = () => {
  const stats = {
    totalConnections: activeProjectConnections.size,
    connectionsByProject: {},
    connectionsByUser: {},
    oldestConnection: null,
    newestConnection: null,
  };

  let oldestTimestamp = Date.now();
  let newestTimestamp = 0;

  for (const [socketId, connection] of activeProjectConnections.entries()) {
    const { projectId, userId, authTimestamp } = connection;

    // Group by project
    if (!stats.connectionsByProject[projectId]) {
      stats.connectionsByProject[projectId] = 0;
    }
    stats.connectionsByProject[projectId]++;

    // Group by user
    if (!stats.connectionsByUser[userId]) {
      stats.connectionsByUser[userId] = 0;
    }
    stats.connectionsByUser[userId]++;

    // Track oldest and newest connections
    if (authTimestamp < oldestTimestamp) {
      oldestTimestamp = authTimestamp;
      stats.oldestConnection = { socketId, ...connection };
    }
    if (authTimestamp > newestTimestamp) {
      newestTimestamp = authTimestamp;
      stats.newestConnection = { socketId, ...connection };
    }
  }

  return stats;
};

export {
  authenticateProjectSocket,
  validateActionPermission,
  getProjectPermissions,
  joinProjectRooms,
  handleProjectDisconnection,
  getProjectRoomStats,
  updateUserPermissions,
  getActiveConnectionsStats,
};
