// filepath: server/utils/socketManager.js
const jwt = require('jsonwebtoken');

// Socket.io middleware for authentication
const authenticateSocket = (socket, next) => {
  // Get token from handshake query
  const token = socket.handshake.auth.token || socket.handshake.query.token;

  if (!token) {
    return next(new Error('Authentication error: Token not provided'));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Store user info in socket object
    socket.user = decoded;

    next();
  } catch (err) {
    console.error('Socket authentication failed:', err.message);
    next(new Error('Authentication error: Invalid token'));
  }
};

// Socket.io handler for connection
const handleConnection = (io, socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Handle document collaboration
  socket.on('join_document', (documentId) => {
    socket.join(documentId);
    console.log(`User joined document: ${documentId}`);
  });

  socket.on('send_changes', (data) => {
    if (data && data.documentId) {
      socket.to(data.documentId).emit('receive_changes', data.editorState);
    }
  });

  // Clean up on disconnect
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
};

// Empty function to maintain compatibility with existing code
const broadcastLogEntry = () => {
  // This function intentionally left empty as client-side logging is removed
};

module.exports = {
  authenticateSocket,
  handleConnection,
  broadcastLogEntry,
};
