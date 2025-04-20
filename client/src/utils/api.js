import axios from 'axios';
import { store } from '../app/store'; // Import the Redux store
import { toast } from 'react-toastify';

// Create an instance of axios
const api = axios.create({
  // Set the base URL depending on the environment
  baseURL:
    process.env.REACT_APP_API_URL || // Check for an environment variable first
    (process.env.NODE_ENV === 'production'
      ? 'https://utool.onrender.com/api/v1' // Fallback production URL
      : 'http://localhost:5000/api/v1'), // Fallback development URL
  headers: {
    'Content-Type': 'application/json',
  },
});

// Function to handle displaying notifications from server responses
const handleServerNotification = (response) => {
  // Check if the response contains a message and notification type
  if (
    response.data &&
    response.data.message &&
    response.data.notificationType
  ) {
    const { message, notificationType } = response.data;

    // Use toast directly for simple server notifications
    // For more complex notifications with pin/close buttons,
    // you should use the NotificationContext's showNotification
    toast[notificationType || 'info'](message, {
      position: 'top-right',
      autoClose: 5000,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  }
};

// Add a request interceptor to include the token in headers
api.interceptors.request.use(
  (config) => {
    // Get token from Redux state
    const token = store.getState().auth.token;

    if (token) {
      // Add Authorization header if token exists
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    // Do something with request error
    return Promise.reject(error);
  }
);

// Add a response interceptor for handling global errors (e.g., 401 Unauthorized)
api.interceptors.response.use(
  (response) => {
    // Handle success notifications
    handleServerNotification(response);
    return response;
  },
  (error) => {
    // Handle error notifications
    if (error.response && error.response.data) {
      handleServerNotification(error.response);
    }

    // Handle 401 Unauthorized errors (expired tokens, invalid credentials)
    if (error.response && error.response.status === 401) {
      // Check if we're already on the login page to prevent redirect loops
      if (!window.location.pathname.includes('/login')) {
        console.log('Authentication error detected, redirecting to login');

        // Clear authentication data from localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        // Redirect to login page
        setTimeout(() => {
          window.location.href = '/login?session=expired';
        }, 100);
      }
    }

    // Handle 403 Forbidden errors (permission issues)
    if (error.response && error.response.status === 403) {
      console.log('Permission denied:', error.response.data.message);

      // Prevent redirect loops
      if (!window.location.pathname.includes('/unauthorized')) {
        // Redirect to unauthorized page
        setTimeout(() => {
          window.location.href = '/unauthorized';
        }, 100);
      }
    }

    // Always reject the promise so components can still handle errors
    return Promise.reject(error);
  }
);

export default api;
