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

// Basic Route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('FATAL ERROR: MONGO_URI is not defined.');
} else {
  mongoose
    .connect(MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch((err) => console.error('MongoDB Connection Error:', err));
}

// Export the Express API
module.exports = app;
