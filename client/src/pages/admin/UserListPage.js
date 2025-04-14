import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNotification } from '../../context/NotificationContext';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import {
  Users,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  List,
} from 'lucide-react';

const AuditLogsTab = ({ logs, isLoading, error }) => {
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'asc',
  });

  const sortedLogs = useMemo(() => {
    let sortableLogs = [...logs];
    if (sortConfig.key) {
      sortableLogs.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableLogs;
  }, [logs, sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  if (error && error.includes('403')) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded flex items-center">
        <AlertTriangle className="mr-2" />
        <div>
          <strong className="font-bold">Access Denied!</strong>
          <p className="text-sm">
            You don't have permission to view audit logs. Only administrators
            can access this feature.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading audit logs...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <strong className="font-bold">Error!</strong> {error}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ minHeight: 0 }}>
      <div className="bg-white shadow-md rounded overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="flex-1 overflow-auto min-h-0">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort('timestamp')}
                >
                  Timestamp
                  {sortConfig.key === 'timestamp' && (
                    <span className="ml-1">
                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort('userId.name')}
                >
                  User
                  {sortConfig.key === 'userId.name' && (
                    <span className="ml-1">
                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort('action')}
                >
                  Action
                  {sortConfig.key === 'action' && (
                    <span className="ml-1">
                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort('status')}
                >
                  Status
                  {sortConfig.key === 'status' && (
                    <span className="ml-1">
                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  IP Address
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedLogs.map((log) => (
                <tr key={log._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.userId?.name || 'System'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.action}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        log.status === 'success'
                          ? 'bg-green-100 text-green-800'
                          : log.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.ipAddress}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const UserListPage = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState('');
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'asc',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    isVerified: false,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const { showNotification } = useNotification();
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [permissionError, setPermissionError] = useState('');

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password || !newUser.role) {
      setCreateError('All fields are required');
      return;
    }

    setIsCreating(true);
    setCreateError('');

    try {
      const res = await api.post('/users', newUser);
      if (res.data.success) {
        setShowAddUserForm(false);
        setNewUser({
          name: '',
          email: '',
          password: '',
          role: '',
          isVerified: false,
        });
        fetchUsers();
        showNotification('User created successfully');
      }
    } catch (err) {
      console.error('Create User Error:', err);
      setCreateError(err.response?.data?.message || 'Failed to create user');
    } finally {
      setIsCreating(false);
    }
  };

  const sortedUsers = useMemo(() => {
    let sortableUsers = [...users];
    if (sortConfig.key) {
      sortableUsers.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableUsers;
  }, [users, sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data.success) {
        setCurrentUserRole(res.data.data.role);
      }
    } catch (err) {
      console.error('Failed to fetch current user:', err);
    }
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    if (currentUserRole && !currentUserRole.toLowerCase().includes('admin')) {
      setLogsError('403 - Permission Denied');
      return;
    }

    setLogsLoading(true);
    setLogsError('');
    try {
      console.log('Making API call to /audit-logs');
      const res = await api.get('/audit-logs');
      console.log('API Response:', res);
      if (res.data.success) {
        setAuditLogs(res.data.data);
      } else {
        throw new Error(res.data.message || 'Failed to fetch audit logs');
      }
    } catch (err) {
      console.error('Fetch Audit Logs Error:', err);
      console.error('Error Details:', {
        config: err.config,
        response: err.response,
      });
      setLogsError(
        err.response?.data?.message ||
          err.message ||
          'Failed to load audit logs.'
      );

      if (err.response?.status === 403) {
        setLogsError('403 - Permission Denied');
      }
    } finally {
      setLogsLoading(false);
    }
  }, [currentUserRole]);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await api.get('/users');
      if (res.data.success) {
        setUsers(res.data.data);
      } else {
        throw new Error(res.data.message || 'Failed to fetch users');
      }
    } catch (err) {
      console.error('Fetch Users Error:', err);
      if (err.response?.status === 401) {
        window.location.href = '/login';
      } else if (err.response?.status === 403) {
        window.location.href = '/unauthorized';
      } else {
        setError(
          err.response?.data?.message || err.message || 'Failed to load users.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
    fetchUsers();
  }, [fetchUsers, fetchCurrentUser]);

  useEffect(() => {
    if (activeTab === 'audit-logs') {
      fetchAuditLogs();
    }
  }, [fetchAuditLogs, activeTab]);

  const openDeleteConfirmation = (user) => {
    setUserToDelete(user);
    setDeleteError('');
    setShowDeleteModal(true);
  };

  const closeDeleteConfirmation = () => {
    setUserToDelete(null);
    setShowDeleteModal(false);
    setIsDeleting(false);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/users/${userToDelete._id}`);
      fetchUsers();
      closeDeleteConfirmation();
      showNotification('User deleted successfully');
    } catch (err) {
      console.error('Delete User Error:', err);
      setDeleteError(err.response?.data?.message || 'Failed to delete user.');
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 text-center">Loading users...</div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 h-screen flex flex-col">
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded"
          role="alert"
        >
          <strong className="font-bold">Error!</strong> {error}
        </div>
      </div>
    );
  }

  const isAdmin =
    currentUserRole && currentUserRole.toLowerCase().includes('admin');

  return (
    <div
      className="container mx-auto p-4 flex flex-col"
      style={{ height: 'calc(100vh - 5rem)', overflow: 'hidden' }}
    >
      <div className="mb-4 flex-none">
        <Link
          to="/dashboard"
          className="inline-flex items-center text-sm text-accent-purple font-bold hover:text-accent-blue hover:underline"
        >
          <ArrowLeft size={16} className="mr-1" />
          Back to Dashboard
        </Link>
      </div>

      <div className="flex justify-between items-center mb-6 flex-none">
        <h1 className="text-2xl font-bold text-[#F8FAFC] flex items-center">
          {activeTab === 'users' ? (
            <>
              <Users className="mr-2" /> User Management
            </>
          ) : (
            <>
              <List className="mr-2" /> Audit Logs {!isAdmin && '(Admin Only)'}
            </>
          )}
        </h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`font-bold rounded-xl shadow px-4 py-2 focus:outline-none transition duration-150 ease-in-out ${
              activeTab === 'users'
                ? 'bg-accent-purple text-[#F8FAFC]'
                : 'bg-dark-700 text-[#F8FAFC] border border-[#393A41] hover:bg-dark-600'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('audit-logs')}
            className={`font-bold rounded-xl shadow px-4 py-2 focus:outline-none transition duration-150 ease-in-out ${
              activeTab === 'audit-logs'
                ? 'bg-accent-purple text-[#F8FAFC]'
                : 'bg-dark-700 text-[#F8FAFC] border border-[#393A41] hover:bg-dark-600'
            } ${!isAdmin ? 'opacity-50' : ''}`}
            title={!isAdmin ? 'Only administrators can access audit logs' : ''}
          >
            Audit Logs
            {!isAdmin && (
              <AlertTriangle
                size={14}
                className="inline ml-1 text-yellow-500"
              />
            )}
          </button>
          {activeTab === 'users' && (
            <button
              onClick={() => setShowAddUserForm(!showAddUserForm)}
              className="bg-accent-purple text-[#F8FAFC] font-bold py-2 px-4 rounded-xl shadow hover:bg-accent-blue/80 transition"
            >
              + Add User
            </button>
          )}
        </div>
      </div>

      {showAddUserForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                <Users size={24} className="text-blue-600" />
              </div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 mt-2">
                Create New User
              </h3>
              <div className="mt-2 px-7 py-3">
                <div className="space-y-4">
                  <div className="text-left">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="Full name"
                      value={newUser.name}
                      onChange={(e) =>
                        setNewUser({ ...newUser, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="text-left">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="Email address"
                      value={newUser.email}
                      onChange={(e) =>
                        setNewUser({ ...newUser, email: e.target.value })
                      }
                    />
                  </div>
                  <div className="text-left">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="Password"
                      value={newUser.password}
                      onChange={(e) =>
                        setNewUser({ ...newUser, password: e.target.value })
                      }
                    />
                  </div>
                  <div className="text-left">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <select
                      className="w-full px-3 py-2 border rounded-md"
                      value={newUser.role}
                      onChange={(e) =>
                        setNewUser({ ...newUser, role: e.target.value })
                      }
                    >
                      <option value="">Select Role</option>
                      <option value="Admin">Admin</option>
                      <option value="Pro User">Pro User</option>
                      <option value="Regular User">Regular User</option>
                    </select>
                  </div>
                </div>
                {createError && (
                  <div className="mt-2 text-sm text-red-600">{createError}</div>
                )}
                <div className="items-center px-4 py-3 mt-4 flex justify-center gap-4">
                  <button
                    onClick={handleCreateUser}
                    disabled={isCreating}
                    className="px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md w-auto shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {isCreating ? 'Creating...' : 'Create User'}
                  </button>
                  <button
                    onClick={() => setShowAddUserForm(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md w-auto shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' ? (
        <div className="flex-1 flex flex-col min-h-0" style={{ minHeight: 0 }}>
          <div className="bg-white shadow-md rounded overflow-hidden flex-1 min-h-0 flex flex-col">
            <div className="flex-1 overflow-auto min-h-0">
          <table className="min-w-full bg-[#23242B] border border-[#393A41] rounded-xl shadow-2xl">
            <thead className="bg-[#282A36] sticky top-0 z-10">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider"
                  onClick={() => requestSort('name')}
                >
                  Name
                  {sortConfig.key === 'name' && (
                    <span className="ml-1">
                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider"
                  onClick={() => requestSort('email')}
                >
                  Email
                  {sortConfig.key === 'email' && (
                    <span className="ml-1">
                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider"
                  onClick={() => requestSort('role')}
                >
                  Role
                  {sortConfig.key === 'role' && (
                    <span className="ml-1">
                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-bold text-[#F8FAFC] uppercase tracking-wider"
                >
                  Verified
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-bold text-[#F8FAFC] uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-[#23242B]">
              {sortedUsers.map((user) => (
                <tr
                  key={user._id}
                  className="hover:bg-dark-700 cursor-pointer transition-colors"
                  onClick={(e) => {
                    // Only navigate if click wasn't on an action button/link
                    if (!e.target.closest('button, a')) {
                      window.location.href = `/admin/users/${user._id}/edit`;
                    }
                  }}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-[#F8FAFC]">
                    {user.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#F8FAFC]">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#F8FAFC]">
                    {user.role}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#C7C9D1] text-center">
                    {user.isVerified ? (
                      <CheckCircle className="h-5 w-5 text-green-500 inline" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 inline" />
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-2">
                    <Link
                      to={`/admin/users/${user._id}/edit`}
                      title="Edit User"
                      className="text-accent-purple hover:text-accent-blue transition inline-block"
                    >
                      <Edit className="h-5 w-5" />
                    </Link>
                    <button
                      onClick={() => openDeleteConfirmation(user)}
                      title="Delete User"
                      className="text-red-500 hover:text-red-700 transition inline-block"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
            </div>
          </div>
        </div>
      ) : (
        <AuditLogsTab
          logs={auditLogs}
          isLoading={logsLoading}
          error={logsError}
        />
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <AlertTriangle size={24} className="text-red-600" />
              </div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 mt-2">
                Delete Confirmation
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete the user {userToDelete?.name}?
                  This action cannot be undone.
                </p>
                {deleteError && (
                  <div className="mt-2 text-sm text-red-600">{deleteError}</div>
                )}
                <div className="items-center px-4 py-3 mt-4 flex justify-center gap-4">
                  <button
                    onClick={handleDeleteUser}
                    disabled={isDeleting}
                    className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-auto shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                  <button
                    onClick={closeDeleteConfirmation}
                    className="px-4 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md w-auto shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserListPage;
