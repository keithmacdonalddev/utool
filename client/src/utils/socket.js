import io from 'socket.io-client';
import { store } from '../app/store';

// In production, use the Render backend URL
// In development, use the standard backend URL
const isDevelopment = process.env.NODE_ENV === 'development';
const SERVER_URL = isDevelopment
  ? (process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000')
  : (process.env.REACT_APP_API_URL || 'https://utool.onrender.com'); // Use the correct Render URL

// Create the socket instance
const socket = io(SERVER_URL, {
  autoConnect: false,
  // Add authentication
  auth: {
    // This will be updated before connection
    token: null
  }
});

// Update auth token before connecting
const updateAuthToken = () => {
  const state = store.getState();
  const token = state.auth.token;
  
  if (token) {
    socket.auth.token = token;
    console.log('Auth token set for socket connection');
  } else {
    console.warn('No auth token available for socket connection');
  }
};

// Connect with auth token
export const connectWithAuth = () => {
  updateAuthToken();
  
  if (!socket.auth.token) {
    console.error('Cannot connect socket: No authentication token available');
    return false;
  }
  
  if (!socket.connected) {
    socket.connect();
  }
  
  return true;
};

// Socket event handlers
socket.on('connect', () => {
  console.log('Socket connected:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('Socket disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error);
});

socket.on('unauthorized', (error) => {
  console.error('Socket authorization failed:', error);
});

export default socket;
