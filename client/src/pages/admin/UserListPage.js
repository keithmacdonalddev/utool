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
  Copy,
  Check,
} from 'lucide-react';
import FormInput from '../../components/common/FormInput';
import FormSelect from '../../components/common/FormSelect';
import FormCheckbox from '../../components/common/FormCheckbox';
import Button from '../../components/common/Button';
import { toast } from 'react-toastify';

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
  const { handleNotificationClick } = useNotifications();
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  const copyToClipboard = (text, fieldId) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        // Set the copied field to show checkmark
        setCopiedField(fieldId);
        // Reset after 1.5 seconds
        setTimeout(() => {
          setCopiedField(null);
        }, 1500);
        // Use toast notification directly instead of showNotification
        toast.success('Copied to clipboard!', {
          position: 'top-right',
          autoClose: 1500,
          closeOnClick: true,
          pauseOnHover: true,
        });
      })
      .catch((err) => {
        console.error('Failed to copy: ', err);
        toast.error('Failed to copy to clipboard', {
          position: 'top-right',
          autoClose: 3000,
        });
      });
  };

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
        toast.success('User created successfully', {
          position: 'top-right',
          autoClose: 3000,
        });
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
      toast.success('User deleted successfully', {
        position: 'top-right',
        autoClose: 3000,
      });
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
      {/* Remove the separate back link div */}

      <div className="flex justify-between items-center mb-6 flex-none">
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center text-sm text-accent-purple font-bold hover:text-accent-blue hover:underline"
            title="Back to Dashboard"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-2xl font-bold text-[#F8FAFC]">User Management</h1>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="primary"
            className="py-2 px-6 text-base font-bold shadow"
            style={{ color: '#F8FAFC' }}
            onClick={() => setShowAddUserForm(!showAddUserForm)}
          >
            + Add User
          </Button>
        </div>
      </div>

      {showAddUserForm && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
          <div className="relative mx-auto p-5 border border-dark-700 w-full max-w-md shadow-lg rounded-md bg-card">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-dark-700">
                <Users size={24} className="text-primary" />
              </div>
              <h3 className="text-lg leading-6 font-medium text-foreground mt-2">
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
                  <div className="mt-2 text-sm text-red-400">{createError}</div>
                )}
                <div className="items-center px-4 py-3 mt-4 flex justify-center gap-4">
                  <button
                    onClick={handleCreateUser}
                    disabled={
                      isCreating ||
                      !newUser.name ||
                      !newUser.email ||
                      !newUser.password ||
                      !newUser.role
                    }
                    className="px-4 py-2 bg-primary hover:bg-primary/80 text-white text-base font-medium rounded-md w-auto shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 disabled:opacity-50 transition-colors"
                  >
                    {isCreating ? 'Creating...' : 'Create User'}
                  </button>
                  <button
                    onClick={() => setShowAddUserForm(false)}
                    className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-gray-200 text-base font-medium rounded-md w-auto shadow-sm focus:outline-none focus:ring-2 focus:ring-dark-500 focus:ring-opacity-50 transition-colors"
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
        <div className="bg-[#23242B] shadow-md rounded overflow-hidden flex-1 min-h-0 flex flex-col">
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
                    className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider"
                  >
                    Verified
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-[#23242B]">
                {sortedUsers.map((user) => (
                  <tr
                    key={user._id}
                    className="hover:bg-dark-700 transition-colors"
                    onClick={(e) => {
                      // Only navigate if click wasn't on an action button/link
                      if (!e.target.closest('button, a')) {
                        window.location.href = `/admin/users/${user._id}/edit`;
                      }
                    }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-[#F8FAFC]">
                      <div className="flex items-center">
                        <span className="cursor-pointer">{user.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(user.name, `name-${user._id}`);
                          }}
                          className="ml-2 text-gray-400 hover:text-accent-blue focus:outline-none focus:ring-0 transition-colors"
                          title="Copy name to clipboard"
                        >
                          {copiedField === `name-${user._id}` ? (
                            <Check size={16} className="text-green-500" />
                          ) : (
                            <Copy size={16} />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#F8FAFC]">
                      <div className="flex items-center">
                        <span className="cursor-pointer">{user.email}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(user.email, `email-${user._id}`);
                          }}
                          className="ml-2 text-gray-400 hover:text-accent-blue focus:outline-none focus:ring-0 transition-colors"
                          title="Copy email to clipboard"
                        >
                          {copiedField === `email-${user._id}` ? (
                            <Check size={16} className="text-green-500" />
                          ) : (
                            <Copy size={16} />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#F8FAFC]">
                      {user.role}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#C7C9D1] text-left">
                      {user.isVerified ? (
                        <CheckCircle className="h-5 w-5 text-green-500 inline" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 inline" />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium space-x-2">
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
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
          <div className="relative mx-auto p-5 border border-dark-700 w-full max-w-md shadow-lg rounded-md bg-card">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-900/30">
                <AlertTriangle size={24} className="text-red-400" />
              </div>
              <h3 className="text-lg leading-6 font-medium text-foreground mt-2">
                Delete Confirmation
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-400">
                  Are you sure you want to delete the user {userToDelete?.name}?
                  This action cannot be undone.
                </p>
                {deleteError && (
                  <div className="mt-2 text-sm text-red-400">{deleteError}</div>
                )}
                <div className="items-center px-4 py-3 mt-4 flex justify-center gap-4">
                  <button
                    onClick={handleDeleteUser}
                    disabled={isDeleting}
                    className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-auto shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 disabled:opacity-50"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                  <button
                    onClick={closeDeleteConfirmation}
                    className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-gray-200 text-base font-medium rounded-md w-auto shadow-sm focus:outline-none focus:ring-2 focus:ring-dark-500 focus:ring-opacity-50"
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
