import io from 'socket.io-client';
import { store } from '../app/store';

// In production, use the Render backend URL
// In development, use the standard backend URL
const isDevelopment = process.env.NODE_ENV === 'development';
const SERVER_URL = isDevelopment
  ? process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000'
  : process.env.REACT_APP_API_URL || 'https://utool.onrender.com'; // Use the correct Render URL

// Create the socket instance
const socket = io(SERVER_URL, {
  autoConnect: false,
  // Add authentication
  auth: {
    // This will be updated before connection
    token: null,
  },
});

// Track last token to avoid duplicate connections
let lastToken = null;

// Update auth token before connecting
const updateAuthToken = () => {
  const state = store.getState();
  const token = state.auth.token;

  if (token && token !== lastToken) {
    socket.auth.token = token;
    lastToken = token;
  }
};

// Connect with auth token
export const connectWithAuth = () => {
  updateAuthToken();

  if (!socket.auth.token) {
    return false;
  }

  // Only connect if not already connected or connecting
  if (!socket.connected && !socket.connecting) {
    socket.connect();
  }

  return true;
};

// Socket event handlers for general connection status
socket.on('connect', () => {
  // Connection established
});

socket.on('disconnect', () => {
  // Disconnected from server
});

socket.on('connect_error', () => {
  // Connection error occurred
});

socket.on('unauthorized', () => {
  // Authorization failed
});

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};

export default socket;
