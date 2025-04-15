const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Import models and utils
const User = require('./models/User');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with auth middleware
const io = new Server(server, {
  cors: {
    origin: [process.env.FRONTEND_URL, 'http://localhost:3000', 'https://utool-xi.vercel.app'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Socket authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return next(new Error('User not found'));
    }
    
    // Attach user to socket request
    socket.request.user = user;
    next();
  } catch (error) {
    logger.error('Socket authentication error:', error.message);
    return next(new Error('Authentication error'));
  }
});

// Initialize the logger with Socket.IO
logger.initLogger(io);

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
  logger.info(`${req.method} ${req.originalUrl}`, { 
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  
  // Log response completion
  res.on('finish', () => {
    const logLevel = res.statusCode >= 400 ? 'error' : 'info';
    const logMethod = logLevel === 'error' ? logger.error : logger.info;
    
    logMethod(`Response ${res.statusCode} for ${req.method} ${req.originalUrl}`, {
      statusCode: res.statusCode,
      responseTime: Date.now() - req._startTime,
      contentLength: res.get('Content-Length')
    });
  });
  
  req._startTime = Date.now();
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

// Mount the article-specific comments router under the KB route
// This needs to be done carefully. We can re-require kbArticleRoutes or modify how it's structured.
// Let's modify kbArticleRoutes to handle mounting its sub-router.


// Basic Route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// --- Socket.IO Connection Logic ---
io.on('connection', (socket) => {
  const user = socket.request.user;
  logger.info(`Socket connected: ${socket.id}`, { 
    userId: user ? user._id : 'unauthenticated',
    userName: user ? user.name : 'unknown',
    userRole: user ? user.role : 'none'
  });

  // Admin log streaming
  socket.on('join-admin-logs', () => {
    // Verify admin privileges before allowing join
    if (socket.request.user && socket.request.user.role.toLowerCase() === 'admin') {
      socket.join('admin-logs');
      logger.info(`Admin user joined admin-logs room: ${socket.id}`, {
        userId: socket.request.user._id,
        userName: socket.request.user.name
      });
      
      // Send recent logs history to the newly joined admin
      socket.emit('logs-history', logger.getRecentLogs());
    } else {
      logger.warn(`Unauthorized attempt to join admin-logs room: ${socket.id}`);
      socket.emit('unauthorized', { message: 'Admin privileges required to access logs' });
    }
  });

  // Example: Join a room based on document ID
  socket.on('join_document', (documentId) => {
    socket.join(documentId);
    console.log(`User ${socket.id} joined document room: ${documentId}`);
  });

  // Example: Handle editor changes
  socket.on('send_changes', (data) => {
    // Broadcast changes to other clients in the same document room
    socket.to(data.documentId).emit('receive_changes', data.editorState);
    // console.log(`Changes sent by ${socket.id} for doc ${data.documentId}`); // Log less frequently
  });

  // Example: Handle cursor position changes (optional)
  socket.on('send_cursor', (data) => {
    socket
      .to(data.documentId)
      .emit('receive_cursor', { userId: socket.id, position: data.position });
  });

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
    // Handle cleanup if needed, e.g., leave rooms
  });
});
// --- End Socket.IO Logic ---

// Connect to MongoDB
if (!MONGO_URI) {
  logger.error('FATAL ERROR: MONGO_URI is not defined.');
} else {
  mongoose
    .connect(MONGO_URI)
    .then(() => logger.info('MongoDB Connected'))
    .catch((err) => logger.error('MongoDB Connection Error:', err));
}

// Use server.listen (the http server instance) instead of app.listen
server.listen(PORT, () => logger.info(`Server running on port ${PORT}`));

// Export app, server, and io if needed by other modules (e.g., tests)
module.exports = { app, server, io };
