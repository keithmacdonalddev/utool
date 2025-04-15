const express = require('express');
const mongoose = require('mongoose');
const http = require('http'); // Needed for Socket.IO
const { Server } = require('socket.io'); // Import Socket.IO Server
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app); // Create HTTP server from Express app

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000', // Allow client origin from Vercel
    methods: ['GET', 'POST'],
    credentials: true, // Allow credentials (cookies, authorization headers, etc.)
  },
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

// Middleware
// Enhanced CORS configuration for Vercel frontend
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json());

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
  console.log(`Socket connected: ${socket.id}`);

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
    console.log(`Socket disconnected: ${socket.id}`);
    // Handle cleanup if needed, e.g., leave rooms
  });
});
// --- End Socket.IO Logic ---

// Connect to MongoDB
if (!MONGO_URI) {
  console.error('FATAL ERROR: MONGO_URI is not defined.');
} else {
  mongoose
    .connect(MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch((err) => console.error('MongoDB Connection Error:', err));
}

// Use server.listen (the http server instance) instead of app.listen
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Export app, server, and io if needed by other modules (e.g., tests)
module.exports = { app, server, io };
