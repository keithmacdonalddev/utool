import io from 'socket.io-client';

// Use environment variable for server URL or default to localhost
const SERVER_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

// Create and export the socket instance
// We initialize it here but connect/disconnect based on component lifecycle or auth state
const socket = io(SERVER_URL, {
  autoConnect: false, // Don't connect automatically
  // Add authentication if needed, e.g., sending JWT token
  // auth: {
  //   token: localStorage.getItem('token') // Example: Get token from local storage
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
