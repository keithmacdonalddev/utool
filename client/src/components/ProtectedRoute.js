import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = ({ allowedRoles }) => {
  const { user, token, isLoading, isGuest } = useSelector(
    (state) => state.auth
  );

  // Allow access if:
  // - user and token are present (regular/pro user)
  // - OR user is a guest (role === 'Guest' and isGuest === true)
  const isAuthenticated =
    (user && token) || (user && user.role === 'Guest' && isGuest);
  const userRole = user?.role; // Assuming user object has a 'role' property

  if (isLoading) {
    return <p className="text-center">Checking authentication...</p>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
