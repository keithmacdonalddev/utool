// store.js - Redux Store Configuration
//
// KEY CONCEPTS:
// 1. Central State Management: Single source of truth for application state
// 2. Redux Toolkit Patterns: Modern Redux with simplified configuration
// 3. Slice Architecture: Feature-based state organization with automatic action creators
// 4. Redux Middleware: Enhances Redux with async logic capabilities
// 5. DevTools Integration: Powerful debugging with time-travel capability
//
// This file configures the Redux store which serves as the central state container
// for the entire application. Redux follows a unidirectional data flow pattern:
// View -> Action -> Reducer -> Store -> View
//
// Redux Toolkit simplifies the Redux setup by:
// - Providing configureStore which automatically sets up the store with good defaults
// - Including Redux Thunk for handling async logic
// - Setting up Redux DevTools Extension for development
// - Including utilities to simplify reducer logic and immutable updates

import { configureStore } from '@reduxjs/toolkit';

/*
┌─────────────────────────────────────────────────────────────┐
│ REDUX STORE ARCHITECTURE EDUCATIONAL GUIDE                  │
│                                                             │
│ Redux implements a predictable state container with a       │
│ unidirectional data flow following these principles:        │
│                                                             │
│ 1. SINGLE SOURCE OF TRUTH                                   │
│    - The entire application state lives in one store        │
│    - Makes state predictable and easier to debug            │
│    - Facilitates persistence and state hydration            │
│                                                             │
│ 2. STATE IS READ-ONLY                                       │
│    - State can only be changed by dispatching actions       │
│    - Actions are plain objects describing what happened     │
│    - Ensures consistent behavior across environments        │
│                                                             │
│ 3. CHANGES MADE WITH PURE REDUCERS                          │
│    - Reducers are pure functions: (state, action) => state  │
│    - No side effects in reducers (API calls, etc.)          │
│    - Enables time-travel debugging and predictability       │
│                                                             │
│ 4. REDUX TOOLKIT ENHANCEMENTS                               │
│    - Simplified redux setup with configureStore             │
│    - Automatic DevTools configuration                       │
│    - Built-in immutability with Immer                       │
│    - Simplified reducer logic with createSlice              │
└─────────────────────────────────────────────────────────────┘
*/

/**
 * REDUX ARCHITECTURE
 *
 * Redux follows a unidirectional data flow pattern:
 * 1. UI triggers action creators
 * 2. Actions are dispatched to the store
 * 3. Reducers process actions and update state
 * 4. Components receive state updates via selectors
 *
 * This store.js file is the central configuration point for Redux in the app.
 */

/**
 * FEATURE-BASED ORGANIZATION
 *
 * We import reducers from feature folders, following a domain-driven design approach.
 * Each feature slice encapsulates related state, actions, and selectors.
 * This organization makes the codebase more maintainable as it scales.
 */
import authReducer from '../features/auth/authSlice';
import taskReducer from '../features/tasks/taskSlice';
import noteReducer from '../features/notes/noteSlice';
import kbReducer from '../features/kb/kbSlice';
import projectReducer from '../features/projects/projectSlice';
import projectNoteReducer from '../features/projectNotes/projectNoteSlice';
import friendReducer from '../features/friends/friendSlice';
import auditLogsReducer from '../features/auditLogs/auditLogsSlice';
import bookmarkReducer from '../features/bookmarks/bookmarkSlice';
import bookmarkFolderReducer from '../features/bookmarks/bookmarkFolderSlice';
import snippetReducer from '../features/snippets/snippetSlice';

/**
 * STORE CONFIGURATION
 *
 * The configureStore function from Redux Toolkit:
 * - Automatically sets up the Redux DevTools
 * - Includes thunk middleware by default for async actions
 * - Combines reducers into the root reducer
 * - Applies middleware in the correct order
 */
export const store = configureStore({
  /**
   * REDUCER COMPOSITION PATTERN
   *
   * Each reducer manages a specific slice of the application state.
   * The keys in this object become the top-level state properties.
   *
   * For example, state.auth will contain all authentication state,
   * managed by the authReducer.
   */
  reducer: {
    auth: authReducer, // Authentication state (user, tokens, login status)
    tasks: taskReducer, // Task management state (tasks list, active task, etc)
    notes: noteReducer, // Notes state (notes list, active note, etc)
    kb: kbReducer, // Knowledge base articles state
    projects: projectReducer, // Project management state
    projectNotes: projectNoteReducer, // Project notes state
    friends: friendReducer, // Friends and social features state
    auditLogs: auditLogsReducer, // Audit logs for system activities
    bookmarks: bookmarkReducer, // Bookmarks state
    bookmarkFolders: bookmarkFolderReducer, // Bookmark folders state
    snippets: snippetReducer, // Code/text snippets state
  },

  /**
   * PERFORMANCE OPTIMIZATION OPTIONS
   *
   * Additional configuration options can be added here:
   * - middleware: Customize middleware beyond the defaults
   * - devTools: Control DevTools integration (enabled by default)
   * - preloadedState: Initialize state (useful for SSR or testing)
   * - enhancers: Add custom store enhancers
   */
  // devTools: process.env.NODE_ENV !== 'production', // Enable DevTools only in development
});

export default store;
