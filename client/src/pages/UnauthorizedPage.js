import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';

const UnauthorizedPage = () => {
  return (
    <div className="flex items-center justify-center h-screen bg-dark-800">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
          <ShieldX className="h-8 w-8 text-yellow-600" />
        </div>
        <h1 className="text-2xl font-bold text-text mb-2">Access Denied</h1>
        <p className="text-text-muted mb-6">
          You do not have permission to access this page.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
