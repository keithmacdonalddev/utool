import io from 'socket.io-client';
import { store } from '../app/store';
import { toast } from 'react-toastify';
import { refreshToken, logoutUser } from '../features/auth/authSlice';

// In production, use relative path to work with Vercel rewrites
// In development, use the standard backend URL
const isDevelopment = process.env.NODE_ENV === 'development';
const SERVER_URL = isDevelopment
  ? process.env.REACT_APP_SOCKET_URL || 'http://localhost:5001'
  : ''; // Empty string means relative path - connects to same origin via Vercel rewrites

/**
 * Socket connection singleton to prevent multiple connections
 */
let socketInstance = null;

/**
 * Get or create the raw socket instance without handling connection or authentication
 * @returns {object} Socket.io socket instance (not necessarily connected)
 */
const getRawSocketInstance = () => {
  if (!socketInstance) {
    // Create the socket instance with connection disabled by default
    socketInstance = io(SERVER_URL, {
      autoConnect: false, // IMPORTANT: Connect explicitly
      reconnection: true,
      reconnectionAttempts: 10, // Increased from 5
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000, // Increased from 5000
      timeout: 30000, // Increased from 20000
      transports: ['websocket', 'polling'],
    });

    // Enhanced logging for connection lifecycle events
    socketInstance.on('connect', () => {
      console.log('Socket connected successfully:', socketInstance.id);
      // No toast for successful connection to avoid too many notifications
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('Socket disconnected, reason:', reason);

      // Provide user feedback based on disconnect reason
      if (reason === 'io server disconnect') {
        // The server intentionally disconnected the socket
        // This might happen if auth fails or token expires server-side
        console.warn(
          'Server forcibly disconnected the socket. May need to re-authenticate.'
        );
        toast.error('Server disconnected. Please refresh the page.');
      } else if (reason === 'transport close') {
        // Transport closed (likely network issue)
        console.warn('Socket transport closed. Network issue detected.');
        toast.error('Connection lost. Attempting to reconnect...');
      } else if (reason === 'ping timeout') {
        console.warn('Socket ping timeout. Server may be unresponsive.');
        toast.error('Server not responding. Attempting to reconnect...');
      } else {
        console.warn(`Socket disconnected: ${reason}`);
        toast.error(
          `Connection interrupted: ${reason}. Trying to reconnect...`
        );
      }
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message, error);

      // Provide user feedback based on error type
      if (error.message.includes('xhr poll error')) {
        toast.error('Network error. Please check your connection.');
      } else if (error.message.includes('timeout')) {
        toast.error('Connection timeout. Server may be unavailable.');
      } else if (error.message.includes('auth')) {
        toast.error('Authentication failed. Please log in again.');
      } else {
        toast.error(`Connection error: ${error.message}`);
      }
    });

    socketInstance.on('error', (error) => {
      console.error('Socket general error:', error);
      toast.error(`Socket error: ${error.message || 'Unknown error'}`);
    });
  }
  return socketInstance;
};

/**
 * Connects the socket with the provided authentication token.
 * Ensures only one connection is active and uses the latest token.
 * @param {string} token - The JWT token for authentication.
 * @returns {object} The socket instance.
 */
export const connectSocketWithToken = (token) => {
  const socket = getRawSocketInstance();

  if (!token) {
    console.warn(
      'connectSocketWithToken: No token provided. Disconnecting if connected.'
    );
    if (socket.connected) {
      socket.disconnect();
    }
    return socket; // Return instance, but it won't connect without token
  }

  // If already connected, check if token needs update
  if (socket.connected) {
    if (socket.auth && socket.auth.token !== token) {
      console.log('Socket token changed. Reconnecting with new token...');
      socket.disconnect(); // Disconnect to connect with new token
      socket.auth = { token };
      socket.connect();
    }
    // else token is the same and connected, do nothing
  } else {
    // Not connected, set auth and connect
    socket.auth = { token };
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
  // Get the current auth token from Redux store
  const state = store.getState();
  const token = state.auth?.token;

  // Use the token-based connection function
  return connectSocketWithToken(token);
};

/**
 * Disconnects the socket and clears authentication data.
 */
export const disconnectSocket = () => {
  if (socketInstance) {
    console.log('Disconnecting socket and clearing auth data');
    socketInstance.disconnect();
    socketInstance.auth = null; // Clear auth data to prevent stale tokens
    console.log('Socket disconnected and auth cleared');
  }
};

/**
 * Returns the current socket instance.
 * Does not handle connection or auth, use connectSocketWithToken for that.
 * @returns {object} The socket instance
 */
export const getSocket = () => {
  return getRawSocketInstance();
};

// Default export for backward compatibility
export default getSocket;

// --- Example Usage (Illustrative) ---
// This section demonstrates how 'getSocket' and 'disconnectSocket' might be used
// within a React application, typically managed by a component or a custom hook
// that reacts to the user's authentication state.

/*
import React, { useEffect } from 'react';
import { useSelector } from 'react-redux'; // To access Redux state
// import { selectIsAuthenticated } from './features/auth/authSelectors'; // Example selector

const SocketConnectionManager = () => {
  // Assuming 'state.auth.isAuthenticated' reflects the user's login status.
  const isAuthenticated = useSelector(state => state.auth.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      // User is authenticated, establish or ensure socket connection.
      console.log('User is authenticated. Ensuring socket connection is active.');
      const currentSocket = getSocket(); // Retrieves/creates socket with token from store.

      // Example: Set up listeners for application-specific events.
      // currentSocket.on('important_update', (data) => {
      //   console.log('Received important_update:', data);
      //   // dispatch(handleImportantUpdate(data));
      // });

      // Cleanup function for when the component unmounts or 'isAuthenticated' changes to false.
      return () => {
        // Deciding whether to disconnect here depends on application structure.
        // If this is the sole manager of the socket lifecycle tied to auth,
        // then disconnecting on auth loss or unmount is appropriate.
        // However, if multiple components might use the socket, a more centralized
        // logout process should handle the primary disconnect call.
        console.log('SocketConnectionManager cleanup: Auth status changed or component unmounted.');
        // For a robust logout, ensure disconnectSocket() is called as part of the logout flow.
        // Calling it here ensures cleanup if this component is unmounted while authenticated.
        // disconnectSocket(); // Potentially disconnect here if this component "owns" the connection lifecycle.
      };
    } else {
      // User is not authenticated, ensure any existing socket connection is terminated.
      console.log('User is not authenticated. Ensuring socket is disconnected.');
      disconnectSocket();
    }
  }, [isAuthenticated]); // Effect dependencies: re-run when authentication status changes.

  return null; // This component is for side effects (managing socket) and renders no UI.
};

export default SocketConnectionManager;
*/
// --- End Example Usage ---
