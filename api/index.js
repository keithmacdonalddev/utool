const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Route files
const authRoutes = require('../server/routes/auth');
const taskRoutes = require('../server/routes/tasks');
const noteRoutesGeneral = require('../server/routes/noteRoutesGeneral');
const kbArticleRoutes = require('../server/routes/kbArticles');
const projectRoutes = require('../server/routes/projects');
const userRoutes = require('../server/routes/users');
const weatherRoutes = require('../server/routes/weather');
const auditLogRoutes = require('../server/routes/auditLogs');
const {
  articleCommentsRouter,
  commentActionsRouter,
} = require('../server/routes/comments');
const personalNotesRouter = require('../server/routes/personalNotes');
const quoteRoutes = require('../server/routes/quotes');
const stockRoutes = require('../server/routes/stocks');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Basic Route - moved to top for visibility
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Simple test route for debugging
app.get('/v1/ping', (req, res) => res.json({ pong: true, time: new Date().toISOString() }));

// Environment variable check route - useful for debugging
// This needs to be before our error handler to ensure it's accessible
app.get('/v1/status', (req, res) => {
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler caught:', err);
  res.status(500).json({
    success: false,
    message: 'Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Mount Routers
app.use('/v1/auth', authRoutes);
app.use('/v1/tasks', taskRoutes);
app.use('/v1/notes', personalNotesRouter);
app.use('/v1/kb', kbArticleRoutes);
app.use('/v1/projects', projectRoutes);
app.use('/v1/users', userRoutes);
app.use('/v1/weather', weatherRoutes);
app.use('/v1/audit-logs', auditLogRoutes);
app.use('/v1/comments', commentActionsRouter);
app.use('/v1/quotes', quoteRoutes);
app.use('/v1/stocks', stockRoutes);

// Admin Notes route
app.use('/admin/notes', (req, res, next) => {
  if (req.method === 'GET') {
    require('../server/controllers/personalNoteController').adminGetAllNotes(
      req,
      res,
      next
    );
  } else {
    res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }
});

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('FATAL ERROR: MONGO_URI is not defined.');
} else {
  // Set more connection options for better reliability
  mongoose
    .connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4, skip trying IPv6
    })
    .then(() => console.log('MongoDB Connected'))
    .catch((err) => {
      console.error('MongoDB Connection Error:', err);
      // Don't crash the server on connection error
      console.error('Connection details:', {
        mongoUri: MONGO_URI
          ? MONGO_URI.substring(0, 20) + '...'
          : 'Not defined',
        hasJwtSecret: Boolean(process.env.JWT_SECRET),
      });
    });
}

// Export the Express API
module.exports = app;
