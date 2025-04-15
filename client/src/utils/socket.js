import io from 'socket.io-client';

// In production (Vercel), the socket endpoint is at /api/socket
// In development, use the standard backend URL
const isDevelopment = process.env.NODE_ENV === 'development';
const SERVER_URL = isDevelopment
  ? process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000'
  : window.location.origin;

// Create and export the socket instance
const socket = io(SERVER_URL, {
  autoConnect: false, // Don't connect automatically
  path: isDevelopment ? undefined : '/api/socket',
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
