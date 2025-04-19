const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const morgan = require('morgan'); // Add morgan for HTTP request logging
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import models and utils
const User = require('./models/User');
const { logger } = require('./utils/logger');
const {
  authenticateSocket,
  handleConnection,
} = require('./utils/socketManager');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create an access log file stream
const accessLogStream = fs.createWriteStream(path.join(logsDir, 'access.log'), {
  flags: 'a',
});

const app = express();
const server = http.createServer(app);

// Print startup banner with more readable format
logger.info('┌──────────────────────────────────────────┐');
logger.info(`│ Server starting at ${new Date().toLocaleTimeString()} │`);
logger.info(`│ Environment: ${process.env.NODE_ENV || 'development'} │`);
logger.info('└──────────────────────────────────────────┘');

// Initialize Socket.IO with auth middleware
const io = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'https://utool-xi.vercel.app',
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Socket authentication middleware with verbose logging
io.use((socket, next) => {
  logger.verbose(`Socket authentication attempt for socket ${socket.id}`);
  authenticateSocket(socket, next);
});

// Socket connection handler with verbose logging
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`, {
    socketId: socket.id,
    userId: socket.user?.id,
    userAgent: socket.handshake.headers['user-agent'],
  });

  handleConnection(io, socket);

  // Log socket disconnections
  socket.on('disconnect', (reason) => {
    logger.verbose(`Socket disconnected: ${socket.id}, reason: ${reason}`);
  });
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Route files
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const noteRoutesGeneral = require('./routes/noteRoutesGeneral');
const kbArticleRoutes = require('./routes/kbArticles');
const projectRoutes = require('./routes/projects');
const userRoutes = require('./routes/users');
const weatherRoutes = require('./routes/weather'); // Import weather routes
const auditLogRoutes = require('./routes/auditLogs');
const {
  articleCommentsRouter,
  commentActionsRouter,
} = require('./routes/comments');
const personalNotesRouter = require('./routes/personalNotes');
const quoteRoutes = require('./routes/quotes'); // Import quotes routes
const stockRoutes = require('./routes/stocks'); // Import stock routes
const friendRoutes = require('./routes/friends'); // Import friend routes
const notificationRoutes = require('./routes/notifications'); // Import notification routes

// Middleware
// Enhanced CORS configuration for Vercel frontend
app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = [
        process.env.FRONTEND_URL,
        'http://localhost:3000',
        'https://utool-xi.vercel.app',
      ];

      // Allow requests with no origin (like mobile apps, curl requests)
      if (!origin) return callback(null, true);

      if (
        allowedOrigins.indexOf(origin) !== -1 ||
        process.env.NODE_ENV !== 'production'
      ) {
        logger.verbose(`CORS allowed origin: ${origin}`);
        callback(null, true);
      } else {
        logger.warn(`CORS blocked origin: ${origin}`);
        callback(null, true); // Allow all origins in case env variables aren't set properly
      }
    },
    credentials: true,
  })
);

// Setup Morgan for HTTP request logging - use combined format for file and dev format for console
app.use(morgan('combined', { stream: accessLogStream }));
app.use(morgan('dev', { stream: logger.stream }));

app.use(express.json());

// Add middleware to log all incoming requests with verbose details
app.use((req, res, next) => {
  // Start timing the request
  req._startTime = Date.now();

  // Log the incoming request with body in development
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
    // In production, just log standard info
    logger.http(`${req.method} ${req.originalUrl}`, { req });
  }

  // Capture the original res.json to intercept and log responses
  const originalJson = res.json;
  res.json = function (body) {
    res.body = body; // Save for logging

    // Log response in verbose mode (development only)
    if (process.env.NODE_ENV === 'development') {
      const responseTime = Date.now() - req._startTime;
      logger.verbose(
        `Response for: ${req.method} ${req.originalUrl} - ${res.statusCode} - ${responseTime}ms`,
        {
          statusCode: res.statusCode,
          responseTime,
          // Only log non-sensitive parts or truncate large responses
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
    }

    // Call the original json method
    return originalJson.call(this, body);
  };

  // Log response completion with timing
  res.on('finish', () => {
    const responseTime = Date.now() - req._startTime;

    // Log slow requests as warnings
    if (responseTime > 1000) {
      logger.warn(
        `SLOW REQUEST: ${req.method} ${req.originalUrl} ${res.statusCode} - ${responseTime}ms`
      );
    }

    logger.logRequest(req, res, responseTime);
  });

  next();
});

// Status endpoint for health checks with added logging
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
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/tasks', taskRoutes);
// app.use('/api/v1/notes', noteRoutesGeneral);
app.use('/api/v1/notes', personalNotesRouter);
// Admin Notes (admin only, GET /)
app.use('/api/admin/notes', (req, res, next) => {
  if (req.method === 'GET') {
    // Use the adminGetAllNotes handler from the controller
    require('./controllers/personalNoteController').adminGetAllNotes(
      req,
      res,
      next
    );
  } else {
    res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }
});
app.use('/api/v1/kb', kbArticleRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/weather', weatherRoutes); // Mount weather routes
app.use('/api/v1/audit-logs', auditLogRoutes);
app.use('/api/v1/comments', commentActionsRouter);
app.use('/api/v1/quotes', quoteRoutes); // Mount quotes routes
app.use('/api/v1/stocks', stockRoutes); // Mount stock routes
app.use('/api/v1/friends', friendRoutes); // Mount friend routes
app.use('/api/v1/notifications', notificationRoutes); // Mount notification routes

// Basic Route with logging
app.get('/', (req, res) => {
  logger.info('Root route accessed');
  res.send('API is running...');
});

// Error handling middleware with enhanced logging
app.use((err, req, res, next) => {
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

  // Send appropriate response
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Connect to MongoDB with better error handling and logging
async function connectToDatabase() {
  if (!MONGO_URI) {
    logger.error('FATAL ERROR: MONGO_URI is not defined.');
    process.exit(1);
  }

  // Log connection attempt
  logger.info(
    `Attempting to connect to MongoDB at ${MONGO_URI.substring(
      0,
      MONGO_URI.indexOf('@') + 1
    )}...`
  );

  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    logger.info(
      `MongoDB Connected - readyState: ${mongoose.connection.readyState}`,
      {
        database: mongoose.connection.name,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
      }
    );

    // Make io available to routes
    app.set('io', io);

    // Start scheduled reminders with logging
    const {
      scheduleTaskReminders,
      scheduleNoteReminders,
      scheduleNotificationProcessor,
    } = require('./utils/reminderScheduler');

    logger.info('Starting scheduled task reminders');
    scheduleTaskReminders();

    logger.info('Starting scheduled note reminders');
    scheduleNoteReminders();

    logger.info('Starting notification processor');
    scheduleNotificationProcessor(io); // Pass io to notification processor

    // Start server only after DB connection
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`API available at http://localhost:${PORT}/api/v1`);
    });
  } catch (err) {
    logger.error('MongoDB Connection Error:', {
      error: err,
      mongoURI: MONGO_URI.substring(0, MONGO_URI.indexOf('@') + 1) + '***',
      message: err.message,
      stack: err.stack,
    });
    process.exit(1);
  }
}

// Log connection events
mongoose.connection.on('connected', () => {
  logger.info('Mongoose connected to DB');
});

mongoose.connection.on('error', (err) => {
  logger.error('Mongoose connection error:', { error: err });
});

mongoose.connection.on('disconnected', () => {
  logger.warn('Mongoose disconnected from DB');
});

// Handle process termination with logging
process.on('SIGINT', async () => {
  logger.info('SIGINT signal received. Shutting down gracefully...');
  await mongoose.connection.close();
  logger.info('MongoDB connection closed');
  process.exit(0);
});

// Log unhandled rejections and exceptions
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', { reason, promise });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', { error: err });
  // Exit with error in production to restart the process
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Start the application
connectToDatabase();

// Export app, server, and io if needed by other modules (e.g., tests)
module.exports = { app, server, io };
