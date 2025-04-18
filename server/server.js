const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Import models and utils
const User = require('./models/User');
const { logger } = require('./utils/logger');
const {
  authenticateSocket,
  handleConnection,
} = require('./utils/socketManager');

const app = express();
const server = http.createServer(app);

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

// Socket authentication middleware
io.use(authenticateSocket);

// Socket connection handler
io.on('connection', (socket) => {
  handleConnection(io, socket);
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
        callback(null, true);
      } else {
        console.log('CORS blocked origin:', origin);
        callback(null, true); // Allow all origins in case env variables aren't set properly
      }
    },
    credentials: true,
  })
);
app.use(express.json());

// Add middleware to log all incoming requests
app.use((req, res, next) => {
  // Start timing the request
  req._startTime = Date.now();

  // Log the incoming request
  logger.http(`${req.method} ${req.originalUrl}`, { req });

  // Log response completion
  res.on('finish', () => {
    const responseTime = Date.now() - req._startTime;
    logger.logRequest(req, res, responseTime);
  });

  next();
});

// Status endpoint for health checks
app.get('/api/v1/status', (req, res) => {
  res.json({
    status: 'API is running',
    environment: process.env.NODE_ENV,
    mongoConnected: mongoose.connection.readyState === 1,
    hasMongoUri: Boolean(process.env.MONGO_URI),
    hasJwtSecret: Boolean(process.env.JWT_SECRET),
    dbConnectionState: mongoose.connection.readyState,
    timestamp: new Date().toISOString(),
  });
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

// Basic Route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Error handling middleware
app.use((err, req, res, next) => {
  // Log the error
  logger.error(err.message, { error: err, req });

  // Send appropriate response
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Connect to MongoDB with better error handling
async function connectToDatabase() {
  if (!MONGO_URI) {
    logger.error('FATAL ERROR: MONGO_URI is not defined.');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    logger.info(
      'MongoDB Connected - readyState:',
      mongoose.connection.readyState
    );

    // Start scheduled reminders for tasks
    const { scheduleTaskReminders } = require('./utils/reminderScheduler');
    scheduleTaskReminders();

    // Start server only after DB connection
    server.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
  } catch (err) {
    logger.error('MongoDB Connection Error:', err);
    process.exit(1);
  }
}

// Log connection events
mongoose.connection.on('connected', () => {
  logger.info('Mongoose connected to DB');
});

mongoose.connection.on('error', (err) => {
  logger.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('Mongoose disconnected from DB');
});

// Handle process termination
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  process.exit(0);
});

// Start the application
connectToDatabase();

// Export app, server, and io if needed by other modules (e.g., tests)
module.exports = { app, server, io };
