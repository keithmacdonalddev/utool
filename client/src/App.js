import React, { Suspense, lazy, useEffect } from 'react';
import { NotificationProvider } from './context/NotificationContext';
import { useDispatch, useSelector } from 'react-redux';
import { connectWithAuth, disconnectSocket } from './utils/socket';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import './App.css';

// Lazy-loaded components
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProjectListPage = lazy(() => import('./pages/ProjectListPage'));
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
const TasksPage = lazy(() => import('./pages/TasksPage'));
const TaskDetailsPage = lazy(() => import('./pages/TaskDetailsPage'));
const FriendsPage = lazy(() => import('./pages/FriendsPage')); // Import FriendsPage
// Notes Feature
const NotesPage = lazy(() => import('./pages/NotesPage'));
const TrashPage = lazy(() => import('./pages/TrashPage'));
// Admin Pages
const AdminUserListPage = lazy(() => import('./pages/admin/UserListPage'));
const AdminUserEditPage = lazy(() => import('./pages/admin/UserEditPage'));
const UnauthorizedPage = lazy(() => import('./pages/UnauthorizedPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const TaskCreatePage = lazy(() => import('./pages/TaskCreatePage')); // Import TaskCreatePage

function App() {
  const { user, token } = useSelector((state) => state.auth);

  // Connect socket when user is logged in
  useEffect(() => {
    if (token) {
      // Connect to socket with auth
      connectWithAuth();
    } else {
      // Disconnect socket when no token is present
      disconnectSocket();
    }

    // Clean up on unmount
    return () => {
      disconnectSocket();
    };
  }, [token]);

  return (
    <NotificationProvider>
      <Router>
        <div className="App">
          <Suspense fallback={<div>Loading...</div>}>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route
                path="/verify-email/:token"
                element={<VerifyEmailPage />}
              />
              {/* Protected Routes - Allow all authenticated users (including Regular Users) */}
              <Route
                element={
                  <ProtectedRoute
                    allowedRoles={['Regular User', 'Pro User', 'Admin']}
                  />
                }
              >
                <Route element={<MainLayout />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/projects/new" element={<ProjectCreatePage />} />
                  <Route
                    path="/projects/:id"
                    element={<ProjectDetailsPage />}
                  />
                  <Route path="/projects" element={<ProjectListPage />} />
                  <Route
                    path="/projects/:id/edit"
                    element={<ProjectEditPage />}
                  />
                  <Route path="/kb/new" element={<KbCreatePage />} />
                  <Route path="/kb" element={<KbListPage />} />
                  <Route path="/kb/:id" element={<KbDetailsPage />} />
                  <Route path="/kb/:id/edit" element={<KbEditPage />} />
                  <Route
                    path="/kb/:id/versions"
                    element={<KbVersionHistoryPage />}
                  />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/notes" element={<NotesPage />} />
                  <Route path="/notes/trash" element={<TrashPage />} />
                  <Route path="/tasks" element={<TasksPage />} />
                  <Route path="/tasks/new" element={<TaskCreatePage />} />{' '}
                  {/* New route for task creation */}
                  <Route path="/tasks/:id" element={<TaskDetailsPage />} />
                  <Route
                    path="/favorite-quotes"
                    element={<FavoriteQuotesPage />}
                  />
                  <Route path="/friends" element={<FriendsPage />} />{' '}
                  {/* Add FriendsPage Route */}
                  {/* Admin Only Routes */}
                  <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
                    {/* Can nest under /admin or keep flat */}
                    <Route
                      path="/admin/users"
                      element={<AdminUserListPage />}
                    />
                    <Route
                      path="/admin/users/:id/edit"
                      element={<AdminUserEditPage />}
                    />
                    {/* Admin logging routes have been removed */}
                  </Route>
                </Route>
              </Route>
              <Route path="/unauthorized" element={<UnauthorizedPage />} />
              <Route path="/" element={<Navigate replace to="/dashboard" />} />
              {/* 404 Not Found route */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </div>
      </Router>
    </NotificationProvider>
  );
}

export default App;
