import axios from 'axios';
import { store } from '../app/store'; // Import the Redux store

// Create an instance of axios
const api = axios.create({
  // Set the base URL depending on the environment
  baseURL:
    process.env.NODE_ENV === 'production'
      ? `${window.location.origin}/api/v1` // In production, use the relative path
      : 'http://localhost:5000/api/v1', // Point directly to backend server in development
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
