const { Server } = require('socket.io');

module.exports = function SocketHandler(req, res) {
  // If socket.io instance doesn't exist already, create a new one
  if (res.socket.server.io) {
    console.log('Socket already running');
    res.end();
    return;
  }

  const io = new Server(res.socket.server, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST'],
    },
  });

  res.socket.server.io = io;

  // Socket.IO connection logic
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join a room based on document ID
    socket.on('join_document', (documentId) => {
      socket.join(documentId);
      console.log(`User ${socket.id} joined document room: ${documentId}`);
    });

    // Handle editor changes
    socket.on('send_changes', (data) => {
      // Broadcast changes to other clients in the same document room
      socket.to(data.documentId).emit('receive_changes', data.editorState);
    });

    // Handle cursor position changes
    socket.on('send_cursor', (data) => {
      socket
        .to(data.documentId)
        .emit('receive_cursor', { userId: socket.id, position: data.position });
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      // Handle cleanup if needed
    });
  });

  console.log('Socket server started');
  res.end();
};
