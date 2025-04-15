import io from 'socket.io-client';

// In production, use the Render backend URL from env variable
// In development, use the standard backend URL
const isDevelopment = process.env.NODE_ENV === 'development';
const SERVER_URL = isDevelopment
  ? process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000'
  : process.env.REACT_APP_API_URL; // Use the same env variable as API

// Create and export the socket instance
const socket = io(SERVER_URL, {
  autoConnect: false, // Don't connect automatically
  // No special path needed with Render (removing the /api/socket path)
  // Add authentication if needed
  // auth: {
  //   token: localStorage.getItem('token')
  // }
});

socket.on('connect', () => {
  console.log('Socket connected:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('Socket disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error);
});

export default socket;
