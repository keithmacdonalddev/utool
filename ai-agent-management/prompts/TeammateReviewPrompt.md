**Prompt for React & Socket.io Expert AI Teammate**

**Context:**
We are experiencing persistent issues with our `socket.io-client` integration in a React application, primarily due to React StrictMode's double invocation of `useEffect` in development. This is causing race conditions and errors during socket connection and disconnection.

**Problem:**
The main issues observed in console logs are:

1.  `WARN: getSocketInstance called when socket is null and not connecting.` (from components trying to use the socket too early)
2.  `WebSocket connection ... failed: WebSocket is closed before the connection is established.` (indicates disconnect is called before connect handshake completes)
3.  `Uncaught (in promise) Error: Connection already in progress` (from our `socket.js` module when `connectSocket` is called rapidly).

The socket connection is initiated in `App.js`'s `useEffect`. A simplified version of the `App.js` `useEffect` is:

```javascript
// Simplified App.js useEffect
useEffect(() => {
  // Logic to manage connection based on isAuthenticated and token
  if (isAuthenticated) {
    connectSocket(token)
      .then(() => logger.app('App.js: Socket connected successfully.'))
      .catch((error) =>
        logger.error('App.js: Socket connection failed:', error)
      );
  }
  return () => {
    if (isAuthenticated) {
      disconnectSocket();
    }
  };
}, [isAuthenticated, token, dispatch]);
```

Our `socket.js` module has `connectSocket` and `disconnectSocket` functions. `connectSocket` uses an `isConnecting` flag and returns a promise.

**Conceptual `socket.js` Snippets:**

```javascript
// client/src/utils/socket.js (Conceptual)
let socket = null;
let isConnecting = false;
let connectPromise = null;

export const connectSocket = (token) => {
  if (isConnecting) {
    // Currently rejects if isConnecting is true, leading to "Connection already in progress"
    return (
      connectPromise ||
      Promise.reject(new Error('Connection already in progress'))
    );
  }
  isConnecting = true;
  connectPromise = new Promise((resolve, reject) => {
    // ... socket initialization, connection logic, event handlers ...
    // On successful connection: isConnecting = false; resolve();
    // On error: isConnecting = false; reject();
  });
  return connectPromise;
};

export const disconnectSocket = () => {
  // Needs to gracefully handle disconnects called while a connection is in progress.
  // Resetting isConnecting here might be problematic.
  if (socket) {
    socket.disconnect();
  }
  isConnecting = false; // Resetting flags
  connectPromise = null; // Resetting promise
};
```

**Request:**

1.  Please review the described problem and the conceptual approach.
2.  Provide a robust strategy to handle socket connections/disconnections within `App.js`'s `useEffect` that is safe for React StrictMode.
3.  Suggest improvements to `socket.js`'s `connectSocket` and `disconnectSocket` for resilience against rapid invocation cycles and correct state management (especially `isConnecting`, `socket` instance, and promise handling).
4.  How can `disconnectSocket` effectively cancel an in-progress connection attempt by `connectSocket` without causing "WebSocket is closed before the connection is established"?
5.  What's the best way to manage `connectPromise` in `socket.js` for predictable behavior with concurrent calls?

**Full Code for Context:**

**`client/src/App.js`:**

```javascript
// filepath: c:\\Users\\macdo\\Documents\\Cline\\utool\\client\\src\\App.js
// App.js - Main entry point for the React application
// This file defines the application\'s routing structure and global providers

import React, { Suspense, lazy, useEffect, useMemo } from \'react\'; // React core and hooks
import { NotificationProvider } from \'./context/NotificationContext\'; // Custom notification context
import { useDispatch, useSelector } from \'react-redux\'; // Redux hooks for state management
import { connectSocket, disconnectSocket } from \'./utils/socket\'; // Socket.IO connection utilities // connectSocketWithToken renamed to connectSocket
import {
  BrowserRouter as Router, // Client-side router implementation
  Routes, // Container for all routes
  Route, // Individual route definition
  Navigate, // Component for redirecting
  useParams,
} from \'react-router-dom\';
import { ToastContainer } from \'react-toastify\'; // Toast notification system
import \'react-toastify/dist/ReactToastify.css\'; // Styles for toast notifications

import ProtectedRoute from \'./components/ProtectedRoute\'; // Custom route guard component
import MainLayout from \'./components/layout/MainLayout\'; // Layout wrapper with sidebar and header
import ErrorBoundary from \'./components/ErrorBoundary\'; // Import the ErrorBoundary
import \'./App.css\'; // Global application styles

// Redirect component removed - direct navigation to project details eliminates unmount/remount cycle

// Lazy-loaded components using code splitting
// This improves initial load performance by only loading components when needed
// Each import() returns a Promise that resolves to the component module
const LoginPage = lazy(() => import(\'./pages/LoginPage\'));
const RegisterPage = lazy(() => import(\'./pages/RegisterPage\'));
const VerifyEmailPage = lazy(() => import(\'./pages/VerifyEmailPage\'));
const DashboardPage = lazy(() => import(\'./pages/DashboardPage\'));
const ProjectListPage = lazy(() => import(\'./pages/ProjectListPage\'));
const ProjectDashboard = lazy(() =>
  import(\'./pages/projects/ProjectDashboard\')
); // Milestone 1: Enhanced Project Dashboard
const ProjectCreatePage = lazy(() => import(\'./pages/ProjectCreatePage\'));
const ProjectDetailsPage = lazy(() => import(\'./pages/ProjectDetailsPage\'));
const ProjectEditPage = lazy(() => import(\'./pages/ProjectEditPage\'));
const KbListPage = lazy(() => import(\'./pages/KbListPage\'));
const KbCreatePage = lazy(() => import(\'./pages/KbCreatePage\'));
const KbDetailsPage = lazy(() => import(\'./pages/KbDetailsPage\'));
const KbEditPage = lazy(() => import(\'./pages/KbEditPage\'));
const KbVersionHistoryPage = lazy(() => import(\'./pages/KbVersionHistoryPage\'));
const ProfilePage = lazy(() => import(\'./pages/ProfilePage\'));
const FavoriteQuotesPage = lazy(() => import(\'./pages/FavoriteQuotesPage\'));
// Task pages removed - tasks are now only accessible within projects
// const TasksPage = lazy(() => import(\'./pages/TasksPage\'));
// const TaskDetailsPage = lazy(() => import(\'./pages/TaskDetailsPage\'));
const FriendsPage = lazy(() => import(\'./pages/FriendsPage\'));
// Notes Feature
const NotesPage = lazy(() => import(\'./pages/NotesPage\'));
const TrashPage = lazy(() => import(\'./pages/TrashPage\'));
const ResourcesPage = lazy(() => import(\'./pages/ResourcesPage\')); // <-- Add resources page
const ArchivePage = lazy(() => import(\'./pages/ArchivePage\')); // <-- Add Archive page
// Admin Pages
const AdminUserListPage = lazy(() => import(\'./pages/admin/UserListPage\'));
const AdminUserEditPage = lazy(() => import(\'./pages/admin/UserEditPage\'));
const AdminSettingsPage = lazy(() => import(\'./pages/admin/AdminSettingsPage\'));
const GuestAnalyticsPage = lazy(() =>
  import(\'./pages/admin/GuestAnalyticsPage\')
);
const AuditLogsPage = lazy(() => import(\'./pages/AuditLogsPage\'));
const AdminDashboardPage = lazy(() =>
  import(\'./pages/admin/AdminDashboardPage\')
); // New admin dashboard
const AnalyticsPage = lazy(() => import(\'./pages/admin/AnalyticsPage\')); // Enhanced analytics page
const PublicSettingsPage = lazy(() =>
  import(\'./pages/admin/PublicSettingsPage\')
); // Public settings management
const SystemHealthPage = lazy(() => import(\'./pages/admin/SystemHealthPage\')); // System health monitoring
const BatchOperationsPage = lazy(() =>
  import(\'./pages/admin/BatchOperationsPage\')
); // Batch operations and maintenance tools
const RoleManagementPage = lazy(() =>
  import(\'./pages/admin/RoleManagementPage\')
); // Role management and permissions
const ReportingPage = lazy(() => import(\'./pages/admin/ReportingPage\')); // Reporting & Audit - Milestone 6
const ComingSoonPage = lazy(() => import(\'./components/admin/ComingSoonPage\')); // Coming soon component for future features
const UnauthorizedPage = lazy(() => import(\'./pages/UnauthorizedPage\'));
const NotFoundPage = lazy(() => import(\'./pages/NotFoundPage\'));

// Custom redirect component for favorite quotes with state to set active tab
/**
 * QuotesRedirect Component
 *
 * A special redirect component that navigates to the Resources page
 * with a state parameter that indicates the quotes tab should be active.
 * This provides a seamless UX transition from the old route to the new location.
 *
 * @returns {React.ReactElement} Navigate component with state for tab selection
 */
const QuotesRedirect = () => (
  <Navigate replace to="/resources" state={{ activeTab: \'quotes\' }} />
);

function App() {
  // Memoized selector to prevent Redux rerender warnings
  const selectAuth = useMemo(() => (state) => state.auth, []);

  // Extract user authentication state from Redux store
  // This is used to determine if socket connection should be established
  const { user, token } = useSelector(selectAuth);

  // useEffect hook to manage socket connection based on authentication state
  // This ensures real-time features only work when the user is logged in
  useEffect(() => {
    if (token) {
      // Connect to socket with authentication token when user is logged in
      connectSocket(token); // connectSocketWithToken renamed to connectSocket
    } else {
      // Disconnect socket when no token is present (logged out)
      disconnectSocket();
    }

    // Clean up function runs when component unmounts
    // Ensures socket is properly disconnected when leaving the application
    return () => {
      disconnectSocket();
    };
  }, [token]); // Only re-run effect when token changes

  return (
    // NotificationProvider makes notifications available throughout the app
    <NotificationProvider>
      {/* Router provides navigation capabilities to the entire app */}
      <Router>
        {/* Wrap the core application structure with ErrorBoundary */}
        <ErrorBoundary>
          <div className="App">
            {/* ToastContainer handles display of toast notifications */}
            {/* Configuration options determine appearance and behavior */}
            <ToastContainer
              position="top-right" // Location on screen
              autoClose={5000} // Close after 5 seconds
              hideProgressBar={false} // Show countdown bar
              newestOnTop={false} // Stack order
              closeOnClick // Close when clicked
              rtl={false} // Left-to-right text
              pauseOnFocusLoss // Pause countdown when window loses focus
              draggable // Allow user to drag notifications
              pauseOnHover // Pause countdown when hovering
              theme="dark" // Visual theme
            />

            {/* Suspense shows a fallback UI while lazy-loaded components are loading */}
            <Suspense
              fallback={
                <div
                  role="status"
                  aria-live="polite"
                  style={{
                    textAlign: \'center\',
                    padding: \'20px\',
                    color: \'white\',
                  }}
                >
                  Loading page content...
                </div>
              }
            >
              {/* Routes defines all application routes */}
              <Routes>
                {/* Public Routes - accessible without authentication */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route
                  path="/verify-email/:token" // Route with URL parameter
                  element={<VerifyEmailPage />}
                />

                {/* Protected Routes - require authentication */}
                {/* ProtectedRoute component checks user role before rendering */}
                <Route
                  element={
                    <ProtectedRoute
                      allowedRoles={[
                        \'Regular User\',
                        \'Pro User\',
                        \'Admin\',
                        \'Guest\',
                      ]} // Allow guests to access dashboard
                    />
                  }
                >
                  {/* MainLayout provides common structure (sidebar, header, etc.) */}
                  <Route element={<MainLayout />}>
                    {/* Dashboard and main feature routes */}
                    <Route path="/dashboard" element={<DashboardPage />} />
                    {/* Project management routes */}
                    <Route
                      path="/projects/dashboard"
                      element={<ProjectDashboard />}
                    />
                    <Route
                      path="/projects/new"
                      element={<ProjectCreatePage />}
                    />
                    <Route
                      path="/projects/:id" // This is now the single source of truth for project details
                      element={<ProjectDetailsPage />}
                    />
                    {/* Redirect /projects to enhanced dashboard */}
                    <Route
                      path="/projects"
                      element={<Navigate to="/projects/dashboard" replace />}
                    />
                    <Route
                      path="/projects/:id/edit"
                      element={<ProjectEditPage />}
                    />
                    {/* Knowledge Base routes */}
                    <Route path="/kb/new" element={<KbCreatePage />} />
                    <Route path="/kb" element={<KbListPage />} />
                    <Route path="/kb/:id" element={<KbDetailsPage />} />
                    <Route path="/kb/:id/edit" element={<KbEditPage />} />
                    <Route
                      path="/kb/:id/versions"
                      element={<KbVersionHistoryPage />}
                    />
                    <Route path="/resources" element={<ResourcesPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/notes" element={<NotesPage />} />
                    <Route path="/notes/trash" element={<TrashPage />} />
                    <Route path="/archive" element={<ArchivePage />} />
                    {/* Standalone task routes removed - tasks are only accessible through projects */}
                    {/* <Route path="/tasks" element={<TasksPage />} /> */}
                    {/* <Route path="/tasks/:id" element={<TaskDetailsPage />} /> */}
                    {/* Redirect old favorite-quotes page to resources with quotes tab active */}
                    <Route
                      path="/favorite-quotes"
                      element={<QuotesRedirect />}
                    />
                    <Route path="/friends" element={<FriendsPage />} />
                    {/* Admin Only Routes - nested protected route */}
                    {/* Additional role check for admin-specific functionality */}{\' \'}\
                    <Route
                      element={<ProtectedRoute allowedRoles={[\'Admin\']} />}
                    >
                      {/* Main admin dashboard and redirect */}
                      <Route
                        path="/admin"
                        element={<Navigate to="/admin/dashboard" replace />}
                      />
                      <Route
                        path="/admin/dashboard"
                        element={<AdminDashboardPage />}
                      />
                      {/* Existing admin routes */}
                      <Route
                        path="/admin/users"
                        element={<AdminUserListPage />}
                      />
                      <Route
                        path="/admin/users/:id/edit"
                        element={<AdminUserEditPage />}
                      />
                      <Route
                        path="/admin/audit-logs"
                        element={<AuditLogsPage />}
                      />{\' \'}\
                      <Route
                        path="/admin/settings"
                        element={<AdminSettingsPage />}
                      />
                      <Route
                        path="/admin/analytics/guest"
                        element={<GuestAnalyticsPage />}
                      />
                      {/* New routes with placeholder pages */}
                      <Route
                        path="/admin/roles"
                        element={<RoleManagementPage />}
                      />
                      <Route
                        path="/admin/system-health"
                        element={<SystemHealthPage />}
                      />
                      <Route
                        path="/admin/analytics"
                        element={<AnalyticsPage />}
                      />
                      <Route
                        path="/admin/public-settings"
                        element={<PublicSettingsPage />}
                      />
                      <Route
                        path="/admin/batch-operations"
                        element={<BatchOperationsPage />}
                      />
                      <Route
                        path="/admin/reporting"
                        element={<ReportingPage />}
                      />
                      <Route
                        path="/admin/maintenance"
                        element={
                          <ComingSoonPage
                            title="Advanced Maintenance"
                            features={[
                              \'Scheduled maintenance windows\',
                              \'Automated backup management\',
                              \'Data integrity checks\',
                              \'Performance optimization routines\',
                            ]}
                          />
                        }
                      />
                      <Route
                        path="/admin/feature-flags"
                        element={
                          <ComingSoonPage
                            title="Feature Flag Management"
                            features={[
                              \'Toggle features on/off\',
                              \'Percentage-based rollouts\',
                              \'User segmentation for flags\',
                            ]}
                          />
                        }
                      />
                      <Route
                        path="/admin/api-monitoring"
                        element={
                          <ComingSoonPage
                            title="API Monitoring & Rate Limiting"
                            features={[
                              \'Real-time API traffic dashboard\',
                              \'Error rate tracking\',
                              \'Configure rate limits per endpoint/user\',
                            ]}
                          />
                        }
                      />
                      <Route
                        path="/admin/content-moderation"
                        element={
                          <ComingSoonPage
                            title="Content Moderation Tools"
                            features={[
                              \'Review queues for user-generated content\',
                              \'Automated flagging systems\',
                              \'Moderator action logging\',
                            ]}
                          />
                        }
                      />
                      <Route
                        path="/admin/localization"
                        element={
                          <ComingSoonPage
                            title="Localization & i18n Management"
                            features={[
                              \'Manage translation strings\',
                              \'Language pack uploads\',
                              \'Locale-specific configurations\',
                            ]}
                          />
                        }
                      />
                      <Route
                        path="/admin/security"
                        element={
                          <ComingSoonPage
                            title="Security & Compliance Center"
                            features={[
                              \'Security audit logs\',
                              \'Compliance reporting (e.g., GDPR, CCPA)\',
                              \'Vulnerability scan summaries\',
                            ]}
                          />
                        }
                      />
                    </Route>
                  </Route>
                </Route>

                {/* Catch-all for unauthorized access */}
                <Route path="/unauthorized" element={<UnauthorizedPage />} />
                {/* Catch-all for 404 Not Found */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </div>
        </ErrorBoundary>
      </Router>
    </NotificationProvider>
  );
}

export default App;

```

**`client/src/utils/socket.js`:**

```javascript
// filepath: c:\\Users\\macdo\\Documents\\Cline\\utool\\client\\src\\utils\\socket.js
/**
 * Enhanced Socket.IO Client Utilities with Advanced Error Handling
 *
 * Enhanced Features (Based on Proactive Review):
 * - Connection state observability with event system
 * - Comprehensive retry logic with exponential backoff
 * - Client-side diagnostic logging
 * - Connection health monitoring with heartbeat
 * - Enhanced cleanup and memory leak prevention
 * - Robust error handling and recovery
 */

import { io } from \'socket.io-client\';
import { store } from \'../app/store\'; // Added for Redux access
import { toast } from \'react-toastify\';
import { refreshToken, logoutUser } from \'../features/auth/authSlice\'; // Added for auth actions
import { createComponentLogger } from \'./logger\';

// In production, use relative path to work with Vercel rewrites
// In development, use the standard backend URL
const isDevelopment = process.env.NODE_ENV === \'development\';
const SERVER_URL = isDevelopment
  ? process.env.REACT_APP_SERVER_URL || \'http://localhost:5000\' // Standardized to 5000
  : \'\'; // Empty string means relative path - connects to same origin via Vercel rewrites

/**
 * Socket connection singleton to prevent multiple connections
 */
let socketInstance = null;

// Connection state management
let socket = null;
let isConnecting = false; // Flag to track connection status
let reconnectAttempts = 0;
let maxReconnectAttempts = 10;
let reconnectDelay = 1000; // Start with 1 second
let maxReconnectDelay = 30000; // Cap at 30 seconds
let connectionTimeout = 15000; // 15 seconds
let heartbeatInterval = null;
let connectionStateListeners = new Map();
let projectPresenceCallbacks = new Map();
let isAuthenticated = false;
let currentProjectId = null;
let currentToken = null;
let isSocketTokenRefreshing = false; // Added: Flag to prevent multiple token refresh attempts for socket
let connectionMetrics = {
  connectedAt: null,
  disconnectedAt: null,
  reconnectCount: 0,
  totalDowntime: 0,
  lastError: null,
  healthChecks: {
    successful: 0,
    failed: 0,
    lastCheck: null,
  },
};

// Enhanced logging system using shared logger
const logger = createComponentLogger(\'Socket\');

/**
 * Returns the current socket instance.
 * @returns {SocketIOClient.Socket | null} The socket instance or null.
 */
const getSocketInstance = () => {
  if (!socket && !isConnecting) {
    // This case might happen if getSocketInstance is called before connectSocket
    // or after cleanupSocket. It\'s important not to trigger a new connection here
    // as connectSocket is explicitly called with a token.
    logger.warn(
      \'getSocketInstance called when socket is null and not connecting. Ensure connectSocket is called first.\'
    );
  }
  return socket;
};

/**
 * Connection state management and event system
 */
const ConnectionState = {
  DISCONNECTED: \'DISCONNECTED\',
  CONNECTING: \'CONNECTING\',
  CONNECTED: \'CONNECTED\',
  AUTHENTICATED: \'AUTHENTICATED\',
  RECONNECTING: \'RECONNECTING\',
  ERROR: \'ERROR\',
};

let currentConnectionState = ConnectionState.DISCONNECTED;

const setConnectionState = (newState, error = null) => {
  const previousState = currentConnectionState;
  currentConnectionState = newState;

  const stateData = {
    state: newState,
    previousState,
    timestamp: new Date().toISOString(),
    error,
    socketId: socket?.id,
    projectId: currentProjectId,
    reconnectAttempts,
    isAuthenticated,
  };

  logger.info(
    `Connection state changed: ${previousState} -> ${newState}`,
    stateData
  );

  // Notify all listeners
  connectionStateListeners.forEach((callback, listenerId) => {
    try {
      callback(stateData);
    } catch (error) {
      logger.error(`Error in connection state listener ${listenerId}`, {
        error: error.message,
        stack: error.stack,
        listenerId,
      });
    }
  });

  // Update connection metrics
  if (
    newState === ConnectionState.CONNECTED &&
    previousState !== ConnectionState.CONNECTED
  ) {
    connectionMetrics.connectedAt = Date.now();
    if (connectionMetrics.disconnectedAt) {
      connectionMetrics.totalDowntime +=
        connectionMetrics.connectedAt - connectionMetrics.disconnectedAt;
    }
  } else if (
    newState === ConnectionState.DISCONNECTED &&
    previousState === ConnectionState.CONNECTED
  ) {
    connectionMetrics.disconnectedAt = Date.now();
  }

  if (newState === ConnectionState.RECONNECTING) {
    connectionMetrics.reconnectCount++;
  }

  if (error) {
    connectionMetrics.lastError = {
      message: error.message || error,
      timestamp: new Date().toISOString(),
      state: newState,
    };
  }
};

/**
 * Enhanced connection health monitoring
 */
const startHealthCheck = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  heartbeatInterval = setInterval(() => {
    if (!socket || !socket.connected) {
      connectionMetrics.healthChecks.failed++;
      logger.warn(\'Health check failed: Socket not connected\', {
        socketConnected: socket?.connected,
        socketId: socket?.id,
        currentState: currentConnectionState,
      });
      return;
    }

    const pingStartTime = Date.now();

    socket.emit(\'ping\', { timestamp: pingStartTime }, (response) => {
      const pingDuration = Date.now() - pingStartTime;

      if (response && response.timestamp) {
        connectionMetrics.healthChecks.successful++;
        connectionMetrics.healthChecks.lastCheck = Date.now();

        logger.debug(\'Health check successful\', {
          pingDuration,
          serverTimestamp: response.timestamp,
          clockDrift: pingStartTime - response.timestamp,
        });
      } else {
        connectionMetrics.healthChecks.failed++;
        logger.warn(\'Health check failed: Invalid response\', {
          response,
          pingDuration,
        });
      }
    });

    // Timeout handler for ping
    setTimeout(() => {
      // If no response received, increment failed count
      connectionMetrics.healthChecks.failed++;
      logger.warn(\'Health check failed: Ping timeout\', {
        timeout: 5000,
        currentState: currentConnectionState,
      });
    }, 5000);
  }, 30000); // Check every 30 seconds
};

const stopHealthCheck = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
};

/**
 * Enhanced socket connection with comprehensive error handling and retry logic
 */
const connectSocket = (token, options = {}) => {
  if (socket && socket.connected) {
    logger.debug(\'Socket already connected\', {
      socketId: socket.id,
      connected: socket.connected,
    });
    return Promise.resolve(socket);
  }

  if (isConnecting) {
    logger.debug(\'Connection already in progress\', {
      reconnectAttempts,
      isConnecting,
    });
    return Promise.reject(new Error(\'Connection already in progress\'));
  }

  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    isConnecting = true;
    setConnectionState(ConnectionState.CONNECTING);

    logger.info(\'Initiating socket connection\', {
      hasToken: !!token,
      reconnectAttempts,
      options: Object.keys(options),
      startTime,
    });

    // Enhanced connection options
    const socketOptions = {
      auth: { token },
      timeout: connectionTimeout,
      forceNew: true,
      transports: [\'websocket\', \'polling\'],
      upgrade: true,
      rememberUpgrade: true,
      maxHttpBufferSize: 1e6, // 1MB
      pingTimeout: 60000,
      pingInterval: 25000,
      ...options,
    };

    // Close existing socket if any
    if (socket) {
      logger.debug(\'Closing existing socket before reconnection\');
      socket.disconnect();
      socket = null;
    }

    try {
      const serverUrl =
        process.env.REACT_APP_SERVER_URL || \'http://localhost:5000\'; // Ensure consistency
      socket = io(serverUrl, socketOptions);

      // Enhanced connection timeout handling
      const connectionTimer = setTimeout(() => {
        if (isConnecting) {
          isConnecting = false;
          const error = new Error(
            `Connection timeout after ${connectionTimeout}ms`
          );
          error.code = \'CONNECTION_TIMEOUT\';

          logger.error(\'Socket connection timeout\', {
            timeout: connectionTimeout,
            reconnectAttempts,
            duration: Date.now() - startTime,
          });

          setConnectionState(ConnectionState.ERROR, error);
          socket?.disconnect();
          reject(error);
        }
      }, connectionTimeout);

      // Success handler
      socket.on(\'connect\', () => {
        clearTimeout(connectionTimer);
        isConnecting = false;
        isAuthenticated = false; // Will be set to true after authentication
        reconnectAttempts = 0;
        reconnectDelay = 1000; // Reset delay
        setConnectionState(ConnectionState.CONNECTED);
        startHealthCheck();
        logger.info(\'Socket connected successfully\', {
          socketId: socket.id,
          duration: Date.now() - startTime,
        });
        resolve(socket);
      });

      // Authentication success handler
      socket.on(\'authenticated\', () => {
        isAuthenticated = true;
        setConnectionState(ConnectionState.AUTHENTICATED);
        logger.info(\'Socket authenticated successfully\', {
          socketId: socket.id,
        });
      });

      // Authentication error handler
      socket.on(\'authentication_error\', async (error) => {
        isConnecting = false;
        isAuthenticated = false;
        logger.error(\'Socket authentication failed\', {
          error: error.message || error,
          socketId: socket?.id,
        });
        setConnectionState(ConnectionState.ERROR, error);

        // Attempt to refresh token if it\'s an auth error
        if (error.message === \'jwt expired\' || error.message === \'invalid token\') {
          if (isSocketTokenRefreshing) {
            logger.warn(\'Token refresh already in progress. Skipping.\');
            reject(new Error(\'Token refresh in progress\'));
            return;
          }
          isSocketTokenRefreshing = true;
          logger.info(\'Attempting to refresh token for socket...\');
          try {
            const refreshResult = await store.dispatch(refreshToken());
            if (refreshToken.fulfilled.match(refreshResult)) {
              const newToken = refreshResult.payload.token;
              logger.info(\'Token refreshed successfully. Reconnecting socket...\');
              currentToken = newToken; // Update currentToken
              // Important: Disconnect current socket before attempting to reconnect with new token
              if (socket) {
                socket.disconnect();
              }
              isSocketTokenRefreshing = false; // Reset before new attempt
              // Retry connection with new token
              // Ensure to pipe the promise result back
              connectSocket(newToken, options).then(resolve).catch(reject);
            } else {
              logger.error(\'Token refresh failed. Logging out.\', {
                error: refreshResult.error,
              });
              store.dispatch(logoutUser());
              isSocketTokenRefreshing = false;
              reject(new Error(\'Token refresh failed, user logged out.\'));
            }
          } catch (refreshError) {
            logger.error(\'Exception during token refresh. Logging out.\', {
              error: refreshError.message,
            });
            store.dispatch(logoutUser());
            isSocketTokenRefreshing = false;
            reject(new Error(\'Exception during token refresh, user logged out.\'));
          }
        } else {
          // For non-token related auth errors, just reject
          reject(new Error(error.message || \'Authentication failed\'));
        }
      });

      // General error handler
      socket.on(\'error\', (error) => {
        isConnecting = false;
        logger.error(\'Socket general error\', {
          error: error.message || error,
          socketId: socket?.id,
        });
        setConnectionState(ConnectionState.ERROR, error);
        // Do not automatically reject here, connect_error will handle retries/rejection
      });

      // Connection error handler (handles retries)
      socket.on(\'connect_error\', async (error) => {
        clearTimeout(connectionTimer); // Clear initial connection timer
        isConnecting = false;
        logger.error(\'Socket connection error\', {
          error: error.message || error,
          reconnectAttempts,
          socketId: socket?.id,
          duration: Date.now() - startTime,
        });
        setConnectionState(ConnectionState.ERROR, error);

        // Check if it\'s an authentication-related error (e.g., token expired)
        // This logic is similar to \'authentication_error\' but for the initial connect attempt
        const isAuthError = (err) =>
          err.message.includes(\'jwt expired\') ||
          err.message.includes(\'invalid token\') ||
          (err.data && (err.data.type === \'UnauthorizedError\' || err.data.code === \'invalid_token\'));

        if (isAuthError(error)) {
          if (isSocketTokenRefreshing) {
            logger.warn(\'Token refresh already in progress during connect_error. Skipping.\');
            reject(new Error(\'Token refresh in progress\')); // Reject the current connectSocket promise
            return;
          }
          isSocketTokenRefreshing = true;
          logger.info(\'Attempting to refresh token due to connect_error...\');
          try {
            const refreshResult = await store.dispatch(refreshToken());
            if (refreshToken.fulfilled.match(refreshResult)) {
              const newToken = refreshResult.payload.token;
              logger.info(\'Token refreshed successfully after connect_error. Reconnecting socket...\');
              currentToken = newToken;
              // Disconnect current socket if it exists and is different
              if (socket) {
                 socket.disconnect(); // Ensure old instance is cleaned up
              }
              isSocketTokenRefreshing = false;
              // Retry connection with new token, piping the promise
              connectSocket(newToken, options).then(resolve).catch(reject);
            } else {
              logger.error(\'Token refresh failed after connect_error. Logging out.\', { error: refreshResult.error });
              store.dispatch(logoutUser());
              isSocketTokenRefreshing = false;
              reject(new Error(\'Token refresh failed, user logged out.\')); // Reject the current connectSocket promise
            }
          } catch (refreshError) {
            logger.error(\'Exception during token refresh after connect_error. Logging out.\', { error: refreshError.message });
            store.dispatch(logoutUser());
            isSocketTokenRefreshing = false;
            reject(new Error(\'Exception during token refresh, user logged out.\')); // Reject the current connectSocket promise
          }
          return; // Exit after handling token refresh
        }


        // Standard reconnect logic for non-auth errors
        reconnectAttempts++;
        if (reconnectAttempts <= maxReconnectAttempts) {
          setConnectionState(ConnectionState.RECONNECTING, error);
          const delay = Math.min(
            reconnectDelay * Math.pow(2, reconnectAttempts - 1),
            maxReconnectDelay
          );
          logger.info(`Attempting to reconnect in ${delay / 1000}s...`, {
            attempt: reconnectAttempts,
            maxAttempts: maxReconnectAttempts,
            delay,
          });
          setTimeout(() => {
            // Retry connection, piping the promise
            // Important: We are calling connectSocket again, which returns a new promise.
            // The current promise should be chained to this new attempt.
            logger.info(\'Retrying connection...\', { attempt: reconnectAttempts });
            connectSocket(token, options).then(resolve).catch(reject);
          }, delay);
        } else {
          logger.error(\'Max reconnect attempts reached. Giving up.\', {
            maxAttempts: maxReconnectAttempts,
          });
          setConnectionState(
            ConnectionState.ERROR,
            new Error(\'Max reconnect attempts reached\')
          );
          reject(
            new Error(
              `Failed to connect after ${maxReconnectAttempts} attempts: ${error.message}`
            )
          );
        }
      });

      // Disconnect handler
      socket.on(\'disconnect\', (reason) => {
        isConnecting = false;
        isAuthenticated = false;
        stopHealthCheck();
        logger.warn(\'Socket disconnected\', {
          reason,
          socketId: socket?.id,
          currentProjectId,
        });

        // Differentiate between intentional disconnect and server-side disconnect
        if (reason === \'io client disconnect\') {
          setConnectionState(ConnectionState.DISCONNECTED);
          // Do not automatically try to reconnect if client initiated disconnect
        } else if (reason === \'io server disconnect\') {
          setConnectionState(
            ConnectionState.ERROR,
            new Error(\'Server disconnected forcefully\')
          );
          // Consider if automatic reconnection is desired here.
          // For now, we assume server disconnects are critical and may require user action or token refresh.
          // If token is still valid, App.js useEffect might try to reconnect if `disconnectSocket` wasn\'t called.
        } else {
          // Other reasons (e.g., transport error, ping timeout)
          setConnectionState(ConnectionState.RECONNECTING, new Error(reason));
          // Socket.IO client will attempt to reconnect automatically based on its options
          // unless `socket.disconnect()` was called.
          // We log this but rely on `connect_error` for explicit retry logic if needed.
        }
      });

      // Custom event for server-side errors
      socket.on(\'server_error\', (errorData) => {
        logger.error(\'Server-side error received\', {
          error: errorData.message || errorData,
          details: errorData.details,
          socketId: socket?.id,
        });
        toast.error(
          `Server error: ${errorData.message || \'An unexpected error occurred\'}`
        );
        // Depending on the error, might need to update state or logout user
      });

      // Example: Project-specific event listeners
      socket.on(\'project_updated\', (data) => {
        logger.info(\'Project updated event received\', data);
        // Potentially update Redux store or trigger UI updates
      });

      socket.on(\'user_joined_project\', (data) => {
        logger.info(\'User joined project event received\', data);
        const callback = projectPresenceCallbacks.get(data.projectId);
        if (callback) {
          callback(data);
        }
      });

      socket.on(\'user_left_project\', (data) => {
        logger.info(\'User left project event received\', data);
        const callback = projectPresenceCallbacks.get(data.projectId);
        if (callback) {
          callback(data);
        }
      });

      // Store the socket instance globally
      socketInstance = socket;
      currentToken = token; // Store the token used for this connection
    } catch (error) {
      isConnecting = false;
      logger.error(\'Failed to initialize socket\', {
        error: error.message,
        stack: error.stack,
      });
      setConnectionState(ConnectionState.ERROR, error);
      reject(error);
    }
  });
};

/**
 * Disconnects the socket if connected.
 */
const disconnectSocket = () => {
  const startTime = Date.now();
  logger.info(\'Disconnecting socket...\', {
    socketConnected: socket?.connected,
    socketId: socket?.id,
    isConnecting, // Log if disconnect is called while a connection is in progress
  });

  // If a connection is actively in progress, we need to ensure its promise is rejected
  // and its state is cleaned up. Socket.IO\'s disconnect might not handle this gracefully
  // if called before \'connect\' or \'connect_error\' fires for that attempt.
  if (isConnecting && socket) {
    // If socket object exists but isConnecting is true, it means we are in the middle of an attempt.
    // We should try to abort this attempt.
    // One way is to remove listeners and call disconnect.
    // The promise associated with this attempt should be rejected.
    // This is tricky because the promise is local to that connectSocket call.
    // For now, we rely on the fact that disconnect will trigger \'disconnect\' event
    // which should set isConnecting to false.
    // Future improvement: maintain a reference to the current connectPromise and reject it here.
    logger.warn(
      \'disconnectSocket called while a connection attempt was in progress.\'
    );
  }


  if (socket) {
    // Remove all custom listeners to prevent memory leaks and unexpected behavior on next connect
    // Standard listeners like \'connect\', \'disconnect\', \'error\' are managed by socket.io
    // but custom ones like \'new_notification\', \'project_updated\' need manual cleanup.
    // It\'s safer to remove specific listeners when they are no longer needed (e.g., in component unmount)
    // rather than a blanket removeAllListeners(), which can be too aggressive.
    // However, for a full disconnect, it might be appropriate.
    // socket.removeAllListeners(); // Use with caution

    socket.disconnect(); // This is an intentional client disconnect
    logger.info(\'Socket disconnect initiated.\', {
      duration: Date.now() - startTime,
    });
  } else {
    logger.debug(\'Socket already null, no action needed for disconnect.\');
  }

  // Reset state variables regardless of whether socket object existed
  // This ensures a clean state for the next connection attempt.
  isConnecting = false;
  isAuthenticated = false;
  stopHealthCheck();
  // Do not set socket to null here immediately, the \'disconnect\' event handler will do that
  // and also update connection state. Setting it null here might race with event handlers.
  // However, if relying on \'disconnect\' event, ensure it fires even if socket was never connected.
  // Socket.IO\'s disconnect() on a non-connected/non-existing socket is a no-op.
  // So, if socket is null, we should ensure state is DISCONNECTED.
  if (!socket) {
    setConnectionState(ConnectionState.DISCONNECTED);
  }
  // Resetting currentToken as the socket is no longer valid for it.
  currentToken = null;
  isSocketTokenRefreshing = false; // Reset token refresh flag on disconnect
};

/**
 * Cleans up the socket connection and all related resources.
 * Call this when the application is shutting down or user logs out permanently.
 */
const cleanupSocket = () => {
  logger.info(\'Cleaning up socket connection and resources...\');
  disconnectSocket(); // Ensure socket is disconnected
  if (socket) {
    socket.removeAllListeners(); // Remove all listeners to prevent memory leaks
    socket = null; // Nullify the socket instance
  }
  socketInstance = null; // Nullify the global instance reference
  connectionStateListeners.clear(); // Clear all state listeners
  projectPresenceCallbacks.clear(); // Clear project presence callbacks
  // Reset all state variables to their initial values
  isConnecting = false;
  reconnectAttempts = 0;
  reconnectDelay = 1000;
  isAuthenticated = false;
  currentProjectId = null;
  currentToken = null;
  isSocketTokenRefreshing = false;
  connectionMetrics = {
    connectedAt: null,
    disconnectedAt: null,
    reconnectCount: 0,
    totalDowntime: 0,
    lastError: null,
    healthChecks: { successful: 0, failed: 0, lastCheck: null },
  };
  setConnectionState(ConnectionState.DISCONNECTED); // Explicitly set state
  logger.info(\'Socket cleanup complete.\');
};

/**
 * Subscribe to connection state changes.
 * @param {function} callback - Function to call when state changes.
 * @returns {string} Listener ID for unsubscribing.
 */
const onConnectionStateChange = (callback) => {
  const listenerId = `listener-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 10)}`;
  connectionStateListeners.set(listenerId, callback);
  logger.debug(`Connection state listener added: ${listenerId}`);
  // Immediately provide the current state to the new listener
  try {
    callback({
      state: currentConnectionState,
      previousState: null, // No previous state for initial call
      timestamp: new Date().toISOString(),
      error: connectionMetrics.lastError,
      socketId: socket?.id,
      projectId: currentProjectId,
      reconnectAttempts,
      isAuthenticated,
    });
  } catch (error) {
    logger.error(`Error in initial state callback for listener ${listenerId}`, {
      error: error.message,
    });
  }
  return listenerId;
};

/**
 * Unsubscribe from connection state changes.
 * @param {string} listenerId - The ID of the listener to remove.
 */
const offConnectionStateChange = (listenerId) => {
  if (connectionStateListeners.has(listenerId)) {
    connectionStateListeners.delete(listenerId);
    logger.debug(`Connection state listener removed: ${listenerId}`);
  } else {
    logger.warn(
      `Attempted to remove non-existent connection state listener: ${listenerId}`
    );
  }
};

/**
 * Get current connection metrics.
 * @returns {object} Connection metrics.
 */
const getConnectionMetrics = () => {
  return {
    ...connectionMetrics,
    currentState: currentConnectionState,
    socketId: socket?.id,
    isConnecting,
    isAuthenticated,
    activeListeners: connectionStateListeners.size,
    activeProjectCallbacks: projectPresenceCallbacks.size,
  };
};

/**
 * Joins a project room for real-time updates.
 * @param {string} projectId - The ID of the project to join.
 * @param {function} callback - Callback function for presence updates.
 */
const joinProjectRoom = (projectId, callback) => {
  if (socket && socket.connected && isAuthenticated) {
    currentProjectId = projectId;
    socket.emit(\'join_project_room\', { projectId }, (response) => {
      if (response && response.success) {
        logger.info(`Successfully joined project room: ${projectId}`, {
          response,
        });
        if (callback) {
          projectPresenceCallbacks.set(projectId, callback);
        }
      } else {
        logger.error(`Failed to join project room: ${projectId}`, { response });
        toast.error(
          `Error joining project updates: ${response?.message || \'Unknown error\'}`
        );
      }
    });
  } else {
    logger.warn(
      \'Socket not connected or not authenticated. Cannot join project room.\',
      {
        connected: socket?.connected,
        authenticated: isAuthenticated,
        projectId,
      }
    );
    toast.warn(
      \'Cannot get real-time project updates. Connection issue.\'
    );
  }
};

/**
 * Leaves a project room.
 * @param {string} projectId - The ID of the project to leave.
 */
const leaveProjectRoom = (projectId) => {
  if (socket && socket.connected) {
    socket.emit(\'leave_project_room\', { projectId }, (response) => {
      if (response && response.success) {
        logger.info(`Successfully left project room: ${projectId}`, {
          response,
        });
      } else {
        logger.error(`Failed to leave project room: ${projectId}`, {
          response,
        });
      }
    });
    projectPresenceCallbacks.delete(projectId);
    if (currentProjectId === projectId) {
      currentProjectId = null;
    }
  } else {
    logger.warn(\'Socket not connected. Cannot leave project room.\', {
      projectId,
    });
  }
};

/**
 * Emits a generic event if the socket is connected and authenticated.
 * @param {string} eventName - The name of the event to emit.
 * @param {object} data - The data to send with the event.
 * @param {function} [ack] - Optional acknowledgement callback.
 */
const emitSocketEvent = (eventName, data, ack) => {
  if (socket && socket.connected && isAuthenticated) {
    logger.debug(`Emitting socket event: ${eventName}`, { data });
    socket.emit(eventName, data, ack);
  } else {
    logger.warn(
      `Socket not ready to emit event: ${eventName}. Connected: ${socket?.connected}, Authenticated: ${isAuthenticated}`
    );
    if (ack) {
      // Call ack with an error if socket is not ready
      ack({
        success: false,
        error: \'Socket not connected or authenticated.\',
      });
    }
  }
};

/**
 * Registers a handler for a generic socket event.
 * @param {string} eventName - The name of the event to listen for.
 * @param {function} handler - The function to call when the event is received.
 */
const onSocketEvent = (eventName, handler) => {
  if (socket) {
    logger.debug(`Registering handler for socket event: ${eventName}`);
    socket.on(eventName, handler);
  } else {
    logger.warn(
      `Socket not initialized. Cannot register handler for event: ${eventName}`
    );
  }
};

/**
 * Removes a handler for a generic socket event.
 * @param {string} eventName - The name of the event.
 * @param {function} handler - The handler function to remove.
 */
const offSocketEvent = (eventName, handler) => {
  if (socket) {
    logger.debug(`Removing handler for socket event: ${eventName}`);
    socket.off(eventName, handler);
  } else {
    logger.warn(
      `Socket not initialized. Cannot remove handler for event: ${eventName}`
    );
  }
};


// Export all necessary functions
export {\r\n  connectSocket,\r\n  disconnectSocket,\r\n  getSocketInstance as getSocket, // Aliased for consistency with other uses\r\n  cleanupSocket,\r\n  onConnectionStateChange,\r\n  offConnectionStateChange,\r\n  getConnectionMetrics,\r\n  joinProjectRoom,\r\n  leaveProjectRoom,\r\n  ConnectionState, // Exporting the enum for consumers\r\n  emitSocketEvent, // Exporting generic emit\r\n  onSocketEvent,   // Exporting generic on\r\n  offSocketEvent,  // Exporting generic off\r\n  SERVER_URL,      // Exporting for potential diagnostic use\r\n};\r\n
```

**`client/src/context/NotificationContext.js`:**

```javascript
// filepath: c:\\Users\\macdo\\Documents\\Cline\\utool\\client\\src\\context\\NotificationContext.js
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from \'react\';
import { useSelector } from \'react-redux\';
import api from \'../utils/api\';
import {
  connectSocket, // Renamed from connectSocketWithToken
  disconnectSocket,
  getSocket,
} from \'../utils/socket\';
import { toast } from \'react-toastify\';
import { PinIcon, XCircleIcon } from \'lucide-react\';

// Create context
const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [pinnedToasts, setPinnedToasts] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [currentSocket, setCurrentSocket] = useState(null); // Added state for current socket instance

  const selectAuth = useMemo(() => (state) => state.auth, []);
  const { user, token } = useSelector(selectAuth);

  // Custom function to display toast notification with pin/close buttons
  const showSystemNotification = useCallback((notification) => {
    const toastId = notification._id || Date.now().toString();

    const ToastContent = () => (
      <div className="flex flex-col">
        <div
          className="cursor-pointer"
          onClick={() => handleNotificationClick(notification)}
        >
          <strong>{notification.title}</strong>
          <p>{notification.message}</p>
        </div>
        <div className="flex justify-end mt-1 space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePinToast(toastId, notification);
            }}
            className="p-1 hover:bg-gray-700 rounded-full transition-colors"
            title="Pin notification"
          >
            <PinIcon size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toast.dismiss(toastId);
            }}
            className="p-1 hover:bg-gray-700 rounded-full transition-colors"
            title="Close"
          >
            <XCircleIcon size={16} />
          </button>
        </div>
      </div>
    );

    toast(<ToastContent />, {
      position: \'top-right\',
      autoClose: 5000,
      closeOnClick: false, // Don\'t close when clicking content
      closeButton: false, // Hide default close button
      draggable: true,
      pauseOnHover: true,
      toastId: toastId,
      type: notification.type || \'info\',
    });
  }, []);

  // Handle pinning a toast notification
  const handlePinToast = useCallback((toastId, notification) => {
    // First dismiss the auto-closing toast
    toast.dismiss(toastId);

    // Create a new pinned version that won\'t auto-close
    const pinnedToastId = `pinned-${toastId}`;

    const PinnedToastContent = () => (
      <div className="flex flex-col">
        <div className="flex items-start">
          <div
            className="cursor-pointer flex-grow"
            onClick={() => handleNotificationClick(notification)}
          >
            <strong>{notification.title}</strong>
            <p>{notification.message}</p>
          </div>
          <div className="ml-2 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toast.dismiss(pinnedToastId);
                setPinnedToasts((prev) =>
                  prev.filter((id) => id !== pinnedToastId)
                );
              }}
              className="p-1 hover:bg-gray-700 rounded-full transition-colors"
              title="Close"
            >
              <XCircleIcon size={16} />
            </button>
          </div>
        </div>
        <div className="text-xs text-gray-400 mt-1">Pinned notification</div>
      </div>
    );

    toast(<PinnedToastContent />, {
      position: \'top-right\',
      autoClose: false, // Never auto-close pinned notifications
      closeOnClick: false,
      closeButton: false,
      draggable: true,
      pauseOnHover: true,
      toastId: pinnedToastId,
      type: notification.type || \'info\',
      className: \'pinned-toast border-l-4 border-amber-500\',
    });

    // Keep track of pinned toasts
    setPinnedToasts((prev) => [...prev, pinnedToastId]);
  }, []);

  // Handle notification click
  const handleNotificationClick = useCallback((notification) => {
    // Mark the notification as read
    markAsRead(notification._id);

    // Navigate to the URL if provided
    if (notification.url) {
      window.location.href = notification.url;
    }
  }, []);

  // Memoize the notification handler to stabilize useEffect dependencies
  const handleNewNotification = useCallback(
    (notification) => {
      console.log(\'Received new notification via socket:\', notification);
      setNotifications((prevNotifications) => [
        notification,
        ...prevNotifications,
      ]);
      setUnreadCount((prevCount) => prevCount + 1);
      showSystemNotification(notification);
    },
    [showSystemNotification]
  );

  // Show a notification with the ability to pin
  const showNotification = useCallback(
    (message, type = \'info\') => {
      // Create notification object
      const notification = {
        _id: Date.now().toString(),
        title:
          type === \'error\'
            ? \'Error\'
            : type === \'success\'
            ? \'Success\'
            : \'Notification\',
        message,
        type,
      };

      // Display the notification
      showSystemNotification(notification);
    },
    [showSystemNotification]
  );

  // Fetch all notifications from the API - wrapped in useCallback for stability
  const fetchNotifications = useCallback(async () => {
    // Guard clause: Do not attempt to fetch if there\'s no user or token.
    // This is an additional safeguard, though the useEffect hook should
    // primarily control when this function is called.
    if (!user || !token) return;

    setIsLoading(true);
    try {
      const response = await api.get(\'/notifications\');
      setNotifications(response.data.data);
    } catch (error) {
      console.error(\'Error fetching notifications:\', error);
      toast.error(\'Failed to fetch notifications. Please try again later.\');
    } finally {
      setIsLoading(false);
    }
  }, [user, token]);

  // Fetch unread notification count - wrapped in useCallback for stability
  const fetchUnreadCount = useCallback(async () => {
    if (!user || !token) return;

    setIsLoading(true);
    try {
      const response = await api.get(\'/notifications/unread-count\');
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error(\'Error fetching unread count:\', error);
      toast.error(
        \'Failed to fetch notification count. Please try again later.\'
      );
    }
  }, [user, token]);

  // Effect to get the socket instance and update connection status
  useEffect(() => {
    if (token) {
      const s = getSocket();
      setCurrentSocket(s); // Store the socket instance

      if (s) {
        // Set initial connection status
        setSocketConnected(s.connected);

        const handleConnect = () => {
          setSocketConnected(true);
          console.log(\'[NotificationContext] Socket connected via event.\');
        };
        const handleDisconnect = (reason) => {
          setSocketConnected(false);
          console.log(
            `[NotificationContext] Socket disconnected via event: ${reason}`
          );
        };

        s.on(\'connect\', handleConnect);
        s.on(\'disconnect\', handleDisconnect);

        // Clean up listeners when the effect reruns or component unmounts
        return () => {
          s.off(\'connect\', handleConnect);
          s.off(\'disconnect\', handleDisconnect);
        };
      } else {
        // No socket instance available yet
        setSocketConnected(false);
      }
    } else {
      // No token, so ensure socket state is cleared
      setCurrentSocket(null);
      setSocketConnected(false);
    }
  }, [token]); // Re-run when token changes (login/logout)

  // Fetch initial notifications and set up socket listeners
  useEffect(() => {
    // Ensure user, token, and a connected socket are present
    if (user && token && currentSocket && socketConnected) {
      fetchNotifications();
      fetchUnreadCount();

      // Setup application-specific event listeners
      currentSocket.on(\'new_notification\', handleNewNotification);

      // Cleanup listeners when effect dependencies change or component unmounts
      return () => {
        currentSocket.off(\'new_notification\', handleNewNotification);
      };
    }
  }, [
    user,
    token,
    currentSocket, // Dependency
    socketConnected, // Dependency
    fetchNotifications,
    fetchUnreadCount,
    handleNewNotification,
  ]);

  // Mark a notification as read
  const markAsRead = async (id) => {
    // Guard clause: Do not attempt to modify data if there\'s no user or token.
    // All write operations should be protected by ensuring authentication.
    if (!user || !token) return;

    try {
      await api.put(\'/notifications/read\', { ids: [id] });

      // Update the notification in the local state
      setNotifications((prevNotifications) =>
        prevNotifications.map((notification) =>
          notification._id === id
            ? { ...notification, isRead: true }
            : notification
        )
      );

      // Decrement unread count if the notification was unread
      const notification = notifications.find((n) => n._id === id);
      if (notification && !notification.isRead) {
        setUnreadCount((prevCount) => Math.max(0, prevCount - 1));
      }
    } catch (error) {
      console.error(\'Error marking notification as read:\', error);
      toast.error(\'Failed to mark notification as read.\');
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!user || !token) return;

    try {
      await api.put(\'/notifications/read-all\');
      setNotifications((prevNotifications) =>
        prevNotifications.map((notification) => ({
          ...notification,
          isRead: true,
        }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error(\'Error marking all notifications as read:\', error);
      toast.error(\'Failed to mark all notifications as read.\');
    }
  };

  // Delete a notification
  const deleteNotification = async (id) => {
    if (!user || !token) return;

    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prevNotifications) =>
        prevNotifications.filter((notification) => notification._id !== id)
      );
      // Optionally, refetch unread count or adjust it locally
      fetchUnreadCount();
    } catch (error) {
      console.error(\'Error deleting notification:\', error);
      toast.error(\'Failed to delete notification.\');
    }
  };

  // Clear all notifications
  const clearAllNotifications = async () => {
    if (!user || !token) return;

    try {
      await api.delete(\'/notifications/all\');
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error(\'Error clearing all notifications:\', error);
      toast.error(\'Failed to clear all notifications.\');
    }
  };

  // Value provided to context consumers
  const contextValue = useMemo(
    () => ({
      notifications,
      unreadCount,
      isLoading,
      fetchNotifications,
      fetchUnreadCount,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearAllNotifications,
      showNotification, // Expose the generic showNotification
      socketConnected, // Expose socket connection status
    }),
    [
      notifications,
      unreadCount,
      isLoading,
      fetchNotifications,
      fetchUnreadCount,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearAllNotifications,
      showNotification,
      socketConnected,
    ]
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

// Custom hook to use the notification context
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      \'useNotification must be used within a NotificationProvider\'
    );
  }
  return context;
};

```
