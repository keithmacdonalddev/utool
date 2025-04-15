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
    if (error.response && error.response.status === 401) {
      // Handle 401 Unauthorized (e.g., redirect to login)
      // You might dispatch a logout action here
      // store.dispatch(logoutUser());
      // window.location.href = '/login'; // Or use navigate
    }
    return Promise.reject(error);
  }
);

export default api;
