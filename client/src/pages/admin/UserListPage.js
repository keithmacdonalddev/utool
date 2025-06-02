/**
 * UserListPage Component
 *
 * This page provides an administrative interface for managing users within the application.
 * It demonstrates several important React concepts and patterns:
 *
 * 1. REUSABLE COMPONENTS: Uses common components like DataTable, TableFilters and Pagination
 *    to maintain consistency throughout the application and reduce code duplication.
 *
 * 2. STATE MANAGEMENT: Uses React's useState hook to manage local UI state and
 *    handles asynchronous data fetching and mutations.
 *
 * 3. API INTEGRATION: Communicates with backend APIs to fetch, create, and delete user data.
 *
 * 4. UX PATTERNS: Implements common UX patterns like modals for confirmations and forms,
 *    filtering, sorting, and pagination for better data exploration.
 *
 * 5. ERROR HANDLING: Gracefully handles loading states and error conditions with appropriate
 *    user feedback.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
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
  Search,
  Plus,
} from 'lucide-react';

// API and context
import api from '../../utils/api';
import { useNotifications } from '../../context/NotificationContext';

// Common components - reused across different parts of the application
import FormInput from '../../components/common/FormInput';
import FormSelect from '../../components/common/FormSelect';
import FormCheckbox from '../../components/common/FormCheckbox';
import Button from '../../components/common/Button';
import TableFilters from '../../components/common/TableFilters';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';

/**
 * UserListPage Component - Main component for the user management admin page
 *
 * This component renders a page that allows administrators to:
 * - View a list of all users in the system
 * - Search and filter users
 * - Add new users
 * - Edit existing users
 * - Delete users
 *
 * @returns {JSX.Element} The rendered UserListPage component
 */
const UserListPage = () => {
  // =====================================
  // STATE MANAGEMENT
  // =====================================

  /**
   * Core Data State
   * These state variables hold the main data displayed on the page
   */
  const [users, setUsers] = useState([]); // Raw user data from API
  const [filteredUsers, setFilteredUsers] = useState([]); // Users after filtering
  const [isLoading, setIsLoading] = useState(true); // Loading state for main data
  const [error, setError] = useState(''); // Error message from API

  /**
   * UI Control State
   * These state variables control the UI elements and interactions
   */
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  /**
   * Form State
   * This state manages the new user form data and state
   */
  const [newUser, setNewUser] = useState({
    username: '', // ADDED
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: '',
    isVerified: false,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  /**
   * Pagination State
   * These states control the pagination of results
   */
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  /**
   * Filter State
   * These states manage the filtering functionality
   */
  const [searchQuery, setSearchQuery] = useState('');
  const [filterState, setFilterState] = useState({
    role: '',
    isVerified: '',
  });

  // Access notification context
  const { handleNotificationClick } = useNotifications();

  // =====================================
  // EFFECTS & CALLBACKS
  // =====================================

  /**
   * Copy text to clipboard with feedback
   *
   * @param {string} text - The text to copy
   * @param {string} fieldId - Unique identifier for the copied field
   */
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
        // Display a toast notification
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

  /**
   * Fetch the current logged-in user's information
   * This is used to determine user permissions for the page
   */
  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data.success) {
        setCurrentUserRole(res.data.data.role);
      }
    } catch (err) {
      // Handle error silently - non-critical failure
    }
  }, []);

  /**
   * Fetch all users from the API
   * This is the main data loading function for the page
   */
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await api.get('/users');
      if (res.data.success) {
        const userData = res.data.data;
        setUsers(userData);
        setFilteredUsers(userData); // Initially, filtered users = all users
        setTotalItems(userData.length);
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

  /**
   * Initialize data on component mount
   * Fetches the current user and all users from the API
   */
  useEffect(() => {
    fetchCurrentUser();
    fetchUsers();
  }, [fetchCurrentUser, fetchUsers]);

  /**
   * Apply sorting to users whenever sort configuration changes
   */
  useEffect(() => {
    if (sortConfig.key) {
      // Create a new array to avoid mutating the state directly
      const sortedData = [...filteredUsers].sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
      setFilteredUsers(sortedData);
    }
  }, [sortConfig, users]);

  // =====================================
  // EVENT HANDLERS
  // =====================================
  /**
   * Handle creating a new user
   * Validates form data and submits to the API
   */
  const handleCreateUser = async () => {
    // Validate form data
    if (
      !newUser.username || // CHANGED
      !newUser.firstName ||
      !newUser.lastName ||
      !newUser.email ||
      !newUser.password ||
      !newUser.role
    ) {
      setCreateError('All fields are required');
      return;
    }

    setIsCreating(true);
    setCreateError('');

    try {
      const res = await api.post('/users', newUser);
      if (res.data.success) {
        // Reset form and close modal on success
        setShowAddUserForm(false);
        setNewUser({
          username: '', // ADDED
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          role: '',
          isVerified: false,
        });
        // Refresh user list
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

  /**
   * Handle sorting when a column header is clicked
   *
   * @param {string} key - The data key to sort by
   */
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  /**
   * Open the delete confirmation modal for a user
   *
   * @param {Object} user - The user to delete
   */
  const openDeleteConfirmation = (user) => {
    setUserToDelete(user);
    setDeleteError('');
    setShowDeleteModal(true);
  };

  /**
   * Close the delete confirmation modal
   */
  const closeDeleteConfirmation = () => {
    setUserToDelete(null);
    setShowDeleteModal(false);
    setIsDeleting(false);
  };

  /**
   * Handle deleting a user after confirmation
   */
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

  // =====================================
  // FILTERING FUNCTIONS
  // =====================================

  /**
   * Handle filter changes from TableFilters component
   *
   * @param {string} key - The filter key being changed
   * @param {*} value - The new value for the filter
   */
  const handleFilterChange = (key, value) => {
    setFilterState((prevState) => ({
      ...prevState,
      [key]: value,
    }));
  };

  /**
   * Apply all current filters to the user data
   */
  const handleApplyFilters = () => {
    // Reset to page 1 when applying new filters
    setCurrentPage(1);

    let result = [...users];

    // Apply role filter if selected
    if (filterState.role) {
      result = result.filter((user) => user.role === filterState.role);
    }

    // Apply verification filter if selected
    if (filterState.isVerified !== '') {
      const verifiedValue = filterState.isVerified === 'true';
      result = result.filter((user) => user.isVerified === verifiedValue);
    }

    // Update filtered users and total count
    setFilteredUsers(result);
    setTotalItems(result.length);
  };

  /**
   * Clear all filters and reset to showing all users
   */
  const handleClearFilters = () => {
    setFilterState({
      role: '',
      isVerified: '',
    });
    setSearchQuery('');
    setCurrentPage(1);
    setFilteredUsers(users);
    setTotalItems(users.length);
  };
  /**
   * Handle search queries from the search bar
   *
   * @param {string} query - The search query
   */
  const handleSearch = (query) => {
    setSearchQuery(query);
    setCurrentPage(1);

    if (!query.trim()) {
      // If query is empty, reset to filtered state
      handleApplyFilters();
      return;
    }

    // Search in User ID, firstName, lastName, and email fields
    const lowercaseQuery = query.toLowerCase();
    const searchResults = users.filter(
      (user) =>
        user._id.toLowerCase().includes(lowercaseQuery) ||
        (user.username && // ADDED
          user.username.toLowerCase().includes(lowercaseQuery)) ||
        (user.firstName &&
          user.firstName.toLowerCase().includes(lowercaseQuery)) ||
        (user.lastName &&
          user.lastName.toLowerCase().includes(lowercaseQuery)) ||
        user.email.toLowerCase().includes(lowercaseQuery)
    );

    setFilteredUsers(searchResults);
    setTotalItems(searchResults.length);
  };

  // =====================================
  // TABLE CONFIGURATION
  // =====================================

  /**
   * Configuration for the TableFilters component
   * Defines what filters are available and how they behave
   */
  const filterConfig = {
    filters: [
      {
        id: 'role',
        type: 'select',
        label: 'User Role',
        options: [
          { value: 'Admin', label: 'Admin' },
          { value: 'Pro User', label: 'Pro User' },
          { value: 'Regular User', label: 'Regular User' },
        ],
        defaultValue: '',
        emptyOptionLabel: 'All Roles',
      },
      {
        id: 'isVerified',
        type: 'select',
        label: 'Verification Status',
        options: [
          { value: 'true', label: 'Verified' },
          { value: 'false', label: 'Not Verified' },
        ],
        defaultValue: '',
        emptyOptionLabel: 'All Statuses',
      },
    ],
    layout: {
      columns: {
        default: 1,
        md: 2,
      },
    },
  };
  /**
   * Columns configuration for the DataTable component
   * Defines what columns to display and how to render them
   */
  const columns = [
    {
      key: '_id',
      label: 'User ID',
      sortable: true,
      className: 'text-xs text-[#C7C9D1] font-mono',
      // Custom render function for User ID with copy button and truncated display
      render: (user) => (
        <div className="flex items-center">
          <span
            className="cursor-pointer truncate max-w-[100px]"
            title={user._id}
          >
            {user._id}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard(user._id, `id-${user._id}`);
            }}
            className="ml-2 text-gray-400 hover:text-accent-blue focus:outline-none focus:ring-0 transition-colors"
            title="Copy User ID to clipboard"
            data-action="true"
          >
            {copiedField === `id-${user._id}` ? (
              <Check size={16} className="text-green-500" />
            ) : (
              <Copy size={16} />
            )}
          </button>
        </div>
      ),
    },
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      className: 'text-sm font-bold text-[#F8FAFC]',
      // Custom render function for cells with copy button
      render: (user) => {
        const displayName = user.firstName
          ? `${user.firstName} ${user.lastName || ''}`.trim()
          : user.username || 'Unknown User';
        return (
          <div className="flex items-center">
            <span className="cursor-pointer">{displayName}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(displayName, `name-${user._id}`);
              }}
              className="ml-2 text-gray-400 hover:text-accent-blue focus:outline-none focus:ring-0 transition-colors"
              title="Copy name to clipboard"
              data-action="true"
            >
              {copiedField === `name-${user._id}` ? (
                <Check size={16} className="text-green-500" />
              ) : (
                <Copy size={16} />
              )}
            </button>
          </div>
        );
      },
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      className: 'text-sm text-[#F8FAFC]',
      // Custom render function for cells with copy button
      render: (user) => (
        <div className="flex items-center">
          <span className="cursor-pointer">{user.email}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard(user.email, `email-${user._id}`);
            }}
            className="ml-2 text-gray-400 hover:text-accent-blue focus:outline-none focus:ring-0 transition-colors"
            title="Copy email to clipboard"
            data-action="true"
          >
            {copiedField === `email-${user._id}` ? (
              <Check size={16} className="text-green-500" />
            ) : (
              <Copy size={16} />
            )}
          </button>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      className: 'text-sm text-[#F8FAFC]',
    },
    {
      key: 'isVerified',
      label: 'Verified',
      className: 'text-sm text-[#C7C9D1] text-left',
      render: (user) =>
        user.isVerified ? (
          <CheckCircle className="h-5 w-5 text-green-500 inline" />
        ) : (
          <XCircle className="h-5 w-5 text-red-500 inline" />
        ),
    },
  ];

  /**
   * Calculate pagination values
   */
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  /**
   * Render row action buttons for the DataTable
   *
   * @param {Object} user - The user data for this row
   * @returns {JSX.Element} - JSX for action buttons
   */
  const renderRowActions = (user) => (
    <>
      <Link
        to={`/admin/users/${user._id}/edit`}
        title="Edit User"
        className="text-accent-purple hover:text-accent-blue transition inline-block"
        data-action="true"
      >
        <Edit className="h-5 w-5" />
      </Link>
      <button
        onClick={() => openDeleteConfirmation(user)}
        title="Delete User"
        className="text-red-500 hover:text-red-700 transition inline-block ml-2"
        data-action="true"
      >
        <Trash2 className="h-5 w-5" />
      </button>
    </>
  );

  /**
   * Handle row click in DataTable
   *
   * @param {Object} user - The user that was clicked
   */
  const handleRowClick = (user) => {
    window.location.href = `/admin/users/${user._id}/edit`;
  };

  // =====================================
  // RENDER FUNCTIONS
  // =====================================

  /**
   * Render the loading state
   *
   * @returns {JSX.Element} Loading message
   */
  if (isLoading) {
    return (
      <div className="container mx-auto p-4 text-center">Loading users...</div>
    );
  }

  /**
   * Render the error state
   *
   * @returns {JSX.Element} Error message
   */
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

  /**
   * Main render function for the user list page
   */
  return (
    <div
      className="container mx-auto p-4 flex flex-col"
      style={{ height: 'calc(100vh - 5rem)', overflow: 'hidden' }}
    >
      {/* Header section with title and add user button */}
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
            className="py-2 px-6 text-base font-bold shadow flex items-center gap-2"
            style={{ color: '#F8FAFC' }}
            onClick={() => setShowAddUserForm(!showAddUserForm)}
          >
            <Plus size={18} /> Add User
          </Button>
        </div>
      </div>{' '}
      {/* Filters section */}
      <TableFilters
        filterConfig={filterConfig}
        filterState={filterState}
        onFilterChange={handleFilterChange}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
        onSearch={handleSearch}
        searchPlaceholder="Search by User ID, first name, last name, or email..."
      />
      {/* Main content section with DataTable */}
      <div className="flex-1 flex flex-col min-h-0" style={{ minHeight: 0 }}>
        <DataTable
          columns={columns}
          data={paginatedUsers}
          isLoading={isLoading}
          keyField="_id"
          onRowClick={handleRowClick}
          renderRowActions={renderRowActions}
          onSort={requestSort}
          sortable={true}
          emptyMessage="No users found. Try adjusting your filters or add a new user."
          containerClassName="bg-[#23242B] shadow-md rounded overflow-x-auto flex-1 min-h-0"
          tableClassName="min-w-full bg-[#23242B] border border-[#393A41] rounded-xl shadow-2xl"
          headerClassName="bg-[#282A36] sticky top-0 z-10"
          bodyClassName="bg-[#23242B]"
          rowClassName={() => 'hover:bg-dark-700 transition-colors'}
        />

        {/* Pagination controls */}
        {totalItems > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            className="mb-4"
          />
        )}
      </div>
      {/* Add User Modal */}
      {showAddUserForm && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
          <div className="relative mx-auto p-5 border border-dark-700 w-full max-w-md shadow-lg rounded-md bg-card">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-dark-700">
                <Users size={24} className="text-primary" />
              </div>
              <h3 className="text-lg leading-6 font-medium text-foreground mt-2">
                Create New User
              </h3>{' '}
              <div className="mt-2 px-7 py-3">
                <div className="space-y-4">
                  {/* First Name and Last Name - Side by Side */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput
                      id="newUserUsername" // ADDED
                      label="Username" // ADDED
                      type="text" // ADDED
                      name="username" // ADDED
                      value={newUser.username} // ADDED
                      onChange={
                        (
                          e // ADDED
                        ) =>
                          setNewUser({ ...newUser, username: e.target.value }) // ADDED
                      } // ADDED
                      placeholder="Username" // ADDED
                      required // ADDED
                    />
                    <FormInput
                      id="newUserFirstName"
                      label="First Name"
                      type="text"
                      name="firstName"
                      value={newUser.firstName}
                      onChange={(e) =>
                        setNewUser({ ...newUser, firstName: e.target.value })
                      }
                      placeholder="First name"
                      required
                    />
                    <FormInput
                      id="newUserLastName"
                      label="Last Name"
                      type="text"
                      name="lastName"
                      value={newUser.lastName}
                      onChange={(e) =>
                        setNewUser({ ...newUser, lastName: e.target.value })
                      }
                      placeholder="Last name"
                      required
                    />
                  </div>
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
                  <FormCheckbox
                    id="newUserVerified"
                    label="Account Verified"
                    checked={newUser.isVerified}
                    onChange={() =>
                      setNewUser({
                        ...newUser,
                        isVerified: !newUser.isVerified,
                      })
                    }
                  />
                </div>
                {createError && (
                  <div className="mt-2 text-sm text-red-400">{createError}</div>
                )}
                <div className="items-center px-4 py-3 mt-4 flex justify-center gap-4">
                  {' '}
                  <button
                    onClick={handleCreateUser}
                    disabled={
                      isCreating ||
                      !newUser.username || // CHANGED
                      !newUser.firstName ||
                      !newUser.lastName ||
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
      {/* Delete Confirmation Modal */}
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
                  Are you sure you want to delete the user{' '}
                  {userToDelete?.firstName
                    ? `${userToDelete.firstName} ${
                        userToDelete.lastName || ''
                      }`.trim()
                    : userToDelete?.username || 'Unknown User'}
                  ? This action cannot be undone.
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
