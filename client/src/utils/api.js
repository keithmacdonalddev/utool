import axios from 'axios';
import { store } from '../app/store'; // Import the Redux store

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
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized errors (expired tokens, invalid credentials)
    if (error.response && error.response.status === 401) {
      // Check if we're already on the login page to prevent redirect loops
      if (!window.location.pathname.includes('/login')) {
        console.log('Authentication error detected, redirecting to login');

        // Clear authentication data from localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        // Dispatch logout action if Redux store is available
        // This is commented out as it would require importing the store
        // and might cause circular dependencies
        // You can implement a better pattern if needed
        // store.dispatch(logoutUser());

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
