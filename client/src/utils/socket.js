import io from 'socket.io-client';
import { store } from '../app/store';

// In production, use relative path to work with Vercel rewrites
// In development, use the standard backend URL
const isDevelopment = process.env.NODE_ENV === 'development';
const SERVER_URL = isDevelopment
  ? process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000'
  : process.env.REACT_APP_API_URL || ''; // Empty string means relative path - connects to same origin

/**
 * Socket connection singleton to prevent multiple connections
 * This is the root cause of many redundant API calls in the application
 */
let socketInstance = null;
let lastToken = null;

/**
 * Get the socket instance, creating it only if it doesn't already exist
 * This ensures we maintain a single socket connection across the application
 *
 * @returns {object} Socket.io socket instance
 */
const getSocket = () => {
  if (!socketInstance) {
    // Create the socket instance with connection disabled by default
    socketInstance = io(SERVER_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ['websocket', 'polling'],
    });

    // Set up event handlers
    socketInstance.on('connect', () => {
      console.log('Socket connected:', socketInstance.id);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    socketInstance.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  // Get the current auth token
  const state = store.getState();
  const token = state.auth?.token;

  // If we have a token and it's changed since last connect, update the auth header
  if (token && token !== lastToken) {
    socketInstance.auth = { token };
    lastToken = token;

    // If socket is not connected and we have a token, connect
    if (!socketInstance.connected) {
      socketInstance.connect();
    }
  }

  return socketInstance;
};

/**
 * Connect the socket with the current auth token
 * @returns {object} The socket instance
 */
export const connectSocket = () => {
  const socket = getSocket();

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
};

/**
 * Connect the socket with authentication token from Redux store
 * This is the function imported in App.js
 * @returns {object} The socket instance
 */
export const connectWithAuth = () => {
  const socket = getSocket();

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
};

/**
 * Disconnect the socket
 */
export const disconnectSocket = () => {
  const socket = getSocket();

  if (socket && socket.connected) {
    socket.disconnect();
    lastToken = null;
  }
};

// Export the socket singleton - this is crucial for preventing multiple connections
// Export the getter function instead of the instance directly
// This ensures every import gets the same socket instance
export default getSocket;
