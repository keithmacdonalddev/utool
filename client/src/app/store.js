import { configureStore } from '@reduxjs/toolkit';
// Import reducers here
import authReducer from '../features/auth/authSlice';
import taskReducer from '../features/tasks/taskSlice';
import noteReducer from '../features/notes/noteSlice';
import kbReducer from '../features/kb/kbSlice';
import projectReducer from '../features/projects/projectSlice'; // Import the project reducer

export const store = configureStore({
  reducer: {
    // Add reducers here
    auth: authReducer,
    tasks: taskReducer,
    notes: noteReducer,
    kb: kbReducer,
    projects: projectReducer, // Add the project reducer to the store
  },
  // Middleware can be added here if needed (e.g., for async actions)
  // devTools: process.env.NODE_ENV !== 'production', // Enable DevTools only in development
});

export default store;
