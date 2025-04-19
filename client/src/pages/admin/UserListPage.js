import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNotifications } from '../../context/NotificationContext';
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
} from 'lucide-react';
import FormInput from '../../components/common/FormInput';
import FormSelect from '../../components/common/FormSelect';
import FormCheckbox from '../../components/common/FormCheckbox';

const UserListPage = () => {
  const [users, setUsers] = useState([]);
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
  const { showNotification } = useNotifications();
  const [currentUserRole, setCurrentUserRole] = useState(null);

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
      // Handle error silently
    }
  }, []);

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
          <Users className="mr-2" /> User Management
        </h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowAddUserForm(!showAddUserForm)}
            className="bg-accent-purple text-[#F8FAFC] font-bold py-2 px-4 rounded-xl shadow hover:bg-accent-blue/80 transition"
          >
            + Add User
          </button>
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
                  <FormInput
                    id="newUserName"
                    label="Name"
                    type="text"
                    name="name"
                    value={newUser.name}
                    onChange={(e) =>
                      setNewUser({ ...newUser, name: e.target.value })
                    }
                    placeholder="Full name"
                    required
                  />
                  <FormInput
                    id="newUserEmail"
                    label="Email"
                    type="email"
                    name="email"
                    value={newUser.email}
                    onChange={(e) =>
                      setNewUser({ ...newUser, email: e.target.value })
                    }
                    placeholder="Email address"
                    required
                  />
                  <FormInput
                    id="newUserPassword"
                    label="Password"
                    type="password"
                    name="password"
                    value={newUser.password}
                    onChange={(e) =>
                      setNewUser({ ...newUser, password: e.target.value })
                    }
                    placeholder="Password"
                    required
                  />
                  <FormSelect
                    id="newUserRole"
                    label="Role"
                    name="role"
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser({ ...newUser, role: e.target.value })
                    }
                    required
                    options={[
                      { value: '', label: 'Select Role' },
                      { value: 'Admin', label: 'Admin' },
                      { value: 'Pro User', label: 'Pro User' },
                      { value: 'Regular User', label: 'Regular User' },
                    ]}
                  />
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
