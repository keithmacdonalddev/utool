// server.js - Main entry point for the Express server application
// This file initializes the server, connects to MongoDB, sets up middleware, and defines routes

/*
┌─────────────────────────────────────────────────────────────┐
│ SERVER ARCHITECTURE EDUCATIONAL GUIDE                       │
│                                                             │
│ This Express.js server implements a modern API architecture │
│ with the following key components:                          │
│                                                             │
│ 1. LAYERED ARCHITECTURE                                     │
│    - Routes: Define API endpoints and HTTP methods          │
│    - Controllers: Handle business logic for each route      │
│    - Models: Define data schema and database interactions   │
│    - Middleware: Process requests before reaching routes    │
│                                                             │
│ 2. REAL-TIME CAPABILITIES                                   │
│    - Socket.IO integration for bidirectional communication  │
│    - JWT-based socket authentication                        │
│    - Event-based messaging system                           │
│                                                             │
│ 3. CROSS-CUTTING CONCERNS                                   │
│    - Comprehensive logging (morgan + custom logger)         │
│    - CORS security with dynamic origin validation           │
│    - Request timing and performance monitoring              │
│    - Health check endpoints for infrastructure monitoring   │
│                                                             │
│ 4. REST API DESIGN PRINCIPLES                               │
│    - Feature-based route organization                       │
│    - Consistent API versioning (/api/v1/...)                │
│    - Resource-oriented endpoint naming                      │
└─────────────────────────────────────────────────────────────┘
*/

// Import required Node.js packages
import express from 'express';
import mongoose from 'mongoose';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import helmet from 'helmet'; // Security middleware for HTTP headers
import rateLimit from 'express-rate-limit'; // API rate limiting
import schedule from 'node-schedule'; // For scheduled tasks
import cookieParser from 'cookie-parser'; // Cookie parsing middleware
dotenv.config();

// Import custom logger for structured logging
// This logger is used throughout the application for consistent logging
import { logger } from './utils/logger.js';

/**
 * Validates required environment variables to ensure proper server configuration.
 * This function checks for the presence of critical variables and exits if any are missing.
 * It also warns about recommended variables that aren't set.
 *
 * @returns {void} - Exits process with code 1 if critical variables are missing
 */
function validateEnvironmentVariables(logger) {
  // Critical variables that must be defined for the application to function
  const criticalVariables = [
    { name: 'MONGO_URI', reason: 'Required for database connection' },
    { name: 'JWT_SECRET', reason: 'Required for authentication functionality' },
  ];

  // Recommended variables with default values or optional functionality
  const recommendedVariables = [
    {
      name: 'PORT',
      reason: 'Server will use default port 5000 if not specified',
      defaultValue: '5000',
    },
    {
      name: 'FRONTEND_URL',
      reason: 'Required for proper CORS configuration',
      defaultValue: 'http://localhost:3000',
    },
    {
      name: 'NODE_ENV',
      reason: 'Will default to development if not specified',
      defaultValue: 'development',
    },
    {
      name: 'JWT_EXPIRES_IN',
      reason: 'Token expiration will use default if not specified',
      defaultValue: '30d',
    },
    {
      name: 'JWT_COOKIE_EXPIRE_DAYS',
      reason: 'Cookie expiration will use default if not specified',
      defaultValue: '30',
    },
    {
      name: 'REFRESH_TOKEN_SECRET', // Added
      reason: 'Required for refresh token functionality', // Added
    },
    {
      name: 'REFRESH_TOKEN_EXPIRES_IN', // Added
      reason: 'Refresh token expiration time', // Added
      defaultValue: '30d', // Added
    },
    {
      name: 'REFRESH_TOKEN_COOKIE_EXPIRE_DAYS', // Added
      reason: 'Cookie expiration for refresh tokens', // Added
      defaultValue: '30', // Added
    },
    {
      name: 'EMAIL_HOST',
      reason: 'Email functionality will be disabled if not configured',
    },
    {
      name: 'EMAIL_PORT',
      reason: 'Email functionality will be disabled if not configured',
    },
    {
      name: 'EMAIL_USER',
      reason: 'Email functionality will be disabled if not configured',
    },
    {
      name: 'EMAIL_PASS',
      reason: 'Email functionality will be disabled if not configured',
    },
    {
      name: 'EMAIL_FROM',
      reason: 'Email functionality will use default sender if not configured',
    },
    {
      name: 'OPENWEATHER_API_KEY_PRIMARY',
      reason: 'Weather functionality will be disabled if not configured',
    },
    {
      name: 'IP_HASH_SALT',
      reason: 'Required for secure guest analytics in production',
      productionOnly: true,
    },
    {
      name: 'IP_HASH_SALT',
      reason: 'Required for secure guest analytics in production',
      productionOnly: true,
    },
  ];

  // Check critical variables
  let missingCriticalVars = [];

  criticalVariables.forEach((variable) => {
    if (!process.env[variable.name]) {
      missingCriticalVars.push(`${variable.name}: ${variable.reason}`);
    }
  });

  // Exit if any critical variables are missing
  if (missingCriticalVars.length > 0) {
    logger.error('╔════════════════════════════════════════════════════╗');
    logger.error('║ FATAL ERROR: MISSING CRITICAL ENVIRONMENT VARIABLES ║');
    logger.error('╚════════════════════════════════════════════════════╝');

    missingCriticalVars.forEach((variable) => {
      logger.error(`• ${variable}`);
    });

    logger.error(
      '\nPlease set these variables in your .env file and restart the server.'
    );
    logger.error(
      'See .env.example for a template with all required variables.\n'
    );

    // Exit with error code
    process.exit(1);
  }
  // Check recommended variables
  let missingRecommendedVars = [];

  recommendedVariables.forEach((variable) => {
    // Skip if this is a production-only variable and we're not in production
    if (variable.productionOnly && process.env.NODE_ENV !== 'production') {
      return;
    }

    if (!process.env[variable.name]) {
      const message = variable.defaultValue
        ? `${variable.name}: ${variable.reason} (Will use default: ${variable.defaultValue})`
        : `${variable.name}: ${variable.reason}`;
      missingRecommendedVars.push(message);
    }
  });

  // Production-specific checks for sensitive variables
  if (process.env.NODE_ENV === 'production') {
    // Check for IP_HASH_SALT specifically in production
    if (!process.env.IP_HASH_SALT) {
      logger.warn(
        '╔═══════════════════════════════════════════════════════════════════╗'
      );
      logger.warn(
        '║ SECURITY WARNING: IP_HASH_SALT IS NOT SET IN PRODUCTION           ║'
      );
      logger.warn(
        '║ Guest IP addresses will not be properly anonymized for analytics   ║'
      );
      logger.warn(
        '╚═══════════════════════════════════════════════════════════════════╝'
      );
    }
  }

  // Warn about missing recommended variables
  if (missingRecommendedVars.length > 0) {
    logger.warn('╔═══════════════════════════════════════════════════╗');
    logger.warn('║ WARNING: MISSING RECOMMENDED ENVIRONMENT VARIABLES ║');
    logger.warn('╚═══════════════════════════════════════════════════╝');

    missingRecommendedVars.forEach((variable) => {
      logger.warn(`• ${variable}`);
    });

    logger.warn('\nConsider setting these variables for full functionality.');
    logger.warn(
      'See .env.example for a template with all recommended variables.\n'
    );
  }

  // Log successful validation
  logger.info('✓ Environment variables validated successfully');
}

// Regular imports continue...
import { isShuttingDown, setShuttingDown } from './utils/serverState.js';
import {
  authenticateSocket,
  handleConnection,
  initializeSocketManager,
} from './utils/socketManager.js';
import { logoutPriorityMiddleware } from './middleware/logoutPriorityMiddleware.js';
import { enhancedLogging } from './middleware/enhancedLogging.js';
import { trackGuestActivity } from './middleware/analyticsMiddleware.js';
import { initializeLogManagement } from './utils/logRotation.js';

// Validate environment variables before proceeding
// This must be called after logger import
validateEnvironmentVariables(logger);

// ESM __dirname workaround
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logs directory if it doesn't exist
// This ensures the application doesn't crash if the logs directory is missing
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create an access log file stream
// This writes HTTP access logs to a file for later analysis
const accessLogStream = fs.createWriteStream(path.join(logsDir, 'access.log'), {
  flags: 'a', // 'a' flag means append (don't overwrite the file)
});

// Initialize Express application
const app = express();

// Trust proxy for correct client IP extraction, but with restrictions
// Only trust the first hop in a proxy chain for better security
app.set('trust proxy', 1);

// Create HTTP server using Express app
const server = http.createServer(app);

// Print startup banner with more readable format
// This helps identify server starts in the logs
logger.info('┌──────────────────────────────────────────┐');
logger.info(`│ Server starting at ${new Date().toLocaleTimeString()} │`);
logger.info(`│ Environment: ${process.env.NODE_ENV || 'development'} │`);
logger.info('└──────────────────────────────────────────┘');

// Initialize Socket.IO with auth middleware
// Socket.IO enables real-time, bidirectional communication between web clients and server
const io = new Server(server, {
  cors: {
    // Allow connections from these origins for security
    origin: [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'https://utool-xi.vercel.app',
    ],
    methods: ['GET', 'POST'], // Allowed HTTP methods
    credentials: true, // Allow cookies to be sent with requests
  },
});

// Socket authentication middleware with verbose logging
// This verifies the user's JWT token before allowing socket connections
io.use((socket, next) => {
  logger.verbose(`Socket authentication attempt for socket ${socket.id}`);
  authenticateSocket(socket, next);
});

// Socket connection handler with verbose logging
// This runs whenever a client successfully connects
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`, {
    socketId: socket.id,
    userId: socket.user?.id,
    userAgent: socket.handshake.headers['user-agent'],
  }); // Set up event handlers for this socket connection
  handleConnection(io, socket); // Log socket disconnections

  socket.on('disconnect', (reason) => {
    logger.verbose(`Socket disconnected: ${socket.id}, reason: ${reason}`);
  });
});

// Define server port and MongoDB connection string
// Use environment variables with fallback values for flexibility
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Import route files
// Each file contains related route handlers organized by feature
import authRoutes from './routes/auth.js';
import noteRoutesGeneral from './routes/noteRoutesGeneral.js';
import kbArticleRoutes from './routes/kbArticles.js';
import projectRoutes from './routes/projects.js';
import userRoutes from './routes/users.js';
import weatherRoutes from './routes/weather.js';
import auditLogRoutes from './routes/auditLogs.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import {
  articleCommentsRouter,
  commentActionsRouter,
} from './routes/comments.js';
import personalNotesRouter from './routes/personalNotes.js';
import quoteRoutes from './routes/quotes.js';
import stockRoutes from './routes/stocks.js';
import friendRoutes from './routes/friends.js';
import notificationRoutes from './routes/notifications.js';
import bookmarkRoutes from './routes/bookmarks.js';
import bookmarkFolderRoutes from './routes/bookmarkFolders.js';
import snippetRoutes from './routes/snippets.js';
import snippetCategoryRoutes from './routes/snippetCategories.js';
import archiveRoutes from './routes/archive.js';
import adminSettingsRoutes from './routes/adminSettingsRoutes.js'; // Added for admin settings
import publicSettingsRoutes from './routes/publicSettingsRoutes.js'; // Added for public settings

// Import task controller for recent tasks endpoint
import { getRecentTasks } from './controllers/taskController.js';
import { protect } from './middleware/authMiddleware.js';

// Middleware Section
// Middleware functions process requests before they reach route handlers

// Enhanced CORS configuration for Vercel frontend
// CORS is necessary to allow the frontend to communicate with this API
const corsOptions = {
  // Dynamic origin validation function
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'https://utool-xi.vercel.app',
    ]; // Allow requests with no origin (like mobile apps, curl requests)

    if (!origin) return callback(null, true); // Check if origin is allowed or if we're in development mode

    if (
      allowedOrigins.indexOf(origin) !== -1 ||
      process.env.NODE_ENV !== 'production'
    ) {
      logger.verbose(`CORS allowed origin: ${origin}`);
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`); // In production, do not allow unauthorized origins
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Explicitly include all methods
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true, // Allow cookies and authentication headers
  maxAge: 86400, // Cache preflight requests for 24 hours
};

app.use(cors(corsOptions));

// Add CORS headers for preflight OPTIONS requests (extra safety)
app.options(/(.*)/, cors());

// Apply Helmet middleware for securing HTTP headers
app.use(helmet());

// Setup Morgan for HTTP request logging
// Uses different formats for file and console output
// REMOVED: app.use(morgan('combined', { stream: accessLogStream })); // Detailed logs to file
app.use(morgan('dev', { stream: logger.stream })); // Concise colored logs to console

// Add enhanced logging middleware for improved access logs
app.use(enhancedLogging);

// Initialize log rotation system
initializeLogManagement();

// Parse JSON request bodies with size limit
app.use(express.json({ limit: '1mb' }));
// Parse URL-encoded request bodies with size limit
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Parse cookies from incoming requests
app.use(cookieParser());

// Add guest analytics tracking middleware
app.use(trackGuestActivity);

// Add a global request logger to debug routing issues (using structured logger instead of console)
app.use((req, res, next) => {
  logger.http(`${req.method} ${req.originalUrl}`);
  next();
});

/**
 * Configure rate limiting for sensitive endpoints
 * This protects against brute force attacks and DoS attempts
 * @type {import('express-rate-limit').RateLimitRequestHandler}
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute window
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Ensures rate limiting works correctly with our trust proxy setting
  // This tells the rate limiter to trust the X-Forwarded-For header from the first proxy
  trustProxy: 1,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  handler: (req, res, _, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`, {
      path: req.path,
      method: req.method,
      headers: req.headers,
    });
    res.status(options.statusCode).json(options.message);
  },
});

// Apply logout priority middleware to catch logout requests early
// This helps prevent race conditions by prioritizing logout requests
app.use(logoutPriorityMiddleware);

// Custom middleware to log all incoming requests with verbose details
// This provides detailed insights for debugging and monitoring
app.use((req, res, next) => {
  // Start timing the request - useful for performance monitoring
  req._startTime = Date.now(); // Log the incoming request with body in development

  if (process.env.NODE_ENV === 'development') {
    logger.verbose(`Request received: ${req.method} ${req.originalUrl}`, {
      body: req.body,
      query: req.query,
      params: req.params,
      headers: {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
        referer: req.headers.referer,
      },
    });
  } else {
    // In production, just log standard info to reduce log volume
    logger.http(`${req.method} ${req.originalUrl}`, { req });
  } // Capture the original res.json to intercept and log responses // This is a technique called "monkey patching" to extend functionality

  const originalJson = res.json;
  res.json = function (body) {
    res.body = body; // Save for logging // Log response in verbose mode (development only)

    if (process.env.NODE_ENV === 'development') {
      const responseTime = Date.now() - req._startTime;
      logger.verbose(
        `Response for: ${req.method} ${req.originalUrl} - ${res.statusCode} - ${responseTime}ms`,
        {
          statusCode: res.statusCode,
          responseTime, // Only log non-sensitive parts or truncate large responses
          responseBody: body
            ? typeof body === 'object'
              ? {
                  success: body.success,
                  message: body.message,
                  dataSize: body.data
                    ? `${JSON.stringify(body.data).length} chars`
                    : 'none',
                }
              : 'non-object response'
            : 'empty',
        }
      );
    } // Call the original json method

    return originalJson.call(this, body);
  }; // Log response completion with timing // This runs after the response has been sent to the client

  res.on('finish', () => {
    const responseTime = Date.now() - req._startTime; // Log slow requests as warnings for performance monitoring

    if (responseTime > 1000) {
      logger.warn(
        `SLOW REQUEST: ${req.method} ${req.originalUrl} ${res.statusCode} - ${responseTime}ms`
      );
    }

    logger.logRequest(req, res, responseTime);
  });

  next(); // Continue to the next middleware or route handler
});

// Status endpoint for health checks with added logging
// Useful for monitoring and automated health checks
app.get('/api/v1/status', (req, res) => {
  const status = {
    status: 'API is running',
    environment: process.env.NODE_ENV,
    mongoConnected: mongoose.connection.readyState === 1,
    hasMongoUri: Boolean(process.env.MONGO_URI),
    hasJwtSecret: Boolean(process.env.JWT_SECRET),
    dbConnectionState: mongoose.connection.readyState,
    timestamp: new Date().toISOString(),
    serverUptime: process.uptime() + ' seconds',
  };

  logger.info('Health check requested', { status });
  res.json(status);
});

// Mount Routers
// Define base path for API version 1
const API_V1_BASE_PATH = '/api/v1';

// Public settings route - does not require authentication by default
// This should be mounted before any global 'protect' middleware if it's truly public.
// However, individual routes can still use 'protect' if needed for specific endpoints.
app.use(`${API_V1_BASE_PATH}/settings`, publicSettingsRoutes);

// Authentication and User routes
app.use(`${API_V1_BASE_PATH}/auth`, authRoutes);
app.use(`${API_V1_BASE_PATH}/users`, userRoutes);

// Admin specific routes
// These routes are typically protected and authorized for admin users.
// The adminSettingsRoutes.js file already includes 'protect' and 'authorize' middleware.
app.use(`${API_V1_BASE_PATH}/admin/settings`, adminSettingsRoutes);

// Feature-specific routes
app.use(`${API_V1_BASE_PATH}/notes`, personalNotesRouter);

// Admin Notes (admin only, GET /)
// Updated to follow the consistent /api/v1/... pattern
app.use('/api/v1/admin/notes', async (req, res, next) => {
  if (req.method === 'GET') {
    const module = await import('./controllers/personalNoteController.js');
    return module.adminGetAllNotes(req, res, next);
  } else {
    res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }
});

app.use('/api/v1/kb', kbArticleRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/weather', weatherRoutes);
app.use('/api/v1/audit-logs', auditLogRoutes);
app.use('/api/v1/comments', commentActionsRouter);
app.use('/api/v1/quotes', quoteRoutes);
app.use('/api/v1/stocks', stockRoutes);
app.use('/api/v1/friends', friendRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/bookmarks', bookmarkRoutes);
app.use('/api/v1/bookmark-folders', bookmarkFolderRoutes);
// Register the more specific route first to prevent conflict
app.use('/api/v1/snippets/categories', snippetCategoryRoutes);
app.use('/api/v1/snippets', snippetRoutes);
app.use('/api/v1/archive', archiveRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

// Add specific route for recent tasks (must be before the catch-all route)
app.get('/api/v1/tasks/recent', protect, getRecentTasks);

// Basic Route with logging
app.get('/', (req, res) => {
  logger.info('Root route accessed');
  res.send('API is running...');
});

// Temporarily removed catch-all route to fix server startup issues
// TODO: Add back a proper catch-all route for task endpoints later

// Error handling middleware with enhanced logging
// This catches errors thrown in routes and middleware
app.use(async (err, req, res, next) => {
  // Log the error with stack trace and request details
  logger.error(
    `Error processing ${req.method} ${req.originalUrl}: ${err.message}`,
    {
      error: err,
      req,
      stack: err.stack,
      body: req.body,
      params: req.params,
      query: req.query,
    }
  );

  // Track errors for guest users in analytics
  if (req.user && req.user.isGuest) {
    try {
      const { logGuestError } = await import(
        './middleware/analyticsMiddleware.js'
      );
      await logGuestError(req, err, err.statusCode || 500);
    } catch (analyticsError) {
      logger.error('Failed to log guest error to analytics', {
        analyticsError,
        originalError: err.message,
      });
      // Continue processing the original error even if analytics logging fails
    }
  }

  // Send appropriate response
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Server Error', // Only include stack trace in development for security
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Connect to MongoDB with better error handling and logging
// This is an async function to use try/catch with await
async function connectToDatabase() {
  // MONGO_URI is already validated by validateEnvironmentVariables
  // Log connection attempt - only show first part of URI for security
  logger.info(
    `Attempting to connect to MongoDB at ${MONGO_URI.substring(
      0,
      MONGO_URI.indexOf('@') + 1
    )}...`
  );

  try {
    // Connect to MongoDB with enhanced production settings
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // Time to find a server
      socketTimeoutMS: 45000, // Time for operations to complete
      retryWrites: true, // Enable retryable writes for better reliability
      w: 'majority', // Ensure writes are acknowledged by majority of replica set
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 5, // Keep at least 5 connections open
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
    });
    logger.info(
      `MongoDB Connected - readyState: ${mongoose.connection.readyState}`,
      {
        database: mongoose.connection.name,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
      }
    );

    // Initialize socket manager with io instance for push notifications
    initializeSocketManager(io);
    logger.info('Socket manager initialized with io instance');

    // Initialize push notification manager
    try {
      const { default: PushNotificationManager } = await import(
        './utils/pushNotificationManager.js'
      );
      const pushNotificationManager = new PushNotificationManager();

      // Initialize with socket manager reference
      const socketManagerModule = await import('./utils/socketManager.js');
      pushNotificationManager.initialize(socketManagerModule);

      // Make push notification manager available globally for controllers
      global.pushNotificationManager = pushNotificationManager;

      logger.info('Push notification manager initialized');
    } catch (error) {
      logger.warn('Failed to initialize push notification manager:', error);
      // Continue without push notifications
    }

    // Make io available to routes through the app object // This allows routes to access the socket.io instance
    app.set('io', io); // Start scheduled reminders with logging

    const {
      scheduleTaskReminders,
      scheduleNoteReminders,
      scheduleNotificationProcessor,
    } = await import('./utils/reminderScheduler.js'); // Set up scheduled tasks

    logger.info('Starting scheduled task reminders');
    scheduleTaskReminders();

    logger.info('Starting scheduled note reminders');
    scheduleNoteReminders();
    logger.info('Starting notification processor');
    scheduleNotificationProcessor(io); // Pass io to notification processor

    // Schedule analytics data cleanup to run daily at 2 AM
    try {
      const { cleanupOldAnalytics } = await import(
        './controllers/analyticsController.js'
      );
      logger.info('Starting scheduled analytics data cleanup');

      // Schedule to run at 2 AM every day
      // This time is chosen to minimize impact on active users
      schedule.scheduleJob('0 2 * * *', async () => {
        try {
          // Default retention period is 90 days, configurable via environment variable
          const retentionDays = parseInt(
            process.env.ANALYTICS_RETENTION_DAYS || '90',
            10
          );
          logger.info(
            `Running scheduled analytics cleanup (retention: ${retentionDays} days)`
          );
          const result = await cleanupOldAnalytics(retentionDays);

          if (result.deleted > 0) {
            logger.info(
              `Analytics cleanup: Successfully deleted ${result.deleted} old guest sessions`
            );
          } else {
            logger.debug('Analytics cleanup: No old guest sessions to delete');
          }
        } catch (error) {
          logger.error('Scheduled analytics cleanup failed:', error);
        }
      });
    } catch (error) {
      logger.warn('Failed to schedule analytics cleanup:', error);
      // Non-critical feature, continue server startup
    }

    // Start server only after DB connection // This prevents the server from accepting requests before DB is ready
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`API available at http://localhost:${PORT}/api/v1`);
    });
  } catch (err) {
    logger.error('MongoDB Connection Error:', {
      error: err, // Hide credentials in the URI
      mongoURI: MONGO_URI.substring(0, MONGO_URI.indexOf('@') + 1) + '***',
      message: err.message,
      stack: err.stack,
    });

    process.exit(1); // Exit with error code
  }
}

// Set up MongoDB connection event handlers
// These help monitor the database connection state

// Log when successfully connected
mongoose.connection.on('connected', () => {
  logger.info('Mongoose connected to DB');
});

// Log connection errors
mongoose.connection.on('error', (err) => {
  logger.error('Mongoose connection error:', { error: err });
});

// Log disconnections
mongoose.connection.on('disconnected', () => {
  logger.warn('Mongoose disconnected from DB');
});

// Handle process termination with logging
// This ensures a clean shutdown when the process is terminated

process.on('SIGINT', async () => {
  setShuttingDown(true);
  logger.info('SIGINT signal received. Shutting down gracefully...');
  await mongoose.connection.close();
  logger.info('MongoDB connection closed');
  process.exit(0); // Exit with success code
});

// Log unhandled rejections and exceptions
// These are errors that weren't caught in try/catch blocks
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', {
    reason:
      reason instanceof Error
        ? { message: reason.message, stack: reason.stack }
        : reason,
    promise,
  });
});

process.on('uncaughtException', (err) => {
  // Ensure we fully capture the error properties
  const errorObj = {
    message: err.message,
    name: err.name,
    stack: err.stack,
    code: err.code,
  };

  logger.error('Uncaught Exception:', { error: errorObj });

  // Exit with error in production to restart the process
  if (process.env.NODE_ENV === 'production') {
    // Allow time for the error to be logged before exiting
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  }
});

// Start the application by connecting to the database
// Only start the server if we're not in test mode
if (process.env.NODE_ENV !== 'test') {
  connectToDatabase();
}

// Export app for testing
export default app;
