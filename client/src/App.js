// App.js - Main entry point for the React application
// This file defines the application's routing structure and global providers

import React, { Suspense, lazy, useEffect, useMemo } from 'react'; // React core and hooks
import { NotificationProvider } from './context/NotificationContext'; // Custom notification context
import { useDispatch, useSelector } from 'react-redux'; // Redux hooks for state management
import { connectSocket, disconnectSocket } from './utils/socket'; // Socket.IO connection utilities // connectSocketWithToken renamed to connectSocket
import { restoreAuthState } from './features/auth/authSlice'; // Import auth restoration thunk
import {
  BrowserRouter as Router, // Client-side router implementation
  Routes, // Container for all routes
  Route, // Individual route definition
  Navigate, // Component for redirecting
  useParams,
} from 'react-router-dom';
import { ToastContainer } from 'react-toastify'; // Toast notification system
import 'react-toastify/dist/ReactToastify.css'; // Styles for toast notifications

import ProtectedRoute from './components/ProtectedRoute'; // Custom route guard component
import MainLayout from './components/layout/MainLayout'; // Layout wrapper with sidebar and header
import ErrorBoundary from './components/ErrorBoundary'; // Import the ErrorBoundary
import './App.css'; // Global application styles

// Redirect component removed - direct navigation to project details eliminates unmount/remount cycle

// Lazy-loaded components using code splitting
// This improves initial load performance by only loading components when needed
// Each import() returns a Promise that resolves to the component module
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProjectListPage = lazy(() => import('./pages/ProjectListPage'));
const ProjectDashboard = lazy(() =>
  import('./pages/projects/ProjectDashboard')
); // Milestone 1: Enhanced Project Dashboard
const ProjectCreatePage = lazy(() => import('./pages/ProjectCreatePage'));
const ProjectDetailsPage = lazy(() => import('./pages/ProjectDetailsPage'));
const ProjectEditPage = lazy(() => import('./pages/ProjectEditPage'));
const KbListPage = lazy(() => import('./pages/KbListPage'));
const KbCreatePage = lazy(() => import('./pages/KbCreatePage'));
const KbDetailsPage = lazy(() => import('./pages/KbDetailsPage'));
const KbEditPage = lazy(() => import('./pages/KbEditPage'));
const KbVersionHistoryPage = lazy(() => import('./pages/KbVersionHistoryPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const FavoriteQuotesPage = lazy(() => import('./pages/FavoriteQuotesPage'));
// Task pages removed - tasks are now only accessible within projects
// const TasksPage = lazy(() => import('./pages/TasksPage'));
// const TaskDetailsPage = lazy(() => import('./pages/TaskDetailsPage'));
const FriendsPage = lazy(() => import('./pages/FriendsPage'));
// Notes Feature
const NotesPage = lazy(() => import('./pages/NotesPage'));
const TrashPage = lazy(() => import('./pages/TrashPage'));
const ResourcesPage = lazy(() => import('./pages/ResourcesPage')); // <-- Add resources page
const ArchivePage = lazy(() => import('./pages/ArchivePage')); // <-- Add Archive page
// Admin Pages
const AdminUserListPage = lazy(() => import('./pages/admin/UserListPage'));
const AdminUserEditPage = lazy(() => import('./pages/admin/UserEditPage'));
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'));
const GuestAnalyticsPage = lazy(() =>
  import('./pages/admin/GuestAnalyticsPage')
);
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage'));
const AdminDashboardPage = lazy(() =>
  import('./pages/admin/AdminDashboardPage')
); // New admin dashboard
const AnalyticsPage = lazy(() => import('./pages/admin/AnalyticsPage')); // Enhanced analytics page
const PublicSettingsPage = lazy(() =>
  import('./pages/admin/PublicSettingsPage')
); // Public settings management
const SystemHealthPage = lazy(() => import('./pages/admin/SystemHealthPage')); // System health monitoring
const BatchOperationsPage = lazy(() =>
  import('./pages/admin/BatchOperationsPage')
); // Batch operations and maintenance tools
const RoleManagementPage = lazy(() =>
  import('./pages/admin/RoleManagementPage')
); // Role management and permissions
const ReportingPage = lazy(() => import('./pages/admin/ReportingPage')); // Reporting & Audit - Milestone 6
const ComingSoonPage = lazy(() => import('./components/admin/ComingSoonPage')); // Coming soon component for future features
const UnauthorizedPage = lazy(() => import('./pages/UnauthorizedPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

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
  <Navigate replace to="/resources" state={{ activeTab: 'quotes' }} />
);

function App() {
  const dispatch = useDispatch();

  // Memoized selector to prevent Redux rerender warnings
  const selectAuth = useMemo(() => (state) => state.auth, []);

  // Extract user authentication state from Redux store
  // This is used to determine if socket connection should be established
  const { user, token, isAuthRestored, authRestorationAttempted } =
    useSelector(selectAuth);

  // CRITICAL: Restore authentication state on app startup to prevent race conditions
  // This useEffect runs once when the app mounts and ensures auth state is properly
  // restored from localStorage before any API calls are made
  useEffect(() => {
    // Only attempt restoration once and if it hasn't been attempted yet
    if (!authRestorationAttempted) {
      console.log('App.js: Initiating authentication state restoration...');
      dispatch(restoreAuthState());
    }
  }, [dispatch, authRestorationAttempted]);

  // useEffect hook to manage socket connection based on authentication state
  // This ensures real-time features only work when the user is logged in
  // IMPORTANT: Only run after auth restoration is complete to prevent timing issues
  useEffect(() => {
    // Wait for auth restoration to complete before managing socket connections
    if (!isAuthRestored) {
      console.log(
        'App.js: Waiting for auth restoration to complete before managing socket...'
      );
      return;
    }

    let isEffectActive = true; // Flag to prevent state updates on unmounted component

    if (token) {
      console.log('App.js Effect: Token found, ensuring socket is connected.');
      connectSocket(token)
        .then(() => {
          if (isEffectActive) {
            console.log('App.js Effect: Socket connected successfully.');
          }
        })
        .catch((error) => {
          // Only log errors that aren't intentional cancellations
          if (
            isEffectActive &&
            error.message !== 'Connection cancelled by disconnect.'
          ) {
            console.error('App.js Effect: Socket connection failed:', error);
          }
        });
    } else {
      console.log('App.js Effect: No token, ensuring socket is disconnected.');
      disconnectSocket();
    }

    // The cleanup function ALWAYS runs.
    // Our new socket.js module will handle this gracefully.
    return () => {
      console.log('App.js Effect: Cleanup triggered. Disconnecting socket.');
      isEffectActive = false;
      disconnectSocket();
    };
  }, [token, isAuthRestored]); // Add isAuthRestored to dependencies
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

            {/* CRITICAL: Show loading screen until authentication state is restored */}
            {!isAuthRestored ? (
              <div
                className="flex items-center justify-center h-screen bg-gray-900"
                role="status"
                aria-live="polite"
              >
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-lg text-gray-300">
                    Restoring authentication state...
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    This ensures secure access to your projects
                  </p>
                </div>
              </div>
            ) : (
              /* Suspense shows a fallback UI while lazy-loaded components are loading */
              <Suspense
                fallback={
                  <div
                    role="status"
                    aria-live="polite"
                    style={{
                      textAlign: 'center',
                      padding: '20px',
                      color: 'white',
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
                          'Regular User',
                          'Pro User',
                          'Admin',
                          'Guest',
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
                      {/* Additional role check for admin-specific functionality */}{' '}
                      <Route
                        element={<ProtectedRoute allowedRoles={['Admin']} />}
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
                        />{' '}
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
                                'Scheduled maintenance windows',
                                'Automated backup management',
                                'Performance optimization wizards',
                                'Database migration tools',
                              ]}
                            />
                          }
                        />
                      </Route>
                    </Route>
                  </Route>
                  {/* Special routes for handling unauthorized access and redirects */}
                  <Route path="/unauthorized" element={<UnauthorizedPage />} />
                  {/* Root path redirects to dashboard */}
                  <Route
                    path="/"
                    element={<Navigate replace to="/dashboard" />}
                  />
                  {/* Redirect standalone task routes to projects */}
                  <Route
                    path="/tasks/*"
                    element={<Navigate replace to="/projects" />}
                  />{' '}
                  {/* Catch-all route for 404 Not Found pages */}
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            )}
          </div>
        </ErrorBoundary>
      </Router>
    </NotificationProvider>
  );
}

export default App;
